// apps/web/src/pages/QuizPlayer.tsx
import { useEffect, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useGamification } from "../hooks/useGamification.js";
import type { QuizItemPayload } from "../types/api.js";

export function QuizPlayer() {
  const navigate = useNavigate();
  const { courseId } = useParams<{ courseId: string }>();
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get("session");

  const {
    session,
    currentQuiz,
    sidekickResponse,
    isLoading,
    error,
    showSidekick,
    startNewGame,
    handleAnswer,
    requestHelp,
    dismissSidekick,
    resetGame,
    setError,
  } = useGamification();

  const [userAnswer, setUserAnswer] = useState("");
  const [showResult, setShowResult] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (courseId && !session) {
      startNewGame(courseId);
    }
  }, [courseId, session, startNewGame]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userAnswer.trim() || !session) return;

    setIsSubmitting(true);
    await handleAnswer(userAnswer.trim());
    setShowResult(true);
    setIsSubmitting(false);
  };

  const handleContinue = () => {
    setShowResult(false);
    setUserAnswer("");
  };

  const handleSidekickDismiss = () => {
    dismissSidekick();
    setShowResult(false);
  };

  const goBackToCourse = () => {
    navigate(`/course/${courseId}?session=${sessionId}`);
  };

  if (!courseId) {
    return <div className="min-h-screen flex items-center justify-center">未選擇課程</div>;
  }

  if (!session && isLoading) {
    return <div className="min-h-screen flex items-center justify-center">載入測驗中...</div>;
  }

  // Helper to get Chinese label for quiz type
  const getTypeLabel = (type: string): string => {
    switch (type) {
      case "multiple_choice":
        return "多選";
      case "true_false":
        return "是非";
      case "short_answer":
        return "簡答";
      default:
        return type;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <header className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={goBackToCourse} className="text-gray-500 hover:text-gray-700">
              ← 返回課程
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">測驗: {courseId}</h1>
              <p className="text-gray-600 text-sm">
                第 {session?.currentIndex ?? 0 + 1} 題，共 {session?.quizItems.length ?? 0} 題
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-2xl font-bold text-blue-600">{session?.score ?? 0} XP</p>
              <p className="text-xs text-gray-500">分數</p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-orange-600">🔥 {session?.streak ?? 0}</p>
              <p className="text-xs text-gray-500">連續</p>
            </div>
          </div>
        </header>

        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 flex justify-between">
            {error}
            <button onClick={() => setError(null)} className="text-red-500 hover:underline">
              關閉
            </button>
          </div>
        )}

        {/* Sidekick Modal */}
        {showSidekick && sidekickResponse && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
            <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
              <div className="flex items-start justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <span className="text-2xl">🤖</span>
                  小幫手
                </h2>
                <button
                  onClick={handleSidekickDismiss}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-4">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <p className="font-medium text-blue-800 mb-1">{sidekickResponse.keyConcept}</p>
                  <p className="text-blue-700 text-sm">{sidekickResponse.explanation}</p>
                </div>

                <div className="bg-yellow-50 p-4 rounded-lg border-l-4 border-yellow-400">
                  <p className="font-medium text-yellow-800 mb-1">💡 提示</p>
                  <p className="text-yellow-700 text-sm">{sidekickResponse.actionableHint}</p>
                </div>

                {sidekickResponse.relatedSlideUris.length > 0 && (
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="font-medium text-gray-800 mb-2">📎 相關投影片</p>
                    <ul className="space-y-1">
                      {sidekickResponse.relatedSlideUris.map((uri, i) => (
                        <li
                          key={i}
                          className="text-sm text-blue-600 hover:underline cursor-pointer"
                        >
                          投影片 {i + 1}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <p className="text-green-700 text-sm italic text-center">
                  {sidekickResponse.encouragement}
                </p>
              </div>

              <button
                onClick={handleSidekickDismiss}
                className="mt-6 w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
              >
                了解，讓我再試一次！
              </button>
            </div>
          </div>
        )}

        {/* Quiz Question */}
        {!showSidekick && currentQuiz && (
          <div className="bg-white rounded-xl shadow p-8">
            <div className="mb-6">
              <span
                className={
                  "inline-block px-3 py-1 text-xs font-medium rounded-full " +
                  (currentQuiz.type === "multiple_choice"
                    ? "bg-blue-100 text-blue-800"
                    : currentQuiz.type === "true_false"
                      ? "bg-green-100 text-green-800"
                      : "bg-purple-100 text-purple-800")
                }
              >
                {getTypeLabel(currentQuiz.type)}
              </span>
            </div>

            <h2 className="text-xl font-semibold text-gray-900 mb-6">{currentQuiz.question}</h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              {currentQuiz.type === "multiple_choice" && currentQuiz.options && (
                <div className="space-y-2">
                  {currentQuiz.options.map((option, index) => (
                    <label
                      key={index}
                      className={`flex items-center gap-3 p-4 rounded-lg border-2 cursor-pointer transition ${
                        userAnswer === option
                          ? "border-blue-500 bg-blue-50"
                          : "border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      <input
                        type="radio"
                        name="answer"
                        value={option}
                        checked={userAnswer === option}
                        onChange={() => setUserAnswer(option)}
                        className="w-5 h-5 text-blue-600 border-gray-300 focus:ring-blue-500"
                      />
                      <span className="text-gray-700">{option}</span>
                    </label>
                  ))}
                </div>
              )}

              {currentQuiz.type === "true_false" && (
                <div className="space-y-2">
                  {["True", "False"].map((option) => (
                    <label
                      key={option}
                      className={`flex items-center gap-3 p-4 rounded-lg border-2 cursor-pointer transition ${
                        userAnswer === option
                          ? "border-blue-500 bg-blue-50"
                          : "border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      <input
                        type="radio"
                        name="answer"
                        value={option}
                        checked={userAnswer === option}
                        onChange={() => setUserAnswer(option)}
                        className="w-5 h-5 text-blue-600 border-gray-300 focus:ring-blue-500"
                      />
                      <span className="text-gray-700 capitalize">{option.toLowerCase()}</span>
                    </label>
                  ))}
                </div>
              )}

              {currentQuiz.type === "short_answer" && (
                <div>
                  <textarea
                    value={userAnswer}
                    onChange={(e) => setUserAnswer(e.target.value)}
                    placeholder="在這裡輸入您的答案..."
                    rows={4}
                    className="w-full p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    disabled={isSubmitting}
                  />
                </div>
              )}

              <button
                type="submit"
                disabled={!userAnswer.trim() || isSubmitting}
                className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition font-medium"
              >
                {isSubmitting ? "提交中..." : "提交答案"}
              </button>
            </form>
          </div>
        )}

        {/* Result Feedback */}
        {!showSidekick && showResult && session && (
          <div className="mt-6 bg-white rounded-xl shadow p-6">
            <div className="flex items-center gap-3 mb-4">
              <div
                className={
                  "w-12 h-12 rounded-full flex items-center justify-center " +
                  (session.answers[session.answers.length - 1]?.isCorrect
                    ? "bg-green-100 text-green-600"
                    : "bg-red-100 text-red-600")
                }
              >
                {session.answers[session.answers.length - 1]?.isCorrect ? (
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                ) : (
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                )}
              </div>
              <div>
                <h3
                  className={
                    "font-semibold " +
                    (session.answers[session.answers.length - 1]?.isCorrect
                      ? "text-green-800"
                      : "text-red-800")
                  }
                >
                  {session.answers[session.answers.length - 1]?.isCorrect ? "正確！" : "不太正確"}
                </h3>
                <p className="text-gray-600 text-sm">
                  正確答案是：{" "}
                  <strong>{session.quizItems[session.currentIndex - 1]?.correctAnswer}</strong>
                </p>
              </div>
            </div>

            {!session.answers[session.answers.length - 1]?.isCorrect && (
              <button
                onClick={requestHelp}
                className="w-full px-6 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition"
              >
                向小幫手尋求幫助 🤖
              </button>
            )}

            {session.answers[session.answers.length - 1]?.isCorrect && (
              <button
                onClick={handleContinue}
                className="w-full px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
              >
                下一題
              </button>
            )}
          </div>
        )}

        {/* Game Completed */}
        {!currentQuiz && session && session.state === "COMPLETED" && (
          <div className="bg-white rounded-xl shadow p-8 text-center">
            <div className="w-20 h-20 mx-auto mb-4 bg-green-100 rounded-full flex items-center justify-center">
              <svg
                className="w-10 h-10 text-green-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">測驗完成！🎉</h2>
            <p className="text-gray-600 mb-6">做得很好，完成所有問題！</p>
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-2xl font-bold text-blue-600">{session.score}</p>
                <p className="text-sm text-gray-500">總經驗值</p>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-2xl font-bold text-orange-600">🔥 {session.streak}</p>
                <p className="text-sm text-gray-500">最大連續</p>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-2xl font-bold text-green-600">
                  {session.answers.filter((a) => a.isCorrect).length} / {session.answers.length}
                </p>
                <p className="text-sm text-gray-500">正確</p>
              </div>
            </div>
            <button
              onClick={() => navigate(`/course/${courseId}?session=${sessionId}`)}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
            >
              返回課程
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
