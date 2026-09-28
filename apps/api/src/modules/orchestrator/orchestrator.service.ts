// apps/api/src/modules/orchestrator/orchestrator.service.ts
import { Readable } from "node:stream";
import { type Result, err, ok } from "neverthrow";
import type { DagEngine } from "../../core/dag/engine.js";
import { Session } from "../../core/entities/session.js";
import { DomainError } from "../../core/errors/domain-errors.js";
import { type PipelineContext, type PipelineNodes, createPipelineNodes } from "./nodes.js";
import type { SessionState, SessionStateStore } from "./session-state.store.js";

export interface OrchestratorServiceInterface {
  startSession(
    sessionId: string,
    courseId: string,
  ): Promise<Result<{ sessionId: string; status: string }, DomainError>>;
  getSessionStatus(
    sessionId: string,
  ): Promise<Result<{ sessionId: string; status: string; error?: string }, DomainError>>;
  retrySession(
    sessionId: string,
  ): Promise<Result<{ sessionId: string; status: string }, DomainError>>;
}

export function createOrchestratorService(
  sessionStore: SessionStateStore,
  pipelineNodes: PipelineNodes,
  dagEngine: DagEngine<PipelineContext>,
): OrchestratorServiceInterface {
  const startSession = async (
    sessionId: string,
    courseId: string,
  ): Promise<Result<{ sessionId: string; status: string }, DomainError>> => {
    // Check if session already exists
    const existing = await sessionStore.load(sessionId);
    if (existing.isOk()) {
      const session = existing.value;
      if (session.status !== "pending" && session.status !== "failed") {
        return err(DomainError.invalidInput(`Session ${sessionId} already ${session.status}`));
      }
    }

    // Create new session
    const session = Session.create(sessionId, courseId);
    const saveResult = await sessionStore.save(session);
    if (saveResult.isErr()) {
      return err(saveResult.error);
    }

    // Update to processing
    const processingSession = session.startProcessing();
    const saveProcessingResult = await sessionStore.save(processingSession);
    if (saveProcessingResult.isErr()) {
      return err(saveProcessingResult.error);
    }

    // Run pipeline
    const initialContext: PipelineContext = { sessionId, courseId };
    const pipelineResult = await dagEngine.execute(initialContext);

    // Update session with final status
    let finalSession: Session;
    if (pipelineResult.isOk()) {
      finalSession = processingSession.complete();
    } else {
      finalSession = processingSession.fail(pipelineResult.error.message);
    }

    const finalSaveResult = await sessionStore.save(finalSession);
    if (finalSaveResult.isErr()) {
      return err(finalSaveResult.error);
    }

    return ok({ sessionId, status: finalSession.status });
  };

  const getSessionStatus = async (
    sessionId: string,
  ): Promise<Result<{ sessionId: string; status: string; error?: string }, DomainError>> => {
    const result = await sessionStore.load(sessionId);
    if (result.isErr()) {
      return err(result.error);
    }

    const session = result.value;
    const response: { sessionId: string; status: string; error?: string } = {
      sessionId: session.sessionId,
      status: session.status,
    };
    if (session.error !== undefined) {
      response.error = session.error;
    }
    return ok(response);
  };

  const retrySession = async (
    sessionId: string,
  ): Promise<Result<{ sessionId: string; status: string }, DomainError>> => {
    const existing = await sessionStore.load(sessionId);
    if (existing.isErr()) {
      return err(existing.error);
    }

    const session = existing.value;
    if (session.status !== "failed") {
      return err(DomainError.invalidInput(`Cannot retry session with status: ${session.status}`));
    }

    // Reset to pending and start processing
    const resetSession = Session.create(sessionId, session.courseId);
    const saveResult = await sessionStore.save(resetSession);
    if (saveResult.isErr()) {
      return err(saveResult.error);
    }

    const processingSession = resetSession.startProcessing();
    const saveProcessingResult = await sessionStore.save(processingSession);
    if (saveProcessingResult.isErr()) {
      return err(saveProcessingResult.error);
    }

    // Run pipeline
    const initialContext: PipelineContext = { sessionId, courseId: session.courseId };
    const pipelineResult = await dagEngine.execute(initialContext);

    // Update session with final status
    let finalSession: Session;
    if (pipelineResult.isOk()) {
      finalSession = processingSession.complete();
    } else {
      finalSession = processingSession.fail(pipelineResult.error.message);
    }

    const finalSaveResult = await sessionStore.save(finalSession);
    if (finalSaveResult.isErr()) {
      return err(finalSaveResult.error);
    }

    return ok({ sessionId, status: finalSession.status });
  };

  return {
    startSession,
    getSessionStatus,
    retrySession,
  };
}

export class OrchestratorService implements OrchestratorServiceInterface {
  private readonly sessionStore: SessionStateStore;
  private readonly pipelineNodes: PipelineNodes;
  private readonly dagEngine: DagEngine<PipelineContext>;

  constructor(
    sessionStore: SessionStateStore,
    pipelineNodes: PipelineNodes,
    dagEngine: DagEngine<PipelineContext>,
  ) {
    this.sessionStore = sessionStore;
    this.pipelineNodes = pipelineNodes;
    this.dagEngine = dagEngine;
  }

  async startSession(
    sessionId: string,
    courseId: string,
  ): Promise<Result<{ sessionId: string; status: string }, DomainError>> {
    // Check if session already exists
    const existing = await this.sessionStore.load(sessionId);
    if (existing.isOk()) {
      const session = existing.value;
      if (session.status !== "pending" && session.status !== "failed") {
        return err(DomainError.invalidInput(`Session ${sessionId} already ${session.status}`));
      }
    }

    // Create new session
    const session = Session.create(sessionId, courseId);
    const saveResult = await this.sessionStore.save(session);
    if (saveResult.isErr()) {
      return err(saveResult.error);
    }

    // Update to processing
    const processingSession = session.startProcessing();
    const saveProcessingResult = await this.sessionStore.save(processingSession);
    if (saveProcessingResult.isErr()) {
      return err(saveProcessingResult.error);
    }

    // Run pipeline
    const initialContext: PipelineContext = { sessionId, courseId };
    const pipelineResult = await this.dagEngine.execute(initialContext);

    // Update session with final status
    let finalSession: Session;
    if (pipelineResult.isOk()) {
      finalSession = processingSession.complete();
    } else {
      finalSession = processingSession.fail(pipelineResult.error.message);
    }

    const finalSaveResult = await this.sessionStore.save(finalSession);
    if (finalSaveResult.isErr()) {
      return err(finalSaveResult.error);
    }

    return ok({ sessionId, status: finalSession.status });
  }

  async getSessionStatus(
    sessionId: string,
  ): Promise<Result<{ sessionId: string; status: string; error?: string }, DomainError>> {
    const result = await this.sessionStore.load(sessionId);
    if (result.isErr()) {
      return err(result.error);
    }

    const session = result.value;
    const response: { sessionId: string; status: string; error?: string } = {
      sessionId: session.sessionId,
      status: session.status,
    };
    if (session.error !== undefined) {
      response.error = session.error;
    }
    return ok(response);
  }

  async retrySession(
    sessionId: string,
  ): Promise<Result<{ sessionId: string; status: string }, DomainError>> {
    const existing = await this.sessionStore.load(sessionId);
    if (existing.isErr()) {
      return err(existing.error);
    }

    const session = existing.value;
    if (session.status !== "failed") {
      return err(DomainError.invalidInput(`Cannot retry session with status: ${session.status}`));
    }

    // Reset to pending and start processing
    const resetSession = Session.create(sessionId, session.courseId);
    const saveResult = await this.sessionStore.save(resetSession);
    if (saveResult.isErr()) {
      return err(saveResult.error);
    }

    const processingSession = resetSession.startProcessing();
    const saveProcessingResult = await this.sessionStore.save(processingSession);
    if (saveProcessingResult.isErr()) {
      return err(saveProcessingResult.error);
    }

    // Run pipeline
    const initialContext: PipelineContext = { sessionId, courseId: session.courseId };
    const pipelineResult = await this.dagEngine.execute(initialContext);

    // Update session with final status
    let finalSession: Session;
    if (pipelineResult.isOk()) {
      finalSession = processingSession.complete();
    } else {
      finalSession = processingSession.fail(pipelineResult.error.message);
    }

    const finalSaveResult = await this.sessionStore.save(finalSession);
    if (finalSaveResult.isErr()) {
      return err(finalSaveResult.error);
    }

    return ok({ sessionId, status: finalSession.status });
  }
}
