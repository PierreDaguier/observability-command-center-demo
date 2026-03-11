import { motion } from "framer-motion";
import { AlertEvent, CorrelationResponse, TraceEvent } from "../types";

type Props = {
  traces: TraceEvent[];
  selectedTraceId: string | null;
  correlation: CorrelationResponse | null;
  onSelectTrace: (traceId: string) => void;
};

const severityTone = (severity: AlertEvent["severity"]): string => {
  if (severity === "critical") return "severity-critical";
  if (severity === "high") return "severity-high";
  if (severity === "medium") return "severity-medium";
  return "severity-low";
};

export const CorrelationPanel = ({
  traces,
  selectedTraceId,
  correlation,
  onSelectTrace,
}: Props) => (
  <section className="panel">
    <div className="panel-head">
      <h2>Logs ⇄ Traces ⇄ Metrics Correlation</h2>
      <p>Click a recent trace to reveal related logs, KPI sample, and linked alerts.</p>
    </div>

    <div className="correlation-layout">
      <div className="trace-list">
        {traces.slice(0, 28).map((trace) => (
          <button
            key={`${trace.traceId}-${trace.spanId}`}
            type="button"
            onClick={() => onSelectTrace(trace.traceId)}
            className={`trace-item ${selectedTraceId === trace.traceId ? "selected" : ""}`}
          >
            <div>
              <p>{trace.service}</p>
              <small>{trace.operation}</small>
            </div>
            <div className="trace-item-meta">
              <span>{trace.durationMs.toFixed(0)}ms</span>
              <span className={trace.status === "error" ? "badge-error" : "badge-ok"}>
                {trace.status}
              </span>
            </div>
          </button>
        ))}
      </div>

      <motion.div
        className="correlation-inspector"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        {!correlation ? (
          <div className="empty-state">Select a trace to inspect correlation data.</div>
        ) : (
          <>
            <div className="metric-snapshot">
              <h3>Metric Snapshot</h3>
              {correlation.metric ? (
                <dl>
                  <div>
                    <dt>Service</dt>
                    <dd>{correlation.metric.service}</dd>
                  </div>
                  <div>
                    <dt>Availability</dt>
                    <dd>{correlation.metric.availability.toFixed(2)}%</dd>
                  </div>
                  <div>
                    <dt>P95 latency</dt>
                    <dd>{correlation.metric.latencyP95Ms.toFixed(0)}ms</dd>
                  </div>
                  <div>
                    <dt>Error rate</dt>
                    <dd>{correlation.metric.errorRatePct.toFixed(2)}%</dd>
                  </div>
                </dl>
              ) : (
                <p>No metric sample within ±60s.</p>
              )}
            </div>

            <div className="inspector-columns">
              <div>
                <h3>Linked Logs</h3>
                <ul className="mini-list">
                  {correlation.logs.length === 0 ? <li>No logs linked.</li> : null}
                  {correlation.logs.slice(0, 8).map((log) => (
                    <li key={log.id}>
                      <span className={`log-level ${log.level}`}>{log.level}</span>
                      <p>{log.message}</p>
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <h3>Related Alerts</h3>
                <ul className="mini-list">
                  {correlation.relatedAlerts.length === 0 ? <li>No alert tied to this trace.</li> : null}
                  {correlation.relatedAlerts.slice(0, 8).map((alert) => (
                    <li key={alert.id}>
                      <span className={`severity-pill ${severityTone(alert.severity)}`}>
                        {alert.severity}
                      </span>
                      <p>{alert.summary}</p>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </>
        )}
      </motion.div>
    </div>
  </section>
);
