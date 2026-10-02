-- 005_export_errors.sql
-- Additional functions and triggers for export_errors management
-- The export_errors table is created in 001_initial_schema.sql

-- Function to log export error
CREATE OR REPLACE FUNCTION log_export_error(
    p_course_id UUID,
    p_entity_type TEXT,
    p_entity_id UUID,
    p_error_code TEXT,
    p_error_message TEXT,
    p_max_retries INTEGER DEFAULT 3
)
RETURNS UUID
LANGUAGE plpgsql
AS $$
DECLARE
    v_error_id UUID;
BEGIN
    -- Try to insert new error or update existing unresolved error
    INSERT INTO export_errors (
        course_id,
        entity_type,
        entity_id,
        error_code,
        error_message,
        max_retries,
        retry_count,
        last_attempt_at
    ) VALUES (
        p_course_id,
        p_entity_type,
        p_entity_id,
        p_error_code,
        p_error_message,
        p_max_retries,
        1,
        NOW()
    )
    ON CONFLICT (entity_type, entity_id) 
    WHERE resolved_at IS NULL
    DO UPDATE SET
        error_code = EXCLUDED.error_code,
        error_message = EXCLUDED.error_message,
        retry_count = export_errors.retry_count + 1,
        last_attempt_at = NOW(),
        max_retries = GREATEST(export_errors.max_retries, EXCLUDED.max_retries)
    RETURNING id INTO v_error_id;
    
    RETURN v_error_id;
END;
$$;

-- Function to mark export error as resolved
CREATE OR REPLACE FUNCTION resolve_export_error(
    p_entity_type TEXT,
    p_entity_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
BEGIN
    UPDATE export_errors
    SET resolved_at = NOW()
    WHERE entity_type = p_entity_type
    AND entity_id = p_entity_id
    AND resolved_at IS NULL;
    
    RETURN FOUND;
END;
$$;

-- Function to get retryable errors (for manual retry or scheduled retry)
CREATE OR REPLACE FUNCTION get_retryable_export_errors(
    p_limit INTEGER DEFAULT 50
)
RETURNS SETOF export_errors
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT *
    FROM export_errors
    WHERE resolved_at IS NULL
    AND retry_count < max_retries
    AND (
        last_attempt_at IS NULL 
        OR last_attempt_at < NOW() - INTERVAL '1 hour' * (retry_count + 1)
    )
    ORDER BY last_attempt_at ASC NULLS FIRST
    LIMIT p_limit;
END;
$$;

-- Function to increment retry count
CREATE OR REPLACE FUNCTION increment_export_error_retry(
    p_error_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
BEGIN
    UPDATE export_errors
    SET retry_count = retry_count + 1,
        last_attempt_at = NOW()
    WHERE id = p_error_id
    AND resolved_at IS NULL
    AND retry_count < max_retries;
    
    RETURN FOUND;
END;
$$;

-- Grant execute permissions to authenticated role (for Edge Functions)
GRANT EXECUTE ON FUNCTION log_export_error(UUID, TEXT, UUID, TEXT, TEXT, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION resolve_export_error(TEXT, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_retryable_export_errors(INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION increment_export_error_retry(UUID) TO authenticated;