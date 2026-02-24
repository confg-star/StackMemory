#!/bin/bash

set -e

EXPORT_DIR=".tmp/supabase-export"
TABLES=("profiles" "flashcards" "tags" "card_tags")

SUPABASE_DB_HOST="${SUPABASE_DB_HOST:-}"
SUPABASE_DB_PORT="${SUPABASE_DB_PORT:-5432}"
SUPABASE_DB_NAME="${SUPABASE_DB_NAME:-postgres}"
SUPABASE_DB_USER="${SUPABASE_DB_USER:-postgres}"
SUPABASE_DB_PASSWORD="${SUPABASE_DB_PASSWORD:-}"

echo "=========================================="
echo "Supabase Database Export Script"
echo "=========================================="

if [ -z "$SUPABASE_DB_HOST" ]; then
    echo "ERROR: SUPABASE_DB_HOST environment variable is required"
    echo "Usage:"
    echo "  export SUPABASE_DB_HOST=your-supabase-host"
    echo "  export SUPABASE_DB_PASSWORD=your-password"
    echo "  ./scripts/db-export-supabase.sh"
    exit 1
fi

mkdir -p "$EXPORT_DIR"

echo "Source: Supabase ($SUPABASE_DB_HOST:$SUPABASE_DB_PORT/$SUPABASE_DB_NAME)"
echo "Export directory: $EXPORT_DIR"
echo ""

for TABLE in "${TABLES[@]}"; do
    echo "Exporting table: $TABLE..."
    
    PGPASSWORD="$SUPABASE_DB_PASSWORD" pg_dump \
        -h "$SUPABASE_DB_HOST" \
        -p "$SUPABASE_DB_PORT" \
        -U "$SUPABASE_DB_USER" \
        -d "$SUPABASE_DB_NAME" \
        -t "$TABLE" \
        --data-only \
        --no-owner \
        --no-privileges \
        -F c \
        -f "$EXPORT_DIR/$TABLE.dump"
    
    if [ $? -eq 0 ]; then
        echo "  ✓ $TABLE exported successfully"
    else
        echo "  ✗ Failed to export $TABLE"
        exit 1
    fi
done

echo ""
echo "Export complete!"
echo "Files saved to: $EXPORT_DIR"
ls -lh "$EXPORT_DIR"
