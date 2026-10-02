import type {
  AiExtractionResult,
  ConceptNodePayload,
  QuizItemPayload,
  RawAssetPayload,
  UserConfigPayload,
} from "../../types/api";
import type { CourseTab, PipelineNodeKey } from "../../types/course";

interface CourseTabsProps {
  activeTab: CourseTab;
  onTabChange: (tab: CourseTab) => void;
  sessionId?: string;
  pipelineStatus?: string;
}

const TABS: { key: CourseTab; label: string; icon: string; description: string }[] = [
  { key: "raw", label: "原檔", icon: "description", description: "音檔、投影片、逐字稿" },
  { key: "pipeline", label: "AI管線", icon: "account_tree", description: "DAG 視覺化、節點詳情" },
  { key: "outline", label: "重點排版", icon: "auto_stories", description: "大綱、編輯器、圖譜" },
  { key: "game", label: "遊戲學習", icon: "sports_esports", description: "測驗、Sidekick 助手" },
];

export function CourseTabs({ activeTab, onTabChange, sessionId, pipelineStatus }: CourseTabsProps) {
  const getStatusIndicator = (tab: CourseTab) => {
    if (tab === "pipeline" && sessionId) {
      switch (pipelineStatus) {
        case "processing":
          return <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping ml-1" />;
        case "completed":
          return <span className="w-1.5 h-1.5 rounded-full bg-tertiary ml-1" />;
        case "failed":
          return <span className="w-1.5 h-1.5 rounded-full bg-error ml-1" />;
        default:
          return <span className="w-1.5 h-1.5 rounded-full bg-gray-500 ml-1" />;
      }
    }
    return null;
  };

  return (
    <nav
      className="sticky top-16 z-40 bg-surface-container-low/95 backdrop-blur-md border-b border-outline px-4 lg:px-8"
      role="tablist"
      aria-label="課程功能分頁"
    >
      <div className="max-w-[1440px] mx-auto">
        <div className="flex items-center gap-1 h-12 overflow-x-auto pb-1 -mx-4 px-4 lg:mx-0 lg:px-0">
          {TABS.map(({ key, label, icon, description }) => (
            <button
              type="button"
              key={key}
              onClick={() => onTabChange(key)}
              role="tab"
              aria-selected={activeTab === key}
              aria-controls={`panel-${key}`}
              className={`
                flex items-center gap-2 px-4 py-2 rounded-xl font-body-sm whitespace-nowrap transition-all
                ${
                  activeTab === key
                    ? "bg-primary text-white shadow-lg shadow-primary/30"
                    : "text-on-surface-variant hover:text-on-surface hover:bg-surface-variant"
                }
              `}
              title={description}
            >
              <span className="material-symbols-outlined text-[20px]">{icon}</span>
              <span className="font-medium">{label}</span>
              {getStatusIndicator(key)}
            </button>
          ))}
        </div>
      </div>
    </nav>
  );
}
