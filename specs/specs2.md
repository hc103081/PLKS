這是 **【第二部分：DAG 任務調度、NVIDIA NIM 推理流程、遊戲化伴讀 AI 狀態機、B2 導出 Pipeline、部署架構】**。

請將此藍圖與第一部分合併，這將是 AI Agent 開發本系統的完整最高指導原則。

---

# 🤖 Agent Master Blueprint - Part 2: Orchestration, Inference, Gamification & Export

## [PIPELINE_MODULE_2] 核心調度與控制台 (Orchestrator & DAG Engine)
**職責：** 接收前端（人類）的設定指令，並以「有向無環圖 (DAG)」的方式排程任務，串聯 Supabase、B2、AI 推理與知識轉譯。本身不包含任何業務運算。

**配置合約 (UserConfigPayload):**
*產生者：前端控制台 / 消費者：Orchestrator*
```json
{
  "sessionId": "UUID",
  "fusionLevel": "strict_alignment",
  "outputTemplates": ["knowledge_nodes", "flashcard_quiz"],
  "b2TargetDir": "s3://pkm-omni-vault/vault/CS101/"
}
```

**DAG 執行流程 (Agent 實作要求)：**
1.  **[Node A: Load Data]** 根據 `sessionId`，透過 `IStorageAdapter` 從 B2 `/processing/` 拉取對應的 `RawAssetPayload`。
2.  **[Node B: B2 URL Signing]** 產生視覺資產（幻燈片）的 **Presigned URL (15 分鐘時效)**，供 NIM 讀取。
3.  **[Node C: Prompt Assembly]** 將預處理的文字與 Presigned URLs 交錯組裝。
4.  **[Node D: AI Execution]** 呼叫 `IAIReasoningGateway` (並行處理多模態推理)。
5.  **[Node E: Validation]** Zod Schema 驗證 AI 輸出 (`ConceptNodePayload[]`, `QuizItemPayload[]`)，失敗觸發重試 (指數退避、最多 3 次)。
6.  **[Node F: Persistence]** **單一寫入真相來源 → Supabase**
    *   `IStructuredStore.upsertConceptNodes()` 寫入概念節點
    *   `IStructuredStore.upsertQuizItems()` 寫入題庫
    *   `IKnowledgeGraphWriter.writeNode()` 產生 Markdown 字串 (純記憶體)
    *   `IKnowledgeGraphWriter.writeIndex()` 產生 MOC Markdown 字串
    *   `IKnowledgeGraphWriter.writeQuizJson()` 產生 Quiz JSON 字串
    *   立即回傳成功給前端 (DB 已持久化)
    *   **B2 導出完全解耦**：由背景任務 (pg_cron + Edge Function) 稍後讀 DB → 上傳 B2 → 更新 `b2_*_uri`

---

## [PIPELINE_MODULE_3] AI 推理網關 (NVIDIA NIM Integration)
**職責：** 封裝與 `nvidia/nemotron-3-ultra` 的多模態互動，強制輸出結構化資料。

**Agent 實作約束 (AI Adapter Design)：**
*   **介面實作：** 實作第一部分定義的 `IAIReasoningGateway`。
*   **System Prompt 隔離：** 系統提示詞必須獨立存放於 `config/prompts/*.txt`，不可硬編碼。
*   **多模態處理策略：**
    *   模型支援 Interleaved (交錯式) 輸入。Agent 需將時間軸文字與對應的 PPT Presigned URL 交替放入 Request Payload。
    *   **強制指令：** Prompt 結尾必須加上：`"You MUST output ONLY valid JSON matching the provided JSON schema. Do not wrap in markdown blocks like \`\`\`json."`
*   **輸出驗證：** 使用 zod `safeParse`，失敗即重試。

---

## [PIPELINE_MODULE_4] 遊戲化複習與伴讀 AI (Gamified Review & Sidekick)
**職責：** 以 BFF 模式運作。從 Supabase 讀取題庫與進度，管理 Sidekick 上下文。

### 🎮 系統狀態機設計 (State Machine for Gamification)
Agent 必須以此狀態機管理遊戲化測驗與伴讀流程：

*   **[State: INITIALIZE]**
    *   Action: 前端請求載入測驗。
    *   Service: `IStructuredStore.getQuizItemsByCourse(courseId)` 從 Supabase 載入 `QuizItemPayload[]`。
    *   Transition -> `[State: PLAYING]`
*   **[State: PLAYING]**
    *   Action: 使用者作答 → `IStructuredStore.logAnswer()` 記錄。
    *   Condition: 答對 -> 更新 `UserProgress` (SRS 排程)、進入下一題。
    *   Condition: 答錯或點擊「呼叫 Sidekick」 -> Transition -> `[State: SIDEKICK_HELP]`
*   **[State: SIDEKICK_HELP]** (核心解耦邏輯)
    *   Action 1: 讀取題目 `contextReference` (ConceptNode UUID)。
    *   Action 2: `IStructuredStore.getConceptNodesByCourse()` 取得完整筆記；`IStorageAdapter.generatePresignedUrl()` 取得參考投影片圖片 URL。
    *   Action 3: 將 **「使用者問題 + 錯題 + ConceptNode 筆記 + 投影片圖片 URLs」** 打包送給 `IAIReasoningGateway`。
    *   *Prompt 限制:* `"You are a Sidekick Tutor. Answer STRICTLY based on provided context (student's notes + slides). DO NOT invent knowledge. Use Socratic method."`
    *   Action 4: `IStructuredStore.appendChatMessage()` 存入對話歷史。
    *   Transition -> 回到 `[State: PLAYING]`

### 📡 即時性需求
*   `UserProgress` 變更 → Supabase Realtime 推播前端進度條
*   `ChatMessages` 新增 → Realtime 推播 Sidekick 回應 (串流模擬)

---

## [PIPELINE_MODULE_5] B2 導出 Pipeline (背景任務，非阻塞)
**職責：** 將 Supabase 結構化資料導出為 Obsidian 相容的 Markdown/JSON，上傳至 B2 `/vault/`，供 Remotely Save 同步。

### 架構
```
pg_cron (每 5 分鐘) 
  → Supabase Edge Function: export-to-b2
      → 查詢未導出的 ConceptNodes / QuizItems (依 Course 批次)
      → IKnowledgeGraphWriter.writeNode() / writeIndex() / writeQuizJson() 產生字串
      → IStorageAdapter.uploadFile() 上傳至 B2
      → IStructuredStore.markConceptNodesExported() / markQuizItemsExported() 更新 URI
      → 失敗寫入 export_errors 表，指數退避重試 (最多 3 次)
```

### 關鍵設計
| 項目 | 決策 |
|------|------|
| 觸發方式 | `pg_cron` 排程 + 手動觸發 API (`POST /api/export/trigger`) |
| 導出單位 | Course 級批次 |
| 冪等性 | `b2_markdown_uri` / `b2_json_uri` 非空即視為已導出 |
| 權限 | Edge Function 使用 `SERVICE_ROLE_KEY` 繞過 RLS |
| B2 路徑 | `{course.b2_prefix}_exports/{conceptId}.md`、`{course.b2_prefix}_quiz/quiz.json` |

### 輔助表
```sql
CREATE TABLE export_errors (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id    UUID REFERENCES courses(id) ON DELETE CASCADE,
  entity_type  TEXT NOT NULL CHECK (entity_type IN ('concept_node','quiz_item')),
  entity_id    UUID NOT NULL,
  payload      JSONB NOT NULL,
  error_msg    TEXT NOT NULL,
  retry_count  INT DEFAULT 0,
  created_at   TIMESTAMPTZ DEFAULT now()
);
```

---

## [SYSTEM_SECURITY_&_OPERATIONS] 維運與安全規範

1.  **無狀態運算：** 應用程式伺服器不儲存業務狀態。結構化狀態在 Supabase，大檔在 B2。
2.  **Secret Management (環境變數)：**
    *   `B2_APPLICATION_KEY_ID` / `B2_APPLICATION_KEY`
    *   `NVIDIA_API_KEY`
    *   `SUPABASE_SERVICE_ROLE_KEY` (僅 Server/Edge Function)
    *   絕不寫入 Git，透過平台 Secret 注入。
3.  **依賴反轉：** 測試時 Mock `IStorageAdapter`、`IStructuredStore`、`IKnowledgeGraphWriter`、`IAIReasoningGateway`，不呼叫真實服務。
4.  **RLS 強制：** 所有業務表啟用 RLS，Policy 綁定 `auth.uid()`。

---

## [DEPLOYMENT] 部署架構 (免費額度優化)

| 層級 | 服務 | 免費額度 | 用途 |
|------|------|----------|------|
| **前端 + API** | Vercel (Hobby) | 無限個人專案 | `apps/web` (Vite) + `apps/api` (Fastify as Serverless Functions) |
| **資料庫 + Auth + Realtime + Edge Functions + pg_cron** | Supabase | 500 MB DB、50k MAU、2M Realtime msg/月 | 結構化資料、認證、即時訂閱、背景導出 |
| **大型檔案儲存** | Backblaze B2 | 10 GB、2.5k Class A/天 | 原始音訊/投影片、Obsidian Vault 導出 |
| **AI 推理** | NVIDIA NIM | 視 API 方案 | 多模態推理 |

**環境變數分類：**
*   **Client (Vite `VITE_*`)**: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_API_BASE_URL`
*   **Server (Vercel / Supabase Edge)**: `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_DB_URL`, `B2_*`, `NVIDIA_*`, `NODE_ENV`, `LOG_LEVEL`

---

## 🚀 [AGENT_EXECUTION_STEPS] 啟動執行指南 (更新版)

當 AI Agent 讀取完這兩部分藍圖後，應按照以下順序執行開發：

### Phase 1: Domain & Interfaces (Week 1)
- [ ] 初始化 pnpm Monorepo、共享 `tsconfig.base.json`、`biome.json`
- [ ] 定義 `packages/shared/src/contracts/`：4 介面 (`IStorageAdapter`, `IStructuredStore`, `IKnowledgeGraphWriter`, `IAIReasoningGateway`) + 4 DTO Schemas (zod)
- [ ] 定義核心領域實體：`ConceptNode`、`QuizItem`、`RawAsset`、`Course`、`Session`、`UserProgress`、`ChatSession`
- [ ] 建立 DI 容器設定 (`apps/api/src/main.ts`) 與介面綁定機制 (tsyringe)
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
    - [ ] JSON Schema 強制輸出、重試策略 (指數退避、最大 3 次)
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
- [ ] 實作 Sidekick 狀態機 (INITIALIZE → PLAYING → SIDEKICK_HELP → PLAYING)
- [ ] 實作 BFF 端點
    - [ ] `GET /api/gamification/quiz/:courseId` - 載入測驗 (Supabase)
    - [ ] `POST /api/gamification/answer` - 提交答案 (記錄 + SRS 更新)
    - [ ] `POST /api/gamification/sidekick` - 呼叫 Sidekick (組裝上下文 → NIM)
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

**(第二部分結束，藍圖完整建構完畢)**