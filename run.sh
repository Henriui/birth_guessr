#!/usr/bin/env bash
set -euo pipefail

# Load .env file if it exists
if [ -f .env ]; then
  # Export variables from .env
  export $(grep -v '^#' .env | xargs)
fi

# Default database URL if not provided
: "${DATABASE_URL:=postgres://postgres:postgres@localhost:5432/baby_birth_guessr}"
export DATABASE_URL

DB_NAME="${DATABASE_URL##*/}"

echo "Using DATABASE_URL=$DATABASE_URL"

# Check that psql is available
if ! command -v psql >/dev/null 2>&1; then
  echo "Error: psql command not found. Please install PostgreSQL client tools and ensure psql is on your PATH." >&2
  exit 1
fi

# Create database if it does not exist
DB_EXISTS=$(psql "$DATABASE_URL" -c 'SELECT 1' >/dev/null 2>&1 && echo "yes" || echo "no")

if [ "$DB_EXISTS" = "no" ]; then
  echo "Database $DB_NAME does not seem accessible, trying to create it..."
  # Use a maintenance DB to create our target DB
  CREATEDB_URL="${DATABASE_URL%/*}/postgres"
  createdb_cmd="CREATE DATABASE \"$DB_NAME\";"
  psql "$CREATEDB_URL" -c "$createdb_cmd" || {
    echo "Failed to create database $DB_NAME. Please verify your PostgreSQL credentials." >&2
    exit 1
  }
  echo "Database $DB_NAME created."
else
  echo "Database $DB_NAME already exists and is accessible."
fi

# Placeholder for migrations (to be wired later, e.g. with sqlx or a migration tool)
echo "(Skipping migrations for now – add your migration command here.)"

# Finally, run the application
echo "Starting application with cargo run..."
cargo run
