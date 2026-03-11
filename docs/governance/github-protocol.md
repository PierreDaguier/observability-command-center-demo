# GitHub Protocol (Client Ready)

## Branching Strategy
- `main`: protected, releasable only.
- `develop`: integration branch.
- Feature branches:
  - `feat/synthetic-telemetry-ingestion`
  - `feat/kpi-dashboard`
  - `feat/correlation-view`
  - `feat/incident-replay`
  - `feat/contact-friendly-landing`
- Maintenance branches: `fix/*`, `chore/*`, `docs/*`.

## Conventional Commits
- `feat(sim): generate synthetic traces metrics logs streams`
- `feat(ui): add kpi dashboard cards with anomaly highlights`
- `feat(correlation): link trace ids across logs and metrics panels`
- `feat(alerting): implement severity timeline and incident grouping`
- `docs(demo): add 7-minute client walkthrough script`

## PR Template Requirements
Every PR must include:
- Problem statement
- Solution
- UX impact
- Performance impact
- Screenshots/gif
- How to test
- Related issue
- Follow-up tasks

## PR History Target
- 6 to 10 structured PRs
- 25+ meaningful commits
- Explicit commit messages
- No single "initial dump" commit

## Releases
- `v0.1.0`: telemetry simulation + base UI
- `v0.6.0`: alerts + correlation
- `v1.0.0`: polished narrative + docs + stable demo

## Project Governance
Kanban columns:
- Backlog
- Ready
- In progress
- In review
- Done

Milestones:
- MVP
- Reliability
- UX Polish
- v1.0.0

Labels taxonomy:
- `type/feature`
- `type/bug`
- `type/chore`
- `type/docs`
- `priority/p0`
- `priority/p1`
- `priority/p2`
- `priority/p3`
- `area/frontend`
- `area/backend`
- `area/observability`
- `area/devops`
- `area/docs`
- `area/governance`

## Branch Protection Baseline (Verified 2026-03-11)
- Branch: `main`
- Required check: `build-test`
- Required approvals: `1`
- `enforce_admins`: `true`
- `required_linear_history`: `true`

## Release Workflow Baseline (Verified 2026-03-11)
- Workflow file: `.github/workflows/release.yml`
- Trigger: `on.push.tags: [\"v*\"]`
- Release tag policy:
  - `v0.1.0`: telemetry simulation + base UI
  - `v0.6.0`: alerts + correlation
  - `v1.0.0`: polished narrative + docs + stable demo

## Credibility Assets (mandatory in PR)
- Desktop screenshot
- Mobile screenshot
- Incident replay gif
- Updated architecture diagram
- Changelog entry
