// apps/api/src/core/entities/quiz-item.ts
import type { QuizItemPayload } from "@plks/shared/schemas";

export class QuizItem {
  constructor(
    public readonly quizId: string,
    public readonly courseId: string,
    public readonly type: "multiple_choice" | "true_false" | "short_answer",
    public readonly question: string,
    public readonly options: readonly string[] | undefined,
    public readonly correctAnswer: string,
    public readonly contextReference: string,
  ) {}

  static fromPayload(payload: QuizItemPayload): QuizItem {
    return new QuizItem(
      payload.quizId,
      payload.courseId,
      payload.type,
      payload.question,
      payload.options ? [...payload.options] : undefined,
      payload.correctAnswer,
      payload.contextReference,
    );
  }

  toPayload(): QuizItemPayload {
    return {
      quizId: this.quizId,
      courseId: this.courseId,
      type: this.type,
      question: this.question,
      options: this.options ? [...this.options] : undefined,
      correctAnswer: this.correctAnswer,
      contextReference: this.contextReference,
    };
  }

  checkAnswer(userAnswer: string): boolean {
    return userAnswer.trim().toLowerCase() === this.correctAnswer.trim().toLowerCase();
  }
}
