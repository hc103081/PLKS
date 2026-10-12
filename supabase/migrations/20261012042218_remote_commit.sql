drop extension if exists "pg_net";

alter table "public"."courses" alter column "code" set default ''::text;

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.rls_auto_enable()
 RETURNS event_trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog'
AS $function$
DECLARE
  cmd record;
BEGIN
  FOR cmd IN
    SELECT *
    FROM pg_event_trigger_ddl_commands()
    WHERE command_tag IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
      AND object_type IN ('table','partitioned table')
  LOOP
     IF cmd.schema_name IS NOT NULL AND cmd.schema_name IN ('public') AND cmd.schema_name NOT IN ('pg_catalog','information_schema') AND cmd.schema_name NOT LIKE 'pg_toast%' AND cmd.schema_name NOT LIKE 'pg_temp%' THEN
      BEGIN
        EXECUTE format('alter table if exists %s enable row level security', cmd.object_identity);
        RAISE LOG 'rls_auto_enable: enabled RLS on %', cmd.object_identity;
      EXCEPTION
        WHEN OTHERS THEN
          RAISE LOG 'rls_auto_enable: failed to enable RLS on %', cmd.object_identity;
      END;
     ELSE
        RAISE LOG 'rls_auto_enable: skip % (either system schema or not in enforced list: %.)', cmd.object_identity, cmd.schema_name;
     END IF;
  END LOOP;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.trigger_export_to_b2()
 RETURNS void
 LANGUAGE plpgsql
AS $function$
DECLARE
    course_record RECORD;
    response JSONB;
BEGIN
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
        -- Trigger the Edge Function via HTTP (using pg_net if available, or log for manual trigger)
        -- Note: In local development, pg_net may not be available.
        -- The actual HTTP call to Edge Function is typically done via Supabase's pg_net extension
        -- or by an external scheduler. Here we log the course IDs that need export.
        
        -- For now, we insert a marker that can be picked up by an external worker
        -- In production with pg_net, you would do:
        -- SELECT net.http_post(
        --     url := 'http://localhost:54321/functions/v1/export-to-b2',
        --     headers := '{"Content-Type": "application/json", "Authorization": "Bearer ' || current_setting('app.settings.service_role_key') || '"}'::jsonb,
        --     body := jsonb_build_object('course_id', course_record.id)
        -- );
        
        RAISE NOTICE 'Course % needs export to B2 (dir: %)', course_record.id, course_record.b2_export_dir;
    END LOOP;
END;
$function$
;

grant delete on table "public"."answer_logs" to "anon";

grant insert on table "public"."answer_logs" to "anon";

grant select on table "public"."answer_logs" to "anon";

grant update on table "public"."answer_logs" to "anon";

grant delete on table "public"."answer_logs" to "authenticated";

grant update on table "public"."answer_logs" to "authenticated";

grant delete on table "public"."answer_logs" to "service_role";

grant insert on table "public"."answer_logs" to "service_role";

grant select on table "public"."answer_logs" to "service_role";

grant update on table "public"."answer_logs" to "service_role";

grant delete on table "public"."chat_messages" to "anon";

grant insert on table "public"."chat_messages" to "anon";

grant select on table "public"."chat_messages" to "anon";

grant update on table "public"."chat_messages" to "anon";

grant delete on table "public"."chat_messages" to "authenticated";

grant update on table "public"."chat_messages" to "authenticated";

grant delete on table "public"."chat_messages" to "service_role";

grant insert on table "public"."chat_messages" to "service_role";

grant select on table "public"."chat_messages" to "service_role";

grant update on table "public"."chat_messages" to "service_role";

grant delete on table "public"."chat_sessions" to "anon";

grant insert on table "public"."chat_sessions" to "anon";

grant select on table "public"."chat_sessions" to "anon";

grant update on table "public"."chat_sessions" to "anon";

grant delete on table "public"."chat_sessions" to "service_role";

grant insert on table "public"."chat_sessions" to "service_role";

grant select on table "public"."chat_sessions" to "service_role";

grant update on table "public"."chat_sessions" to "service_role";

grant delete on table "public"."concept_nodes" to "anon";

grant insert on table "public"."concept_nodes" to "anon";

grant select on table "public"."concept_nodes" to "anon";

grant update on table "public"."concept_nodes" to "anon";

grant delete on table "public"."concept_nodes" to "service_role";

grant insert on table "public"."concept_nodes" to "service_role";

grant select on table "public"."concept_nodes" to "service_role";

grant update on table "public"."concept_nodes" to "service_role";

grant delete on table "public"."courses" to "anon";

grant insert on table "public"."courses" to "anon";

grant select on table "public"."courses" to "anon";

grant update on table "public"."courses" to "anon";

grant delete on table "public"."courses" to "service_role";

grant insert on table "public"."courses" to "service_role";

grant select on table "public"."courses" to "service_role";

grant update on table "public"."courses" to "service_role";

grant delete on table "public"."export_errors" to "anon";

grant insert on table "public"."export_errors" to "anon";

grant select on table "public"."export_errors" to "anon";

grant update on table "public"."export_errors" to "anon";

grant delete on table "public"."export_errors" to "authenticated";

grant insert on table "public"."export_errors" to "authenticated";

grant update on table "public"."export_errors" to "authenticated";

grant delete on table "public"."export_errors" to "service_role";

grant insert on table "public"."export_errors" to "service_role";

grant select on table "public"."export_errors" to "service_role";

grant update on table "public"."export_errors" to "service_role";

grant delete on table "public"."quiz_items" to "anon";

grant insert on table "public"."quiz_items" to "anon";

grant select on table "public"."quiz_items" to "anon";

grant update on table "public"."quiz_items" to "anon";

grant delete on table "public"."quiz_items" to "service_role";

grant insert on table "public"."quiz_items" to "service_role";

grant select on table "public"."quiz_items" to "service_role";

grant update on table "public"."quiz_items" to "service_role";

grant delete on table "public"."semesters" to "anon";

grant insert on table "public"."semesters" to "anon";

grant select on table "public"."semesters" to "anon";

grant update on table "public"."semesters" to "anon";

grant delete on table "public"."semesters" to "authenticated";

grant insert on table "public"."semesters" to "authenticated";

grant update on table "public"."semesters" to "authenticated";

grant delete on table "public"."semesters" to "service_role";

grant insert on table "public"."semesters" to "service_role";

grant select on table "public"."semesters" to "service_role";

grant update on table "public"."semesters" to "service_role";

grant delete on table "public"."user_progress" to "anon";

grant insert on table "public"."user_progress" to "anon";

grant select on table "public"."user_progress" to "anon";

grant update on table "public"."user_progress" to "anon";

grant delete on table "public"."user_progress" to "service_role";

grant insert on table "public"."user_progress" to "service_role";

grant select on table "public"."user_progress" to "service_role";

grant update on table "public"."user_progress" to "service_role";


