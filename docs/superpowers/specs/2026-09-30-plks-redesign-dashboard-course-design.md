# PLKS 重設計：儀表板與課程單頁式介面設計規格

> **版本**: 1.0  
> **日期**: 2026-09-30  
> **狀態**: 待審閱  
> **相關藍圖**: `specs/specs1.md` + `specs/specs2.md` + `AGENTS.md`

---

## 1. 設計目標

將現有分散式頁面重構為**以課程為中心的單頁式介面**，提供連貫的學習體驗：

| 現狀 | 目標 |
|------|------|
| Dashboard 功能過載、視覺雜亂 | 學期標籤 + 課程卡片網格，專注「選擇課程」 |
| CourseConsole 僅有 MOC + 測驗入口 | 四大 Tab 整合：原檔、AI管線、重點排版、遊戲學習 |
| 測驗、Sidekick 分離頁面 | 遊戲學習 Tab 內整合雙欄佈局 |
| 無原始教材預覽 | 音檔/投影片/逐字稿完整可視化 |

---

## 2. 整體架構

### 2.1 頁面路由

```
/                                    → Dashboard (課程列表、新增、管線總覽)
/course/:courseId?tab=outline&session=xxx  → CoursePage (單頁式四 Tab)
/login                                → 登入
/auth/callback                        → OAuth 回調
```

### 2.2 Tab 結構

| Tab Key | 名稱 | 核心功能 |
|---------|------|----------|
| `raw` | 原檔 | 音檔播放器、投影片預覽、逐字稿時間軸 |
| `pipeline` | AI管線 | 6 節點 DAG 視覺化、節點詳情、重試/配置調整 |
| `outline` | 重點排版 | 大綱樹 + TipTap 編輯器 + React Flow 圖譜 + 證據面板 |
| `game` | 遊戲學習 | 測驗播放器 + Sidekick 側邊欄 |

### 2.3 技術棧新增

| 套件 | 用途 |
|------|------|
| `@tiptap/react` + `tiptap-extension-mentions` | Notion 風格編輯器、雙向連結自動完成 |
| `@xyflow/react` (React Flow) | 概念圖譜畫布 |
| `wavesurfer.js` | 音檔波形圖 |
| `pdfjs-dist` | PDF 渲染 |
| `pptx2json` / `pptxgenjs` | PPTX 解析/預覽 |

---

## 3. 階段 1：儀表板重設計

### 3.1 版面架構

```
┌─────────────────────────────────────────────────────────────┐
│ Header: PLKS Logo | 用戶頭像/設定 | 新增課程 btn             │
├─────────────────────────────────────────────────────────────┤
│ Semester Tabs: [大一上] [大一下] [大二上] [大二下] [大三上]  │
│                [大三下] [大四上] [大四下] [全部]             │
├─────────────────────────────────────────────────────────────┤
│ Course Grid (響應式: 1col<640 / 2col<1024 / 3col>1024)      │
│ ┌─────────┐ ┌─────────┐ ┌─────────┐                         │
│ │ CS101   │ │ MA101   │ │ PHY101  │  ...                    │
│ │ 計算機概論│ │ 微積分   │ │ 普通物理 │                       │
│ │ ████░░ 60%│ ███████░ 85%│ ██░░░░░ 20%│                       │
│ │ [繼續] [管理]│ [繼續] [管理]│ [上傳] [啟動]│                  │
│ └─────────┘ └─────────┘ └─────────┘                         │
├─────────────────────────────────────────────────────────────┤
│ Pipeline Summary: [進行中 2] [待上傳 3] [需重試 1]           │
└─────────────────────────────────────────────────────────────┘
```

### 3.2 課程卡片狀態機

| 狀態 | 視覺 | 主要 CTA | 次要動作 |
|------|------|----------|----------|
| `idle` | 灰色邊框、進度 0% | 上傳教材 | 編輯/刪除 |
| `processing` | 藍色脈動邊框、進度環 | 查看管線進度 | - |
| `ready` | 綠色邊框、進度 >0% | 繼續學習 | 管理/導出 |
| `error` | 紅色邊框、錯誤圖示 | 重試管線 | 查看錯誤詳情 |

### 3.3 組件拆解

```
dashboard/
├── SemesterTabs.tsx          # 學期標籤頁 (含「全部」)
├── CourseCard.tsx            # 核心卡片，含狀態機渲染
├── CourseCardSkeleton.tsx    # 骨架屏
├── PipelineSummary.tsx       # 底部三欄統計卡
└── CreateCourseModal.tsx     # 新增/編輯課程 Modal (復用現有邏輯)
```

### 3.4 狀態管理

```typescript
// stores/dashboardStore.ts
interface DashboardStore {
  semesterFilter: string;           // '103-1' | 'all'
  viewMode: 'grid' | 'list';
  createModal: { open: boolean; mode: 'create' | 'edit'; courseId?: string };
  setSemesterFilter: (s: string) => void;
  openCreateModal: (mode: 'create' | 'edit', courseId?: string) => void;
}
```

### 3.5 Hooks

```typescript
// hooks/useDashboard.ts
- getCourses (含 progress、status、latestSessionId)
- getPipelineSummary
- createCourse / updateCourse / deleteCourse
- uploadFile (回傳 sessionId 並綁定課程)
- startPipeline (觸發 orchestrator)
```

---

## 4. 階段 2：課程單頁式介面

### 4.1 版面架構

```
┌─────────────────────────────────────────────────────────────────────┐
│ Sticky Header (z-50, bg-white/95 backdrop-blur)                     │
│ ┌─────────────────────────────────────────────────────────────┐   │
│ │ ← 返回  |  CS101 計算機概論  |  [原檔] [AI管線] [重點排版] [遊戲學習]  │  ⋮更多  │
│ │        |  大二上 • 進度 60%  |                                    |        │
│ └─────────────────────────────────────────────────────────────┘   │
├─────────────────────────────────────────────────────────────────────┤
│ Tab Panel (min-h-[calc(100vh-120px)], overflow-auto)               │
│  ├─ TabRaw: AudioPlayer | SlideViewer | TranscriptTimeline         │
│  ├─ TabPipeline: PipelineDAG + NodeDetailDrawer + ConfigDrawer     │
│  ├─ TabOutline: OutlineTree | OutlineEditor | OutlineGraph | EvidencePanel
│  └─ TabGame: GameQuizPlayer | GameSidekickSidebar                  │
└─────────────────────────────────────────────────────────────────────┘
```

### 4.2 URL 狀態同步

```typescript
// 使用 useSearchParams + Zustand persist
interface CoursePageURLState {
  tab: 'raw' | 'pipeline' | 'outline' | 'game';  // default: 'outline'
  session?: string;                               // 當前管線/遊戲 sessionId
  subTab?: 'audio' | 'slides' | 'transcript';     // raw 子分頁
  node?: 'A'|'B'|'C'|'D'|'E'|'F';                 // pipeline 選中節點
  view?: 'tree' | 'canvas' | 'split';             // outline 視圖模式
}
```

### 4.3 核心 Hook: `useCoursePage.ts`

```typescript
export function useCoursePage(courseId: string) {
  // URL 狀態
  const [activeTab, setActiveTab] = useSearchParamsState('tab', 'outline');
  const [sessionId, setSessionId] = useSearchParamsState('session');
  const [rawSubTab, setRawSubTab] = useSearchParamsState('subTab', 'audio');
  const [pipelineNode, setPipelineNode] = useSearchParamsState('node');
  const [viewMode, setViewMode] = useSearchParamsState('view', 'split');

  // 共享資料查詢 (TanStack Query)
  const { data: course } = useQuery({ queryKey: ['course', courseId] });
  const { data: rawAsset } = useQuery({ queryKey: ['raw-asset', sessionId], enabled: !!sessionId });
  const { data: pipelineStatus } = useQuery({ 
    queryKey: ['pipeline', sessionId], 
    refetchInterval: activeTab === 'pipeline' ? 3000 : false 
  });
  const { data: conceptTree } = useQuery({ queryKey: ['concept-tree', courseId] });
  const { data: gameState } = useQuery({ queryKey: ['game', sessionId], enabled: !!sessionId });

  // Mutations
  const updateConceptNodes = useMutation({ ... });
  const retryPipelineNode = useMutation({ ... });
  const triggerExport = useMutation({ ... });

  return { /* state + data + actions */ };
}
```

---

## 5. 階段 3：Tab 原檔

### 5.1 子分頁結構

| 子分頁 | 組件 | 關鍵功能 |
|--------|------|----------|
| `audio` | `AudioPlayer.tsx` | WaveSurfer 波形圖、倍速、區段跳轉、當前播放高亮對應逐字稿 |
| `slides` | `SlideViewer.tsx` | PDF.js 渲染、頁面縮圖側邊欄、全螢幕、縮放、鍵盤翻頁 |
| `transcript` | `TranscriptTimeline.tsx` | 虛擬列表、時間軸點擊跳轉音檔/投影片、關鍵字搜尋高亮 |

### 5.2 資料流

```
GET /api/courses/:id/raw-asset?sessionId=xxx
    ↓
RawAssetData { transcripts[], visualAssets[] }
    ↓
- AudioPlayer: 取 audio presigned URL
- SlideViewer: 取每頁 presigned URL 批次載入
- TranscriptTimeline: 直接渲染 transcripts 陣列
```

### 5.3 組件 Props

```typescript
// AudioPlayer
interface AudioPlayerProps {
  audioUrl: string;
  transcripts: TranscriptSegment[];
  onTimeUpdate: (time: number) => void;           // 同步高亮逐字稿
  onSegmentClick: (segment: TranscriptSegment) => void;
}

// SlideViewer
interface SlideViewerProps {
  slides: VisualAsset[];
  currentPage: number;
  onPageChange: (page: number) => void;
  onFullscreen: () => void;
}

// TranscriptTimeline
interface TranscriptTimelineProps {
  segments: TranscriptSegment[];
  currentTime: number;
  onSegmentClick: (segment: TranscriptSegment) => void;
  searchQuery: string;
}
```

---

## 6. 階段 4：Tab AI 管線

### 6.1 視覺化 DAG

```
A: Load Data  →  B: URL Signing  →  C: Prompt Assembly  →  D: AI Execution  →  E: Validation  →  F: Persistence
   ✅ 完成          ✅ 完成           ✅ 完成              🔄 執行中           ⏳ 等待中          ⏳ 等待中
```

### 6.2 節點狀態定義

```typescript
type NodeStatus = 'pending' | 'running' | 'completed' | 'failed';

interface PipelineNodeStatus {
  node: 'A' | 'B' | 'C' | 'D' | 'E' | 'F';
  label: string;
  status: NodeStatus;
  startedAt?: string;
  completedAt?: string;
  error?: string;
  inputPreview?: unknown;
  outputPreview?: unknown;
  durationMs?: number;
}
```

### 6.3 互動規格

| 互動 | 行為 |
|------|------|
| 點擊節點 | 右側抽屜展開 `PipelineNodeDetail`：顯示輸入/輸出 JSON、錯誤堆疊、耗時 |
| 節點 `failed` | 顯示「重試此節點」按鈕 + 「調整配置」連結 |
| 點擊「調整配置」 | 右側抽屜展開 `PipelineConfigDrawer`：修改 `fusionLevel`、`outputTemplates` |
| 配置變更 + 重試 | `POST /api/orchestrator/retry-node/:sessionId` 帶入新 config，從該節點重跑 |

### 6.4 API 擴充

```typescript
// GET /api/orchestrator/status/:sessionId (擴充回傳)
interface PipelineStatusResponse {
  sessionId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  nodes: PipelineNodeStatus[];
  currentNode?: 'A'|'B'|'C'|'D'|'E'|'F';
  config: {
    fusionLevel: 'strict_alignment' | 'high_level_summary';
    outputTemplates: ('knowledge_nodes' | 'flashcard_quiz')[];
  };
}

// POST /api/orchestrator/retry-node/:sessionId
interface RetryNodeRequest {
  fromNode: 'A'|'B'|'C'|'D'|'E'|'F';
  config?: Partial<PipelineConfig>;
}
```

---

## 7. 階段 5：Tab 重點排版 (核心複雜度最高)

### 7.1 三欄式佈局

```
┌──────────────┬────────────────────────┬──────────────────┐
│  左側：大綱樹   │  中央：編輯區            │  右側：圖譜/證據   │
│  (280px)      │  (flex-1, min 600px)    │  (320px)          │
│  可摺疊        │  可拖拽分割線            │  可摺疊            │
└──────────────┴────────────────────────┴──────────────────┘
```

### 7.2 組件規格

#### 7.2.1 OutlineTree (左側)

```typescript
// 大綱樹節點
interface TreeNode extends ConceptNodeWithMeta {
  children: TreeNode[];
  isExpanded: boolean;
  depth: number;
}

// 功能
- 虛擬化渲染 (react-virtualized / @tanstack/react-virtual)
- 拖拽排序
- 右鍵選單：新增子節點、新增同層、刪除、合併、複製連結
- 摺疊/展開持久化 (localStorage)
- 點擊 → 設定 editingNodeId、同步編輯器、高亮圖譜節點
```

#### 7.2.2 OutlineEditor (中央) — TipTap 整合

```typescript
// Editor 擴充功能
const extensions = [
  StarterKit,
  Placeholder,
  // 雙向連結 Mention
  Mention.configure({
    HTMLAttributes: { class: 'mention' },
    suggestion: {
      items: availableNodes, // [{ conceptId, term }]
      render: () => { /* [[術語]] 樣式 */ },
      command: ({ id, label }) => `[[${label}]](${id})`,
    },
  }),
  // 來源引用元件
  Node.create({ name: 'evidenceRef', /* inline, 屬性: transcriptRef, slideUri */ }),
  // 指令選單
  SlashCommands,
];

// Props
interface OutlineEditorProps {
  node: ConceptNodeWithMeta | null;
  onUpdate: (nodeId: string, content: string) => void;
  onLinkClick: (linkedNodeId: string) => void;
  availableNodes: Pick<ConceptNodeWithMeta, 'conceptId' | 'term'>[];
  evidence?: { transcriptSegments: TranscriptSegment[]; slideUris: string[] };
}
```

#### 7.2.3 OutlineGraph (右側上) — React Flow

```typescript
// 節點/邊資料轉換
const nodes = conceptTree.flatMap(toReactFlowNodes);
const edges = conceptTree.flatMap(toReactFlowEdges); // 從 relatedTerms 建立

// 互動
- 點擊節點 → setEditingNodeId、同步樹選中、滾動編輯器
- 拖拽節點 → 自動布局
- 縮放/平移、迷你地圖、背景網格
```

#### 7.2.4 EvidencePanel (右側下)

```typescript
// 來源證據面板
interface EvidencePanelProps {
  transcriptSegments: TranscriptSegment[];  // 含時間碼
  slideUris: string[];                       // presigned URLs
  onTranscriptClick: (segment: TranscriptSegment) => void; // 跳轉 TabRaw audio
  onSlideClick: (uri: string, page: number) => void;       // 跳轉 TabRaw slides
}
```

### 7.3 資料同步策略

```
用戶編輯 → 本地 Zustand 狀態更新 (樂觀)
    ↓
800ms 防抖 → PATCH /api/concept-nodes/batch
    ↓
Server 回傳更新後樹 → TanStack Query invalidate → 同步各組件
    ↓
衝突處理：Server 版本號 > 本地版本 → 強制同步 + Toast 提示
```

### 7.4 後端新增端點

| 端點 | 方法 | 用途 |
|------|------|------|
| `/api/concept-nodes/:courseId/tree` | GET | 回傳階層化樹結構 (含 children) |
| `/api/concept-nodes/batch` | PATCH | 批次更新：順序、層級、內容、展開狀態 |
| `/api/concept-nodes/:id/evidence` | GET | 取得單一節點關聯的逐字稿片段 + 投影片 URI |

---

## 8. 階段 6：Tab 遊戲學習

### 8.1 佈局

```
┌─────────────────────────────────────┬──────────────────┐
│  主區域 (flex-1)                     │  右側欄 (360px)   │
│  GameQuizPlayer                     │  GameSidekickSidebar │
│  - 進度環 + XP/Streak               │  - 歷史對話       │
│  - 題目/選項/輸入                   │  - 串流回應       │
│  - 即時對錯回饋                     │  - 相關投影片連結  │
│  - 底部：呼叫 Sidekick / 下一題      │                   │
└─────────────────────────────────────┴──────────────────┘
```

### 8.2 重構策略

| 現有 | 新組件 | 變更 |
|------|--------|------|
| `QuizPlayer.tsx` (頁面) | `GameQuizPlayer.tsx` (組件) | 移除 `useNavigate`、`useSearchParams`，改接收 `sessionId` props |
| `SidekickChat.tsx` (頁面) | `GameSidekickSidebar.tsx` (組件) | 移除路由依賴，改為側邊欄佈局、共享 `sessionId` |
| `useGamification.ts` | `useGame.ts` (擴充) | 新增 `syncToCourseStore`、Tab 切換保持狀態 |

### 8.3 共享 Session 狀態

```typescript
// stores/coursePageStore.ts
interface CoursePageStore {
  game: {
    sessionId: string;
    currentQuizIndex: number;
    score: number;
    streak: number;
    sidekickOpen: boolean;
  };
  setGameSession: (sessionId: string) => void;
  updateGameProgress: (patch: Partial<GameProgress>) => void;
}
```

---

## 9. API 契約總表

### 9.1 新增端點

| 端點 | 方法 | 請求 | 回應 | 用途 |
|------|------|------|------|------|
| `/api/courses` | GET | - | `CourseCardData[]` | Dashboard 列表 (含進度/狀態) |
| `/api/courses/:id/raw-asset` | GET | `?sessionId=` | `RawAssetData` | TabRaw 素材 |
| `/api/orchestrator/status/:sessionId` | GET | - | `PipelineStatusResponse` | TabPipeline 進度 (擴充) |
| `/api/orchestrator/retry-node/:sessionId` | POST | `RetryNodeRequest` | `{sessionId, status}` | 節點級重試 |
| `/api/concept-nodes/:courseId/tree` | GET | - | `ConceptNodeWithMeta[]` | TabOutline 樹 |
| `/api/concept-nodes/batch` | PATCH | `{courseId, nodes[]}` | `ConceptNodePayload[]` | 批次更新 |
| `/api/concept-nodes/:id/evidence` | GET | - | `{transcripts[], slides[]}` | 證據面板 |
| `/api/export/trigger/:courseId` | POST | - | `{taskId, status}` | 手動導出 |

### 9.2 現有端點 (維持不變)

| 端點 | 用途 |
|------|------|
| `POST /api/gamification/start` | 開始遊戲 |
| `POST /api/gamification/answer` | 提交答案 |
| `POST /api/gamification/sidekick` | 呼叫 Sidekick |
| `GET /api/gamification/state/:sessionId` | 遊戲狀態 |

---

## 10. 組件目錄結構

```
apps/web/src/
├── pages/
│   ├── Dashboard.tsx           # 重寫
│   └── CoursePage.tsx          # 新建
├── components/
│   ├── dashboard/
│   │   ├── SemesterTabs.tsx
│   │   ├── CourseCard.tsx
│   │   ├── CourseCardSkeleton.tsx
│   │   ├── PipelineSummary.tsx
│   │   └── CreateCourseModal.tsx
│   ├── course/
│   │   ├── CourseHeader.tsx
│   │   ├── CourseTabs.tsx
│   │   ├── TabRaw/
│   │   │   ├── AudioPlayer.tsx
│   │   │   ├── SlideViewer.tsx
│   │   │   └── TranscriptTimeline.tsx
│   │   ├── TabPipeline/
│   │   │   ├── PipelineDAG.tsx
│   │   │   ├── PipelineNodeDetail.tsx
│   │   │   └── PipelineConfigDrawer.tsx
│   │   ├── TabOutline/
│   │   │   ├── OutlineTree.tsx
│   │   │   ├── OutlineEditor.tsx
│   │   │   ├── OutlineGraph.tsx
│   │   │   └── EvidencePanel.tsx
│   │   └── TabGame/
│   │       ├── GameQuizPlayer.tsx
│   │       └── GameSidekickSidebar.tsx
│   └── shared/
│       ├── ErrorBoundary.tsx
│       ├── LoadingSkeleton.tsx
│       └── ConfirmDialog.tsx
├── hooks/
│   ├── useDashboard.ts
│   ├── useCoursePage.ts
│   ├── usePipeline.ts
│   ├── useOutline.ts
│   └── useGame.ts
├── stores/
│   ├── dashboardStore.ts
│   ├── coursePageStore.ts
│   └── gameStore.ts (既有)
├── services/
│   └── api.ts (擴充)
└── types/
    └── course.ts (新增)
```

---

## 11. 遷移策略

| 現有檔案 | 處理方式 |
|----------|----------|
| `Dashboard.tsx` | 重寫，舊版備份 `Dashboard.legacy.tsx` |
| `CourseConsole.tsx` | 保留，重導向 `/course/:id?tab=outline` |
| `QuizPlayer.tsx` | 重構為組件，舊路由保留相容 |
| `SidekickChat.tsx` | 重構為組件，舊路由保留相容 |
| `api.ts` | 累加新端點 |
| `useGamification.ts` | 不動，新組件直接復用 |

---

## 12. 實作里程碑

| 里程碑 | 任務 | 預估工時 |
|--------|------|----------|
| **M1** | 基礎架構、Types、API、Dashboard、CoursePage 殼 | ~16h |
| **M2** | TabRaw (3 組件) + TabPipeline (3 組件 + 配置抽屜) | ~20h |
| **M3** | TabOutline (Tree、Editor、Graph、Evidence、Hooks、後端) | ~28h |
| **M4** | TabGame (QuizPlayer、SidekickSidebar 重構整合) | ~12h |
| **M5** | E2E、錯誤邊界、效能、無障礙、文檔 | ~12h |
| **總計** | | **~88h** |

---

## 13. 風險與緩解

| 風險 | 緩解 |
|------|------|
| TipTap + React Flow 整合複雜 | M3 先做最小版 (Tree + Editor)，Graph 迭代 |
| 大檔預覽效能 | 可視區懶載入、Presigned URL 直連、Web Worker 波形圖 |
| 多 Tab 編輯衝突 | Server 版本號樂觀鎖、單一來源原則 |
| Gamification 重構回歸 | 保留舊路由並行、完整單元測試 |

---

## 14. 非本次範圍 (技術債務預留)

- [ ] 即時協作編輯 (Yjs)
- [ ] 離線支援 (Service Worker)
- [ ] 全文搜尋 (Meilisearch)
- [ ] 主題切換 / 多語言

---

## 15. 審閱確認

- [ ] 設計規格完整性
- [ ] API 契約與後端實作一致性
- [ ] 組件拆解粒度合理性
- [ ] 狀態管理架構清晰度
- [ ] 遷移策略風險可控性

**審閱者**: _______________  
**日期**: _______________  
**狀態**: ☐ 通過  ☐ 需修改