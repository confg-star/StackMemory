# Local Extended Objects

## Overview

This document lists all extended database objects created for StackMemory local development. These objects extend the core schema to support learning routes, task management, and business analytics.

## Migration File

**File**: `db/migrations/003_local_extended_tables_and_views.sql`

## Extended Tables

### 1. routes

Learning roadmap/learning path table.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK, DEFAULT gen_random_uuid() | Primary key |
| user_id | UUID | FK -> profiles(id) | Owner user |
| topic | VARCHAR(500) | NOT NULL | Route topic/title |
| background | TEXT | NULL | User's background context |
| goals | TEXT | NULL | Learning goals |
| weeks | INTEGER | DEFAULT 4, CHECK > 0 && <= 52 | Duration in weeks |
| roadmap_data | JSONB | NULL | Structured roadmap data |
| is_current | BOOLEAN | DEFAULT FALSE | Active route flag |
| created_at | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Creation timestamp |
| updated_at | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Last update timestamp |

**Indexes**:
- `idx_routes_user_id` - User lookup
- `idx_routes_user_current` - Current route lookup (partial)
- `idx_routes_created_at` - Sorting by creation date

### 2. route_tasks

Tasks within a learning route.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK, DEFAULT gen_random_uuid() | Primary key |
| route_id | UUID | FK -> routes(id) | Parent route |
| user_id | UUID | FK -> profiles(id) | Owner user |
| task_id | VARCHAR(100) | NOT NULL, UNIQUE(route_id, task_id) | Unique task identifier |
| title | VARCHAR(500) | NOT NULL | Task title |
| task_type | VARCHAR(50) | NULL | Task type (e.g., "reading", "practice") |
| status | VARCHAR(20) | DEFAULT 'pending', CHECK IN | Task status |
| week | INTEGER | NULL, CHECK > 0 && <= 52 | Week number |
| day | INTEGER | NULL, CHECK > 0 && <= 7 | Day number |
| completed_at | TIMESTAMPTZ | NULL | Completion timestamp |
| created_at | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Creation timestamp |
| updated_at | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Last update timestamp |

**Indexes**:
- `idx_route_tasks_route_id` - Route lookup
- `idx_route_tasks_user_id` - User lookup
- `idx_route_tasks_status` - Status filtering
- `idx_route_tasks_week_day` - Week/day sorting

### 3. flashcards (Extended)

Added columns via migration 002:

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| question | TEXT | NULL | Card question (renamed from front) |
| answer | TEXT | NULL | Card answer (renamed from back) |
| code_snippet | TEXT | NULL | Code example |
| source_title | TEXT | NULL | Source document title |
| difficulty | VARCHAR(50) | CHECK IN ('easy', 'medium', 'hard') | Difficulty level |
| route_id | UUID | FK -> routes(id) | Associated route |
| is_reviewed | BOOLEAN | DEFAULT FALSE | Review status |
| last_reviewed_at | TIMESTAMPTZ | NULL | Last review timestamp |
| updated_at | TIMESTAMPTZ | NOT NULL | Last update timestamp |

**Additional Indexes**:
- `idx_flashcards_route_id` - Route-based card lookup
- `idx_flashcards_user_route` - Composite user+route lookup

### 4. tags (Extended)

Added column via migration 002:

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| color | VARCHAR(50) | DEFAULT '#3b82f6' | Tag color (hex) |

## Check Constraints

| Table | Constraint | Condition |
|-------|------------|-----------|
| routes | ck_routes_weeks_positive | weeks > 0 AND weeks <= 52 |
| route_tasks | ck_route_tasks_status | status IN ('pending', 'in_progress', 'completed') |
| route_tasks | ck_route_tasks_week_valid | week IS NULL OR (week > 0 AND week <= 52) |
| route_tasks | ck_route_tasks_day_valid | day IS NULL OR (day > 0 AND day <= 7) |
| flashcards | ck_flashcards_difficulty | difficulty IS NULL OR difficulty IN ('easy', 'medium', 'hard') |
| flashcards | ck_flashcards_review_count | review_count >= 0 |

## Views

### 1. v_user_learning_progress

User learning progress summary per route.

**Columns**: user_id, route_id, topic, weeks, total_tasks, completed_tasks, in_progress_tasks, completion_percentage, last_completed_at, route_started_at

### 2. v_flashcard_stats

Flashcard statistics aggregated per user.

**Columns**: user_id, total_cards, reviewed_cards, pending_cards, avg_review_count, routes_used, unique_sources, first_card_created, latest_card_created

### 3. v_tag_usage

Tag usage statistics with card counts.

**Columns**: user_id, tag_id, tag_name, color, card_count, reviewed_card_count

### 4. v_daily_review_queue

Cards due for review with priority.

**Columns**: card_id, user_id, question, answer, difficulty, review_count, last_reviewed_at, route_id, route_topic, next_review_due, review_status

## Functions

### 1. fn_calculate_next_review(p_review_count, p_difficulty)

Calculates next review interval using SM-2 algorithm variant.

**Returns**: INTERVAL

### 2. fn_get_current_route(p_user_id)

Returns current active route with progress statistics.

**Returns**: TABLE (route_id, topic, weeks, total_tasks, completed_tasks, completion_percentage)

### 3. fn_get_review_queue(p_user_id, p_limit)

Returns cards due for review, ordered by priority.

**Returns**: TABLE (card_id, question, answer, difficulty, review_count, source_url)

### 4. fn_update_card_review(p_card_id, p_user_id, p_new_difficulty)

Updates card after review (increments count, sets timestamp).

**Returns**: BOOLEAN

### 5. fn_initialize_route_tasks(p_route_id, p_user_id)

Bulk initializes tasks from roadmap_data JSON.

**Returns**: INTEGER (number of tasks created)

## RLS Policies

Extended RLS policies for routes and route_tasks tables:

- routes: SELECT, INSERT, UPDATE, DELETE (user_id = auth.uid())
- route_tasks: SELECT, INSERT, UPDATE, DELETE (user_id = auth.uid())

## Usage

Execute migration on empty database:

```bash
psql -h localhost -U stackuser -d stackmemory -f db/migrations/003_local_extended_tables_and_views.sql
```

Or sequentially with all migrations:

```bash
psql -h localhost -U stackuser -d stackmemory -f db/migrations/001_init.sql
psql -h localhost -U stackuser -d stackmemory -f db/migrations/002_core_tables_alignment.sql
psql -h localhost -U stackuser -d stackmemory -f db/migrations/003_local_extended_tables_and_views.sql
```

## Dependencies

- Core tables (profiles, flashcards, tags, card_tags) must exist
- auth.users table must exist for RLS to function properly
- Migration 002 must be applied before 003 (for route foreign key)
