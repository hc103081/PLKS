import type { ConceptNodePayload, QuizItemPayload, RawAssetPayload } from "@plks/shared/schemas";
// apps/api/src/core/entities/__tests__/entities.test.ts
import { describe, expect, it } from "vitest";
import { ConceptNode } from "../concept-node.js";
import { Course } from "../course.js";
import { QuizItem } from "../quiz-item.js";
import { RawAsset } from "../raw-asset.js";
import { Session } from "../session.js";

describe("Domain Entities", () => {
  it("ConceptNode round-trips through payload", () => {
    const payload: ConceptNodePayload = {
      conceptId: "123e4567-e89b-12d3-a456-426614174000",
      courseId: "CS101",
      term: "Test",
      explanation: "Desc",
      relatedTerms: ["A", "B"],
      sourceEvidence: {
        transcriptRef: "00:00:00",
        slideUri: "s3://bucket/x.png",
      },
    };
    const entity = ConceptNode.fromPayload(payload);
    expect(entity.toPayload()).toEqual(payload);
  });

  it("ConceptNode generates markdown with wikilinks", () => {
    const entity = ConceptNode.fromPayload({
      conceptId: "1",
      courseId: "CS101",
      term: "Term",
      explanation: "Expl",
      relatedTerms: ["Related1", "Related2"],
      sourceEvidence: {
        transcriptRef: "00:00:00",
        slideUri: "s3://bucket/x.png",
      },
    });
    const md = entity.toMarkdown();
    expect(md).toContain("[[Related1]]");
    expect(md).toContain("[[Related2]]");
    expect(md).toContain("conceptId: 1");
  });

  it("QuizItem checks answer correctly", () => {
    const item = QuizItem.fromPayload({
      quizId: "1",
      courseId: "CS101",
      type: "multiple_choice",
      question: "Q?",
      options: ["A", "B"],
      correctAnswer: "B",
      contextReference: "ref-1",
    });
    expect(item.checkAnswer("B")).toBe(true);
    expect(item.checkAnswer("b")).toBe(true);
    expect(item.checkAnswer("A")).toBe(false);
  });

  it("RawAsset provides transcript helpers", () => {
    const asset = RawAsset.fromPayload({
      sessionId: "1",
      courseId: "CS101",
      transcripts: [
        { start_time: "00:00:00", end_time: "00:01:00", text: "First" },
        { start_time: "00:01:00", end_time: "00:02:00", text: "Second" },
      ],
      visualAssets: [],
    });
    expect(asset.getFullTranscript()).toBe("First Second");
    expect(asset.getTranscriptByTimeRange("00:00:00", "00:01:00")).toBe("First");
  });

  it("Session transitions through states", () => {
    const s = Session.create("sess-1", "CS101");
    expect(s.status).toBe("pending");
    expect(s.startProcessing().status).toBe("processing");
    expect(s.complete().status).toBe("completed");
    expect(s.fail("error").status).toBe("failed");
  });

  it("Course creates and updates", () => {
    const c = Course.create("CS101", "Title", "Desc");
    expect(c.title).toBe("Title");
    expect(c.update("New", "NewDesc").title).toBe("New");
  });
});
