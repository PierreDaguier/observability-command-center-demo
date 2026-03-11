#!/usr/bin/env bash
set -euo pipefail

SCENARIO_ID="${1:-checkout-lockstorm}"

curl -s -X POST "http://localhost:8080/api/replay/start" \
  -H "Content-Type: application/json" \
  -d "{\"scenarioId\":\"${SCENARIO_ID}\"}" | jq .
