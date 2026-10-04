# PLKS UI 整合設計文件

> 整合 `temp/` 目錄下 14 個 HTML 原型至 `apps/web/` React + TypeScript + Vite 專案
> 基於 Obsidian Cockpit 設計系統 (DESIGN.md) + AGENTS.md 架構規範

---

## 1. 專案背景與目標

### 1.1 現狀
- `apps/web/`：已有 React 18 + TypeScript + Vite + Tailwind CSS 基礎架構
- Tailwind 設定已包含 DESIGN.md 核心色彩、字體、間距
- 已有頁面：Dashboard、CourseConsole、QuizPlayer、SidekickChat
- 已有元件：CourseCard、CreateCourseModal、PipelineSummary、SemesterTabs、TabRaw/TabPipeline/TabOutline/TabGame
- `temp/`：14 個 HTML 原型 (Dashboard、Login、Course Console 4分頁、全螢幕/抽屜/互動元件)

### 1.2 目標
將所有 HTML 原型轉化為生產級 React 元件，符合：
- Clean Architecture + Hexagonal 分層
- 設計系統一致性 (Obsidian Cockpit)
- 無障礙 (a11y) 與鍵盤導航
- 響應式設計 (Mobile/Tablet/Desktop)
- TypeScript 嚴格模式、Zod 驗證

---

## 2. 整合策略：混合式漸進整合

### Phase 1：核心共用元件 (Week 1)
建立 `apps/web/src/components/shared/` 基礎元件庫

| 元件 | 優先級 | 設計系統對應 |
|------|--------|-------------|
| Button | P0 | Primary/Secondary/Ghost、Loading、Icon-only |
| Card | P0 | Hover glow、狀態色彩 |
| Input | P0 | Focus ring Indigo + ambient glow |
| Modal | P0 | Overlay、Focus trap、Esc 關閉、Stepper 支援 |
| Drawer | P0 | 右側滑入、可調整寬度、Header + Tabs |
| Chip/Tag | P0 | Topic(Indigo)/Graph Node(Cyan)/Concept(Violet) |
| Badge | P0 | 16x16px、狀態色彩、Glow ring |
| Tabs | P0 | 底線指示器、鍵盤導航 |
| Tooltip | P1 | 延遲顯示、智能定位 |
| Select | P1 | 原生 select 樣式覆寫、群組選項 |
| Avatar | P1 | 圖片/首字母、狀態指示器 |

**檔案結構**：
```
apps/web/src/components/shared/
├── Button/{Button.tsx,Button.stories.tsx,Button.test.tsx,index.ts}
├── Card/...
├── Input/...
├── Modal/...
├── Drawer/...
├── Chip/...
├── Badge/...
├── Tabs/...
├── Tooltip/...
├── Select/...
├── Avatar/...
├── LoadingSkeleton.tsx (既存)
├── ConfirmDialog.tsx (既存)
├── ErrorBoundary.tsx (既存)
└── index.ts
```

### Phase 2：Dashboard + Login 完整遷移 (Week 1-2)

#### 2.1 Dashboard (plks_dashboard + plks_dashboard_empty_state)
```
<DashboardLayout>
  ├─ Header: Logo + SemesterTabs + CommandPalette(⌘K) + CreateCourseButton + UserAvatar
  ├─ CommandPalette (全域)
  ├─ MainContent:
  │    ├─ EmptyState: 3步驟引導 + 匯入選課單 + 管線概覽
  │    └─ CourseGrid: SemesterSection + CourseCard[] (6狀態: Ready/Processing/Idle/Failed/Exporting/Exported)
  └─ PipelineSummaryBar (底部浮動)
  └─ CreateCourseModal (3步驟 Wizard)
```

#### 2.2 Login (plks_login)
```
<LoginLayout> (全螢幕置中)
  ├─ Background: CSS 動態漸層 (簡化 Canvas 粒子)
  ├─ LoginCard (Glassmorphism, 400px):
  │    ├─ Tabs: Email Magic Link / Google SSO / 學術信箱
  │    ├─ Forms + Validation
  │    └─ Error Toast
  └─ Footer
```

#### 2.3 狀態管理擴充 (dashboardStore.ts)
```typescript
interface DashboardState {
  courses: Course[];
  semesters: Semester[];
  activeSemester: string;
  commandPaletteOpen: boolean;
  createCourseModalOpen: boolean;
  createCourseStep: 1 | 2 | 3;
  createCourseDraft: Partial<CreateCourseInput>;
  pipelines: PipelineSummary[];
  activePipelineCount: number;
}
```

### Phase 3：Course Console 4分頁遷移 (Week 2-4)

#### 3.1 共用佈局
```
<CourseConsoleLayout>
  ├─ CourseHeader (標題、狀態、操作)
  ├─ CourseTabs (Raw/Pipeline/Outline/Game)
  ├─ TabPanels (4分頁內容)
  ├─ SharedDrawers/Modals (跨分頁)
  └─ CommandPalette (課程內搜尋)
```

#### 3.2 TabRaw - 三合一同步檢視 (cs101_raw)
- WaveSurfer.js 音頻波形
- PDF.js 投影片渲染
- 逐字稿時間軸
- 三面板同步邏輯 (currentTime → slide + transcript)

#### 3.3 TabPipeline - DAG 可視化 (cs101_ai_pipeline)
- **React Flow** (`@xyflow/react`) 實作 DAG
- 6 節點 (A-F) 水平排列、狀態色彩
- Minimap、即時日誌、節點詳情抽屜

#### 3.4 TabOutline - 三欄編輯器 (cs101_outline)
- **TipTap** 編輯器 (Markdown、雙向連結 `[[Term]]`、Slash Commands)
- OutlineTree (左、可拖曳排序)
- EvidencePanel (右、4 Tab: Transcript/Slides/Related/Quiz)
- Splitter 可調整欄寬 (`react-resizable-panels`)

#### 3.5 TabGame - Sidekick 測驗 (cs101_game)
- 狀態機: `loading → playing → feedback → sidekick → summary`
- 測驗介面: 單選/判斷/簡答、鍵盤快捷鍵
- SidekickChatDrawer (SSE 串流回應)
- QuizSummaryModal (完成彈出)

#### 3.6 狀態管理 (coursePageStore.ts) - 大型 Zustand Store
包含 `raw`、`pipeline`、`outline`、`game` 四大分頁狀態 + 跨分頁共用狀態

### Phase 4：全螢幕/抽屜/互動元件 (Week 3-4)

| 元件 | 來源原型 | 關鍵技術 |
|------|----------|----------|
| CommandPalette | plks_command_palette_k | `cmdk` 或自製、全域熱鍵 ⌘K |
| CreateCourseModal | plks_createcoursemodal | 3步驟 Stepper、Presigned URL 直傳 B2 |
| SlideViewerFullscreen | cs101_slideviewer_fullscreen | PDF.js、雙欄聯動、縮圖膠卷、逐字稿同步 |
| OutlineGraphFullscreen | cs101_outlinegraph_fullscreen | React Flow、Force/Hierarchical/Radial 布局、Minimap、NodeInspector |
| PipelineNodeDetailDrawer | cs101_pipelinenodedetaildrawer | 4 Tab (Telemetry/Input/Output/Dependencies)、可調整寬度 |
| ExportModal | cs101_exportmodal | 導出選項、衝突策略、進度追蹤 |
| PipelineConfigDrawer | cs101_ai_pipelineconfigdrawer | 節點級配置、預設方案 |
| SidekickChatDrawer | cs101_game | SSE 串流、上下文引用、Quick Actions |
| QuizSummaryModal | cs101_quizsummary | 掌握度矩陣、雷達圖、證書分享 |

---

## 3. 設計系統對齊

### 3.1 色彩系統補充 (tailwind.config.js)
```javascript
colors: {
  // 既有值保留...
  'electric-indigo': '#c0c1ff',    // DESIGN.md --primary
  'cyan-flare': '#7bd0ff',         // DESIGN.md --secondary
  'spectral-violet': '#ddb7ff',    // DESIGN.md --tertiary
  'coral-red': '#ffb4ab',          // DESIGN.md --error
}
```

### 3.2 字體載入 (index.html)
```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet">
```

### 3.3 關鍵設計 Token
| Token | 值 | 用途 |
|-------|-----|------|
| `--surface` | `#0f131c` | 主背景 |
| `--surface-container` | `#1c2028` | 卡片背景 |
| `--primary` | `#c0c1ff` | 主要互動、Focus Ring |
| `--secondary` | `#7bd0ff` | 圖譜節點、次要動作 |
| `--tertiary` | `#ddb7ff` | 概念標籤、第三動作 |
| `--gutter` | `1.5rem` | 容器間距 |
| `--radius-lg` | `0.5rem` | 卡片圓角 |
| `--shadow-glow` | `0 0 24px rgba(192,193,255,0.15)` | 懸停光暈 |

---

## 4. 技術選型確認

| 領域 | 選型 | 理由 |
|------|------|------|
| DAG 視覺化 | **React Flow** (`@xyflow/react`) | 內建 Minimap、節點拖曳、邊連接、維護成本低 |
| 富文本編輯器 | **TipTap** (核心擴展) | Markdown、雙向連結、表格、代碼塊、Slash Commands |
| 音頻波形 | **WaveSurfer.js** + `useWaveSurfer` Hook | 成熟、區段標記、點擊跳轉 |
| PDF 渲染 | **PDF.js** (Worker CDN) | 高解析度、文字選取、縮圖生成 |
| 命令面板 | **cmdk** | Shadcn 風格、鍵盤導航、分組、虛擬化 |
| 代碼高亮 | **Shiki** | 靜態生成、多語言、主題對齊 |
| Markdown 渲染 | **TipTap Markdown** | 與編輯器統一 |
| 圖表 | **Recharts** | React 原生、響應式、Tree-shaking |
| 狀態管理 | **Zustand** (Client) + **TanStack Query** (Server) | 符合 AGENTS.md 規範 |
| API 呼叫 | **Fetch + Zod 驗證** | 類型安全、Runtime 驗證 |
| 表單驗證 | **React Hook Form + Zod** | 效能好、型別安全 |
| 拖曳分割 | **react-resizable-panels** | 可調整面板、持久化尺寸 |
| 虛擬滾動 | **@tanstack/react-virtual** | 大列表效能 |

---

## 5. API 端點對應 (services/api.ts)

### 5.1 Dashboard / Courses
```typescript
getCourses: () => GET('/courses')
createCourse: (input) => POST('/courses', input)
deleteCourse: (id) => DELETE(`/courses/${id}`)
getSemesters: () => GET('/semesters')
getPipelineSummary: () => GET('/pipelines/summary')
search: (query, type?) => GET('/search', { q: query, type })
```

### 5.2 Course Console
```typescript
getCourseDetail: (id) => GET(`/courses/${id}/detail`)
getRawAssets: (courseId) => GET(`/courses/${courseId}/raw-assets`)
getTranscripts: (courseId) => GET(`/courses/${courseId}/transcripts`)
getSlides: (courseId) => GET(`/courses/${courseId}/slides`)
```

### 5.3 Pipeline
```typescript
getPipelineStatus: (sessionId) => GET(`/orchestrator/status/${sessionId}`)
retryPipeline: (sessionId) => POST(`/orchestrator/retry/${sessionId}`)
getPipelineLogs: (sessionId) => GET(`/orchestrator/logs/${sessionId}`)
```

### 5.4 Outline
```typescript
getConceptNodes: (courseId) => GET(`/courses/${courseId}/concept-nodes`)
upsertConceptNode: (input) => POST(`/courses/${courseId}/concept-nodes`, input)
deleteConceptNode: (id) => DELETE(`/concept-nodes/${id}`)
exportToObsidian: (courseId) => POST(`/export/trigger`, { courseId })
```

### 5.5 Gamification
```typescript
getQuizItems: (courseId) => GET(`/courses/${courseId}/quiz-items`)
submitAnswer: (input) => POST(`/gamification/answer`, input)
callSidekick: (input) => POST(`/gamification/sidekick`, input) // SSE
```

---

## 6. 響應式斷點策略

| 斷點 | 範圍 | Dashboard | Course Console |
|------|------|-----------|----------------|
| Mobile | < 640px | 單欄卡片、底部 PipelineSummary、Modal 全螢幕 | 單分頁、抽屜全螢幕、三欄疊放 |
| Tablet | 640-1024px | 2欄卡片、側邊抽屜 Modal | 兩欄 (OutlineTree+Editor)、EvidencePanel 抽屜 |
| Desktop | > 1024px | 3-4欄卡片、置中 Modal、浮動 CommandPalette | 三欄完整、並列抽屜 |

---

## 7. 無障礙 (a11y) 需求

- **鍵盤導航**：所有互動元素可 Tab 到達、Enter/Space 觸發、Esc 關閉
- **Focus 管理**：Modal/Drawer 開啟時 Trap Focus、關閉時回歸觸發元素
- **ARIA**：`role="dialog"`、`aria-modal="true"`、`aria-label`、`aria-expanded`
- **色彩對比**：符合 WCAG AA (4.5:1)，DESIGN.md 色彩已驗證
- **螢幕閱讀器**：語義化 HTML、Live Region 用於即時日誌/串流回應
- **減少動畫**：`@media (prefers-reduced-motion)` 關閉非必要動畫

---

## 8. 測試策略

| 層級 | 工具 | 範圍 |
|------|------|------|
| 單元測試 | Vitest + React Testing Library | 共用元件 (Button、Card、Input...)、Hooks |
| 整合測試 | Vitest | 頁面級元件 (Dashboard、CourseConsole)、Store 邏輯 |
| E2E 測試 | Playwright | 關鍵流程：登入 → 建立課程 → 上傳教材 → 管線執行 → Outline 編輯 → Game 測驗 → 導出 |
| 視覺回歸 | Storybook + Chromatic | 共用元件狀態、設計系統一致性 |

---

## 9. 實作順序總覽

```
Week 1: Phase 1 (共用元件) + Phase 2 開始 (Dashboard 基礎)
Week 2: Phase 2 完成 (Dashboard + Login) + Phase 3 開始 (CourseConsole 佈局)
Week 3: Phase 3 TabRaw + TabPipeline + Phase 4 CommandPalette + SlideViewer
Week 4: Phase 3 TabOutline + TabGame + Phase 4 OutlineGraph + PipelineDrawer + Sidekick
Week 5: Phase 4 剩餘元件 + 整合測試 + E2E + 修復
```

---

## 10. 風險與緩解

| 風險 | 影響 | 緩解 |
|------|------|------|
| React Flow / TipTap / PDF.js Bundle Size 過大 | 首屏載入慢 | Code Splitting (`lazy`)、動態 Import、預載關鍵 Chunk |
| 三合一同步邏輯複雜 | Bug 率高 | 獨立 `useSyncEngine` Hook、單元測試覆蓋核心邏輯 |
| SSE 串流在 Vercel Serverless 限制 | 連線中斷 | 設定 `maxDuration: 60`、心跳機制、重連邏輯 |
| 設計系統色彩與現有 Tailwind 衝突 | UI 不一致 | Phase 1 先建立 Storybook 驗證所有元件視覺 |
| Zustand Store 過大導致重渲染 | 效能問題 | 細粒度 Selector、Shallow Equal、分拆 Store |

---

## 11. 後續步驟

1. ✅ 設計文件完成並提交
2. 🔄 調用 `writing-plans` 技能建立詳細實作計劃 (tasks.md)
3. 🔄 開始 Phase 1 實作：核心共用元件
4. 🔄 依序完成 Phase 2-4

---

*文件版本：1.0*
*建立日期：2026-10-01*
*對應 AGENTS.md Phase 4 (Gamification API & Frontend)*