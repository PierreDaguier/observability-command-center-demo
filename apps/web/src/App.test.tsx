import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import App from "./App";

vi.mock("./hooks/useCommandCenterData", () => ({
  useCommandCenterData: () => ({
    loading: false,
    error: null,
    overview: {
      generatedAt: new Date().toISOString(),
      kpi: {
        availability: 99.9,
        latencyP95Ms: 220,
        errorBudgetRemainingPct: 86,
        burnRate: 1.1,
      },
      counts: {
        activeAlerts: 1,
        incidentsInTimeline: 8,
        services: 6,
      },
      replay: {
        active: false,
        elapsedSec: 0,
        progressPct: 0,
        activeStageIndex: -1,
        completed: false,
      },
    },
    services: [],
    timeseries: null,
    activeAlerts: [],
    alertHistory: [],
    timeline: [],
    traces: [],
    logs: [],
    scenarios: [],
    replayState: null,
    selectedTraceId: null,
    correlation: null,
    refresh: vi.fn(),
    selectTrace: vi.fn(),
    startReplay: vi.fn(),
    stopReplay: vi.fn(),
    latestLatencyAcrossServices: [],
  }),
}));

describe("App", () => {
  it("renders the command center title", () => {
    render(<App />);
    expect(screen.getByText(/Observability Command Center/i)).toBeInTheDocument();
  });
});
