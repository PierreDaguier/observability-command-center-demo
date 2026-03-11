export type ServiceTier = "critical" | "high" | "standard";

export type LogLevel = "debug" | "info" | "warn" | "error";

export type Severity = "low" | "medium" | "high" | "critical";

export type AlertStatus = "active" | "resolved";

export interface ServiceProfile {
  id: string;
  domain: string;
  tier: ServiceTier;
  latencyP95Ms: number;
  availability: number;
  errorRatePct: number;
  throughputRps: number;
  saturationPct: number;
  errorBudgetRemainingPct: number;
}

export interface TraceEvent {
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
}

export interface LogEvent {
  id: string;
  service: string;
  level: LogLevel;
  message: string;
  timestamp: string;
  traceId?: string;
  incidentId?: string;
  attributes?: Record<string, string | number | boolean>;
}

export interface ServiceMetricsPoint {
  service: string;
  timestamp: string;
  availability: number;
  latencyP95Ms: number;
  errorRatePct: number;
  throughputRps: number;
  saturationPct: number;
  errorBudgetRemainingPct: number;
  incidentId?: string;
  traceId?: string;
}

export interface AlertEvent {
  id: string;
  fingerprint: string;
  service: string;
  severity: Severity;
  status: AlertStatus;
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

export interface ScenarioStageOverride {
  latencyMultiplier: number;
  errorRateDelta: number;
  availabilityDelta: number;
  trafficMultiplier: number;
  saturationDelta: number;
  logTemplate: string;
}

export interface ScenarioStage {
  offsetSec: number;
  title: string;
  narrative: string;
  overrides: Record<string, ScenarioStageOverride>;
}

export interface IncidentScenario {
  id: string;
  name: string;
  description: string;
  durationSec: number;
  businessImpact: string;
  stages: ScenarioStage[];
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

export interface IncidentTimelineEvent {
  id: string;
  incidentId: string;
  timestamp: string;
  kind: "start" | "stage" | "alert" | "mitigation" | "end";
  severity: Severity;
  title: string;
  details: string;
}

export interface TelemetryServiceInput {
  service: string;
  availability: number;
  latencyP95Ms: number;
  errorRatePct: number;
  throughputRps: number;
  saturationPct: number;
  errorBudgetRemainingPct: number;
  incidentId?: string;
  trace?: TraceEvent;
  log?: Omit<LogEvent, "id" | "timestamp">;
}

export interface TelemetryBatchInput {
  generatedAt: string;
  tick: number;
  replayId?: string;
  services: TelemetryServiceInput[];
}

export interface CorrelationResult {
  trace: TraceEvent | null;
  logs: LogEvent[];
  metric: ServiceMetricsPoint | null;
  relatedAlerts: AlertEvent[];
}
