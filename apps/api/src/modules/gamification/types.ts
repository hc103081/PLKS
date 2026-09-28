// apps/api/src/modules/gamification/types.ts
import type { QuizItemPayload } from "@plks/shared/schemas";
import type { ConceptNodePayload } from "@plks/shared/schemas";

export type GameState = "INITIALIZE" | "PLAYING" | "SIDEKICK_HELP" | "COMPLETED";

export interface SidekickContext {
  currentQuizIndex: number;
  quizItems: QuizItemPayload[];
  conceptNodes: Map<string, ConceptNodePayload>;
  score: number;
  streak: number;
  sessionId: string;
  courseId: string;
}

export interface QuizAnswer {
  quizId: string;
  userAnswer: string;
  isCorrect: boolean;
  timeSpentMs: number;
}

export interface SidekickResponse {
  explanation: string;
  keyConcept: string;
  actionableHint: string;
  encouragement: string;
  relatedSlideUris: string[];
}

export interface GameSession {
  sessionId: string;
  courseId: string;
  state: GameState;
  quizItems: QuizItemPayload[];
  currentIndex: number;
  score: number;
  streak: number;
  answers: QuizAnswer[];
  createdAt: Date;
  updatedAt: Date;
}

export interface GamificationConfig {
  maxStreakBonus: number;
  baseXpPerCorrect: number;
  streakXpMultiplier: number;
}
