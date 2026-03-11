import "dotenv/config";
import { appendFileSync, mkdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { randomBytes } from "node:crypto";
import axios from "axios";
import { NodeSDK } from "@opentelemetry/sdk-node";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import { OTLPMetricExporter } from "@opentelemetry/exporter-metrics-otlp-http";
import { PeriodicExportingMetricReader } from "@opentelemetry/sdk-metrics";
import { metrics, trace } from "@opentelemetry/api";

type ServiceProfile = {
  id: string;
  domain: string;
  tier: "critical" | "high" | "standard";
  latencyP95Ms: number;
  availability: number;
  errorRatePct: number;
  throughputRps: number;
  saturationPct: number;
  errorBudgetRemainingPct: number;
};

type ReplayEffectsResponse = {
  replay: {
    active: boolean;
    scenarioId?: string;
    activeStageTitle?: string;
  };
  overrides: Record<
    string,
    {
      latencyMultiplier: number;
      errorRateDelta: number;
      availabilityDelta: number;
      trafficMultiplier: number;
      saturationDelta: number;
      logTemplate: string;
    }
  >;
};

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "../../../");

const API_URL = process.env.API_URL ?? "http://localhost:8080";
const OTEL_ENDPOINT = process.env.OTEL_EXPORTER_OTLP_ENDPOINT ?? "http://localhost:4318";
const LOG_FILE = process.env.LOG_FILE ?? path.join(repoRoot, "data/logs/simulator.log");
const TICK_MS = Number(process.env.SIM_TICK_MS ?? 1000);

const loadProfiles = (): ServiceProfile[] => {
  const filePath = path.join(repoRoot, "data/seed/services.json");
  return JSON.parse(readFileSync(filePath, "utf8")) as ServiceProfile[];
};

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

const jitter = (base: number, ratio = 0.06): number =>
  base + (Math.random() * 2 - 1) * base * ratio;

const randomHex = (size: number): string => randomBytes(size).toString("hex");

const operationByService: Record<string, string> = {
  "api-gateway": "GET /graphql",
  "checkout-api": "POST /checkout",
  "payments-api": "POST /payments/authorize",
  "auth-service": "POST /oauth/token",
  "inventory-service": "GET /inventory/:sku",
  "billing-worker": "POST /billing/reconcile",
};

const logLine = (payload: Record<string, unknown>): void => {
  mkdirSync(path.dirname(LOG_FILE), { recursive: true });
  appendFileSync(LOG_FILE, `${JSON.stringify(payload)}\n`, "utf8");
};

const main = async (): Promise<void> => {
  const sdk = new NodeSDK({
    traceExporter: new OTLPTraceExporter({
      url: `${OTEL_ENDPOINT}/v1/traces`,
    }),
    metricReader: new PeriodicExportingMetricReader({
      exporter: new OTLPMetricExporter({
        url: `${OTEL_ENDPOINT}/v1/metrics`,
      }),
      exportIntervalMillis: 3000,
    }),
  });

  await sdk.start();

  const profiles = loadProfiles();
  const meter = metrics.getMeter("occ-simulator");
  const tracer = trace.getTracer("occ-simulator");

  const requestCounter = meter.createCounter("occ_requests_total", {
    description: "Simulated request volume by service",
  });
  const errorCounter = meter.createCounter("occ_errors_total", {
    description: "Simulated request errors by service",
  });
  const latencyHistogram = meter.createHistogram("occ_latency_p95_ms", {
    description: "Simulated p95 latency",
    unit: "ms",
  });
  const availabilityHistogram = meter.createHistogram("occ_availability_pct", {
    description: "Simulated service availability percentage",
    unit: "%",
  });

  let tick = 0;
  let running = false;

  setInterval(async () => {
    if (running) {
      return;
    }

    running = true;
    tick += 1;

    try {
      const replayEffects: ReplayEffectsResponse = await axios
        .get<ReplayEffectsResponse>(`${API_URL}/api/replay/effects`, {
          timeout: 1200,
        })
        .then((response) => response.data)
        .catch(() => ({
          replay: { active: false, scenarioId: undefined, activeStageTitle: undefined },
          overrides: {},
        }));

      const now = new Date().toISOString();

      const servicesPayload = profiles.map((profile, index) => {
        const cyclical = Math.sin((tick + index * 7) / 12);
        const override = replayEffects.overrides[profile.id];

        let availability = jitter(profile.availability + cyclical * 0.08, 0.002);
        let latencyP95Ms = jitter(profile.latencyP95Ms * (1 + cyclical * 0.11), 0.06);
        let errorRatePct = jitter(Math.max(profile.errorRatePct + cyclical * 0.1, 0.02), 0.14);
        let throughputRps = jitter(profile.throughputRps * (1 + cyclical * 0.12), 0.08);
        let saturationPct = jitter(profile.saturationPct * (1 + cyclical * 0.08), 0.07);
        let errorBudgetRemainingPct = profile.errorBudgetRemainingPct - errorRatePct * 0.022;

        if (override) {
          availability += override.availabilityDelta;
          latencyP95Ms *= override.latencyMultiplier;
          errorRatePct += override.errorRateDelta;
          throughputRps *= override.trafficMultiplier;
          saturationPct += override.saturationDelta;
          errorBudgetRemainingPct -= override.errorRateDelta * 0.85;
        }

        availability = clamp(availability, 95.5, 100);
        latencyP95Ms = clamp(latencyP95Ms, 60, 2100);
        errorRatePct = clamp(errorRatePct, 0.01, 24);
        throughputRps = clamp(throughputRps, 20, 4000);
        saturationPct = clamp(saturationPct, 5, 100);
        errorBudgetRemainingPct = clamp(errorBudgetRemainingPct, 0, 100);

        const traceId = randomHex(16);
        const spanId = randomHex(8);
        const isError = errorRatePct > 3 || availability < 99.5;
        const logLevel = isError ? (errorRatePct > 5 ? "error" : "warn") : "info";
        const defaultMessage = isError
          ? `SLO drift detected on ${profile.id}`
          : `${profile.id} operating within expected baseline`;

        tracer.startActiveSpan(operationByService[profile.id] ?? "service.operation", (span) => {
          span.setAttribute("service.name", profile.id);
          span.setAttribute("occ.replay.active", replayEffects.replay.active);
          span.setAttribute("occ.replay.stage", replayEffects.replay.activeStageTitle ?? "none");
          span.setAttribute("occ.error_rate_pct", Number(errorRatePct.toFixed(3)));
          span.setAttribute("occ.latency_p95_ms", Number(latencyP95Ms.toFixed(2)));
          if (isError) {
            span.recordException(new Error(`Synthetic ${profile.id} degradation`));
          }
          span.end();
        });

        const attributes = {
          service: profile.id,
          domain: profile.domain,
          tier: profile.tier,
        };

        requestCounter.add(Math.round(throughputRps), attributes);
        errorCounter.add(Math.round((throughputRps * errorRatePct) / 100), attributes);
        latencyHistogram.record(latencyP95Ms, attributes);
        availabilityHistogram.record(availability, attributes);

        const logPayload = {
          timestamp: now,
          service: profile.id,
          level: logLevel,
          message: override?.logTemplate ?? defaultMessage,
          traceId,
          incidentId: replayEffects.replay.scenarioId,
          latencyP95Ms: Number(latencyP95Ms.toFixed(2)),
          errorRatePct: Number(errorRatePct.toFixed(3)),
          availability: Number(availability.toFixed(3)),
        };

        logLine(logPayload);

        return {
          service: profile.id,
          availability: Number(availability.toFixed(3)),
          latencyP95Ms: Number(latencyP95Ms.toFixed(2)),
          errorRatePct: Number(errorRatePct.toFixed(3)),
          throughputRps: Number(throughputRps.toFixed(2)),
          saturationPct: Number(saturationPct.toFixed(2)),
          errorBudgetRemainingPct: Number(errorBudgetRemainingPct.toFixed(2)),
          incidentId: replayEffects.replay.scenarioId,
          trace: {
            traceId,
            spanId,
            service: profile.id,
            operation: operationByService[profile.id] ?? "service.operation",
            status: isError ? "error" : "ok",
            durationMs: Number(latencyP95Ms.toFixed(2)),
            timestamp: now,
            incidentId: replayEffects.replay.scenarioId,
            attributes: {
              tier: profile.tier,
              domain: profile.domain,
            },
          },
          log: {
            service: profile.id,
            level: logLevel,
            message: override?.logTemplate ?? defaultMessage,
            traceId,
            incidentId: replayEffects.replay.scenarioId,
            attributes: {
              stage: replayEffects.replay.activeStageTitle ?? "baseline",
              replayActive: replayEffects.replay.active,
            },
          },
        };
      });

      await axios.post(
        `${API_URL}/api/telemetry/batch`,
        {
          generatedAt: now,
          tick,
          replayId: replayEffects.replay.scenarioId,
          services: servicesPayload,
        },
        {
          timeout: 1600,
        },
      );

      console.log(
        JSON.stringify({
          level: "info",
          tick,
          replayActive: replayEffects.replay.active,
          scenario: replayEffects.replay.scenarioId,
          message: "telemetry batch sent",
        }),
      );
    } catch (error) {
      console.error(
        JSON.stringify({
          level: "error",
          tick,
          message: "telemetry tick failed",
          error: error instanceof Error ? error.message : "unknown",
        }),
      );
    } finally {
      running = false;
    }
  }, TICK_MS);

  process.on("SIGINT", async () => {
    await sdk.shutdown();
    process.exit(0);
  });
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
