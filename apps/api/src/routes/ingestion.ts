// apps/api/src/routes/ingestion.ts
import type { FastifyInstance, RouteHandlerMethod } from "fastify";
import type { IngestionPipeline } from "../modules/ingestion/ingestion-pipeline.js";

interface MultipartFile {
  filename: string;
  mimetype: string;
  encoding: string;
  file: AsyncIterable<Buffer>;
  fields: Record<string, string>;
  toBuffer(): Promise<Buffer>;
}

function createIngestFileHandler(ingestionPipeline: IngestionPipeline): RouteHandlerMethod {
  return async (request, reply) => {
    const contentType = request.headers["content-type"] ?? "";

    if (!contentType.includes("multipart/form-data")) {
      return reply.status(400).send({ error: "Content-Type must be multipart/form-data" });
    }

    // Use Fastify's multipart handler (requires @fastify/multipart plugin)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data = (await (request as any).file()) as MultipartFile | null;
    if (!data) {
      return reply.status(400).send({ error: "No file uploaded" });
    }

    const fileBuffer = await data.toBuffer();

    // Parse optional courseId from form fields
    const courseId = data.fields["courseId"];

    const result = await ingestionPipeline.processFileManually(data.filename, fileBuffer);

    if (result.isErr()) {
      return reply.status(400).send({ error: result.error.message });
    }

    return reply.status(201).send({
      sessionId: result.value.sessionId,
      courseId: result.value.courseId,
      status: "processing",
      message: "File uploaded and processing started",
    });
  };
}

function createIngestStatusHandler(ingestionPipeline: IngestionPipeline): RouteHandlerMethod {
  return async (request, reply) => {
    // For now, return a simple status
    // In production, query the processing directory or session store
    return reply.status(200).send({
      status: "running",
      inboxPath: ingestionPipeline.config.inboxPath,
      processingPath: ingestionPipeline.config.processingPath,
    });
  };
}

// Need to add config to IngestionPipeline
// This is a workaround - we'll add a getter for config
// For now, let's export the handler creators and the route registration

export function registerIngestionRoutes(
  app: FastifyInstance,
  ingestionPipeline: IngestionPipeline,
  prefix = "/api",
): void {
  const ingestFileHandler = createIngestFileHandler(ingestionPipeline);
  const ingestStatusHandler = createIngestStatusHandler(ingestionPipeline);

  app.post(`${prefix}/ingestion/upload`, ingestFileHandler);
  app.get(`${prefix}/ingestion/status`, ingestStatusHandler);
}

export const ingestFileHandler = createIngestFileHandler;
export const ingestStatusHandler = createIngestStatusHandler;
