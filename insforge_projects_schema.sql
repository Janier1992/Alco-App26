-- =========================================================================================
-- INSFORGE PROJECT MANAGEMENT - COMPREHENSIVE SCHEMA SETUP
-- Run this script in your Supabase SQL Editor to ensure all tables, columns, and
-- policies are correctly configured for the Kanban / Trello-style board.
-- =========================================================================================

-- 1. Ensure board_projects exists
CREATE TABLE IF NOT EXISTS public.board_projects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE
);

-- 2. Ensure board_columns exists
CREATE TABLE IF NOT EXISTS public.board_columns (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    board_id UUID REFERENCES public.board_projects(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    position INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 3. Ensure board_tasks exists and has is_archived column
CREATE TABLE IF NOT EXISTS public.board_tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    board_id UUID REFERENCES public.board_projects(id) ON DELETE CASCADE,
    column_id UUID REFERENCES public.board_columns(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    priority TEXT DEFAULT 'Media',
    position INTEGER NOT NULL DEFAULT 0,
    due_date TIMESTAMP WITH TIME ZONE,
    is_archived BOOLEAN DEFAULT FALSE,
    is_template BOOLEAN DEFAULT FALSE,
    cover_color TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE
);

-- Safe execution to add is_archived if it was missing in an older schema
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='board_tasks' AND column_name='is_archived') THEN
        ALTER TABLE public.board_tasks ADD COLUMN is_archived BOOLEAN DEFAULT FALSE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='board_tasks' AND column_name='is_template') THEN
        ALTER TABLE public.board_tasks ADD COLUMN is_template BOOLEAN DEFAULT FALSE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='board_tasks' AND column_name='cover_color') THEN
        ALTER TABLE public.board_tasks ADD COLUMN cover_color TEXT;
    END IF;
END
$$;

-- Safe execution to fix the task_assignees schema issue if table already exists
DO $$
BEGIN
    -- Fix user_id type from UUID to TEXT
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name='task_assignees' AND column_name='user_id' AND data_type='uuid'
    ) THEN
        ALTER TABLE public.task_assignees ALTER COLUMN user_id TYPE TEXT USING user_id::text;
    END IF;

    -- Fix initials column name to user_initials
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name='task_assignees' AND column_name='initials'
    ) THEN
        ALTER TABLE public.task_assignees RENAME COLUMN initials TO user_initials;
    END IF;
END
$$;

-- 4. Enable Task Checklists
CREATE TABLE IF NOT EXISTS public.task_checklists (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    task_id UUID REFERENCES public.board_tasks(id) ON DELETE CASCADE,
    text TEXT NOT NULL,
    completed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 5. Enable Task Labels
CREATE TABLE IF NOT EXISTS public.task_labels (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    task_id UUID REFERENCES public.board_tasks(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    color TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 6. Enable Task Assignees (Members)
CREATE TABLE IF NOT EXISTS public.task_assignees (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    task_id UUID REFERENCES public.board_tasks(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL, -- Changed from UUID to TEXT to allow string IDs (e.g. "ALEJANDRO AGUDELO")
    user_initials TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 7. Enable Task Attachments
CREATE TABLE IF NOT EXISTS public.task_attachments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    task_id UUID REFERENCES public.board_tasks(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    size INTEGER,
    type TEXT,
    url TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 8. Enable Task Comments
CREATE TABLE IF NOT EXISTS public.task_comments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    task_id UUID REFERENCES public.board_tasks(id) ON DELETE CASCADE,
    author TEXT NOT NULL,
    text TEXT NOT NULL,
    date TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- =========================================================================================
-- ROW LEVEL SECURITY (RLS) OPEN POLICIES
-- Enables the frontend to read/write freely for core functionality.
-- =========================================================================================

DO $$
DECLARE
    t text;
BEGIN
    FOR t IN SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename IN ('board_projects', 'board_columns', 'board_tasks', 'task_checklists', 'task_labels', 'task_assignees', 'task_attachments', 'task_comments') LOOP
        EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', t);
        EXECUTE format('DROP POLICY IF EXISTS "Allow ALL on %I" ON public.%I;', t, t);
        EXECUTE format('CREATE POLICY "Allow ALL on %I" ON public.%I FOR ALL USING (true) WITH CHECK (true);', t, t);
    END LOOP;
END
$$;
