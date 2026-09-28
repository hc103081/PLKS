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

  private knowledgeExtractionPrompt: string | null = null;
  private sidekickHelpPrompt: string | null = null;

  constructor() {
    this.apiKey = process.env["NVIDIA_API_KEY"] ?? "";
    this.baseUrl = process.env["NVIDIA_BASE_URL"] ?? "https://integrate.api.nvidia.com/v1";
    this.model = process.env["NVIDIA_MODEL"] ?? "nvidia/nemotron-3-ultra";

    if (!this.apiKey) {
      throw new Error("NVIDIA_API_KEY not configured");
    }
  }

  async multimodalInfer(
    systemPrompt: string,
    textPayload: string,
    imageUrls: string[],
  ): Promise<Result<unknown, DomainError>> {
    // Load system prompts if not cached
    await this.ensurePromptsLoaded();

    // Build the complete prompt with JSON schema instruction
    const fullPrompt = this.buildPrompt(systemPrompt, textPayload, imageUrls);

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

  /**
   * Load system prompts from config files
   */
  private async ensurePromptsLoaded(): Promise<void> {
    if (this.knowledgeExtractionPrompt && this.sidekickHelpPrompt) {
      return;
    }

    const promptsDir = join(__dirname, "config", "prompts");

    try {
      this.knowledgeExtractionPrompt ??= await readFile(
        join(promptsDir, "knowledge-extraction.txt"),
        "utf-8",
      );
      this.sidekickHelpPrompt ??= await readFile(join(promptsDir, "sidekick-help.txt"), "utf-8");
    } catch (cause) {
      throw new Error(
        `Failed to load system prompts: ${cause instanceof Error ? cause.message : String(cause)}`,
      );
    }
  }

  /**
   * Build the complete prompt for NIM
   * The systemPrompt parameter determines which base prompt to use
   */
  private buildPrompt(systemPrompt: string, textPayload: string, imageUrls: string[]): string {
    // Determine which base prompt to use based on the systemPrompt identifier
    const basePrompt =
      systemPrompt === "sidekick" ? this.sidekickHelpPrompt : this.knowledgeExtractionPrompt;

    if (!basePrompt) {
      throw new Error("System prompt not loaded");
    }

    // Append JSON schema instruction (already embedded in prompt files)
    // Build user message with text payload and image references
    const imageRefs = imageUrls.map((url, idx) => `[Image ${idx + 1}: ${url}]`).join("\n");

    return `${basePrompt}\n\n---\n\n輸入資料：\n${textPayload}\n\n${imageRefs ? `參考圖片：\n${imageRefs}` : ""}`;
  }

  /**
   * Call NVIDIA NIM API with multimodal input
   */
  private async callNim(prompt: string, imageUrls: string[]): Promise<NvidiaNimResponse> {
    // Build messages array for chat completion format
    // Include system message for JSON mode enforcement
    const messages = [
      {
        role: "system" as const,
        content:
          "You are a helpful assistant that ONLY outputs valid JSON. Do not include any explanation, markdown, or extra text. Output raw JSON only.",
      },
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
        // response_format: { type: "json_object" }, // Not all models support this
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
