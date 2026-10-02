-- Add code column to courses table if it doesn't exist
-- This migration ensures the code column exists and triggers a PostgREST schema cache refresh

ALTER TABLE courses ADD COLUMN IF NOT EXISTS code TEXT NOT NULL DEFAULT '';

-- Add unique constraint if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'courses_user_id_code_key'
    ) THEN
        ALTER TABLE courses ADD CONSTRAINT courses_user_id_code_key UNIQUE (user_id, code);
    END IF;
END $$;

-- Notify PostgREST to reload schema cache
NOTIFY pgrst, 'reload schema';