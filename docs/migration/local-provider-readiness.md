# Local Provider Readiness Guide

## Overview
This document outlines the steps required to switch from Supabase to local PostgreSQL (`DATA_PROVIDER=local_pg`).

## Prerequisites
- Docker and Docker Compose installed
- PostgreSQL 16+ (via Docker)
- Node.js 18+

## Environment Configuration

### Required Environment Variables
```bash
# Data Provider
DATA_PROVIDER=local_pg

# Local PostgreSQL Connection
LOCAL_PG_HOST=localhost
LOCAL_PG_PORT=5432
LOCAL_PG_DB=stackmemory
LOCAL_PG_USER=stackuser
LOCAL_PG_PASSWORD=stackpass
```

### Updated .env Configuration
The `.env` file should contain:
```bash
TZ=Asia/Shanghai
DATA_PROVIDER=local_pg
LOCAL_PG_HOST=localhost
LOCAL_PG_PORT=5432
LOCAL_PG_DB=stackmemory
LOCAL_PG_USER=stackuser
LOCAL_PG_PASSWORD=stackpass
```

## Database Setup

### 1. Start PostgreSQL
```bash
docker-compose up -d postgres
```

Wait for health check:
```bash
./scripts/db-healthcheck.sh
```

### 2. Run Migrations
```bash
docker exec stackmemory-postgres psql -h localhost -p 5432 -U stackuser -d stackmemory -f "/docker-entrypoint-initdb.d/init.sql"
docker exec stackmemory-postgres psql -h localhost -p 5432 -U stackuser -d stackmemory -f "/path/to/db/migrations/001_init.sql"
docker exec stackmemory-postgres psql -h localhost -p 5432 -U stackuser -d stackmemory -f "/path/to/db/migrations/002_core_tables_alignment.sql"
docker exec stackmemory-postgres psql -h localhost -p 5432 -U stackuser -d stackmemory -f "/path/to/db/migrations/003_local_extended_tables_and_views.sql"
docker exec stackmemory-postgres psql -h localhost -p 5432 -U stackuser -d stackmemory -f "/path/to/db/migrations/004_local_permission_baseline.sql"
```

### 3. Load Seed Data
```bash
./scripts/db-seed.sh
```

Or manually:
```bash
docker exec stackmemory-postgres psql -h localhost -p 5432 -U stackuser -d stackmemory -f "/path/to/db/seed.sql"
```

## Verification Checklist

### Database Connectivity
- [ ] PostgreSQL container is running
- [ ] Health check passes
- [ ] Can connect with credentials from .env

### Schema Validation
- [ ] All migrations applied successfully
- [ ] Tables created: profiles, flashcards, tags, card_tags, routes, route_tasks
- [ ] Indexes created
- [ ] Views created: v_user_learning_progress, v_flashcard_stats, v_tag_usage, v_daily_review_queue

### Seed Data Verification
- [ ] Test user exists (ID: 00000000-0000-0000-0000-000000000002)
- [ ] Tags loaded (6 tags)
- [ ] Flashcards loaded (5 cards)
- [ ] Routes loaded (1 route with 8 tasks)

### Application Verification
```bash
# Check data provider mode
curl http://localhost:3011/api/health

# Test card retrieval (requires auth)
# Use test user ID: 00000000-0000-0000-0000-000000000002
```

## Startup Script

### Development Mode
```bash
# Set environment
export DATA_PROVIDER=local_pg

# Start the app
npm run dev
# or
./scripts/dev-3011.sh
```

### Production Mode (Docker)
```bash
docker-compose up -d
```

## Troubleshooting

### Connection Issues
1. Check PostgreSQL is running: `docker ps | grep postgres`
2. Verify port 5432 is not in use: `lsof -i :5432`
3. Check credentials match in .env and docker-compose.yml

### Authentication Issues
In local_pg mode, the app uses Supabase auth by default. To test locally:
1. Use Supabase auth even with local_pg data provider
2. Or implement local auth session handling

### Migration Issues
1. Check for existing data conflicts
2. Run migrations in order (001 → 004)
3. Use idempotent SQL (IF NOT EXISTS)

## Files Modified

### Configuration
- `.env.example` - Updated to use LOCAL_PG_* variables
- `docker-compose.yml` - Uses LOCAL_PG_* variables

### Scripts
- `scripts/db-healthcheck.sh` - Uses LOCAL_PG_* variables
- `scripts/db-verify-migration.sh` - Uses LOCAL_PG_* variables  
- `scripts/db-import-local.sh` - Uses LOCAL_PG_* variables
- `scripts/db-seed.sh` - NEW: Seed data initialization

### Database
- `init.sql` - Added profiles table
- `db/seed.sql` - NEW: Seed data

### Documentation
- `docs/migration/local-provider-readiness.md` - This file
