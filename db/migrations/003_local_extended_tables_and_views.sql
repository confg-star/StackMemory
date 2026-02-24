-- Migration: 003_local_extended_tables_and_views.sql
-- Description: Create extended tables, views, and functions for local development
-- Created: 2026-02-23
-- Project: StackMemory

BEGIN;

-- ============================================
-- ROUTES: Learning roadmap/learning path table
-- ============================================
CREATE TABLE IF NOT EXISTS routes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    topic VARCHAR(500) NOT NULL,
    background TEXT,
    goals TEXT,
    weeks INTEGER DEFAULT 4,
    roadmap_data JSONB,
    is_current BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_routes_user_id ON routes(user_id);
CREATE INDEX IF NOT EXISTS idx_routes_user_current ON routes(user_id, is_current) WHERE is_current = TRUE;
CREATE INDEX IF NOT EXISTS idx_routes_created_at ON routes(created_at DESC);

-- ============================================
-- ROUTE_TASKS: Tasks within a learning route
-- ============================================
CREATE TABLE IF NOT EXISTS route_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    route_id UUID NOT NULL REFERENCES routes(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    task_id VARCHAR(100) NOT NULL,
    title VARCHAR(500) NOT NULL,
    task_type VARCHAR(50),
    status VARCHAR(20) DEFAULT 'pending',
    week INTEGER,
    day INTEGER,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(route_id, task_id)
);

CREATE INDEX IF NOT EXISTS idx_route_tasks_route_id ON route_tasks(route_id);
CREATE INDEX IF NOT EXISTS idx_route_tasks_user_id ON route_tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_route_tasks_status ON route_tasks(status);
CREATE INDEX IF NOT EXISTS idx_route_tasks_week_day ON route_tasks(week, day);

-- ============================================
-- Foreign Key Constraints
-- ============================================
DO $$
DECLARE constraint_exists BOOLEAN;
BEGIN
    SELECT INTO constraint_exists EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_flashcards_route' AND table_name = 'flashcards'
    );
    IF NOT constraint_exists THEN
        ALTER TABLE flashcards ADD CONSTRAINT fk_flashcards_route FOREIGN KEY (route_id) REFERENCES routes(id) ON DELETE SET NULL;
    END IF;
END $$;

-- ============================================
-- Check Constraints
-- ============================================
ALTER TABLE routes DROP CONSTRAINT IF EXISTS ck_routes_weeks_positive;
ALTER TABLE routes ADD CONSTRAINT ck_routes_weeks_positive CHECK (weeks > 0 AND weeks <= 52);

ALTER TABLE route_tasks DROP CONSTRAINT IF EXISTS ck_route_tasks_status;
ALTER TABLE route_tasks ADD CONSTRAINT ck_route_tasks_status CHECK (status IN ('pending', 'in_progress', 'completed'));

ALTER TABLE route_tasks DROP CONSTRAINT IF EXISTS ck_route_tasks_week_valid;
ALTER TABLE route_tasks ADD CONSTRAINT ck_route_tasks_week_valid CHECK (week IS NULL OR (week > 0 AND week <= 52));

ALTER TABLE route_tasks DROP CONSTRAINT IF EXISTS ck_route_tasks_day_valid;
ALTER TABLE route_tasks ADD CONSTRAINT ck_route_tasks_day_valid CHECK (day IS NULL OR (day > 0 AND day <= 7));

ALTER TABLE flashcards DROP CONSTRAINT IF EXISTS ck_flashcards_difficulty;
ALTER TABLE flashcards ADD CONSTRAINT ck_flashcards_difficulty CHECK (difficulty IS NULL OR difficulty IN ('easy', 'medium', 'hard'));

ALTER TABLE flashcards DROP CONSTRAINT IF EXISTS ck_flashcards_review_count;
ALTER TABLE flashcards ADD CONSTRAINT ck_flashcards_review_count CHECK (review_count >= 0);

-- ============================================
-- Views for business analytics
-- ============================================

-- View: User learning progress summary
CREATE OR REPLACE VIEW v_user_learning_progress AS
SELECT 
    r.user_id,
    r.id AS route_id,
    r.topic,
    r.weeks,
    COUNT(rt.id) AS total_tasks,
    COUNT(rt.id) FILTER (WHERE rt.status = 'completed') AS completed_tasks,
    COUNT(rt.id) FILTER (WHERE rt.status = 'in_progress') AS in_progress_tasks,
    ROUND(
        COUNT(rt.id) FILTER (WHERE rt.status = 'completed') * 100.0 / NULLIF(COUNT(rt.id), 0), 
        1
    ) AS completion_percentage,
    MAX(rt.completed_at) AS last_completed_at,
    r.created_at AS route_started_at
FROM routes r
LEFT JOIN route_tasks rt ON rt.route_id = r.id
GROUP BY r.id, r.user_id, r.topic, r.weeks, r.created_at;

-- View: Flashcard statistics per user
CREATE OR REPLACE VIEW v_flashcard_stats AS
SELECT 
    f.user_id,
    COUNT(f.id) AS total_cards,
    COUNT(f.id) FILTER (WHERE f.is_reviewed = TRUE) AS reviewed_cards,
    COUNT(f.id) FILTER (WHERE f.is_reviewed = FALSE) AS pending_cards,
    AVG(f.review_count) FILTER (WHERE f.review_count > 0) AS avg_review_count,
    COUNT(DISTINCT f.route_id) AS routes_used,
    COUNT(DISTINCT f.source_url) FILTER (WHERE f.source_url IS NOT NULL) AS unique_sources,
    MIN(f.created_at) AS first_card_created,
    MAX(f.created_at) AS latest_card_created
FROM flashcards f
GROUP BY f.user_id;

-- View: Tag usage statistics
CREATE OR REPLACE VIEW v_tag_usage AS
SELECT 
    t.user_id,
    t.id AS tag_id,
    t.name AS tag_name,
    t.color,
    COUNT(ct.card_id) AS card_count,
    COUNT(ct.card_id) FILTER (WHERE f.is_reviewed = TRUE) AS reviewed_card_count
FROM tags t
LEFT JOIN card_tags ct ON ct.tag_id = t.id
LEFT JOIN flashcards f ON f.id = ct.card_id
GROUP BY t.id, t.user_id, t.name, t.color;

-- View: Daily review queue
CREATE OR REPLACE VIEW v_daily_review_queue AS
SELECT 
    f.id AS card_id,
    f.user_id,
    f.question,
    f.answer,
    f.difficulty,
    f.review_count,
    f.last_reviewed_at,
    f.route_id,
    r.topic AS route_topic,
    COALESCE(
        f.last_reviewed_at + (CASE 
            WHEN f.review_count = 0 THEN INTERVAL '1 day'
            WHEN f.review_count = 1 THEN INTERVAL '3 days'
            WHEN f.review_count = 2 THEN INTERVAL '7 days'
            WHEN f.review_count = 3 THEN INTERVAL '14 days'
            WHEN f.review_count = 4 THEN INTERVAL '30 days'
            ELSE INTERVAL '60 days'
        END),
        f.created_at
    ) AS next_review_due,
    CASE 
        WHEN f.last_reviewed_at IS NULL THEN 'new'
        WHEN f.last_reviewed_at < NOW() - INTERVAL '1 day' THEN 'overdue'
        WHEN f.last_reviewed_at < NOW() + INTERVAL '1 day' THEN 'due_soon'
        ELSE 'upcoming'
    END AS review_status
FROM flashcards f
LEFT JOIN routes r ON r.id = f.route_id
WHERE f.is_reviewed = FALSE OR f.last_reviewed_at < NOW() + INTERVAL '1 day'
ORDER BY next_review_due ASC;

-- ============================================
-- Helper Functions
-- ============================================

-- Function: Calculate next review date based on SM-2 algorithm
CREATE OR REPLACE FUNCTION fn_calculate_next_review(
    p_review_count INT,
    p_difficulty VARCHAR
) RETURNS INTERVAL AS $$
DECLARE
    base_interval INTERVAL;
    multiplier DECIMAL := 1.0;
BEGIN
    base_interval := CASE 
        WHEN p_review_count = 0 THEN INTERVAL '1 day'
        WHEN p_review_count = 1 THEN INTERVAL '3 days'
        WHEN p_review_count = 2 THEN INTERVAL '7 days'
        WHEN p_review_count = 3 THEN INTERVAL '14 days'
        WHEN p_review_count = 4 THEN INTERVAL '30 days'
        ELSE INTERVAL '60 days'
    END;

    IF p_difficulty = 'easy' THEN
        multiplier := 2.5;
    ELSIF p_difficulty = 'medium' THEN
        multiplier := 1.5;
    ELSIF p_difficulty = 'hard' THEN
        multiplier := 0.5;
    END IF;

    RETURN base_interval * multiplier;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function: Get user's current learning route with progress
CREATE OR REPLACE FUNCTION fn_get_current_route(p_user_id UUID)
RETURNS TABLE (
    route_id UUID,
    topic VARCHAR,
    weeks INTEGER,
    total_tasks INTEGER,
    completed_tasks INTEGER,
    completion_percentage DECIMAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        r.id,
        r.topic,
        r.weeks,
        COUNT(rt.id)::INT AS total_tasks,
        COUNT(rt.id) FILTER (WHERE rt.status = 'completed')::INT AS completed_tasks,
        ROUND(
            COUNT(rt.id) FILTER (WHERE rt.status = 'completed') * 100.0 / NULLIF(COUNT(rt.id), 0),
            1
        )::DECIMAL AS completion_percentage
    FROM routes r
    LEFT JOIN route_tasks rt ON rt.route_id = r.id
    WHERE r.user_id = p_user_id AND r.is_current = TRUE
    GROUP BY r.id;
END;
$$ LANGUAGE plpgsql STABLE;

-- Function: Get cards due for review
CREATE OR REPLACE FUNCTION fn_get_review_queue(p_user_id UUID, p_limit INT DEFAULT 20)
RETURNS TABLE (
    card_id UUID,
    question TEXT,
    answer TEXT,
    difficulty VARCHAR,
    review_count INT,
    source_url TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        f.id,
        f.question,
        f.answer,
        f.difficulty,
        f.review_count,
        f.source_url
    FROM flashcards f
    WHERE f.user_id = p_user_id
      AND (f.last_reviewed_at IS NULL 
           OR f.last_reviewed_at + fn_calculate_next_review(f.review_count, f.difficulty) <= NOW())
    ORDER BY 
        CASE WHEN f.last_reviewed_at IS NULL THEN 0 ELSE f.review_count END ASC,
        CASE f.difficulty 
            WHEN 'hard' THEN 1 
            WHEN 'medium' THEN 2 
            WHEN 'easy' THEN 3 
            ELSE 4 
        END ASC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql STABLE;

-- Function: Update card after review
CREATE OR REPLACE FUNCTION fn_update_card_review(
    p_card_id UUID,
    p_user_id UUID,
    p_new_difficulty VARCHAR DEFAULT NULL
) RETURNS BOOLEAN AS $$
DECLARE
    current_count INT;
    current_difficulty VARCHAR;
BEGIN
    SELECT review_count, COALESCE(p_new_difficulty, difficulty)
    INTO current_count, current_difficulty
    FROM flashcards 
    WHERE id = p_card_id AND user_id = p_user_id;

    IF NOT FOUND THEN
        RETURN FALSE;
    END IF;

    UPDATE flashcards 
    SET 
        review_count = current_count + 1,
        last_reviewed_at = NOW(),
        difficulty = current_difficulty,
        is_reviewed = TRUE,
        updated_at = NOW()
    WHERE id = p_card_id AND user_id = p_user_id;

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Function: Bulk initialize route tasks from roadmap_data
CREATE OR REPLACE FUNCTION fn_initialize_route_tasks(
    p_route_id UUID,
    p_user_id UUID
) RETURNS INTEGER AS $$
DECLARE
    v_task_count INT := 0;
    v_roadmap JSONB;
    v_weeks INT;
    v_task JSONB;
BEGIN
    SELECT roadmap_data, weeks INTO v_roadmap, v_weeks
    FROM routes WHERE id = p_route_id AND user_id = p_user_id;

    IF v_roadmap IS NULL THEN
        RETURN 0;
    END IF;

    FOR v_task IN SELECT * FROM jsonb_array_elements(v_roadmap->'tasks')
    LOOP
        INSERT INTO route_tasks (route_id, user_id, task_id, title, task_type, status, week, day)
        VALUES (
            p_route_id,
            p_user_id,
            v_task->>'id',
            v_task->>'title',
            v_task->>'type',
            'pending',
            (v_task->>'week')::INT,
            (v_task->>'day')::INT
        )
        ON CONFLICT (route_id, task_id) DO NOTHING;
        v_task_count := v_task_count + 1;
    END LOOP;

    RETURN v_task_count;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- Row Level Security for extended tables
-- (Only apply if auth schema exists - Supabase)
-- ============================================
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.schemata WHERE schema_name = 'auth') THEN
        ALTER TABLE routes ENABLE ROW LEVEL SECURITY;
        ALTER TABLE route_tasks ENABLE ROW LEVEL SECURITY;

        DROP POLICY IF EXISTS "Users can view own routes" ON routes;
        DROP POLICY IF EXISTS "Users can insert own routes" ON routes;
        DROP POLICY IF EXISTS "Users can update own routes" ON routes;
        DROP POLICY IF EXISTS "Users can delete own routes" ON routes;

        CREATE POLICY "Users can view own routes" ON routes FOR SELECT USING (auth.uid() = user_id);
        CREATE POLICY "Users can insert own routes" ON routes FOR INSERT WITH CHECK (auth.uid() = user_id);
        CREATE POLICY "Users can update own routes" ON routes FOR UPDATE USING (auth.uid() = user_id);
        CREATE POLICY "Users can delete own routes" ON routes FOR DELETE USING (auth.uid() = user_id);

        DROP POLICY IF EXISTS "Users can view own route tasks" ON route_tasks;
        DROP POLICY IF EXISTS "Users can insert own route tasks" ON route_tasks;
        DROP POLICY IF EXISTS "Users can update own route tasks" ON route_tasks;
        DROP POLICY IF EXISTS "Users can delete own route tasks" ON route_tasks;

        CREATE POLICY "Users can view own route tasks" ON route_tasks FOR SELECT USING (auth.uid() = user_id);
        CREATE POLICY "Users can insert own route tasks" ON route_tasks FOR INSERT WITH CHECK (auth.uid() = user_id);
        CREATE POLICY "Users can update own route tasks" ON route_tasks FOR UPDATE USING (auth.uid() = user_id);
        CREATE POLICY "Users can delete own route tasks" ON route_tasks FOR DELETE USING (auth.uid() = user_id);
    END IF;
END $$;

COMMIT;
