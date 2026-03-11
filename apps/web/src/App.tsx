import { AnimatePresence, motion } from "framer-motion";
import { AlertCenter } from "./components/AlertCenter";
import { CorrelationPanel } from "./components/CorrelationPanel";
import { KpiCards } from "./components/KpiCards";
import { ReplayPanel } from "./components/ReplayPanel";
import { ServiceGrid } from "./components/ServiceGrid";
import { TimeseriesPanel } from "./components/TimeseriesPanel";
import { useCommandCenterData } from "./hooks/useCommandCenterData";

const heroVariants = {
  hidden: { opacity: 0, y: 14 },
  visible: { opacity: 1, y: 0 },
};

function App() {
  const {
    loading,
    error,
    overview,
    services,
    activeAlerts,
    timeline,
    traces,
    scenarios,
    replayState,
    selectedTraceId,
    correlation,
    selectTrace,
    startReplay,
    stopReplay,
    latestLatencyAcrossServices,
  } = useCommandCenterData();

  return (
    <div className="app-shell">
      <div className="bg-noise" />
      <header className="hero">
        <motion.div initial="hidden" animate="visible" variants={heroVariants}>
          <p className="eyebrow">Observability Command Center</p>
          <h1>Client-ready Reliability Storytelling</h1>
          <p className="subtitle">
            Unified view for logs, metrics, traces and incident intelligence across an
            e-commerce/SaaS runtime.
          </p>
        </motion.div>

        <motion.div
          className="hero-side"
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
          <p>Last refresh</p>
          <strong>
            {overview?.generatedAt
              ? new Date(overview.generatedAt).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                  second: "2-digit",
                })
              : "--"}
          </strong>
          <small>
            {overview?.replay.active
              ? `Replay: ${overview.replay.scenarioName} (${overview.replay.progressPct.toFixed(0)}%)`
              : "Replay idle"}
          </small>
        </motion.div>
      </header>

      <AnimatePresence>
        {error ? (
          <motion.div className="error-banner" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            Data fetch error: {error}
          </motion.div>
        ) : null}
      </AnimatePresence>

      {loading ? (
        <div className="loading-panel">Loading telemetry streams…</div>
      ) : (
        <main className="content-stack">
          <KpiCards overview={overview} />

          <section className="grid-dual">
            <TimeseriesPanel series={latestLatencyAcrossServices} />
            <ServiceGrid services={services} />
          </section>

          <CorrelationPanel
            traces={traces}
            selectedTraceId={selectedTraceId}
            correlation={correlation}
            onSelectTrace={selectTrace}
          />

          <AlertCenter activeAlerts={activeAlerts} timeline={timeline} />

          <ReplayPanel
            scenarios={scenarios}
            replayState={replayState}
            onStartReplay={startReplay}
            onStopReplay={stopReplay}
          />
        </main>
      )}
    </div>
  );
}

export default App;
