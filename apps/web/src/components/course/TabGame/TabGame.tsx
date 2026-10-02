import React from "react";
import type {
  GameAnswer,
  GameSession,
  GameSessionState,
  QuizItem,
  QuizItemPayload,
  SidekickMessage,
} from "../../../types/api";
import { LoadingSkeleton } from "../../shared";

interface TabGameProps {
  course: CourseCardData | undefined;
  gameState: GameSessionState | undefined;
  gameSession: GameSession | undefined;
  _sessionId: string | undefined;
  isLoading: boolean;
  sidekickOpen: boolean;
  onSidekickToggle: () => void;
}

export function TabGame({
  course,
  gameState,
  gameSession,
  sessionId,
  isLoading,
  sidekickOpen,
  onSidekickToggle,
}: TabGameProps) {
  if (isLoading || !gameState) {
    return (
      <div className="p-8">
        <div className="max-w-6xl mx-auto animate-pulse">
          <div
            className="grid grid-cols-1 lg:grid-cols-4 gap-6"
            style={{ gridTemplateColumns: "1fr 360px" }}
          >
            <LoadingSkeleton variant="card" height={700} />
            <LoadingSkeleton variant="card" height={700} />
          </div>
        </div>
      </div>
    );
  }

  const progress =
    gameState.totalQuizzes > 0 ? (gameState.currentQuizIndex / gameState.totalQuizzes) * 100 : 0;

  const currentQuiz =
    gameState.currentQuizIndex < (gameSession?.quizItems?.length || 0)
      ? gameSession?.quizItems?.[gameState.currentQuizIndex]
      : null;

  return (
    <div className="h-[calc(100vh-200px)] max-w-[1440px] mx-auto p-4 lg:p-6">
      <div
        className="grid gap-4 h-full"
        style={{ gridTemplateColumns: sidekickOpen ? "1fr 360px" : "1fr" }}
      >
        {/* Main: Quiz Player */}
        <GameQuizPlayer
          course={course}
          gameState={gameState}
          currentQuiz={currentQuiz}
          progress={progress}
          gameSession={gameSession}
          onAnswerSubmit={handleAnswerSubmit}
          onSidekickClick={onSidekickToggle}
        />

        {/* Sidebar: Sidekick */}
        {sidekickOpen && (
          <GameSidekickSidebar
            gameState={gameState}
            currentQuiz={currentQuiz}
            onClose={onSidekickToggle}
            onSendMessage={handleSidekickMessage}
          />
        )}
      </div>
    </div>
  );
}

function handleAnswerSubmit(answer: string, isCorrect: boolean) {
  // TODO: Implement answer submission
  console.log("Answer submitted:", answer, isCorrect);
}

function handleSidekickMessage(message: string) {
  // TODO: Implement sidekick message
  console.log("Sidekick message:", message);
}

// Game Quiz Player Component
function GameQuizPlayer({
  course,
  gameState,
  currentQuiz,
  progress,
  gameSession,
  onAnswerSubmit,
  onSidekickClick,
}: {
  course: any;
  gameState: GameSessionState;
  currentQuiz: any;
  progress: number;
  gameSession: GameSession | undefined;
  onAnswerSubmit: (answer: string, isCorrect: boolean) => void;
  onSidekickClick: () => void;
}) {
  const [userAnswer, setUserAnswer] = React.useState("");
  const [showFeedback, setShowFeedback] = React.useState(false);
  const [isCorrect, setIsCorrect] = React.useState(false);

  const handleSubmit = () => {
    if (!userAnswer.trim()) return;
    const correct =
      currentQuiz?.correctAnswer?.toLowerCase().trim() === userAnswer.toLowerCase().trim();
    setIsCorrect(correct);
    setShowFeedback(true);
    onAnswerSubmit(userAnswer, correct);
  };

  const handleNext = () => {
    setUserAnswer("");
    setShowFeedback(false);
    // TODO: Navigate to next quiz
  };

  return (
    <div className="card-base flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-outline flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="relative w-12 h-12">
            <svg className="w-full h-full -rotate-90">
              <circle
                className="stroke-outline"
                cx="18"
                cy="18"
                fill="none"
                r="15"
                strokeWidth="3"
              />
              <circle
                className="stroke-primary"
                cx="18"
                cy="18"
                fill="none"
                r="15"
                strokeDasharray="94.2"
                strokeDashoffset={94.2 * (1 - progress / 100)}
                strokeLinecap="round"
                strokeWidth="3"
              />
            </svg>
            <span className="absolute inset-0 flex items-center justify-center font-headline-sm font-bold text-on-surface">
              {Math.round(progress)}%
            </span>
          </div>
          <div>
            <p className="font-body-sm text-on-surface-variant">
              第 {gameState.currentQuizIndex + 1} / {gameState.totalQuizzes} 題
            </p>
            <p className="font-headline-sm font-bold text-on-surface">
              XP: {gameState.score} | Streak: {gameState.streak}
            </p>
          </div>
        </div>
        <button onClick={onSidekickClick} className="btn-primary" disabled={showFeedback}>
          <span className="material-symbols-outlined text-[18px]">psychology</span>
          <span>呼叫 Sidekick</span>
        </button>
      </div>

      {/* Quiz Content */}
      <div className="flex-1 flex flex-col p-6 overflow-y-auto">
        {currentQuiz ? (
          <div className="flex-1 flex flex-col justify-center max-w-2xl mx-auto w-full">
            {/* Question Type Badge */}
            <div className="mb-4 flex items-center gap-2">
              <span className="px-3 py-1 rounded-full bg-surface-variant text-on-surface-variant font-label-code-sm">
                {currentQuiz.type === "multiple_choice"
                  ? "選擇題"
                  : currentQuiz.type === "true_false"
                    ? "是非題"
                    : "簡答題"}
              </span>
              {currentQuiz.difficulty && (
                <span className="px-2 py-1 rounded bg-amber-500/20 text-amber-500 font-label-code-sm">
                  難度 {currentQuiz.difficulty}
                </span>
              )}
            </div>

            {/* Question */}
            <div className="mb-6 p-4 bg-surface-container-low rounded-lg border border-outline">
              <p className="font-headline-sm text-on-surface">{currentQuiz.question}</p>
            </div>

            {/* Answer Input */}
            {!showFeedback && (
              <div className="mb-6">
                {currentQuiz.type === "multiple_choice" && currentQuiz.options ? (
                  <div className="space-y-2" role="radiogroup" aria-label="選擇答案">
                    {currentQuiz.options.map((option: string, index: number) => (
                      <label
                        key={index}
                        className={`
                          flex items-center gap-3 p-4 rounded-lg border cursor-pointer transition-all
                          ${userAnswer === option ? "border-primary bg-primary/5" : "border-outline hover:border-primary/50"}
                        `}
                      >
                        <input
                          type="radio"
                          name="answer"
                          value={option}
                          checked={userAnswer === option}
                          onChange={() => setUserAnswer(option)}
                          className="w-4 h-4 accent-primary"
                        />
                        <span className="font-body-md text-on-surface flex-1">{option}</span>
                      </label>
                    ))}
                  </div>
                ) : currentQuiz.type === "true_false" ? (
                  <div className="flex gap-4" role="radiogroup" aria-label="選擇答案">
                    {["True", "False"].map((opt) => (
                      <label
                        key={opt}
                        className={`
                          flex-1 flex items-center justify-center gap-2 p-4 rounded-lg border cursor-pointer transition-all
                          ${userAnswer === opt ? "border-primary bg-primary/5" : "border-outline hover:border-primary/50"}
                        `}
                      >
                        <input
                          type="radio"
                          name="answer"
                          value={opt}
                          checked={userAnswer === opt}
                          onChange={() => setUserAnswer(opt)}
                          className="w-4 h-4 accent-primary"
                        />
                        <span className="font-body-md text-on-surface">
                          {opt === "True" ? "正確" : "錯誤"}
                        </span>
                      </label>
                    ))}
                  </div>
                ) : (
                  <textarea
                    value={userAnswer}
                    onChange={(e) => setUserAnswer(e.target.value)}
                    rows={4}
                    className="w-full p-4 rounded-lg border border-outline bg-surface-container-low font-body-md text-on-surface focus:outline-none focus:border-primary"
                    placeholder="輸入你的答案..."
                  />
                )}
              </div>
            )}

            {/* Submit / Next Button */}
            <div className="flex gap-3">
              {!showFeedback ? (
                <button
                  onClick={handleSubmit}
                  disabled={!userAnswer.trim()}
                  className="btn-primary flex-1"
                >
                  <span className="material-symbols-outlined text-[18px]">send</span>
                  提交答案
                </button>
              ) : (
                <>
                  <div className="flex-1" />
                  <button onClick={handleNext} className="btn-primary">
                    <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                    下一題
                  </button>
                </>
              )}
            </div>

            {/* Feedback */}
            {showFeedback && (
              <div
                className={`
                mt-6 p-4 rounded-lg border
                ${isCorrect ? "bg-tertiary/10 border-tertiary/30" : "bg-error/10 border-error/30"}
              `}
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`
                    w-10 h-10 rounded-full flex items-center justify-center
                    ${isCorrect ? "bg-tertiary text-white" : "bg-error text-white"}
                  `}
                  >
                    <span className="material-symbols-outlined text-[24px]">
                      {isCorrect ? "check_circle" : "cancel"}
                    </span>
                  </span>
                  <div>
                    <p className="font-body-md font-bold text-on-surface">
                      {isCorrect ? "答對了！太棒了！" : "答錯了，繼續加油！"}
                    </p>
                    <p className="font-body-sm text-on-surface-variant mt-1">
                      正確答案：{currentQuiz.correctAnswer}
                    </p>
                  </div>
                </div>
                {currentQuiz.contextReference && (
                  <div className="mt-3 p-3 bg-surface-container-low rounded border border-outline">
                    <p className="font-label-code-sm text-on-surface-variant">相關概念參考</p>
                    <p className="font-body-sm text-on-surface mt-1">
                      {currentQuiz.contextReference}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Quick Navigation */}
            <div className="mt-6 pt-4 border-t border-outline">
              <p className="font-label-code-sm font-bold text-on-surface-variant mb-2">快速跳轉</p>
              <div className="flex flex-wrap gap-1">
                {gameSession?.sessionId && (
                  <div>
                    {gameSession.quizItems?.map((_item: QuizItemPayload, index: number) => (
                      <button
                        key={index}
                        className={`
                          w-8 h-8 rounded border font-label-code-sm transition-all
                          ${
                            index === gameState.currentQuizIndex
                              ? "bg-primary border-primary text-white"
                              : index < gameState.currentQuizIndex
                                ? "bg-tertiary/20 border-tertiary text-tertiary"
                                : "border-outline text-on-surface-variant hover:border-primary/50"
                          }
                        `}
                        disabled={index > gameState.currentQuizIndex}
                      >
                        {index + 1}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center text-center">
            <div>
              <span className="material-symbols-outlined text-[48px] text-on-surface-variant mb-4 block">
                emoji_events
              </span>
              <h3 className="font-headline-md font-bold text-on-surface mb-2">測驗完成！</h3>
              <p className="font-body-md text-on-surface-variant mb-6">
                最終分數：{gameState.score} XP | 最高連續：{gameState.maxStreak}
              </p>
              <button className="btn-primary" onClick={() => {}}>
                <span className="material-symbols-outlined text-[18px]">replay</span>
                重新挑戰
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Game Sidekick Sidebar Component
function GameSidekickSidebar({
  gameState,
  currentQuiz,
  onClose,
  onSendMessage,
}: {
  gameState: GameSessionState;
  currentQuiz: any;
  onClose: () => void;
  onSendMessage: (message: string) => void;
}) {
  const [message, setMessage] = React.useState("");
  const [messages, setMessages] = React.useState<SidekickMessage[]>([
    {
      id: "1",
      role: "assistant",
      content: `嗨！我是你的學習夥伴 Sidekick 🎓\n\n目前題目：${currentQuiz?.question || "載入中..."}\n\n有什麼我可以幫忙的嗎？你可以問我：\n• 這個概念的詳細解釋\n• 相關的投影片頁面\n• 解題提示或關鍵字\n• 錯誤分析與改進建議`,
      timestamp: new Date().toISOString(),
    },
    ...(gameState.sidekickHistory || []),
  ]);

  const handleSend = () => {
    if (!message.trim()) return;
    const newMessage: SidekickMessage = {
      id: Date.now().toString(),
      role: "user",
      content: message,
      timestamp: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, newMessage]);
    onSendMessage(message);
    setMessage("");
  };

  return (
    <div className="card-base flex flex-col h-full animate-in slide-in-right">
      {/* Header */}
      <div className="p-4 border-b border-outline flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
            <span className="material-symbols-outlined text-primary text-[20px]">psychology</span>
          </div>
          <h4 className="font-title-md font-bold text-on-surface">Sidekick</h4>
        </div>
        <button onClick={onClose} className="btn-ghost p-2">
          <span className="material-symbols-outlined text-[20px]">close</span>
        </button>
      </div>

      {/* Chat History */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : ""}`}
          >
            <div
              className={`
              w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0
              ${msg.role === "user" ? "bg-primary text-white" : "bg-surface-variant text-primary"}
            `}
            >
              <span className="material-symbols-outlined text-[18px]">
                {msg.role === "user" ? "person" : "psychology"}
              </span>
            </div>
            <div
              className={`
              max-w-[80%] p-3 rounded-2xl
              ${msg.role === "user" ? "bg-primary text-white rounded-br-none" : "bg-surface-container-low border border-outline rounded-bl-none"}
            `}
            >
              <p className="font-body-sm text-on-surface whitespace-pre-wrap">{msg.content}</p>
              <span className="font-label-code-xs text-on-surface-variant/70 mt-1 block text-right">
                {new Date(msg.timestamp).toLocaleTimeString()}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      {currentQuiz && (
        <div className="p-4 border-t border-outline space-y-2">
          <p className="font-label-code-sm font-bold text-on-surface-variant">快速提問</p>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => onSendMessage("請詳細解釋這個概念")}
              className="btn-secondary text-xs py-2"
            >
              <span className="material-symbols-outlined text-[14px]">lightbulb</span>
              概念解釋
            </button>
            <button
              onClick={() => onSendMessage("給我一些解題提示")}
              className="btn-secondary text-xs py-2"
            >
              <span className="material-symbols-outlined text-[14px]">tips_and_updates</span>
              解題提示
            </button>
            <button
              onClick={() => onSendMessage("哪張投影片有相關內容？")}
              className="btn-secondary text-xs py-2"
            >
              <span className="material-symbols-outlined text-[14px]">picture_as_pdf</span>
              參考投影片
            </button>
            <button
              onClick={() => onSendMessage("為什麼這個答案是錯的？")}
              className="btn-secondary text-xs py-2"
            >
              <span className="material-symbols-outlined text-[14px]">error</span>
              錯誤分析
            </button>
          </div>
        </div>
      )}

      {/* Input */}
      <div className="p-4 border-t border-outline">
        <div className="flex gap-2">
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            placeholder="輸入問題..."
            className="flex-1 input-base"
          />
          <button onClick={handleSend} disabled={!message.trim()} className="btn-primary">
            <span className="material-symbols-outlined text-[20px]">send</span>
          </button>
        </div>
      </div>
    </div>
  );
}
