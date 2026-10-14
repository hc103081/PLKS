import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { IAIReasoningGateway } from "@plks/shared/contracts";
import { DomainError } from "@plks/shared/errors";
import { type Result, err, ok } from "neverthrow";
import { injectable } from "tsyringe";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

interface NvidiaNimResponse {
  choices?: Array<{
    message?: {
      content?: string;
    };
    delta?: {
      content?: string;
    };
  }>;
  error?: {
    message: string;
    code?: string;
  };
}

@injectable()
export class NvidiaNimAdapter implements IAIReasoningGateway {
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly model: string;
  private readonly maxRetries = 3;
  private readonly baseDelayMs = 1000;
  private readonly promptsDir: string;
  private readonly promptCache: Map<string, string> = new Map();

  constructor() {
    this.apiKey = process.env["NVIDIA_API_KEY"] ?? "";
    this.baseUrl = process.env["NVIDIA_BASE_URL"] ?? "https://integrate.api.nvidia.com/v1";
    this.model = process.env["NVIDIA_MODEL"] ?? "nvidia/nemotron-3-ultra";
    this.promptsDir = join(__dirname, "config", "prompts");

    if (!this.apiKey) {
      throw new Error("NVIDIA_API_KEY not configured");
    }
  }

  async multimodalInfer(
    systemPrompt: string,
    textPayload: string,
    imageUrls: string[],
  ): Promise<Result<unknown, DomainError>> {
    // Load the prompt for the given systemPrompt key if not cached
    let prompt = this.promptCache.get(systemPrompt);
    if (prompt === undefined) {
      try {
        prompt = await readFile(join(this.promptsDir, `${systemPrompt}.txt`), "utf-8");
        this.promptCache.set(systemPrompt, prompt);
      } catch (cause) {
        throw new Error(
          `Failed to load prompt file for key "${systemPrompt}": ${cause instanceof Error ? cause.message : String(cause)}`,
        );
      }
    }

    // Build the complete prompt with JSON schema instruction (already in the prompt file)
    const fullPrompt = this.buildPrompt(prompt, textPayload, imageUrls);

    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        const response = await this.callNim(fullPrompt, imageUrls);

        if (response.error) {
          throw new Error(
            `NIM API error: ${response.error.message} (${response.error.code ?? "unknown"})`,
          );
        }

        const content = response.choices?.[0]?.message?.content;
        if (!content) {
          throw new Error("Empty response from NIM");
        }

        // Parse and validate JSON
        let parsed: unknown;
        try {
          parsed = JSON.parse(content);
        } catch {
          throw new Error("Failed to parse JSON from NIM response");
        }

        return ok(parsed);
      } catch (cause) {
        lastError = cause instanceof Error ? cause : new Error(String(cause));

        if (attempt < this.maxRetries) {
          const delay = this.baseDelayMs * 2 ** (attempt - 1);
          await this.sleep(delay);
        }
      }
    }

    return err(DomainError.aiInferenceFailed(lastError));
  }

  async *multimodalInferStream(
    systemPrompt: string,
    textPayload: string,
    imageUrls: string[],
  ): AsyncIterable<{ content?: string }> {
    // Load the prompt for the given systemPrompt key if not cached
    let prompt = this.promptCache.get(systemPrompt);
    if (prompt === undefined) {
      try {
        prompt = await readFile(join(this.promptsDir, `${systemPrompt}.txt`), "utf-8");
        this.promptCache.set(systemPrompt, prompt);
      } catch (cause) {
        throw new Error(
          `Failed to load prompt file for key "${systemPrompt}": ${cause instanceof Error ? cause.message : String(cause)}`,
        );
      }
    }

    // Build the complete prompt
    const fullPrompt = this.buildPrompt(prompt, textPayload, imageUrls);

    // Build single user message with multimodal content
    const messages = [
      {
        role: "user" as const,
        content: this.buildMultimodalContent(fullPrompt, imageUrls),
      },
    ];

    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
        Accept: "text/event-stream",
      },
      body: JSON.stringify({
        model: this.model,
        messages,
        temperature: 0.7, // Higher temperature for more natural conversational output
        max_tokens: 2048,
        stream: true,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`NIM API error: ${response.status} ${errorText}`);
    }

    const reader = response.body?.getReader();
    const decoder = new TextDecoder();

    if (!reader) return;

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split("\n");

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6).trim();
            if (data === "[DONE]") return;
            try {
              const parsed = JSON.parse(data) as NvidiaNimResponse;
              const content = parsed.choices?.[0]?.delta?.content;
              if (content) {
                yield { content };
              }
            } catch {
              // Ignore parsing errors for malformed lines
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }

  /**
   * Build the complete prompt for NIM
   * The prompt parameter is the loaded prompt file content (which includes JSON schema instruction)
   */
  private buildPrompt(prompt: string, textPayload: string, imageUrls: string[]): string {
    // Build user message with text payload and image references
    const imageRefs = imageUrls.map((url, idx) => `[Image ${idx + 1}: ${url}]`).join("\n");

    return `${prompt}\n\n---\n\n輸入資料：\n${textPayload}\n\n${imageRefs ? `參考圖片：\n${imageRefs}` : ""}`;
  }

  /**
   * Call NVIDIA NIM API with multimodal input (non-streaming)
   */
  private async callNim(prompt: string, imageUrls: string[]): Promise<NvidiaNimResponse> {
    // Build single user message with multimodal content (text + images)
    const messages = [
      {
        role: "user" as const,
        content: this.buildMultimodalContent(prompt, imageUrls),
      },
    ];

    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        messages,
        temperature: 0.1, // Low temperature for consistent structured output
        max_tokens: 4096,
        response_format: { type: "json_object" },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    return response.json() as Promise<NvidiaNimResponse>;
  }

  /**
   * Build multimodal content array for NIM (interleaved text + image URLs)
   */
  private buildMultimodalContent(
    text: string,
    imageUrls: string[],
  ): Array<{ type: string; text?: string; image_url?: { url: string } }> {
    const content: Array<{ type: string; text?: string; image_url?: { url: string } }> = [
      { type: "text", text },
    ];

    for (const url of imageUrls) {
      content.push({ type: "image_url", image_url: { url } });
    }

    return content;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
