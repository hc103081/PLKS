import type { IExecutionStateTracker } from "@plks/shared/contracts";
import { DomainError } from "@plks/shared/errors";
import { type SupabaseClient, createClient } from "@supabase/supabase-js";
import { injectable } from "tsyringe";

@injectable()
export class SupabaseExecutionStateTracker<T extends { sessionId: string }>
  implements IExecutionStateTracker<T>
{
  private readonly supabase: SupabaseClient;

  constructor() {
    const supabaseUrl = process.env["VITE_SUPABASE_URL"] ?? process.env["SUPABASE_URL"];
    const supabaseServiceRoleKey = process.env["SUPABASE_SERVICE_ROLE_KEY"];

    if (!supabaseUrl || !supabaseServiceRoleKey) {
      throw new Error(
        "Supabase credentials not configured (SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)",
      );
    }

    this.supabase = createClient(supabaseUrl, supabaseServiceRoleKey);
  }

  private getSessionId(context: T): string {
    return context.sessionId;
  }

  async isNodeExecuted(context: T, nodeName: string): Promise<boolean> {
    try {
      const sessionId = this.getSessionId(context);
      const { data, error } = await this.supabase
        .from("dag_execution_state")
        .select("id")
        .eq("session_id", sessionId)
        .eq("node_name", nodeName)
        .single();

      if (error) {
        // If the error is not found (PGRST116), then the node has not been executed
        if (error.code === "PGRST116") {
          return false;
        }
        throw error;
      }

      // If we got data, then the node has been executed
      return !!data;
    } catch (cause) {
      if (cause instanceof DomainError) {
        throw cause;
      }
      throw new DomainError(
        "EXECUTION_STATE_CHECK_FAILED",
        "Failed to check execution state",
        cause,
      );
    }
  }

  async markNodeExecuted(context: T, nodeName: string): Promise<void> {
    try {
      const sessionId = this.getSessionId(context);
      const { error } = await this.supabase.from("dag_execution_state").upsert(
        {
          session_id: sessionId,
          node_name: nodeName,
          executed_at: new Date().toISOString(),
        },
        { onConflict: "session_id,node_name" },
      );

      if (error) throw error;
    } catch (cause) {
      if (cause instanceof DomainError) {
        throw cause;
      }
      throw new DomainError(
        "EXECUTION_STATE_MARK_FAILED",
        "Failed to mark node as executed",
        cause,
      );
    }
  }

  async clearExecutedState(context: T): Promise<void> {
    try {
      const sessionId = this.getSessionId(context);
      const { error } = await this.supabase
        .from("dag_execution_state")
        .delete()
        .eq("session_id", sessionId);

      if (error) throw error;
    } catch (cause) {
      if (cause instanceof DomainError) {
        throw cause;
      }
      throw new DomainError(
        "EXECUTION_STATE_CLEAR_FAILED",
        "Failed to clear execution state",
        cause,
      );
    }
  }
}
