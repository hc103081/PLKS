// apps/web/src/types/api.ts
/** Shared API types synced from @plks/shared/schemas */

export interface RawAssetPayload {
  sessionId: string;
  courseId: string;
  transcripts: Array<{
    start_time: string;
    end_time: string;
    text: string;
  }>;
  visualAssets: Array<{
    page_num: number;
    b2_uri: string;
  }>;
}

export interface ConceptNodePayload {
  conceptId: string;
  courseId: string;
  term: string;
  explanation: string;
  relatedTerms: string[];
  sourceEvidence: {
    transcriptRef: string;
    slideUri: string;
  };
}

export interface QuizItemPayload {
  quizId: string;
  courseId: string;
  type: "multiple_choice" | "true_false" | "short_answer";
  question: string;
  options?: string[];
  correctAnswer: string;
  contextReference: string;
}

export interface UserConfigPayload {
  sessionId: string;
  fusionLevel: "strict_alignment" | "high_level_summary";
  outputTemplates: Array<"knowledge_nodes" | "flashcard_quiz">;
  b2TargetDir: string;
}

export interface AiExtractionResult {
  conceptNodes: ConceptNodePayload[];
  quizItems: QuizItemPayload[];
}

// API Request/Response types
export interface StartSessionRequest {
  sessionId: string;
  courseId: string;
}

export interface StartSessionResponse {
  sessionId: string;
  status: string;
}

export interface SessionStatusResponse {
  sessionId: string;
  status: string;
  error?: string;
}

export interface IngestFileResponse {
  sessionId: string;
  courseId: string;
  status: string;
  message: string;
}

export interface StartGameResponse {
  sessionId: string;
  quiz: QuizItemPayload;
}

export interface SubmitAnswerRequest {
  sessionId: string;
  userAnswer: string;
  timeSpentMs: number;
}

export interface SubmitAnswerResponse {
  session: GameSession;
  isCorrect: boolean;
  xpEarned: number;
  nextQuiz?: QuizItemPayload;
}

export interface SidekickRequest {
  sessionId: string;
}

export interface SidekickResponse {
  explanation: string;
  keyConcept: string;
  actionableHint: string;
  encouragement: string;
  relatedSlideUris: string[];
  contextReferences?: ContextReference[];
}

export interface ContextReference {
  type: "concept" | "slide" | "quiz";
  title: string;
  content: string;
  source?: string;
}

/** Game Session State - used by TabGame for local UI state */
export interface GameSessionState {
  sessionId: string;
  courseId: string;
  currentQuizIndex: number;
  totalQuizzes: number;
  score: number;
  streak: number;
  maxStreak: number;
  xp: number;
  level: number;
  answers: GameAnswer[];
  sidekickOpen: boolean;
  sidekickHistory: SidekickMessage[];
  startedAt: string;
  completedAt?: string;
}

/** Game Answer */
export interface GameAnswer {
  quizId: string;
  userAnswer: string;
  isCorrect: boolean;
  timeSpentMs: number;
  xpEarned: number;
  sidekickUsed: boolean;
}

/** Sidekick Message */
export interface SidekickMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
  relatedConceptIds?: string[];
  relatedSlideUris?: string[];
  isStreaming?: boolean;
}

export interface GameSession {
  sessionId: string;
  courseId: string;
  state: "INITIALIZE" | "PLAYING" | "SIDEKICK_HELP" | "COMPLETED";
  quizItems: QuizItemPayload[];
  currentIndex: number;
  score: number;
  streak: number;
  answers: Array<{
    quizId: string;
    userAnswer: string;
    isCorrect: boolean;
    timeSpentMs: number;
  }>;
  createdAt: string;
  updatedAt: string;
}

// Alias for QuizItemPayload for backward compatibility
export type QuizItem = QuizItemPayload;
