#!/bin/bash

set -e

DB_HOST="${LOCAL_PG_HOST:-localhost}"
DB_PORT="${LOCAL_PG_PORT:-5432}"
DB_NAME="${LOCAL_PG_DB:-stackmemory}"
DB_USER="${LOCAL_PG_USER:-stackuser}"
DB_PASSWORD="${LOCAL_PG_PASSWORD:-stackpass}"

echo "Checking PostgreSQL connectivity..."
echo "Host: $DB_HOST:$DB_PORT, Database: $DB_NAME, User: $DB_USER"

if docker exec stackmemory-postgres pg_isready -U "$DB_USER" -d "$DB_NAME"; then
    echo "✓ PostgreSQL is ready"
    exit 0
else
    echo "✗ PostgreSQL is not reachable"
    exit 1
fi
