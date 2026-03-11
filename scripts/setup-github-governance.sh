#!/usr/bin/env bash
set -euo pipefail

REPO="${1:?Usage: scripts/setup-github-governance.sh <owner/repo>}"

# Requires gh CLI authenticated with repo admin rights.

gh api -X PUT "repos/${REPO}/branches/main/protection" \
  -f required_status_checks.strict=true \
  -f required_status_checks.contexts[]='CI / build-test' \
  -f enforce_admins=true \
  -f required_pull_request_reviews.dismiss_stale_reviews=true \
  -f required_pull_request_reviews.required_approving_review_count=1 \
  -f restrictions='null'

gh api -X POST "repos/${REPO}/milestones" -f title='Core telemetry' -f description='Synthetic streams + base backend/API'
gh api -X POST "repos/${REPO}/milestones" -f title='Incident intelligence' -f description='Correlation, alert center, replay mode'
gh api -X POST "repos/${REPO}/milestones" -f title='UX polish + launch assets' -f description='Premium UI and client walkthrough assets'

echo "Branch protection + milestones applied for ${REPO}"
