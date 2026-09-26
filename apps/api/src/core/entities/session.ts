// apps/api/src/core/entities/session.ts
export type SessionStatus = 'pending' | 'processing' | 'completed' | 'failed';

export class Session {
  constructor(
    public readonly sessionId: string,
    public readonly courseId: string,
    public readonly status: SessionStatus,
    public readonly createdAt: Date,
    public readonly updatedAt: Date,
    public readonly error?: string
  ) {}

  static create(sessionId: string, courseId: string): Session {
    const now = new Date();
    return new Session(sessionId, courseId, 'pending', now, now);
  }

  startProcessing(): Session {
    return new Session(this.sessionId, this.courseId, 'processing', this.createdAt, new Date());
  }

  complete(): Session {
    return new Session(this.sessionId, this.courseId, 'completed', this.createdAt, new Date());
  }

  fail(error: string): Session {
    return new Session(this.sessionId, this.courseId, 'failed', this.createdAt, new Date(), error);
  }
}