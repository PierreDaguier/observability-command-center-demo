import { motion } from "framer-motion";
import { ServiceCard } from "../types";

type Props = {
  services: ServiceCard[];
};

export const ServiceGrid = ({ services }: Props) => (
  <section className="panel service-grid-panel">
    <div className="panel-head">
      <h2>Service Reliability Matrix</h2>
      <p>Critical services with health posture and SLO drift.</p>
    </div>
    <div className="service-grid">
      {services.map((service, index) => (
        <motion.article
          key={service.id}
          className={`service-card ${service.status}`}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.03 }}
        >
          <header>
            <div>
              <h3>{service.id}</h3>
              <span>{service.domain}</span>
            </div>
            <span className={`pill ${service.status}`}>
              {service.status === "healthy" ? "Healthy" : "Degraded"}
            </span>
          </header>

          <dl>
            <div>
              <dt>Availability</dt>
              <dd>{service.latest?.availability.toFixed(2) ?? "--"}%</dd>
            </div>
            <div>
              <dt>P95</dt>
              <dd>{service.latest?.latencyP95Ms.toFixed(0) ?? "--"}ms</dd>
            </div>
            <div>
              <dt>Error rate</dt>
              <dd>{service.latest?.errorRatePct.toFixed(2) ?? "--"}%</dd>
            </div>
            <div>
              <dt>Throughput</dt>
              <dd>{service.latest?.throughputRps.toFixed(0) ?? "--"} rps</dd>
            </div>
          </dl>
        </motion.article>
      ))}
    </div>
  </section>
);
