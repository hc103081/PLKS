import { Readable } from "node:stream";
import type { IKnowledgeGraphWriter } from "@plks/shared/contracts";
import type { IStorageAdapter } from "@plks/shared/contracts";
import { DomainError } from "@plks/shared/errors";
import type { ConceptNodePayload } from "@plks/shared/schemas";
import type { QuizItemPayload } from "@plks/shared/schemas";
import { type Result, err, ok } from "neverthrow";
import { injectable } from "tsyringe";

@injectable()
export class ObsidianMarkdownWriter implements IKnowledgeGraphWriter {
  constructor(private readonly storage: IStorageAdapter) {}

  async writeNode(node: ConceptNodePayload): Promise<Result<boolean, DomainError>> {
    try {
      // Copy referenced slide asset to _assets/ directory
      const assetCopyResult = await this.copyAssetToAssetsDir(
        node.courseId,
        node.sourceEvidence.slideUri,
      );
      if (assetCopyResult.isErr()) {
        return err(DomainError.markdownWriteFailed(assetCopyResult.error));
      }
      const relativeAssetPath = assetCopyResult.value;

      const markdown = this.generateNodeMarkdown(node, relativeAssetPath);
      const path = this.getNodePath(node.courseId, node.conceptId);

      const stream = this.stringToStream(markdown);
      const result = await this.storage.uploadFile(path, stream);

      if (result.isErr()) {
        return err(DomainError.markdownWriteFailed(result.error));
      }

      return ok(true);
    } catch (cause) {
      return err(DomainError.markdownWriteFailed(cause));
    }
  }

  /**
   * Write quiz items to _quiz/{courseId}.json
   */
  async writeQuiz(
    courseId: string,
    quizItems: QuizItemPayload[],
  ): Promise<Result<boolean, DomainError>> {
    try {
      const path = this.getQuizPath(courseId);
      const json = JSON.stringify(quizItems, null, 2);
      const stream = this.stringToStream(json);

      const result = await this.storage.uploadFile(path, stream);

      if (result.isErr()) {
        return err(DomainError.markdownWriteFailed(result.error));
      }

      return ok(true);
    } catch (cause) {
      return err(DomainError.markdownWriteFailed(cause));
    }
  }

  async writeIndex(
    courseId: string,
    nodes: ConceptNodePayload[],
  ): Promise<Result<boolean, DomainError>> {
    try {
      const markdown = this.generateIndexMarkdown(courseId, nodes);
      const path = this.getIndexPath(courseId);

      const stream = this.stringToStream(markdown);
      const result = await this.storage.uploadFile(path, stream);

      if (result.isErr()) {
        return err(DomainError.markdownWriteFailed(result.error));
      }

      return ok(true);
    } catch (cause) {
      return err(DomainError.markdownWriteFailed(cause));
    }
  }

  /**
   * Generate markdown for a single concept node
   * Frontmatter + content with bidirectional links
   */
  private generateNodeMarkdown(node: ConceptNodePayload, relativeAssetPath: string): string {
    const frontmatter = this.generateFrontmatter(node);
    const content = this.generateNodeContent(node, relativeAssetPath);

    return `---\n${frontmatter}---\n\n${content}`;
  }

  /**
   * Generate YAML frontmatter for concept node
   */
  private generateFrontmatter(node: ConceptNodePayload): string {
    const tags = [node.courseId.toLowerCase(), "concept-node"];
    const relatedTermsYaml =
      node.relatedTerms.length > 0
        ? node.relatedTerms.map((t) => `  - ${this.escapeYamlString(t)}`).join("\n")
        : '  - ""';

    return [
      `conceptId: "${node.conceptId}"`,
      `courseId: "${node.courseId}"`,
      `term: "${this.escapeYamlString(node.term)}"`,
      "tags:",
      `  - ${tags[0]}`,
      `  - ${tags[1]}`,
      "relatedTerms:",
      relatedTermsYaml,
      "sourceEvidence:",
      `  transcriptRef: "${node.sourceEvidence.transcriptRef}"`,
      `  slideUri: "${node.sourceEvidence.slideUri}"`,
    ].join("\n");
  }

  /**
   * Generate node content with bidirectional links
   */
  private generateNodeContent(node: ConceptNodePayload, relativeAssetPath: string): string {
    const sections = [`# ${node.term}`, "", "## 解釋", node.explanation, ""];

    if (node.relatedTerms.length > 0) {
      sections.push("## 相關概念");
      sections.push("");
      for (const term of node.relatedTerms) {
        sections.push(`- [[${term}]]`);
      }
      sections.push("");
    }

    sections.push("## 來源證據");
    sections.push("");
    sections.push(`- **逐字稿**: ${node.sourceEvidence.transcriptRef}`);
    sections.push(`- **投影片**: ![[${relativeAssetPath}]]`);
    sections.push("");

    return sections.join("\n");
  }

  /**
   * Generate MOC (Map of Content) index for a course
   */
  private generateIndexMarkdown(courseId: string, nodes: ConceptNodePayload[]): string {
    const frontmatter = [
      `courseId: "${courseId}"`,
      `type: "course-index"`,
      `generatedAt: "${new Date().toISOString()}"`,
      `nodeCount: ${nodes.length}`,
    ].join("\n");

    const sections = [`# ${courseId} 課程主控台 (MOC)`, "", "## 概念節點索引", ""];

    // Group by first letter for better organization
    const grouped = this.groupNodesByFirstLetter(nodes);

    for (const [letter, letterNodes] of Object.entries(grouped)) {
      sections.push(`### ${letter.toUpperCase()}`);
      sections.push("");
      for (const node of letterNodes) {
        sections.push(`- [[${node.term}]] (${node.sourceEvidence.transcriptRef})`);
      }
      sections.push("");
    }

    // Add quiz reference section
    sections.push("## 測驗題庫");
    sections.push("");
    sections.push(`測驗題目位於: \`_quiz/${courseId}.json\``);
    sections.push("");

    return `---\n${frontmatter}---\n\n${sections.join("\n")}`;
  }

  /**
   * Group nodes by first letter of term for alphabetical index
   */
  private groupNodesByFirstLetter(
    nodes: ConceptNodePayload[],
  ): Record<string, ConceptNodePayload[]> {
    const grouped: Record<string, ConceptNodePayload[]> = {};

    for (const node of nodes) {
      const firstChar = node.term.charAt(0).toUpperCase();
      const key = /^[A-Z]$/.test(firstChar) ? firstChar : "#";
      if (!grouped[key]) {
        grouped[key] = [];
      }
      grouped[key].push(node);
    }

    // Sort each group
    for (const key of Object.keys(grouped)) {
      grouped[key]?.sort((a, b) => a.term.localeCompare(b.term));
    }

    return grouped;
  }

  /**
   * Get node file path: vault/{courseId}/concepts/{conceptId}.md
   */
  private getNodePath(courseId: string, conceptId: string): string {
    return `vault/${courseId}/concepts/${conceptId}.md`;
  }

  /**
   * Get index file path: vault/{courseId}/index.md
   */
  private getIndexPath(courseId: string): string {
    return `vault/${courseId}/index.md`;
  }

  /**
   * Extract filename from B2 URI for asset reference
   */
  private getAssetFilename(uri: string): string {
    // Convert s3://bucket/path/to/image.png to just the filename (image.png)
    const prefix = "s3://";
    if (uri.startsWith(prefix)) {
      const withoutPrefix = uri.slice(prefix.length);
      const bucketEnd = withoutPrefix.indexOf("/");
      if (bucketEnd > 0) {
        const pathAfterBucket = withoutPrefix.slice(bucketEnd + 1);
        // Extract just the filename (last segment)
        return pathAfterBucket.split("/").pop() ?? "asset.png";
      }
    }
    // Fallback: extract last path segment
    return uri.split("/").pop() ?? "asset.png";
  }

  /**
   * Copy asset from source URI to _assets/ directory in the course vault
   * Returns the relative path for markdown reference (e.g., "_assets/slide-5.png")
   */
  private async copyAssetToAssetsDir(
    courseId: string,
    sourceUri: string,
  ): Promise<Result<string, DomainError>> {
    try {
      const filename = this.getAssetFilename(sourceUri);
      const targetPath = `vault/${courseId}/_assets/${filename}`;

      // Download from source
      const downloadResult = await this.storage.downloadFile(sourceUri);
      if (downloadResult.isErr()) {
        return err(downloadResult.error);
      }

      // Upload to _assets/ directory
      const uploadResult = await this.storage.uploadFile(targetPath, downloadResult.value);
      if (uploadResult.isErr()) {
        return err(uploadResult.error);
      }

      return ok(`_assets/${filename}`);
    } catch (cause) {
      return err(DomainError.markdownWriteFailed(cause));
    }
  }

  /**
   * Get quiz file path: vault/{courseId}/_quiz/{courseId}.json
   */
  private getQuizPath(courseId: string): string {
    return `vault/${courseId}/_quiz/${courseId}.json`;
  }

  /**
   * Escape string for YAML
   */
  private escapeYamlString(str: string): string {
    return str
      .replace(/\\/g, "\\\\")
      .replace(/"/g, '\\"')
      .replace(/\n/g, "\\n")
      .replace(/\r/g, "\\r");
  }

  /**
   * Convert string to Readable stream (ESM compatible)
   */
  private stringToStream(str: string): Readable {
    const stream = new Readable();
    stream._read = () => {}; // no-op
    stream.push(str);
    stream.push(null);
    return stream;
  }
}
