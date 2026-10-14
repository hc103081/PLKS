import type { FastifyInstance, RouteHandlerMethod } from "fastify";
import { z } from "zod";
import { container } from "tsyringe";
import { IStructuredStore } from "@plks/shared/contracts";
import type { AuthenticatedRequest } from "../middleware/auth.js";

const ConceptTreeParamsSchema = z.object({
  courseId: z.string().uuid(),
});

const ConceptNodeSchema = z.object({
  nodeId: z.string().uuid(),
  term: z.string(),
  explanation: z.string(),
  chapterId: z.string().uuid().nullable(),
  order: z.number().int(),
  children: z.array(z.unknown()).optional(),
});

const ChapterSchema = z.object({
  chapterId: z.string().uuid(),
  title: z.string(),
  order: z.number().int(),
});

const ConceptTreeResponseSchema = z.object({
  courseId: z.string().uuid(),
  tree: z.array(ConceptNodeSchema),
  chapters: z.array(ChapterSchema),
});

function createGetConceptTreeHandler(
  structuredStore: IStructuredStore,
): RouteHandlerMethod {
  return async (
    request: AuthenticatedRequest,
    reply,
  ): Promise<z.infer<typeof ConceptTreeResponseSchema>> => {
    const parseResult = ConceptTreeParamsSchema.safeParse(request.params);
    if (!parseResult.success) {
      return reply.status(400).send({ error: "Invalid course ID" });
    }

    const { courseId } = parseResult.data;

    try {
      // 取得課程所有概念節點
      const nodes = await structuredStore.getConceptNodesByCourse(courseId);

      if (!nodes || nodes.length === 0) {
        // 回傳空樹結構
        return {
          courseId,
          tree: [],
          chapters: [
            {
              chapterId: "00000000-0000-0000-0000-000000000000",
              title: "根章節",
              order: 0,
            },
          ],
        };
      }

      // 轉換為前端需要的格式
      const tree = nodes.map((node, index) => ({
        nodeId: node.conceptId,
        term: node.term,
        explanation: node.explanation,
        chapterId: null as string | null, // 資料庫目前無 chapterId 欄位，暫時為 null
        order: index,
        children: [],
      }));

      // 章節資料 - 目前資料庫無章節表，回傳預設根章節
      const chapters = [
        {
          chapterId: "00000000-0000-0000-0000-000000000000",
          title: "根章節",
          order: 0,
        },
      ];

      return { courseId, tree, chapters };
    } catch (err: unknown) {
      request.log.error(err);
      return reply.status(500).send({ error: "Internal server error" });
    }
  };
}

export async function registerConceptTreeRoutes(
  app: FastifyInstance,
  structuredStore: IStructuredStore,
  prefix = "/api",
): Promise<void> {
  const getConceptTreeHandler = createGetConceptTreeHandler(structuredStore);

  app.get<{ Params: z.infer<typeof ConceptTreeParamsSchema> }>(
    `${prefix}/concept-tree/:courseId`,
    {
      preHandler: async (request, reply) => {
        // Use the same auth middleware pattern as courses routes
        const authMiddleware = (await import("../middleware/auth.js")).authMiddleware;
        await authMiddleware(request, reply);
      },
      schema: {
        params: ConceptTreeParamsSchema,
        response: {
          200: ConceptTreeResponseSchema,
        },
      },
    },
    getConceptTreeHandler,
  );
}

// Export handler for testing
export const getConceptTreeHandler = createGetConceptTreeHandler;