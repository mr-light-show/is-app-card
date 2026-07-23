#!/bin/bash
set -e
cp "$(dirname "$0")/../is-app-card.js" "$(dirname "$0")/../dist/is-app-card.js"
echo "Synced is-app-card.js -> dist/is-app-card.js"
