#!/usr/bin/env bash
set -euo pipefail

(
  cd frontend
  npm install
  npm test -- --run
  npm run e2e
)
