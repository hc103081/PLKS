import { useDashboardStore } from "../../stores/dashboardStore";
import { SEMESTERS, SEMESTER_LABELS, type SemesterKey } from "../../types/course";

interface SemesterTabsProps {
  className?: string;
  onChange?: (semester: SemesterKey) => void;
}

export function SemesterTabs({ className = "", onChange }: SemesterTabsProps) {
  const { semesterFilter, setSemesterFilter } = useDashboardStore();

  const allSemesters: SemesterKey[] = ["all", ...SEMESTERS.map((s) => s.key)];

  const handleClick = (key: SemesterKey) => {
    setSemesterFilter(key);
    onChange?.(key);
  };

  return (
    <nav
      className={`flex items-center gap-2 overflow-x-auto pb-1 -mx-4 px-4 lg:mx-0 lg:px-0 ${className}`}
      aria-label="學期篩選"
    >
      {allSemesters.map((key) => {
        const isActive = semesterFilter === key;
        const label = SEMESTER_LABELS[key];
        const semesterData = SEMESTERS.find((s) => s.key === key);

        if (key === "all") {
          return (
            <button
              key={key}
              onClick={() => handleClick(key)}
              className={`flex items-center gap-space-xs px-space-md py-space-sm rounded-full whitespace-nowrap font-body-sm text-body-sm transition-colors ${
                isActive
                  ? "bg-[#6366F1] text-white font-semibold shadow-lg shadow-[#6366F1]/30"
                  : "bg-[#182234] border border-[#1E293B] text-[#CBD5E1] hover:bg-[#1E293B] hover:text-[#F8FAFC]"
              }`}
              aria-current={isActive ? "page" : undefined}
              aria-pressed={isActive}
            >
              <span>全部</span>
              <span
                className={`px-1.5 py-0.2 rounded-full font-label-code-sm text-label-code-sm font-bold ${
                  isActive ? "bg-white/20 text-white" : "bg-[#1E293B] text-[#94A3B8]"
                }`}
              >
                8
              </span>
            </button>
          );
        }

        return (
          <button
            key={key}
            onClick={() => handleClick(key)}
            className={`flex items-center gap-space-xs px-space-md py-space-sm rounded-full whitespace-nowrap font-body-sm text-body-sm transition-colors ${
              isActive
                ? "bg-[#6366F1] text-white font-semibold shadow-lg shadow-[#6366F1]/30"
                : "text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-[#182234]"
            }`}
            aria-current={isActive ? "page" : undefined}
            aria-pressed={isActive}
          >
            {isActive && <span className="w-2 h-2 rounded-full bg-[#38BDF8] animate-ping" />}
            <span>{isActive && semesterData?.key === "104-1" ? "大二上 (現正進行)" : label}</span>
            {isActive && semesterData && (
              <span className="px-1.5 py-0.2 rounded-full bg-white/20 text-white font-label-code-sm text-label-code-sm font-bold">
                5
              </span>
            )}
          </button>
        );
      })}
    </nav>
  );
}
