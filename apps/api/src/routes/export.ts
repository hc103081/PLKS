// apps/api/src/routes/export.ts
import type { FastifyInstance, FastifyRequest, RouteHandlerMethod } from "fastify";
import { z } from "zod";
import type { ExportService } from "../modules/export/export.service.js";

const CourseParamsSchema = z.object({
  courseId: z.string().min(1),
});

interface AuthenticatedRequest extends FastifyRequest {
  user?: { id: string };
}

export function createExportCourseHandler(exportService: ExportService): RouteHandlerMethod {
  return async (request, reply) => {
    const parseResult = CourseParamsSchema.safeParse(request.params);
    if (!parseResult.success) {
      return reply.status(400).send({ error: "Invalid courseId" });
    }

    const { courseId } = parseResult.data;
    const result = await exportService.exportCourse(courseId);

    if (result.isErr()) {
      if (result.error.code === "NOT_FOUND") {
        return reply.status(404).send({ error: result.error.message });
      }
      return reply.status(400).send({ error: result.error.message });
    }

    return reply.status(200).send({
      success: true,
      data: result.value,
    });
  };
}

export function createExportAllCoursesHandler(exportService: ExportService): RouteHandlerMethod {
  return async (request: AuthenticatedRequest, reply) => {
    // Get userId from auth context (Supabase)
    const userId = request.user?.id;
    if (!userId) {
      return reply.status(401).send({ error: "Unauthorized" });
    }

    const result = await exportService.exportAllCourses(userId);

    if (result.isErr()) {
      return reply.status(400).send({ error: result.error.message });
    }

    return reply.status(200).send({
      success: true,
      data: result.value,
    });
  };
}

export function registerExportRoutes(
  app: FastifyInstance,
  exportService: ExportService,
  prefix = "/api",
): void {
  const exportCourseHandler = createExportCourseHandler(exportService);
  const exportAllCoursesHandler = createExportAllCoursesHandler(exportService);

  app.post(`${prefix}/export/course/:courseId`, exportCourseHandler);
  app.post(`${prefix}/export/all`, exportAllCoursesHandler);
}

export const exportCourseHandler = createExportCourseHandler;
export const exportAllCoursesHandler = createExportAllCoursesHandler;
