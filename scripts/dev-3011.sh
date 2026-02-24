#!/usr/bin/env bash
set -euo pipefail
cd /root/.openclaw/workspace/StackMemory
exec npm run dev -- --webpack -p 3011 -H 0.0.0.0
