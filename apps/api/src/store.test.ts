import { describe, expect, it } from "vitest";
import { TelemetryStore, loadIncidentScenarios, loadServiceProfiles } from "./store.js";

describe("TelemetryStore", () => {
  it("opens and resolves alerts based on thresholds", () => {
    const store = new TelemetryStore(loadServiceProfiles(), loadIncidentScenarios());
    const timestamp = new Date().toISOString();

    store.ingest({
      generatedAt: timestamp,
      tick: 1,
      services: [
        {
          service: "checkout-api",
          availability: 98.7,
          latencyP95Ms: 1220,
          errorRatePct: 6.1,
          throughputRps: 340,
          saturationPct: 96,
          errorBudgetRemainingPct: 63,
          incidentId: "checkout-lockstorm",
        },
      ],
    });

    expect(store.getActiveAlerts().length).toBeGreaterThanOrEqual(3);

    store.ingest({
      generatedAt: new Date(Date.now() + 5000).toISOString(),
      tick: 2,
      services: [
        {
          service: "checkout-api",
          availability: 99.95,
          latencyP95Ms: 190,
          errorRatePct: 0.3,
          throughputRps: 820,
          saturationPct: 41,
          errorBudgetRemainingPct: 84,
        },
      ],
    });

    expect(store.getActiveAlerts().length).toBe(0);
  });

  it("returns replay overrides when scenario is active", () => {
    const store = new TelemetryStore(loadServiceProfiles(), loadIncidentScenarios());
    const state = store.startReplay("checkout-lockstorm");

    expect(state?.active).toBe(true);
    const overrides = store.getReplayOverrides();
    expect(Object.keys(overrides).length).toBeGreaterThan(0);
  });
});
