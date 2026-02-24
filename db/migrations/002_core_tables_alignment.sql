-- Migration: 002_core_tables_alignment.md
-- Description: Align core tables with application code (idempotent)
-- Created: 2026-02-23
-- Project: StackMemory

BEGIN;

-- ============================================
-- Fix flashcards: rename front->question, back->answer, add missing fields
-- ============================================

-- Add missing columns if they don't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'flashcards' AND column_name = 'question') THEN
        ALTER TABLE flashcards ADD COLUMN question TEXT;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'flashcards' AND column_name = 'answer') THEN
        ALTER TABLE flashcards ADD COLUMN answer TEXT;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'flashcards' AND column_name = 'code_snippet') THEN
        ALTER TABLE flashcards ADD COLUMN code_snippet TEXT;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'flashcards' AND column_name = 'source_title') THEN
        ALTER TABLE flashcards ADD COLUMN source_title TEXT;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'flashcards' AND column_name = 'difficulty') THEN
        ALTER TABLE flashcards ADD COLUMN difficulty VARCHAR(50);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'flashcards' AND column_name = 'route_id') THEN
        ALTER TABLE flashcards ADD COLUMN route_id UUID REFERENCES routes(id) ON DELETE SET NULL;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'flashcards' AND column_name = 'is_reviewed') THEN
        ALTER TABLE flashcards ADD COLUMN is_reviewed BOOLEAN DEFAULT FALSE;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'flashcards' AND column_name = 'last_reviewed_at') THEN
        ALTER TABLE flashcards ADD COLUMN last_reviewed_at TIMESTAMPTZ;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'flashcards' AND column_name = 'updated_at') THEN
        ALTER TABLE flashcards ADD COLUMN updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
    END IF;
END $$;

-- Migrate data from front/back to question/answer if question is null
UPDATE flashcards SET question = front WHERE question IS NULL AND front IS NOT NULL;
UPDATE flashcards SET answer = back WHERE answer IS NULL AND back IS NOT NULL;

-- Create index for route_id if not exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_flashcards_route_id') THEN
        CREATE INDEX idx_flashcards_route_id ON flashcards(route_id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_flashcards_user_route') THEN
        CREATE INDEX idx_flashcards_user_route ON flashcards(user_id, route_id);
    END IF;
END $$;

-- ============================================
-- Fix tags: add color field
-- ============================================

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tags' AND column_name = 'color') THEN
        ALTER TABLE tags ADD COLUMN color VARCHAR(50) DEFAULT '#3b82f6';
    END IF;
END $$;

-- ============================================
-- Fix card_tags: remove id if exists, ensure composite pk
-- ============================================

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'card_tags' AND column_name = 'id') THEN
        -- First drop the primary key
        ALTER TABLE card_tags DROP CONSTRAINT IF EXISTS card_tags_pkey;
        -- Drop the id column
        ALTER TABLE card_tags DROP COLUMN IF EXISTS id;
        -- Add composite primary key
        ALTER TABLE card_tags ADD PRIMARY KEY(card_id, tag_id);
    END IF;
END $$;

-- ============================================
-- Ensure profiles has all required fields
-- ============================================

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'username') THEN
        ALTER TABLE profiles ADD COLUMN username VARCHAR(255);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'avatar_url') THEN
        ALTER TABLE profiles ADD COLUMN avatar_url TEXT;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'settings') THEN
        ALTER TABLE profiles ADD COLUMN settings JSONB DEFAULT '{}'::jsonb;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'updated_at') THEN
        ALTER TABLE profiles ADD COLUMN updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
    END IF;
END $$;

-- Add unique constraint on username (allow null)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints 
                   WHERE table_name = 'profiles' AND constraint_name = 'profiles_username_key') THEN
        ALTER TABLE profiles ADD CONSTRAINT profiles_username_key UNIQUE (username);
    END IF;
END $$;

COMMIT;
