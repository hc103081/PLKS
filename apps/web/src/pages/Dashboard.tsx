// apps/web/src/pages/Dashboard.tsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useGamification } from "../hooks/useGamification.js";
import { getIngestionStatus, getSessionStatus, startSession, uploadFile } from "../services/api.js";

// Helper to generate UUID (simplified version)
function generateUUID(): string {
  return crypto.randomUUID();
}

export function Dashboard() {
  const navigate = useNavigate();
  const [courses, setCourses] = useState<Array<{ id: string; name: string; progress: number }>>([]);
  const [ingestionStatus, setIngestionStatus] = useState<{ status: string } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Store ingestion session IDs associated with course IDs
  const [ingestionSessionIds, setIngestionSessionIds] = useState<Record<string, string>>({});
  const { startNewGame } = useGamification();

  useEffect(() => {
    loadDashboard();
  }, []);

  async function loadDashboard() {
    setIsLoading(true);
    try {
      // In a real app, this would fetch from an API
      // For now, mock data
      setCourses([
        { id: "CS101", name: "機器學習基礎", progress: 65 },
        { id: "CS102", name: "深度學習", progress: 30 },
        { id: "CS103", name: "自然語言處理", progress: 0 },
      ]);

      const status = await getIngestionStatus();
      setIngestionStatus(status);
    } catch (err) {
      setError(err instanceof Error ? err.message : "載入儀表板失敗");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleStartCourse(courseId: string) {
    try {
      setIsLoading(true);
      // Use the ingestion session ID associated with this course
      const sessionId = ingestionSessionIds[courseId];
      if (!sessionId) {
        setError(`請先為課程 ${courseId} 上傳檔案以開始處理`);
        return;
      }
      await startSession({ sessionId, courseId });
      navigate(`/course/${courseId}?session=${sessionId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "啟動課程失敗");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleFileUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    try {
      const result = await uploadFile(file);
      // Store the sessionId associated with the courseId from the upload
      if (result.courseId) {
        setIngestionSessionIds((prev) => ({
          ...prev,
          [result.courseId]: result.sessionId,
        }));
      }
      await loadDashboard(); // Refresh status
    } catch (err) {
      setError(err instanceof Error ? err.message : "上傳失敗");
    } finally {
      setIsLoading(false);
    }
  }

  if (isLoading) {
    return <div className="flex items-center justify-center h-screen">載入中...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">PLKS 儀表板</h1>
          <p className="text-gray-600 mt-1">您的個人學習知識系統</p>
        </header>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            {error}
            <button onClick={() => setError(null)} className="ml-4 text-red-500 hover:underline">
              關閉
            </button>
          </div>
        )}

        {/* Ingestion Status */}
        <section className="mb-8">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">資料擷取管線</h2>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-900">管線狀態</p>
                <p className="text-gray-600 text-sm">
                  {ingestionStatus?.status === "running" ? "🟢 運行中" : "🔴 已停止"}
                </p>
              </div>
              <div className="flex gap-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="file"
                    accept=".mp3,.wav,.m4a,.flac,.pdf,.ppt,.pptx"
                    onChange={handleFileUpload}
                    className="sr-only"
                    id="file-upload"
                  />
                  <span className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition">
                    上傳音頻/文檔
                  </span>
                </label>
              </div>
            </div>
            <p className="text-sm text-gray-500 mt-2">
              將音訊檔案（MP3, WAV, M4A, FLAC）或文件（PDF, PPT, PPTX）拖放至此以透過管線處理。
            </p>
          </div>
        </section>

        {/* Courses */}
        <section>
          <h2 className="text-xl font-semibold text-gray-800 mb-4">您的課程</h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {courses.map((course) => (
              <div
                key={course.id}
                className="bg-white rounded-lg shadow p-6 hover:shadow-md transition"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold text-gray-900 text-lg">{course.name}</h3>
                    <p className="text-gray-500 text-sm mt-1">{course.id}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-blue-600">{course.progress}%</p>
                    <p className="text-xs text-gray-500">已完成</p>
                  </div>
                </div>
                <div className="mt-4 h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-600 rounded-full transition-all duration-300"
                    style={{ width: `${course.progress}%` }}
                  />
                </div>
                <button
                  onClick={() => handleStartCourse(course.id)}
                  disabled={isLoading}
                  className="mt-4 w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition"
                >
                  {isLoading ? "啟動中..." : "繼續學習"}
                </button>
                {/* Show upload hint if no session ID for this course */}
                {!ingestionSessionIds[course.id] && (
                  <div className="mt-2 text-sm text-blue-500">💡 上傳相關檔案以開始處理此課程</div>
                )}
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
