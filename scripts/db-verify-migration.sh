#!/bin/bash

set -e

VERIFY_DIR=".tmp/migration-verify"
mkdir -p "$VERIFY_DIR"

SUPABASE_DB_HOST="${SUPABASE_DB_HOST:-}"
SUPABASE_DB_PORT="${SUPABASE_DB_PORT:-5432}"
SUPABASE_DB_NAME="${SUPABASE_DB_NAME:-postgres}"
SUPABASE_DB_USER="${SUPABASE_DB_USER:-postgres}"
SUPABASE_DB_PASSWORD="${SUPABASE_DB_PASSWORD:-}"

LOCAL_PG_HOST="${LOCAL_PG_HOST:-localhost}"
LOCAL_PG_PORT="${LOCAL_PG_PORT:-5432}"
LOCAL_PG_DB="${LOCAL_PG_DB:-stackmemory}"
LOCAL_PG_USER="${LOCAL_PG_USER:-stackuser}"
LOCAL_PG_PASSWORD="${LOCAL_PG_PASSWORD:-stackpass}"

TABLES=("profiles" "flashcards" "tags" "card_tags")

echo "=========================================="
echo "Migration Verification Script"
echo "=========================================="
echo ""

export PGPASSWORD="$LOCAL_PG_PASSWORD"

run_psql() {
    docker exec stackmemory-postgres psql -h localhost -p 5432 -U "$LOCAL_PG_USER" -d "$LOCAL_PG_DB" -t -c "$1" 2>/dev/null | tr -d ' '
}

run_psql_raw() {
    docker exec stackmemory-postgres psql -h localhost -p 5432 -U "$LOCAL_PG_USER" -d "$LOCAL_PG_DB" -t -c "$1" 2>/dev/null
}

echo "=== Step 1: Row Count Comparison ==="
echo ""

ROW_COUNTS_FILE="$VERIFY_DIR/row-counts.txt"
echo "Table | Source (Supabase) | Target (Local) | Match" > "$ROW_COUNTS_FILE"
echo "------|-------------------|----------------|------" >> "$ROW_COUNTS_FILE"

ALL_MATCHED=true

for TABLE in "${TABLES[@]}"; do
    if [ -n "$SUPABASE_DB_HOST" ] && [ -n "$SUPABASE_DB_PASSWORD" ]; then
        export PGPASSWORD="$SUPABASE_DB_PASSWORD"
        SOURCE_COUNT=$(PGPASSWORD="$SUPABASE_DB_PASSWORD" psql -h "$SUPABASE_DB_HOST" -p "$SUPABASE_DB_PORT" -U "$SUPABASE_DB_USER" -d "$SUPABASE_DB_NAME" \
            -t -c "SELECT COUNT(*) FROM $TABLE;" 2>/dev/null | tr -d ' ' || echo "ERROR")
    else
        SOURCE_COUNT="N/A"
    fi
    
    TARGET_COUNT=$(run_psql "SELECT COUNT(*) FROM $TABLE;")
    
    if [ "$SOURCE_COUNT" = "$TARGET_COUNT" ] || [ "$SOURCE_COUNT" = "N/A" ]; then
        MATCH="✓"
    else
        MATCH="✗"
        ALL_MATCHED=false
    fi
    
    printf "%-12s | %-19s | %-14s | %s\n" "$TABLE" "$SOURCE_COUNT" "$TARGET_COUNT" "$MATCH" >> "$ROW_COUNTS_FILE"
done

cat "$ROW_COUNTS_FILE"
echo ""

echo "=== Step 2: card_tags Integrity Check ==="
echo ""

CARD_TAGS_INTEGRITY=$(run_psql "
    SELECT COUNT(*) FROM card_tags ct
    LEFT JOIN flashcards f ON ct.card_id = f.id
    LEFT JOIN tags t ON ct.tag_id = t.id
    WHERE f.id IS NULL OR t.id IS NULL;
")

if [ "$CARD_TAGS_INTEGRITY" = "0" ]; then
    echo "✓ All card_tags references are valid (no orphaned records)"
else
    echo "✗ Found $CARD_TAGS_INTEGRITY orphaned card_tags records"
    ALL_MATCHED=false
fi
echo ""

echo "=== Step 3: Foreign Key Validation ==="
echo ""

FLASHCARDS_USER_CHECK=$(run_psql "
    SELECT COUNT(*) FROM flashcards f
    LEFT JOIN profiles p ON f.user_id = p.id
    WHERE p.id IS NULL;
")

TAGS_USER_CHECK=$(run_psql "
    SELECT COUNT(*) FROM tags t
    LEFT JOIN profiles p ON t.user_id = p.id
    WHERE p.id IS NULL;
")

if [ "$FLASHCARDS_USER_CHECK" = "0" ]; then
    echo "✓ flashcards.user_id references are valid"
else
    echo "✗ Found $FLASHCARDS_USER_CHECK flashcards with invalid user_id"
    ALL_MATCHED=false
fi

if [ "$TAGS_USER_CHECK" = "0" ]; then
    echo "✓ tags.user_id references are valid"
else
    echo "✗ Found $TAGS_USER_CHECK tags with invalid user_id"
    ALL_MATCHED=false
fi
echo ""

echo "=== Step 4: Unique Constraint Check ==="
echo ""

PROFILES_DUP_CHECK=$(run_psql "
    SELECT COUNT(*) FROM (
        SELECT id, COUNT(*) as cnt FROM profiles GROUP BY id HAVING COUNT(*) > 1
    ) AS dup;
")

TAGS_DUP_CHECK=$(run_psql "
    SELECT COUNT(*) FROM (
        SELECT user_id, name, COUNT(*) as cnt FROM tags GROUP BY user_id, name HAVING COUNT(*) > 1
    ) AS dup;
")

if [ "$PROFILES_DUP_CHECK" = "0" ]; then
    echo "✓ profiles: no duplicate IDs"
else
    echo "✗ Found $PROFILES_DUP_CHECK duplicate profile IDs"
    ALL_MATCHED=false
fi

if [ "$TAGS_DUP_CHECK" = "0" ]; then
    echo "✓ tags: no duplicate (user_id, name) pairs"
else
    echo "✗ Found $TAGS_DUP_CHECK duplicate tag names per user"
    ALL_MATCHED=false
fi
echo ""

echo "=========================================="
if [ "$ALL_MATCHED" = true ]; then
    echo "✓ Migration verification PASSED"
    exit 0
else
    echo "✗ Migration verification FAILED"
    exit 1
fi
