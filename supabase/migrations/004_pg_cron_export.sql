-- 004_pg_cron_export.sql
-- Schedule pg_cron job to trigger export-to-b2 Edge Function every 5 minutes
-- This runs as a database-level scheduled task

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Create a function to trigger the export-to-b2 Edge Function
-- This function will be called by pg_cron
CREATE OR REPLACE FUNCTION trigger_export_to_b2()
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
    course_record RECORD;
    response JSONB;
    v_access_token TEXT;
BEGIN
    -- Get the service role key for authenticating with the Edge Function
    -- In Supabase, we can use the current setting if it's been set, or we can fetch from a secret
    -- For simplicity, we'll assume the service role key is available via a custom setting
    -- Alternatively, we can hardcode for development, but better to get from secrets
    -- Since we cannot directly access secrets in SQL, we'll rely on the fact that
    -- the Edge Function may not require authentication if called internally? 
    -- Actually, Edge Functions by default require the service role key or a valid JWT.
    -- We'll use the service role key that we can set via `supabase secrets set` 
    -- and retrieve via current_setting if we have set it as a custom setting.
    -- We'll set a custom setting `app.settings.service_role_key` via supabase CLI.
    -- For now, we'll try to get it from current_setting, and if not found, we'll skip.
    v_access_token := current_setting('app.settings.service_role_key', true);
    
    -- Get all active courses that have unexported content
    FOR course_record IN
        SELECT DISTINCT c.id, c.b2_export_dir
        FROM courses c
        WHERE c.status = 'active'
        AND (
            -- Has unexported concept nodes
            EXISTS (
                SELECT 1 FROM concept_nodes cn
                WHERE cn.course_id = c.id
                AND cn.exported_at IS NULL
            )
            OR
            -- Has unexported quiz items
            EXISTS (
                SELECT 1 FROM quiz_items qi
                WHERE qi.course_id = c.id
                AND qi.exported_at IS NULL
            )
        )
    LOOP
        -- Trigger the Edge Function via HTTP using pg_net
        PERFORM net.http_post(
            url := 'http://localhost:54321/functions/v1/export-to-b2',
            headers := jsonb_build_object(
                'Content-Type', 'application/json',
                'Authorization', 'Bearer ' || v_access_token
            )::jsonb,
            body := jsonb_build_object('course_id', course_record.id)
        );
    END LOOP;
EXCEPTION
    WHEN OTHERS THEN
        -- Log the error but continue processing other courses
        RAISE NOTICE 'Failed to trigger export for course %: %', course_record.id, SQLERRM;
END;
$$;

-- Schedule the cron job to run every 5 minutes
-- This will execute the trigger function which calls the Edge Function for each course needing export
SELECT cron.schedule(
    'export-to-b2-every-5-minutes',
    '*/5 * * * *',  -- Every 5 minutes
    'SELECT trigger_export_to_b2();'
);

-- View scheduled jobs
-- SELECT * FROM cron.job;