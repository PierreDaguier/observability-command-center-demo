# Client Walkthrough (7 minutes)

## 0:00 - 0:45 | Framing
- Introduce the platform as a customer-facing reliability command center.
- Explain that telemetry is synthetic but realistic, generated from e-commerce + SaaS service behavior.
- Point out that this is not a static mock: every panel updates from live streams.

## 0:45 - 2:00 | KPI Story
- Open the Overview section.
- Narrate availability, p95 latency, and error budget as business-facing KPIs.
- Highlight service matrix status and show how "degraded" state appears before hard outage.

## 2:00 - 3:20 | Correlation Demo
- Open Correlation panel.
- Select a recent trace from `checkout-api` or `auth-service`.
- Show linked logs and metric snapshot side-by-side.
- Explain: same trace id ties root cause signals together in one click.

## 3:20 - 5:20 | Incident Replay
- Start `Checkout DB Lock Storm` from Replay panel.
- Watch progression from "soft degradation" to "critical customer impact".
- Show alerts appearing with higher severities and timeline entries.
- Mention deterministic stage design: ideal for sales demos and onboarding.

## 5:20 - 6:20 | Open Observability Stack
- Open Grafana (`http://localhost:3000`).
- Show Prometheus metrics panel (requests/errors/latency quantile).
- Switch datasource to Tempo and Loki to show traces/logs availability.
- Reinforce open standard stack: OTel + Prometheus + Grafana + Loki + Tempo.

## 6:20 - 7:00 | Close and Next Steps
- Stop replay.
- Summarize value: faster incident understanding + cleaner client narrative.
- Mention extension path: SSO, multi-tenant views, and real collector ingress from production.
