import { AlertEvent, TimelineEvent } from "../types";

type Props = {
  activeAlerts: AlertEvent[];
  timeline: TimelineEvent[];
};

const severityClass = (severity: AlertEvent["severity"]): string => {
  if (severity === "critical") return "severity-critical";
  if (severity === "high") return "severity-high";
  if (severity === "medium") return "severity-medium";
  return "severity-low";
};

export const AlertCenter = ({ activeAlerts, timeline }: Props) => (
  <section className="panel">
    <div className="panel-head">
      <h2>Alert Center</h2>
      <p>Severity-first alerts with incident timeline context.</p>
    </div>

    <div className="alert-layout">
      <div className="active-alerts">
        <h3>Active Alerts ({activeAlerts.length})</h3>
        <ul>
          {activeAlerts.length === 0 ? <li className="empty-state">No active alerts.</li> : null}
          {activeAlerts.slice(0, 20).map((alert) => (
            <li key={alert.id} className="alert-row">
              <span className={`severity-pill ${severityClass(alert.severity)}`}>{alert.severity}</span>
              <div>
                <p>{alert.summary}</p>
                <small>
                  {alert.service} • {alert.sourceMetric} • {alert.currentValue.toFixed(2)}
                </small>
              </div>
            </li>
          ))}
        </ul>
      </div>

      <div className="timeline-panel">
        <h3>Incident Timeline</h3>
        <ol>
          {timeline.length === 0 ? <li className="empty-state">Timeline is empty.</li> : null}
          {timeline.slice(0, 24).map((event) => (
            <li key={event.id}>
              <span className={`severity-dot ${severityClass(event.severity)}`} />
              <div>
                <p>{event.title}</p>
                <small>
                  {new Date(event.timestamp).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                  {" • "}
                  {event.details}
                </small>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </div>
  </section>
);
