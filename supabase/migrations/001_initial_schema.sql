-- 001_initial_schema.sql
-- Complete database schema for PLKS (Personal Learning Knowledge System)
-- Tables: semesters, courses, concept_nodes, quiz_items, user_progress, answer_logs, chat_sessions, chat_messages, export_errors

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";  -- provides gen_random_uuid()
-- pgvector may not be available in local Supabase; create conditionally
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_available_extensions WHERE name = 'pgvector') THEN
        CREATE EXTENSION IF NOT EXISTS "pgvector";
    ELSE
        RAISE NOTICE 'pgvector extension not available in pg_available_extensions, skipping';
    END IF;
END $$;
CREATE EXTENSION IF NOT EXISTS "pg_cron";

-- ============================================================
-- semesters 學期表
-- ============================================================
CREATE TABLE semesters (
    code TEXT PRIMARY KEY,           -- e.g., '103-1'
    year INTEGER NOT NULL,           -- 103, 104, etc.
    term INTEGER NOT NULL,           -- 1 (上學期), 2 (下學期)
    label TEXT NOT NULL,             -- '大一上', '大一下', etc.
    sort_order INTEGER NOT NULL,     -- 1-8 for ordering
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- courses 課程表
-- ============================================================
CREATE TABLE courses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    semester_code TEXT NOT NULL REFERENCES semesters(code),
    code TEXT NOT NULL,              -- 課程代碼 (如 CS101)
    name TEXT NOT NULL,              -- 課程名稱
    description TEXT,                -- 課程描述
    cover_image_uri TEXT,            -- B2 URI for cover image
    b2_export_dir TEXT,              -- B2 導出目錄路徑 (s3://bucket/path)
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived', 'deleted')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (user_id, code)
);

-- Indexes for courses
CREATE INDEX idx_courses_user_id ON courses(user_id);
CREATE INDEX idx_courses_semester_code ON courses(semester_code);
CREATE INDEX idx_courses_user_semester ON courses(user_id, semester_code);

-- ============================================================
-- concept_nodes 概念節點表
-- ============================================================
CREATE TABLE concept_nodes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    concept_id UUID NOT NULL DEFAULT gen_random_uuid() UNIQUE,  -- Business UUID for Obsidian linking
    term TEXT NOT NULL,                -- 概念術語
    explanation TEXT NOT NULL,         -- 解釋內容 (Markdown)
    related_terms TEXT[] DEFAULT '{}', -- 相關術語陣列
    source_transcript_ref TEXT,        -- 逐字稿引用 (時間戳或段落 ID)
    source_slide_uri TEXT,             -- 來源投影片 B2 URI
    b2_markdown_uri TEXT,              -- 導出後的 Markdown B2 URI
    b2_json_uri TEXT,                  -- 導出後的 JSON B2 URI
    exported_at TIMESTAMPTZ,           -- 導出時間
    -- embedding vector(1536) added conditionally if pgvector is available
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for concept_nodes
CREATE INDEX idx_concept_nodes_course_id ON concept_nodes(course_id);
CREATE INDEX idx_concept_nodes_concept_id ON concept_nodes(concept_id);
CREATE INDEX idx_concept_nodes_exported_at ON concept_nodes(exported_at) WHERE exported_at IS NULL;
CREATE INDEX idx_concept_nodes_term ON concept_nodes USING GIN (to_tsvector('english', term));

-- Conditionally add embedding column and index if pgvector is available
DO $$
DECLARE
    has_pgvector BOOLEAN;
BEGIN
    SELECT EXISTS (SELECT 1 FROM pg_available_extensions WHERE name = 'pgvector' AND installed_version IS NOT NULL)
    INTO has_pgvector;
    
    IF has_pgvector THEN
        EXECUTE 'ALTER TABLE concept_nodes ADD COLUMN IF NOT EXISTS embedding vector(1536)';
        EXECUTE 'CREATE INDEX IF NOT EXISTS idx_concept_nodes_embedding ON concept_nodes USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100)';
    ELSE
        RAISE NOTICE 'pgvector extension not installed, skipping embedding column and index';
    END IF;
END $$;

-- ============================================================
-- quiz_items 題庫表
-- ============================================================
CREATE TABLE quiz_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    quiz_id UUID NOT NULL DEFAULT gen_random_uuid() UNIQUE,  -- Business UUID
    type TEXT NOT NULL CHECK (type IN ('multiple_choice', 'true_false', 'short_answer')),
    question TEXT NOT NULL,            -- 題目
    options TEXT[],                    -- 選項 (multiple_choice 時使用)
    correct_answer TEXT NOT NULL,      -- 正確答案
    explanation TEXT,                  -- 解析
    context_reference UUID NOT NULL,   -- 關聯 concept_nodes.concept_id
    difficulty INTEGER DEFAULT 1 CHECK (difficulty BETWEEN 1 AND 5),
    b2_json_uri TEXT,                  -- 導出後的 JSON B2 URI
    exported_at TIMESTAMPTZ,           -- 導出時間
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for quiz_items
CREATE INDEX idx_quiz_items_course_id ON quiz_items(course_id);
CREATE INDEX idx_quiz_items_quiz_id ON quiz_items(quiz_id);
CREATE INDEX idx_quiz_items_context_reference ON quiz_items(context_reference);
CREATE INDEX idx_quiz_items_exported_at ON quiz_items(exported_at) WHERE exported_at IS NULL;

-- ============================================================
-- user_progress 使用者學習進度表 (SRS)
-- ============================================================
CREATE TABLE user_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    concept_id UUID NOT NULL REFERENCES concept_nodes(concept_id) ON DELETE CASCADE,
    ease_factor REAL NOT NULL DEFAULT 2.5,    -- SM-2 ease factor
    interval_days INTEGER NOT NULL DEFAULT 0,  -- 當前間隔天數
    repetitions INTEGER NOT NULL DEFAULT 0,    -- 重複次數
    due_date DATE NOT NULL DEFAULT CURRENT_DATE, -- 下次複習日期
    last_reviewed_at TIMESTAMPTZ,              -- 最後複習時間
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (user_id, concept_id)
);

-- Indexes for user_progress
CREATE INDEX idx_user_progress_user_id ON user_progress(user_id);
CREATE INDEX idx_user_progress_course_id ON user_progress(course_id);
CREATE INDEX idx_user_progress_due_date ON user_progress(due_date);
CREATE INDEX idx_user_progress_user_due ON user_progress(user_id, due_date);

-- ============================================================
-- answer_logs 答題記錄表
-- ============================================================
CREATE TABLE answer_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    quiz_id UUID NOT NULL REFERENCES quiz_items(quiz_id) ON DELETE CASCADE,
    user_answer TEXT NOT NULL,         -- 使用者作答
    is_correct BOOLEAN NOT NULL,       -- 是否正確
    response_time_ms INTEGER,          -- 反應時間 (毫秒)
    sidekick_used BOOLEAN DEFAULT FALSE, -- 是否使用 Sidekick
    sidekick_context JSONB,            -- Sidekick 提供的上下文
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for answer_logs
CREATE INDEX idx_answer_logs_user_id ON answer_logs(user_id);
CREATE INDEX idx_answer_logs_course_id ON answer_logs(course_id);
CREATE INDEX idx_answer_logs_quiz_id ON answer_logs(quiz_id);
CREATE INDEX idx_answer_logs_created_at ON answer_logs(created_at DESC);

-- ============================================================
-- chat_sessions 聊天會話表
-- ============================================================
CREATE TABLE chat_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    quiz_id UUID REFERENCES quiz_items(quiz_id) ON DELETE SET NULL, -- 關聯題目 (Sidekick 情境)
    title TEXT,                        -- 會話標題
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'closed')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for chat_sessions
CREATE INDEX idx_chat_sessions_user_id ON chat_sessions(user_id);
CREATE INDEX idx_chat_sessions_course_id ON chat_sessions(course_id);
CREATE INDEX idx_chat_sessions_quiz_id ON chat_sessions(quiz_id);

-- ============================================================
-- chat_messages 聊天訊息表
-- ============================================================
CREATE TABLE chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
    content TEXT NOT NULL,             -- 訊息內容 (Markdown)
    metadata JSONB,                    -- 額外資料 (引用概念、圖片等)
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for chat_messages
CREATE INDEX idx_chat_messages_session_id ON chat_messages(session_id);
CREATE INDEX idx_chat_messages_created_at ON chat_messages(created_at);

-- ============================================================
-- export_errors 導出錯誤表
-- ============================================================
CREATE TABLE export_errors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    entity_type TEXT NOT NULL CHECK (entity_type IN ('concept_node', 'quiz_item', 'course_index')),
    entity_id UUID NOT NULL,           -- concept_id 或 quiz_id
    error_code TEXT NOT NULL,          -- 錯誤代碼
    error_message TEXT NOT NULL,       -- 錯誤訊息
    retry_count INTEGER NOT NULL DEFAULT 0,
    max_retries INTEGER NOT NULL DEFAULT 3,
    last_attempt_at TIMESTAMPTZ,       -- 最後嘗試時間
    resolved_at TIMESTAMPTZ,           -- 解決時間
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for export_errors
CREATE INDEX idx_export_errors_course_id ON export_errors(course_id);
CREATE INDEX idx_export_errors_entity ON export_errors(entity_type, entity_id);
CREATE INDEX idx_export_errors_unresolved ON export_errors(resolved_at) WHERE resolved_at IS NULL;
CREATE INDEX idx_export_errors_retry ON export_errors(retry_count, last_attempt_at) WHERE resolved_at IS NULL;

-- ============================================================
-- Updated_at trigger function
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers
CREATE TRIGGER update_courses_updated_at BEFORE UPDATE ON courses FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_concept_nodes_updated_at BEFORE UPDATE ON concept_nodes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_quiz_items_updated_at BEFORE UPDATE ON quiz_items FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_user_progress_updated_at BEFORE UPDATE ON user_progress FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_chat_sessions_updated_at BEFORE UPDATE ON chat_sessions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();