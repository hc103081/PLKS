// apps/web/src/pages/CourseConsole.tsx
import { useEffect, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { getSessionStatus } from "../services/api.js";

interface ConceptNode {
  conceptId: string;
  term: string;
  explanation: string;
  relatedTerms: string[];
  sourceEvidence: {
    transcriptRef: string;
    slideUri: string;
  };
}

export function CourseConsole() {
  const navigate = useNavigate();
  const { courseId } = useParams<{ courseId: string }>();
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get("session");
  const [nodes, setNodes] = useState<ConceptNode[]>([]);
  const [sessionStatus, setSessionStatus] = useState<{ status: string; error?: string } | null>(
    null,
  );
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (courseId) {
      loadCourseData(courseId);
    }
    if (sessionId) {
      pollSessionStatus(sessionId);
    }
  }, [courseId, sessionId, navigate]);

  async function loadCourseData(courseId: string) {
    setIsLoading(true);
    try {
      // In a real app, this would fetch from B2/vault
      // For now, mock data
      setNodes([
        {
          conceptId: "1",
          term: "機器學習",
          explanation: "AI 的一個子集，使系統能從數據中學習而無需明確編程。",
          relatedTerms: ["深度學習", "神經網絡", "監督學習"],
          sourceEvidence: {
            transcriptRef: "00:05:30-00:07:45",
            slideUri: "s3://bucket/vault/CS101/_assets/slide-1.png",
          },
        },
        {
          conceptId: "2",
          term: "神經網絡",
          explanation: "受生物神經網絡啟發的計算系統，能學習模式。",
          relatedTerms: ["深度學習", "機器學習", "反向傳播"],
          sourceEvidence: {
            transcriptRef: "00:12:00-00:15:30",
            slideUri: "s3://bucket/vault/CS101/_assets/slide-2.png",
          },
        },
        {
          conceptId: "3",
          term: "深度學習",
          explanation: "使用多層神經網絡（深層架構）的機器學習子集。",
          relatedTerms: ["神經網絡", "機器學習", "CNN", "RNN"],
          sourceEvidence: {
            transcriptRef: "00:20:00-00:25:00",
            slideUri: "s3://bucket/vault/CS101/_assets/slide-3.png",
          },
        },
      ]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "載入課程失敗");
    } finally {
      setIsLoading(false);
    }
  }

  async function pollSessionStatus(sessionId: string) {
    try {
      const status = await getSessionStatus(sessionId);
      setSessionStatus(status);
      if (status.status === "processing") {
        setTimeout(() => pollSessionStatus(sessionId), 3000);
      }
    } catch (err) {
      console.error("Failed to poll session status:", err);
    }
  }

  const goBack = () => {
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        <header className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={goBack} className="text-gray-500 hover:text-gray-700">
              ← 返回儀表板
            </button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{courseId} 課程主控台</h1>
              <p className="text-gray-600 mt-1">內容圖譜 (MOC) - 知識圖譜</p>
            </div>
          </div>
          {sessionId && sessionStatus && (
            <div className="flex items-center gap-3">
              <span
                className={`px-3 py-1 rounded-full text-sm ${
                  sessionStatus.status === "completed"
                    ? "bg-green-100 text-green-800"
                    : sessionStatus.status === "processing"
                      ? "bg-blue-100 text-blue-800"
                      : sessionStatus.status === "failed"
                        ? "bg-red-100 text-red-800"
                        : "bg-gray-100 text-gray-800"
                }`}
              >
                {sessionStatus.status === "completed"
                  ? "已完成"
                  : sessionStatus.status === "processing"
                    ? "處理中"
                    : sessionStatus.status === "failed"
                      ? "失敗"
                      : sessionStatus.status}
              </span>
              {sessionStatus.status === "failed" && (
                <>
                  {sessionStatus.error && (
                    <div className="text-xs text-red-600 ml-2">{sessionStatus.error}</div>
                  )}
                  <button
                    onClick={() => pollSessionStatus(sessionId)}
                    className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 text-sm"
                  >
                    重試
                  </button>
                </>
              )}
            </div>
          )}
        </header>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            {error}
          </div>
        )}

        {isLoading ? (
          <div className="flex items-center justify-center h-64">正在載入課程內容...</div>
        ) : (
          <div className="space-y-6">
            {/* Concept Nodes */}
            <section>
              <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
                概念節點 ({nodes.length})
              </h2>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {nodes.map((node) => (
                  <article
                    key={node.conceptId}
                    className="bg-white rounded-lg shadow p-6 hover:shadow-md transition border border-gray-100"
                  >
                    <h3 className="font-semibold text-gray-900 text-lg mb-2">{node.term}</h3>
                    <p className="text-gray-600 text-sm mb-4 line-clamp-3">{node.explanation}</p>

                    <div className="mb-4">
                      <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">
                        相關概念
                      </h4>
                      <div className="flex flex-wrap gap-1">
                        {node.relatedTerms.map((term) => (
                          <span
                            key={term}
                            className="px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded hover:bg-blue-100 cursor-pointer transition"
                          >
                            {term}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="pt-4 border-t border-gray-100">
                      <p className="text-xs text-gray-500">
                        來源: {node.sourceEvidence.transcriptRef}
                      </p>
                    </div>
                  </article>
                ))}
              </div>
            </section>

            {/* Quiz Section */}
            <section>
              <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
                練習測驗
              </h2>
              <div className="bg-white rounded-lg shadow p-6">
                <p className="text-gray-600 mb-4">
                  透過根據課程內容生成的自適應測驗來測試您的理解。
                </p>
                <a
                  href={`/quiz/${courseId}?session=${sessionId}`}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 002-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
                    />
                  </svg>
                  開始測驗
                </a>
              </div>
            </section>
          </div>
        )}
      </div>
    </div>
  );
}
