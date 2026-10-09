import type { FC } from "react";

interface CourseCardSkeletonProps {
  className?: string;
  skeletonCount?: number;
}

export const CourseCardSkeleton: FC<CourseCardSkeletonProps> = ({
  className = "",
  skeletonCount = 3,
}) => {
  const skeletonIds = Array.from({ length: skeletonCount }, (_, i) => `skeleton-${i}`);

  return (
    <div
      className={`rounded-lg border bg-[--surface-container] transition-all duration-200 min-h-48 ${className}`}
    >
      {skeletonIds.map((id) => (
        <div key={id} className="p-4 space-y-2">
          <div className="h-6 rounded-md bg-outline/50 animate-pulse" />
          <div className="h-4 rounded-md bg-outline/50 animate-pulse w-2/3" />
          <div className="h-4 rounded-md bg-outline/50 animate-pulse w-1/2" />
        </div>
      ))}
    </div>
  );
};
