#!/usr/bin/env bash
set -euo pipefail

APP_ENV="test"
export APP_ENV

DB_CONTAINER_NAME="birth_guessr_test_db_${RANDOM}_${RANDOM}"
DB_PORT="5433"
DB_NAME="baby_birth_guessr_test"
DB_USER="postgres"
DB_PASSWORD="postgres"

DATABASE_URL="postgres://${DB_USER}:${DB_PASSWORD}@localhost:${DB_PORT}/${DB_NAME}"
export DATABASE_URL

if [[ "${APP_ENV}" != "test" ]]; then
  echo "APP_ENV must be test" >&2
  exit 1
fi

if [[ "${DATABASE_URL}" != *"localhost"* ]]; then
  echo "Refusing to run: DATABASE_URL must point to localhost" >&2
  exit 1
fi

if [[ "${DATABASE_URL}" != *"_test" ]]; then
  echo "Refusing to run: DB name must end with _test" >&2
  exit 1
fi

cleanup() {
  podman rm -f "${DB_CONTAINER_NAME}" >/dev/null 2>&1 || true
}
trap cleanup EXIT

podman run -d --name "${DB_CONTAINER_NAME}" \
  -e POSTGRES_USER="${DB_USER}" \
  -e POSTGRES_PASSWORD="${DB_PASSWORD}" \
  -e POSTGRES_DB="${DB_NAME}" \
  -p "${DB_PORT}:5432" \
  docker.io/library/postgres:15-alpine >/dev/null

for i in {1..40}; do
  if podman exec "${DB_CONTAINER_NAME}" pg_isready -U "${DB_USER}" -d "${DB_NAME}" >/dev/null 2>&1; then
    break
  fi
  sleep 0.25
  if [[ $i -eq 40 ]]; then
    echo "Postgres did not become ready" >&2
    exit 1
  fi
done

cargo test
