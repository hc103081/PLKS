import { useNavigate } from "react-router-dom";
import {
  type CourseCardData,
  type CourseStatus,
  NODE_LABELS,
  type PipelineNodeKey,
} from "../../types/course";

interface CourseCardProps {
  course: CourseCardData;
  onViewPipeline?: (sessionId: string) => void;
  onRetryPipeline?: (sessionId: string) => void;
  onUploadMaterials?: (courseId: string) => void;
  onExport?: (courseId: string) => void;
  onMoreActions?: (course: CourseCardData) => void;
}

const STATUS_CONFIG: Record<
  CourseStatus,
  {
    badgeBg: string;
    badgeBorder: string;
    badgeText: string;
    badgeDot: string;
    borderColor: string;
    topBarColor: string;
    pulse?: boolean;
    icon: string;
    hoverShadow: string;
    hoverBorder: string;
  }
> = {
  idle: {
    badgeBg: "bg-[#182234]",
    badgeBorder: "border-[#1E293B]",
    badgeText: "text-[#94A3B8]",
    badgeDot: "bg-[#64748B]",
    borderColor: "border-[#1E293B]",
    topBarColor: "bg-[#334155]",
    icon: "radio_button_unchecked",
    hoverShadow: "hover:border-slate-600",
    hoverBorder: "hover:border-slate-600",
  },
  processing: {
    badgeBg: "bg-[#F59E0B]/10",
    badgeBorder: "border-[#F59E0B]/40",
    badgeText: "text-[#F59E0B]",
    badgeDot: "bg-[#F59E0B] animate-ping",
    borderColor: "border-[#F59E0B]/30",
    topBarColor: "bg-[#F59E0B] animate-pulse",
    icon: "sync",
    pulse: true,
    hoverShadow: "hover:shadow-[0_0_24px_rgba(245,158,11,0.2)]",
    hoverBorder: "",
  },
  ready: {
    badgeBg: "bg-[#10B981]/10",
    badgeBorder: "border-[#10B981]/30",
    badgeText: "text-[#10B981]",
    badgeDot: "bg-[#10B981] shadow-[0_0_6px_#10B981]",
    borderColor: "border-[#1E293B]",
    topBarColor: "bg-[#10B981]",
    icon: "check_circle",
    hoverShadow: "hover:border-emerald-500/50 hover:shadow-[0_0_24px_rgba(16,185,129,0.15)]",
    hoverBorder: "hover:border-emerald-500/50",
  },
  error: {
    badgeBg: "bg-[#F43F5E]/15",
    badgeBorder: "border-[#F43F5E]/40",
    badgeText: "text-[#F43F5E]",
    badgeDot: "bg-[#F43F5E] shadow-[0_0_6px_#F43F5E]",
    borderColor: "border-[#F43F5E]/40",
    topBarColor: "bg-[#F43F5E]",
    icon: "error",
    hoverShadow: "hover:shadow-[0_0_24px_rgba(244,63,94,0.2)]",
    hoverBorder: "",
  },
};

const NODE_ORDER: PipelineNodeKey[] = ["A", "B", "C", "D", "E", "F"];

export function CourseCard({
  course,
  onViewPipeline,
  onRetryPipeline,
  onUploadMaterials,
  onExport,
  onMoreActions,
}: CourseCardProps) {
  const _navigate = useNavigate();
  const config = STATUS_CONFIG[course.status];

  const handleContinue = () => {
    if (course.latestSessionId) {
      navigate(`/course/${course.id}?tab=outline&session=${course.latestSessionId}`);
    } else {
      navigate(`/course/${course.id}?tab=raw`);
    }
  };

  const handleViewPipeline = () => {
    if (course.latestSessionId && onViewPipeline) {
      onViewPipeline(course.latestSessionId);
    }
  };

  const handleRetry = () => {
    if (course.latestSessionId && onRetryPipeline) {
      onRetryPipeline(course.latestSessionId);
    }
  };

  const handleUpload = () => {
    if (onUploadMaterials) {
      onUploadMaterials(course.id);
    }
  };

  const handleExport = () => {
    if (onExport) {
      onExport(course.id);
    }
  };

  const handleMoreActions = () => {
    if (onMoreActions) {
      onMoreActions(course);
    }
  };

  return (
    <article
      className={`
        flex flex-col justify-between p-6 rounded-xl bg-[#131C2E] shadow-lg shadow-black/30 min-h-[380px]
        ${config.borderColor} ${config.hoverShadow} ${config.hoverBorder} transition-all group relative overflow-hidden
      `}
    >
      {/* Top status bar */}
      <div className={`absolute top-0 left-0 right-0 h-1 ${config.topBarColor}`} />

      <div className="flex flex-col gap-4">
        {/* Header with code, semester, status */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-2.5 py-0.5 rounded bg-[#182234] border border-[#1E293B] text-[#CBD5E1] font-label-code-sm font-semibold">
              {course.code}
            </span>
            <span className="px-2.5 py-0.5 rounded bg-[#0F172A] border border-[#1E293B] text-[#94A3B8] font-body-sm">
              {course.semester} • {course.required ? "必修" : "選修"} {course.credits}學分
            </span>
          </div>
          <div
            className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded-full font-label-code-sm font-semibold ${config.badgeBg} ${config.badgeBorder} ${config.badgeText}`}
          >
            {config.pulse && (
              <span
                className={`material-symbols-outlined text-[14px] ${config.badgeDot} animate-spin`}
              >
                {config.icon}
              </span>
            )}
            {!config.pulse && (
              <span className={`material-symbols-outlined text-[14px] ${config.badgeDot}`}>
                {config.icon}
              </span>
            )}
            <span>{getStatusLabel(course.status)}</span>
          </div>
        </div>

        {/* Course name and instructor */}
        <div className="flex flex-col">
          <h2 className="font-headline-sm text-headline-sm font-bold text-[#F8FAFC] group-hover:text-[#38BDF8] transition-colors">
            {course.name}
          </h2>
          {course.instructor && (
            <p className="font-body-sm text-body-sm text-[#94A3B8] mt-1 line-clamp-1">
              授課教師：{course.instructor} {course.location ? `• ${course.location}` : ""}
            </p>
          )}
        </div>

        {/* Progress section - varies by status */}
        {course.status === "processing" && course.pipelineStage ? (
          <PipelineProgressView stage={course.pipelineStage} />
        ) : (
          <StandardProgressView
            progress={course.progress}
            completedChapters={course.completedChapters}
            totalChapters={course.totalChapters}
          />
        )}

        {/* Last context / Empty state / Error details */}
        {course.status === "idle" ? (
          <IdleStateView onUpload={handleUpload} />
        ) : course.status === "error" ? (
          <ErrorStateView
            errorMessage={course.pipelineStage?.errorMessage}
            retryCount={course.pipelineStage?.retryCount}
            maxRetries={course.pipelineStage?.maxRetries}
            onRetry={handleRetry}
            onDiagnose={() => handleViewPipeline()}
          />
        ) : (
          <ReadyStateView
            lastReviewedAt={course.lastReviewedAt}
            currentTopic={course.currentTopic}
            conceptGraphCount={course.conceptGraphCount}
            audioCount={course.audioCount}
            quizCount={course.quizCount}
          />
        )}
      </div>

      {/* Footer actions */}
      <div className="flex items-center justify-between gap-3 pt-4 mt-4 border-t border-[#1E293B]">
        {course.status === "processing" && course.latestSessionId && (
          <button
            type="button"
            onClick={handleViewPipeline}
            className="inline-flex items-center gap-space-xs px-3.5 py-1.5 rounded-lg bg-[#F59E0B]/20 border border-[#F59E0B]/40 text-[#F59E0B] hover:bg-[#F59E0B] hover:text-black font-body-sm font-medium transition-colors shadow-sm"
          >
            <span className="material-symbols-outlined text-[16px]">hourglass_top</span>
            <span>查看管線進度</span>
          </button>
        )}

        {course.status === "idle" && (
          <button
            type="button"
            onClick={handleUpload}
            className="inline-flex items-center gap-space-xs px-3.5 py-1.5 rounded-lg bg-[#6366F1] hover:bg-[#4F46E5] text-white font-body-sm font-medium transition-colors shadow-md shadow-[#6366F1]/20"
          >
            <span className="material-symbols-outlined text-[16px]">upload_file</span>
            <span>上傳教材與啟動</span>
          </button>
        )}

        {course.status === "ready" && (
          <>
            <button
              type="button"
              onClick={handleContinue}
              className="inline-flex items-center gap-1.5 font-body-sm font-bold text-[#6366F1] hover:text-[#38BDF8] transition-colors"
            >
              <span>繼續學習</span>
              <span className="material-symbols-outlined text-[16px] group-hover:translate-x-0.5 transition-transform">
                arrow_forward
              </span>
            </button>
            {course.quizCount > 0 && (
              <button
                type="button"
                onClick={handleExport}
                className="inline-flex items-center gap-1 px-space-sm py-1 rounded-lg bg-[#182234] border border-[#1E293B] text-[#CBD5E1] font-body-sm hover:bg-[#1E293B] hover:text-white transition-colors"
              >
                <span className="material-symbols-outlined text-[14px]">download</span>
                <span>導出重點</span>
              </button>
            )}
          </>
        )}

        {course.status === "error" && (
          <button
            type="button"
            onClick={handleRetry}
            className="inline-flex items-center gap-space-xs px-3.5 py-1.5 rounded-lg bg-[#F43F5E] hover:bg-rose-600 text-white font-body-sm font-medium transition-colors shadow-md shadow-rose-500/25"
          >
            <span className="material-symbols-outlined text-[16px]">replay</span>
            <span>重試管線</span>
          </button>
        )}

        <button
          type="button"
          onClick={handleMoreActions}
          className="w-8 h-8 rounded-lg flex items-center justify-center text-[#94A3B8] hover:bg-[#182234] hover:text-[#F8FAFC] transition-colors"
          aria-label="更多選項"
        >
          <span className="material-symbols-outlined text-[18px]">more_vert</span>
        </button>
      </div>
    </article>
  );
}

function getStatusLabel(status: CourseStatus): string {
  const labels: Record<CourseStatus, string> = {
    idle: "Idle",
    processing: "Processing",
    ready: "Ready",
    error: "Failed",
  };
  return labels[status];
}

function StandardProgressView({
  progress,
  completedChapters,
  totalChapters,
}: {
  progress: number;
  completedChapters: number;
  totalChapters: number;
}) {
  return (
    <div className="flex flex-col gap-1.5 mt-1">
      <div className="flex items-center justify-between font-label-code-sm text-[#94A3B8]">
        <span>進度 {progress}%</span>
        <span className="font-bold text-[#F8FAFC]">
          {completedChapters} / {totalChapters} 章節
        </span>
      </div>
      <div className="w-full h-2 rounded-full bg-[#0F172A] overflow-hidden border border-[#1E293B]">
        <div
          className="h-full bg-[#6366F1] rounded-full shadow-[0_0_8px_#6366F1]"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}

function PipelineProgressView({
  stage,
}: {
  stage: NonNullable<CourseCardData["pipelineStage"]>;
}) {
  const currentIndex = stage.currentNode ? NODE_ORDER.indexOf(stage.currentNode) : -1;
  const completedSet = new Set(stage.completedNodes ?? []);
  const failedNode = stage.failedNode;

  return (
    <div className="p-3 rounded-lg bg-[#0F172A]/80 border border-[#1E293B] flex flex-col gap-3">
      {/* Radial progress with current node */}
      <div className="p-3 rounded-lg bg-[#0F172A]/80 border border-[#1E293B] flex items-center gap-4">
        <div className="relative w-12 h-12 flex-shrink-0 flex items-center justify-center">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36" aria-label="進度圖">
            <circle
              className="stroke-[#1E293B]"
              cx="18"
              cy="18"
              fill="none"
              r="15"
              strokeWidth="3"
            />
            <circle
              className="stroke-[#F59E0B]"
              cx="18"
              cy="18"
              fill="none"
              r="15"
              strokeDasharray="94.2"
              strokeDashoffset={94.2 * (1 - (currentIndex + 1) / 6)}
              strokeLinecap="round"
              strokeWidth="3"
            />
          </svg>
          <span className="absolute font-label-code-sm font-bold text-[#F59E0B]">
            {Math.round(((currentIndex + 1) / 6) * 100)}%
          </span>
        </div>
        <div className="flex flex-col min-w-0">
          <span className="font-body-sm font-bold text-[#F8FAFC] truncate">
            節點 {stage.currentNode}: {stage.currentNode ? NODE_LABELS[stage.currentNode] : ""}
          </span>
          <span className="font-label-code-sm text-[#94A3B8] truncate">
            {stage.estimatedTimeRemaining
              ? `預估剩餘 ${stage.estimatedTimeRemaining} 秒`
              : "處理中..."}
          </span>
        </div>
      </div>

      {/* Pipeline stepper */}
      <div className="flex items-center justify-between gap-1 px-1">
        {NODE_ORDER.map((node, index) => {
          const isCompleted = completedSet.has(node);
          const isCurrent = node === stage.currentNode;
          const isFailed = node === failedNode;

          let barClass = "h-1 flex-1 rounded-full ";
          if (isFailed) {
            barClass += "bg-[#F43F5E]";
          } else if (isCompleted || (isCurrent && index < currentIndex)) {
            barClass += "bg-[#F59E0B]";
          } else if (isCurrent) {
            barClass += "bg-[#F59E0B] animate-pulse";
          } else {
            barClass += "bg-[#1E293B]";
          }

          return (
            <div key={node} className="flex flex-col items-center gap-1">
              <div className={barClass} />
              <span
                className={`font-label-code-xs text-[0.6rem] ${isCurrent ? "text-[#F59E0B] font-bold" : isCompleted ? "text-[#10B981]" : isFailed ? "text-[#F43F5E]" : "text-[#94A3B8]"}`}
              >
                {node}
              </span>
            </div>
          );
        })}
      </div>

      {/* Pipeline log subtitle */}
      <div className="flex items-center gap-2 text-[#94A3B8] font-label-code-sm">
        <span className="material-symbols-outlined text-[16px] animate-spin text-[#F59E0B]">
          sync
        </span>
        <span className="truncate">{getPipelineLogMessage(stage.currentNode)}</span>
      </div>
    </div>
  );
}

function getPipelineLogMessage(node?: PipelineNodeKey): string {
  const messages: Record<PipelineNodeKey, string> = {
    A: "正在讀取原始教材資料...",
    B: "正在產生視覺資產預簽名 URL...",
    C: "正在組裝多模態提示詞...",
    D: "正在呼叫 NVIDIA NIM 多模態推理...",
    E: "正在驗證 AI 輸出結果...",
    F: "正在持久化至資料庫與產出 Markdown...",
  };
  return messages[node || "A"] || "處理中...";
}

function IdleStateView({ onUpload }: { onUpload: () => void }) {
  return (
    <>
      <div className="p-4 rounded-lg bg-[#0F172A]/80 border border-[#1E293B] flex flex-col items-center justify-center text-center gap-1.5 py-5">
        <div className="w-8 h-8 rounded-full bg-[#182234] flex items-center justify-center text-[#94A3B8] border border-[#1E293B]">
          <span className="material-symbols-outlined text-[18px]">cloud_upload</span>
        </div>
        <span className="font-body-sm font-bold text-[#F8FAFC]">尚未啟動索引管線</span>
        <p className="font-label-code-sm text-[#94A3B8] max-w-[210px]">
          已建立課程結構，尚未上傳教學錄音或投影片講義
        </p>
      </div>
      <div className="flex items-center gap-2 text-[#94A3B8] font-label-code-sm">
        <span className="flex items-center gap-1">
          <span className="material-symbols-outlined text-[14px]">folder_open</span>
          待匯入教材
        </span>
      </div>
    </>
  );
}

function ErrorStateView({
  errorMessage,
  retryCount,
  maxRetries,
  onRetry,
  onDiagnose,
}: {
  errorMessage: string | undefined;
  retryCount: number | undefined;
  maxRetries: number | undefined;
  onRetry: () => void;
  onDiagnose: () => void;
}) {
  return (
    <>
      <div className="p-3 rounded-lg bg-[#F43F5E]/10 border border-[#F43F5E]/30 flex items-start gap-3">
        <span className="material-symbols-outlined text-[18px] text-[#F43F5E] flex-shrink-0 mt-0.5">
          error
        </span>
        <div className="flex flex-col">
          <span className="font-body-sm font-bold text-[#ffe4e6]">
            管線中斷於節點 {errorMessage?.includes("B") ? "B" : "未知"}
          </span>
          <span className="font-label-code-sm text-[#ffe4e6]/70 mt-0.5">
            {errorMessage || "未知錯誤"}
          </span>
        </div>
      </div>
      <div className="flex items-center gap-2 text-[#94A3B8] font-label-code-sm">
        <span className="flex items-center gap-1">
          <span className="material-symbols-outlined text-[14px]">event_repeat</span>
          重試嘗試次數: {retryCount || 0}/{maxRetries || 3}
        </span>
        <span className="flex items-center gap-1 text-[#F43F5E]">
          <span className="material-symbols-outlined text-[14px]">warning</span>
          需要注意
        </span>
      </div>
    </>
  );
}

function ReadyStateView({
  lastReviewedAt,
  currentTopic,
  conceptGraphCount,
  audioCount,
  quizCount,
}: {
  lastReviewedAt: string | undefined;
  currentTopic: string | undefined;
  conceptGraphCount: number;
  audioCount: number;
  quizCount: number;
}) {
  return (
    <>
      <div className="p-3 rounded-lg bg-[#0F172A]/80 border border-[#1E293B] flex flex-col gap-1">
        {lastReviewedAt && (
          <div className="flex items-center gap-1 font-label-code-sm text-[#94A3B8]">
            <span className="material-symbols-outlined text-[14px] text-[#38BDF8]">history</span>
            <span>上次複習：{lastReviewedAt}</span>
          </div>
        )}
        {currentTopic && (
          <p className="font-body-sm text-[#CBD5E1] font-medium truncate">{currentTopic}</p>
        )}
      </div>
      <div className="flex items-center gap-3 text-[#94A3B8] font-label-code-sm">
        {conceptGraphCount > 0 && (
          <span className="flex items-center gap-1">
            <span className="material-symbols-outlined text-[14px] text-[#38BDF8]">
              account_tree
            </span>
            {conceptGraphCount} 概念圖譜
          </span>
        )}
        {audioCount > 0 && (
          <span className="flex items-center gap-1">
            <span className="material-symbols-outlined text-[14px] text-[#38BDF8]">graphic_eq</span>
            {audioCount} 份音檔
          </span>
        )}
        {quizCount > 0 && (
          <span className="flex items-center gap-1">
            <span className="material-symbols-outlined text-[14px] text-[#38BDF8]">quiz</span>
            {quizCount} 道題庫
          </span>
        )}
      </div>
    </>
  );
}
