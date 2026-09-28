這是一份專為「AI 開發 Agent（如 Cursor, Claude Dev, AutoGPT）」設計的**系統實作藍圖（Master Implementation Blueprint）**。

這份藍圖採用了高度結構化的語言（偽合約、架構定義），讓未來的 AI Agent 讀取後，能立刻理解系統邊界、接口與資料流，且保證絕對的解耦。

因應最新架構演進：**「混合儲存架構 —— Supabase (PostgreSQL) 為結構化資料主存，Backblaze B2 為大型檔案與 Obsidian 同步輸出」**。

為了確保細節足夠深且不遺漏，我將藍圖分為兩次輸出。這是 **【第一部分：系統上下文、混合儲存層與核心合約定義】**。

---

# 🤖 Agent Master Blueprint - Part 1: Core & Storage

## [META-INFO] 系統全局配置
*   **System Name:** PLKS (Personal Learning Knowledge System)
*   **Architecture Pattern:** Clean Architecture, Hexagonal (Ports & Adapters), Event-Driven.
*   **State Management:** Stateless processing. Structured state in Supabase (PostgreSQL). Large files & Obsidian sync output in Backblaze B2.
*   **Single Source of Truth (Structured):** Supabase (PostgreSQL) with RLS.
*   **Single Source of Truth (Blobs):** Backblaze B2 Object Storage (S3-Compatible API).
*   **Strict Rule for Agent:** NO local file system writes except for ephemeral `/tmp` processing. Direct implementation of business logic MUST NOT depend on specific external tools. Always use interfaces (`I...`).

---

## [INFRASTRUCTURE] 雲端拓撲架構 (混合儲存)

### Supabase (PostgreSQL) — 結構化資料主存
*   **資料表**：Courses, ConceptNodes, QuizItems, UserProgress, AnswerLogs, ChatSessions, ChatMessages, Semesters (種子資料)
*   **特性**：Row Level Security (RLS)、Full-Text Search (tsvector)、pgvector (可選、未來擴充)、Realtime 訂閱、pg_cron 排程
*   **認證**：Supabase Auth (Email Magic Link / OTP)

### Backblaze B2 — 大型檔案與 Obsidian 同步輸出
*   **用途**：
    1. 原始大檔（音訊、投影片 PDF/PPT、渲染圖片）
    2. Obsidian Vault 導出輸出目標（Markdown、JSON、資產）
*   **存取**：透過 `IStorageAdapter` (Presigned URL、上傳/下載)

**B2 Bucket Structure (`pkm-omni-vault`):**
```text
/inbox/                 # 尚未處理的原始檔案 (Agent 監聽區)
  ├── audio/            # 1小時分段錄音
  └── slides/           # 原始 PPT / PDF
/processing/            # 系統運算中暫存 (RawAssetPayload JSON)
/vault/                 # Obsidian 根目錄 (知識保存區，唯讀導出)
  ├── {Course_ID}/      # 獨立課程空間
      ├── _assets/      # 該課程專屬截圖、語音切片
      ├── _quiz/        # 遊戲化題庫 JSON 導出
      ├── 原始逐字稿.md  # 帶時間軸原始記錄
      └── [[AI 概念筆記]].md  # 雙向連結知識節點
```

---

## [INTERFACE_CONTRACTS] 核心解耦合約
AI Agent 開發時，必須先實作以下核心介面，業務邏輯層只能依賴這些介面。

### 1. IStorageAdapter (儲存層合約 — B2)
負責所有與 Backblaze B2 (S3 API) 的溝通。大型檔案讀寫、Presigned URL 簽名。
*   `uploadFile(path, byteStream) -> URI`
*   `downloadFile(URI) -> byteStream`
*   `listDirectory(prefix) -> List<URI>`
*   `generatePresignedUrl(URI, expiry) -> URL` (提供給前端或 NVIDIA NIM 讀取圖片用)

### 2. IStructuredStore (結構化資料合約 — Supabase)
負責所有結構化業務資料的 CRUD、查詢、即時訂閱。**單一寫入真相來源。**
*   **Courses**: `createCourse`, `getCoursesByUser`, `getCourseById`, `updateCourse`, `deleteCourse`
*   **ConceptNodes**: `upsertConceptNodes` (批次)、`getConceptNodesByCourse`、 `markConceptNodesExported`
*   **QuizItems**: `upsertQuizItems` (批次)、`getQuizItemsByCourse`、 `markQuizItemsExported`
*   **Progress/Logs/Chat**: `upsertProgress`, `getDueReviews`, `logAnswer`, `getChatHistory`, `appendChatMessage`

### 3. IKnowledgeGraphWriter (知識轉譯合約 — 純記憶體轉換)
**職責單一化**：將 DTO 轉換為 Markdown/JSON 字串，**不寫入 B2**，不依賴 `IStorageAdapter`。
*   `writeNode(node: ConceptNodePayload) -> string` (回傳 Markdown 內容)
*   `writeIndex(courseId: string, nodes: ConceptNodePayload[]) -> string` (回傳 MOC Markdown 內容)
*   `writeQuizJson(items: QuizItemPayload[]) -> string` (回傳 JSON 字串)

### 4. IAIReasoningGateway (AI 推理合約)
封裝外部 AI 模型（目前為 NVIDIA NIM），業務層不需知道具體呼叫哪個 API。
*   `multimodalInfer(systemPrompt, textPayload, imageUrls) -> JSON`

---

## [DATA_SCHEMAS] 跨模組資料交換標準 (DTOs)

**Schema A: 原始資產結構 (RawAssetPayload)**
*產生者：Ingestion Service / 消費者：Orchestrator*
```json
{
  "sessionId": "UUID",
  "courseId": "string",
  "transcripts": [
    {"start_time": "00:00:00", "end_time": "00:01:00", "text": "..."}
  ],
  "visualAssets": [
    {"page_num": 1, "b2_uri": "s3://pkm-omni-vault/vault/course/_assets/slide1.png"}
  ]
}
```

**Schema B: 知識節點合約 (ConceptNodePayload)**
*產生者：AI Gateway / 消費者：IStructuredStore + IKnowledgeGraphWriter*
```json
{
  "conceptId": "UUID",
  "courseId": "string",
  "term": "邊際效應",
  "explanation": "在經濟學中指...",
  "relatedTerms": ["供需法則", "機會成本"],
  "sourceEvidence": {
    "transcriptRef": "00:15:30",
    "slideUri": "s3://pkm-omni-vault/vault/course/_assets/slide5.png"
  }
}
```

**Schema C: 遊戲化題庫合約 (QuizItemPayload)**
*產生者：AI Gateway / 消費者：IStructuredStore + IKnowledgeGraphWriter*
```json
{
  "quizId": "UUID",
  "courseId": "string",
  "type": "multiple_choice",
  "question": "當邊際成本大於邊際收益時，企業應該？",
  "options": ["A. 增產", "B. 減產", "C. 維持不變"],
  "correctAnswer": "B",
  "contextReference": "UUID of ConceptNode"
}
```

**Schema D: 使用者配置 (UserConfigPayload)**
*產生者：前端控制台 / 消費者：Orchestrator*
```json
{
  "sessionId": "UUID",
  "fusionLevel": "strict_alignment",
  "outputTemplates": ["knowledge_nodes", "flashcard_quiz"],
  "b2TargetDir": "s3://pkm-omni-vault/vault/CS101/"
}
```

---

## [PIPELINE_MODULE_1] 模組分塊：輸入與預處理 (Ingestion Pipeline)
**職責：** 監聽 B2 `/inbox/` 目錄，將音檔與簡報標準化。

*   **流程規範：**
    1.  觸發器偵測到 `/inbox/audio/` 有新檔案。
    2.  將音檔拉入 `/tmp`，呼叫語音轉文字服務（產生帶時間軸 JSON）。
    3.  將 PPT/PDF 拉入 `/tmp`，逐頁渲染成圖片（PNG）。
    4.  將圖片上傳至 B2 `/vault/{Course_ID}/_assets/` (透過 `IStorageAdapter`)。
    5.  組裝成 `RawAssetPayload`，寫入 B2 `/processing/{sessionId}.json`，通知 Orchestrator。

---

**(第一部分結束)**

這份藍圖定義了 **混合基礎建設（Supabase + B2）、通訊合約（4 介面）、資料結構（4 Schemas）以及前端資料處理（Ingestion）**。未來的 AI 只要讀懂這份合約，就能毫無偏差地建構底層。