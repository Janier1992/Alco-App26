-- =========================================================================================
-- INSFORGE MESSAGING V2 - STORAGE SETUP
-- Run this script in your Supabase SQL Editor to create the bucket for chat attachments
-- =========================================================================================

-- 1. Create the bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('chat_attachments', 'chat_attachments', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Setup RLS Policies for the bucket
-- Allow public access to view attachments (since bucket is public, this is mainly for SELECTs if needed,
-- but the public flag usually handles GET requests without auth on public buckets)
CREATE POLICY "Public Access for chat_attachments"
ON storage.objects FOR SELECT
USING (bucket_id = 'chat_attachments');

-- Allow authenticated users to upload new attachments
CREATE POLICY "Authenticated users can upload chat attachments"
ON storage.objects FOR INSERT
WITH CHECK (
    auth.role() = 'authenticated' AND
    bucket_id = 'chat_attachments'
);

-- Allow authenticated users to delete their own attachments
CREATE POLICY "Users can delete their own chat attachments"
ON storage.objects FOR DELETE
USING (
    auth.role() = 'authenticated' AND
    bucket_id = 'chat_attachments' AND
    owner = auth.uid()
);
