# PLKS Hybrid Storage Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Personal Learning Knowledge System with hybrid storage: Supabase (PostgreSQL) for structured data with RLS, Realtime, and Auth; Backblaze B2 for large files and Obsidian Vault export output.

**Architecture:** Clean Architecture + Hexagonal (Ports & Adapters). Four core interfaces: `IStorageAdapter` (B2), `IStructuredStore` (Supabase), `IKnowledgeGraphWriter` (Markdown/JSON generation), `IAIReasoningGateway` (NVIDIA NIM). Orchestrator DAG writes to Supabase; B2 export runs asynchronously via pg_cron + Edge Function.

**Tech Stack:** Node.js 20+, Fastify, React 18 + Vite, TypeScript strict, pnpm workspace, tsyringe DI, zod validation, Biome lint/format, Vitest/Playwright test, Vercel + Supabase + B2 deployment.

## Global Constraints

- **No local FS writes** except `/tmp` for ephemeral processing (audio conversion, image rendering)
- **No direct SDK imports** in business logic — only in Adapters (`b2-storage.adapter.ts`, `supabase-structured-store.adapter.ts`, `nim-reasoning.adapter.ts`, `obsidian-markdown.writer.ts`)
- **No hardcoded prompts** — System Prompts in `config/prompts/*.txt`
- **All AI output validated** via zod schema (`safeParse`), retry on failure (exponential backoff, max 3)
- **Stateless workers** — all persistent state in Supabase/B2
- **RLS enforced** — all business tables enable RLS with `auth.uid()` policies; only Service Role Key in Edge Functions/background tasks
- **Result/Either pattern** (`neverthrow`) for error handling — no throwing in business logic
- **Constructor DI** with tsyringe decorators
- **Conventional Commits** for every task
- **TDD** — test first, then implementation
- **Coverage thresholds**: statements 80%, branches 70%, functions 80%, lines 80%

---

## File Structure Map

```
plks/
├── apps/api/src/
│   ├── main.ts                                    # DI container, env validation, Fastify bootstrap
│   ├── config/env.ts                              # zod EnvSchema
│   ├── routes/
│   │   ├── ingestion.ts                           # POST /api/ingestion/*
│   │   ├── orchestrator.ts                        # POST /api/orchestrator/start|status|retry
│   │   ├── gamification.ts                        # GET/POST /api/gamification/*
│   │   └── export.ts                              # POST /api/export/trigger
│   ├── modules/
│   │   ├── ingestion/                             # Ingestion Pipeline
│   │   ├── orchestrator/                          # DAG Engine (Node A-F)
│   │   ├── gamification/                          # Sidekick State Machine
│   │   └── export/                                # Export trigger
│   ├── adapters/
│   │   ├── b2-storage.adapter.ts                  # Implements IStorageAdapter
│   │   ├── supabase-structured-store.adapter.ts   # Implements IStructuredStore
│   │   ├── nim-reasoning.adapter.ts               # Implements IAIReasoningGateway
│   │   └── obsidian-markdown.writer.ts            # Implements IKnowledgeGraphWriter
│   ├── core/
│   │   ├── contracts/                             # Copied from packages/shared
│   │   ├── entities/                              # Domain entities
│   │   ├── dag/engine.ts                          # DAG execution engine
│   │   ├── state-machine/sidekick.ts              # Sidekick state machine
│   │   └── errors/domain-errors.ts                # DomainError classes
│   └── tests/                                     # Integration + E2E tests
├── apps/web/src/
│   ├── main.tsx                                   # AuthProvider, Router
│   ├── components/
│   │   ├── PrivateRoute.tsx
│   │   ├── LoginForm.tsx
│   │   └── ...
│   ├── pages/
│   │   ├── LoginPage.tsx
│   │   ├── AuthCallback.tsx
│   │   ├── Dashboard.tsx
│   │   ├── CourseConsole.tsx
│   │   ├── QuizPlayer.tsx
│   │   └── SidekickChat.tsx
│   ├── hooks/                                     # useAuth, useCourses, useQuiz, useSidekick
│   ├── services/api.ts                            # TanStack Query wrappers
│   ├── stores/auth.store.ts                       # Zustand auth store
│   └── types/
├── packages/shared/src/
│   ├── contracts/
│   │   ├── IStorageAdapter.ts
│   │   ├── IStructuredStore.ts
│   │   ├── IKnowledgeGraphWriter.ts
│   │   ├── IAIReasoningGateway.ts
│   │   └── index.ts
│   ├── schemas/
│   │   ├── raw-asset.schema.ts
│   │   ├── concept-node.schema.ts
│   │   ├── quiz-item.schema.ts
│   │   ├── user-config.schema.ts
│   │   └── index.ts
│   ├── types/
│   │   ├── database.ts                            # Supabase generated types
│   │   └── index.ts
│   └── utils/
├── supabase/
│   ├── migrations/
│   │   ├── 001_initial_schema.sql
│   │   ├── 002_rls_policies.sql
│   │   ├── 003_realtime_publication.sql
│   │   ├── 004_pg_cron_export.sql
│   │   └── 005_export_errors.sql
│   ├── functions/export-to-b2/index.ts            # Edge Function
│   ├── config.toml
│   └── seed.sql
├── pnpm-workspace.yaml
├── turbo.json
├── package.json
├── .env.example
└── .gitignore
```

---

## Phase 1: Domain & Interfaces (Week 1)

### Task 1.1: Initialize pnpm Monorepo & Tooling

**Files:**
- Create: `pnpm-workspace.yaml`
- Create: `turbo.json`
- Create: `package.json` (root scripts)
- Create: `packages/config/tsconfig.base.json`
- Create: `packages/config/biome.json`
- Create: `.env.example`
- Create: `.gitignore`

**Interfaces:** None (foundation)

- [ ] **Step 1: Write pnpm-workspace.yaml**
```yaml
packages:
  - apps/*
  - packages/*
```
- [ ] **Step 2: Write turbo.json**
```json
{
  "$schema": "https://turbo.build/schema.json",
  "pipeline": {
    "build": { "dependsOn": ["^build"], "outputs": ["dist/**"] },
    "test": { "outputs": ["coverage/**"] },
    "lint": {},
    "typecheck": {},
    "dev": { "cache": false, "persistent": true }
  }
}
```
- [ ] **Step 3: Write root package.json**
```json
{
  "name": "plks",
  "private": true,
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
  },
  "devDependencies": {
    "@biomejs/biome": "latest",
    "concurrently": "latest",
    "typescript": "latest",
    "lefthook": "latest"
  },
  "packageManager": "pnpm@9.x"
}
```
- [ ] **Step 4: Write tsconfig.base.json**
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "lib": ["ES2022"],
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "forceConsistentCasingInFileNames": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "baseUrl": ".",
    "paths": {
      "@plks/shared/*": ["packages/shared/src/*"],
      "@plks/api/*": ["apps/api/src/*"],
      "@plks/web/*": ["apps/web/src/*"]
    }
  }
}
```
- [ ] **Step 5: Write biome.json**
```json
{
  "$schema": "https://biomejs.dev/schemas/1.9.0/schema.json",
  "organizeImports": { "enabled": true },
  "linter": {
    "enabled": true,
    "rules": {
      "recommended": true,
      "suspicious": { "noExplicitAny": "error", "noConsoleLog": "warn" },
      "correctness": { "noUnusedVariables": "error" }
    }
  },
  "formatter": { "enabled": true, "indentStyle": "space", "indentWidth": 2 }
}
```
- [ ] **Step 6: Write .env.example** (per AGENTS.md section 7)
- [ ] **Step 7: Write .gitignore**
```
node_modules
dist
.env
*.log
.turbo
coverage
.tmp
```
- [ ] **Step 8: Run `pnpm install` to verify workspace**
- [ ] **Step 9: Commit**

---

### Task 1.2: Define Shared Contracts (4 Interfaces)

**Files:**
- Create: `packages/shared/src/contracts/IStorageAdapter.ts`
- Create: `packages/shared/src/contracts/IStructuredStore.ts`
- Create: `packages/shared/src/contracts/IKnowledgeGraphWriter.ts`
- Create: `packages/shared/src/contracts/IAIReasoningGateway.ts`
- Create: `packages/shared/src/contracts/index.ts`

**Interfaces:** None (these ARE the interfaces)

- [ ] **Step 1: Write IStorageAdapter.ts** (per AGENTS.md 4.1)
- [ ] **Step 2: Write IStructuredStore.ts** (per AGENTS.md 4.2)
- [ ] **Step 3: Write IKnowledgeGraphWriter.ts** (per AGENTS.md 4.3)
- [ ] **Step 4: Write IAIReasoningGateway.ts** (per AGENTS.md 4.4)
- [ ] **Step 5: Write index.ts** (re-export all)
- [ ] **Step 6: Run `pnpm typecheck` to verify**
- [ ] **Step 7: Commit**

---

### Task 1.3: Define Shared DTO Schemas (4 Zod Schemas)

**Files:**
- Create: `packages/shared/src/schemas/raw-asset.schema.ts`
- Create: `packages/shared/src/schemas/concept-node.schema.ts`
- Create: `packages/shared/src/schemas/quiz-item.schema.ts`
- Create: `packages/shared/src/schemas/user-config.schema.ts`
- Create: `packages/shared/src/schemas/index.ts`

**Interfaces:** None

- [ ] **Step 1: Write raw-asset.schema.ts** (per AGENTS.md 4.5 Schema A)
- [ ] **Step 2: Write concept-node.schema.ts** (per AGENTS.md 4.5 Schema B)
- [ ] **Step 3: Write quiz-item.schema.ts** (per AGENTS.md 4.5 Schema C)
- [ ] **Step 4: Write user-config.schema.ts** (per AGENTS.md 4.5 Schema D)
- [ ] **Step 5: Write index.ts** (re-export all)
- [ ] **Step 6: Run `pnpm typecheck` to verify**
- [ ] **Step 7: Commit**

---

### Task 1.4: Define Core Domain Entities

**Files:**
- Create: `apps/api/src/core/entities/concept-node.ts`
- Create: `apps/api/src/core/entities/quiz-item.ts`
- Create: `apps/api/src/core/entities/raw-asset.ts`
- Create: `apps/api/src/core/entities/course.ts`
- Create: `apps/api/src/core/entities/session.ts`
- Create: `apps/api/src/core/entities/user-progress.ts`
- Create: `apps/api/src/core/entities/chat-session.ts`
- Create: `apps/api/src/core/errors/domain-errors.ts`
- Create: `apps/api/src/core/contracts/` (copy from shared or re-export)

**Interfaces:** Consumes: `packages/shared/src/schemas/*` (zod inferred types)

- [ ] **Step 1: Write domain-errors.ts** (DomainError class hierarchy: StorageError, ValidationError, AIError, NotFoundError, UnauthorizedError)
- [ ] **Step 2: Write entity classes** (plain TS classes with zod-validated constructors, readonly properties)
- [ ] **Step 3: Write unit tests** for entity validation (`__tests__/entities/*.test.ts`)
- [ ] **Step 4: Run tests** (`pnpm test:watch --filter api`)
- [ ] **Step 5: Commit**

---

### Task 1.5: Setup DI Container & Env Validation

**Files:**
- Create: `apps/api/src/config/env.ts`
- Create: `apps/api/src/main.ts`
- Modify: `apps/api/package.json` (add fastify, tsyringe, zod, neverthrow, @supabase/supabase-js, @aws-sdk/client-s3, @aws-sdk/s3-request-preserver)

**Interfaces:** Consumes: `EnvSchema` (zod), all 4 interfaces from shared

- [ ] **Step 1: Write env.ts** (per AGENTS.md section 7, EnvSchema)
- [ ] **Step 2: Write main.ts** (Fastify bootstrap, tsyringe container, register adapters, register routes)
```typescript
import { container } from 'tsyringe';
import Fastify from 'fastify';
import { env } from './config/env';
// Register adapters
container.register('IStorageAdapter', { useClass: B2StorageAdapter });
container.register('IStructuredStore', { useClass: SupabaseStructuredStore });
container.register('IKnowledgeGraphWriter', { useClass: ObsidianMarkdownWriter });
container.register('IAIReasoningGateway', { useClass: NvidiaNimAdapter });
// Register routes
const app = Fastify();
app.register(ingestionRoutes);
app.register(orchestratorRoutes);
app.register(gamificationRoutes);
app.register(exportRoutes);
await app.listen({ port: env.PORT });
```
- [ ] **Step 3: Run `pnpm typecheck` and `pnpm build:api`**
- [ ] **Step 4: Commit**

---

### Task 1.6: Configure lefthook Pre-commit

**Files:**
- Create: `lefthook.yml`

**Interfaces:** None

- [ ] **Step 1: Write lefthook.yml**
```yaml
pre-commit:
  parallel: true
  commands:
    biome-check:
      glob: "*.{ts,tsx,json}"
      run: pnpm biome check --files {staged_files}
    biome-format:
      glob: "*.{ts,tsx,json}"
      run: pnpm biome format --write {staged_files}
    typecheck:
      run: pnpm tsc --noEmit
```
- [ ] **Step 2: Run `npx lefthook install`**
- [ ] **Step 3: Test with a dummy commit**
- [ ] **Step 4: Commit**

---

## Phase 2: Infrastructure Adapters (Week 2)

### Task 2.1: Implement B2StorageAdapter

**Files:**
- Create: `apps/api/src/adapters/b2-storage.adapter.ts`
- Test: `apps/api/tests/adapters/b2-storage.adapter.test.ts`

**Interfaces:**
- Produces: `IStorageAdapter` implementation
- Consumes: `@aws-sdk/client-s3`, `@aws-sdk/s3-request-presigner`, `env`

- [ ] **Step 1: Write failing test** (mock S3Client, test uploadFile, downloadFile, listDirectory, generatePresignedUrl)
```typescript
// test: multipart upload > 5MB, presigned URL expiry, error mapping
```
- [ ] **Step 2: Run test** → FAIL
- [ ] **Step 3: Implement B2StorageAdapter**
```typescript
@injectable()
export class B2StorageAdapter implements IStorageAdapter {
  private _s3Client: S3Client;
  constructor(@inject('env') env: Env) { ... }
  async uploadFile(path: string, byteStream: Readable): Promise<string> { ... }
  async downloadFile(uri: string): Promise<Readable> { ... }
  async listDirectory(prefix: string): Promise<string[]> { ... }
  async generatePresignedUrl(uri: string, expirySeconds: number): Promise<string> { ... }
}
```
- [ ] **Step 4: Run test** → PASS
- [ ] **Step 5: Commit**

---

### Task 2.2: Implement SupabaseStructuredStore

**Files:**
- Create: `apps/api/src/adapters/supabase-structured-store.adapter.ts`
- Test: `apps/api/tests/adapters/supabase-structured-store.adapter.test.ts`

**Interfaces:**
- Produces: `IStructuredStore` implementation
- Consumes: `@supabase/supabase-js` (Admin Client with service_role), generated DB types

- [ ] **Step 1: Write failing test** (mock supabaseAdmin, test all CRUD methods, batch upsert, Realtime subscribe)
- [ ] **Step 2: Run test** → FAIL
- [ ] **Step 3: Implement SupabaseStructuredStore**
```typescript
@injectable()
export class SupabaseStructuredStore implements IStructuredStore {
  private _admin: SupabaseClient<Database>;
  constructor(@inject('env') env: Env) {
    this._admin = createClient(env.VITE_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false }
    });
  }
  // All methods from IStructuredStore interface
  async upsertConceptNodes(nodes: ConceptNodeInput[]): Promise<ConceptNode[]> { ... }
  async markConceptNodesExported(ids: string[], b2Uris: Map<string, string>): Promise<void> { ... }
  // ... etc
  subscribeProgress(userId: string, callback: (payload) => void): () => void { ... }
}
```
- [ ] **Step 4: Run test** → PASS
- [ ] **Step 5: Commit**

---

### Task 2.3: Implement NvidiaNimAdapter

**Files:**
- Create: `apps/api/src/adapters/nim-reasoning.adapter.ts`
- Create: `apps/api/config/prompts/extract-concepts.txt`
- Create: `apps/api/config/prompts/generate-quiz.txt`
- Create: `apps/api/config/prompts/sidekick-tutor.txt`
- Test: `apps/api/tests/adapters/nim-reasoning.adapter.test.ts`

**Interfaces:**
- Produces: `IAIReasoningGateway` implementation
- Consumes: `fetch`, `env`, prompt files

- [ ] **Step 1: Write failing test** (mock fetch, test multimodalInfer with interleaved text+images, JSON schema enforcement, retry logic)
- [ ] **Step 2: Run test** → FAIL
- [ ] **Step 3: Implement NvidiaNimAdapter**
```typescript
@injectable()
export class NvidiaNimAdapter implements IAIReasoningGateway {
  constructor(@inject('env') env: Env) { ... }
  async multimodalInfer(systemPrompt: string, textPayload: string, imageUrls: string[]): Promise<unknown> {
    // Build interleaved payload
    // Append JSON schema instruction to systemPrompt
    // POST to NVIDIA NIM with exponential backoff (max 3)
    // Return parsed JSON
  }
  private loadPrompt(name: string): string { ... }
}
```
- [ ] **Step 4: Write prompt files** (extract-concepts.txt, generate-quiz.txt, sidekick-tutor.txt)
- [ ] **Step 5: Run test** → PASS
- [ ] **Step 6: Commit**

---

### Task 2.4: Implement ObsidianMarkdownWriter

**Files:**
- Create: `apps/api/src/adapters/obsidian-markdown.writer.ts`
- Test: `apps/api/tests/adapters/obsidian-markdown.writer.test.ts`

**Interfaces:**
- Produces: `IKnowledgeGraphWriter` implementation
- Consumes: `ConceptNodePayload`, `QuizItemPayload` (from shared schemas)

- [ ] **Step 1: Write failing test** (test writeNode frontmatter, wikilinks, writeIndex MOC, writeQuizJson)
- [ ] **Step 2: Run test** → FAIL
- [ ] **Step 3: Implement ObsidianMarkdownWriter**
```typescript
@injectable()
export class ObsidianMarkdownWriter implements IKnowledgeGraphWriter {
  writeNode(node: ConceptNodePayload): string {
    // Frontmatter YAML: conceptId, courseId, tags, sourceEvidence
    // Body: # {term}\n\n{explanation}\n\n## Related\n- [[{relatedTerm}]]
    // Asset references: ![Slide]({relativePath})
  }
  writeIndex(courseId: string, nodes: ConceptNodePayload[]): string { ... }
  writeQuizJson(items: QuizItemPayload[]): string { ... }
}
```
- [ ] **Step 4: Run test** → PASS
- [ ] **Step 5: Commit**

---

### Task 2.5: Supabase Migrations & Seed Data

**Files:**
- Create: `supabase/migrations/001_initial_schema.sql`
- Create: `supabase/migrations/002_rls_policies.sql`
- Create: `supabase/migrations/003_realtime_publication.sql`
- Create: `supabase/migrations/004_pg_cron_export.sql`
- Create: `supabase/migrations/005_export_errors.sql`
- Create: `supabase/seed.sql`
- Create: `supabase/config.toml`

**Interfaces:** Consumes: SQL schema from specs1.md section [INFRASTRUCTURE]

- [ ] **Step 1: Write 001_initial_schema.sql** (all tables: semesters, courses, concept_nodes, quiz_items, user_progress, answer_logs, chat_sessions, chat_messages, export_errors)
- [ ] **Step 2: Write 002_rls_policies.sql** (enable RLS, policies per AGENTS.md section 1.2)
- [ ] **Step 3: Write 003_realtime_publication.sql** (`alter publication supabase_realtime add table user_progress, chat_messages;`)
- [ ] **Step 4: Write 004_pg_cron_export.sql** (`select cron.schedule('export-to-b2', '*/5 * * * *', $$ select net.http_post(...) $$);`)
- [ ] **Step 5: Write 005_export_errors.sql** (already in 001, verify)
- [ ] **Step 6: Write seed.sql** (8 semesters per specs1.md)
- [ ] **Step 7: Write config.toml** (enable pg_cron, pgvector, realtime)
- [ ] **Step 8: Run `pnpm supabase:start` → `pnpm db:migrate` → `pnpm db:seed`**
- [ ] **Step 9: Run `pnpm supabase:types` to generate `packages/shared/src/types/database.ts`**
- [ ] **Step 10: Commit**

---

### Task 2.6: Integration Tests for All Adapters

**Files:**
- Test: `apps/api/tests/adapters/integration.test.ts`

**Interfaces:** Consumes: all 4 adapters (real implementations)

- [ ] **Step 1: Write integration test** (B2 upload/download/presign, Supabase CRUD + Realtime, NIM infer, Markdown generation)
- [ ] **Step 2: Run test** (requires local Supabase + B2 LocalStack or real credentials)
- [ ] **Step 3: Fix any issues**
- [ ] **Step 4: Commit**

---

## Phase 3: Core Orchestrator (Week 3)

### Task 3.1: Implement Ingestion Pipeline

**Files:**
- Create: `apps/api/src/modules/ingestion/ingestion.service.ts`
- Create: `apps/api/src/modules/ingestion/audio-processor.ts`
- Create: `apps/api/src/modules/ingestion/slide-renderer.ts`
- Create: `apps/api/src/routes/ingestion.ts`
- Test: `apps/api/tests/modules/ingestion.test.ts`

**Interfaces:**
- Consumes: `IStorageAdapter`, `RawAssetPayloadSchema`
- Produces: `RawAssetPayload` written to B2 `/processing/{sessionId}.json`

- [ ] **Step 1: Write failing test** (mock B2, Whisper, pdf2pic; test full pipeline)
- [ ] **Step 2: Run test** → FAIL
- [ ] **Step 3: Implement audio-processor.ts** (ffmpeg segment → Whisper API → transcript JSON)
- [ ] **Step 4: Implement slide-renderer.ts** (pdf2pic/LibreOffice → PNG → B2 upload)
- [ ] **Step 5: Implement ingestion.service.ts** (orchestrate, assemble RawAssetPayload, write to B2)
- [ ] **Step 6: Implement ingestion.ts routes** (`POST /api/ingestion/process`)
- [ ] **Step 7: Run test** → PASS
- [ ] **Step 8: Commit**

---

### Task 3.2: Implement DAG Engine (Node A-F)

**Files:**
- Create: `apps/api/src/core/dag/engine.ts`
- Create: `apps/api/src/core/dag/nodes/node-a-load-data.ts`
- Create: `apps/api/src/core/dag/nodes/node-b-url-signing.ts`
- Create: `apps/api/src/core/dag/nodes/node-c-prompt-assembly.ts`
- Create: `apps/api/src/core/dag/nodes/node-d-ai-execution.ts`
- Create: `apps/api/src/core/dag/nodes/node-e-validation.ts`
- Create: `apps/api/src/core/dag/nodes/node-f-persistence.ts`
- Create: `apps/api/src/modules/orchestrator/orchestrator.service.ts`
- Test: `apps/api/tests/core/dag/engine.test.ts`

**Interfaces:**
- Consumes: `IStorageAdapter`, `IAIReasoningGateway`, `IStructuredStore`, `IKnowledgeGraphWriter`, `RawAssetPayload`, `ConceptNodePayloadSchema`, `QuizItemPayloadSchema`, `UserConfigPayload`
- Produces: Persisted ConceptNodes + QuizItems in Supabase

- [ ] **Step 1: Write failing test** (mock all adapters, test DAG execution end-to-end)
- [ ] **Step 2: Run test** → FAIL
- [ ] **Step 3: Write Node A** (Load RawAssetPayload from B2 `/processing/`)
- [ ] **Step 4: Write Node B** (Generate Presigned URLs for visualAssets, 15 min expiry)
- [ ] **Step 5: Write Node C** (Interleave transcripts + image URLs per prompt template)
- [ ] **Step 6: Write Node D** (Parallel call `IAIReasoningGateway.multimodalInfer` for concepts + quiz)
- [ ] **Step 7: Write Node E** (zod `safeParse` on AI output, retry on failure)
- [ ] **Step 8: Write Node F** (IStructuredStore.upsertConceptNodes + upsertQuizItems; IKnowledgeGraphWriter.writeNode + writeIndex + writeQuizJson for strings)
- [ ] **Step 9: Write engine.ts** (DAG runner with dependency graph, error handling, status tracking)
- [ ] **Step 10: Write orchestrator.service.ts** (coordinate DAG, manage session state in memory)
- [ ] **Step 11: Run test** → PASS
- [ ] **Step 12: Commit**

---

### Task 3.3: Implement Orchestrator HTTP Routes

**Files:**
- Create: `apps/api/src/routes/orchestrator.ts`
- Test: `apps/api/tests/routes/orchestrator.test.ts`

**Interfaces:**
- Consumes: `orchestrator.service.ts`
- Produces: `POST /api/orchestrator/start`, `GET /api/orchestrator/status/:sessionId`, `POST /api/orchestrator/retry/:sessionId`

- [ ] **Step 1: Write failing test** (test all 3 endpoints with mocked service)
- [ ] **Step 2: Run test** → FAIL
- [ ] **Step 3: Implement routes** (zod validation on body/params, auth hook, call service)
- [ ] **Step 4: Run test** → PASS
- [ ] **Step 5: Commit**

---

### Task 3.4: E2E Test: Inbox to Supabase

**Files:**
- Test: `apps/api/tests/e2e/orchestrator-e2e.test.ts`

**Interfaces:** Consumes: full stack (Ingestion → Orchestrator → Supabase)

- [ ] **Step 1: Write E2E test** (upload audio+slides to B2 inbox → trigger ingestion → start orchestrator → verify ConceptNodes/QuizItems in Supabase)
- [ ] **Step 2: Run test** (requires running services)
- [ ] **Step 3: Fix issues**
- [ ] **Step 4: Commit**

---

## Phase 4: Gamification API & Frontend (Week 4)

### Task 4.1: Implement Sidekick State Machine

**Files:**
- Create: `apps/api/src/core/state-machine/sidekick.ts`
- Test: `apps/api/tests/core/state-machine/sidekick.test.ts`

**Interfaces:**
- Consumes: `IStructuredStore`, `IStorageAdapter`, `IAIReasoningGateway`
- Produces: State transitions (INITIALIZE → PLAYING → SIDEKICK_HELP → PLAYING)

- [ ] **Step 1: Write failing test** (test all transitions, context assembly, answer logging, SRS update)
- [ ] **Step 2: Run test** → FAIL
- [ ] **Step 3: Implement sidekick.ts** (class with state, transition methods, context builder for SIDEKICK_HELP)
```typescript
export class SidekickStateMachine {
  private state: 'INITIALIZE' | 'PLAYING' | 'SIDEKICK_HELP';
  async initialize(courseId: string): Promise<QuizItem[]> { ... }
  async answer(quizId: string, userAnswer: string): Promise<AnswerResult> { ... }
  async requestHelp(quizId: string, userQuestion: string): Promise<SidekickResponse> { ... }
}
```
- [ ] **Step 4: Run test** → PASS
- [ ] **Step 5: Commit**

---

### Task 4.2: Implement Gamification BFF Routes

**Files:**
- Create: `apps/api/src/routes/gamification.ts`
- Test: `apps/api/tests/routes/gamification.test.ts`

**Interfaces:**
- Consumes: `SidekickStateMachine`, `IStructuredStore`
- Produces: `GET /api/gamification/quiz/:courseId`, `POST /api/gamification/answer`, `POST /api/gamification/sidekick`

- [ ] **Step 1: Write failing test** (test all endpoints with auth)
- [ ] **Step 2: Run test** → FAIL
- [ ] **Step 3: Implement routes** (auth hook, zod validation, call state machine)
- [ ] **Step 4: Run test** → PASS
- [ ] **Step 5: Commit**

---

### Task 4.3: Implement Export Trigger Route

**Files:**
- Create: `apps/api/src/routes/export.ts`
- Test: `apps/api/tests/routes/export.test.ts`

**Interfaces:**
- Consumes: `IStructuredStore` (to mark exported), Edge Function invocation
- Produces: `POST /api/export/trigger` (courseId body)

- [ ] **Step 1: Write failing test**
- [ ] **Step 2: Run test** → FAIL
- [ ] **Step 3: Implement route** (call Supabase Edge Function via HTTP, or direct DB query for immediate export)
- [ ] **Step 4: Run test** → PASS
- [ ] **Step 5: Commit**

---

### Task 4.4: Frontend — Auth Pages & Store

**Files:**
- Create: `apps/web/src/stores/auth.store.ts`
- Create: `apps/web/src/lib/supabase/client.ts`
- Create: `apps/web/src/lib/supabase/server.ts`
- Create: `apps/web/src/components/PrivateRoute.tsx`
- Create: `apps/web/src/pages/LoginPage.tsx`
- Create: `apps/web/src/pages/AuthCallback.tsx`
- Create: `apps/web/src/main.tsx` (AuthProvider, Router)
- Test: `apps/web/src/tests/auth.test.tsx`

**Interfaces:**
- Consumes: `@supabase/ssr`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`
- Produces: Auth state (user, session), login/logout, protected routes

- [ ] **Step 1: Write failing test** (render LoginPage, mock supabase auth)
- [ ] **Step 2: Run test** → FAIL
- [ ] **Step 3: Implement auth.store.ts** (Zustand with persist, setAuth, signOut)
- [ ] **Step 4: Implement client.ts/server.ts** (createBrowserClient, createServerClient)
- [ ] **Step 5: Implement AuthProvider** (onAuthStateChange subscription)
- [ ] **Step 6: Implement PrivateRoute** (redirect to /login if no user)
- [ ] **Step 7: Implement LoginPage** (Email Magic Link via supabase.auth.signInWithOtp)
- [ ] **Step 8: Implement AuthCallback** (exchangeCodeForSession)
- [ ] **Step 9: Wire in main.tsx** (BrowserRouter, Routes, AuthProvider)
- [ ] **Step 10: Run test** → PASS
- [ ] **Step 11: Commit**

---

### Task 4.5: Frontend — Dashboard (Semester/Course Management)

**Files:**
- Create: `apps/web/src/pages/Dashboard.tsx`
- Create: `apps/web/src/components/CourseCard.tsx`
- Create: `apps/web/src/components/CreateCourseModal.tsx`
- Create: `apps/web/src/hooks/useCourses.ts`
- Create: `apps/web/src/services/api.ts` (TanStack Query wrappers)
- Test: `apps/web/src/tests/dashboard.test.tsx`

**Interfaces:**
- Consumes: `GET /api/courses`, `POST /api/courses`, `GET /api/semesters`
- Produces: Semester list, course cards, create course form

- [ ] **Step 1: Write failing test** (mock API, test render, create course)
- [ ] **Step 2: Run test** → FAIL
- [ ] **Step 3: Implement api.ts** (useQuery/useMutation for courses, semesters)
- [ ] **Step 4: Implement useCourses.ts** (react-query hooks)
- [ ] **Step 5: Implement Dashboard.tsx** (semester tabs, course grid, create modal)
- [ ] **Step 6: Implement CourseCard/CreateCourseModal**
- [ ] **Step 7: Run test** → PASS
- [ ] **Step 8: Commit**

---

### Task 4.6: Frontend — Course Console (MOC, Search, Progress)

**Files:**
- Create: `apps/web/src/pages/CourseConsole.tsx`
- Create: `apps/web/src/components/ConceptNodeList.tsx`
- Create: `apps/web/src/components/SearchBar.tsx`
- Create: `apps/web/src/components/ProgressBar.tsx`
- Create: `apps/web/src/hooks/useConceptNodes.ts`
- Create: `apps/web/src/hooks/useRealtimeProgress.ts`
- Test: `apps/web/src/tests/course-console.test.tsx`

**Interfaces:**
- Consumes: `GET /api/courses/:id/concepts`, `GET /api/courses/:id/progress`, Supabase Realtime subscription
- Produces: MOC view, full-text search, progress tracking with realtime updates

- [ ] **Step 1: Write failing test**
- [ ] **Step 2: Run test** → FAIL
- [ ] **Step 3: Implement hooks** (useConceptNodes with search, useRealtimeProgress with supabase.channel)
- [ ] **Step 4: Implement components** (ConceptNodeList with wikilinks, SearchBar debounced, ProgressBar animated)
- [ ] **Step 5: Implement CourseConsole.tsx** (layout, tabs: Notes/Quiz/Progress)
- [ ] **Step 6: Run test** → PASS
- [ ] **Step 7: Commit**

---

### Task 4.7: Frontend — Quiz Player

**Files:**
- Create: `apps/web/src/pages/QuizPlayer.tsx`
- Create: `apps/web/src/components/QuestionCard.tsx`
- Create: `apps/web/src/components/AnswerFeedback.tsx`
- Create: `apps/web/src/components/SidekickButton.tsx`
- Create: `apps/web/src/hooks/useQuiz.ts`
- Test: `apps/web/src/tests/quiz-player.test.tsx`

**Interfaces:**
- Consumes: `GET /api/gamification/quiz/:courseId`, `POST /api/gamification/answer`, `POST /api/gamification/sidekick`
- Produces: Question flow, answer submission, feedback, Sidekick invocation

- [ ] **Step 1: Write failing test**
- [ ] **Step 2: Run test** → FAIL
- [ ] **Step 3: Implement useQuiz.ts** (react-query + state for current question index, answers)
- [ ] **Step 4: Implement components** (QuestionCard multiple choice/true-false/short-answer, AnswerFeedback correct/incorrect, SidekickButton loading state)
- [ ] **Step 5: Implement QuizPlayer.tsx** (flow control, progress, sidekick modal trigger)
- [ ] **Step 6: Run test** → PASS
- [ ] **Step 7: Commit**

---

### Task 4.8: Frontend — Sidekick Chat

**Files:**
- Create: `apps/web/src/pages/SidekickChat.tsx`
- Create: `apps/web/src/components/ChatMessage.tsx`
- Create: `apps/web/src/components/ChatInput.tsx`
- Create: `apps/web/src/components/ContextReferences.tsx`
- Create: `apps/web/src/hooks/useSidekick.ts`
- Test: `apps/web/src/tests/sidekick-chat.test.tsx`

**Interfaces:**
- Consumes: `POST /api/gamification/sidekick`, `GET /api/chat/history/:sessionId`, Supabase Realtime for messages
- Produces: Streaming chat UI, markdown rendering, code highlighting, context reference chips

- [ ] **Step 1: Write failing test**
- [ ] **Step 2: Run test** → FAIL
- [ ] **Step 3: Implement useSidekick.ts** (mutation for sidekick, query for history, realtime subscription)
- [ ] **Step 4: Implement components** (ChatMessage with markdown-it + prismjs, ChatInput with enter-to-send, ContextReferences chips)
- [ ] **Step 5: Implement SidekickChat.tsx** (split view: chat + context panel)
- [ ] **Step 6: Run test** → PASS
- [ ] **Step 7: Commit**

---

### Task 4.9: Integration Test: Full Gamification Flow

**Files:**
- Test: `apps/api/tests/e2e/gamification-e2e.test.ts`
- Test: `apps/web/src/tests/e2e/gamification-e2e.test.tsx`

**Interfaces:** Consumes: full gamification stack

- [ ] **Step 1: Write E2E test** (load quiz → answer → wrong → sidekick → continue → progress realtime)
- [ ] **Step 2: Run test** (Playwright for web, Vitest for API)
- [ ] **Step 3: Fix issues**
- [ ] **Step 4: Commit**

---

## Phase 5: B2 Export Pipeline & Polish (Week 5)

### Task 5.1: Implement Supabase Edge Function `export-to-b2`

**Files:**
- Create: `supabase/functions/export-to-b2/index.ts`
- Create: `supabase/functions/export-to-b2/deno.json`
- Test: `supabase/functions/export-to-b2/index.test.ts`

**Interfaces:**
- Consumes: `IStorageAdapter` (B2), `IStructuredStore` (Supabase Admin), `IKnowledgeGraphWriter`
- Produces: B2 uploads, DB updates (`b2_markdown_uri`, `b2_json_uri`), error logging

- [ ] **Step 1: Write failing test** (mock B2, Supabase, MarkdownWriter; test batch export per course)
- [ ] **Step 2: Run test** → FAIL
- [ ] **Step 3: Implement index.ts** (Deno runtime)
```typescript
// Query unexported concept_nodes + quiz_items for a course
// For each node: writeNode() → uploadFile() → collect URI
// writeIndex() → uploadFile()
// writeQuizJson() → uploadFile()
// markConceptNodesExported() + markQuizItemsExported()
// Error handling: insert into export_errors, retry logic
```
- [ ] **Step 4: Configure deno.json** (imports: npm:@aws-sdk/*, npm:@supabase/supabase-js, npm:zod)
- [ ] **Step 5: Run test** → PASS
- [ ] **Step 6: Deploy to Supabase** (`supabase functions deploy export-to-b2`)
- [ ] **Step 7: Commit**

---

### Task 5.2: Configure pg_cron Schedule

**Files:** (already in migration 004)

- [ ] **Step 1: Verify pg_cron job runs** (check Supabase logs)
- [ ] **Step 2: Test manual trigger** (`select cron.run('export-to-b2');`)
- [ ] **Step 3: Commit** (migration already committed)

---

### Task 5.3: Implement Export Errors Table & Retry Logic

**Files:**
- Verify: `supabase/migrations/001_initial_schema.sql` includes `export_errors`
- Modify: `supabase/functions/export-to-b2/index.ts` (retry logic)

**Interfaces:** Consumes: `export_errors` table

- [ ] **Step 1: Verify table exists** (from migration)
- [ ] **Step 2: Implement retry in Edge Function** (query export_errors where retry_count < 3, reprocess, increment retry_count)
- [ ] **Step 3: Write test** for retry logic
- [ ] **Step 4: Run test** → PASS
- [ ] **Step 5: Commit**

---

### Task 5.4: Obsidian Vault Export Verification

**Files:** None (manual verification)

**Interfaces:** Consumes: B2 `/vault/` structure

- [ ] **Step 1: Trigger export** (via API or pg_cron)
- [ ] **Step 2: Verify B2 structure** (`/vault/{Course_ID}/_assets/`, `_quiz/quiz.json`, `*.md` files)
- [ ] **Step 3: Test Obsidian sync** (configure Remotely Save plugin → B2 credentials → sync → open vault)
- [ ] **Step 4: Verify** (wikilinks work, images load, quiz JSON valid)
- [ ] **Step 5: Document any fixes needed**
- [ ] **Step 6: Commit** (if code changes needed)

---

### Task 5.5: Full E2E Test: Audio Upload → Obsidian Sync

**Files:**
- Test: `apps/api/tests/e2e/full-pipeline-e2e.test.ts`
- Test: `apps/web/src/tests/e2e/full-pipeline-e2e.test.tsx`

**Interfaces:** Consumes: entire system

- [ ] **Step 1: Write Playwright E2E test** (web: login → create course → upload audio/slides → start orchestrator → wait for processing → open quiz → answer → sidekick → verify progress)
- [ ] **Step 2: Write API E2E test** (api: ingestion → orchestrator → supabase → export → b2)
- [ ] **Step 3: Run tests** (requires full stack deployed or local)
- [ ] **Step 4: Fix all failures**
- [ ] **Step 5: Commit**

---

### Task 5.6: Documentation & Polish

**Files:**
- Create: `README.md` (project overview, setup, deploy)
- Create: `docs/architecture.md` (diagrams, data flow)
- Create: `docs/api.md` (endpoint reference)
- Modify: `.env.example` (final version)
- Modify: `AGENTS.md` (if any updates needed)

**Interfaces:** None

- [ ] **Step 1: Write README.md** (quickstart, env vars, commands, deploy steps)
- [ ] **Step 2: Write docs/architecture.md** (Mermaid diagrams for DAG, State Machine, Data Flow)
- [ ] **Step 3: Write docs/api.md** (OpenAPI spec or markdown table)
- [ ] **Step 4: Final .env.example review**
- [ ] **Step 5: Run full CI** (`pnpm ci`)
- [ ] **Step 6: Commit**

---

## Spec Coverage Checklist

| Spec Section | Tasks Covering |
|--------------|----------------|
| specs1.md [INFRASTRUCTURE] | 1.1, 2.5 |
| specs1.md [INTERFACE_CONTRACTS] | 1.2, 2.1-2.4 |
| specs1.md [DATA_SCHEMAS] | 1.3 |
| specs1.md [PIPELINE_MODULE_1] | 3.1 |
| specs2.md [PIPELINE_MODULE_2] | 3.2, 3.3 |
| specs2.md [PIPELINE_MODULE_3] | 2.3 |
| specs2.md [PIPELINE_MODULE_4] | 4.1, 4.2, 4.4-4.8 |
| specs2.md [PIPELINE_MODULE_5] | 5.1-5.4 |
| specs2.md [SYSTEM_SECURITY] | 1.5, 1.6, 2.2 (RLS), 2.5 |
| specs2.md [DEPLOYMENT] | 1.1, 5.6 |
| specs2.md [AGENT_EXECUTION_STEPS] | All phases mapped |

---

## Execution Handoff

**Plan complete and saved to `docs/superpowers/plans/2026-09-28-plks-hybrid-storage-implementation.md`. Two execution options:**

**1. Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

**Which approach?**