// apps/web/src/pages/SidekickChat.tsx
import { useCallback, useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { atomDark } from "react-syntax-highlighter/dist/cjs/styles/prism";
import rehypeHighlight from "rehype-highlight";
import remarkGfm from "remark-gfm";
import { useAuth } from "../context/AuthContext";
import { useGamification } from "../hooks/useGamification";
import { toast } from "sonner";
import type { ContextReference } from "../types/api";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  isStreaming?: boolean;
  contextReferences?: ContextReference[] | undefined;
}

interface SidekickStreamEvent {
  type: "delta" | "done" | "error";
  content?: string;
  error?: string;
}

export function SidekickChat() {
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const { courseId } = useParams<{ courseId: string }>();
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get("session");

  const { gameState, currentQuiz, dismissSidekick, isRequestingHelp } = useGamification({
    courseId: courseId ?? undefined,
    sessionId: sessionId ?? undefined,
  });

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const eventSourceRef = useRef<EventSource | null>(null);
  const assistantMessageRef = useRef<string>("");

  // Sync with sidekick history from game state
  useEffect(() => {
    if (gameState?.sidekickHistory) {
      const historyMessages: ChatMessage[] = gameState.sidekickHistory.map((msg) => ({
        role: msg.role,
        content: msg.content,
        timestamp: new Date(msg.timestamp),
        contextReferences: msg.contextReferences,
      }));
      setMessages(historyMessages);
    }
  }, [gameState?.sidekickHistory]);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [scrollToBottom]);

  // Cleanup EventSource on unmount
  useEffect(() => {
    return () => {
      eventSourceRef.current?.close();
    };
  }, []);

  const handleSend = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !sessionId || isStreaming) return;

    const userMessage = input.trim();
    setInput("");
    setIsStreaming(true);
    assistantMessageRef.current = "";

    // Add user message immediately (optimistic update)
    const newUserMessage: ChatMessage = {
      role: "user",
      content: userMessage,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, newUserMessage]);

    // Build SSE URL with query parameters
    const params = new URLSearchParams({ sessionId, question: userMessage });
    const sseUrl = `${import.meta.env.VITE_API_BASE_URL ?? "http://localhost:3000"}/api/gamification/sidekick/stream?${params}`;

    const es = new EventSource(sseUrl, { withCredentials: true });
    eventSourceRef.current = es;

    es.onmessage = (event) => {
      try {
        const data: SidekickStreamEvent = JSON.parse(event.data);

        if (data.type === "delta" && data.content) {
          assistantMessageRef.current += data.content;
          setMessages((prev) => {
            const last = prev[prev.length - 1];
            if (last?.role === "assistant") {
              return [...prev.slice(0, -1), { ...last, content: assistantMessageRef.current }];
            }
            return [...prev, { role: "assistant", content: assistantMessageRef.current, timestamp: new Date() }];
          });
        } else if (data.type === "done") {
          es.close();
          eventSourceRef.current = null;
          setIsStreaming(false);
          // The sidekickHistory will be synced via the gameState query
        } else if (data.type === "error") {
          es.close();
          eventSourceRef.current = null;
          setIsStreaming(false);
          toast.error(data.error ?? "串流發生錯誤");
        }
      } catch {
        // Ignore parsing errors
      }
    };

    es.onerror = () => {
      if (es.readyState === EventSource.CLOSED) return;
      es.close();
      eventSourceRef.current = null;
      setIsStreaming(false);
      toast.error("連線失敗，請重試");
    };
  }, [sessionId, isStreaming]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend(e as any);
    }
  };

  const goBackToCourse = () => {
    navigate(`/course/${courseId}?session=${sessionId}`);
  };

  const handleDismissSidekick = () => {
    dismissSidekick();
    navigate(`/course/${courseId}?session=${sessionId}&tab=game`);
  };

  const renderMarkdown = (content: string) => (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      rehypePlugins={[[rehypeHighlight, { ignoreMissing: true }]]}
      components={{
        code: ({ node, children, ...props }) => {
          if (!node) return <code {...(props as Record<string, unknown>)}>{String(children)}</code>;
          const className = (node.properties?.className as string[])?.find((c) => c.startsWith("language-"));
          const language = className?.replace("language-", "") || "plaintext";

          return (
            <SyntaxHighlighter
              language={language}
              style={atomDark}
              showLineNumbers
              wrapLines
              {...(props as Record<string, unknown>)}
            >
              {String(children)}
            </SyntaxHighlighter>
          );
        },
        pre: ({ children, ...props }) => (
          <div className="bg-gray-900 rounded-lg p-4 overflow-x-auto my-2" {...(props as Record<string, unknown>)}>{children}</div>
        ),
      }}
    >
      {content}
    </ReactMarkdown>
  );

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-white border-b border-gray-200 px-6 py-4 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button type="button" onClick={goBackToCourse} className="text-gray-500 hover:text-gray-700">
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
            {gameState && (
              <div className="text-right hidden sm:block">
                <p className="text-sm font-medium text-gray-900">{gameState.score} XP</p>
                <p className="text-xs text-gray-500">🔥 {gameState.streak} 連續</p>
              </div>
            )}
            <button type="button" onClick={() => signOut()} className="text-sm text-gray-500 hover:text-gray-700 px-3 py-1 rounded hover:bg-gray-100">
              登出
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-3xl mx-auto w-full p-6 flex flex-col">
        {/* Context Reference Panel (when available) */}
        {messages.some((m) => m.contextReferences && m.contextReferences.length > 0) && (
          <div className="mb-4 p-3 bg-blue-50 border border-blue-100 rounded-lg">
            <div className="flex items-center gap-2 text-blue-800 font-medium mb-2">
              <span className="material-symbols-outlined text-base">source</span>
              <span>參考上下文</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {messages
                .filter((m) => m.contextReferences)
                .flatMap((m) => m.contextReferences ?? [])
                .map((ref, idx) => (
                  <div key={`${ref.type}-${ref.title}-${idx}`} className="px-2 py-1 bg-white border border-blue-200 rounded text-xs text-blue-700">
                    <span className="font-medium">[{ref.type}]</span> {ref.title}
                    {ref.source && <span className="ml-1 text-gray-400">({ref.source})</span>}
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* Current Quiz Context */}
        {currentQuiz && !gameState?.sidekickOpen && (
          <div className="mb-4 p-3 bg-yellow-50 border border-yellow-100 rounded-lg">
            <div className="flex items-center gap-2 text-yellow-800 font-medium mb-2">
              <span className="material-symbols-outlined text-base">quiz</span>
              <span>當前測驗題目</span>
            </div>
            <p className="text-yellow-700 text-sm">{currentQuiz.question}</p>
            <button
              onClick={() => navigate(`/course/${courseId}?session=${sessionId}&tab=game`)}
              className="mt-2 text-xs text-yellow-600 hover:underline"
            >
              前往測驗頁面作答 →
            </button>
          </div>
        )}

        {/* Chat Messages */}
        <div className="flex-1 overflow-y-auto space-y-4 mb-6" role="log" aria-live="polite">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-gray-500">
              <svg
                className="w-16 h-16 mb-4 text-gray-300"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-label="歡迎來到小幫手"
                role="img"
              >
                <title>歡迎來到小幫手</title>
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                />
              </svg>
              <p className="text-lg font-medium">歡迎來到小幫手！</p>
              <p className="text-sm mt-1">輸入問題開始對話，或點擊下方建議</p>
              <p className="text-xs mt-2">我可以幫助澄清概念，解釋錯誤答案，並指導您的學習。</p>
            </div>
          )}

          {messages.map((msg, index) => (
            <div
              key={`${msg.role}-${msg.timestamp.toISOString()}-${index}`}
              className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[80%] rounded-2xl p-4 ${
                  msg.role === "user"
                    ? "bg-blue-600 text-white rounded-br-none"
                    : "bg-white text-gray-900 rounded-bl-none shadow-sm border border-gray-100"
                }`}
              >
                {msg.role === "assistant" ? (
                  renderMarkdown(msg.content)
                ) : (
                  <p className="whitespace-pre-wrap">{msg.content}</p>
                )}
                <p
                  className={`text-xs mt-2 ${msg.role === "user" ? "text-blue-100" : "text-gray-400"} flex items-center gap-1`}
                >
                  <span className="material-symbols-outlined text-[12px]">schedule</span>
                  {msg.timestamp.toLocaleTimeString()}
                  {msg.isStreaming && (
                    <span className="material-symbols-outlined text-[12px] animate-pulse">sync</span>
                  )}
                </p>
              </div>
            </div>
          ))}

          {isStreaming && messages.length === 0 && (
            <div className="flex justify-start">
              <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 rounded-bl-none">
                <div className="flex items-center gap-2 text-gray-500 text-sm">
                  <span className="material-symbols-outlined animate-spin">sync</span>
                  <span>小幫手正在思考中...</span>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <form onSubmit={handleSend} className="space-y-3">
            <div className="flex gap-3">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="詢問小幫手問題... (Shift+Enter 換行)"
                rows={1}
                className="flex-1 bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-400 rounded-lg px-4 py-2 resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={isStreaming}
                aria-label="聊天輸入"
              />
              <button
                type="submit"
                disabled={!input.trim() || isStreaming}
                className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-2 rounded-lg transition-colors flex items-center gap-2"
              >
                {isStreaming ? (
                  <>
                    <span className="material-symbols-outlined animate-spin">sync</span>
                    串流中...
                  </>
                ) : (
                  "發送"
                )}
              </button>
            </div>

            {/* Suggested questions */}
            <div className="flex flex-wrap gap-2">
              {[
                "詳細解釋這個概念",
                "給我解題提示",
                "用生活例子類比",
                "相關知識點有哪些",
                "為什麼我會答錯",
              ].map((suggestion, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setInput(suggestion)}
                  disabled={isStreaming}
                  className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1 rounded-full transition-colors"
                >
                  {suggestion}
                </button>
              ))}
            </div>
            <p className="text-xs text-gray-500 text-center">
              小幫手僅了解當前測驗題目、相關概念和參考投影片。
            </p>
          </form>
        </div>
        </main>
      </div>
    );
  }