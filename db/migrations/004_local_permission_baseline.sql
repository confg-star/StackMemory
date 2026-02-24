-- Migration: 004_local_permission_baseline.sql
-- Description: Local permission baseline with RLS policies replacing Supabase auth.uid()
-- Created: 2026-02-23
-- Project: StackMemory
-- 
-- This migration implements local Row Level Security (RLS) policies
-- to replace Supabase's auth.uid() based RLS. It creates:
-- 1. Application roles for permission management
-- 2. Session context functions to get current user
-- 3. RLS policies for all core tables
-- 4. Security barrier functions for safe data access

BEGIN;

-- ============================================
-- 1. Application Roles
-- ============================================

-- Create application roles (not login roles, just for permission grouping)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'app_user') THEN
        CREATE ROLE app_user WITH NOLOGIN;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'app_readonly') THEN
        CREATE ROLE app_readonly WITH NOLOGIN;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'app_service') THEN
        CREATE ROLE app_service WITH NOLOGIN;
    END IF;
END
$$;

-- Grant default privileges
GRANT USAGE ON SCHEMA public TO app_user, app_readonly, app_service;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO app_readonly;
GRANT ALL ON ALL TABLES IN SCHEMA public TO app_user;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO app_user;

-- ============================================
-- 2. Session Context Functions
-- ============================================

-- Function to get current user ID from session variable
-- This replaces Supabase's auth.uid() function
CREATE OR REPLACE FUNCTION current_user_id() 
RETURNS UUID 
LANGUAGE plpgsql 
STABLE 
PARALLEL SAFE
AS $$
DECLARE
    v_user_id UUID;
BEGIN
    -- Try to get from custom session variable (set by application)
    v_user_id := NULLIF(current_setting('app.current_user_id', true), '')::UUID;
    
    -- If not set, try to get from auth.users (for Supabase compatibility)
    IF v_user_id IS NULL AND EXISTS (SELECT 1 FROM information_schema.schemata WHERE schema_name = 'auth') THEN
        EXECUTE 'SELECT auth.uid()' INTO v_user_id;
    END IF;
    
    RETURN v_user_id;
END;
$$;

-- Function to set current user context (called at session start after authentication)
CREATE OR REPLACE FUNCTION set_current_user(p_user_id UUID) 
RETURNS VOID 
LANGUAGE plpgsql 
VOLATILE 
SECURITY DEFINER
AS $$
BEGIN
    PERFORM set_config('app.current_user_id', p_user_id::TEXT, true);
END;
$$;

-- Function to clear current user context (called on logout)
CREATE OR REPLACE FUNCTION clear_current_user() 
RETURNS VOID 
LANGUAGE plpgsql 
VOLATILE 
SECURITY DEFINER
AS $$
BEGIN
    PERFORM set_config('app.current_user_id', '', true);
END;
$$;

-- Function to check if current user is authenticated
CREATE OR REPLACE FUNCTION is_authenticated() 
RETURNS BOOLEAN 
LANGUAGE plpgsql 
STABLE
AS $$
BEGIN
    RETURN current_user_id() IS NOT NULL;
END;
$$;

-- Function to authorize access - raises exception if not owner
CREATE OR REPLACE FUNCTION authorize_owner(p_owner_id UUID) 
RETURNS VOID 
LANGUAGE plpgsql 
VOLATILE
AS $$
DECLARE
    v_current_user UUID;
BEGIN
    v_current_user := current_user_id();
    
    IF v_current_user IS NULL THEN
        RAISE EXCEPTION 'Not authenticated. Please log in.';
    END IF;
    
    IF p_owner_id != v_current_user THEN
        RAISE EXCEPTION 'Permission denied. You can only access your own data.';
    END IF;
END;
$$;

-- ============================================
-- 3. Enable RLS on All Core Tables
-- ============================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE flashcards ENABLE ROW LEVEL SECURITY;
ALTER TABLE tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE card_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE routes ENABLE ROW LEVEL SECURITY;
ALTER TABLE route_tasks ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 4. RLS Policies for PROFILES
-- ============================================

-- Users can view their own profile
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
CREATE POLICY "Users can view own profile" ON profiles 
FOR SELECT USING (id = current_user_id());

-- Users can update their own profile
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile" ON profiles 
FOR UPDATE USING (id = current_user_id());

-- Users can insert their own profile (via trigger or direct)
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
CREATE POLICY "Users can insert own profile" ON profiles 
FOR INSERT WITH CHECK (id = current_user_id());

-- ============================================
-- 5. RLS Policies for FLASHCARDS
-- ============================================

-- Users can view their own flashcards
DROP POLICY IF EXISTS "Users can view own flashcards" ON flashcards;
CREATE POLICY "Users can view own flashcards" ON flashcards 
FOR SELECT USING (user_id = current_user_id());

-- Users can update their own flashcards
DROP POLICY IF EXISTS "Users can update own flashcards" ON flashcards;
CREATE POLICY "Users can update own flashcards" ON flashcards 
FOR UPDATE USING (user_id = current_user_id());

-- Users can insert their own flashcards
DROP POLICY IF EXISTS "Users can insert own flashcards" ON flashcards;
CREATE POLICY "Users can insert own flashcards" ON flashcards 
FOR INSERT WITH CHECK (user_id = current_user_id());

-- Users can delete their own flashcards
DROP POLICY IF EXISTS "Users can delete own flashcards" ON flashcards;
CREATE POLICY "Users can delete own flashcards" ON flashcards 
FOR DELETE USING (user_id = current_user_id());

-- ============================================
-- 6. RLS Policies for TAGS
-- ============================================

-- Users can view their own tags
DROP POLICY IF EXISTS "Users can view own tags" ON tags;
CREATE POLICY "Users can view own tags" ON tags 
FOR SELECT USING (user_id = current_user_id());

-- Users can update their own tags
DROP POLICY IF EXISTS "Users can update own tags" ON tags;
CREATE POLICY "Users can update own tags" ON tags 
FOR UPDATE USING (user_id = current_user_id());

-- Users can insert their own tags
DROP POLICY IF EXISTS "Users can insert own tags" ON tags;
CREATE POLICY "Users can insert own tags" ON tags 
FOR INSERT WITH CHECK (user_id = current_user_id());

-- Users can delete their own tags
DROP POLICY IF EXISTS "Users can delete own tags" ON tags;
CREATE POLICY "Users can delete own tags" ON tags 
FOR DELETE USING (user_id = current_user_id());

-- ============================================
-- 7. RLS Policies for CARD_TAGS
-- ============================================

-- Card tags: user must own the card OR the tag
DROP POLICY IF EXISTS "Users can view own card_tags" ON card_tags;
CREATE POLICY "Users can view own card_tags" ON card_tags 
FOR SELECT USING (
    EXISTS (SELECT 1 FROM flashcards WHERE id = card_id AND user_id = current_user_id())
    OR
    EXISTS (SELECT 1 FROM tags WHERE id = tag_id AND user_id = current_user_id())
);

DROP POLICY IF EXISTS "Users can insert own card_tags" ON card_tags;
CREATE POLICY "Users can insert own card_tags" ON card_tags 
FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM flashcards WHERE id = card_id AND user_id = current_user_id())
    OR
    EXISTS (SELECT 1 FROM tags WHERE id = tag_id AND user_id = current_user_id())
);

DROP POLICY IF EXISTS "Users can delete own card_tags" ON card_tags;
CREATE POLICY "Users can delete own card_tags" ON card_tags 
FOR DELETE USING (
    EXISTS (SELECT 1 FROM flashcards WHERE id = card_id AND user_id = current_user_id())
    OR
    EXISTS (SELECT 1 FROM tags WHERE id = tag_id AND user_id = current_user_id())
);

-- ============================================
-- 8. RLS Policies for ROUTES
-- ============================================

-- Users can view their own routes
DROP POLICY IF EXISTS "Users can view own routes" ON routes;
CREATE POLICY "Users can view own routes" ON routes 
FOR SELECT USING (user_id = current_user_id());

-- Users can insert their own routes
DROP POLICY IF EXISTS "Users can insert own routes" ON routes;
CREATE POLICY "Users can insert own routes" ON routes 
FOR INSERT WITH CHECK (user_id = current_user_id());

-- Users can update their own routes
DROP POLICY IF EXISTS "Users can update own routes" ON routes;
CREATE POLICY "Users can update own routes" ON routes 
FOR UPDATE USING (user_id = current_user_id());

-- Users can delete their own routes
DROP POLICY IF EXISTS "Users can delete own routes" ON routes;
CREATE POLICY "Users can delete own routes" ON routes 
FOR DELETE USING (user_id = current_user_id());

-- ============================================
-- 9. RLS Policies for ROUTE_TASKS
-- ============================================

-- Users can view their own route tasks
DROP POLICY IF EXISTS "Users can view own route tasks" ON route_tasks;
CREATE POLICY "Users can view own route tasks" ON route_tasks 
FOR SELECT USING (user_id = current_user_id());

-- Users can insert their own route tasks
DROP POLICY IF EXISTS "Users can insert own route tasks" ON route_tasks;
CREATE POLICY "Users can insert own route tasks" ON route_tasks 
FOR INSERT WITH CHECK (user_id = current_user_id());

-- Users can update their own route tasks
DROP POLICY IF EXISTS "Users can update own route tasks" ON route_tasks;
CREATE POLICY "Users can update own route tasks" ON route_tasks 
FOR UPDATE USING (user_id = current_user_id());

-- Users can delete their own route tasks
DROP POLICY IF EXISTS "Users can delete own route tasks" ON route_tasks;
CREATE POLICY "Users can delete own route tasks" ON route_tasks 
FOR DELETE USING (user_id = current_user_id());

-- ============================================
-- 10. Helper View for Permission Testing
-- ============================================

-- View to check current session context (for debugging)
CREATE OR REPLACE VIEW v_session_context AS
SELECT 
    current_user_id() AS current_user_id,
    is_authenticated() AS is_authenticated,
    current_setting('app.current_user_id', true) AS session_user_setting;

-- ============================================
-- 11. Grant Application Permissions
-- ============================================

-- Grant execute on helper functions to app roles
GRANT EXECUTE ON FUNCTION current_user_id() TO app_user, app_readonly, app_service;
GRANT EXECUTE ON FUNCTION set_current_user(UUID) TO app_user, app_service;
GRANT EXECUTE ON FUNCTION clear_current_user() TO app_user, app_service;
GRANT EXECUTE ON FUNCTION is_authenticated() TO app_user, app_readonly, app_service;
GRANT EXECUTE ON FUNCTION authorize_owner(UUID) TO app_user, app_service;

-- ============================================
-- 12. Create Test User for Verification
-- ============================================

-- Create a test user if not exists (id: 00000000-0000-0000-0000-000000000002)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = '00000000-0000-0000-0000-000000000002') THEN
        INSERT INTO profiles (id, username, settings)
        VALUES ('00000000-0000-0000-0000-000000000002', 'test_user', '{}');
    END IF;
END
$$;

COMMIT;
