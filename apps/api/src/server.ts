import "dotenv/config";
import Fastify from "fastify";
import cors from "@fastify/cors";
import { z } from "zod";
import { createStore } from "./store.js";

const port = Number(process.env.API_PORT ?? 8080);
const host = process.env.API_HOST ?? "0.0.0.0";

const app = Fastify({
  logger: {
    level: process.env.LOG_LEVEL ?? "info",
  },
});

const store = createStore();

const traceSchema = z.object({
  traceId: z.string(),
  spanId: z.string(),
  parentSpanId: z.string().optional(),
  service: z.string(),
  operation: z.string(),
  status: z.enum(["ok", "error"]),
  durationMs: z.number(),
  timestamp: z.string(),
  incidentId: z.string().optional(),
  attributes: z.record(z.union([z.string(), z.number(), z.boolean()])).optional(),
});

const logSchema = z.object({
  service: z.string(),
  level: z.enum(["debug", "info", "warn", "error"]),
  message: z.string(),
  traceId: z.string().optional(),
  incidentId: z.string().optional(),
  attributes: z.record(z.union([z.string(), z.number(), z.boolean()])).optional(),
});

const telemetryItemSchema = z.object({
  service: z.string(),
  availability: z.number(),
  latencyP95Ms: z.number(),
  errorRatePct: z.number(),
  throughputRps: z.number(),
  saturationPct: z.number(),
  errorBudgetRemainingPct: z.number(),
  incidentId: z.string().optional(),
  trace: traceSchema.optional(),
  log: logSchema.optional(),
});

const telemetryBatchSchema = z.object({
  generatedAt: z.string(),
  tick: z.number(),
  replayId: z.string().optional(),
  services: z.array(telemetryItemSchema),
});

const replayStartSchema = z.object({
  scenarioId: z.string(),
});

const parseIntWithDefault = (input: unknown, fallback: number): number => {
  const n = Number(input);
  if (Number.isNaN(n) || !Number.isFinite(n)) {
    return fallback;
  }
  return Math.trunc(n);
};

const main = async (): Promise<void> => {
  await app.register(cors, {
    origin: true,
    methods: ["GET", "POST", "OPTIONS"],
  });

  app.get("/health", async () => ({
    status: "ok",
    uptimeSec: process.uptime(),
    generatedAt: new Date().toISOString(),
  }));

  app.get("/api/overview", async () => store.getOverview());

  app.get("/api/services", async () => ({
    services: store.getServiceCards(),
  }));

  app.get("/api/kpi/timeseries", async (request) => {
    const query = request.query as { minutes?: string; service?: string };
    const minutes = Math.min(Math.max(parseIntWithDefault(query.minutes, 45), 5), 240);
    return {
      windowMinutes: minutes,
      series: store.getTimeseries(minutes, query.service),
    };
  });

  app.get("/api/logs", async (request) => {
    const query = request.query as { service?: string; limit?: string };
    const limit = Math.min(Math.max(parseIntWithDefault(query.limit, 120), 20), 400);
    return {
      logs: store.getLogs(query.service, limit),
    };
  });

  app.get("/api/traces", async (request) => {
    const query = request.query as { service?: string; limit?: string };
    const limit = Math.min(Math.max(parseIntWithDefault(query.limit, 120), 20), 400);
    return {
      traces: store.getTraces(query.service, limit),
    };
  });

  app.get("/api/alerts", async (request) => {
    const query = request.query as { status?: "active" | "resolved" };
    return {
      active: store.getActiveAlerts(),
      history: store.getAlerts(query.status),
    };
  });

  app.get("/api/incidents/timeline", async (request) => {
    const query = request.query as { limit?: string };
    const limit = Math.min(Math.max(parseIntWithDefault(query.limit, 120), 20), 400);
    return {
      timeline: store.getTimeline(limit),
    };
  });

  app.get("/api/correlation/:traceId", async (request) => {
    const params = request.params as { traceId: string };
    return store.getCorrelation(params.traceId);
  });

  app.get("/api/replay/scenarios", async () => ({
    scenarios: store.listScenarios(),
  }));

  app.get("/api/replay/state", async () => store.getReplayState());

  app.get("/api/replay/effects", async () => ({
    replay: store.getReplayState(),
    overrides: store.getReplayOverrides(),
  }));

  app.post("/api/replay/start", async (request, reply) => {
    const parsed = replayStartSchema.safeParse(request.body);
    if (!parsed.success) {
      reply.code(400);
      return { error: "invalid_replay_payload", details: parsed.error.flatten() };
    }

    const state = store.startReplay(parsed.data.scenarioId);
    if (!state) {
      reply.code(404);
      return { error: "scenario_not_found" };
    }

    return state;
  });

  app.post("/api/replay/stop", async () => store.stopReplay());

  app.post("/api/telemetry/batch", async (request, reply) => {
    const parsed = telemetryBatchSchema.safeParse(request.body);
    if (!parsed.success) {
      reply.code(400);
      return {
        error: "invalid_telemetry_payload",
        details: parsed.error.flatten(),
      };
    }

    return store.ingest(parsed.data);
  });

  await app.listen({ port, host });
  app.log.info({ port, host }, "Observability API started");
};

main().catch((error) => {
  app.log.error(error, "failed to start API");
  process.exit(1);
});
