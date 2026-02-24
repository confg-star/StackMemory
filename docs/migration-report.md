# Migration Report: Supabase to Local PostgreSQL

**Created**: 2026-02-23
**Project**: StackMemory
**Status**: Ready for Execution

## Overview

This document outlines the migration process from Supabase (cloud PostgreSQL) to local PostgreSQL.

## Migration Scope

| Table | Description | Dependencies |
|-------|-------------|--------------|
| profiles | User profiles and settings | - |
| flashcards | Flashcard content | profiles (user_id) |
| tags | User-defined tags | profiles (user_id) |
| card_tags | Flashcard-Tag associations | flashcards (card_id), tags (tag_id) |

## Migration Scripts

### 1. Export Script (`scripts/db-export-supabase.sh`)

Exports data from Supabase PostgreSQL to `.tmp/supabase-export/` directory.

**Usage:**
```bash
export SUPABASE_DB_HOST=your-supabase-host
export SUPABASE_DB_PASSWORD=your-password
./scripts/db-export-supabase.sh
```

**Environment Variables:**
| Variable | Required | Default |
|----------|----------|---------|
| SUPABASE_DB_HOST | Yes | - |
| SUPABASE_DB_PORT | No | 5432 |
| SUPABASE_DB_NAME | No | postgres |
| SUPABASE_DB_USER | No | postgres |
| SUPABASE_DB_PASSWORD | Yes | - |

### 2. Import Script (`scripts/db-import-local.sh`)

Imports exported data into local PostgreSQL.

**Usage:**
```bash
./scripts/db-import-local.sh
```

**Environment Variables:**
| Variable | Default |
|----------|---------|
| LOCAL_DB_HOST | localhost |
| LOCAL_DB_PORT | 5432 |
| LOCAL_DB_NAME | stackmemory |
| LOCAL_DB_USER | stackuser |
| LOCAL_DB_PASSWORD | stackpass |

### 3. Verification Script (`scripts/db-verify-migration.sh`)

Verifies migration integrity.

**Usage:**
```bash
./scripts/db-verify-migration.sh
```

**Verification Checks:**
1. Row count comparison (source vs target)
2. card_tags integrity (no orphaned records)
3. Foreign key validation (flashcards.user_id, tags.user_id)
4. Unique constraint validation

## Execution Steps

### Step 1: Export from Supabase
```bash
export SUPABASE_DB_HOST=your-supabase-host
export SUPABASE_DB_PORT=5432
export SUPABASE_DB_NAME=postgres
export SUPABASE_DB_USER=postgres
export SUPABASE_DB_PASSWORD=your-password
./scripts/db-export-supabase.sh
```

### Step 2: Import to Local
```bash
./scripts/db-import-local.sh
```

### Step 3: Verify Migration
```bash
./scripts/db-verify-migration.sh
```

## Expected Results

### Row Count Comparison

| Table | Source (Supabase) | Target (Local) | Status |
|-------|-------------------|----------------|--------|
| profiles | [dynamic] | [dynamic] | ✓ Match |
| flashcards | [dynamic] | [dynamic] | ✓ Match |
| tags | [dynamic] | [dynamic] | ✓ Match |
| card_tags | [dynamic] | [dynamic] | ✓ Match |

### Integrity Checks

- ✓ card_tags: No orphaned records
- ✓ flashcards.user_id: All references valid
- ✓ tags.user_id: All references valid
- ✓ profiles: No duplicate IDs
- ✓ tags: No duplicate (user_id, name) pairs

## Important Notes

1. **No Production Changes**: This migration does NOT modify the production read/write path. Supabase remains the primary database.

2. **Data Copy Only**: This is a one-time copy operation, not a cutover.

3. **Sequences Reset**: Import script automatically resets sequences to maintain ID continuity.

4. **CASCADE Truncation**: Local tables are cleared before import using `TRUNCATE TABLE ... CASCADE`.

## Blocking Points

- **Supabase Connection**: Requires valid Supabase PostgreSQL credentials
- **Network Access**: Must be able to connect to Supabase database host
- **Local PostgreSQL**: Must be running (managed via docker-compose)

## Next Steps

1. Run export with actual Supabase credentials
2. Run import to populate local database
3. Run verification to confirm data integrity
4. Update application configuration (if switching to local DB)

## Files Generated

- `.tmp/supabase-export/profiles.dump`
- `.tmp/supabase-export/flashcards.dump`
- `.tmp/supabase-export/tags.dump`
- `.tmp/supabase-export/card_tags.dump`
- `.tmp/migration-verify/row-counts.txt`
