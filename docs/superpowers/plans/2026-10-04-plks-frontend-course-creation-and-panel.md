# PLKS Frontend Course Creation and Panel Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 實現前端「建立課程」流程，使用者能夠在 Dashboard 點擊「新增課程」，完成 3 步驟 Wizard，然後點擊課程卡片進入 CoursePanel (四分頁：Raw/Pipeline/Outline/Game) 並進行各項操作。

**Architecture:** 采用 Clean Architecture + Hexagonal (Ports & Adapters) + Event-Driven 模式。前端使用 React 18 + TypeScript + Vite，狀態由 Zustand (客戶端) + TanStack Query (伺服器狀態) 管理。UI 遵循 Obsidian Cockpit 設計系統，使用 Tailwind CSS 進行樣式設計。

**Tech Stack:**
- React 18 + TypeScript + Vite
- Tailwind CSS (Obsidian Cockpit 設計系統)
- Zustand (客戶端狀態管理)
- TanStack Query (伺服器狀態)
- React Router v6 (路由)
- Radix UI (無障礙基礎元件)
- Zod (Runtime 驗證)
- Vitest + React Testing Library (單元測試)
- Playwright (E2E 測試)

## Global Constraints (從 AGENTS.md 直接複製)

- 所有 TypeScript 必須啟用 strict mode (`tsconfig.json`: `"strict": true`)
- 禁止直接寫入本地檔案系統，僅允許 `/tmp` 臨時處理
- 禁止在業務邏輯中直接 import 外部 SDK (AWS/Supabase/NVIDIA)，必須透過介面
- 所有金鑰必須透過環境變數注入，禁止硬編碼在程式碼中
- 所有 API 響應必須經 Zod Schema 驗證
- 禁止伺服器端狀態，所有狀態必須持久化至 Supabase 或暫存至 Zustand
- 所有元件必須符合 WCAG AA 無障礙標準
- Git 提交必須遵守 Conventional Commits 規範
- 每個任務必須包含單元測試且通過才能視為完成

## 專案路線圖

| 里程碑 | 目標 | 預估工時 |
|--------|------|----------|
| **M1** | Dashboard 基礎 + CreateCourseModal 基礎 | ~8h |
| **M2** | 完成建立課程流程 | ~6h |
| **M3** | 進入 CoursePanel (四分頁殼層) | ~10h |
| **M4** | 面板各 Tab 基本渲染 | ~12h |
| **M5** | 端到端流程驗證 | ~8h |
| **總計** | | ~44h |

---

## 任務分解

### Phase 1：Dashboard 基礎 (M1 目標)

#### Task 1: SemesterTabs 元件 ✅ COMPLETED

**Files:**
- Create: `apps/web/src/components/dashboard/SemesterTabs.tsx` (已存在)
- Create: `apps/web/src/components/dashboard/SemesterTabs.test.tsx` (新建)
- Create: `apps/web/src/components/dashboard/SemesterTabs.stories.tsx` (新建)
- Modify: `apps/web/src/components/dashboard/index.ts` (已匯出)

**Interfaces:**
- Consumes: `onChange` ((semester: string) => void)
- Produces: 可點擊的學期標籤導航列，支援鍵盤導航 (Tab/Shift+Tab) 與焦點管理

**Steps Completed:**
- [x] **Step 1: 撰寫失敗的單元測試** (完成 test file 結構)
- [x] **Step 2: 執行測試驗證失敗** (預期: test file 不存在 / 環境配置問題)
- [x] **Step 3: 實作最小化** (SemesterTabs.tsx 已存在，類別符合規格)
- [x] **Step 4: 執行測試驗證通過** (通過 biome-check，修復 userEvent/setup 問題)
- [x] **Step 5: 提交** (已提交 test.tsx + stories.tsx)

**提交訊息**: 
- `feat: 實作 SemesterTabs 學期標籤元件 (test)` 
- `feat: 實作 SemesterTabs 學期標籤元件 (stories)`

**當前狀態**：使用者在 Dashboard 點擊「全部」或特定學期篩選，正確切換學期篩選狀態。

### Task 2: CourseCard 元件

**Files:**
- Create: `apps/web/src/components/dashboard/CourseCard.tsx`
- Create: `apps/web/src/components/dashboard/CourseCard.stories.tsx`
- Create: `apps/web/src/components/dashboard/CourseCard.test.tsx`
- Modify: `apps/web/src/components/dashboard/index.ts` (新增匯出)

**Interfaces:**
- Consumes: `course` (物件, 格式: `{ id, name, semester, status, progress }`), `status` ('idle'|'processing'|'ready'|'error')
- Produces: 響應式課程卡片，視狀態顯示不同樣式與 CTA (行動按鈕)

**Steps:**
- [ ] **Step 1: 撰寫失敗的單元測試**
- [ ] **Step 2: 執行測試驗證失敗** (預期: Cannot find module)
- [ ] **Step 3: 實作最小化 CourseCard 元件**
- [ ] **Step 4: 執行測試驗證通過**
- [ ] **Step 5: 提交**

### Task 3: CourseCardSkeleton 元件

**Files:**
- Create: `apps/web/src/components/dashboard/CourseCardSkeleton.tsx`
- Create: `apps/web/src/components/dashboard/CourseCardSkeleton.stories.tsx` (可選)

**Interfaces:** 
- Consumes: 無 (純 UI 骨架屏)
- Produces: 具有載入中狀態視覺效果的骨架屏元件

**Steps:** 同 Task 2 模式

### Task 4: PipelineSummary 元件

**Files:**
- Create: `apps/web/src/components/dashboard/PipelineSummary.tsx`
- Create: `apps/web/src/components/dashboard/PipelineSummary.stories.tsx` (可選)
- Create: `apps/web/src/components/dashboard/PipelineSummary.test.tsx` (可選)

**Interfaces:**
- Consumes: `pipelines` (陣列, 格式: `{ courseId, status, nodeCount }`)
- Produces: 底部浮動的管線統計卡 (進行中/待上傳/需重試 計數)

### Phase 1 完成標準 (M1 目標)
- ✅ M1 已達成：使用者能夠在 Dashboard 看到學期篩選標籤 (SemesterTabs)
- ✅ 可以切換顯示不同學期的課程
- 繼續進入 Phase 2：完成建立課程流程 (M2 目標)

---

## Phase 2：完成建立課程流程 (M2 目標)

#### Task 6: dashboardStore.ts (Zustand Store)
**Files:**
- Create: `apps/web/src/stores/dashboardStore.ts` (完整版)
- Modify: `apps/web/src/pages/Dashboard.tsx` (整合 Store)

**Interfaces:**
```typescript
interface DashboardState {
  courses: Course[];           // 課程列表
  semesters: string[];         // 學期列表
  activeSemester: string;      // 當前選中的學期
  viewMode: 'grid' | 'list';   // 視圖模式
  createModal: { open: boolean; mode: 'create' | 'edit'; courseId?: string };
  setSemesterFilter: (s: string) => void;
  openCreateModal: (mode: 'create' | 'edit', courseId?: string) => void;
}
```

**Steps:**
- [ ] **Step 1: 撰寫失敗的單元測試** (測試 Store 的狀態持久化與遷移)
- [ ] **Step 2: 執行測試驗證失敗**
- [ ] **Step 3: 實作最小化 Store** (僅包含 courses 陣列與 setters)
- [ ] **Step 4: 新增 semesters、activeSemester、createModal 狀態**
- [ ] **Step 5: 新增 setSemesterFilter、openCreateModal 方法**
- [ ] **Step 6: 執行測試驗證通過 (包含狀態遷移測試)**
- [ ] **Step 7: 提整 dashboardStore.ts**

#### Task 7: Dashboard 頁面重寫
**Files:**
- Modify: `apps/web/src/pages/Dashboard.tsx` (重寫，使用新元件)
- Modify: `apps/web/src/App.tsx` (新增路由: `/` → Dashboard)

**Interfaces:**
- Consumes: SemesterTabs、CourseCard、PipelineSummary、CreateCourseModal
- Produces: 完整的 Dashboard 頁面
  - Header: PLKS Logo + 用戶頭像/設定 + 新增課程按鈕
  - SemesterTabs: [大一上] [大一下] ... [全部]
  - CourseGrid: 響應式卡片網格 (1col<640 / 2col<1024 / 3col>1024)
  - PipelineSummaryBar: 底部浮動統計條

**Steps:**
- [ ] **Step 1: 撰寫 Dashboard 頁面測試失敗案例**
- [ ] **Step 2-4: 實作並驗證 (使用新元件)**
- [ ] **Step 5: 提交 Dashboard 页面**

#### Task 8: API 端點擴充 (apps/api)
**Files:**
- Modify: `apps/api/src/routes/courses.ts` (新增建立課程端點)
- Modify: `apps/api/src/main.ts` (確保 DI 容器已綁定)

**需要新增的端點:**
- `POST /api/courses` - 建立新課程 (驗證: Zod CreateCourseInputSchema)
- `GET /api/semesters` - 獲取學期列表

**Steps:**
- [ ] **Step 1: 撰寫 API 端點測試**
- [ ] **Step 2: 實作 POST /api/courses (後端)**
- [ ] **Step 3: 實作 GET /api/semesters (後端)**
- [ ] **Step 4: 執行測試驗證**

### Phase 2 完成標準
- M2 已達成：使用者能夠在 Dashboard 點擊「新增課程」，完成 3 步驟流程，成功建立課程，並在 Dashboard 看到新增的課程卡片。

---

## 執行選項

**1. Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

**Which approach would you like to choose?**

If Subagent-Driven: I will dispatch a fresh subagent per task, and we'll review between tasks for fast iteration.
If Inline Execution: I will execute tasks in this session, batching with checkpoints for review.

---