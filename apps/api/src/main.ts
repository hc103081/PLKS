// apps/api/src/main.ts
import "reflect-metadata";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Try apps/api/.env first (monorepo packaging), then project root.
const rootEnv = resolve(__dirname, "../../../.env");
const apiEnv = resolve(__dirname, "../.env");
dotenv.config({ path: rootEnv });
dotenv.config({ path: apiEnv });

// Eager-load logger so the first B2 adapter construction has env ready
process.env["B2_BUCKET_NAME"] ||= "";

// Import after dotenv.config() so env vars are loaded
const { default: Fastify } = await import("fastify");
const { default: multipart } = await import("@fastify/multipart");
const { loadEnv } = await import("./config/env.js");
const { container } = await import("tsyringe");

// Import adapters
const { B2StorageAdapter } = await import("./adapters/b2-storage.adapter.js");
const { NvidiaNimAdapter } = await import("./adapters/nim-reasoning.adapter.js");
const { ObsidianMarkdownWriter } = await import("./adapters/obsidian-markdown.writer.js");

// Import DI registration
const { registerAdapters } = await import("./config/di.js");

// Import orchestrator components
const { SessionStateStore } = await import("./modules/orchestrator/session-state.store.js");
const { createPipelineNodes } = await import("./modules/orchestrator/nodes.js");
const { DagEngine } = await import("./core/dag/engine.js");
const { OrchestratorService } = await import("./modules/orchestrator/orchestrator.service.js");
const { registerOrchestratorRoutes } = await import("./routes/orchestrator.js");

// Import ingestion components
const { IngestionPipeline } = await import("./modules/ingestion/ingestion-pipeline.js");
const { registerIngestionRoutes } = await import("./routes/ingestion.js");

// Import gamification components
const { createGamificationService } = await import(
  "./modules/gamification/gamification.service.js"
);
const { registerGamificationRoutes } = await import("./routes/gamification.js");

const env = loadEnv();

// Initialize adapters
const storageAdapter = new B2StorageAdapter();
const aiReasoningGateway = new NvidiaNimAdapter();
const knowledgeGraphWriter = new ObsidianMarkdownWriter(storageAdapter);

// Register adapters in DI container
registerAdapters(storageAdapter, knowledgeGraphWriter, aiReasoningGateway);

// Initialize orchestrator components
const sessionStore = new SessionStateStore(storageAdapter);
const pipelineNodes = createPipelineNodes(storageAdapter, knowledgeGraphWriter, aiReasoningGateway);

// Wrap pipeline nodes as DagNodes
const dagNodes: import("./core/dag/engine.js").DagNode<
  import("./modules/orchestrator/nodes.js").PipelineContext
>[] = [
  { name: "A", dependencies: [], execute: pipelineNodes.A },
  { name: "B", dependencies: ["A"], execute: pipelineNodes.B },
  { name: "C", dependencies: ["B"], execute: pipelineNodes.C },
  { name: "D", dependencies: ["C"], execute: pipelineNodes.D },
  { name: "E", dependencies: ["D"], execute: pipelineNodes.E },
  { name: "F", dependencies: ["E"], execute: pipelineNodes.F },
];

const dagEngine = new DagEngine(dagNodes, {
  maxRetries: 3,
  baseDelayMs: 1000,
});

const orchestratorService = new OrchestratorService(sessionStore, pipelineNodes, dagEngine);

// Initialize ingestion pipeline
const ingestionConfig = {
  inboxPath: "inbox/audio",
  processingPath: "processing/",
  pollIntervalMs: 5000,
  maxFileSizeBytes: 100 * 1024 * 1024, // 100MB
  supportedAudioFormats: ["mp3", "wav", "m4a", "flac"],
  supportedDocFormats: ["pdf", "ppt", "pptx"],
};

const ingestionPipeline = new IngestionPipeline(ingestionConfig, storageAdapter);

// Start ingestion pipeline (file watcher)
await ingestionPipeline.start();

// Initialize gamification service
const gamificationConfig = {
  maxStreakBonus: 5,
  baseXpPerCorrect: 100,
  streakXpMultiplier: 1.5,
};

const gamificationService = createGamificationService(
  storageAdapter,
  aiReasoningGateway,
  knowledgeGraphWriter,
  gamificationConfig,
);

const loggerConfig = {
  level: env.LOG_LEVEL,
  ...(env.NODE_ENV === "development" ? { transport: { target: "pino-pretty" } } : {}),
};

const app = Fastify({
  logger: loggerConfig,
});

// CORS: allow web dev server at 5173 to hit API on 3000
if (env.NODE_ENV !== "production") {
  const fpCors = await import("@fastify/cors");
  await app.register(fpCors.default, {
    origin: (origin, cb) => {
      const ok =
        !origin || origin.startsWith("http://localhost:") || origin.startsWith("http://127.0.0.1:");
      cb(null, ok);
    },
    credentials: true,
  });
}

// Register multipart plugin for file uploads
await app.register(multipart, {
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB
  },
});

// Register DI container
app.decorate("container", container);

// Health check
app.get("/health", async () => ({
  status: "ok",
  timestamp: new Date().toISOString(),
}));

// Register orchestrator routes
registerOrchestratorRoutes(app, orchestratorService, env.API_PREFIX);

// Register ingestion routes
registerIngestionRoutes(app, ingestionPipeline, env.API_PREFIX);

// Register gamification routes
registerGamificationRoutes(app, gamificationService, env.API_PREFIX);

async function start(): Promise<void> {
  try {
    await app.listen({ port: env.PORT, host: "0.0.0.0" });
    app.log.info(`Server listening on port ${env.PORT}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

start();
