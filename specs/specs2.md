這是 **【第二部分：DAG 任務調度、NVIDIA NIM 推理流程、以及遊戲化伴讀 AI 狀態機架構】**。

請將此藍圖與第一部分合併，這將是 AI Agent 開發本系統的完整最高指導原則。

---

# 🤖 Agent Master Blueprint - Part 2: Orchestration, Inference & Gamification

## [PIPELINE_MODULE_2] 核心調度與控制台 (Orchestrator & DAG Engine)
**職責：** 接收前端（人類）的設定指令，並以「有向無環圖 (DAG)」的方式排程任務，串聯 B2、AI 與知識寫入器。本身不包含任何業務運算。

**配置合約 (UserConfigPayload):**
*產生者：前端控制台 / 消費者：Orchestrator*
```json
{
  "sessionId": "UUID",
  "fusionLevel": "strict_alignment", // 或 "high_level_summary"
  "outputTemplates": ["knowledge_nodes", "flashcard_quiz"],
  "b2TargetDir": "s3://pkm-omni-vault/vault/CS101/"
}
```

**DAG 執行流程 (Agent 實作要求)：**
1.  **[Node A: Load Data]** 根據 `sessionId`，透過 `IStorageAdapter` 從 B2 `/processing/` 拉取對應的 `RawAssetPayload`。
2.  **[Node B: B2 URL Signing]** (關鍵) 由於 NVIDIA NIM 位於外部，無法直接讀取 B2 私有儲存桶。Agent 必須呼叫 B2 API 產生視覺資產（幻燈片）的 **Presigned URL (預先簽名網址)**，時效設定為 15 分鐘。
3.  **[Node C: Prompt Assembly]** 將預處理的文字與 Presigned URLs 組合。
4.  **[Node D: AI Execution]** 呼叫 `IAIReasoningGateway` (並行處理)。
5.  **[Node E: Validation]** (Agent 必須實作 JSON Schema 驗證，如 Zod/Pydantic)。若 AI 輸出格式錯誤，觸發重試機制 (Retry Policy)。
6.  **[Node F: Persistence]** 將驗證過的 JSON 交給 `IKnowledgeGraphWriter`，轉換並寫入 B2。

---

## [PIPELINE_MODULE_3] AI 推理網關 (NVIDIA NIM Integration)
**職責：** 封裝與 `nvidia/nemotron-3-nano-omni-30b-a3b-reasoning` 的多模態互動，強制輸出結構化資料。

**Agent 實作約束 (AI Adapter Design)：**
*   **介面實作：** 實作第一部分定義的 `IAIReasoningGateway`。
*   **System Prompt 隔離：** 系統提示詞（System Prompts）必須獨立存放在設定檔中，不可硬編碼（Hardcode）在邏輯內。
*   **多模態處理策略：**
    *   模型支援 Interleaved (交錯式) 輸入。Agent 需將時間軸文字與對應的 PPT Presigned URL 交替放入 Request Payload。
    *   **強制指令 (Enforcement)：** 在 Prompt 的結尾必須加上：`"You MUST output ONLY valid JSON matching the provided JSON schema. Do not wrap in markdown blocks like ```json."`

---

## [PIPELINE_MODULE_4] 遊戲化複習與伴讀 AI (Gamified Review & Sidekick)
**職責：** 以 BFF (Backend for Frontend) 模式運作。負責從 B2 的 `_quiz` 資料夾讀取題庫，並管理「伴讀 AI (Sidekick)」的上下文。

### 🎮 系統狀態機設計 (State Machine for Gamification)
Agent 必須以此狀態機（State Machine）來管理遊戲化測驗與伴讀流程，確保邏輯不混亂：

*   **[State: INITIALIZE]**
    *   Action: 前端請求載入測驗。
    *   Service: 透過 `IStorageAdapter` 從 B2 下載 `Schema C (QuizItemPayload)` 的 JSON 陣列。
    *   Transition -> `[State: PLAYING]`
*   **[State: PLAYING]**
    *   Action: 使用者作答。
    *   Condition: 若答對 -> 增加經驗值，進入下一題。
    *   Condition: 若答錯或主動點擊「呼叫 Sidekick」 -> Transition -> `[State: SIDEKICK_HELP]`
*   **[State: SIDEKICK_HELP]** (核心解耦邏輯)
    *   Action 1: 讀取當前題目的 `contextReference` (ConceptNode 的 UUID)。
    *   Action 2: 從 B2 的筆記區讀取該 UUID 對應的完整筆記與 PPT 圖片。
    *   Action 3: 將 **「使用者的問題 + 錯題 + 該 UUID 筆記上下文」** 打包送給 `IAIReasoningGateway`。
    *   *Prompt 限制:* `"You are a Sidekick Tutor. Answer the user's question STRICTLY based on the provided context (the student's notes). DO NOT invent knowledge outside this context. Use Socratic method to guide them."*
    *   Transition -> 回到 `[State: PLAYING]`

---

## [SYSTEM_SECURITY_&_OPERATIONS] 維運與安全規範
Agent 在建構系統時，必須嚴格遵守以下安全性原則：

1.  **無狀態運算 (Stateless Workers)：** 應用程式伺服器 (如 Node.js/Python 後端) 本身不得儲存任何業務狀態。Pod 重啟時不可遺失資料，因為 Single Source of Truth 在 B2。
2.  **Secret Management (環境變數)：**
    *   `B2_APPLICATION_KEY_ID` / `B2_APPLICATION_KEY`
    *   `NVIDIA_API_KEY`
    *   這些金鑰絕對不可寫入 Git，必須透過環境變數注入（Dependency Injection）。
3.  **依賴反轉原則 (Dependency Inversion)：**
    Agent 寫測試（Unit Tests）時，不可真的呼叫 B2 或 NVIDIA API，必須利用 `IStorageAdapter` 和 `IAIReasoningGateway` 寫 Mocking 測試。

---

## 🚀 [AGENT_EXECUTION_STEPS] 啟動執行指南 (To The AI Developer)

當 AI Agent (如 Cursor) 讀取完這兩部分藍圖後，應按照以下順序執行開發：

*   **Step 1: Domain Entities & Interfaces (第一週)**
    *   建立專案結構 (Clean Architecture 目錄)。
    *   定義所有 Data Schemas (RawAsset, ConceptNode, QuizItem) 的 Type/Interface (如 TypeScript 或 Pydantic)。
    *   定義 `IStorageAdapter`, `IKnowledgeGraphWriter`, `IAIReasoningGateway` 介面。
*   **Step 2: Infrastructure Adapters (第二週)**
    *   實作 `B2StorageAdapter` (串接 Backblaze B2 S3 API)。
    *   實作 `NvidiaNimAdapter` (處理多模態 JSON 輸出)。
    *   實作 `ObsidianMarkdownWriter` (將 JSON 轉為 `[[雙向連結]]` 的 `.md` 檔並傳給 B2StorageAdapter)。
*   **Step 3: Core Orchestrator (第三週)**
    *   實作 Ingestion Pipeline 與 DAG 控制流。
    *   將所有 Adapters 透過依賴注入 (DI Container) 綁定到 Orchestrator。
*   **Step 4: Gamification API (第四週)**
    *   實作 BFF 端點與 Sidekick 狀態機。

---
**(第二部分結束，藍圖完整建構完畢)**
