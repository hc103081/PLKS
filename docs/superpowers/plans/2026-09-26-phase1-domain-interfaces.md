# Phase 1: Domain & Interfaces Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Initialize pnpm Monorepo with shared configuration, define all core interfaces and DTO schemas (zod), create domain entities, set up DI container, and configure pre-commit hooks.

**Architecture:** Clean Architecture + Hexagonal (Ports & Adapters). Phase 1 establishes the foundation: shared contracts (interfaces + schemas) that both `apps/api` and `apps/web` depend on, domain entities with zero external dependencies, and DI container for binding interfaces to implementations in later phases.

**Tech Stack:** pnpm workspace, TypeScript 5.x (strict), Biome, tsyringe (DI), zod, lefthook.

## Global Constraints

- **Node.js**: 20+ (ES Modules)
- **TypeScript**: `strict: true`, `noUncheckedIndexedAccess: true`, `exactOptionalPropertyTypes: true`
- **Public APIs**: Must have explicit return types
- **No `any`**: Prohibited; use `unknown` or proper types
- **Naming**: Interfaces `I` prefix, Types/Schemas `Schema` suffix, Files kebab-case
- **Error Handling**: Result/Either pattern (`neverthrow`), no `throw` in business logic
- **DI**: Constructor injection via `tsyringe` decorators
- **Async**: `async/await` only, `Promise.all` for parallelism, no fire-and-forget
- **Git**: Conventional Commits, squash merge to main
- **Constraints from AGENTS.md**: No local FS writes (except `/tmp`), no direct SDK imports in business logic, no hardcoded prompts, all AI output validated via zod, stateless workers, secrets via env vars only, tests mock interfaces

---

### Task 1: Initialize pnpm Monorepo Structure

**Files:**
- Create: `pnpm-workspace.yaml`
- Create: `package.json` (root)
- Create: `tsconfig.base.json` (in `packages/config/`)
- Create: `biome.json` (in `packages/config/`)
- Create: `.gitignore`
- Create: `.env.example`
- Create: `turbo.json` (optional)

**Interfaces:**
- Consumes: None (first task)
- Produces: Monorepo scaffolding that all subsequent tasks depend on

- [ ] **Step 1: Write pnpm-workspace.yaml**

```yaml
# pnpm-workspace.yaml
packages:
  - apps/*
  - packages/*
```

- [ ] **Step 2: Write root package.json**

```json
{
  "name": "plks",
  "version": "0.0.0",
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
    "ci": "pnpm lint && pnpm typecheck && pnpm test:coverage",
    "prepare": "lefthook install"
  },
  "devDependencies": {
    "@biomejs/biome": "^1.9.0",
    "concurrently": "^8.2.2",
    "lefthook": "^1.7.0",
    "typescript": "^5.5.0"
  },
  "engines": {
    "node": ">=20.0.0"
  },
  "packageManager": "pnpm@9.0.0"
}
```

- [ ] **Step 3: Write packages/config/tsconfig.base.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022"],
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "noImplicitOverride": true,
    "noPropertyAccessFromIndexSignature": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "declaration": true,
    "declarationMap": true,
    "noEmit": true,
    "baseUrl": ".",
    "paths": {
      "@plks/shared/*": ["packages/shared/src/*"],
      "@plks/api/*": ["apps/api/src/*"],
      "@plks/web/*": ["apps/web/src/*"]
    }
  },
  "exclude": ["node_modules", "dist", ".turbo"]
}
```

- [ ] **Step 4: Write packages/config/biome.json**

```json
{
  "$schema": "https://biomejs.dev/schemas/1.9.0/schema.json",
  "organizeImports": { "enabled": true },
  "linter": {
    "enabled": true,
    "rules": {
      "recommended": true,
      "correctness": { "noUnusedVariables": "error" },
      "style": {
        "noNonNullAssertion": "warn",
        "useConst": "error",
        "useAsConstAssertion": "error"
      },
      "suspicious": { "noExplicitAny": "error" }
    }
  },
  "formatter": {
    "enabled": true,
    "indentStyle": "space",
    "indentWidth": 2,
    "lineWidth": 100
  },
  "javascript": { "formatter": { "semicolons": "always", "trailingCommas": "all" } },
  "overrides": [
    {
      "includes": ["**/*.test.ts", "**/*.spec.ts"],
      "linter": { "rules": { "suspicious": { "noExplicitAny": "off" } } }
    }
  ]
}
```

- [ ] **Step 5: Write .gitignore**

```gitignore
# Dependencies
node_modules
.pnpm-store

# Build outputs
dist
build
*.tsbuildinfo

# Turbo
.turbo

# Environment
.env
.env.local
.env.*.local

# IDE
.idea
.vscode
*.swp
*.swo

# OS
.DS_Store
Thumbs.db

# Logs
*.log
npm-debug.log*
pnpm-debug.log*

# Test coverage
coverage
.nyc_output

# Temporary
tmp
temp
*.tmp
```

- [ ] **Step 6: Write .env.example**

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

# App
NODE_ENV=development
PORT=3000
LOG_LEVEL=debug
API_PREFIX=/api

# Frontend (Vite injects VITE_* variables)
VITE_API_BASE_URL=http://localhost:3000
```

- [ ] **Step 7: Write turbo.json (optional but recommended)**

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

- [ ] **Step 8: Run pnpm install and verify**

Run: `pnpm install`
Expected: All dependencies installed, no errors

- [ ] **Step 9: Commit**

```bash
git add pnpm-workspace.yaml package.json packages/config/tsconfig.base.json packages/config/biome.json .gitignore .env.example turbo.json
git commit -m "chore: initialize pnpm monorepo with shared config"
```

---

### Task 2: Create packages/shared with Contracts and Schemas

**Files:**
- Create: `packages/shared/package.json`
- Create: `packages/shared/tsconfig.json`
- Create: `packages/shared/src/contracts/IStorageAdapter.ts`
- Create: `packages/shared/src/contracts/IKnowledgeGraphWriter.ts`
- Create: `packages/shared/src/contracts/IAIReasoningGateway.ts`
- Create: `packages/shared/src/contracts/index.ts`
- Create: `packages/shared/src/schemas/raw-asset.schema.ts`
- Create: `packages/shared/src/schemas/concept-node.schema.ts`
- Create: `packages/shared/src/schemas/quiz-item.schema.ts`
- Create: `packages/shared/src/schemas/user-config.schema.ts`
- Create: `packages/shared/src/schemas/index.ts`
- Create: `packages/shared/src/types/index.ts`
- Create: `packages/shared/src/utils/index.ts`

**Interfaces:**
- Consumes: Monorepo structure from Task 1
- Produces: All interfaces and schemas used by api, web, and adapters

- [ ] **Step 1: Write packages/shared/package.json**

```json
{
  "name": "@plks/shared",
  "version": "0.0.0",
  "type": "module",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js"
    },
    "./contracts": {
      "types": "./dist/contracts/index.d.ts",
      "import": "./dist/contracts/index.js"
    },
    "./schemas": {
      "types": "./dist/schemas/index.d.ts",
      "import": "./dist/schemas/index.js"
    }
  },
  "scripts": {
    "build": "tsc",
    "test": "vitest run",
    "test:coverage": "vitest run --coverage",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "zod": "^3.23.0",
    "neverthrow": "^6.2.0"
  },
  "devDependencies": {
    "typescript": "^5.5.0",
    "vitest": "^2.0.0",
    "@vitest/coverage-v8": "^2.0.0"
  }
}
```

- [ ] **Step 2: Write packages/shared/tsconfig.json**

```json
{
  "extends": "../../packages/config/tsconfig.base.json",
  "compilerOptions": {
    "outDir": "dist",
    "rootDir": "src",
    "composite": true,
    "tsBuildInfoFile": "dist/tsconfig.tsbuildinfo"
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

- [ ] **Step 3: Write packages/shared/src/contracts/IStorageAdapter.ts**

```typescript
// packages/shared/src/contracts/IStorageAdapter.ts
import type { Readable } from 'node:stream';

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

- [ ] **Step 4: Write packages/shared/src/contracts/IKnowledgeGraphWriter.ts**

```typescript
// packages/shared/src/contracts/IKnowledgeGraphWriter.ts
import type { ConceptNodePayload } from '../schemas/concept-node.schema';

export interface IKnowledgeGraphWriter {
  /** 將單一概念節點轉為 Markdown 並寫入 B2 */
  writeNode(node: ConceptNodePayload): Promise<boolean>;

  /** 生成課程主控台筆記 (MOC)，包含雙向連結索引 */
  writeIndex(courseId: string, nodes: ConceptNodePayload[]): Promise<boolean>;
}
```

- [ ] **Step 5: Write packages/shared/src/contracts/IAIReasoningGateway.ts**

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

- [ ] **Step 6: Write packages/shared/src/contracts/index.ts**

```typescript
// packages/shared/src/contracts/index.ts
export * from './IStorageAdapter';
export * from './IKnowledgeGraphWriter';
export * from './IAIReasoningGateway';
```

- [ ] **Step 7: Write packages/shared/src/schemas/raw-asset.schema.ts**

```typescript
// packages/shared/src/schemas/raw-asset.schema.ts
import { z } from 'zod';

export const RawAssetPayloadSchema = z.object({
  sessionId: z.string().uuid(),
  courseId: z.string().min(1),
  transcripts: z.array(
    z.object({
      start_time: z.string().regex(/^\d{2}:\d{2}:\d{2}$/),
      end_time: z.string().regex(/^\d{2}:\d{2}:\d{2}$/),
      text: z.string().min(1),
    })
  ),
  visualAssets: z.array(
    z.object({
      page_num: z.number().int().positive(),
      b2_uri: z.string().url(),
    })
  ),
});

export type RawAssetPayload = z.infer<typeof RawAssetPayloadSchema>;
```

- [ ] **Step 8: Write packages/shared/src/schemas/concept-node.schema.ts**

```typescript
// packages/shared/src/schemas/concept-node.schema.ts
import { z } from 'zod';

export const ConceptNodePayloadSchema = z.object({
  conceptId: z.string().uuid(),
  courseId: z.string().min(1),
  term: z.string().min(1),
  explanation: z.string().min(1),
  relatedTerms: z.array(z.string()).default([]),
  sourceEvidence: z.object({
    transcriptRef: z.string().regex(/^\d{2}:\d{2}:\d{2}$/),
    slideUri: z.string().url(),
  }),
});

export type ConceptNodePayload = z.infer<typeof ConceptNodePayloadSchema>;
```

- [ ] **Step 9: Write packages/shared/src/schemas/quiz-item.schema.ts**

```typescript
// packages/shared/src/schemas/quiz-item.schema.ts
import { z } from 'zod';

export const QuizItemPayloadSchema = z.object({
  quizId: z.string().uuid(),
  courseId: z.string().min(1),
  type: z.enum(['multiple_choice', 'true_false', 'short_answer']),
  question: z.string().min(1),
  options: z.array(z.string()).optional(),
  correctAnswer: z.string().min(1),
  contextReference: z.string().uuid(),
});

export type QuizItemPayload = z.infer<typeof QuizItemPayloadSchema>;
```

- [ ] **Step 10: Write packages/shared/src/schemas/user-config.schema.ts**

```typescript
// packages/shared/src/schemas/user-config.schema.ts
import { z } from 'zod';

export const UserConfigPayloadSchema = z.object({
  sessionId: z.string().uuid(),
  fusionLevel: z.enum(['strict_alignment', 'high_level_summary']),
  outputTemplates: z.array(z.enum(['knowledge_nodes', 'flashcard_quiz'])).min(1),
  b2TargetDir: z.string().url().startsWith('s3://'),
});

export type UserConfigPayload = z.infer<typeof UserConfigPayloadSchema>;
```

- [ ] **Step 11: Write packages/shared/src/schemas/index.ts**

```typescript
// packages/shared/src/schemas/index.ts
export * from './raw-asset.schema';
export * from './concept-node.schema';
export * from './quiz-item.schema';
export * from './user-config.schema';
```

- [ ] **Step 12: Write packages/shared/src/types/index.ts**

```typescript
// packages/shared/src/types/index.ts
import type {
  RawAssetPayload,
  ConceptNodePayload,
  QuizItemPayload,
  UserConfigPayload,
} from '../schemas';

export type {
  RawAssetPayload,
  ConceptNodePayload,
  QuizItemPayload,
  UserConfigPayload,
};
```

- [ ] **Step 13: Write packages/shared/src/utils/index.ts (placeholder for shared utilities)**

```typescript
// packages/shared/src/utils/index.ts
/** Shared utility functions - add as needed */
export const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));
```

- [ ] **Step 14: Build and verify**

Run: `pnpm --filter @plks/shared build`
Expected: Build succeeds, dist/ generated

- [ ] **Step 15: Commit**

```bash
git add packages/shared/
git commit -m "feat: add shared package with contracts and zod schemas"
```

---

### Task 3: Define Core Domain Entities

**Files:**
- Create: `apps/api/package.json`
- Create: `apps/api/tsconfig.json`
- Create: `apps/api/src/core/entities/concept-node.ts`
- Create: `apps/api/src/core/entities/quiz-item.ts`
- Create: `apps/api/src/core/entities/raw-asset.ts`
- Create: `apps/api/src/core/entities/course.ts`
- Create: `apps/api/src/core/entities/session.ts`
- Create: `apps/api/src/core/entities/index.ts`
- Create: `apps/api/src/core/errors/domain-errors.ts`
- Create: `apps/api/src/core/errors/index.ts`

**Interfaces:**
- Consumes: `@plks/shared` (schemas, contracts)
- Produces: Domain entities used by modules and orchestrator

- [ ] **Step 1: Write apps/api/package.json**

```json
{
  "name": "@plks/api",
  "version": "0.0.0",
  "type": "module",
  "main": "./dist/main.js",
  "scripts": {
    "dev": "tsx watch src/main.ts",
    "build": "tsc",
    "start": "node dist/main.js",
    "test": "vitest run",
    "test:coverage": "vitest run --coverage",
    "test:watch": "vitest watch",
    "typecheck": "tsc --noEmit",
    "db:push": "echo 'No database in Phase 1'"
  },
  "dependencies": {
    "@plks/shared": "workspace:*",
    "fastify": "^4.28.0",
    "tsyringe": "^4.8.0",
    "zod": "^3.23.0",
    "neverthrow": "^6.2.0",
    "pino": "^9.0.0",
    "pino-pretty": "^11.0.0"
  },
  "devDependencies": {
    "@types/node": "^22.0.0",
    "typescript": "^5.5.0",
    "vitest": "^2.0.0",
    "@vitest/coverage-v8": "^2.0.0",
    "tsx": "^4.16.0"
  }
}
```

- [ ] **Step 2: Write apps/api/tsconfig.json**

```json
{
  "extends": "../../packages/config/tsconfig.base.json",
  "compilerOptions": {
    "outDir": "dist",
    "rootDir": "src",
    "composite": true,
    "tsBuildInfoFile": "dist/tsconfig.tsbuildinfo",
    "types": ["node"]
  },
  "include": ["src/**/*", "tests/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

- [ ] **Step 3: Write apps/api/src/core/errors/domain-errors.ts**

```typescript
// apps/api/src/core/errors/domain-errors.ts
import { err, ok, Result } from 'neverthrow';

export class DomainError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly cause?: unknown
  ) {
    super(message);
    this.name = 'DomainError';
  }

  static storageUploadFailed(cause?: unknown): DomainError {
    return new DomainError('STORAGE_UPLOAD_FAILED', 'Failed to upload file to storage', cause);
  }

  static storageDownloadFailed(cause?: unknown): DomainError {
    return new DomainError('STORAGE_DOWNLOAD_FAILED', 'Failed to download file from storage', cause);
  }

  static storageListFailed(cause?: unknown): DomainError {
    return new DomainError('STORAGE_LIST_FAILED', 'Failed to list directory', cause);
  }

  static presignedUrlFailed(cause?: unknown): DomainError {
    return new DomainError('PRESIGNED_URL_FAILED', 'Failed to generate presigned URL', cause);
  }

  static aiInferenceFailed(cause?: unknown): DomainError {
    return new DomainError('AI_INFERENCE_FAILED', 'AI inference failed', cause);
  }

  static aiValidationFailed(cause?: unknown): DomainError {
    return new DomainError('AI_VALIDATION_FAILED', 'AI output validation failed', cause);
  }

  static markdownWriteFailed(cause?: unknown): DomainError {
    return new DomainError('MARKDOWN_WRITE_FAILED', 'Failed to write markdown to storage', cause);
  }

  static ingestionFailed(cause?: unknown): DomainError {
    return new DomainError('INGESTION_FAILED', 'Ingestion pipeline failed', cause);
  }

  static dagExecutionFailed(node: string, cause?: unknown): DomainError {
    return new DomainError('DAG_EXECUTION_FAILED', `DAG node ${node} failed`, cause);
  }

  static notFound(resource: string, id: string): DomainError {
    return new DomainError('NOT_FOUND', `${resource} not found: ${id}`);
  }

  static invalidInput(message: string): DomainError {
    return new DomainError('INVALID_INPUT', message);
  }
}

export type DomainResult<T> = Result<T, DomainError>;

export const toDomainResult = <T>(promise: Promise<T>, errorFactory: (cause: unknown) => DomainError): Promise<DomainResult<T>> =>
  promise.then(ok).catch((cause) => err(errorFactory(cause)));
```

- [ ] **Step 4: Write apps/api/src/core/errors/index.ts**

```typescript
// apps/api/src/core/errors/index.ts
export * from './domain-errors';
```

- [ ] **Step 5: Write apps/api/src/core/entities/concept-node.ts**

```typescript
// apps/api/src/core/entities/concept-node.ts
import type { ConceptNodePayload } from '@plks/shared/schemas';

export class ConceptNode {
  constructor(
    public readonly conceptId: string,
    public readonly courseId: string,
    public readonly term: string,
    public readonly explanation: string,
    public readonly relatedTerms: readonly string[],
    public readonly sourceEvidence: {
      transcriptRef: string;
      slideUri: string;
    }
  ) {}

  static fromPayload(payload: ConceptNodePayload): ConceptNode {
    return new ConceptNode(
      payload.conceptId,
      payload.courseId,
      payload.term,
      payload.explanation,
      [...payload.relatedTerms],
      { ...payload.sourceEvidence }
    );
  }

  toPayload(): ConceptNodePayload {
    return {
      conceptId: this.conceptId,
      courseId: this.courseId,
      term: this.term,
      explanation: this.explanation,
      relatedTerms: [...this.relatedTerms],
      sourceEvidence: { ...this.sourceEvidence },
    };
  }

  toMarkdown(): string {
    const frontmatter = `---
conceptId: ${this.conceptId}
courseId: ${this.courseId}
term: ${this.term}
tags: [${this.relatedTerms.map((t) => `"${t}"`).join(', ')}]
sourceEvidence:
  transcriptRef: ${this.sourceEvidence.transcriptRef}
  slideUri: ${this.sourceEvidence.slideUri}
---`;

    const links = this.relatedTerms.map((t) => `[[${t}]]`).join(', ');

    return `${frontmatter}

# ${this.term}

${this.explanation}

**相關概念**: ${links || '無'}

**來源**: 逐字稿 ${this.sourceEvidence.transcriptRef} | 投影片 ${this.sourceEvidence.slideUri}
`;
  }
}
```

- [ ] **Step 6: Write apps/api/src/core/entities/quiz-item.ts**

```typescript
// apps/api/src/core/entities/quiz-item.ts
import type { QuizItemPayload } from '@plks/shared/schemas';

export class QuizItem {
  constructor(
    public readonly quizId: string,
    public readonly courseId: string,
    public readonly type: 'multiple_choice' | 'true_false' | 'short_answer',
    public readonly question: string,
    public readonly options: readonly string[] | undefined,
    public readonly correctAnswer: string,
    public readonly contextReference: string
  ) {}

  static fromPayload(payload: QuizItemPayload): QuizItem {
    return new QuizItem(
      payload.quizId,
      payload.courseId,
      payload.type,
      payload.question,
      payload.options ? [...payload.options] : undefined,
      payload.correctAnswer,
      payload.contextReference
    );
  }

  toPayload(): QuizItemPayload {
    return {
      quizId: this.quizId,
      courseId: this.courseId,
      type: this.type,
      question: this.question,
      options: this.options ? [...this.options] : undefined,
      correctAnswer: this.correctAnswer,
      contextReference: this.contextReference,
    };
  }

  checkAnswer(userAnswer: string): boolean {
    return userAnswer.trim().toLowerCase() === this.correctAnswer.trim().toLowerCase();
  }
}
```

- [ ] **Step 7: Write apps/api/src/core/entities/raw-asset.ts**

```typescript
// apps/api/src/core/entities/raw-asset.ts
import type { RawAssetPayload } from '@plks/shared/schemas';

export class RawAsset {
  constructor(
    public readonly sessionId: string,
    public readonly courseId: string,
    public readonly transcripts: ReadonlyArray<{
      start_time: string;
      end_time: string;
      text: string;
    }>,
    public readonly visualAssets: ReadonlyArray<{
      page_num: number;
      b2_uri: string;
    }>
  ) {}

  static fromPayload(payload: RawAssetPayload): RawAsset {
    return new RawAsset(
      payload.sessionId,
      payload.courseId,
      [...payload.transcripts],
      [...payload.visualAssets]
    );
  }

  toPayload(): RawAssetPayload {
    return {
      sessionId: this.sessionId,
      courseId: this.courseId,
      transcripts: [...this.transcripts],
      visualAssets: [...this.visualAssets],
    };
  }

  getFullTranscript(): string {
    return this.transcripts.map((t) => t.text).join(' ');
  }

  getTranscriptByTimeRange(start: string, end: string): string {
    return this.transcripts
      .filter((t) => t.start_time >= start && t.end_time <= end)
      .map((t) => t.text)
      .join(' ');
  }
}
```

- [ ] **Step 8: Write apps/api/src/core/entities/course.ts**

```typescript
// apps/api/src/core/entities/course.ts
export class Course {
  constructor(
    public readonly courseId: string,
    public readonly title: string,
    public readonly description: string,
    public readonly createdAt: Date,
    public readonly updatedAt: Date
  ) {}

  static create(courseId: string, title: string, description: string): Course {
    const now = new Date();
    return new Course(courseId, title, description, now, now);
  }

  update(title: string, description: string): Course {
    return new Course(this.courseId, title, description, this.createdAt, new Date());
  }
}
```

- [ ] **Step 9: Write apps/api/src/core/entities/session.ts**

```typescript
// apps/api/src/core/entities/session.ts
export type SessionStatus = 'pending' | 'processing' | 'completed' | 'failed';

export class Session {
  constructor(
    public readonly sessionId: string,
    public readonly courseId: string,
    public readonly status: SessionStatus,
    public readonly createdAt: Date,
    public readonly updatedAt: Date,
    public readonly error?: string
  ) {}

  static create(sessionId: string, courseId: string): Session {
    const now = new Date();
    return new Session(sessionId, courseId, 'pending', now, now);
  }

  startProcessing(): Session {
    return new Session(this.sessionId, this.courseId, 'processing', this.createdAt, new Date());
  }

  complete(): Session {
    return new Session(this.sessionId, this.courseId, 'completed', this.createdAt, new Date());
  }

  fail(error: string): Session {
    return new Session(this.sessionId, this.courseId, 'failed', this.createdAt, new Date(), error);
  }
}
```

- [ ] **Step 10: Write apps/api/src/core/entities/index.ts**

```typescript
// apps/api/src/core/entities/index.ts
export * from './concept-node';
export * from './quiz-item';
export * from './raw-asset';
export * from './course';
export * from './session';
```

- [ ] **Step 11: Build and verify**

Run: `pnpm --filter @plks/api build`
Expected: Build succeeds

- [ ] **Step 12: Commit**

```bash
git add apps/api/
git commit -m "feat: add api package with domain entities and errors"
```

---

### Task 4: Set Up DI Container and Main Entry Point

**Files:**
- Create: `apps/api/src/main.ts`
- Create: `apps/api/src/config/env.ts`
- Create: `apps/api/src/config/di.ts`
- Create: `apps/api/src/config/index.ts`

**Interfaces:**
- Consumes: All interfaces from `@plks/shared/contracts`, entities from `core/entities`
- Produces: DI container registration, validated env config, Fastify app instance

- [ ] **Step 1: Write apps/api/src/config/env.ts**

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
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(3000),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  API_PREFIX: z.string().startsWith('/').default('/api'),
});

export const env = EnvSchema.parse(process.env);
```

- [ ] **Step 2: Write apps/api/src/config/di.ts**

```typescript
// apps/api/src/config/di.ts
import { container } from 'tsyringe';
import type { IStorageAdapter } from '@plks/shared/contracts';
import type { IKnowledgeGraphWriter } from '@plks/shared/contracts';
import type { IAIReasoningGateway } from '@plks/shared/contracts';

// Token symbols for interface binding
export const TOKENS = {
  IStorageAdapter: Symbol.for('IStorageAdapter'),
  IKnowledgeGraphWriter: Symbol.for('IKnowledgeGraphWriter'),
  IAIReasoningGateway: Symbol.for('IAIReasoningGateway'),
} as const;

export function registerAdapters(
  storageAdapter: IStorageAdapter,
  knowledgeGraphWriter: IKnowledgeGraphWriter,
  aiReasoningGateway: IAIReasoningGateway
): void {
  container.register(TOKENS.IStorageAdapter, { useValue: storageAdapter });
  container.register(TOKENS.IKnowledgeGraphWriter, { useValue: knowledgeGraphWriter });
  container.register(TOKENS.IAIReasoningGateway, { useValue: aiReasoningGateway });
}

export function resolveStorageAdapter(): IStorageAdapter {
  return container.resolve(TOKENS.IStorageAdapter);
}

export function resolveKnowledgeGraphWriter(): IKnowledgeGraphWriter {
  return container.resolve(TOKENS.IKnowledgeGraphWriter);
}

export function resolveAIReasoningGateway(): IAIReasoningGateway {
  return container.resolve(TOKENS.IAIReasoningGateway);
}
```

- [ ] **Step 3: Write apps/api/src/config/index.ts**

```typescript
// apps/api/src/config/index.ts
export * from './env';
export * from './di';
```

- [ ] **Step 4: Write apps/api/src/main.ts**

```typescript
// apps/api/src/main.ts
import 'reflect-metadata';
import Fastify from 'fastify';
import { env } from './config/env';
import { container } from 'tsyringe';

// Import routes (will be implemented in later phases)
// import { ingestionRoutes } from './routes/ingestion';
// import { orchestratorRoutes } from './routes/orchestrator';
// import { gamificationRoutes } from './routes/gamification';

const app = Fastify({
  logger: {
    level: env.LOG_LEVEL,
    transport: env.NODE_ENV === 'development' ? { target: 'pino-pretty' } : undefined,
  },
});

// Register DI container
app.decorate('container', container);

// Health check
app.get('/health', async () => ({ status: 'ok', timestamp: new Date().toISOString() }));

// Register routes (placeholders for now)
// app.register(ingestionRoutes, { prefix: env.API_PREFIX });
// app.register(orchestratorRoutes, { prefix: env.API_PREFIX });
// app.register(gamificationRoutes, { prefix: env.API_PREFIX });

async function start(): Promise<void> {
  try {
    await app.listen({ port: env.PORT, host: '0.0.0.0' });
    app.log.info(`Server listening on port ${env.PORT}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

start();
```

- [ ] **Step 5: Build and verify**

Run: `pnpm --filter @plks/api build`
Expected: Build succeeds

- [ ] **Step 6: Test dev server starts**

Run: `pnpm --filter @plks/api dev` (in background, then curl /health)
Expected: Server starts, `GET /health` returns `{ "status": "ok", ... }`

- [ ] **Step 7: Commit**

```bash
git add apps/api/src/config/ apps/api/src/main.ts
git commit -m "feat: add DI container, env config, and main entry point"
```

---

### Task 5: Configure Lefthook Pre-commit Hooks

**Files:**
- Create: `lefthook.yml` (root)

**Interfaces:**
- Consumes: Root package.json scripts (lint, format, typecheck)
- Produces: Pre-commit hook that runs on every commit

- [ ] **Step 1: Write lefthook.yml**

```yaml
# lefthook.yml
pre-commit:
  parallel: true
  commands:
    biome-check:
      glob: "*.{ts,tsx,json,jsonc}"
      run: pnpm biome check --write {staged_files}
    typecheck:
      run: pnpm typecheck
  # Note: tests run in CI, not on every commit for speed
```

- [ ] **Step 2: Install lefthook**

Run: `pnpm prepare`
Expected: Lefthook installed, `.git/hooks/pre-commit` created

- [ ] **Step 3: Test pre-commit hook**

Run: `git add . && git commit -m "test: verify pre-commit hook"` (should run biome + typecheck)
Expected: Hook runs, passes if code is clean

- [ ] **Step 4: Commit lefthook config**

```bash
git add lefthook.yml
git commit -m "chore: add lefthook pre-commit configuration"
```

---

### Task 6: Create apps/web Skeleton (Minimal)

**Files:**
- Create: `apps/web/package.json`
- Create: `apps/web/tsconfig.json`
- Create: `apps/web/vite.config.ts`
- Create: `apps/web/index.html`
- Create: `apps/web/src/main.tsx`
- Create: `apps/web/src/App.tsx`
- Create: `apps/web/src/vite-env.d.ts`

**Interfaces:**
- Consumes: Monorepo structure, shared types
- Produces: Working Vite + React + TypeScript dev server

- [ ] **Step 1: Write apps/web/package.json**

```json
{
  "name": "@plks/web",
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "test": "vitest run",
    "test:coverage": "vitest run --coverage",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "@plks/shared": "workspace:*",
    "react": "^18.3.0",
    "react-dom": "^18.3.0",
    "react-router-dom": "^6.26.0",
    "@tanstack/react-query": "^5.50.0",
    "zustand": "^4.5.0"
  },
  "devDependencies": {
    "@types/react": "^18.3.0",
    "@types/react-dom": "^18.3.0",
    "@vitejs/plugin-react": "^4.3.0",
    "typescript": "^5.5.0",
    "vite": "^5.4.0",
    "vitest": "^2.0.0",
    "@vitest/coverage-v8": "^2.0.0",
    "tailwindcss": "^3.4.0",
    "postcss": "^8.4.0",
    "autoprefixer": "^10.4.0"
  }
}
```

- [ ] **Step 2: Write apps/web/tsconfig.json**

```json
{
  "extends": "../../packages/config/tsconfig.base.json",
  "compilerOptions": {
    "outDir": "dist",
    "rootDir": "src",
    "composite": true,
    "tsBuildInfoFile": "dist/tsconfig.tsbuildinfo",
    "jsx": "react-jsx",
    "types": ["vite/client"]
  },
  "include": ["src/**/*", "tests/**/*", "vite.config.ts"],
  "exclude": ["node_modules", "dist"]
}
```

- [ ] **Step 3: Write apps/web/vite.config.ts**

```typescript
// apps/web/vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@plks/shared': path.resolve(__dirname, '../../packages/shared/src'),
      '@plks/web': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
});
```

- [ ] **Step 4: Write apps/web/index.html**

```html
<!DOCTYPE html>
<html lang="zh-TW">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>PLKS - Personal Learning Knowledge System</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 5: Write apps/web/src/vite-env.d.ts**

```typescript
// apps/web/src/vite-env.d.ts
/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
```

- [ ] **Step 6: Write apps/web/src/main.tsx**

```tsx
// apps/web/src/main.tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import App from './App';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      retry: 1,
    },
  },
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>
);
```

- [ ] **Step 7: Write apps/web/src/App.tsx**

```tsx
// apps/web/src/App.tsx
import { Routes, Route } from 'react-router-dom';

function App() {
  return (
    <Routes>
      <Route path="/" element={<div>PLKS Dashboard (TODO)</div>} />
      <Route path="/course/:courseId" element={<div>Course Console (TODO)</div>} />
      <Route path="/quiz/:courseId" element={<div>Quiz Player (TODO)</div>} />
      <Route path="/sidekick/:quizId" element={<div>Sidekick Chat (TODO)</div>} />
    </Routes>
  );
}

export default App;
```

- [ ] **Step 8: Build and verify**

Run: `pnpm --filter @plks/web build`
Expected: Build succeeds

- [ ] **Step 9: Test dev servers (both api and web)**

Run: `pnpm dev` (runs both concurrently)
Expected: API on :3000/health, Web on :5173

- [ ] **Step 10: Commit**

```bash
git add apps/web/
git commit -m "feat: add web package with React + Vite + TypeScript skeleton"
```

---

### Task 7: Phase 1 Integration Verification

**Files:**
- Test: `packages/shared/src/schemas/__tests__/schemas.test.ts`
- Test: `apps/api/src/core/entities/__tests__/entities.test.ts`

**Interfaces:**
- Consumes: All Phase 1 deliverables
- Produces: Confidence that foundation is solid

- [ ] **Step 1: Write schema validation tests**

```typescript
// packages/shared/src/schemas/__tests__/schemas.test.ts
import { describe, it, expect } from 'vitest';
import {
  RawAssetPayloadSchema,
  ConceptNodePayloadSchema,
  QuizItemPayloadSchema,
  UserConfigPayloadSchema,
} from '../index';

describe('Shared Schemas', () => {
  it('validates RawAssetPayload', () => {
    const valid = {
      sessionId: '123e4567-e89b-12d3-a456-426614174000',
      courseId: 'CS101',
      transcripts: [{ start_time: '00:00:00', end_time: '00:01:00', text: 'Hello' }],
      visualAssets: [{ page_num: 1, b2_uri: 's3://bucket/slide1.png' }],
    };
    expect(RawAssetPayloadSchema.parse(valid)).toEqual(valid);
  });

  it('rejects invalid RawAssetPayload', () => {
    const invalid = { sessionId: 'not-uuid', courseId: '', transcripts: [], visualAssets: [] };
    expect(() => RawAssetPayloadSchema.parse(invalid)).toThrow();
  });

  it('validates ConceptNodePayload', () => {
    const valid = {
      conceptId: '123e4567-e89b-12d3-a456-426614174000',
      courseId: 'CS101',
      term: 'Marginal Cost',
      explanation: 'Cost of producing one more unit',
      relatedTerms: ['Supply', 'Demand'],
      sourceEvidence: { transcriptRef: '00:15:30', slideUri: 's3://bucket/slide5.png' },
    };
    expect(ConceptNodePayloadSchema.parse(valid)).toEqual(valid);
  });

  it('validates QuizItemPayload', () => {
    const valid = {
      quizId: '123e4567-e89b-12d3-a456-426614174000',
      courseId: 'CS101',
      type: 'multiple_choice' as const,
      question: 'What is marginal cost?',
      options: ['A', 'B', 'C'],
      correctAnswer: 'B',
      contextReference: '123e4567-e89b-12d3-a456-426614174000',
    };
    expect(QuizItemPayloadSchema.parse(valid)).toEqual(valid);
  });

  it('validates UserConfigPayload', () => {
    const valid = {
      sessionId: '123e4567-e89b-12d3-a456-426614174000',
      fusionLevel: 'strict_alignment' as const,
      outputTemplates: ['knowledge_nodes', 'flashcard_quiz'] as const,
      b2TargetDir: 's3://pkm-omni-vault/vault/CS101/',
    };
    expect(UserConfigPayloadSchema.parse(valid)).toEqual(valid);
  });
});
```

- [ ] **Step 2: Write entity tests**

```typescript
// apps/api/src/core/entities/__tests__/entities.test.ts
import { describe, it, expect } from 'vitest';
import { ConceptNode } from '../concept-node';
import { QuizItem } from '../quiz-item';
import { RawAsset } from '../raw-asset';
import { Session } from '../session';
import { Course } from '../course';
import type { ConceptNodePayload, QuizItemPayload, RawAssetPayload } from '@plks/shared/schemas';

describe('Domain Entities', () => {
  it('ConceptNode round-trips through payload', () => {
    const payload: ConceptNodePayload = {
      conceptId: '123e4567-e89b-12d3-a456-426614174000',
      courseId: 'CS101',
      term: 'Test',
      explanation: 'Desc',
      relatedTerms: ['A', 'B'],
      sourceEvidence: { transcriptRef: '00:00:00', slideUri: 's3://bucket/x.png' },
    };
    const entity = ConceptNode.fromPayload(payload);
    expect(entity.toPayload()).toEqual(payload);
  });

  it('ConceptNode generates markdown with wikilinks', () => {
    const entity = ConceptNode.fromPayload({
      conceptId: '1',
      courseId: 'CS101',
      term: 'Term',
      explanation: 'Expl',
      relatedTerms: ['Related1', 'Related2'],
      sourceEvidence: { transcriptRef: '00:00:00', slideUri: 's3://bucket/x.png' },
    });
    const md = entity.toMarkdown();
    expect(md).toContain('[[Related1]]');
    expect(md).toContain('[[Related2]]');
    expect(md).toContain('conceptId: 1');
  });

  it('QuizItem checks answer correctly', () => {
    const item = QuizItem.fromPayload({
      quizId: '1',
      courseId: 'CS101',
      type: 'multiple_choice',
      question: 'Q?',
      options: ['A', 'B'],
      correctAnswer: 'B',
      contextReference: 'ref-1',
    });
    expect(item.checkAnswer('B')).toBe(true);
    expect(item.checkAnswer('b')).toBe(true);
    expect(item.checkAnswer('A')).toBe(false);
  });

  it('RawAsset provides transcript helpers', () => {
    const asset = RawAsset.fromPayload({
      sessionId: '1',
      courseId: 'CS101',
      transcripts: [
        { start_time: '00:00:00', end_time: '00:01:00', text: 'First' },
        { start_time: '00:01:00', end_time: '00:02:00', text: 'Second' },
      ],
      visualAssets: [],
    });
    expect(asset.getFullTranscript()).toBe('First Second');
    expect(asset.getTranscriptByTimeRange('00:00:00', '00:01:00')).toBe('First');
  });

  it('Session transitions through states', () => {
    const s = Session.create('sess-1', 'CS101');
    expect(s.status).toBe('pending');
    expect(s.startProcessing().status).toBe('processing');
    expect(s.complete().status).toBe('completed');
    expect(s.fail('error').status).toBe('failed');
  });

  it('Course creates and updates', () => {
    const c = Course.create('CS101', 'Title', 'Desc');
    expect(c.title).toBe('Title');
    expect(c.update('New', 'NewDesc').title).toBe('New');
  });
});
```

- [ ] **Step 3: Run all tests**

Run: `pnpm test:coverage`
Expected: All tests pass, coverage meets thresholds (statements 80%, branches 70%, functions 80%, lines 80%)

- [ ] **Step 4: Run lint and typecheck**

Run: `pnpm lint && pnpm typecheck`
Expected: No errors

- [ ] **Step 5: Commit**

```bash
git add packages/shared/src/schemas/__tests__/ apps/api/src/core/entities/__tests__/
git commit -m "test: add schema and entity validation tests"
```

---

## Phase 1 Completion Checklist

- [ ] pnpm Monorepo initialized with shared config
- [ ] `@plks/shared` package with 3 interfaces + 4 zod schemas
- [ ] `@plks/api` package with 5 domain entities + error types
- [ ] DI container (`tsyringe`) with token registration
- [ ] Environment validation with zod
- [ ] Fastify server with health endpoint
- [ ] `@plks/web` package with React + Vite + TypeScript
- [ ] Lefthook pre-commit (biome + typecheck)
- [ ] All tests pass, coverage thresholds met
- [ ] Lint and typecheck clean

---

**Next Phase:** Phase 2: Infrastructure Adapters (B2StorageAdapter, NvidiaNimAdapter, ObsidianMarkdownWriter)