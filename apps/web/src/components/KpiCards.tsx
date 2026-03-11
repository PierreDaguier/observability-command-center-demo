import { motion } from "framer-motion";
import { Activity, AlertTriangle, Gauge, Shield } from "lucide-react";
import { KpiOverview } from "../types";

type Props = {
  overview: KpiOverview | null;
};

const cardVariants = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0 },
};

export const KpiCards = ({ overview }: Props) => {
  const cards = [
    {
      title: "Availability",
      value: `${overview?.kpi.availability.toFixed(2) ?? "--"}%`,
      meta: "Global service health",
      icon: Shield,
      tone: "tone-green",
    },
    {
      title: "P95 Latency",
      value: `${overview?.kpi.latencyP95Ms.toFixed(0) ?? "--"}ms`,
      meta: "Cross-service user journey",
      icon: Gauge,
      tone: "tone-amber",
    },
    {
      title: "Error Budget",
      value: `${overview?.kpi.errorBudgetRemainingPct.toFixed(1) ?? "--"}%`,
      meta: "Remaining monthly budget",
      icon: Activity,
      tone: "tone-blue",
    },
    {
      title: "Active Alerts",
      value: `${overview?.counts.activeAlerts ?? 0}`,
      meta: `Burn rate ${overview?.kpi.burnRate.toFixed(1) ?? "--"}x`,
      icon: AlertTriangle,
      tone: "tone-rose",
    },
  ];

  return (
    <div className="kpi-grid">
      {cards.map((card, index) => {
        const Icon = card.icon;
        return (
          <motion.article
            key={card.title}
            className={`kpi-card ${card.tone}`}
            initial="hidden"
            animate="show"
            variants={cardVariants}
            transition={{ delay: index * 0.06, duration: 0.36 }}
          >
            <div className="kpi-card-head">
              <h3>{card.title}</h3>
              <Icon size={18} strokeWidth={2.2} />
            </div>
            <p className="kpi-value">{card.value}</p>
            <p className="kpi-meta">{card.meta}</p>
          </motion.article>
        );
      })}
    </div>
  );
};
