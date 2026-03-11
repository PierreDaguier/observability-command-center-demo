#!/usr/bin/env bash
set -euo pipefail

git tag -a v0.1.0 -m "v0.1.0 telemetry simulation + base UI"
git tag -a v0.6.0 -m "v0.6.0 alerts + correlation"
git tag -a v1.0.0 -m "v1.0.0 polished narrative + docs + stable demo"

echo "Annotated release tags created locally."
