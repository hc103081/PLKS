這是一份專為「AI 開發 Agent（如 Cursor, Claude Dev, AutoGPT）」設計的**系統實作藍圖（Master Implementation Blueprint）**。

這份藍圖採用了高度結構化的語言（偽合約、架構定義），讓未來的 AI Agent 讀取後，能立刻理解系統邊界、接口與資料流，且保證絕對的解耦。

因應你最新的需求：**「檔案不存本機，全面改用 Backblaze B2 (B2) 雲端儲存」**，系統儲存架構已全面重構為「物件儲存（Object Storage）優先」。未來的 Obsidian 也是透過同步外掛（如 Remotely Save）直接與 B2 儲存桶連動。

為了確保細節足夠深且不遺漏，我將藍圖分為兩次輸出。這是 **【第一部分：系統上下文、B2 儲存層與核心合約定義】**。

---

# 🤖 Agent Master Blueprint - Part 1: Core & Storage

## [META-INFO] 系統全局配置
*   **System Name:** Omniscient PKM System (OPKMS)
*   **Architecture Pattern:** Clean Architecture, Hexagonal (Ports & Adapters), Event-Driven.
*   **State Management:** Stateless processing. All persistent state resides in B2.
*   **Single Source of Truth:** Backblaze B2 Object Storage (S3-Compatible API).
*   **Strict Rule for Agent:** NO local file system writes except for ephemeral `/tmp` processing. Direct implementation of business logic MUST NOT depend on specific external tools. Always use interfaces (`I...`).

---

## [INFRASTRUCTURE] 雲端拓撲架構 (B2 核心)
由於放棄本機儲存，整個系統的檔案生命週期都在 Backblaze B2 上進行。B2 儲存桶（Buckets）的目錄結構規範如下，這是系統讀寫的絕對路徑標準：

**B2 Bucket Structure (`pkm-omni-vault`):**
```text
/inbox/                 # 尚未處理的原始檔案 (Agent 的監聽區)
  ├── audio/            # 1小時分段錄音
  └── slides/           # 原始 PPT / PDF
/processing/            # 系統運算中的暫存區
/vault/                 # Obsidian 的根目錄 (知識保存區)
  ├── {Course_ID}/      # 獨立課程空間
      ├── _assets/      # 存放該課程專屬的截圖、語音切片
      ├── _quiz/        # 遊戲化系統讀取的 JSON 題庫檔
      ├── 原始逐字稿.md    # 帶有時間軸的原始記錄
      └── [[AI 概念筆記]].md  # 雙向連結的知識節點
```

---

## [INTERFACE_CONTRACTS] 核心解耦合約
AI Agent 開發時，必須先實作以下核心介面，業務邏輯層只能依賴這些介面。

### 1. IStorageAdapter (儲存層合約)
負責所有與 Backblaze B2 (S3 API) 的溝通。所有模組的檔案讀寫都必須通過此介面。
*   `uploadFile(path, byteStream) -> URI`
*   `downloadFile(URI) -> byteStream`
*   `listDirectory(prefix) -> List<URI>`
*   `generatePresignedUrl(URI, expiry) -> URL` (提供給前端或 NVIDIA NIM 讀取圖片用)

### 2. IKnowledgeGraphWriter (知識轉譯合約)
負責將系統的結構化資料，轉換成 Obsidian 支援的 Markdown 格式，並透過 `IStorageAdapter` 寫入 B2。
*   `writeNode(ConceptNode) -> Boolean` (將概念轉為 Markdown 檔案並包含 `[[雙向連結]]`)
*   `writeIndex(CourseID, List<ConceptNode>) -> Boolean` (生成課程主控台筆記 MOC)

### 3. IAIReasoningGateway (AI 推理合約)
封裝外部 AI 模型（目前為 NVIDIA NIM），業務層不需知道具體呼叫哪個 API。
*   `multimodalInfer(prompt, textPayload, List<imageUrl>) -> JSON`

---

## [DATA_SCHEMAS] 跨模組資料交換標準
這是系統模組之間傳遞的唯一合法格式（Data Transfer Objects, DTOs），Agent 必須嚴格按照此 Schema 進行序列化與反序列化。

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
*產生者：AI Gateway / 消費者：Knowledge Graph Writer*
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
*產生者：AI Gateway / 消費者：Gamification Engine*
```json
{
  "quizId": "UUID",
  "courseId": "string",
  "type": "multiple_choice",
  "question": "當邊際成本大於邊際收益時，企業應該？",
  "options": ["A. 增產", "B. 減產", "C. 維持不變"],
  "correctAnswer": "B",
  "contextReference": " UUID of ConceptNode " // 用於 Sidekick AI 輔導的依據
}
```

---

## [PIPELINE_MODULE_1] 模組分塊：輸入與預處理 (Ingestion Pipeline)
**職責：** 監聽 B2 `/inbox/` 目錄，將音檔與簡報標準化。

*   **流程規範：**
    1.  觸發器（Trigger）偵測到 `/inbox/audio/` 有新檔案。
    2.  將音檔拉入記憶體（或 `/tmp`），呼叫語音轉文字服務（產生帶時間軸的 JSON）。
    3.  將 PPT/PDF 拉入記憶體，逐頁渲染成圖片（PNG）。
    4.  將圖片上傳至 B2 的 `/vault/{Course_ID}/_assets/`。
    5.  組裝成 `RawAssetPayload` 結構，通知 Orchestrator「準備就緒，等待人類指令」。

---

**(第一部分結束)**

這份藍圖定義了 **基礎建設（B2）、通訊合約（Interfaces）、資料結構（Schemas）以及前端資料處理（Ingestion）**。未來的 AI 只要讀懂這份合約，就能毫無偏差地建構底層。

