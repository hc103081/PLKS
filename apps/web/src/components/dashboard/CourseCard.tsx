import type { FC } from "react";
import type { CourseCardData } from "../../types/course";

interface CourseCardProps {
  id: string;
  name: string;
  semester: string;
  status: "idle" | "processing" | "ready" | "error";
  progress: number; // 0-100
  onView: (courseId: string) => void;
  onManage: (courseId: string) => void;
}

const getClassName = (status: "idle" | "processing" | "ready" | "error") => {
  switch (status) {
    case "idle":
      return "group rounded-lg border #94A3B8 bg-[--surface-container] transition-all duration-200 hover:border-primary-fixed/90 hover:border-primary-fixed/90 cursor-pointer min-w-0";
    case "processing":
      return "group rounded-lg border #3B82F6 bg-[--surface-container] transition-all duration-200 hover:border-primary-fixed/90 hover:border-primary-fixed/90 cursor-pointer min-w-0 animate-pulse";
    case "ready":
      return "group rounded-lg border #22C55E bg-[--surface-container] transition-all duration-200 cursor-pointer min-w-0";
    case "error":
      return "group rounded-lg border #EF4444 bg-[--surface-container] transition-all duration-200 cursor-pointer min-w-0";
    default:
      return "group rounded-lg border";
  }
};

export const CourseCard: FC<CourseCardProps> = ({
  id,
  name,
  semester,
  status,
  progress,
  onView,
  onManage,
}) => {
  const className = getClassName(status);

  return (
    <div className={className} onClick={() => onView(id)} onKeyDown={() => onView(id)}>
      <div className="p-4">
        <h3 className="text-sm font-medium text-on-outline truncate">{name}</h3>
        <p className="text-xs text-on-outline/60 truncate">{semester}</p>

        <div className="mt-3">
          <div className="flex items-baseline gap-2 text-xs text-on-outline/60">
            <span>進度</span>
            <span>{progress}%</span>
          </div>
          <div className="h-2 w-full rounded-full bg-outline/50 overflow-hidden">
            <div
              className="h-full rounded-full"
              style={{
                backgroundColor:
                  status === "idle"
                    ? "#94A3B8"
                    : status === "processing"
                      ? "#3B82F6"
                      : status === "ready"
                        ? "#22C55E"
                        : "#EF4444",
              }}
            />
          </div>
        </div>
      </div>

      <div className="p-2 flex justify-between">
        <button
          type="button"
          className="text-[var(--primary)] text-xs font-medium hover:underline"
          onClick={(e) => {
            e.stopPropagation();
            onView(id);
          }}
        >
          繼續學習
        </button>
        {status !== "ready" && (
          <button
            type="button"
            className="text-[var(--error)] text-xs font-medium hover:underline"
            onClick={(e) => {
              e.stopPropagation();
              onManage(id);
            }}
          >
            管理
          </button>
        )}
      </div>
    </div>
  );
};
