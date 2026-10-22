#!/usr/bin/env bash
set -euo pipefail
npm ci --no-fund
npm audit --audit-level=high
npm run check
npm test
npm run build
