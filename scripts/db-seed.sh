#!/bin/bash

set -e

DB_HOST="${LOCAL_PG_HOST:-localhost}"
DB_PORT="${LOCAL_PG_PORT:-5432}"
DB_NAME="${LOCAL_PG_DB:-stackmemory}"
DB_USER="${LOCAL_PG_USER:-stackuser}"
DB_PASSWORD="${LOCAL_PG_PASSWORD:-stackpass}"

echo "=========================================="
echo "StackMemory Seed Data Initialization"
echo "=========================================="
echo ""
echo "Target: $DB_HOST:$DB_PORT/$DB_NAME"
echo ""

export PGPASSWORD="$DB_PASSWORD"

SEED_FILE="db/seed.sql"

if [ ! -f "$SEED_FILE" ]; then
    echo "ERROR: Seed file not found: $SEED_FILE"
    exit 1
fi

echo "Running seed data..."
echo ""

if command -v docker &> /dev/null && docker ps --format '{{.Names}}' | grep -q "stackmemory-postgres"; then
    echo "Using Docker PostgreSQL..."
    docker exec stackmemory-postgres psql -h localhost -p 5432 -U "$DB_USER" -d "$DB_NAME" -f "/seed-data/seed.sql"
else
    echo "Using local PostgreSQL..."
    psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -f "$SEED_FILE"
fi

if [ $? -eq 0 ]; then
    echo ""
    echo "=========================================="
    echo "✓ Seed data loaded successfully"
    echo "=========================================="
    echo ""
    echo "Test user credentials:"
    echo "  User ID: 00000000-0000-0000-0000-000000000002"
    echo "  Username: testuser"
    echo ""
    echo "Sample data:"
    echo "  - 6 tags (javascript, typescript, react, nextjs, database, algorithm)"
    echo "  - 5 flashcards"
    echo "  - 1 learning route with 8 tasks"
    exit 0
else
    echo ""
    echo "=========================================="
    echo "✗ Failed to load seed data"
    echo "=========================================="
    exit 1
fi
