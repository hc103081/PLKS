/** Tracker for node execution state (e.g., to persist to Supabase) */
export interface IExecutionStateTracker<T extends Record<string, unknown>> {
  /** Check if a node has been executed successfully for a given context (identified by sessionId) */
  isNodeExecuted(context: T, nodeName: string): Promise<boolean>;
  /** Mark a node as executed successfully for a given context */
  markNodeExecuted(context: T, nodeName: string): Promise<void>;
  /** Clear execution state for a given context */
  clearExecutedState(context: T): Promise<void>;
}
