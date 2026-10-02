// apps/web/src/pages/Dashboard.tsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CourseCard } from "../components/dashboard/CourseCard";
import { CreateCourseModal } from "../components/dashboard/CreateCourseModal";
import { DashboardEmptyState } from "../components/dashboard/DashboardEmptyState";
import { PipelineSummary } from "../components/dashboard/PipelineSummary";
import {
  createCourse,
  getCourses,
  getPipelineSummary,
  startSession,
  uploadFile,
} from "../services/api";
import { useDashboardStore } from "../stores/dashboardStore";
import type {
  CourseCardData,
  PipelineSummary as PipelineSummaryType,
  Semester,
} from "../types/course";
import { SEMESTERS } from "../types/course";

export function Dashboard() {
  const navigate = useNavigate();
  const {
    semesterFilter,
    viewMode,
    createModal,
    setSemesterFilter,
    setViewMode,
    closeCreateModal,
  } = useDashboardStore();
  const [courses, setCourses] = useState<CourseCardData[]>([]);
  const [pipelineSummary, setPipelineSummary] = useState<PipelineSummaryType>({
    inProgress: 0,
    pending: 0,
    needsAttention: 0,
    healthy: true,
    healthPercentage: 100,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedSemester = SEMESTERS.find((s) => s.key === semesterFilter);
  const resolvedSemester = (selectedSemester ?? SEMESTERS[2]) as Semester;

  useEffect(() => {
    loadDashboard();
  }, [semesterFilter]);

  async function loadDashboard() {
    setIsLoading(true);
    try {
      let semesterCode: string | undefined;
      if (semesterFilter !== "all") {
        semesterCode = semesterFilter;
      }
      const coursesData = await getCourses(semesterCode);
      if (coursesData && coursesData.courses) {
        setCourses(coursesData.courses);
      } else {
        setCourses([]);
      }

      const pipelineData = await getPipelineSummary();
      setPipelineSummary(pipelineData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "載入儀表板失敗");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleStartCourse(courseId: string, sessionId?: string) {
    try {
      setIsLoading(true);
      if (sessionId) {
        navigate(`/course/${courseId}?tab=outline&session=${sessionId}`);
      } else {
        await startSession({ sessionId: crypto.randomUUID(), courseId });
        navigate(`/course/${courseId}?tab=raw`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "啟動課程失敗");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleUploadMaterials(courseId: string) {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".mp3,.m4a,.wav,.pdf,.pptx";
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        try {
          setIsLoading(true);
          await uploadFile(file, courseId);
          await loadDashboard();
        } catch (err) {
          setError(err instanceof Error ? err.message : "上傳失敗");
        } finally {
          setIsLoading(false);
        }
      }
    };
    input.click();
  }

  async function handleViewPipeline(sessionId: string) {
    navigate(
      `/course/${courses.find((c) => c.latestSessionId === sessionId)?.id}?tab=pipeline&session=${sessionId}`,
    );
  }

  async function handleRetryPipeline(sessionId: string) {
    handleViewPipeline(sessionId);
  }

  const handleCreateCourse = async (data: {
    code: string;
    name: string;
    semester: string;
    credits: number;
    type: "required" | "elective" | "general";
    instructor?: string;
    location?: string;
  }) => {
    try {
      setIsLoading(true);
      await createCourse(data);
      await loadDashboard();
      closeCreateModal();
    } catch (err) {
      setError(err instanceof Error ? err.message : "建立課程失敗");
    } finally {
      setIsLoading(false);
    }
  };

  const handleImportSchedule = () => {
    console.log("Import schedule clicked");
  };

  const handleBrowseArchive = () => {
    console.log("Browse archive clicked");
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-surface-container-lowest">
        載入中...
      </div>
    );
  }

  const showEmptyState = courses.length === 0;

  const currentSemesterLabel = `${resolvedSemester.year - 1911}-${resolvedSemester.term === 1 ? 1 : 2} ${resolvedSemester.label}`;

  return (
    <div className="min-h-screen bg-[#0B0F17] font-body-md text-body-md text-[#F8FAFC] antialiased">
      {/* Fixed Header - EXACTLY matching design HTML */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-[#111827]/90 backdrop-blur-md border-b border-[#1E293B] shadow-[0_4px_20px_rgba(0,0,0,0.4)]">
        <div className="h-16 w-full max-w-[1440px] mx-auto px-4 lg:px-8 flex items-center justify-between gap-space-lg">
          <div className="flex items-center gap-space-lg">
            <div className="flex items-center gap-space-sm">
              <div className="w-9 h-9 rounded-lg bg-[#6366F1] flex items-center justify-center text-white shadow-lg shadow-[#6366F1]/20">
                <span className="material-symbols-outlined text-[20px]">hub</span>
              </div>
              <span className="font-headline-sm text-headline-sm text-[#F8FAFC] tracking-tight font-bold">
                PLKS
              </span>
            </div>
            <span className="hidden sm:inline-flex items-center px-space-sm py-space-xs rounded-full bg-[#182234] border border-[#1E293B] text-[#94A3B8] font-label-code-sm text-label-code-sm">
              113-2 學期
            </span>
          </div>
          <div className="flex-1 max-w-md hidden md:block">
            <button
              className="w-full flex items-center justify-between px-space-md py-space-sm rounded-lg bg-[#182234] border border-[#1E293B] text-[#94A3B8] hover:bg-[#1E293B] hover:text-[#F8FAFC] hover:border-slate-700 transition-colors"
              type="button"
            >
              <div className="flex items-center gap-space-sm">
                <span className="material-symbols-outlined text-[18px]">search</span>
                <span className="font-body-sm text-body-sm">搜尋課程、概念節點或教材...</span>
              </div>
              <kbd className="px-space-xs py-0.5 rounded bg-[#111827] border border-[#1E293B] text-[#94A3B8] font-label-code-sm text-label-code-sm shadow-sm">
                ⌘K
              </kbd>
            </button>
          </div>
          <div className="flex items-center gap-space-lg">
            <nav className="hidden lg:flex items-center gap-space-xs">
              <a
                aria-current="page"
                className="px-space-md py-space-sm transition-colors bg-[#6366F1] text-white font-bold rounded-lg shadow-md shadow-[#6366F1]/25"
                href="#"
              >
                課程儀表板
              </a>
              <a
                className="px-space-md py-space-sm text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-[#182234] transition-colors rounded-lg font-body-md text-body-md"
                href="#"
              >
                全域圖譜
              </a>
            </nav>
            <div className="hidden xl:flex items-center gap-space-xs px-space-sm py-space-xs rounded-full bg-[#182234] border border-[#1E293B] text-[#94A3B8]">
              <span className="w-2 h-2 rounded-full bg-[#10B981] shadow-[0_0_8px_#10B981] animate-pulse"></span>
              <span className="font-label-code-sm text-label-code-sm text-[#CBD5E1]">
                索引管線就緒
              </span>
            </div>
            <div className="flex items-center gap-space-sm">
              <button
                className="inline-flex items-center gap-space-xs px-space-md py-space-sm rounded-lg bg-[#6366F1] hover:bg-[#4F46E5] text-white font-body-sm text-body-sm transition-all shadow-md shadow-[#6366F1]/25 hover:shadow-indigo-500/40"
                onClick={() => useDashboardStore.getState().openCreateModal("create")}
              >
                <span className="material-symbols-outlined text-[16px]">add</span>
                <span className="hidden sm:inline">新增課程</span>
              </button>
              <button
                aria-label="通知"
                className="w-9 h-9 rounded-lg flex items-center justify-center text-[#94A3B8] hover:bg-[#182234] hover:text-[#F8FAFC] transition-colors border border-transparent hover:border-[#1E293B]"
                type="button"
              >
                <span className="material-symbols-outlined text-[20px]">notifications</span>
              </button>
              <button
                aria-label="系統說明文件"
                className="w-9 h-9 rounded-lg flex items-center justify-center text-[#94A3B8] hover:bg-[#182234] hover:text-[#F8FAFC] transition-colors hidden sm:flex border border-transparent hover:border-[#1E293B]"
                type="button"
              >
                <span className="material-symbols-outlined text-[20px]">help</span>
              </button>
              <div className="flex items-center gap-space-sm pl-space-sm border-l border-[#1E293B]">
                <div className="hidden md:flex flex-col text-right">
                  <span className="font-body-sm text-body-sm font-bold text-[#F8FAFC] leading-tight">
                    Alex Chen
                  </span>
                  <span className="font-label-code-sm text-label-code-sm text-[#94A3B8]">
                    資訊工程學系
                  </span>
                </div>
                <div className="w-8 h-8 rounded-full bg-[#6366F1] flex items-center justify-center ring-2 ring-[#1E293B]">
                  <span className="material-symbols-outlined text-white text-[18px]">person</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="w-full pt-16 bg-[#0B0F17]">
        <div className="w-full px-4 lg:px-8 py-8 flex flex-col gap-8 max-w-[1440px] mx-auto min-h-[calc(100vh-4rem)]">
          {/* 1. Page Header & Operational Toolbar - EXACTLY matching design */}
          <section className="flex flex-col lg:flex-row lg:items-center justify-between gap-space-lg">
            <div className="flex flex-col gap-space-xs">
              <div className="flex items-center gap-space-sm">
                <span className="px-space-sm py-0.5 rounded-full bg-[#312E81]/80 border border-[#6366F1]/30 text-[#c7d2fe] font-label-code-sm text-label-code-sm tracking-wide uppercase font-semibold">
                  工作駕駛艙
                </span>
                <span className="w-1.5 h-1.5 rounded-full bg-[#10B981] shadow-[0_0_6px_#10B981]"></span>
                <span className="font-label-code-sm text-label-code-sm text-[#94A3B8]">
                  實時同步 2 分鐘前
                </span>
              </div>
              <h1 className="font-headline-lg text-headline-lg text-[#F8FAFC] tracking-tight font-bold">
                學術學習與知識總覽
              </h1>
              <p className="font-body-md text-body-md text-[#94A3B8]">
                管理各學期修習課程、教材處理管線與多維複習圖譜進度
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-space-sm sm:gap-space-md">
              {/* Quick Search */}
              <div className="relative flex-1 sm:w-72">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-[#94A3B8]">
                  search
                </span>
                <input
                  className="w-full pl-9 pr-12 py-space-sm rounded-lg bg-[#131C2E] border border-[#1E293B] text-body-sm font-body-sm text-[#F8FAFC] placeholder:text-[#94A3B8] shadow-sm focus:outline-none focus:border-[#6366F1] focus:ring-1 focus:ring-[#6366F1]"
                  placeholder="搜尋課程名稱、代號 CS101..."
                  type="text"
                />
                <kbd className="absolute right-2.5 top-1/2 -translate-y-1/2 px-1.5 py-0.5 rounded bg-[#0F172A] border border-[#1E293B] font-label-code-sm text-label-code-sm text-[#94A3B8]">
                  ⌘F
                </kbd>
              </div>
              {/* View Switcher */}
              <div className="flex items-center p-1 rounded-lg bg-[#131C2E] border border-[#1E293B] shadow-sm">
                <button
                  aria-label="格狀檢視"
                  className={`flex items-center justify-center p-1.5 rounded ${viewMode === "grid" ? "bg-[#1E293B] text-[#38BDF8] shadow-sm" : "text-[#94A3B8]"} transition-all`}
                  onClick={() => setViewMode("grid")}
                >
                  <span className="material-symbols-outlined text-[18px]">grid_view</span>
                </button>
                <button
                  aria-label="清單檢視"
                  className={`flex items-center justify-center p-1.5 rounded ${viewMode === "list" ? "bg-[#1E293B] text-[#38BDF8] shadow-sm" : "text-[#94A3B8]"} hover:text-[#F8FAFC] transition-all`}
                  onClick={() => setViewMode("list")}
                >
                  <span className="material-symbols-outlined text-[18px]">view_agenda</span>
                </button>
              </div>
              {/* Modal Trigger CTA */}
              <button
                className="inline-flex items-center gap-space-xs px-space-md py-space-sm rounded-lg bg-[#6366F1] hover:bg-[#4F46E5] text-white font-body-sm text-body-sm font-medium transition-all shadow-md shadow-[#6366F1]/25 hover:shadow-indigo-500/40"
                onClick={() => useDashboardStore.getState().openCreateModal("create")}
              >
                <span className="material-symbols-outlined text-[18px]">add_circle</span>
                <span>新增課程</span>
              </button>
            </div>
          </section>

          {/* 2. Semester Horizon Ribbon - EXACTLY matching plks_dashboard_empty_state design */}
          <section className="w-full bg-surface-container-low shadow-sm">
            <div className="max-w-[1440px] mx-auto px-4 lg:px-8 py-3 flex items-center justify-between gap-4 overflow-x-auto">
              <div className="flex items-center gap-1.5 flex-nowrap py-0.5">
                <span className="flex items-center gap-1 font-label-caps text-label-caps text-on-surface-variant uppercase tracking-wider mr-2 select-none">
                  <span className="material-symbols-outlined text-sm text-secondary">
                    history_edu
                  </span>
                  學期視角
                </span>
                {SEMESTERS.slice(0, 8).map((s) => {
                  const isCurrent = s.key === "106-2"; // 大四下 (當前)
                  return (
                    <button
                      key={s.key}
                      className={`px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap font-label-code-sm text-label-code-sm ${
                        isCurrent
                          ? "bg-surface-container-highest text-primary font-semibold shadow-md flex items-center gap-1.5"
                          : "bg-surface-container hover:bg-surface-container-high text-on-surface-variant hover:text-on-surface"
                      }`}
                    >
                      {isCurrent && (
                        <span className="w-1.5 h-1.5 rounded-full bg-secondary animate-pulse"></span>
                      )}
                      {isCurrent ? `113-2 ${s.label} (當前)` : s.label}
                    </button>
                  );
                })}
                <button className="px-3 py-1.5 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface-variant hover:text-on-surface font-label-code-sm text-label-code-sm transition-colors whitespace-nowrap">
                  全部歷年
                </button>
              </div>
              {/* Quick Semester Metadata Indicator */}
              <div className="hidden xl:flex items-center gap-3 font-label-code-sm text-label-code-sm text-on-surface-variant flex-shrink-0">
                <span className="inline-flex items-center gap-1 bg-surface-container px-2.5 py-1 rounded-md text-on-surface-variant">
                  <span className="material-symbols-outlined text-[15px] text-tertiary">
                    calendar_month
                  </span>
                  學期週次: W01 整備週
                </span>
                <span className="inline-flex items-center gap-1 bg-surface-container px-2.5 py-1 rounded-md text-secondary">
                  <span className="material-symbols-outlined text-[15px]">neurology</span>
                  AI 概念記憶體: 0 / 64 GB
                </span>
              </div>
            </div>
          </section>

          {showEmptyState ? (
            // Empty State
            <DashboardEmptyState
              semester={resolvedSemester}
              onCreateCourse={() => useDashboardStore.getState().openCreateModal("create")}
              onImportSchedule={handleImportSchedule}
              onBrowseArchive={handleBrowseArchive}
            />
          ) : (
            // Course Grid & Pipeline Summary
            <>
              {/* 3. Course Grid - EXACTLY matching design: grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 */}
              <div
                className={`${viewMode === "grid" ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" : "flex flex-col gap-6"} w-full`}
                id="course-container"
              >
                {courses.map((course) => (
                  <CourseCard
                    key={course.id}
                    course={course}
                    onViewPipeline={handleViewPipeline}
                    onRetryPipeline={handleRetryPipeline}
                    onUploadMaterials={handleUploadMaterials}
                    onMoreActions={() => {}}
                  />
                ))}
              </div>

              {/* 4. Pipeline Summary Bar - EXACTLY matching design */}
              <PipelineSummary summary={pipelineSummary} />
            </>
          )}

          {/* Create Course Modal */}
          {createModal.open && (
            <CreateCourseModal
              isOpen={createModal.open}
              onClose={closeCreateModal}
              onSubmit={handleCreateCourse}
              {...(createModal.mode === "edit" ? { initialData: null as any } : {})}
            />
          )}
        </div>
      </main>

      {/* Footer - EXACTLY matching design */}
      <footer className="w-full bg-[#0B0F17] border-t border-[#1E293B] py-6">
        <div className="w-full max-w-[1440px] mx-auto px-4 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-space-md font-body-sm text-body-sm text-[#94A3B8]">
          <div className="flex items-center gap-space-sm">
            <span className="font-bold text-[#F8FAFC]">PLKS</span>
            <span>© 2025 個人學習與學術知識管理系統</span>
          </div>
          <div className="flex items-center gap-space-lg">
            <a className="hover:text-[#F8FAFC] transition-colors" href="#">
              知識庫規範
            </a>
            <a className="hover:text-[#F8FAFC] transition-colors" href="#">
              節點同步日誌
            </a>
            <a className="hover:text-[#F8FAFC] transition-colors" href="#">
              運行狀態
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
