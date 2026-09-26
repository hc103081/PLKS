// apps/api/src/core/entities/concept-node.ts
import type { ConceptNodePayload } from '@plks/shared/schemas';

export class ConceptNode {
  constructor(
    public readonly conceptId: string,
    public readonly courseId: string,
    public readonly term: string,
    public readonly explanation: string,
    public readonly relatedTerms: readonly string[],
    public readonly sourceEvidence: {
      transcriptRef: string;
      slideUri: string;
    }
  ) {}

  static fromPayload(payload: ConceptNodePayload): ConceptNode {
    return new ConceptNode(
      payload.conceptId,
      payload.courseId,
      payload.term,
      payload.explanation,
      [...payload.relatedTerms],
      { ...payload.sourceEvidence }
    );
  }

  toPayload(): ConceptNodePayload {
    return {
      conceptId: this.conceptId,
      courseId: this.courseId,
      term: this.term,
      explanation: this.explanation,
      relatedTerms: [...this.relatedTerms],
      sourceEvidence: { ...this.sourceEvidence },
    };
  }

  toMarkdown(): string {
    const frontmatter = `---
conceptId: ${this.conceptId}
courseId: ${this.courseId}
term: ${this.term}
tags: [${this.relatedTerms.map((t) => `"${t}"`).join(', ')}]
sourceEvidence:
  transcriptRef: ${this.sourceEvidence.transcriptRef}
  slideUri: ${this.sourceEvidence.slideUri}
---`;

    const links = this.relatedTerms.map((t) => `[[${t}]]`).join(', ');

    return `${frontmatter}

# ${this.term}

${this.explanation}

**相關概念**: ${links || '無'}

**來源**: 逐字稿 ${this.sourceEvidence.transcriptRef} | 投影片 ${this.sourceEvidence.slideUri}
`;
  }
}