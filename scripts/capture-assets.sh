#!/usr/bin/env bash
set -euo pipefail

# Example helper for PR credibility assets.
# Prereq: playwright + ffmpeg installed.

mkdir -p docs/assets

echo "Capture desktop screenshot..."
# npx playwright screenshot --device="Desktop Chrome" http://localhost:4173 docs/assets/command-center-desktop.png

echo "Capture mobile screenshot..."
# npx playwright screenshot --device="iPhone 14" http://localhost:4173 docs/assets/command-center-mobile.png

echo "Record short incident replay gif..."
# ffmpeg -y -video_size 1440x900 -framerate 12 -f x11grab -i :0.0 -t 12 docs/assets/incident-replay.mp4
# ffmpeg -y -i docs/assets/incident-replay.mp4 -vf "fps=12,scale=960:-1:flags=lanczos" docs/assets/incident-replay.gif

echo "Asset capture skeleton complete. Uncomment commands for your environment."
