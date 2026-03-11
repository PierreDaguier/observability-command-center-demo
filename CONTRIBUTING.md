# Contributing Guide

## Development Setup
1. `npm install`
2. `npm run seed`
3. `npm run dev` or `npm run compose:up`

## Branching
- Base branch for integration: `develop`
- Feature branches follow:
  - `feat/synthetic-telemetry-ingestion`
  - `feat/kpi-dashboard`
  - `feat/correlation-view`
  - `feat/incident-replay`
  - `feat/contact-friendly-landing`
- Maintenance:
  - `fix/*`
  - `chore/*`
  - `docs/*`

## Commit Convention
Use Conventional Commits:
- `feat(scope): ...`
- `fix(scope): ...`
- `docs(scope): ...`
- `chore(scope): ...`

## Pull Request Checklist
- Problem statement
- Solution
- UX impact
- Performance impact
- Screenshots/gif
- How to test
- Related issue
- Follow-up tasks

## Quality Gates
Run before PR:
- `npm run lint`
- `npm run test`
- `npm run build`
