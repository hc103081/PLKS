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
import type { ContextReference } from "../types/api";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  isStreaming?: boolean;
  contextReferences?: ContextReference[] | undefined;
}

export function SidekickChat() {
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const { courseId } = useParams<{ courseId: string }>();
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get("session");

  const { session, sidekickResponse, showSidekick, requestHelp } = useGamification();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Sync with sidekick response from game
  useEffect(() => {
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
            contextReferences: sidekickResponse.contextReferences,
          },
        ];
      });
    }
  }, [showSidekick, sidekickResponse]);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [scrollToBottom]);

  const handleSend = async () => {
    if (!input.trim() || !sessionId) return;

    const userMessage = input.trim();
    setInput("");
    setIsStreaming(true);
    setStreamingContent("");

    // Add user message
    setMessages((prev) => [...prev, { role: "user", content: userMessage, timestamp: new Date() }]);

    try {
      // Simulate streaming response
      // In a real implementation, this would connect to a streaming API
      await requestHelp();

      // For now, we'll show the response from sidekickResponse
      // The sidekickResponse will be added via the useEffect above
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
      setIsStreaming(false);
      setStreamingContent("");
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

  const renderMarkdown = (content: string) => (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      rehypePlugins={[[rehypeHighlight, { ignoreMissing: true }]]}
      components={{
        code: ({ node, children, ...props }) => {
          if (!node) return <code {...(props as Record<string, unknown>)}>{String(children)}</code>;
          const className = (node.properties?.className as string[])?.find((c) =>
            c.startsWith("language-"),
          );
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
          <div
            className="bg-gray-900 rounded-lg p-4 overflow-x-auto my-2"
            {...(props as Record<string, unknown>)}
          >
            {children}
          </div>
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
            <button
              type="button"
              onClick={goBackToCourse}
              className="text-gray-500 hover:text-gray-700"
            >
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
              <div className="text-right hidden sm:block">
                <p className="text-sm font-medium text-gray-900">{session.score} XP</p>
                <p className="text-xs text-gray-500">🔥 {session.streak} 連續</p>
              </div>
            )}
            <button
              type="button"
              onClick={() => signOut()}
              className="text-sm text-gray-500 hover:text-gray-700 px-3 py-1 rounded hover:bg-gray-100"
            >
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
                  <div
                    key={`${ref.type}-${ref.title}-${idx}`}
                    className="px-2 py-1 bg-white border border-blue-200 rounded text-xs text-blue-700"
                  >
                    <span className="font-medium">[{ref.type}]</span> {ref.title}
                    {ref.source && <span className="ml-1 text-gray-400">({ref.source})</span>}
                  </div>
                ))}
            </div>
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
              <p className="text-sm mt-1">隨時詢問我有關課程材料的任何問題。</p>
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
                    <span className="material-symbols-outlined text-[12px] animate-pulse">
                      sync
                    </span>
                  )}
                </p>
              </div>
            </div>
          ))}

          {isStreaming && (
            <div className="flex justify-start">
              <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 rounded-bl-none">
                <div className="flex items-center gap-2 text-gray-500 text-sm">
                  <span className="material-symbols-outlined animate-spin">sync</span>
                  <span>小幫手正在思考中...</span>
                </div>
                {streamingContent && <div className="mt-2">{renderMarkdown(streamingContent)}</div>}
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
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
              disabled={isStreaming}
              aria-label="聊天輸入"
            />
            <button
              type="button"
              onClick={handleSend}
              disabled={!input.trim() || isStreaming}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition font-medium flex items-center gap-2"
            >
              {isStreaming ? (
                <>
                  <span className="material-symbols-outlined animate-spin">sync</span>
                  發送中...
                </>
              ) : (
                "發送"
              )}
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
