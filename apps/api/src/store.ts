import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  AlertEvent,
  CorrelationResult,
  IncidentScenario,
  IncidentTimelineEvent,
  ReplayState,
  ScenarioStageOverride,
  ServiceMetricsPoint,
  ServiceProfile,
  Severity,
  TelemetryBatchInput,
} from "./types.js";
import { average, clamp, id, jitter, nowIso, pct } from "./utils.js";

const MAX_POINTS_PER_SERVICE = 900;
const MAX_LOGS = 2500;
const MAX_TRACES = 2500;
const MAX_TIMELINE = 1200;
const MAX_ALERT_HISTORY = 1200;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, "../../../");

interface ReplaySession {
  scenario: IncidentScenario | null;
  startMs: number;
  startedAt: string;
  active: boolean;
  completed: boolean;
  lastStageIndex: number;
}

interface AlertThreshold {
  metric: "availability" | "latency" | "errorRate" | "saturation";
  summary: string;
  threshold: number;
  compare: "lt" | "gt";
  severity: Severity;
  currentValue: number;
}

export class TelemetryStore {
  private readonly profiles: ServiceProfile[];

  private readonly scenarios: IncidentScenario[];

  private readonly series = new Map<string, ServiceMetricsPoint[]>();

  private readonly logs: Array<{
    id: string;
    service: string;
    level: "debug" | "info" | "warn" | "error";
    message: string;
    timestamp: string;
    traceId?: string;
    incidentId?: string;
    attributes?: Record<string, string | number | boolean>;
  }> = [];

  private readonly traces: Array<{
    traceId: string;
    spanId: string;
    parentSpanId?: string;
    service: string;
    operation: string;
    status: "ok" | "error";
    durationMs: number;
    timestamp: string;
    incidentId?: string;
    attributes?: Record<string, string | number | boolean>;
  }> = [];

  private readonly alertHistory: AlertEvent[] = [];

  private readonly activeAlertsByFingerprint = new Map<string, AlertEvent>();

  private readonly timeline: IncidentTimelineEvent[] = [];

  private replay: ReplaySession = {
    scenario: null,
    startMs: 0,
    startedAt: "",
    active: false,
    completed: false,
    lastStageIndex: -1,
  };

  constructor(profiles: ServiceProfile[], scenarios: IncidentScenario[]) {
    this.profiles = profiles;
    this.scenarios = scenarios;
    for (const profile of profiles) {
      this.series.set(profile.id, []);
    }
  }

  bootstrapHistory(minutes = 45): void {
    const now = Date.now();
    for (let minute = minutes; minute >= 1; minute -= 1) {
      const timestamp = new Date(now - minute * 60_000).toISOString();
      const services = this.profiles.map((profile) => ({
        service: profile.id,
        availability: pct(clamp(jitter(profile.availability, 0.08), 97.5, 99.99)),
        latencyP95Ms: pct(clamp(jitter(profile.latencyP95Ms, 16), 80, 540)),
        errorRatePct: pct(clamp(jitter(profile.errorRatePct, 0.25), 0.02, 4.4)),
        throughputRps: pct(clamp(jitter(profile.throughputRps, profile.throughputRps * 0.08), 60, 2500)),
        saturationPct: pct(clamp(jitter(profile.saturationPct, 4.4), 10, 92)),
        errorBudgetRemainingPct: pct(clamp(jitter(profile.errorBudgetRemainingPct, 0.5), 38, 100)),
      }));
      this.ingest({ generatedAt: timestamp, tick: minute, services });
    }
  }

  ingest(batch: TelemetryBatchInput): { points: number } {
    this.updateReplayProgress(new Date(batch.generatedAt));

    for (const item of batch.services) {
      const point: ServiceMetricsPoint = {
        service: item.service,
        timestamp: batch.generatedAt,
        availability: pct(item.availability),
        latencyP95Ms: pct(item.latencyP95Ms),
        errorRatePct: pct(item.errorRatePct),
        throughputRps: pct(item.throughputRps),
        saturationPct: pct(item.saturationPct),
        errorBudgetRemainingPct: pct(item.errorBudgetRemainingPct),
        incidentId: item.incidentId,
        traceId: item.trace?.traceId,
      };

      const serviceSeries = this.series.get(item.service) ?? [];
      serviceSeries.push(point);
      if (serviceSeries.length > MAX_POINTS_PER_SERVICE) {
        serviceSeries.shift();
      }
      this.series.set(item.service, serviceSeries);

      if (item.trace) {
        this.traces.push({
          ...item.trace,
          timestamp: batch.generatedAt,
          incidentId: item.incidentId ?? item.trace.incidentId,
        });
        if (this.traces.length > MAX_TRACES) {
          this.traces.shift();
        }
      }

      if (item.log) {
        this.logs.push({
          ...item.log,
          id: id(),
          timestamp: batch.generatedAt,
          incidentId: item.incidentId ?? item.log.incidentId,
        });
        if (this.logs.length > MAX_LOGS) {
          this.logs.shift();
        }
      }

      this.evaluateAlerts(point);
    }

    return { points: batch.services.length };
  }

  getOverview(): Record<string, unknown> {
    const latest = this.getLatestPerService();
    const availability = average(latest.map((point) => point.availability));
    const latencySeries = latest.map((point) => point.latencyP95Ms).sort((a, b) => a - b);
    const p95Index = Math.floor((latencySeries.length - 1) * 0.95);
    const latencyP95 = latencySeries[p95Index] ?? 0;
    const errorBudgetRemaining = average(latest.map((point) => point.errorBudgetRemainingPct));
    const errorRate = average(latest.map((point) => point.errorRatePct));

    return {
      generatedAt: nowIso(),
      kpi: {
        availability: pct(availability),
        latencyP95Ms: pct(latencyP95),
        errorBudgetRemainingPct: pct(errorBudgetRemaining),
        burnRate: pct(errorRate / 0.1),
      },
      counts: {
        activeAlerts: this.getActiveAlerts().length,
        incidentsInTimeline: this.timeline.length,
        services: latest.length,
      },
      replay: this.getReplayState(),
    };
  }

  getLatestPerService(): ServiceMetricsPoint[] {
    const latest: ServiceMetricsPoint[] = [];
    for (const service of this.profiles) {
      const serviceSeries = this.series.get(service.id) ?? [];
      if (serviceSeries.length > 0) {
        latest.push(serviceSeries[serviceSeries.length - 1]);
      }
    }
    return latest;
  }

  getServiceCards(): Array<Record<string, unknown>> {
    return this.profiles.map((profile) => {
      const points = this.series.get(profile.id) ?? [];
      const current = points[points.length - 1];
      const status = this.activeAlertsByFingerprint.has(`${profile.id}:availability`) || this
        .getActiveAlerts()
        .some((alert) => alert.service === profile.id && (alert.severity === "critical" || alert.severity === "high"))
        ? "degraded"
        : "healthy";

      return {
        ...profile,
        status,
        latest: current ?? null,
      };
    });
  }

  getTimeseries(minutes = 30, service?: string): Record<string, ServiceMetricsPoint[]> {
    const fromMs = Date.now() - minutes * 60_000;
    const targetServices = service ? [service] : this.profiles.map((p) => p.id);
    const output: Record<string, ServiceMetricsPoint[]> = {};

    for (const serviceName of targetServices) {
      output[serviceName] = (this.series.get(serviceName) ?? []).filter(
        (point) => new Date(point.timestamp).getTime() >= fromMs,
      );
    }

    return output;
  }

  getLogs(service?: string, limit = 120): typeof this.logs {
    const filtered = service
      ? this.logs.filter((log) => log.service === service)
      : this.logs;
    return filtered.slice(-limit).reverse();
  }

  getTraces(service?: string, limit = 120): typeof this.traces {
    const filtered = service
      ? this.traces.filter((trace) => trace.service === service)
      : this.traces;
    return filtered.slice(-limit).reverse();
  }

  getAlerts(status?: "active" | "resolved"): AlertEvent[] {
    const base = status
      ? this.alertHistory.filter((alert) => alert.status === status)
      : this.alertHistory;
    return [...base].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }

  getActiveAlerts(): AlertEvent[] {
    return [...this.activeAlertsByFingerprint.values()].sort((a, b) =>
      b.updatedAt.localeCompare(a.updatedAt),
    );
  }

  getTimeline(limit = 200): IncidentTimelineEvent[] {
    return this.timeline.slice(-limit).reverse();
  }

  getCorrelation(traceId: string): CorrelationResult {
    const trace = [...this.traces].reverse().find((item) => item.traceId === traceId) ?? null;
    const logs = this.logs.filter((item) => item.traceId === traceId).slice(-30).reverse();

    let metric: ServiceMetricsPoint | null = null;
    if (trace) {
      const points = this.series.get(trace.service) ?? [];
      metric = points
        .slice()
        .reverse()
        .find((point) => {
          const delta = Math.abs(
            new Date(point.timestamp).getTime() - new Date(trace.timestamp).getTime(),
          );
          return delta < 60_000;
        }) ?? null;
    }

    const relatedAlerts = this.alertHistory
      .filter((alert) => alert.traceId === traceId || alert.service === trace?.service)
      .slice(-10)
      .reverse();

    return { trace, logs, metric, relatedAlerts };
  }

  listScenarios(): IncidentScenario[] {
    return this.scenarios;
  }

  startReplay(scenarioId: string): ReplayState | null {
    const scenario = this.scenarios.find((item) => item.id === scenarioId);
    if (!scenario) {
      return null;
    }

    const startedAt = nowIso();
    this.replay = {
      scenario,
      startMs: Date.now(),
      startedAt,
      active: true,
      completed: false,
      lastStageIndex: -1,
    };

    this.pushTimeline({
      incidentId: scenario.id,
      kind: "start",
      severity: "high",
      title: `${scenario.name} started`,
      details: scenario.description,
    });

    this.updateReplayProgress(new Date());
    return this.getReplayState();
  }

  stopReplay(): ReplayState {
    if (this.replay.scenario) {
      this.pushTimeline({
        incidentId: this.replay.scenario.id,
        kind: "end",
        severity: "medium",
        title: `${this.replay.scenario.name} stopped`,
        details: "Replay manually stopped by operator",
      });
    }

    this.replay.active = false;
    this.replay.completed = true;
    return this.getReplayState();
  }

  getReplayState(): ReplayState {
    const scenario = this.replay.scenario;
    if (!scenario) {
      return {
        active: false,
        elapsedSec: 0,
        progressPct: 0,
        activeStageIndex: -1,
        completed: false,
      };
    }

    const elapsedSec = Math.max(0, Math.floor((Date.now() - this.replay.startMs) / 1000));
    const progressPct = pct(Math.min((elapsedSec / scenario.durationSec) * 100, 100));
    const stageIndex = this.getStageIndexForElapsed(scenario, elapsedSec);
    const stage = stageIndex >= 0 ? scenario.stages[stageIndex] : undefined;

    return {
      active: this.replay.active,
      scenarioId: scenario.id,
      scenarioName: scenario.name,
      startedAt: this.replay.startedAt,
      elapsedSec,
      progressPct,
      activeStageIndex: stageIndex,
      activeStageTitle: stage?.title,
      activeStageNarrative: stage?.narrative,
      completed: this.replay.completed,
    };
  }

  getReplayOverrides(): Record<string, ScenarioStageOverride> {
    const state = this.getReplayState();
    if (!state.active || !this.replay.scenario || state.activeStageIndex < 0) {
      return {};
    }

    const stage = this.replay.scenario.stages[state.activeStageIndex];
    return stage?.overrides ?? {};
  }

  private updateReplayProgress(now: Date): void {
    if (!this.replay.active || !this.replay.scenario) {
      return;
    }

    const scenario = this.replay.scenario;
    const elapsedSec = Math.max(0, Math.floor((now.getTime() - this.replay.startMs) / 1000));
    const stageIndex = this.getStageIndexForElapsed(scenario, elapsedSec);

    if (stageIndex > this.replay.lastStageIndex) {
      for (let index = this.replay.lastStageIndex + 1; index <= stageIndex; index += 1) {
        const stage = scenario.stages[index];
        if (!stage) {
          continue;
        }
        this.pushTimeline({
          incidentId: scenario.id,
          kind: "stage",
          severity: index >= 2 ? "critical" : index === 1 ? "high" : "medium",
          title: stage.title,
          details: stage.narrative,
        });
      }
      this.replay.lastStageIndex = stageIndex;
    }

    if (elapsedSec >= scenario.durationSec) {
      this.pushTimeline({
        incidentId: scenario.id,
        kind: "mitigation",
        severity: "medium",
        title: `${scenario.name} mitigation complete`,
        details: "Replay reached planned duration and stabilized",
      });
      this.replay.active = false;
      this.replay.completed = true;
    }
  }

  private getStageIndexForElapsed(scenario: IncidentScenario, elapsedSec: number): number {
    let stageIndex = -1;
    for (let index = 0; index < scenario.stages.length; index += 1) {
      if (elapsedSec >= scenario.stages[index].offsetSec) {
        stageIndex = index;
      }
    }
    return stageIndex;
  }

  private evaluateAlerts(point: ServiceMetricsPoint): void {
    const thresholds = this.evaluateThresholds(point);
    const seenFingerprints = new Set<string>();

    for (const threshold of thresholds) {
      const fingerprint = `${point.service}:${threshold.metric}`;
      seenFingerprints.add(fingerprint);
      const current = this.activeAlertsByFingerprint.get(fingerprint);

      if (current) {
        current.severity = threshold.severity;
        current.currentValue = pct(threshold.currentValue);
        current.updatedAt = point.timestamp;
        current.incidentId = point.incidentId;
        current.traceId = point.traceId;
        continue;
      }

      const alert: AlertEvent = {
        id: id(),
        fingerprint,
        service: point.service,
        severity: threshold.severity,
        status: "active",
        sourceMetric: threshold.metric,
        summary: threshold.summary,
        threshold: threshold.threshold,
        currentValue: pct(threshold.currentValue),
        openedAt: point.timestamp,
        updatedAt: point.timestamp,
        incidentId: point.incidentId,
        traceId: point.traceId,
      };

      this.activeAlertsByFingerprint.set(fingerprint, alert);
      this.alertHistory.push(alert);
      this.trim(this.alertHistory, MAX_ALERT_HISTORY);

      if (point.incidentId) {
        this.pushTimeline({
          incidentId: point.incidentId,
          kind: "alert",
          severity: alert.severity,
          title: `${alert.service} ${alert.sourceMetric} alert`,
          details: `${alert.summary} (${alert.currentValue})`,
        });
      }
    }

    for (const [fingerprint, alert] of this.activeAlertsByFingerprint.entries()) {
      if (!fingerprint.startsWith(`${point.service}:`)) {
        continue;
      }
      if (seenFingerprints.has(fingerprint)) {
        continue;
      }
      alert.status = "resolved";
      alert.updatedAt = point.timestamp;
      alert.closedAt = point.timestamp;
      this.activeAlertsByFingerprint.delete(fingerprint);
    }
  }

  private evaluateThresholds(point: ServiceMetricsPoint): AlertThreshold[] {
    const thresholds: AlertThreshold[] = [];

    const availabilitySeverity = this.severityFor("availability", point.availability);
    if (availabilitySeverity) {
      thresholds.push({
        metric: "availability",
        summary: "Availability below SLO",
        threshold: availabilitySeverity.threshold,
        compare: "lt",
        severity: availabilitySeverity.severity,
        currentValue: point.availability,
      });
    }

    const latencySeverity = this.severityFor("latency", point.latencyP95Ms);
    if (latencySeverity) {
      thresholds.push({
        metric: "latency",
        summary: "Latency p95 above objective",
        threshold: latencySeverity.threshold,
        compare: "gt",
        severity: latencySeverity.severity,
        currentValue: point.latencyP95Ms,
      });
    }

    const errorSeverity = this.severityFor("errorRate", point.errorRatePct);
    if (errorSeverity) {
      thresholds.push({
        metric: "errorRate",
        summary: "Error rate above objective",
        threshold: errorSeverity.threshold,
        compare: "gt",
        severity: errorSeverity.severity,
        currentValue: point.errorRatePct,
      });
    }

    const saturationSeverity = this.severityFor("saturation", point.saturationPct);
    if (saturationSeverity) {
      thresholds.push({
        metric: "saturation",
        summary: "Saturation above safe threshold",
        threshold: saturationSeverity.threshold,
        compare: "gt",
        severity: saturationSeverity.severity,
        currentValue: point.saturationPct,
      });
    }

    return thresholds;
  }

  private severityFor(
    metric: "availability" | "latency" | "errorRate" | "saturation",
    value: number,
  ): { severity: Severity; threshold: number } | null {
    if (metric === "availability") {
      if (value < 99) {
        return { severity: "critical", threshold: 99 };
      }
      if (value < 99.5) {
        return { severity: "high", threshold: 99.5 };
      }
      if (value < 99.8) {
        return { severity: "medium", threshold: 99.8 };
      }
      return null;
    }

    if (metric === "latency") {
      if (value > 1000) {
        return { severity: "critical", threshold: 1000 };
      }
      if (value > 700) {
        return { severity: "high", threshold: 700 };
      }
      if (value > 450) {
        return { severity: "medium", threshold: 450 };
      }
      return null;
    }

    if (metric === "errorRate") {
      if (value > 5) {
        return { severity: "critical", threshold: 5 };
      }
      if (value > 2.5) {
        return { severity: "high", threshold: 2.5 };
      }
      if (value > 1.2) {
        return { severity: "medium", threshold: 1.2 };
      }
      return null;
    }

    if (value > 90) {
      return { severity: "critical", threshold: 90 };
    }
    if (value > 80) {
      return { severity: "high", threshold: 80 };
    }
    if (value > 70) {
      return { severity: "medium", threshold: 70 };
    }
    return null;
  }

  private pushTimeline(event: Omit<IncidentTimelineEvent, "id" | "timestamp">): void {
    this.timeline.push({
      id: id(),
      timestamp: nowIso(),
      ...event,
    });
    this.trim(this.timeline, MAX_TIMELINE);
  }

  private trim<T>(array: T[], max: number): void {
    while (array.length > max) {
      array.shift();
    }
  }
}

export const loadServiceProfiles = (): ServiceProfile[] => {
  const filepath = path.join(REPO_ROOT, "data/seed/services.json");
  return JSON.parse(readFileSync(filepath, "utf8")) as ServiceProfile[];
};

export const loadIncidentScenarios = (): IncidentScenario[] => {
  const filepath = path.join(REPO_ROOT, "data/scenarios/incidents.json");
  return JSON.parse(readFileSync(filepath, "utf8")) as IncidentScenario[];
};

export const createStore = (): TelemetryStore => {
  const store = new TelemetryStore(loadServiceProfiles(), loadIncidentScenarios());
  store.bootstrapHistory();
  return store;
};
