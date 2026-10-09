import type { FC } from "react";

interface PipelineSummaryProps {
  inProgress: number;
  pending: number;
  needsAttention: number;
  healthy: boolean;
  healthPercentage: number;
  gpuLoad?: string;
  className?: string;
}

const StatItem: FC<{ label: string; value: string | number; color: string }> = ({
  label,
  value,
  color,
}) => (
  <div className="flex flex-col items-center">
    <span className="text-2xl font-bold" style={{ color }}>
      {value}
    </span>
    <span className="text-xs text-on-outline/60">{label}</span>
  </div>
);

export const PipelineSummary: FC<PipelineSummaryProps> = ({
  inProgress,
  pending,
  needsAttention,
  healthy,
  healthPercentage,
  gpuLoad,
  className = "",
}) => {
  return (
    <div
      className="fixed bottom-0 left-0 right-0 bg-[--surface-container] border-t border-outline/50 p-4 z-40 shadow-lg"
      role="region"
      aria-label="管線摘要"
    >
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex gap-6 flex-wrap justify-center md:justify-start">
          <StatItem label="進行中" value={inProgress} color="#3B82F6" />
          <StatItem label="待上傳" value={pending} color="#F59E0B" />
          <StatItem label="需關注" value={needsAttention} color="#EF4444" />
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden md:flex items-center gap-2">
            <span className="text-sm text-on-outline/60">健康度</span>
            <div className="w-32 h-2 rounded-full bg-outline/50 overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${healthPercentage}%`,
                  backgroundColor: healthy ? "#22C55E" : "#EF4444",
                }}
              />
            </div>
            <span
              className="text-sm font-medium"
              style={{ color: healthy ? "#22C55E" : "#EF4444" }}
            >
              {healthPercentage}%
            </span>
          </div>

          {gpuLoad && (
            <div className="flex items-center gap-2 text-sm">
              <span className="text-on-outline/60">GPU</span>
              <span className="font-medium text-on-outline">{gpuLoad}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
