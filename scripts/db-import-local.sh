#!/bin/bash

set -e

EXPORT_DIR=".tmp/supabase-export"

LOCAL_PG_HOST="${LOCAL_PG_HOST:-localhost}"
LOCAL_PG_PORT="${LOCAL_PG_PORT:-5432}"
LOCAL_PG_DB="${LOCAL_PG_DB:-stackmemory}"
LOCAL_PG_USER="${LOCAL_PG_USER:-stackuser}"
LOCAL_PG_PASSWORD="${LOCAL_PG_PASSWORD:-stackpass}"

TABLES=("profiles" "flashcards" "tags" "card_tags")

echo "=========================================="
echo "Local PostgreSQL Import Script"
echo "=========================================="

if [ ! -d "$EXPORT_DIR" ]; then
    echo "ERROR: Export directory not found: $EXPORT_DIR"
    echo "Please run db-export-supabase.sh first"
    exit 1
fi

echo "Target: Local PostgreSQL ($LOCAL_PG_HOST:$LOCAL_PG_PORT/$LOCAL_PG_DB)"
echo "Import directory: $EXPORT_DIR"
echo ""

run_psql() {
    docker exec stackmemory-postgres psql -h localhost -p 5432 -U "$LOCAL_PG_USER" -d "$LOCAL_PG_DB" -c "$1"
}

run_pg_restore() {
    docker exec -i stackmemory-postgres pg_restore -h localhost -p 5432 -U "$LOCAL_PG_USER" -d "$LOCAL_PG_DB" "$@"
}

echo "Clearing existing data from local tables..."

for TABLE in "${TABLES[@]}"; do
    run_psql "TRUNCATE TABLE $TABLE CASCADE;" 2>/dev/null || true
done

echo "Importing tables..."

for TABLE in "${TABLES[@]}"; do
    DUMP_FILE="$EXPORT_DIR/$TABLE.dump"
    
    if [ ! -f "$DUMP_FILE" ]; then
        echo "  ✗ Dump file not found: $DUMP_FILE"
        exit 1
    fi
    
    echo "Importing table: $TABLE..."
    
    docker cp "$DUMP_FILE" stackmemory-postgres:/tmp/$TABLE.dump
    
    run_pg_restore \
        --data-only \
        --no-owner \
        --no-privileges \
        -t "$TABLE" \
        /tmp/$TABLE.dump
    
    docker exec stackmemory-postgres rm -f /tmp/$TABLE.dump
    
    if [ $? -eq 0 ]; then
        echo "  ✓ $TABLE imported successfully"
    else
        echo "  ✗ Failed to import $TABLE"
        exit 1
    fi
done

echo ""
echo "Running sequence reset..."
run_psql "SELECT setval(pg_get_serial_sequence('tags', 'id'), COALESCE((SELECT MAX(id) FROM tags), 1));"
run_psql "SELECT setval(pg_get_serial_sequence('flashcards', 'id'), COALESCE((SELECT MAX(id) FROM flashcards), 1));"

echo ""
echo "Import complete!"
echo ""

echo "Current local table row counts:"
for TABLE in "${TABLES[@]}"; do
    COUNT=$(run_psql "SELECT COUNT(*) FROM $TABLE;" | tr -d ' ')
    echo "  $TABLE: $COUNT"
done
