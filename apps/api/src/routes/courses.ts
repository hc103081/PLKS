import type { IStructuredStore } from "@plks/shared/contracts";
import { DomainError } from "@plks/shared/errors";
import type { ConceptNodePayload, QuizItemPayload } from "@plks/shared/schemas";
import type { Course } from "@plks/shared/types/database";
// apps/api/src/routes/courses.ts
import type { FastifyInstance, RouteHandlerMethod } from "fastify";
import { type Result, err, ok } from "neverthrow";
import { z } from "zod";

const CreateCourseSchema = z.object({
  semester: z.string().min(1),
  code: z.string().min(1),
  name: z.string().min(1),
  credits: z.number().int().positive(),
  type: z.enum(["required", "elective", "general"]),
  instructor: z.string().optional(),
  location: z.string().optional(),
});

const CourseParamsSchema = z.object({
  id: z.string().uuid(),
});

function createGetCoursesHandler(structuredStore: IStructuredStore): RouteHandlerMethod {
  return async (_request, reply) => {
    try {
      const userId = process.env["PLKS_DEV_USER_ID"] ?? "00000000-0000-0000-0000-000000000000";
      const courses = await structuredStore.getCoursesByUser(userId);
      // Transform database Course to CourseCardData format expected by frontend
      const courseCardData = courses.map((course) => ({
        id: course.id,
        code: course.code,
        name: course.name,
        semester: course.semesters?.label ?? course.semester_code,
        credits: 3, // Default, not stored in DB yet
        required: true, // Default
        instructor: undefined,
        location: undefined,
        status: "idle" as const, // Default
        progress: 0, // Default
        totalChapters: 0, // Default
        completedChapters: 0, // Default
        lastReviewedAt: undefined,
        currentTopic: undefined,
        conceptGraphCount: 0, // Default
        audioCount: 0, // Default
        quizCount: 0, // Default
        latestSessionId: undefined,
        pipelineStage: undefined,
      }));
      return reply.send({
        courses: courseCardData,
        pipelineSummary: {
          inProgress: 0,
          pending: 0,
          needsAttention: 0,
          healthy: true,
          healthPercentage: 100,
        },
      });
    } catch (err) {
      if (err instanceof DomainError) {
        return reply.status(400).send({ error: err.message });
      }
      return reply.status(500).send({ error: "Internal server error" });
    }
  };
}

function createCreateCourseHandler(structuredStore: IStructuredStore): RouteHandlerMethod {
  return async (request, reply) => {
    // 先定義 input 以便在 catch block 中使用
    let input: {
      semester: string;
      code: string;
      name: string;
      credits: number;
      type: "required" | "elective" | "general";
      instructor?: string | undefined;
      location?: string | undefined;
    } = {
      semester: "",
      code: "",
      name: "",
      credits: 0,
      type: "required",
    };

    try {
      const parseResult = CreateCourseSchema.safeParse(request.body);
      if (!parseResult.success) {
        return reply.status(400).send({
          error: "Invalid request body",
          details: parseResult.error.flatten().fieldErrors,
        });
      }

      // 只傳遞課程相關欄位，不包含 userId (由 adapter 從 auth context 取得)
      input = {
        semester: parseResult.data.semester,
        code: parseResult.data.code,
        name: parseResult.data.name,
        credits: parseResult.data.credits,
        type: parseResult.data.type,
        instructor: parseResult.data.instructor,
        location: parseResult.data.location,
      };
      console.log("[courses.ts] createCourse input:", input);

      const userId = process.env["PLKS_DEV_USER_ID"] ?? "00000000-0000-0000-0000-000000000000";
      // 在 input 中加入 userId（ adapter 會使用 this.getUserId()，但這裡顯式傳遞以確保正確）
      const course = await structuredStore.createCourse({
        ...input,
        userId,
      });
      console.log("[courses.ts] createCourse success:", course);
      return reply.status(201).send(course);
    } catch (err) {
      console.error("[courses.ts] createCourse error:", err);
      if (err instanceof DomainError) {
        // 提取 DomainError 的 cause 並嘗試解析 JSON
        let details: unknown = err.cause;
        if (err.cause instanceof Error) {
          try {
            details = JSON.parse(err.cause.message);
          } catch {
            details = { message: err.cause.message };
          }
        }
        // 檢查是否為 duplicate key 錯誤 (PostgreSQL 23505 / PGRST205)
        if (details && typeof details === "object" && "code" in details) {
          const code = (details as Record<string, unknown>)["code"];
          if (
            code === "23505" ||
            code === "PGRST205" ||
            (typeof code === "string" && code.includes("duplicate"))
          ) {
            return reply.status(400).send({
              error: "Duplicate course code",
              details: {
                message: `Course with code '${input?.code}' already exists for this user`,
              },
            });
          }
        }
        return reply.status(400).send({ error: err.message, details });
      }
      // 檢查是否是 Supabase 獨約制錯誤
      if (err instanceof Error && err.message?.includes("duplicate key")) {
        return reply.status(400).send({
          error: "Duplicate course code",
          details: { message: err.message },
        });
      }
      return reply.status(500).send({ error: "Internal server error" });
    }
  };
}

function createGetCourseByIdHandler(structuredStore: IStructuredStore): RouteHandlerMethod {
  return async (request, reply) => {
    try {
      const parseResult = CourseParamsSchema.safeParse(request.params);
      if (!parseResult.success) {
        return reply.status(400).send({ error: "Invalid course ID" });
      }

      const course = await structuredStore.getCourseById(parseResult.data.id);
      if (course === null) {
        return reply.status(404).send({ error: "Course not found" });
      }
      return reply.send(course);
    } catch (err) {
      if (err instanceof DomainError) {
        return reply.status(400).send({ error: err.message });
      }
      return reply.status(500).send({ error: "Internal server error" });
    }
  };
}

function createUpdateCourseHandler(structuredStore: IStructuredStore): RouteHandlerMethod {
  return async (request, reply) => {
    try {
      const parseResult = CourseParamsSchema.safeParse(request.params);
      if (!parseResult.success) {
        return reply.status(400).send({ error: "Invalid course ID" });
      }

      const updateData = z
        .object({
          name: z.string().min(1).optional(),
          code: z.string().min(1).optional(),
          description: z.string().nullable().optional(),
          coverImageUri: z.string().url().optional(),
          b2ExportDir: z.string().url().optional(),
          status: z.enum(["active", "archived", "deleted"]).optional(),
        })
        .safeParse(request.body);

      if (!updateData.success) {
        return reply.status(400).send({
          error: "Invalid update data",
          details: updateData.error.flatten().fieldErrors,
        });
      }

      // Filter out undefined values for exactOptionalPropertyTypes compatibility
      const filteredData = Object.fromEntries(
        Object.entries(updateData.data).filter(([, v]) => v !== undefined),
      ) as Partial<Course>;

      const course = await structuredStore.updateCourse(parseResult.data.id, filteredData);
      return reply.send(course);
    } catch (err) {
      if (err instanceof DomainError) {
        return reply.status(400).send({ error: err.message });
      }
      return reply.status(500).send({ error: "Internal server error" });
    }
  };
}

function createDeleteCourseHandler(structuredStore: IStructuredStore): RouteHandlerMethod {
  return async (request, reply) => {
    try {
      const parseResult = CourseParamsSchema.safeParse(request.params);
      if (!parseResult.success) {
        return reply.status(400).send({ error: "Invalid course ID" });
      }

      await structuredStore.deleteCourse(parseResult.data.id);
      return reply.status(204).send();
    } catch (err) {
      if (err instanceof DomainError) {
        return reply.status(400).send({ error: err.message });
      }
      return reply.status(500).send({ error: "Internal server error" });
    }
  };
}

function createGetConceptNodesByCourseHandler(
  structuredStore: IStructuredStore,
): RouteHandlerMethod {
  return async (request, reply) => {
    try {
      const parseResult = CourseParamsSchema.safeParse(request.params);
      if (!parseResult.success) {
        return reply.status(400).send({ error: "Invalid course ID" });
      }

      const conceptNodes = await structuredStore.getConceptNodesByCourse(parseResult.data.id);
      return reply.send(conceptNodes);
    } catch (err) {
      if (err instanceof DomainError) {
        return reply.status(400).send({ error: err.message });
      }
      return reply.status(500).send({ error: "Internal server error" });
    }
  };
}

function createGetQuizItemsByCourseHandler(structuredStore: IStructuredStore): RouteHandlerMethod {
  return async (request, reply) => {
    try {
      const parseResult = CourseParamsSchema.safeParse(request.params);
      if (!parseResult.success) {
        return reply.status(400).send({ error: "Invalid course ID" });
      }

      const quizItems = await structuredStore.getQuizItemsByCourse(parseResult.data.id);
      return reply.send(quizItems);
    } catch (err) {
      if (err instanceof DomainError) {
        return reply.status(400).send({ error: err.message });
      }
      return reply.status(500).send({ error: "Internal server error" });
    }
  };
}

export function registerCoursesRoutes(
  app: FastifyInstance,
  structuredStore: IStructuredStore,
  prefix = "/api",
): void {
  const getCoursesHandler = createGetCoursesHandler(structuredStore);
  const createCourseHandler = createCreateCourseHandler(structuredStore);
  const getCourseByIdHandler = createGetCourseByIdHandler(structuredStore);
  const updateCourseHandler = createUpdateCourseHandler(structuredStore);
  const deleteCourseHandler = createDeleteCourseHandler(structuredStore);
  const getConceptNodesByCourseHandler = createGetConceptNodesByCourseHandler(structuredStore);
  const getQuizItemsByCourseHandler = createGetQuizItemsByCourseHandler(structuredStore);

  app.get(`${prefix}/courses`, getCoursesHandler);
  app.post(`${prefix}/courses`, createCourseHandler);
  app.get(`${prefix}/courses/:id`, getCourseByIdHandler);
  app.patch(`${prefix}/courses/:id`, updateCourseHandler);
  app.delete(`${prefix}/courses/:id`, deleteCourseHandler);
  app.get(`${prefix}/courses/:id/concepts`, getConceptNodesByCourseHandler);
  app.get(`${prefix}/courses/:id/quiz`, getQuizItemsByCourseHandler);
}

// Export handlers for testing
export const getCoursesHandler = createGetCoursesHandler;
export const createCourseHandler = createCreateCourseHandler;
export const getCourseByIdHandler = createGetCourseByIdHandler;
export const updateCourseHandler = createUpdateCourseHandler;
export const deleteCourseHandler = createDeleteCourseHandler;
export const getConceptNodesByCourseHandler = createGetConceptNodesByCourseHandler;
export const getQuizItemsByCourseHandler = createGetQuizItemsByCourseHandler;
