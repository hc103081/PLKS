// packages/shared/src/schemas/__tests__/schemas.test.ts
import { describe, expect, it } from "vitest";
import {
  AiExtractionResultSchema,
  ConceptNodePayloadSchema,
  QuizItemPayloadSchema,
  RawAssetPayloadSchema,
  UserConfigPayloadSchema,
} from "../index.js";

describe("Shared Schemas", () => {
  it("validates RawAssetPayload", () => {
    const valid = {
      sessionId: "123e4567-e89b-12d3-a456-426614174000",
      courseId: "CS101",
      transcripts: [{ start_time: "00:00:00", end_time: "00:01:00", text: "Hello" }],
      visualAssets: [{ page_num: 1, b2_uri: "s3://bucket/slide1.png" }],
    };
    expect(RawAssetPayloadSchema.parse(valid)).toEqual(valid);
  });

  it("rejects invalid RawAssetPayload", () => {
    const invalid = {
      sessionId: "not-uuid",
      courseId: "",
      transcripts: [],
      visualAssets: [],
    };
    expect(() => RawAssetPayloadSchema.parse(invalid)).toThrow();
  });

  it("validates ConceptNodePayload", () => {
    const valid = {
      conceptId: "123e4567-e89b-12d3-a456-426614174000",
      courseId: "CS101",
      term: "Marginal Cost",
      explanation: "Cost of producing one more unit",
      relatedTerms: ["Supply", "Demand"],
      sourceEvidence: {
        transcriptRef: "00:15:30",
        slideUri: "s3://bucket/slide5.png",
      },
    };
    expect(ConceptNodePayloadSchema.parse(valid)).toEqual(valid);
  });

  it("validates QuizItemPayload", () => {
    const valid = {
      quizId: "123e4567-e89b-12d3-a456-426614174000",
      courseId: "CS101",
      type: "multiple_choice" as const,
      question: "What is marginal cost?",
      options: ["A", "B", "C"],
      correctAnswer: "B",
      contextReference: "123e4567-e89b-12d3-a456-426614174000",
    };
    expect(QuizItemPayloadSchema.parse(valid)).toEqual(valid);
  });

  it("validates UserConfigPayload", () => {
    const valid = {
      sessionId: "123e4567-e89b-12d3-a456-426614174000",
      fusionLevel: "strict_alignment" as const,
      outputTemplates: ["knowledge_nodes", "flashcard_quiz"] as const,
      b2TargetDir: "s3://pkm-omni-vault/vault/CS101/",
    };
    expect(UserConfigPayloadSchema.parse(valid)).toEqual(valid);
  });

  it("validates AiExtractionResult with conceptNodes and quizItems", () => {
    const valid = {
      conceptNodes: [
        {
          conceptId: "123e4567-e89b-12d3-a456-426614174000",
          courseId: "CS101",
          term: "Marginal Cost",
          explanation: "Cost of producing one more unit",
          relatedTerms: ["Supply", "Demand"],
          sourceEvidence: {
            transcriptRef: "00:15:30",
            slideUri: "s3://bucket/slide5.png",
          },
        },
      ],
      quizItems: [
        {
          quizId: "123e4567-e89b-12d3-a456-426614174001",
          courseId: "CS101",
          type: "multiple_choice" as const,
          question: "What is marginal cost?",
          options: ["A", "B", "C"],
          correctAnswer: "B",
          contextReference: "123e4567-e89b-12d3-a456-426614174000",
        },
      ],
    };
    expect(AiExtractionResultSchema.parse(valid)).toEqual(valid);
  });

  it("validates AiExtractionResult with empty arrays", () => {
    const valid = {
      conceptNodes: [],
      quizItems: [],
    };
    expect(AiExtractionResultSchema.parse(valid)).toEqual(valid);
  });

  it("rejects AiExtractionResult with invalid conceptNode", () => {
    const invalid = {
      conceptNodes: [
        {
          conceptId: "not-uuid",
          courseId: "",
          term: "",
          explanation: "",
          relatedTerms: [],
          sourceEvidence: {
            transcriptRef: "invalid",
            slideUri: "not-uri",
          },
        },
      ],
      quizItems: [],
    };
    expect(() => AiExtractionResultSchema.parse(invalid)).toThrow();
  });
});
