#!/usr/bin/env bash
set -euo pipefail

npm install
npm run seed
npm run compose:up

echo "Command Center UI: http://localhost:4173"
echo "API: http://localhost:8080/health"
echo "Grafana: http://localhost:3000 (admin/admin)"
echo "Prometheus: http://localhost:9090"
