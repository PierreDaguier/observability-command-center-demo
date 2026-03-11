export type Severity = "low" | "medium" | "high" | "critical";

export interface KpiOverview {
  generatedAt: string;
  kpi: {
    availability: number;
    latencyP95Ms: number;
    errorBudgetRemainingPct: number;
    burnRate: number;
  };
  counts: {
    activeAlerts: number;
    incidentsInTimeline: number;
    services: number;
  };
  replay: ReplayState;
}

export interface ReplayState {
  active: boolean;
  scenarioId?: string;
  scenarioName?: string;
  startedAt?: string;
  elapsedSec: number;
  progressPct: number;
  activeStageIndex: number;
  activeStageTitle?: string;
  activeStageNarrative?: string;
  completed: boolean;
}

export interface ServiceCard {
  id: string;
  domain: string;
  tier: "critical" | "high" | "standard";
  status: "healthy" | "degraded";
  latest: null | {
    availability: number;
    latencyP95Ms: number;
    errorRatePct: number;
    throughputRps: number;
    saturationPct: number;
    errorBudgetRemainingPct: number;
    traceId?: string;
    incidentId?: string;
    timestamp: string;
  };
}

export interface TimeSeriesResponse {
  windowMinutes: number;
  series: Record<
    string,
    Array<{
      service: string;
      timestamp: string;
      availability: number;
      latencyP95Ms: number;
      errorRatePct: number;
      throughputRps: number;
      saturationPct: number;
      errorBudgetRemainingPct: number;
      traceId?: string;
    }>
  >;
}

export interface AlertEvent {
  id: string;
  fingerprint: string;
  service: string;
  severity: Severity;
  status: "active" | "resolved";
  sourceMetric: "availability" | "latency" | "errorRate" | "saturation";
  summary: string;
  threshold: number;
  currentValue: number;
  openedAt: string;
  updatedAt: string;
  closedAt?: string;
  incidentId?: string;
  traceId?: string;
}

export interface TraceEvent {
  traceId: string;
  spanId: string;
  service: string;
  operation: string;
  status: "ok" | "error";
  durationMs: number;
  timestamp: string;
  incidentId?: string;
}

export interface LogEvent {
  id: string;
  service: string;
  level: "debug" | "info" | "warn" | "error";
  message: string;
  timestamp: string;
  traceId?: string;
  incidentId?: string;
}

export interface CorrelationResponse {
  trace: TraceEvent | null;
  logs: LogEvent[];
  metric: {
    service: string;
    timestamp: string;
    availability: number;
    latencyP95Ms: number;
    errorRatePct: number;
    throughputRps: number;
    saturationPct: number;
    errorBudgetRemainingPct: number;
    incidentId?: string;
  } | null;
  relatedAlerts: AlertEvent[];
}

export interface TimelineEvent {
  id: string;
  incidentId: string;
  timestamp: string;
  kind: "start" | "stage" | "alert" | "mitigation" | "end";
  severity: Severity;
  title: string;
  details: string;
}

export interface Scenario {
  id: string;
  name: string;
  description: string;
  durationSec: number;
  businessImpact: string;
  stages: Array<{
    offsetSec: number;
    title: string;
    narrative: string;
  }>;
}
