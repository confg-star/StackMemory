#!/usr/bin/env bash

set -euo pipefail

DB_HOST="${LOCAL_PG_HOST:-localhost}"
DB_PORT="${LOCAL_PG_PORT:-5432}"
DB_NAME="${LOCAL_PG_DB:-stackmemory}"
DB_USER="${LOCAL_PG_USER:-stackuser}"
DB_PASSWORD="${LOCAL_PG_PASSWORD:-stackpass}"

SQL_FILE="db/local-one-click-init.sql"

PSQL_BIN="${PSQL_BIN:-psql}"
if ! command -v "$PSQL_BIN" >/dev/null 2>&1; then
  if [ -x "/c/Program Files/PostgreSQL/16/bin/psql.exe" ]; then
    PSQL_BIN="/c/Program Files/PostgreSQL/16/bin/psql.exe"
  elif [ -x "/c/Program Files/PostgreSQL/17/bin/psql.exe" ]; then
    PSQL_BIN="/c/Program Files/PostgreSQL/17/bin/psql.exe"
  elif [ -x "/c/Program Files/PostgreSQL/18/bin/psql.exe" ]; then
    PSQL_BIN="/c/Program Files/PostgreSQL/18/bin/psql.exe"
  fi
fi

if [ ! -f "$SQL_FILE" ]; then
  echo "ERROR: SQL file not found: $SQL_FILE"
  exit 1
fi

echo "=========================================="
echo "StackMemory Local DB Initialization"
echo "=========================================="
echo "Target: $DB_HOST:$DB_PORT/$DB_NAME"

if command -v docker >/dev/null 2>&1 && docker ps --format '{{.Names}}' | grep -q '^stackmemory-postgres$'; then
  echo "Using Docker container: stackmemory-postgres"
  docker cp "$SQL_FILE" stackmemory-postgres:/tmp/local-one-click-init.sql
  docker exec -e PGPASSWORD="$DB_PASSWORD" stackmemory-postgres \
    psql -h localhost -p 5432 -U "$DB_USER" -d "$DB_NAME" -f /tmp/local-one-click-init.sql
  docker exec stackmemory-postgres rm -f /tmp/local-one-click-init.sql
else
  echo "Using local psql"
  PGPASSWORD="$DB_PASSWORD" "$PSQL_BIN" -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -f "$SQL_FILE"
fi

echo ""
echo "Done. Local database initialized."
