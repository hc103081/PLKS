# PLKS (Personal Learning Knowledge System) - AI Agent 開發規範

> 給 AI 開發工具 讀取的專案最高指導文件。  
> 對應藍圖：`specs/specs1.md` (Core & Storage) + `specs/specs2.md` (Orchestration, Inference, Gamification & Export)

---

## 1. 專案概覽與架構原則

| 項目 | 說明 |
|------|------|
| **系統名稱** | PLKS (Personal Learning Knowledge System) |
| **核心目標** | 混合儲存架構知識管理系統：Supabase (PostgreSQL) 為結構化資料主存，Backblaze B2 為大型檔案與 Obsidian 同步輸出。包含 Ingestion、Orchestrator、AI 推理、遊戲化 Sidekick。 |
| **架構模式** | Clean Architecture + Hexagonal (Ports & Adapters) + Event-Driven |
| **狀態管理** | 無狀態運算。結構化持久化狀態在 Supabase，大型檔案在 B2。 |
| **單一真相來源 (Structured)** | Supabase (PostgreSQL) with RLS |
| **單一真相來源 (Blobs)** | Backblaze B2 Object Storage (S3-Compatible API) |
| **課程結構** | 大學 8 學期分區 (1上、1下、2上、2下、3上、3下、4上、4下)，用戶可於當學期新增課程 |
| **使用者模式** | 單一使用者 (無多租戶複雜度) |
| **認證方式** | Supabase Auth (Email Magic Link) |
| **部署目標** | Vercel (Hobby) + Supabase (免費額度) + Backblaze B2 (免費額度) |

### 核心原則
- **依賴反轉**：業務邏輯只依賴介面 (`IStorageAdapter`、`IStructuredStore`、`IKnowledgeGraphWriter`、`IAIReasoningGateway`)，不依賴具體實作
- **介面優先**：先定義契約，再實作 Adapter
- **Secret 管理**：所有金鑰僅透過環境變數注入，絕不寫入程式碼/Git
- **測試隔離**：單元測試 Mock 介面，不呼叫真實 B2/NVIDIA/Supabase API

### 關鍵限制 (Hard Constraints)
| 限制 | 說明 |
|------|------|
| ❌ 禁止本地寫入 | 僅 `/tmp` 允許暫存處理 (音檔轉檔、圖片渲染) |
| ❌ 禁止直接 import SDK | AWS SDK、NVIDIA SDK、Supabase SDK 僅能在 Adapter 內部使用 |
| ❌ 禁止 Hardcode Prompt | System Prompt 必須外部化至設定檔 (`config/prompts/`) |
| ❌ 禁止未驗證 AI 輸出 | 必須經 zod JSON Schema 驗證，失敗觸發重試 |
| ❌ 禁止伺服器端狀態 | Pod 重啟不可遺失資料，所有狀態在 Supabase/B2 |
| ❌ 禁止繞過 RLS | 客戶端/業務邏輯必須透過 RLS Policy 存取資料，僅 Edge Function/背景任務可用 Service Role Key |

---

## 2. 技術棧選型與理由

### 後端
- **Runtime**: Node.js 20+ (ES Modules)
- **Framework**: **Fastify** (高效能、TypeScript 原生支援、Schema-based validation)
- **DI Container**: `tsyringe` (輕量、裝飾器支援)
- **驗證**: `zod` (Runtime + Compile-time 型別安全)

### 前端
- **Framework**: **React 18 + TypeScript + Vite**
- **Routing**: React Router v6
- **State**: TanStack Query (Server State) + Zustand (Client State)
- **UI**: Tailwind CSS + Radix UI (Headless、可訪問)

### 基礎設施
| 服務 | 套件/方式 | 用途 |
|------|-----------|------|
| **Backblaze B2** | `@aws-sdk/client-s3` + `@aws-sdk/s3-request-presigner` | 物件儲存、Presigned URL |
| **Supabase** | `@supabase/supabase-js` | PostgreSQL、Auth、Realtime、Edge Functions、pg_cron |
| **NVIDIA NIM** | `fetch` + 自訂 Adapter | 多模態推理 (Nemotron-3-Ultra) |
| **部署** | Vercel (Hobby) + Supabase + B2 | Serverless 前端/API、資料庫、大檔儲存 |

### 開發工具鏈
- **Monorepo**: `pnpm workspace` + `turbo` (可選)
- **型別檢查**: TypeScript `strict: true`
- **Lint/Format**: **Biome** (極速、整合 formatter+linter)
- **測試**: `Vitest` (單元/整合) + `Playwright` (E2E)
- **Git Hooks**: `lefthook` (pre-commit: lint + format + typecheck)
- **Commit**: Conventional Commits (`feat`/`fix`/`docs`/`refactor`/`test`/`chore`)

---

## 3. Monorepo 目錄結構

```
plks/
├── apps/
│   ├── api/                    # 後端應用 (Fastify)
│   │   ├── src/
│   │   │   ├── main.ts         # 入口、DI 容器綁定
│   │   │   ├── routes/         # HTTP 路由定義
│   │   │   │   ├── ingestion.ts
│   │   │   │   ├── orchestrator.ts
│   │   │   │   ├── gamification.ts
│   │   │   │   └── export.ts
│   │   │   ├── modules/        # 業務模組
│   │   │   │   ├── ingestion/
│   │   │   │   ├── orchestrator/
│   │   │   │   ├── gamification/
│   │   │   │   └── export/
│   │   │   ├── adapters/       # 基礎設施實作 (實作介面)
│   │   │   │   ├── b2-storage.adapter.ts
│   │   │   │   ├── supabase-structured-store.adapter.ts
│   │   │   │   ├── nim-reasoning.adapter.ts
│   │   │   │   └── obsidian-markdown.writer.ts
│   │   │   ├── core/           # 核心領域 (純 TS、零依賴)
│   │   │   │   ├── contracts/  # 介面定義 (複製自 shared)
│   │   │   │   ├── entities/   # 領域實體
│   │   │   │   ├── dag/        # DAG 引擎
│   │   │   │   ├── state-machine/ # Sidekick 狀態機
│   │   │   │   └── errors/     # 領域錯誤類型
│   │   │   └── config/         # 環境變數驗證 (zod)
│   │   └── tests/              # 整合測試、E2E 測試
│   │
│   └── web/                    # 前端應用 (React + Vite)
│       ├── src/
│       │   ├── components/     # 共用 UI 元件
│       │   ├── pages/          # 頁面級元件
│       │   │   ├── LoginPage.tsx
│       │   │   ├── AuthCallback.tsx
│       │   │   ├── Dashboard.tsx
│       │   │   ├── CourseConsole.tsx
│       │   │   ├── QuizPlayer.tsx
│       │   │   └── SidekickChat.tsx
│       │   ├── hooks/          # 自訂 Hooks
│       │   ├── services/       # API 呼叫封裝
│       │   ├── stores/         # Zustand stores (auth, ui)
│       │   └── types/          # 共享型別 (從 shared 同步)
│       └── tests/
│
├── packages/
│   ├── shared/                 # 共享程式碼 (發布為內部套件)
│   │   └── src/
│   │       ├── contracts/      # 介面定義 (單一真相來源)
│   │       │   ├── IStorageAdapter.ts
│   │       │   ├── IStructuredStore.ts
│   │       │   ├── IKnowledgeGraphWriter.ts
│   │       │   ├── IAIReasoningGateway.ts
│   │       │   └── index.ts
│   │       ├── schemas/        # DTO Schemas (zod)
│   │       │   ├── raw-asset.schema.ts
│   │       │   ├── concept-node.schema.ts
│   │       │   ├── quiz-item.schema.ts
│   │       │   ├── user-config.schema.ts
│   │       │   └── index.ts
│   │       ├── types/          # 推導出的 TS 型別
│   │       │   ├── database.ts  # Supabase 生成型別
│   │       │   └── index.ts
│   │       └── utils/          # 共用工具函數
│   │
│   ├── ui/                     # 共用 UI 元件庫 (可選)
│   └── config/                 # 共享工具設定
│       ├── tsconfig.base.json
│       ├── biome.json
│       └── eslint.config.js
│
├── supabase/                   # Supabase 本地開發與遷移
│   ├── migrations/             # SQL 遷移檔
│   ├── functions/              # Edge Functions
│   │   └── export-to-b2/
│   ├── config.toml
│   └── seed.sql                # 種子資料 (semesters)
│
├── pnpm-workspace.yaml
├── turbo.json                  # Turborepo 配置 (可選)
├── package.json                # Root scripts
├── .env.example                # 環境變數範本 (入版)
├── .gitignore
└── agent.md                    # 本文件
```

### 分層依賴規則
```
apps/api/src/modules/*  →  apps/api/src/core/*  ←  apps/api/src/adapters/*
       ↓                        ↑                      ↑
  依賴介面               定義介面/實體              實作介面
(業務邏輯)              (零外部依賴)              (含 SDK)
```

---

## 4. 核心介面契約

位置：`packages/shared/src/contracts/`

### 4.1 IStorageAdapter (儲存層合約 — B2)
```typescript
// packages/shared/src/contracts/IStorageAdapter.ts
export interface IStorageAdapter {
  /** 上傳檔案至 B2，回傳 URI (s3://bucket/path) */
  uploadFile(path: string, byteStream: Readable): Promise<string>;

  /** 從 B2 下載檔案 */
  downloadFile(uri: string): Promise<Readable>;

  /** 列出目錄下所有檔案 URI */
  listDirectory(prefix: string): Promise<string[]>;

  /** 產生預簽名 URL (供 NIM 讀取私有圖片、前端直傳) */
  generatePresignedUrl(uri: string, expirySeconds: number): Promise<string>;
}
```

### 4.2 IStructuredStore (結構化資料合約 — Supabase)
```typescript
// packages/shared/src/contracts/IStructuredStore.ts
export interface IStructuredStore {
  // Courses
  createCourse(input: CreateCourseInput): Promise<Course>;
  getCoursesByUser(userId: string): Promise<Course[]>;
  getCourseById(id: string): Promise<Course | null>;
  updateCourse(id: string, patch: Partial<Course>): Promise<Course>;
  deleteCourse(id: string): Promise<void>;

  // Concept Nodes
  upsertConceptNodes(nodes: ConceptNodeInput[]): Promise<ConceptNode[]>;
  getConceptNodesByCourse(courseId: string): Promise<ConceptNode[]>;
  markConceptNodesExported(ids: string[], b2Uris: Map<string, string>): Promise<void>;

  // Quiz Items
  upsertQuizItems(items: QuizItemInput[]): Promise<QuizItem[]>;
  getQuizItemsByCourse(courseId: string): Promise<QuizItem[]>;
  markQuizItemsExported(ids: string[], b2Uri: string): Promise<void>;

  // Progress / Logs / Chat
  upsertProgress(progress: ProgressInput): Promise<void>;
  getDueReviews(userId: string, courseId: string, limit: number): Promise<Progress[]>;
  logAnswer(log: AnswerLogInput): Promise<void>;
  getChatHistory(sessionId: string): Promise<ChatMessage[]>;
  appendChatMessage(msg: ChatMessageInput): Promise<void>;

  // Realtime 訂閱封裝
  subscribeProgress(userId: string, callback: (payload: any) => void): () => void;
  subscribeChatMessages(sessionId: string, callback: (payload: any) => void): () => void;
}
```

### 4.3 IKnowledgeGraphWriter (知識轉譯合約 — 純記憶體轉換)
```typescript
// packages/shared/src/contracts/IKnowledgeGraphWriter.ts
import { ConceptNodePayload } from '../schemas/concept-node.schema';
import { QuizItemPayload } from '../schemas/quiz-item.schema';

export interface IKnowledgeGraphWriter {
  /** 將單一概念節點轉為 Markdown 字串 (含 frontmatter、雙向連結) */
  writeNode(node: ConceptNodePayload): string;

  /** 生成課程主控台筆記 (MOC)，包含雙向連結索引 */
  writeIndex(courseId: string, nodes: ConceptNodePayload[]): string;

  /** 生成題庫 JSON 字串 */
  writeQuizJson(items: QuizItemPayload[]): string;
}
```

### 4.4 IAIReasoningGateway (AI 推理合約)
```typescript
// packages/shared/src/contracts/IAIReasoningGateway.ts
export interface IAIReasoningGateway {
  /**
   * 多模態推理
   * @param systemPrompt 系統提示詞 (含 JSON Schema 指令)
   * @param textPayload 使用者文字內容
   * @param imageUrls 圖片 Presigned URL 陣列
   * @returns 解析後的 JSON 物件
   */
  multimodalInfer(
    systemPrompt: string,
    textPayload: string,
    imageUrls: string[]
  ): Promise<unknown>;
}
```

### 4.5 DTO Schemas (zod) — 對應 specs Schema A/B/C/D
```typescript
// packages/shared/src/schemas/raw-asset.schema.ts
export const RawAssetPayloadSchema = z.object({
  sessionId: z.string().uuid(),
  courseId: z.string(),
  transcripts: z.array(z.object({
    start_time: z.string(),
    end_time: z.string(),
    text: z.string(),
  })),
  visualAssets: z.array(z.object({
    page_num: z.number().int().positive(),
    b2_uri: z.string().url(),
  })),
});
export type RawAssetPayload = z.infer<typeof RawAssetPayloadSchema>;
```

```typescript
// packages/shared/src/schemas/concept-node.schema.ts
export const ConceptNodePayloadSchema = z.object({
  conceptId: z.string().uuid(),
  courseId: z.string(),
  term: z.string(),
  explanation: z.string(),
  relatedTerms: z.array(z.string()),
  sourceEvidence: z.object({
    transcriptRef: z.string(),
    slideUri: z.string().url(),
  }),
});
export type ConceptNodePayload = z.infer<typeof ConceptNodePayloadSchema>;
```

```typescript
// packages/shared/src/schemas/quiz-item.schema.ts
export const QuizItemPayloadSchema = z.object({
  quizId: z.string().uuid(),
  courseId: z.string(),
  type: z.enum(['multiple_choice', 'true_false', 'short_answer']),
  question: z.string(),
  options: z.array(z.string()).optional(),
  correctAnswer: z.string(),
  contextReference: z.string().uuid(),
});
export type QuizItemPayload = z.infer<typeof QuizItemPayloadSchema>;
```

```typescript
// packages/shared/src/schemas/user-config.schema.ts
export const UserConfigPayloadSchema = z.object({
  sessionId: z.string().uuid(),
  fusionLevel: z.enum(['strict_alignment', 'high_level_summary']),
  outputTemplates: z.array(z.enum(['knowledge_nodes', 'flashcard_quiz'])),
  b2TargetDir: z.string().url(),
});
export type UserConfigPayload = z.infer<typeof UserConfigPayloadSchema>;
```

---

## 5. 編碼規範與慣例

### TypeScript
- `strict: true`、`noUncheckedIndexedAccess: true`、`exactOptionalPropertyTypes: true`
- 公開 API **必須** 明確標註回傳型別
- 禁止 `any`、`@ts-ignore` (除非有充分理由並加註解)
- 使用 `zod` 定義 Schema，以 `z.infer<typeof Schema>` 推導型別

### 命名慣例
| 類型 | 慣例 | 範例 |
|------|------|------|
| 介面 | `I` 前綴 + PascalCase | `IStorageAdapter` |
| 型別/Schema | PascalCase + `Schema`/`Type` 後綴 | `RawAssetPayloadSchema` |
| 類別 | PascalCase | `B2StorageAdapter` |
| 函數/變數 | camelCase | `uploadFile` |
| 私有欄位 | `_` 前綴 | `_s3Client` |
| 常數 | UPPER_SNAKE_CASE | `MAX_RETRY_ATTEMPTS` |
| 檔案 | kebab-case | `b2-storage.adapter.ts` |

### 錯誤處理
- 使用 **Result/Either 模式** (`neverthrow`)：`Result<T, DomainError>`
- 業務邏輯**禁止 `throw`**，錯誤作為回傳值處理
- 領域錯誤定義於 `apps/api/src/core/errors/domain-errors.ts`
- 基礎設施錯誤 (網路、SDK) 在 Adapter 內轉為領域錯誤

### 依賴注入
- 建構子注入，介面作為建構子參數型別
- 使用 `tsyringe` 裝飾器：`@injectable()`、`@inject('IStorageAdapter')`
- DI 綁定於 `apps/api/src/main.ts` 啟動時完成

### 非同步處理
- 統一 `async/await`，避免 Promise chain
- 並行用 `Promise.all()` / `Promise.allSettled()`
- **禁止** fire-and-forget (未 await 的 Promise)
- 超時控制：`p-timeout` 或 `AbortSignal.timeout()`

### 測試策略
| 層級 | 工具 | 範圍 | 原則 |
|------|------|------|------|
| **單元測試** | Vitest | 核心領域 (entities, dag, state-machine) | 純函數、無副作用、AAA 模式 |
| **整合測試** | Vitest | Adapters (B2、Supabase、NIM、Markdown) | Mock 介面、測試真實 SDK 呼叫 |
| **E2E 測試** | Playwright | 完整 API 流程、前端關鍵路徑 | 測試真實 HTTP、Supabase Local、B2 LocalStack |

- **覆蓋率門檻**: `statements: 80%`, `branches: 70%`, `functions: 80%`, `lines: 80%`
- 測試檔案置於 `__tests__/` 或同級 `*.test.ts`

### Git 工作流
- **分支**: `main` (受保護) + `feature/*` + `fix/*` + `chore/*`
- **Commit**: Conventional Commits (`feat: add B2 upload`, `fix: handle presigned url expiry`)
- **PR**: 必須通過 CI (lint + typecheck + test + build)
- **Merge**: Squash and merge，保持 main 歷史乾淨

---

## 6. 實作階段與任務拆解

### Phase 1: Domain & Interfaces (Week 1)
- [ ] 初始化 pnpm Monorepo、共享 `tsconfig.base.json`、`biome.json`
- [ ] 定義 `packages/shared/src/contracts/`：4 介面 + 4 DTO Schemas (zod)
- [ ] 定義核心領域實體：`ConceptNode`、`QuizItem`、`RawAsset`、`Course`、`Session`、`UserProgress`、`ChatSession`
- [ ] 建立 DI 容器設定 (`apps/api/src/main.ts`) 與介面綁定機制
- [ ] 設定 `lefthook` pre-commit (biome check + format + tsc --noEmit)

### Phase 2: Infrastructure Adapters (Week 2)
- [ ] 實作 `B2StorageAdapter` (@aws-sdk/client-s3 + s3-request-presigner)
  - [ ] multipart upload 大檔支援
  - [ ] Presigned URL 產生 (GET/PUT、可配置過期時間)
  - [ ] 錯誤映射：SDK Error → DomainError
- [ ] 實作 `SupabaseStructuredStore` (實作 `IStructuredStore`)
  - [ ] Supabase Admin Client (service_role)
  - [ ] 所有 CRUD 方法、批次寫入、Realtime 訂閱封裝
- [ ] 實作 `NvidiaNimAdapter`
  - [ ] 多模態 Request 組裝 (interleaved text + image URLs)
  - [ ] System Prompt 外部化 (載入自 `config/prompts/`)
  - [ ] JSON Schema 強制輸出 (指令附加於 prompt 尾端)
  - [ ] 重試策略：指數退避 + 最大 3 次
- [ ] 實作 `ObsidianMarkdownWriter` (實作 `IKnowledgeGraphWriter`)
  - [ ] Frontmatter 生成 (YAML: conceptId, courseId, tags, sourceEvidence)
  - [ ] 雙向連結 `[[Term]]` 渲染
  - [ ] 資產引用相對路徑轉換
  - [ ] `writeQuizJson()` 產生題庫 JSON
  - [ ] **純記憶體運算，回傳字串，不寫入 B2**
- [ ] 整合測試：B2 上傳/下載/簽名、NIM 推理、Markdown/JSON 產出驗證、Supabase CRUD

### Phase 3: Core Orchestrator (Week 3)
- [ ] 實作 Ingestion Pipeline
  - [ ] `/inbox/audio/` 監聽器 (輪詢或 Event Notification)
  - [ ] 音檔分段 → 語音轉文字 (Whisper API 或本地模型)
  - [ ] PPT/PDF → 逐頁 PNG 渲染 (pdf2pic 或 LibreOffice headless)
  - [ ] 組裝 `RawAssetPayload` 寫入 B2 `/processing/{sessionId}.json`
- [ ] 實作 DAG 引擎 (Node A-F)
  - [ ] Node A: Load Data (讀取 RawAssetPayload)
  - [ ] Node B: B2 URL Signing (視覺資產產生 15 分鐘 Presigned URL)
  - [ ] Node C: Prompt Assembly (文字 + URLs 交錯組裝)
  - [ ] Node D: AI Execution (並行呼叫 IAIReasoningGateway)
  - [ ] Node E: Validation (zod Schema 驗證、失敗重試)
  - [ ] Node F: Persistence (IStructuredStore 寫入 Supabase + IKnowledgeGraphWriter 產生字串)
- [ ] 實作 Orchestrator HTTP 端點
  - [ ] `POST /api/orchestrator/start` - 啟動 DAG
  - [ ] `GET /api/orchestrator/status/:sessionId` - 查詢狀態
  - [ ] `POST /api/orchestrator/retry/:sessionId` - 失敗節點重試
- [ ] 端到端測試：完整流程從 inbox 到 Supabase 持久化

### Phase 4: Gamification API & Frontend (Week 4)
- [ ] 實作 Sidekick 狀態機
  ```typescript
  // 狀態: INITIALIZE → PLAYING → SIDEKICK_HELP → PLAYING
  // INITIALIZE: 載入 QuizItemPayload[] 從 Supabase
  // PLAYING: 使用者作答、判定對錯、經驗值計算、SRS 更新
  // SIDEKICK_HELP: 讀取 ConceptNode + PPT 圖片 → 組裝上下文 → 呼叫 IAIReasoningGateway
  ```
- [ ] 實作 BFF 端點
  - [ ] `GET /api/gamification/quiz/:courseId` - 載入測驗
  - [ ] `POST /api/gamification/answer` - 提交答案
  - [ ] `POST /api/gamification/sidekick` - 呼叫 Sidekick
- [ ] 實作導出觸發端點
  - [ ] `POST /api/export/trigger` - 手動觸發單一 Course 導出
- [ ] 實作前端頁面
  - [ ] 登入/註冊 (Supabase Auth Email Magic Link)
  - [ ] 儀表板 (學期/課程管理、建立課程)
  - [ ] 課程主控台 (MOC 展示、全文搜尋、進度追蹤、Realtime 更新)
  - [ ] 測驗介面 (題目、選項、即時回饋、Sidekick 按鈕)
  - [ ] Sidekick 聊天 (串流回應、Markdown 渲染、程式碼高亮、上下文引用顯示)
- [ ] 整合測試：完整遊戲化流程 (載入 → 作答 → 錯誤 → Sidekick → 繼續 → 進度同步)

### Phase 5: B2 Export Pipeline & Polish (Week 5)
- [ ] 實作 Supabase Edge Function `export-to-b2`
- [ ] 設定 `pg_cron` 排程 (每 5 分鐘)
- [ ] 實作 `export_errors` 表與重試機制
- [ ] 手動觸發導出 API 與前端按鈕
- [ ] Obsidian Vault 導出驗證 (Remotely Save 同步測試)
- [ ] E2E 測試：完整流程從音檔上傳 → AI 分析 → Supabase → B2 導出 → Obsidian 同步

---

## 7. 環境變數與 Secret 管理

### .env.example (入版)
```env
# Backblaze B2
B2_APPLICATION_KEY_ID=
B2_APPLICATION_KEY=
B2_BUCKET_NAME=pkm-omni-vault
B2_ENDPOINT=https://s3.us-west-004.backblazeb2.com
B2_REGION=us-west-004

# NVIDIA NIM
NVIDIA_API_KEY=
NVIDIA_BASE_URL=https://integrate.api.nvidia.com/v1
NVIDIA_MODEL=nvidia/nemotron-3-ultra

# Supabase
VITE_SUPABASE_URL=https://<ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon-public-key>
SUPABASE_SERVICE_ROLE_KEY=<service-role-secret>  # 僅 Server/Edge Function
SUPABASE_DB_URL=postgresql://postgres:<password>@db.<ref>.supabase.co:5432/postgres

# App
NODE_ENV=development
PORT=3000
LOG_LEVEL=debug
API_PREFIX=/api

# Frontend (Vite 會自動注入 VITE_* 變數)
VITE_API_BASE_URL=http://localhost:3000
```

### 載入與驗證
```typescript
// apps/api/src/config/env.ts
import { z } from 'zod';

const EnvSchema = z.object({
  B2_APPLICATION_KEY_ID: z.string().min(1),
  B2_APPLICATION_KEY: z.string().min(1),
  B2_BUCKET_NAME: z.string().min(1),
  B2_ENDPOINT: z.string().url(),
  B2_REGION: z.string().min(1),
  NVIDIA_API_KEY: z.string().min(1),
  NVIDIA_BASE_URL: z.string().url(),
  NVIDIA_MODEL: z.string().min(1),
  VITE_SUPABASE_URL: z.string().url(),
  VITE_SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  SUPABASE_DB_URL: z.string().url(),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(3000),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  API_PREFIX: z.string().startsWith('/').default('/api'),
});

export const env = EnvSchema.parse(process.env);
```
- 啟動時於 `main.ts` 最前端呼叫 `env` 驗證，失敗即退出
- `.env` 加入 `.gitignore`，生產環境透過平台 Secret 注入 (Vercel / Supabase Dashboard)

---

## 8. 常用開發指令

### Root package.json Scripts
```json
{
  "scripts": {
    "dev:api": "pnpm --filter api dev",
    "dev:web": "pnpm --filter web dev",
    "dev": "concurrently \"pnpm dev:api\" \"pnpm dev:web\"",
    "build": "pnpm -r run build",
    "build:api": "pnpm --filter api build",
    "build:web": "pnpm --filter web build",
    "test": "pnpm -r run test",
    "test:coverage": "pnpm -r run test:coverage",
    "test:watch": "pnpm -r run test:watch",
    "lint": "biome check .",
    "lint:fix": "biome check --write .",
    "format": "biome format --write .",
    "typecheck": "tsc --noEmit",
    "typecheck:watch": "tsc --noEmit --watch",
    "clean": "rm -rf node_modules apps/*/node_modules packages/*/node_modules apps/*/dist packages/*/dist .turbo",
    "db:push": "pnpm --filter api db:push",
    "db:migrate": "pnpm --filter api db:migrate",
    "db:seed": "pnpm --filter api db:seed",
    "supabase:start": "supabase start",
    "supabase:stop": "supabase stop",
    "supabase:types": "supabase gen types typescript --local > packages/shared/src/types/database.ts",
    "ci": "pnpm lint && pnpm typecheck && pnpm test:coverage"
  }
}
```

### 建議 Shell Aliases
```bash
alias plks-dev='pnpm dev'
alias plks-test='pnpm test:coverage'
alias plks-ci='pnpm ci'
alias plks-build='pnpm build'
alias plks-lint='pnpm lint:fix'
alias plks-clean='pnpm clean && pnpm install'
alias plks-db-types='pnpm supabase:types'
```

---

## 9. 避坑指南與反模式

### ❌ 絕對禁止 (Hard Forbidden)

| 反模式 | 正確做法 |
|--------|----------|
| 直接 `fs.writeFileSync()` 寫入專案目錄 | 僅 `/tmp` 允許暫存，持久化全走 `IStorageAdapter` / `IStructuredStore` |
| 業務邏輯 `import { S3Client } from '@aws-sdk/client-s3'` | 僅 `B2StorageAdapter` 內部使用 SDK |
| 業務邏輯 `import { createClient } from '@supabase/supabase-js'` | 僅 `SupabaseStructuredStore` 內部使用 SDK |
| `const PROMPT = \`You are... \`` 硬編碼 | Prompt 置於 `config/prompts/*.txt`，執行時讀取 |
| `const result = await ai.infer(...)` 無驗證 | `const parsed = Schema.safeParse(result); if (!parsed.success) throw/retry` |
| `class Orchestrator { private state = {} }` 記憶體狀態 | 無狀態設計，狀態全在 Supabase/B2 |
| `.env` commit 到 Git | `.env.example` 入版，`.env` gitignore |
| 測試呼叫真實 `b2.uploadFile()` / `supabase.from()` | `vi.mock('@/adapters/...')` Mock 介面 |
| `DomainService` 直接 `new B2StorageAdapter()` | 建構子注入 `IStorageAdapter` |
| 客戶端繞過 RLS 用 Service Role Key | 客戶端只能用 Anon Key，RLS 由 Policy 管控 |

### ✅ 推薦模式 (Best Practices)

| 模式 | 說明 |
|------|------|
| **Adapter 隔離** | 所有外部呼叫 (B2、Supabase、NIM、檔案系統) 封裝在 `adapters/`，業務層零依賴 |
| **DAG 節點單一職責** | 每個 Node 只做一件事，輸入/輸出為純資料，易測試、易重試 |
| **Presigned URL 橋接** | 私有 B2 物件 → 短期公開 URL → 供 NIM/前端直接存取 |
| **Sidekick 上下文限制** | 僅傳遞「當前錯題 + 對應 ConceptNode + 參考投影片」，禁止泛用知識 |
| **Zod 邊界驗證** | 所有外部輸入 (HTTP Body、B2 JSON、AI 輸出) 統一經 Schema 驗證 |
| **Result 錯誤處理** | `return err(new DomainError('STORAGE_UPLOAD_FAILED', cause))` 而非 throw |
| **單一寫入真相來源** | Orchestrator Node F 只寫 Supabase，B2 導出完全解耦至背景任務 |
| **RLS 即權限** | 所有業務表啟用 RLS，Policy 綁定 `auth.uid()`，零應用層權檢代碼 |

---

## 10. 關鍵檔案快速導覽

| 檔案 | 用途 |
|------|------|
| `packages/shared/src/contracts/` | 所有介面定義 (單一真相來源) |
| `packages/shared/src/schemas/` | 所有 DTO Schemas (zod) |
| `packages/shared/src/types/database.ts` | Supabase 生成的資料庫型別 |
| `apps/api/src/main.ts` | 應用啟動、DI 綁定、環境變數驗證 |
| `apps/api/src/adapters/b2-storage.adapter.ts` | B2 實作細節 |
| `apps/api/src/adapters/supabase-structured-store.adapter.ts` | Supabase 結構化資料實作 |
| `apps/api/src/adapters/nim-reasoning.adapter.ts` | NIM 多模態呼叫邏輯 |
| `apps/api/src/adapters/obsidian-markdown.writer.ts` | Markdown/JSON 產出邏輯 (純記憶體) |
| `apps/api/src/core/dag/engine.ts` | DAG 執行引擎 |
| `apps/api/src/core/state-machine/sidekick.ts` | 遊戲化狀態機 |
| `apps/api/src/config/env.ts` | 環境變數 Schema 與驗證 |
| `apps/api/src/routes/orchestrator.ts` | Orchestrator HTTP 端點 |
| `apps/api/src/routes/gamification.ts` | 遊戲化 BFF 端點 |
| `apps/api/src/routes/export.ts` | 導出觸發端點 |
| `supabase/migrations/` | 資料庫遷移檔 |
| `supabase/functions/export-to-b2/` | B2 導出 Edge Function |
| `supabase/seed.sql` | 學期種子資料 |

---

## 11. 給 AI Agent 的特別提醒

> **讀取本文件後，請遵循以下原則：**

1. **先看介面，再寫實作** — 任何新功能先在 `packages/shared/src/contracts/` 定義介面/Schema
2. **不跨層呼叫** — `modules/` 只能 import `core/` 和 `contracts/`，不能 import `adapters/`
3. **測試先行** — 新增邏輯前先寫測試 (TDD)，測試 Mock 介面而非實作
4. **小步提交** — 每個任務完成對應一個 Conventional Commit
5. **遇到不確定** — 停下來詢問使用者，不要猜測規格細節
6. **RLS 即權限** — 不要在應用層寫權限檢查，信任 Supabase RLS Policy
7. **單一寫入路徑** — 結構化資料只寫 Supabase，B2 只做導出輸出

---

*本文件根據 `specs/specs1.md` 與 `specs/specs2.md` 藍圖生成，若藍圖更新請同步修改此文件。*