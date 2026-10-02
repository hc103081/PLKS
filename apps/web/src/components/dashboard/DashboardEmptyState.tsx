import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { SEMESTERS, type Semester } from "../../types/course";
import { CreateCourseModal } from "./CreateCourseModal";

interface DashboardEmptyStateProps {
  semester: Semester;
  onCreateCourse: () => void;
  onImportSchedule: () => void;
  onBrowseArchive: () => void;
}

export function DashboardEmptyState({
  semester,
  onCreateCourse,
  onImportSchedule,
  onBrowseArchive,
}: DashboardEmptyStateProps) {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);

  // Handle keyboard shortcuts
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "n") {
      e.preventDefault();
      setShowCreateModal(true);
    }
    if (e.key === "Escape") {
      setShowCreateModal(false);
      setShowImportModal(false);
    }
  }, []);

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  const currentSemesterLabel = `${semester.key} (${semester.label})`;

  // Helper function for modals using createPortal
  const renderModal = (isOpen: boolean, onClose: () => void, children: React.ReactNode) => {
    if (!isOpen) return null;
    return createPortal(
      <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-4">
        <div className="relative w-full max-w-lg bg-surface-container-high rounded-2xl shadow-2xl p-6 sm:p-8 space-y-6">
          {children}
          <button
            className="absolute top-4 right-4 w-8 h-8 rounded-lg bg-surface-container flex items-center justify-center text-on-surface-variant hover:text-on-surface hover:bg-surface-container-highest transition-colors"
            onClick={onClose}
            aria-label="關閉"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>
      </div>,
      document.body,
    );
  };

  return (
    <>
      {/* Empty State Main Content */}
      <div className="w-full max-w-[1440px] mx-auto px-4 lg:px-8 py-10 lg:py-14 flex flex-col items-center">
        {/* Central Dedicated Empty State Cockpit */}
        <div className="relative w-full max-w-4xl flex flex-col items-center text-center">
          {/* Vector Illustration & Constellation Halo */}
          <div className="relative w-72 h-64 sm:w-80 sm:h-72 flex items-center justify-center mb-6">
            {/* Soft background radial glows */}
            <div className="absolute w-60 h-60 rounded-full bg-primary/10 blur-3xl -top-4 pointer-events-none"></div>
            <div className="absolute w-48 h-48 rounded-full bg-secondary-container/15 blur-2xl -bottom-2 pointer-events-none"></div>
            {/* Inline Detailed Futuristic Academic Desk & Constellation SVG */}
            <svg
              className="relative z-10 w-full h-full drop-shadow-[0_12px_32px_rgba(0,0,0,0.6)]"
              fill="none"
              viewBox="0 0 320 280"
              xmlns="http://www.w3.org/2000/svg"
            >
              {/* Graph Grid Plane Perspective */}
              <ellipse cx="160" cy="220" fill="#181c24" opacity="0.8" rx="130" ry="34"></ellipse>
              <ellipse
                className="text-primary"
                cx="160"
                cy="220"
                rx="90"
                ry="22"
                stroke="currentColor"
                strokeDasharray="3 3"
                strokeOpacity="0.25"
              ></ellipse>
              {/* Desk Workspace Platform */}
              <path d="M70 215 L160 240 L250 215 L160 190 Z" fill="#262a33"></path>
              <path d="M70 215 L160 240 L160 246 L70 221 Z" fill="#1c2028"></path>
              <path d="M250 215 L160 240 L160 246 L250 221 Z" fill="#181c24"></path>
              {/* Open Course Binder / Synthesizer Tome */}
              <path d="M120 185 L160 195 L160 160 L120 152 Z" fill="#31353e"></path>
              <path d="M200 185 L160 195 L160 160 L200 152 Z" fill="#353942"></path>
              <path
                d="M160 160 L160 195"
                stroke="#7bd0ff"
                strokeLinecap="round"
                strokeWidth="1.5"
              ></path>
              {/* Holographic Floating Node Network (Academic Knowledge Constellation) */}
              {/* Constellation Edges */}
              <line
                stroke="#8083ff"
                strokeDasharray="2 3"
                strokeOpacity="0.4"
                strokeWidth="1.5"
                x1="160"
                x2="105"
                y1="130"
                y2="90"
              ></line>
              <line
                stroke="#7bd0ff"
                strokeDasharray="2 3"
                strokeOpacity="0.4"
                strokeWidth="1.5"
                x1="160"
                x2="215"
                y1="130"
                y2="85"
              ></line>
              <line
                stroke="#b76dff"
                strokeOpacity="0.35"
                strokeWidth="1.5"
                x1="105"
                x2="160"
                y1="90"
                y2="52"
              ></line>
              <line
                stroke="#b76dff"
                strokeOpacity="0.35"
                strokeWidth="1.5"
                x1="215"
                x2="160"
                y1="85"
                y2="52"
              ></line>
              <line
                stroke="#7bd0ff"
                strokeDasharray="2 2"
                strokeOpacity="0.25"
                strokeWidth="1.2"
                x1="105"
                x2="68"
                y1="90"
                y2="120"
              ></line>
              <line
                stroke="#8083ff"
                strokeDasharray="2 2"
                strokeOpacity="0.25"
                strokeWidth="1.2"
                x1="215"
                x2="252"
                y1="85"
                y2="122"
              ></line>
              {/* Center Nucleus Node */}
              <circle cx="160" cy="130" fill="#0f131c" r="14"></circle>
              <circle cx="160" cy="130" fill="#8083ff" r="10"></circle>
              <circle cx="160" cy="130" fill="#ffffff" r="4"></circle>
              <circle
                cx="160"
                cy="130"
                r="18"
                stroke="#8083ff"
                strokeOpacity="0.4"
                strokeWidth="1.5"
              ></circle>
              {/* Knowledge Node Left (Raw Multimodal Inputs) */}
              <circle cx="105" cy="90" fill="#0f131c" r="9"></circle>
              <circle cx="105" cy="90" fill="#7bd0ff" r="6"></circle>
              <circle
                cx="105"
                cy="90"
                r="13"
                stroke="#7bd0ff"
                strokeOpacity="0.3"
                strokeWidth="1"
              ></circle>
              {/* Knowledge Node Right (Synthesized Obsidian Wiki) */}
              <circle cx="215" cy="85" fill="#0f131c" r="9"></circle>
              <circle cx="215" cy="85" fill="#b76dff" r="6"></circle>
              <circle
                cx="215"
                cy="85"
                r="13"
                stroke="#b76dff"
                strokeOpacity="0.3"
                strokeWidth="1"
              ></circle>
              {/* Apex AI Synthesis Node */}
              <circle cx="160" cy="52" fill="#c0c1ff" r="7"></circle>
              <circle
                cx="160"
                cy="52"
                r="11"
                stroke="#c0c1ff"
                strokeOpacity="0.4"
                strokeWidth="1"
              ></circle>
              {/* Secondary Outer Satellite Nodes */}
              <circle cx="68" cy="120" fill="#7bd0ff" opacity="0.8" r="4.5"></circle>
              <circle cx="252" cy="122" fill="#8083ff" opacity="0.8" r="4.5"></circle>
              {/* AI Vector Sparkles / Floating Glyphs */}
              <path
                d="M225 42 L228 48 L234 51 L228 54 L225 60 L222 54 L216 51 L222 48 Z"
                fill="#ddb7ff"
              ></path>
              <path
                d="M92 145 L94 149 L98 151 L94 153 L92 157 L90 153 L86 151 L90 149 Z"
                fill="#7bd0ff"
              ></path>
              <path
                d="M157 95 L159 99 L163 101 L159 103 L157 107 L155 103 L151 101 L155 99 Z"
                fill="#ffffff"
                opacity="0.9"
              ></path>
              {/* Flowing Data Light Conduits */}
              <path
                d="M160 148 C160 162 160 166 160 178"
                stroke="#7bd0ff"
                strokeDasharray="1 4"
                strokeLinecap="round"
                strokeWidth="2"
              ></path>
            </svg>
            {/* Status Microchip Badge overlay */}
            <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-surface-container-high shadow-lg flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-secondary-container"></span>
              <span className="font-label-code-sm text-label-code-sm text-on-surface-variant">
                Cognitive Engine Standby
              </span>
            </div>
          </div>
          {/* Typography Cockpit Section */}
          <div className="space-y-3 max-w-2xl px-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-surface-container font-label-caps text-label-caps text-secondary-container tracking-widest uppercase">
              <span className="material-symbols-outlined text-[15px]">folder_off</span>
              Workspace Empty Canvas
            </div>
            <h1 className="font-headline-lg text-headline-lg text-on-surface tracking-tight">
              {currentSemesterLabel} 尚無任何課程
            </h1>
            <p className="font-body-lg text-body-lg text-on-surface-variant leading-relaxed max-w-xl mx-auto">
              開始建立您的第一堂新學期課程，或者透過匯入課表快速啟動 AI
              多模態知識引擎，建構您的專屬第二大腦。
            </p>
          </div>
          {/* Call To Actions Array */}
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3.5 w-full max-w-xl">
            {/* Primary Action */}
            <button
              className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-primary-container hover:bg-primary text-on-primary font-title-md text-title-md font-semibold transition-all shadow-xl shadow-primary-container/30 hover:shadow-primary-container/50 flex items-center justify-center gap-2.5 group"
              onClick={onCreateCourse}
            >
              <span className="material-symbols-outlined text-[20px] transition-transform group-hover:rotate-90 duration-300">
                add
              </span>
              <span>新增第一堂課程</span>
              <span className="font-label-code-sm text-label-code-sm text-on-primary/70 bg-black/20 px-2 py-0.5 rounded ml-1">
                ⌘N
              </span>
            </button>
            {/* Secondary Action: LMS Import */}
            <button
              className="w-full sm:w-auto px-5 py-3.5 rounded-xl bg-surface-container hover:bg-surface-container-high text-on-surface font-body-md text-body-md font-medium transition-colors shadow-sm flex items-center justify-center gap-2"
              onClick={() => setShowImportModal(true)}
            >
              <span className="material-symbols-outlined text-[19px] text-secondary-container">
                input
              </span>
              <span>從選課系統 / iLMS 匯入課表</span>
            </button>
            {/* Tertiary Action: Archive Browser */}
            <button
              className="w-full sm:w-auto px-4 py-3.5 rounded-xl bg-surface-container-low hover:bg-surface-container text-on-surface-variant hover:text-on-surface font-body-md text-body-md transition-colors flex items-center justify-center gap-1.5"
              onClick={onBrowseArchive}
            >
              <span className="material-symbols-outlined text-[18px]">inventory_2</span>
              <span>瀏覽歷年歸檔</span>
            </button>
          </div>
          {/* Quick Command Bar Cue */}
          <div className="mt-5 flex items-center gap-2 text-on-surface-variant font-label-code-sm text-label-code-sm">
            <span className="material-symbols-outlined text-sm text-on-surface-variant">
              terminal
            </span>
            <span>貼上課程大綱代碼或拖曳 syllabus.pdf 至此視窗直接解析</span>
          </div>
        </div>
        {/* Quick Setup Guide: 3 Step Synthesis Pipeline */}
        <div className="w-full mt-14 pt-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2.5">
              <div className="w-2 h-5 rounded-full bg-primary-container"></div>
              <h2 className="font-title-md text-title-md text-on-surface font-semibold tracking-tight">
                三步驟啟動學術知識管線 (Pipeline Overview)
              </h2>
            </div>
            <span className="font-label-code-sm text-label-code-sm text-on-surface-variant">
              DAG Workflow Engine v2.4
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* Step 1 Card */}
            <div className="relative bg-surface-container rounded-xl p-5 shadow-sm transition-all hover:-translate-y-1 hover:bg-surface-container-high flex flex-col justify-between group">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-surface-container-highest text-secondary-container font-label-code-md text-label-code-md font-bold">
                    01
                  </span>
                  <span className="font-label-caps text-label-caps text-secondary-container px-2.5 py-0.5 rounded-full bg-secondary-container/10">
                    多模態對齊
                  </span>
                </div>
                <div className="space-y-1.5">
                  <h3 className="font-headline-sm text-headline-sm text-on-surface font-semibold flex items-center gap-2">
                    上傳原始教材
                    <span className="material-symbols-outlined text-secondary-container text-[18px] opacity-0 group-hover:opacity-100 transition-opacity">
                      cloud_upload
                    </span>
                  </h3>
                  <p className="font-body-md text-body-md text-on-surface-variant leading-relaxed">
                    支援課堂高音質錄音 MP3/M4A 與教授投影片
                    PDF/PPTX，由系統進行音訊時間碼與投影片視覺特徵精確對齊。
                  </p>
                </div>
              </div>
              {/* Feature Meta Chips */}
              <div className="mt-6 pt-4 flex flex-wrap gap-1.5">
                <span className="px-2 py-1 rounded bg-surface-container-lowest font-label-code-sm text-label-code-sm text-on-surface-variant">
                  Whisper-Large V3
                </span>
                <span className="px-2 py-1 rounded bg-surface-container-lowest font-label-code-sm text-label-code-sm text-on-surface-variant">
                  OCR 幾何辨識
                </span>
                <span className="px-2 py-1 rounded bg-surface-container-lowest font-label-code-sm text-label-code-sm text-on-surface-variant">
                  LaTeX 轉寫
                </span>
              </div>
            </div>
            {/* Step 2 Card */}
            <div className="relative bg-surface-container rounded-xl p-5 shadow-sm transition-all hover:-translate-y-1 hover:bg-surface-container-high flex flex-col justify-between group">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-surface-container-highest text-primary font-label-code-md text-label-code-md font-bold">
                    02
                  </span>
                  <span className="font-label-caps text-label-caps text-primary px-2.5 py-0.5 rounded-full bg-primary/10">
                    6-Stage DAG
                  </span>
                </div>
                <div className="space-y-1.5">
                  <h3 className="font-headline-sm text-headline-sm text-on-surface font-semibold flex items-center gap-2">
                    啟動 AI 萃取管線
                    <span className="material-symbols-outlined text-primary text-[18px] opacity-0 group-hover:opacity-100 transition-opacity">
                      schema
                    </span>
                  </h3>
                  <p className="font-body-md text-body-md text-on-surface-variant leading-relaxed">
                    自動調度六階段有向無環圖，提煉原子概念節點、雙向連結樹狀大綱，並即時匯出符合
                    Obsidian 規範的 Markdown 庫。
                  </p>
                </div>
              </div>
              {/* Feature Meta Chips */}
              <div className="mt-6 pt-4 flex flex-wrap gap-1.5">
                <span className="px-2 py-1 rounded bg-surface-container-lowest font-label-code-sm text-label-code-sm text-on-surface-variant">
                  實體概念圖
                </span>
                <span className="px-2 py-1 rounded bg-surface-container-lowest font-label-code-sm text-label-code-sm text-on-surface-variant">
                  [[雙向反向連結]]
                </span>
                <span className="px-2 py-1 rounded bg-surface-container-lowest font-label-code-sm text-label-code-sm text-on-surface-variant">
                  YAML 語義標籤
                </span>
              </div>
            </div>
            {/* Step 3 Card */}
            <div className="relative bg-surface-container rounded-xl p-5 shadow-sm transition-all hover:-translate-y-1 hover:bg-surface-container-high flex flex-col justify-between group">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-surface-container-highest text-tertiary font-label-code-md text-label-code-md font-bold">
                    03
                  </span>
                  <span className="font-label-caps text-label-caps text-tertiary px-2.5 py-0.5 rounded-full bg-tertiary/10">
                    認知增強
                  </span>
                </div>
                <div className="space-y-1.5">
                  <h3 className="font-headline-sm text-headline-sm text-on-surface font-semibold flex items-center gap-2">
                    智慧伴讀與測驗
                    <span className="material-symbols-outlined text-tertiary text-[18px] opacity-0 group-hover:opacity-100 transition-opacity">
                      smart_toy
                    </span>
                  </h3>
                  <p className="font-body-md text-body-md text-on-surface-variant leading-relaxed">
                    利用 Sidekick AI 導師進行深層 Socratic 詰問、8 題自動通關概念測驗，搭配 FSRS
                    間隔重複演算法鞏固長期記憶。
                  </p>
                </div>
              </div>
              {/* Feature Meta Chips */}
              <div className="mt-6 pt-4 flex flex-wrap gap-1.5">
                <span className="px-2 py-1 rounded bg-surface-container-lowest font-label-code-sm text-label-code-sm text-on-surface-variant">
                  蘇格拉底追問
                </span>
                <span className="px-2 py-1 rounded bg-surface-container-lowest font-label-code-sm text-label-code-sm text-on-surface-variant">
                  FSRS 記憶曲線
                </span>
                <span className="px-2 py-1 rounded bg-surface-container-lowest font-label-code-sm text-label-code-sm text-on-surface-variant">
                  弱點追蹤
                </span>
              </div>
            </div>
          </div>
        </div>
        {/* Active Pipeline Telemetry & Readiness Monitor */}
        <div className="w-full mt-6 bg-surface-container-low rounded-xl p-4 sm:p-5 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3 w-full md:w-auto">
            <div className="w-10 h-10 rounded-lg bg-surface-container flex items-center justify-center text-secondary-container">
              <span className="material-symbols-outlined text-[22px]">dns</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-title-md text-title-md text-on-surface font-medium">
                  後台管線運行隊列
                </span>
                <span className="px-2 py-0.5 rounded-full bg-surface-container-high font-label-code-sm text-label-code-sm text-tertiary">
                  STANDBY
                </span>
              </div>
              <p className="font-body-sm text-body-sm text-on-surface-variant">
                節點計算資源已預熱，等待課程 syllabus 或音訊投影片上傳任務
              </p>
            </div>
          </div>
          {/* Counters Metrics Badge Strip */}
          <div className="flex items-center gap-2 w-full md:w-auto justify-end flex-wrap">
            <div className="px-3.5 py-1.5 rounded-lg bg-surface-container flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-secondary-container"></span>
              <span className="font-label-code-sm text-label-code-sm text-on-surface-variant">
                進行中
              </span>
              <span className="font-label-code-sm text-label-code-sm text-on-surface font-semibold">
                0
              </span>
            </div>
            <div className="px-3.5 py-1.5 rounded-lg bg-surface-container flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-on-surface-variant"></span>
              <span className="font-label-code-sm text-label-code-sm text-on-surface-variant">
                待上傳
              </span>
              <span className="font-label-code-sm text-label-code-sm text-on-surface font-semibold">
                0
              </span>
            </div>
            <div className="px-3.5 py-1.5 rounded-lg bg-surface-container flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-error"></span>
              <span className="font-label-code-sm text-label-code-sm text-on-surface-variant">
                需重試
              </span>
              <span className="font-label-code-sm text-label-code-sm text-on-surface font-semibold">
                0
              </span>
            </div>
            <div className="px-3.5 py-1.5 rounded-lg bg-surface-container flex items-center gap-1.5 text-on-surface-variant font-label-code-sm text-label-code-sm">
              <span className="material-symbols-outlined text-[16px] text-tertiary">
                cloud_done
              </span>
              <span>向量引擎同步完成</span>
            </div>
          </div>
        </div>
      </div>

      {/* Create Course Modal */}
      {renderModal(
        showCreateModal,
        () => setShowCreateModal(false),
        <div className="space-y-6">
          <div className="space-y-1">
            <span className="font-label-caps text-label-caps text-primary tracking-widest uppercase">
              Course Creation Wizard
            </span>
            <h2 className="font-headline-sm text-headline-sm text-on-surface font-semibold">
              新增 {currentSemesterLabel} 課程
            </h2>
          </div>
          <CreateCourseModal
            isOpen={showCreateModal}
            onClose={() => setShowCreateModal(false)}
            onSubmit={async (data) => {
              // The actual submission is handled by the parent
              onCreateCourse();
              setShowCreateModal(false);
            }}
          />
        </div>,
      )}

      {/* Import Modal */}
      {renderModal(
        showImportModal,
        () => setShowImportModal(false),
        <div className="space-y-6">
          <div className="space-y-1">
            <span className="font-label-caps text-label-caps text-secondary-container tracking-widest uppercase">
              Academic Schedule Importer
            </span>
            <h2 className="font-headline-sm text-headline-sm text-on-surface font-semibold">
              匯入 {currentSemesterLabel} 選課課表
            </h2>
          </div>
          <div className="space-y-4">
            {/* Dropzone Box */}
            <div className="w-full p-8 rounded-2xl bg-surface-container-lowest flex flex-col items-center justify-center text-center cursor-pointer hover:bg-surface-container transition-colors group">
              <div className="w-12 h-12 rounded-xl bg-surface-container flex items-center justify-center text-secondary-container mb-3 group-hover:scale-110 transition-transform">
                <span className="material-symbols-outlined text-2xl">table_chart</span>
              </div>
              <span className="font-title-md text-title-md text-on-surface font-medium">
                拖曳選課確認清單 (HTML / PDF / ICS)
              </span>
              <span className="font-body-sm text-body-sm text-on-surface-variant mt-1">
                支援臺大、清大、交大、成大、臺科大等全臺大專院校選課確認單格式
              </span>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-surface-container"></div>
              <span className="font-label-code-sm text-label-code-sm text-on-surface-variant">
                或連結學校 iLMS 系統帳號
              </span>
              <div className="flex-1 h-px bg-surface-container"></div>
            </div>
            <div className="p-4 rounded-xl bg-surface-container-lowest flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-tertiary">vpn_key</span>
                <div className="flex flex-col text-left">
                  <span className="font-body-md text-body-md text-on-surface font-medium">
                    OAuth 2.0 校園單一簽入 (SSO)
                  </span>
                  <span className="font-body-sm text-body-sm text-on-surface-variant">
                    快速同步已選修之 6 門學術課程
                  </span>
                </div>
              </div>
              <button
                className="px-3.5 py-1.5 rounded-lg bg-surface-container hover:bg-surface-container-highest text-secondary-container font-label-code-sm text-label-code-sm transition-colors"
                type="button"
              >
                前往授權
              </button>
            </div>
          </div>
          <div className="pt-2 flex items-center justify-end">
            <button
              className="px-4 py-2 rounded-xl bg-surface-container text-on-surface-variant hover:text-on-surface font-body-md text-body-md transition-colors"
              onClick={() => setShowImportModal(false)}
            >
              關閉
            </button>
          </div>
        </div>,
      )}
    </>
  );
}
