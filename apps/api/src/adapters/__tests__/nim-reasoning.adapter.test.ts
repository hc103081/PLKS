import { DomainError } from "@plks/shared/errors";
import { type Mock, beforeEach, describe, expect, it, vi } from "vitest";
import { NvidiaNimAdapter } from "../nim-reasoning.adapter";

// Mock fs/promises
vi.mock("node:fs/promises", () => ({
  readFile: vi.fn(),
}));

// Mock fetch
global.fetch = vi.fn();

import { readFile } from "node:fs/promises";

describe("NvidiaNimAdapter", () => {
  let adapter: NvidiaNimAdapter;
  let mockReadFile: Mock;
  let mockFetch: Mock;

  beforeEach(() => {
    vi.clearAllMocks();

    process.env.NVIDIA_API_KEY = "test-api-key";
    process.env.NVIDIA_BASE_URL = "https://api.test.nvidia.com/v1";
    process.env.NVIDIA_MODEL = "test-model";

    mockReadFile = vi.fn();
    (readFile as Mock).mockImplementation(mockReadFile);

    mockFetch = vi.fn();
    global.fetch = mockFetch;

    // Mock prompt files
    mockReadFile
      .mockResolvedValueOnce("Knowledge extraction prompt")
      .mockResolvedValueOnce("Sidekick help prompt");

    adapter = new NvidiaNimAdapter();
  });

  describe("multimodalInfer", () => {
    it("should load prompts on first call", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          choices: [{ message: { content: '{"conceptNodes":[],"quizItems":[]}' } }],
        }),
      });

      await adapter.multimodalInfer("knowledge", "test payload", []);

      expect(mockReadFile).toHaveBeenCalledTimes(2);
      expect(mockReadFile).toHaveBeenCalledWith(
        expect.stringContaining("knowledge-extraction.txt"),
        "utf-8",
      );
      expect(mockReadFile).toHaveBeenCalledWith(
        expect.stringContaining("sidekick-help.txt"),
        "utf-8",
      );
    });

    it("should use knowledge extraction prompt for non-sidekick systemPrompt", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          choices: [{ message: { content: '{"conceptNodes":[],"quizItems":[]}' } }],
        }),
      });

      await adapter.multimodalInfer("knowledge", "test payload", []);

      // Verify fetch was called with correct payload
      expect(mockFetch).toHaveBeenCalledWith(
        "https://api.test.nvidia.com/v1/chat/completions",
        expect.objectContaining({
          method: "POST",
          headers: expect.objectContaining({
            Authorization: "Bearer test-api-key",
            "Content-Type": "application/json",
          }),
        }),
      );

      const body = JSON.parse((mockFetch as Mock).mock.calls[0][1]?.body ?? "{}");
      expect(body.model).toBe("test-model");
      expect(body.temperature).toBe(0.1);
      expect(body.response_format).toEqual({ type: "json_object" });
      // content is an array: [{type: "text", text: "..."}, {type: "image_url", ...}]
      const textContent = body.messages[0].content[0].text;
      expect(textContent).toContain("Knowledge extraction prompt");
      expect(textContent).toContain("test payload");
    });

    it("should use sidekick prompt for sidekick systemPrompt", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          choices: [
            {
              message: {
                content:
                  '{"explanation":"test","keyConcept":"test","actionableHint":"test","encouragement":"test","relatedSlideUris":[]}',
              },
            },
          ],
        }),
      });

      await adapter.multimodalInfer("sidekick", "test payload", []);

      const body = JSON.parse((mockFetch as Mock).mock.calls[0][1]?.body ?? "{}");
      const textContent = body.messages[0].content[0].text;
      expect(textContent).toContain("Sidekick help prompt");
    });

    it("should include image URLs in multimodal content", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          choices: [{ message: { content: '{"conceptNodes":[],"quizItems":[]}' } }],
        }),
      });

      await adapter.multimodalInfer("knowledge", "test payload", [
        "https://example.com/image1.jpg",
        "https://example.com/image2.jpg",
      ]);

      const body = JSON.parse((mockFetch as Mock).mock.calls[0][1]?.body ?? "{}");
      expect(body.messages[0].content).toHaveLength(3); // text + 2 images
      expect(body.messages[0].content[0]).toEqual({ type: "text", text: expect.any(String) });
      expect(body.messages[0].content[1]).toEqual({
        type: "image_url",
        image_url: { url: "https://example.com/image1.jpg" },
      });
      expect(body.messages[0].content[2]).toEqual({
        type: "image_url",
        image_url: { url: "https://example.com/image2.jpg" },
      });
    });

    it("should return parsed JSON on success", async () => {
      const expectedResponse = {
        conceptNodes: [{ conceptId: "123", term: "Test" }],
        quizItems: [],
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          choices: [{ message: { content: JSON.stringify(expectedResponse) } }],
        }),
      });

      const result = await adapter.multimodalInfer("knowledge", "test payload", []);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toEqual(expectedResponse);
      }
    });

    it("should return error on HTTP error", async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        text: async () => "Internal Server Error",
      });

      const result = await adapter.multimodalInfer("knowledge", "test payload", []);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.code).toBe("AI_INFERENCE_FAILED");
      }
    });

    it("should return error on empty response", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          choices: [{ message: { content: null } }],
        }),
      });

      const result = await adapter.multimodalInfer("knowledge", "test payload", []);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.code).toBe("AI_INFERENCE_FAILED");
      }
    });

    it("should return error on invalid JSON", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          choices: [{ message: { content: "not valid json" } }],
        }),
      });

      const result = await adapter.multimodalInfer("knowledge", "test payload", []);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.code).toBe("AI_INFERENCE_FAILED");
      }
    });

    it("should retry on failure and succeed on second attempt", async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
          text: async () => "Server Error",
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            choices: [{ message: { content: '{"conceptNodes":[],"quizItems":[]}' } }],
          }),
        });

      const result = await adapter.multimodalInfer("knowledge", "test payload", []);

      expect(result.isOk()).toBe(true);
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it("should return error after max retries exhausted", async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        text: async () => "Server Error",
      });

      const result = await adapter.multimodalInfer("knowledge", "test payload", []);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.code).toBe("AI_INFERENCE_FAILED");
      }
      expect(mockFetch).toHaveBeenCalledTimes(3); // maxRetries = 3
    });
  });
});
