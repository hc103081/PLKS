-- 003_realtime_publication.sql
-- Enable Realtime for user_progress and chat_messages tables
-- This allows frontend to subscribe to real-time updates

-- Add tables to supabase_realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE user_progress;
ALTER PUBLICATION supabase_realtime ADD TABLE chat_messages;

-- Verify publication contents
-- SELECT * FROM pg_publication_tables WHERE pubname = 'supabase_realtime';