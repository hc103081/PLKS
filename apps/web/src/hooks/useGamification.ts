// apps/web/src/hooks/useGamification.ts
import { useCallback, useState } from "react";
import { getGameState, requestSidekickHelp, startGame, submitAnswer } from "../services/api.js";
import { useGameStore } from "../store/gameStore.js";
import type { GameSession, QuizItemPayload, SidekickResponse } from "../types/api.js";

export function useGamification() {
  const {
    session,
    currentQuiz,
    sidekickResponse,
    isLoading,
    error,
    showSidekick,
    setSession,
    setCurrentQuiz,
    setSidekickResponse,
    setLoading,
    setError,
    setShowSidekick,
    resetGame,
    advanceQuiz,
    addAnswer,
  } = useGameStore();

  const [lastSubmitTime, setLastSubmitTime] = useState<number>(Date.now());

  const startNewGame = useCallback(
    async (courseId: string) => {
      setLoading(true);
      setError(null);
      try {
        const result = await startGame(courseId);
        setSession({
          sessionId: result.sessionId,
          courseId,
          state: "PLAYING",
          quizItems: [result.quiz], // Will be updated with full list from session
          currentIndex: 0,
          score: 0,
          streak: 0,
          answers: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
        setCurrentQuiz(result.quiz);
        setLastSubmitTime(Date.now());
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to start game");
      } finally {
        setLoading(false);
      }
    },
    [setLoading, setError, setSession, setCurrentQuiz],
  );

  const handleAnswer = useCallback(
    async (userAnswer: string) => {
      if (!session) return;

      setLoading(true);
      setError(null);
      const startTime = Date.now();

      try {
        const result = await submitAnswer({
          sessionId: session.sessionId,
          userAnswer,
          timeSpentMs: startTime - lastSubmitTime,
        });

        addAnswer({
          quizId: result.session.quizItems[result.session.currentIndex - 1]?.quizId ?? "",
          userAnswer,
          isCorrect: result.isCorrect,
          timeSpentMs: startTime - lastSubmitTime,
        });

        if (result.isCorrect) {
          // Advance to next quiz
          if (result.nextQuiz) {
            advanceQuiz();
            setCurrentQuiz(result.nextQuiz);
          } else {
            // Game completed
            setSession(result.session);
            setCurrentQuiz(null);
          }
        } else {
          // Show Sidekick help
          setSession(result.session);
          setShowSidekick(true);
        }

        setLastSubmitTime(startTime);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to submit answer");
      } finally {
        setLoading(false);
      }
    },
    [
      session,
      setLoading,
      setError,
      addAnswer,
      advanceQuiz,
      setCurrentQuiz,
      setSession,
      setShowSidekick,
      lastSubmitTime,
    ],
  );

  const requestHelp = useCallback(async () => {
    if (!session) return;

    setLoading(true);
    setError(null);
    try {
      const result = await requestSidekickHelp(session.sessionId);
      setSidekickResponse(result);
      // After help, resume game
      setSession({ ...session, state: "PLAYING" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to get help");
    } finally {
      setLoading(false);
    }
  }, [session, setLoading, setError, setSidekickResponse, setSession]);

  const dismissSidekick = useCallback(() => {
    setSidekickResponse(null);
    setShowSidekick(false);
  }, [setSidekickResponse, setShowSidekick]);

  const refreshGameState = useCallback(async () => {
    if (!session) return;
    try {
      const freshState = await getGameState(session.sessionId);
      setSession(freshState);
      setCurrentQuiz(freshState.quizItems[freshState.currentIndex] ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to refresh game state");
    }
  }, [session, setSession, setCurrentQuiz, setError]);

  return {
    // State
    session,
    currentQuiz,
    sidekickResponse,
    isLoading,
    error,
    showSidekick,

    // Actions
    startNewGame,
    handleAnswer,
    requestHelp,
    dismissSidekick,
    refreshGameState,
    resetGame,
    setError,
  };
}
