import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import {
  AlertEvent,
  CorrelationResponse,
  KpiOverview,
  LogEvent,
  ReplayState,
  Scenario,
  ServiceCard,
  TimeSeriesResponse,
  TimelineEvent,
  TraceEvent,
} from "../types";

const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:8080";
const POLL_MS = Number(import.meta.env.VITE_POLL_MS ?? 3000);

const client = axios.create({
  baseURL: API_BASE,
  timeout: 3000,
});

export const useCommandCenterData = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [overview, setOverview] = useState<KpiOverview | null>(null);
  const [services, setServices] = useState<ServiceCard[]>([]);
  const [timeseries, setTimeseries] = useState<TimeSeriesResponse | null>(null);
  const [activeAlerts, setActiveAlerts] = useState<AlertEvent[]>([]);
  const [alertHistory, setAlertHistory] = useState<AlertEvent[]>([]);
  const [timeline, setTimeline] = useState<TimelineEvent[]>([]);
  const [traces, setTraces] = useState<TraceEvent[]>([]);
  const [logs, setLogs] = useState<LogEvent[]>([]);
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [replayState, setReplayState] = useState<ReplayState | null>(null);

  const [selectedTraceId, setSelectedTraceId] = useState<string | null>(null);
  const [correlation, setCorrelation] = useState<CorrelationResponse | null>(null);

  const pollingRef = useRef<number | null>(null);

  const refresh = useCallback(async () => {
    try {
      const [
        overviewResponse,
        servicesResponse,
        timeseriesResponse,
        alertsResponse,
        timelineResponse,
        tracesResponse,
        logsResponse,
        scenariosResponse,
        replayStateResponse,
      ] = await Promise.all([
        client.get<KpiOverview>("/api/overview"),
        client.get<{ services: ServiceCard[] }>("/api/services"),
        client.get<TimeSeriesResponse>("/api/kpi/timeseries", {
          params: { minutes: 60 },
        }),
        client.get<{ active: AlertEvent[]; history: AlertEvent[] }>("/api/alerts"),
        client.get<{ timeline: TimelineEvent[] }>("/api/incidents/timeline", {
          params: { limit: 160 },
        }),
        client.get<{ traces: TraceEvent[] }>("/api/traces", { params: { limit: 120 } }),
        client.get<{ logs: LogEvent[] }>("/api/logs", { params: { limit: 120 } }),
        client.get<{ scenarios: Scenario[] }>("/api/replay/scenarios"),
        client.get<ReplayState>("/api/replay/state"),
      ]);

      setOverview(overviewResponse.data);
      setServices(servicesResponse.data.services);
      setTimeseries(timeseriesResponse.data);
      setActiveAlerts(alertsResponse.data.active);
      setAlertHistory(alertsResponse.data.history);
      setTimeline(timelineResponse.data.timeline);
      setTraces(tracesResponse.data.traces);
      setLogs(logsResponse.data.logs);
      setScenarios(scenariosResponse.data.scenarios);
      setReplayState(replayStateResponse.data);

      if (selectedTraceId) {
        const corr = await client.get<CorrelationResponse>(`/api/correlation/${selectedTraceId}`);
        setCorrelation(corr.data);
      }

      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "unknown error");
    } finally {
      setLoading(false);
    }
  }, [selectedTraceId]);

  useEffect(() => {
    refresh();
    pollingRef.current = window.setInterval(refresh, POLL_MS);

    return () => {
      if (pollingRef.current !== null) {
        window.clearInterval(pollingRef.current);
      }
    };
  }, [refresh]);

  const selectTrace = useCallback(async (traceId: string) => {
    setSelectedTraceId(traceId);
    try {
      const response = await client.get<CorrelationResponse>(`/api/correlation/${traceId}`);
      setCorrelation(response.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "failed to load correlation");
    }
  }, []);

  const startReplay = useCallback(async (scenarioId: string) => {
    await client.post("/api/replay/start", { scenarioId });
    await refresh();
  }, [refresh]);

  const stopReplay = useCallback(async () => {
    await client.post("/api/replay/stop");
    await refresh();
  }, [refresh]);

  const latestLatencyAcrossServices = useMemo(() => {
    if (!timeseries) {
      return [] as Array<{ timestamp: string; latencyP95Ms: number; errorRatePct: number }>;
    }

    const buckets = new Map<string, { latencies: number[]; errors: number[] }>();

    const allSeries = Object.values(timeseries.series) as TimeSeriesResponse["series"][string][];
    allSeries.forEach((points) => {
      points.forEach((point) => {
        const bucket = buckets.get(point.timestamp) ?? { latencies: [], errors: [] };
        bucket.latencies.push(point.latencyP95Ms);
        bucket.errors.push(point.errorRatePct);
        buckets.set(point.timestamp, bucket);
      });
    });

    return [...buckets.entries()]
      .map(([timestamp, values]) => ({
        timestamp,
        latencyP95Ms:
          values.latencies.reduce((sum, value) => sum + value, 0) / values.latencies.length,
        errorRatePct: values.errors.reduce((sum, value) => sum + value, 0) / values.errors.length,
      }))
      .sort((a, b) => a.timestamp.localeCompare(b.timestamp));
  }, [timeseries]);

  return {
    loading,
    error,
    overview,
    services,
    timeseries,
    activeAlerts,
    alertHistory,
    timeline,
    traces,
    logs,
    scenarios,
    replayState,
    selectedTraceId,
    correlation,
    refresh,
    selectTrace,
    startReplay,
    stopReplay,
    latestLatencyAcrossServices,
  };
};
