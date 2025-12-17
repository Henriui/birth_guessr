#!/usr/bin/env bash
set -euo pipefail

./scripts/test-backend.sh
./scripts/test-frontend.sh
