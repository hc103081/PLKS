import type { PipelineSummary } from "../../types/course";

interface PipelineSummaryProps {
  summary: PipelineSummary;
  onViewHistory?: () => void;
}

export function PipelineSummary({ summary, onViewHistory }: PipelineSummaryProps) {
  return (
    <section
      className="w-full rounded-2xl bg-[#0F172A]/90 border border-[#1E293B] p-5 lg:p-6 shadow-xl flex flex-col lg:flex-row items-center justify-between gap-6 backdrop-blur-md"
      aria-label="管線總覽"
    >
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full lg:w-auto flex-1">
        {/* Metric Card A: In-Progress Jobs (Glowing Cyan/Indigo) */}
        <div className="flex items-center gap-4 p-3.5 px-4 rounded-xl bg-[#131C2E] border border-[#1E293B] hover:border-[#6366F1]/50 shadow-sm transition-all">
          <div className="w-10 h-10 rounded-lg bg-[#6366F1]/15 border border-[#6366F1]/30 flex items-center justify-center text-[#38BDF8] flex-shrink-0 shadow-[0_0_12px_rgba(99,102,241,0.3)]">
            <span className="material-symbols-outlined text-[20px] animate-spin">cyclone</span>
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5">
              <span className="font-headline-sm text-headline-sm font-bold text-[#F8FAFC]">
                {summary.inProgress}
              </span>
              <span className="font-label-code-sm font-bold text-[#38BDF8]">管線執行中</span>
            </div>
            <span className="font-body-sm text-[#94A3B8] truncate">
              {summary.inProgress > 0 ? "有課程正在處理中" : "無進行中管線"}
            </span>
          </div>
        </div>

        {/* Metric Card B: Pending / Idle Jobs */}
        <div className="flex items-center gap-4 p-3.5 px-4 rounded-xl bg-[#131C2E] border border-[#1E293B] hover:border-slate-600 shadow-sm transition-all">
          <div className="w-10 h-10 rounded-lg bg-[#182234] border border-[#1E293B] flex items-center justify-center text-[#94A3B8] flex-shrink-0">
            <span className="material-symbols-outlined text-[20px]">pending_actions</span>
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5">
              <span className="font-headline-sm text-headline-sm font-bold text-[#F8FAFC]">
                {summary.pending}
              </span>
              <span className="font-label-code-sm font-bold text-[#94A3B8]">待上傳分析</span>
            </div>
            <span className="font-body-sm text-[#94A3B8] truncate">
              {summary.pending > 0 ? "含待處理課程" : "無待處理課程"}
            </span>
          </div>
        </div>

        {/* Metric Card C: Need Attention / Failed (Glowing Rose) */}
        <div className="flex items-center gap-4 p-3.5 px-4 rounded-xl bg-[#131C2E] border border-[#F43F5E]/30 hover:border-[#F43F5E]/60 shadow-sm transition-all">
          <div className="w-10 h-10 rounded-lg bg-[#F43F5E]/15 border border-[#F43F5E]/30 flex items-center justify-center text-[#F43F5E] flex-shrink-0 shadow-[0_0_12px_rgba(244,63,94,0.3)]">
            <span className="material-symbols-outlined text-[20px]">report_problem</span>
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5">
              <span className="font-headline-sm text-headline-sm font-bold text-[#F43F5E]">
                {summary.needsAttention}
              </span>
              <span className="font-label-code-sm font-bold text-[#F43F5E]">需立即處置</span>
            </div>
            <span className="font-body-sm text-[#94A3B8] truncate">
              {summary.needsAttention > 0 ? "有失敗管線需處理" : "無異常管線"}
            </span>
          </div>
        </div>
      </div>

      {/* Right System Health Status Indicator */}
      <div className="flex items-center gap-6 w-full lg:w-auto justify-between lg:justify-end border-t lg:border-t-0 border-[#1E293B] pt-4 lg:pt-0">
        <div className="flex flex-col lg:text-right">
          <div className="flex items-center gap-space-xs font-label-code-sm font-bold text-[#F8FAFC]">
            <span className="w-2 h-2 rounded-full bg-[#10B981] shadow-[0_0_8px_#10B981]"></span>
            <span>排程管線健康度 {summary.healthPercentage}%</span>
          </div>
          <span className="font-body-sm text-body-sm text-[#94A3B8]">
            {summary.gpuLoad || "GPU 負載正常"}
          </span>
        </div>
        {onViewHistory && (
          <a
            onClick={onViewHistory}
            className="px-space-md py-space-sm rounded-lg bg-[#182234] border border-[#1E293B] hover:bg-[#1E293B] hover:border-slate-600 text-[#F8FAFC] font-body-sm text-body-sm font-medium shadow-sm transition-colors whitespace-nowrap cursor-pointer"
          >
            管線歷史監控
          </a>
        )}
      </div>
    </section>
  );
}
