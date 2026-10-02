import type { IStructuredStore } from "@plks/shared/contracts";
import { DomainError } from "@plks/shared/errors";
import type { ConceptNodePayload, QuizItemPayload } from "@plks/shared/schemas";
import type { Course } from "@plks/shared/types/database";
// apps/api/src/routes/courses.ts
import type { FastifyInstance, RouteHandlerMethod } from "fastify";
import { type Result, err, ok } from "neverthrow";
import { z } from "zod";

const CreateCourseSchema = z.object({
  semesterCode: z.string().min(1),
  code: z.string().min(1),
  name: z.string().min(1),
  description: z.string().nullable().optional(),
  coverImageUri: z.string().url().or(z.literal("")).nullable().optional(),
  b2ExportDir: z.string().url().or(z.literal("")).nullable().optional(),
});

const CourseParamsSchema = z.object({
  id: z.string().uuid(),
});

function createGetCoursesHandler(structuredStore: IStructuredStore): RouteHandlerMethod {
  return async (_request, reply) => {
    try {
      const userId = process.env["PLKS_DEV_USER_ID"] ?? "00000000-0000-0000-0000-000000000000";
      const courses = await structuredStore.getCoursesByUser(userId);
      return reply.send(courses);
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
    try {
      const parseResult = CreateCourseSchema.safeParse(request.body);
      if (!parseResult.success) {
        return reply.status(400).send({
          error: "Invalid request body",
          details: parseResult.error.flatten().fieldErrors,
        });
      }

      const userId = process.env["PLKS_DEV_USER_ID"] ?? "00000000-0000-0000-0000-000000000000";
      const input = {
        ...parseResult.data,
        userId,
      };

      const course = await structuredStore.createCourse(input);
      return reply.status(201).send(course);
    } catch (err) {
      if (err instanceof DomainError) {
        return reply.status(400).send({ error: err.message });
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
          coverImageUri: z.string().url().or(z.literal("")).nullable().optional(),
          b2ExportDir: z.string().url().or(z.literal("")).nullable().optional(),
          status: z.enum(["active", "archived", "deleted"]).optional(),
        })
        .safeParse(request.body);

      if (!updateData.success) {
        return reply.status(400).send({
          error: "Invalid update data",
          details: updateData.error.flatten().fieldErrors,
        });
      }

      const course = await structuredStore.updateCourse(parseResult.data.id, updateData.data);
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
