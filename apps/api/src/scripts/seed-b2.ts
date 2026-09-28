import "reflect-metadata";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { config } from "dotenv";

config({ path: "C:/project_Code/PLKS/.env" });

function required(name: string): string {
  const val = process.env[name];
  if (!val) throw new Error(`Missing env ${name}`);
  return val;
}

const CONCEPT_1_ID = "00000000-0000-0000-0000-000000000001";
const CONCEPT_2_ID = "00000000-0000-0000-0000-000000000002";
const CONCEPT_3_ID = "00000000-0000-0000-0000-000000000003";

async function main() {
  const bucket = required("B2_BUCKET_NAME");
  const region = required("B2_REGION");
  const endpoint = required("B2_ENDPOINT");
  const keyId = required("B2_APPLICATION_KEY_ID");
  const appKey = required("B2_APPLICATION_KEY");

  const client = new S3Client({
    region,
    endpoint,
    credentials: { accessKeyId: keyId, secretAccessKey: appKey },
    forcePathStyle: true,
  });

  const courseId = "CS101";
  const vault = `vault/${courseId}`;

  console.log("=== Seeding B2 with demo data ===");
  console.log("Bucket:", bucket);
  console.log("Course ID:", courseId);

  async function put(key: string, body: string, contentType = "application/json") {
    await client.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: body,
        ContentType: contentType,
      }),
    );
    console.log("✅ Uploaded:", key);
  }

  // 1. _quiz/ quiz items
  const quiz = {
    courseId,
    generatedAt: new Date().toISOString(),
    items: [
      {
        quizId: "11111111-1111-1111-1111-111111111101",
        courseId,
        type: "multiple_choice",
        question: "Clean Architecture 的主要依賴方向是？",
        options: [
          "由外向內：UI → 業務邏輯 → 核心實體",
          "由內向外：核心實體定義介面，外部 Adapter 實作介面",
          "雙向依賴：UI 與業務邏輯互相呼叫",
          "水平依賴：同一層元件直接相依",
        ],
        correctAnswer: "由內向外：核心實體定義介面，外部 Adapter 實作介面",
        contextReference: CONCEPT_1_ID,
      },
      {
        quizId: "11111111-1111-1111-1111-111111111102",
        courseId,
        type: "true_false",
        question: "在 Hexagonal Architecture 中，Adapter 可以直接 import 另一個 Adapter。",
        options: ["true", "false"],
        correctAnswer: "false",
        contextReference: CONCEPT_1_ID,
      },
      {
        quizId: "11111111-1111-1111-1111-111111111103",
        courseId,
        type: "multiple_choice",
        question: "Backblaze B2 儲存私有物件，要讓 NIM 暫時讀取圖片，應該？",
        options: [
          "把 Bucket 改成 Public",
          "產生 Presigned URL (帶簽名、有限時效)",
          "把圖片轉 base64 傳給 AI",
          "使用固定永久 URL",
        ],
        correctAnswer: "產生 Presigned URL (帶簽名、有限時效)",
        contextReference: CONCEPT_2_ID,
      },
      {
        quizId: "11111111-1111-1111-1111-111111111104",
        courseId,
        type: "multiple_choice",
        question: "DAG (Directed Acyclic Graph) 執行引擎的優點，下列何者不正確？",
        options: [
          "每個節點單一職責，易於單元測試",
          "節點可並行執行，加快整體 Pipeline",
          "失敗節點可單獨重試，無需從頭來過",
          "節點可以形成環狀依賴，達成閉包運算",
        ],
        correctAnswer: "節點可以形成環狀依賴，達成閉包運算",
        contextReference: CONCEPT_3_ID,
      },
      {
        quizId: "11111111-1111-1111-1111-111111111105",
        courseId,
        type: "short_answer",
        question: "寫出 Clean Architecture 的四層由內而外名稱（以逗點分隔）。",
        correctAnswer: "Entities, Use Cases, Interface Adapters, Frameworks & Drivers",
        contextReference: CONCEPT_1_ID,
      },
    ],
  };
  await put(`${vault}/_quiz/${courseId}.json`, JSON.stringify(quiz, null, 2));

  // 2. ConceptNodes 作為 Markdown (Obsidian-style)
  const frontmatter = (id: string, term: string, related: string[], ref: string) =>
    `---\nconceptId: "${id}"\ncourseId: "${courseId}"\ntitle: "${term}"\ntags: ["${courseId}", "concept"]\nrelatedTerms: [${related.map((t) => `"${t}"`).join(", ")}]\nsourceEvidence:\n  transcriptRef: "${ref}"\n  slideUri: "s3://${bucket}/${vault}/_assets/slide-${id.slice(-1)}.png"\n---\n\n`;

  const node1 =
    frontmatter(
      CONCEPT_1_ID,
      "Clean Architecture",
      ["Hexagonal Architecture", "DAG 引擎"],
      "00:00:00",
    ) +
    `# Clean Architecture\n\nClean Architecture 由 Robert C. Martin (Uncle Bob) 提出，核心精神是**依賴反轉**：\n\n1. **Entities (實體層)**：企業級商業規則，零外部依賴\n2. **Use Cases (使用案例層)**：應用級業務邏輯，只依賴 Entities\n3. **Interface Adapters (介面配接層)**：定義 [[Ports & Adapters]] 的介面\n4. **Frameworks & Drivers (框架驅動層)**：DB、UI、SDK、[[Backblaze B2]] 等細節\n\n## 優點\n- 核心邏輯可獨立測試（無須啟動資料庫/伺服器）\n- 框架可抽換（今天用 Fastify，明天換 Hono）\n- 易於導入 Event-Driven 與 DAG Pipeline\n\n## 對照 PLKS\n- Entities → [concept.node.ts](file:///C:/project_Code/PLKS/apps/api/src/core/entities/concept.node.ts)\n- Use Cases → modules/orchestrator/*\n- Interface Adapters → @plks/shared/contracts\n- Frameworks → @aws-sdk/client-s3、Fastify\n`;

  const node2 =
    frontmatter(CONCEPT_2_ID, "Presigned URL", ["Clean Architecture", "Backblaze B2"], "00:02:15") +
    `# Presigned URL\n\n**預簽名 URL** 是一種暫時性、帶有簽名的存取位址，常用於：\n\n- 讓瀏覽器/第三方 API 直接讀取私有物件\n- 讓前端直接上傳檔案至 S3/B2，不經過後端串流\n\n## 關鍵屬性\n| 項目 | 說明 |\n|------|------|\n| 時效 | 幾秒到數小時（建議 5-15 分鐘） |\n| 權限 | 由產生者決定 GET/PUT/DELETE |\n| 鑑別 | 以 Access Key 簽名，B2 端驗證 |\n\n## PLKS 時機\n- [[DAG Node B]]：為 slide 圖片簽名，交給 NIM 多模態模型讀取\n- Ingestion Upload：前端直傳音檔/簡報至 B2 inbox\n\n> ⚠️ 絕對不要把 Presigned URL 寫進 Git、Log 或回應給未驗證的用戶\n`;

  const node3 =
    frontmatter(CONCEPT_3_ID, "DAG 引擎", ["Clean Architecture", "Presigned URL"], "00:05:30") +
    `# DAG 執行引擎\n\n**DAG = Directed Acyclic Graph (有向無環圖)**，是 PLKS Orchestrator 的核心執行模型：\n\n## 六個節點 (Node A-F)\n1. **Node A — Load Data**：讀取 RawAssetPayload\n2. **Node B — B2 URL Signing**：[[Presigned URL]] 簽名\n3. **Node C — Prompt Assembly**：text + image URLs 交錯\n4. **Node D — AI Execution**：並行呼叫 NIM\n5. **Node E — Validation**：Zod Schema 驗證 + 重試\n6. **Node F — Persistence**：寫入 [[Obsidian Markdown]] 與 _quiz JSON\n\n## 特點\n- 無狀態：Pod 重啟後可從失敗節點 resume\n- 可觀測：每節點有輸入/輸出快照儲存於 /processing/\n- 易重試：單節點重試 = Node.retry(input)\n`;

  await put(`${vault}/Clean-Architecture.md`, node1, "text/markdown");
  await put(`${vault}/Presigned-URL.md`, node2, "text/markdown");
  await put(`${vault}/DAG-引擎.md`, node3, "text/markdown");

  // 3. MOC (Map of Contents) — 課程主控台索引
  const moc = `---\ntitle: "CS101 — 軟體架構與儲存實戰"\ncourseId: "${courseId}"\ntype: "moc"\n---\n\n# CS101 — 課程地圖 (MOC)\n\n> 本課程共 ${quiz.items.length} 題測驗、3 個核心概念節點\n\n## 📚 雙向連結索引\n\n- [[Clean Architecture]]\n- [[Presigned URL]]\n- [[DAG 引擎]]\n\n## 🎯 學習進度 (由 Gamification 模組自動更新)\n\n- ✅ 概念節點數： 3 / 3\n- ❓ 測驗題數： ${quiz.items.length}\n- 🏆 最高連續答對： 0\n\n## 🔗 資源\n\n- 原始投影片資料夾：\`_assets/\`\n- 測驗題庫： [[_quiz/${courseId}.json]]\n`;
  await put(`${vault}/00-MOC-CS101.md`, moc, "text/markdown");

  // 4. Seed a session state for orchestrator smoke test
  const demoSession = {
    sessionId: "123e4567-e89b-12d3-a456-426614174000",
    courseId,
    status: "completed",
    createdAt: new Date(Date.now() - 3600_000).toISOString(),
    updatedAt: new Date().toISOString(),
  };
  await put(`sessions/${demoSession.sessionId}.json`, JSON.stringify(demoSession, null, 2));

  console.log("\n🎉 All seed data uploaded successfully!");
  console.log(`Concepts (vault/${courseId}/)`);
  console.log(`Quiz     (${vault}/_quiz/)`);
  console.log(`MOC      (${vault}/00-MOC-CS101.md)`);
  console.log(`Session  (sessions/${demoSession.sessionId}.json)`);
}

main().catch((e) => {
  console.error("❌ Seed failed:", e);
  process.exit(1);
});
