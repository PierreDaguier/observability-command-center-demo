## Problem statement
Le repo avait uniquement un scaffold minimal et ne répondait pas à la mission de démo "Observability Command Center" orientée clients:
- pas de pipeline de télémétrie simulée crédible
- pas de dashboards KPI/alerting/correlation/replay
- pas de stack observabilité ouverte intégrée
- pas de gouvernance GitHub/CI/docs client-ready

## Solution
Cette PR livre une plateforme de démonstration complète et exécutable:
- Monorepo TypeScript avec `apps/api`, `apps/simulator`, `apps/web`
- API Fastify pour ingestion, agrégation KPI, corrélation logs↔traces↔metrics, alert center et incident replay
- Simulateur télémétrie e-commerce/SaaS (metrics, traces, logs) avec export OpenTelemetry
- UI premium dark (mobile + desktop) avec storytelling non-tech
- Stack Docker Compose: OTel Collector + Prometheus + Grafana + Loki + Tempo
- Assets de gouvernance GitHub: SECURITY, CONTRIBUTING, templates PR/Issues, CI + release workflows
- Dataset seed + scénarios d’incident + walkthrough client 7 minutes + architecture diagram + changelog

## UX impact
- Forte amélioration de lisibilité business (availability, p95, error budget)
- Vue corrélation en un clic par `traceId`
- Centre d’alertes avec sévérité et timeline incidents
- Replay mode préchargé pour démonstration commerciale répétable
- Design premium avec animations subtiles et responsive mobile/desktop

## Performance impact
- Polling frontend toutes les 3 secondes
- Simulateur par tick 1 seconde
- Agrégation en mémoire avec limites de buffers (logs/traces/series)
- Build frontend valide (warning non-bloquant sur chunk size > 500kb, optimisation possible via code-splitting)

## Screenshots / gif
- [ ] Desktop screenshot (à joindre dans la PR)
- [ ] Mobile screenshot (à joindre dans la PR)
- [ ] Incident replay gif (à joindre dans la PR)
- [x] Architecture diagram updated: `docs/architecture/command-center-architecture.svg`
- [x] Changelog entry: `CHANGELOG.md`

## How to test
1. `npm install`
2. `npm run seed`
3. `npm run lint`
4. `npm run test`
5. `npm run build`
6. `npm run compose:up`
7. Ouvrir:
   - UI: `http://localhost:4173`
   - API health: `http://localhost:8080/health`
   - Grafana: `http://localhost:3000` (`admin/admin`)
8. Lancer replay:
   - `npm run demo:replay:checkout`
   - `npm run demo:replay:auth`

## Related issue
- N/A (mission directe)

## Follow-up tasks
- Ajouter captures desktop/mobile + gif incident replay dans `docs/assets/`
- Découper bundle frontend (dynamic imports)
- Créer PRs séquentielles depuis les branches thématiques vers `develop`
- Activer branch protection stricte sur `main` (si pas déjà en place)
