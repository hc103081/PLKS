// apps/web/src/hooks/useGamification.ts
import { useCallback } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  startGame,
  submitAnswer,
  requestSidekickHelp,
  getGameState,
  getGameSessionState,
} from "../services/api";
import type { GameSession, GameSessionState, QuizItemPayload, SidekickResponse } from "../types/api";

interface UseGamificationOptions {
  courseId?: string | undefined;
  sessionId?: string | undefined;
  autoStart?: boolean;
}

export function useGamification({ courseId, sessionId, autoStart = false }: UseGamificationOptions = {}) {
  const queryClient = useQueryClient();

  // ===== Queries =====

  // Full game session data (quiz items, answers, etc.)
  const gameSessionQuery = useQuery<GameSession>({
    queryKey: ["game-session", sessionId],
    queryFn: () => getGameState(sessionId!),
    enabled: !!sessionId,
    staleTime: 5000,
    refetchInterval: 10000, // Poll for updates
  });

  // Game session state for UI (current quiz index, score, streak, sidekick state)
  const gameSessionStateQuery = useQuery<GameSessionState>({
    queryKey: ["game-session-state", sessionId],
    queryFn: () => getGameSessionState(sessionId!),
    enabled: !!sessionId,
    staleTime: 5000,
    refetchInterval: 10000,
  });

  // Derived current quiz from session data
  const currentQuiz = gameSessionQuery.data
    ? gameSessionQuery.data.quizItems[gameSessionQuery.data.currentIndex] ?? null
    : null;

  // ===== Mutations =====

  // Start new game
  const startGameMutation = useMutation({
    mutationFn: (courseId: string) => startGame(courseId),
    onSuccess: (data) => {
      // Set the game session state in cache
      const initialState: GameSessionState = {
        sessionId: data.sessionId,
        courseId: data.quiz.courseId,
        currentQuizIndex: 0,
        totalQuizzes: 1, // Will be updated when full session loads
        score: 0,
        streak: 0,
        maxStreak: 0,
        xp: 0,
        level: 1,
        answers: [],
        sidekickOpen: false,
        sidekickHistory: [],
        startedAt: new Date().toISOString(),
      };
      queryClient.setQueryData(["game-session-state", data.sessionId], initialState);
      // The full session will be fetched via refetch
    },
  });

  // Submit answer
  const submitAnswerMutation = useMutation({
    mutationFn: ({ sessionId, answer, timeSpentMs }: { sessionId: string; answer: string; timeSpentMs: number }) =>
      submitAnswer({ sessionId, userAnswer: answer, timeSpentMs }),
    onMutate: async ({ sessionId, answer, timeSpentMs }) => {
      await queryClient.cancelQueries({ queryKey: ["game-session-state", sessionId] });
      await queryClient.cancelQueries({ queryKey: ["game-session", sessionId] });

      const previousState = queryClient.getQueryData<GameSessionState>(["game-session-state", sessionId]);
      const previousSession = queryClient.getQueryData<GameSession>(["game-session", sessionId]);

      // Optimistic update - mark as answering
      queryClient.setQueryData<GameSessionState>(["game-session-state", sessionId], (old) => ({
        ...old!,
        // We don't have an isAnswering field in the type, so we'll skip this
      }));

      return { previousState, previousSession };
    },
    onSuccess: (data, variables) => {
      // Update game session state with the result
      queryClient.setQueryData<GameSessionState>(["game-session-state", variables.sessionId], (old) => {
        if (!old) return old;
        return {
          ...old,
          currentQuizIndex: data.session.currentIndex,
          totalQuizzes: data.session.quizItems.length,
          score: data.session.score,
          streak: data.session.streak,
          maxStreak: Math.max(old.maxStreak, data.session.streak),
          xp: data.session.score,
          answers: data.session.answers.map((a) => ({
            quizId: a.quizId,
            userAnswer: a.userAnswer,
            isCorrect: a.isCorrect,
            timeSpentMs: a.timeSpentMs,
            xpEarned: data.isCorrect ? data.xpEarned : 0,
            sidekickUsed: false,
          })),
          sidekickOpen: !data.isCorrect, // Open sidekick if wrong
        };
      });

      // Update full session
      queryClient.setQueryData<GameSession>(["game-session", variables.sessionId], data.session);

      // If there's a next quiz, it will be reflected in currentIndex
    },
    onError: (err, variables, context) => {
      if (context?.previousState) {
        queryClient.setQueryData(["game-session-state", variables.sessionId], context.previousState);
      }
      if (context?.previousSession) {
        queryClient.setQueryData(["game-session", variables.sessionId], context.previousSession);
      }
    },
  });

  // Request Sidekick help
  const requestHelpMutation = useMutation({
    mutationFn: ({ sessionId }: { sessionId: string }) => requestSidekickHelp(sessionId),
    onSuccess: (data, variables) => {
      queryClient.setQueryData<GameSessionState>(["game-session-state", variables.sessionId], (old) => {
        if (!old) return old;
        const newMessage: import("../types/api").SidekickMessage = {
          id: Date.now().toString(),
          role: "assistant",
          content: data.explanation,
          timestamp: new Date().toISOString(),
        };
        if (data.contextReferences && data.contextReferences.length > 0) {
          newMessage.contextReferences = data.contextReferences;
        }
        return {
          ...old,
          sidekickOpen: true,
          sidekickHistory: [...old.sidekickHistory, newMessage],
        };
      });
    },
  });

  // Close Sidekick
  const closeSidekick = useCallback(() => {
    if (!sessionId) return;
    queryClient.setQueryData<GameSessionState>(["game-session-state", sessionId], (old) => {
      if (!old) return old;
      return { ...old, sidekickOpen: false };
    });
  }, [queryClient, sessionId]);

  // Advance to next quiz (after correct answer)
  const advanceQuiz = useCallback(() => {
    if (!sessionId) return;
    queryClient.setQueryData<GameSessionState>(["game-session-state", sessionId], (old) => {
      if (!old) return old;
      return { ...old, sidekickOpen: false };
    });
  }, [queryClient, sessionId]);

  // Dismiss Sidekick (after reading help)
  const dismissSidekick = useCallback(() => {
    if (!sessionId) return;
    queryClient.setQueryData<GameSessionState>(["game-session-state", sessionId], (old) => {
      if (!old) return old;
      return { ...old, sidekickOpen: false };
    });
  }, [queryClient, sessionId]);

  // ===== Actions =====

  const handleStartGame = useCallback(async () => {
    if (!courseId) return;
    await startGameMutation.mutateAsync(courseId);
    // The sessionId will be returned, but we need to update URL - handled by caller
  }, [courseId, startGameMutation]);

  const handleSubmitAnswer = useCallback(
    async (answer: string, timeSpentMs: number) => {
      if (!sessionId) return;
      return submitAnswerMutation.mutateAsync({ sessionId, answer, timeSpentMs });
    },
    [sessionId, submitAnswerMutation]
  );

  const handleRequestHelp = useCallback(async () => {
    if (!sessionId) return;
    return requestHelpMutation.mutateAsync({ sessionId });
  }, [sessionId, requestHelpMutation]);

  // ===== Return =====

  return {
    // State
    gameSession: gameSessionQuery.data,
    gameState: gameSessionStateQuery.data,
    currentQuiz,
    isLoading: gameSessionQuery.isLoading || gameSessionStateQuery.isLoading,
    error: gameSessionQuery.error || gameSessionStateQuery.error,
    isStarting: startGameMutation.isPending,
    isSubmitting: submitAnswerMutation.isPending,
    isRequestingHelp: requestHelpMutation.isPending,

    // Actions
    startGame: handleStartGame,
    submitAnswer: handleSubmitAnswer,
    requestHelp: handleRequestHelp,
    advanceQuiz,
    closeSidekick,
    dismissSidekick,
  };
}