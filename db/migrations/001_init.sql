-- Migration: 001_init.sql
-- Description: Initialize core business schema (idempotent)
-- Created: 2026-02-22
-- Project: StackMemory

BEGIN;

-- ============================================
-- PROFILES: User profile and settings
-- ============================================
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY,
    username VARCHAR(255) UNIQUE,
    avatar_url TEXT,
    settings JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_profiles_username') THEN
        CREATE INDEX idx_profiles_username ON profiles(username);
    END IF;
END $$;

-- ============================================
-- FLASHCARDS: Core flashcard storage
-- ============================================
CREATE TABLE IF NOT EXISTS flashcards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    front TEXT NOT NULL,
    back TEXT NOT NULL,
    source_url TEXT,
    review_count INT NOT NULL DEFAULT 0,
    next_review_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_flashcards_user_created') THEN
        CREATE INDEX idx_flashcards_user_created ON flashcards(user_id, created_at DESC);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_flashcards_next_review') THEN
        CREATE INDEX idx_flashcards_next_review ON flashcards(user_id, next_review_at) WHERE next_review_at IS NOT NULL;
    END IF;
END $$;

-- ============================================
-- TAGS: User-defined tags for categorization
-- ============================================
CREATE TABLE IF NOT EXISTS tags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, name)
);

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_tags_user_name') THEN
        CREATE INDEX idx_tags_user_name ON tags(user_id, name);
    END IF;
END $$;

-- ============================================
-- CARD_TAGS: Flashcard-Tag relationship
-- ============================================
CREATE TABLE IF NOT EXISTS card_tags (
    card_id UUID NOT NULL,
    tag_id UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY(card_id, tag_id)
);

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_card_tags_tag_id') THEN
        CREATE INDEX idx_card_tags_tag_id ON card_tags(tag_id);
    END IF;
END $$;

-- ============================================
-- Foreign Keys (if tables exist & auth.users exists)
-- ============================================
DO $$
DECLARE constraint_exists BOOLEAN;
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.schemata WHERE schema_name = 'auth') AND
       EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'users' AND table_schema = 'auth') THEN
        SELECT INTO constraint_exists EXISTS (
            SELECT 1 FROM information_schema.table_constraints 
            WHERE constraint_name = 'fk_profiles_auth' AND table_name = 'profiles'
        );
        IF NOT constraint_exists THEN
            ALTER TABLE profiles ADD CONSTRAINT fk_profiles_auth FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;
        END IF;
    END IF;
END $$;

DO $$
DECLARE constraint_exists BOOLEAN;
BEGIN
    SELECT INTO constraint_exists EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_flashcards_user' AND table_name = 'flashcards'
    );
    IF NOT constraint_exists THEN
        ALTER TABLE flashcards ADD CONSTRAINT fk_flashcards_user FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;
    END IF;
END $$;

DO $$
DECLARE constraint_exists BOOLEAN;
BEGIN
    SELECT INTO constraint_exists EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_tags_user' AND table_name = 'tags'
    );
    IF NOT constraint_exists THEN
        ALTER TABLE tags ADD CONSTRAINT fk_tags_user FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;
    END IF;
END $$;

DO $$
DECLARE constraint_exists BOOLEAN;
BEGIN
    SELECT INTO constraint_exists EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_card_tags_card' AND table_name = 'card_tags'
    );
    IF NOT constraint_exists THEN
        ALTER TABLE card_tags ADD CONSTRAINT fk_card_tags_card FOREIGN KEY (card_id) REFERENCES flashcards(id) ON DELETE CASCADE;
    END IF;
END $$;

DO $$
DECLARE constraint_exists BOOLEAN;
BEGIN
    SELECT INTO constraint_exists EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_card_tags_tag' AND table_name = 'card_tags'
    );
    IF NOT constraint_exists THEN
        ALTER TABLE card_tags ADD CONSTRAINT fk_card_tags_tag FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE;
    END IF;
END $$;

COMMIT;
