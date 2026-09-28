// apps/web/src/pages/SidekickChat.tsx
import { useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useGamification } from "../hooks/useGamification.js";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

export function SidekickChat() {
  const navigate = useNavigate();
  const { courseId } = useParams<{ courseId: string }>();
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get("session");

  const { session, sidekickResponse, showSidekick, requestHelp, dismissSidekick } =
    useGamification();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Sync with sidekick response from game
  if (showSidekick && sidekickResponse) {
    setMessages((prev) => {
      const lastMsg = prev[prev.length - 1];
      if (
        lastMsg &&
        lastMsg.role === "assistant" &&
        lastMsg.content === sidekickResponse.explanation
      ) {
        return prev;
      }
      return [
        ...prev,
        {
          role: "assistant",
          content: sidekickResponse.explanation,
          timestamp: new Date(),
        },
      ];
    });
  }

  const handleSend = async () => {
    if (!input.trim() || !sessionId) return;

    const userMessage = input.trim();
    setInput("");
    setIsLoading(true);

    // Add user message
    setMessages((prev) => [...prev, { role: "user", content: userMessage, timestamp: new Date() }]);

    try {
      // Request help from Sidekick
      await requestHelp();
    } catch (err) {
      console.error("Failed to get Sidekick response:", err);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "抱歉，我無法處理該請求。請再試一次。",
          timestamp: new Date(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const goBackToCourse = () => {
    navigate(`/course/${courseId}?session=${sessionId}`);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={goBackToCourse} className="text-gray-500 hover:text-gray-700">
              ← 返回課程
            </button>
            <div>
              <h1 className="text-xl font-bold text-gray-900">小幫手聊天</h1>
              <p className="text-gray-500 text-sm">
                課程: {courseId} | 會話: {sessionId?.slice(0, 8)}...
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {session && (
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900">{session.score} XP</p>
                <p className="text-xs text-gray-500">🔥 {session.streak} 連續</p>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-3xl mx-auto w-full p-6 flex flex-col">
        {/* Chat Messages */}
        <div className="flex-1 overflow-y-auto space-y-4 mb-6">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-gray-500">
              <svg
                className="w-16 h-16 mb-4 text-gray-300"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                />
              </svg>
              <p className="text-lg font-medium">歡迎來到小幫手！</p>
              <p className="text-sm mt-1">隨時詢問我有關課程材料的任何問題。</p>
              <p className="text-xs mt-2">我可以幫助澄清概念，解釋錯誤答案，並指導您的學習。</p>
            </div>
          )}

          {messages.map((msg, index) => (
            <div
              key={index}
              className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[70%] rounded-2xl p-4 ${
                  msg.role === "user"
                    ? "bg-blue-600 text-white rounded-br-none"
                    : "bg-white text-gray-900 rounded-bl-none shadow-sm border border-gray-100"
                }`}
              >
                <p className="whitespace-pre-wrap">{msg.content}</p>
                <p
                  className={`text-xs mt-2 ${msg.role === "user" ? "text-blue-100" : "text-gray-400"} `}
                >
                  {msg.timestamp.toLocaleTimeString()}
                </p>
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2"></div>
              </div>
            </div>
          )}
        </div>

        {/* Input Area */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <div className="flex gap-3">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="詢問小幫手問題... (Shift+Enter 換行)"
              rows={2}
              className="flex-1 px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              disabled={isLoading}
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || isLoading}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition font-medium"
            >
              {isLoading ? "發送中..." : "發送"}
            </button>
          </div>
          <p className="text-xs text-gray-500 mt-2 text-center">
            小幫手僅了解當前測驗題目、相關概念和參考投影片。
          </p>
        </div>
      </main>
    </div>
  );
}
