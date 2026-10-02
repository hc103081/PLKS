export function LoadingSkeleton({
  className = "",
  variant = "text",
  width,
  height,
  count = 1,
}: {
  className?: string;
  variant?: "text" | "circular" | "rectangular" | "card";
  width?: string | number;
  height?: string | number;
  count?: number;
}) {
  const baseStyle = "bg-surface-variant animate-pulse rounded";

  const variants = {
    text: "h-4 rounded",
    circular: "rounded-full",
    rectangular: "rounded-lg",
    card: "rounded-xl",
  };

  const items = Array.from({ length: count }, (_, i) => (
    <div
      key={i}
      className={`${baseStyle} ${variants[variant]} ${className}`}
      style={{
        width: width ? (typeof width === "number" ? `${width}px` : width) : undefined,
        height: height ? (typeof height === "number" ? `${height}px` : height) : undefined,
      }}
    />
  ));

  return <div className="space-y-3">{items}</div>;
}

export function CourseCardSkeleton() {
  return (
    <article className="card-base min-h-[380px] p-6 flex flex-col justify-between">
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <LoadingSkeleton variant="rectangular" width="60" height="24" />
          <LoadingSkeleton variant="rectangular" width="120" height="24" />
        </div>
        <LoadingSkeleton variant="rectangular" width="80" height="28" />
      </div>
      <div className="flex flex-col gap-2">
        <LoadingSkeleton variant="text" width="60%" />
        <LoadingSkeleton variant="text" width="80%" />
      </div>
      <div className="flex flex-col gap-1.5 mt-4">
        <div className="flex items-center justify-between">
          <LoadingSkeleton variant="text" width="50" />
          <LoadingSkeleton variant="text" width="80" />
        </div>
        <LoadingSkeleton variant="rectangular" width="100%" height="8" />
      </div>
      <LoadingSkeleton variant="rectangular" width="100%" height="80" />
      <LoadingSkeleton variant="text" width="100%" count={2} />
      <div className="flex items-center justify-between gap-3 pt-4 mt-4 border-t border-outline">
        <LoadingSkeleton variant="rectangular" width="100" height="36" />
        <LoadingSkeleton variant="circular" width="36" height="36" />
      </div>
    </article>
  );
}

export function PipelineSummarySkeleton() {
  return (
    <section className="glass-panel">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="pipeline-summary-card">
            <LoadingSkeleton
              className="pipeline-summary-icon"
              variant="circular"
              width={40}
              height={40}
            />
            <div className="flex flex-col gap-2">
              <LoadingSkeleton variant="text" width="40" />
              <LoadingSkeleton variant="text" width="100" />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

export function DashboardSkeleton() {
  return (
    <div className="main-content-wrapper">
      <section className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex flex-col gap-2">
          <LoadingSkeleton variant="rectangular" width="140" height="24" />
          <LoadingSkeleton variant="text" width="400" />
          <LoadingSkeleton variant="text" width="300" />
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <LoadingSkeleton variant="rectangular" width="200" height="44" />
          <LoadingSkeleton variant="rectangular" width="100" height="40" count={2} />
          <LoadingSkeleton variant="rectangular" width="140" height="40" />
        </div>
      </section>
      <nav className="flex items-center gap-2 overflow-x-auto pb-1">
        {SEMESTERS.map((s) => (
          <LoadingSkeleton key={s.key} variant="rectangular" width="80" height="36" />
        ))}
      </nav>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <CourseCardSkeleton key={i} />
        ))}
      </div>
      <PipelineSummarySkeleton />
    </div>
  );
}

// Import SEMESTERS for the skeleton
import { SEMESTERS } from "../../types/course";
