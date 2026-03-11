import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type Props = {
  series: Array<{ timestamp: string; latencyP95Ms: number; errorRatePct: number }>;
};

const formatTime = (value: string): string =>
  new Date(value).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

export const TimeseriesPanel = ({ series }: Props) => (
  <section className="panel">
    <div className="panel-head">
      <h2>KPI Trajectory</h2>
      <p>Latency and error trend across all services (60 minutes).</p>
    </div>

    <div className="chart-wrap">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={series} margin={{ top: 14, right: 6, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="latencyGradient" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="rgba(255, 132, 55, 0.75)" />
              <stop offset="100%" stopColor="rgba(255, 132, 55, 0.05)" />
            </linearGradient>
            <linearGradient id="errorGradient" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="rgba(255, 77, 109, 0.75)" />
              <stop offset="100%" stopColor="rgba(255, 77, 109, 0.06)" />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
          <XAxis
            dataKey="timestamp"
            tickFormatter={formatTime}
            tick={{ fill: "rgba(255,255,255,0.6)", fontSize: 11 }}
            minTickGap={22}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            yAxisId="latency"
            tick={{ fill: "rgba(255,255,255,0.6)", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            width={42}
          />
          <YAxis
            yAxisId="error"
            orientation="right"
            tick={{ fill: "rgba(255,255,255,0.6)", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            width={42}
          />
          <Tooltip
            contentStyle={{
              background: "#0c141d",
              border: "1px solid rgba(255,255,255,0.12)",
              borderRadius: "12px",
              color: "#f2f7ff",
            }}
            labelFormatter={(value) => formatTime(String(value))}
          />
          <Area
            yAxisId="latency"
            type="monotone"
            dataKey="latencyP95Ms"
            stroke="rgba(255, 154, 84, 1)"
            strokeWidth={2}
            fill="url(#latencyGradient)"
          />
          <Area
            yAxisId="error"
            type="monotone"
            dataKey="errorRatePct"
            stroke="rgba(255, 77, 109, 1)"
            strokeWidth={2}
            fill="url(#errorGradient)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  </section>
);
