-- 002_rls_policies.sql
-- Row Level Security policies for PLKS
-- All policies enforce: users can only access their own data
-- Edge Functions with Service Role Key bypass RLS

-- ============================================================
-- Enable RLS on all tables
-- ============================================================
ALTER TABLE semesters ENABLE ROW LEVEL SECURITY;
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE concept_nodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE answer_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE export_errors ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- semesters: Public read (all authenticated users can see semesters)
-- ============================================================
CREATE POLICY "semesters_select_all" ON semesters
    FOR SELECT TO authenticated
    USING (true);

-- ============================================================
-- courses: Users can only access their own courses
-- ============================================================
CREATE POLICY "courses_select_own" ON courses
    FOR SELECT TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "courses_insert_own" ON courses
    FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "courses_update_own" ON courses
    FOR UPDATE TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "courses_delete_own" ON courses
    FOR DELETE TO authenticated
    USING (auth.uid() = user_id);

-- ============================================================
-- concept_nodes: Users can access concept nodes of their own courses
-- ============================================================
CREATE POLICY "concept_nodes_select_own" ON concept_nodes
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM courses
            WHERE courses.id = concept_nodes.course_id
            AND courses.user_id = auth.uid()
        )
    );

CREATE POLICY "concept_nodes_insert_own" ON concept_nodes
    FOR INSERT TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM courses
            WHERE courses.id = concept_nodes.course_id
            AND courses.user_id = auth.uid()
        )
    );

CREATE POLICY "concept_nodes_update_own" ON concept_nodes
    FOR UPDATE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM courses
            WHERE courses.id = concept_nodes.course_id
            AND courses.user_id = auth.uid()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM courses
            WHERE courses.id = concept_nodes.course_id
            AND courses.user_id = auth.uid()
        )
    );

CREATE POLICY "concept_nodes_delete_own" ON concept_nodes
    FOR DELETE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM courses
            WHERE courses.id = concept_nodes.course_id
            AND courses.user_id = auth.uid()
        )
    );

-- ============================================================
-- quiz_items: Users can access quiz items of their own courses
-- ============================================================
CREATE POLICY "quiz_items_select_own" ON quiz_items
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM courses
            WHERE courses.id = quiz_items.course_id
            AND courses.user_id = auth.uid()
        )
    );

CREATE POLICY "quiz_items_insert_own" ON quiz_items
    FOR INSERT TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM courses
            WHERE courses.id = quiz_items.course_id
            AND courses.user_id = auth.uid()
        )
    );

CREATE POLICY "quiz_items_update_own" ON quiz_items
    FOR UPDATE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM courses
            WHERE courses.id = quiz_items.course_id
            AND courses.user_id = auth.uid()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM courses
            WHERE courses.id = quiz_items.course_id
            AND courses.user_id = auth.uid()
        )
    );

CREATE POLICY "quiz_items_delete_own" ON quiz_items
    FOR DELETE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM courses
            WHERE courses.id = quiz_items.course_id
            AND courses.user_id = auth.uid()
        )
    );

-- ============================================================
-- user_progress: Users can only access their own progress
-- ============================================================
CREATE POLICY "user_progress_select_own" ON user_progress
    FOR SELECT TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "user_progress_insert_own" ON user_progress
    FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "user_progress_update_own" ON user_progress
    FOR UPDATE TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "user_progress_delete_own" ON user_progress
    FOR DELETE TO authenticated
    USING (auth.uid() = user_id);

-- ============================================================
-- answer_logs: Users can only access their own answer logs
-- ============================================================
CREATE POLICY "answer_logs_select_own" ON answer_logs
    FOR SELECT TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "answer_logs_insert_own" ON answer_logs
    FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = user_id);

-- Note: answer_logs should not be updated/deleted by users (immutable log)
-- Only Edge Functions with Service Role Key can modify

-- ============================================================
-- chat_sessions: Users can only access their own chat sessions
-- ============================================================
CREATE POLICY "chat_sessions_select_own" ON chat_sessions
    FOR SELECT TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "chat_sessions_insert_own" ON chat_sessions
    FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "chat_sessions_update_own" ON chat_sessions
    FOR UPDATE TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "chat_sessions_delete_own" ON chat_sessions
    FOR DELETE TO authenticated
    USING (auth.uid() = user_id);

-- ============================================================
-- chat_messages: Users can only access messages in their own sessions
-- ============================================================
CREATE POLICY "chat_messages_select_own" ON chat_messages
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM chat_sessions
            WHERE chat_sessions.id = chat_messages.session_id
            AND chat_sessions.user_id = auth.uid()
        )
    );

CREATE POLICY "chat_messages_insert_own" ON chat_messages
    FOR INSERT TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM chat_sessions
            WHERE chat_sessions.id = chat_messages.session_id
            AND chat_sessions.user_id = auth.uid()
        )
    );

-- Note: chat_messages should not be updated/deleted by users (immutable log)
-- Only Edge Functions with Service Role Key can modify

-- ============================================================
-- export_errors: Users can view export errors for their own courses
-- Edge Functions (Service Role) manage insert/update/delete
-- ============================================================
CREATE POLICY "export_errors_select_own" ON export_errors
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM courses
            WHERE courses.id = export_errors.course_id
            AND courses.user_id = auth.uid()
        )
    );

-- ============================================================
-- Grant permissions to authenticated role
-- ============================================================
GRANT SELECT, INSERT, UPDATE, DELETE ON courses TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON concept_nodes TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON quiz_items TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON user_progress TO authenticated;
GRANT SELECT, INSERT ON answer_logs TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON chat_sessions TO authenticated;
GRANT SELECT, INSERT ON chat_messages TO authenticated;
GRANT SELECT ON export_errors TO authenticated;
GRANT SELECT ON semesters TO authenticated;

-- Grant usage on sequences (for uuid_generate_v4)
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;