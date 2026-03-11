import { motion } from "framer-motion";
import { ReplayState, Scenario } from "../types";

type Props = {
  scenarios: Scenario[];
  replayState: ReplayState | null;
  onStartReplay: (scenarioId: string) => Promise<void>;
  onStopReplay: () => Promise<void>;
};

const formatDuration = (seconds: number): string => {
  const min = Math.floor(seconds / 60);
  const sec = seconds % 60;
  return `${min}m ${String(sec).padStart(2, "0")}s`;
};

export const ReplayPanel = ({ scenarios, replayState, onStartReplay, onStopReplay }: Props) => (
  <section className="panel">
    <div className="panel-head">
      <h2>Incident Replay Mode</h2>
      <p>Preloaded scenarios for demo narrative and deterministic troubleshooting walkthrough.</p>
    </div>

    <div className="replay-status">
      <div>
        <p className="status-title">Replay state</p>
        <h3>
          {replayState?.active
            ? `Running: ${replayState.scenarioName}`
            : replayState?.completed
              ? `Completed: ${replayState.scenarioName ?? "n/a"}`
              : "Idle"}
        </h3>
        <p>
          {replayState?.activeStageTitle ?? "No active stage"}
          {replayState?.activeStageNarrative ? ` — ${replayState.activeStageNarrative}` : ""}
        </p>
      </div>
      <div className="progress-wrap">
        <div className="progress-bar">
          <motion.span
            animate={{ width: `${replayState?.progressPct ?? 0}%` }}
            transition={{ duration: 0.4 }}
          />
        </div>
        <small>{replayState?.progressPct.toFixed(0) ?? 0}%</small>
      </div>
      <button
        type="button"
        className="ghost-button"
        onClick={() => {
          void onStopReplay();
        }}
      >
        Stop Replay
      </button>
    </div>

    <div className="scenario-grid">
      {scenarios.map((scenario, index) => (
        <motion.article
          key={scenario.id}
          className="scenario-card"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.05 }}
        >
          <header>
            <h3>{scenario.name}</h3>
            <span>{formatDuration(scenario.durationSec)}</span>
          </header>
          <p>{scenario.description}</p>
          <p className="scenario-impact">Impact: {scenario.businessImpact}</p>
          <ul>
            {scenario.stages.map((stage) => (
              <li key={`${scenario.id}-${stage.offsetSec}`}>
                t+{formatDuration(stage.offsetSec)}: {stage.title}
              </li>
            ))}
          </ul>
          <button
            type="button"
            className="primary-button"
            onClick={() => {
              void onStartReplay(scenario.id);
            }}
          >
            Launch scenario
          </button>
        </motion.article>
      ))}
    </div>
  </section>
);
