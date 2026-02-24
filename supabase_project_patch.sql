-- Run this in your Supabase SQL Editor to enable the new Project functions

-- 1. Create the task_checklists table
CREATE TABLE IF NOT EXISTS public.task_checklists (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    task_id UUID NOT NULL REFERENCES public.board_tasks(id) ON DELETE CASCADE,
    text TEXT NOT NULL,
    completed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Turn on RLS for task_checklists
ALTER TABLE public.task_checklists ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to read/write/update checklists (assuming basic auth for now)
CREATE POLICY "Enable read access for all users" ON public.task_checklists FOR SELECT USING (true);
CREATE POLICY "Enable insert access for all users" ON public.task_checklists FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update access for all users" ON public.task_checklists FOR UPDATE USING (true);
CREATE POLICY "Enable delete access for all users" ON public.task_checklists FOR DELETE USING (true);

-- 2. Add is_archived column to board_tasks if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public' 
        AND table_name = 'board_tasks'
        AND column_name = 'is_archived'
    ) THEN
        ALTER TABLE public.board_tasks ADD COLUMN is_archived BOOLEAN DEFAULT FALSE;
    END IF;
END $$;
