// apps/web/src/store/gameStore.ts
import { create } from "zustand";
import type { GameSession, QuizItemPayload, SidekickResponse } from "../types/api.js";

interface GameState {
  // Current game session
  session: GameSession | null;
  currentQuiz: QuizItemPayload | null;
  sidekickResponse: SidekickResponse | null;

  // UI state
  isLoading: boolean;
  error: string | null;
  showSidekick: boolean;

  // Actions
  setSession: (session: GameSession | null) => void;
  setCurrentQuiz: (quiz: QuizItemPayload | null) => void;
  setSidekickResponse: (response: SidekickResponse | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setShowSidekick: (show: boolean) => void;
  resetGame: () => void;
  advanceQuiz: () => void;
  addAnswer: (answer: {
    quizId: string;
    userAnswer: string;
    isCorrect: boolean;
    timeSpentMs: number;
  }) => void;
}

export const useGameStore = create<GameState>((set) => ({
  session: null,
  currentQuiz: null,
  sidekickResponse: null,
  isLoading: false,
  error: null,
  showSidekick: false,

  setSession: (session) =>
    set({ session, currentQuiz: session?.quizItems[session.currentIndex] ?? null }),
  setCurrentQuiz: (quiz) => set({ currentQuiz: quiz }),
  setSidekickResponse: (response) => set({ sidekickResponse: response, showSidekick: !!response }),
  setLoading: (loading) => set({ isLoading: loading }),
  setError: (error) => set({ error }),
  setShowSidekick: (show) => set({ showSidekick: show }),

  resetGame: () =>
    set({
      session: null,
      currentQuiz: null,
      sidekickResponse: null,
      isLoading: false,
      error: null,
      showSidekick: false,
    }),

  advanceQuiz: () =>
    set((state) => {
      if (!state.session) return state;
      const nextIndex = state.session.currentIndex;
      return {
        session: {
          ...state.session,
          currentIndex: nextIndex,
        },
        currentQuiz: state.session.quizItems[nextIndex] ?? null,
      };
    }),

  addAnswer: (answer) =>
    set((state) => {
      if (!state.session) return state;
      return {
        session: {
          ...state.session,
          answers: [...state.session.answers, answer],
        },
      };
    }),
}));
