-- StackMemory Local One-Click Initialization
-- Usage:
--   psql -h localhost -p 5432 -U stackuser -d stackmemory -f db/local-one-click-init.sql

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ============================================
-- Core Tables
-- ============================================

CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY,
    username VARCHAR(255) UNIQUE,
    avatar_url TEXT,
    settings JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS routes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    topic VARCHAR(500) NOT NULL,
    background TEXT,
    goals TEXT,
    weeks INTEGER NOT NULL DEFAULT 12 CHECK (weeks > 0 AND weeks <= 52),
    roadmap_data JSONB,
    is_current BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS flashcards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    route_id UUID REFERENCES routes(id) ON DELETE SET NULL,
    question TEXT NOT NULL,
    answer TEXT NOT NULL,
    code_snippet TEXT,
    source_url TEXT,
    source_title TEXT,
    difficulty VARCHAR(50),
    is_reviewed BOOLEAN NOT NULL DEFAULT FALSE,
    review_count INTEGER NOT NULL DEFAULT 0 CHECK (review_count >= 0),
    last_reviewed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS tags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    color VARCHAR(50) NOT NULL DEFAULT '#3b82f6',
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (name, user_id)
);

CREATE TABLE IF NOT EXISTS card_tags (
    card_id UUID NOT NULL REFERENCES flashcards(id) ON DELETE CASCADE,
    tag_id UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (card_id, tag_id)
);

CREATE TABLE IF NOT EXISTS route_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    route_id UUID NOT NULL REFERENCES routes(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    task_id VARCHAR(100) NOT NULL,
    title VARCHAR(500) NOT NULL,
    task_type VARCHAR(50),
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed')),
    week INTEGER CHECK (week IS NULL OR (week > 0 AND week <= 52)),
    day INTEGER CHECK (day IS NULL OR (day > 0 AND day <= 7)),
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (route_id, task_id)
);

-- ============================================
-- Indexes
-- ============================================

CREATE INDEX IF NOT EXISTS idx_profiles_username ON profiles(username);
CREATE INDEX IF NOT EXISTS idx_routes_user_id ON routes(user_id);
CREATE INDEX IF NOT EXISTS idx_routes_user_current ON routes(user_id, is_current) WHERE is_current = TRUE;
CREATE INDEX IF NOT EXISTS idx_routes_updated_at ON routes(updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_flashcards_user_id ON flashcards(user_id);
CREATE INDEX IF NOT EXISTS idx_flashcards_route_id ON flashcards(route_id);
CREATE INDEX IF NOT EXISTS idx_flashcards_user_route ON flashcards(user_id, route_id);
CREATE INDEX IF NOT EXISTS idx_flashcards_created_at ON flashcards(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_tags_user_id ON tags(user_id);
CREATE INDEX IF NOT EXISTS idx_tags_user_name ON tags(user_id, name);
CREATE INDEX IF NOT EXISTS idx_card_tags_tag_id ON card_tags(tag_id);

CREATE INDEX IF NOT EXISTS idx_route_tasks_route_id ON route_tasks(route_id);
CREATE INDEX IF NOT EXISTS idx_route_tasks_user_id ON route_tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_route_tasks_week_day ON route_tasks(week, day);

-- ============================================
-- updated_at Trigger
-- ============================================

CREATE OR REPLACE FUNCTION fn_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_profiles_updated_at ON profiles;
CREATE TRIGGER trg_profiles_updated_at
BEFORE UPDATE ON profiles
FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

DROP TRIGGER IF EXISTS trg_routes_updated_at ON routes;
CREATE TRIGGER trg_routes_updated_at
BEFORE UPDATE ON routes
FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

DROP TRIGGER IF EXISTS trg_flashcards_updated_at ON flashcards;
CREATE TRIGGER trg_flashcards_updated_at
BEFORE UPDATE ON flashcards
FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

DROP TRIGGER IF EXISTS trg_route_tasks_updated_at ON route_tasks;
CREATE TRIGGER trg_route_tasks_updated_at
BEFORE UPDATE ON route_tasks
FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

-- ============================================
-- Default Local Demo User
-- ============================================

INSERT INTO profiles (id, username, settings)
VALUES (
    '00000000-0000-0000-0000-000000000002',
    'local_demo_user',
    '{"mode":"local_pg"}'::jsonb
)
ON CONFLICT (id) DO NOTHING;

COMMIT;
