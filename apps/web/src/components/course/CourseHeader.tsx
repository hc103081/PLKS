import { useNavigate } from "react-router-dom";
import type { CourseCardData, CourseTab } from "../../types/course";

interface CourseHeaderProps {
  course: CourseCardData;
  activeTab: CourseTab;
  onTabChange: (tab: CourseTab) => void;
  onBack: () => void;
  sessionId?: string;
  onStartSession: () => void;
}

const TABS: { key: CourseTab; label: string; icon: string }[] = [
  { key: "raw", label: "原檔", icon: "description" },
  { key: "pipeline", label: "AI管線", icon: "account_tree" },
  { key: "outline", label: "重點排版", icon: "auto_stories" },
  { key: "game", label: "遊戲學習", icon: "sports_esports" },
];

export function CourseHeader({
  course,
  activeTab,
  onTabChange,
  onBack,
  sessionId,
  onStartSession,
}: CourseHeaderProps) {
  const _navigate = useNavigate();

  const handleTabClick = (tab: CourseTab) => {
    if (tab === "pipeline" && !sessionId) {
      onStartSession();
    } else {
      onTabChange(tab);
    }
  };

  return (
    <header className="page-header">
      <div className="page-header-content">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="btn-ghost w-9 h-9 p-0"
            aria-label="返回課程儀表板"
            type="button"
          >
            <span className="material-symbols-outlined text-[20px]">arrow_back</span>
          </button>
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded bg-surface-variant border border-outline text-on-surface-variant font-label-code-sm font-semibold">
                {course.code}
              </span>
              <span className="px-2 py-0.5 rounded bg-surface-container-low border border-outline text-on-surface-variant font-body-sm">
                {course.semester} • {course.required ? "必修" : "選修"} {course.credits}學分
              </span>
            </div>
            <h1 className="font-headline-md text-headline-md font-bold text-on-surface">
              {course.name}
            </h1>
          </div>
        </div>

        <nav className="flex items-center gap-1 lg:gap-2" role="tablist" aria-label="課程功能分頁">
          {TABS.map(({ key, label, icon }) => (
            <button
              type="button"
              key={key}
              onClick={() => handleTabClick(key)}
              role="tab"
              aria-selected={activeTab === key}
              aria-controls={`panel-${key}`}
              className={`
                flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-body-sm transition-colors
                ${
                  activeTab === key
                    ? "bg-primary text-white shadow-md shadow-primary/25"
                    : "text-on-surface-variant hover:text-on-surface hover:bg-surface-variant"
                }
              `}
            >
              <span className="material-symbols-outlined text-[18px]">{icon}</span>
              <span className="hidden sm:inline">{label}</span>
            </button>
          ))}
        </nav>

        <div className="flex items-center gap-2 ml-auto">
          <div className="hidden xl:flex items-center gap-2 px-3 py-1 rounded-full bg-surface-variant border border-outline text-on-surface-variant font-label-code-sm">
            <span className="w-2 h-2 rounded-full bg-tertiary shadow-glow-tertiary" />
            <span>索引管線就緒</span>
          </div>
          {course.status === "idle" && !sessionId && (
            <button onClick={onStartSession} className="btn-primary hidden sm:flex" type="button">
              <span className="material-symbols-outlined text-[16px]">play_arrow</span>
              <span>啟動管線</span>
            </button>
          )}
          <button className="btn-ghost w-9 h-9" aria-label="更多選項" type="button">
            <span className="material-symbols-outlined text-[20px]">more_vert</span>
          </button>
        </div>
      </div>
    </header>
  );
}
