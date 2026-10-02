// supabase/functions/export-to-b2/index.ts
// Edge Function: Export concept nodes and quiz items to B2 as Obsidian-compatible Markdown/JSON

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { PutObjectCommand, S3Client } from "https://esm.sh/@aws-sdk/client-s3@3.470.0";
import { getSignedUrl } from "https://esm.sh/@aws-sdk/s3-request-presigner@3.470.0";
import { type SupabaseClient, createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

// ============================================================
// Configuration & Types
// ============================================================

interface ExportRequest {
  course_id: string;
}

interface ConceptNode {
  id: string;
  course_id: string;
  concept_id: string;
  term: string;
  explanation: string;
  related_terms: string[];
  source_transcript_ref: string | null;
  source_slide_uri: string | null;
}

interface QuizItem {
  id: string;
  course_id: string;
  quiz_id: string;
  type: "multiple_choice" | "true_false" | "short_answer";
  question: string;
  options: string[];
  correct_answer: string;
  explanation: string | null;
  context_reference: string;
}

interface Course {
  id: string;
  user_id: string;
  name: string;
  b2_export_dir: string | null;
}

interface ExportResult {
  conceptNodesExported: number;
  quizItemsExported: number;
  courseIndexExported: boolean;
  errors: string[];
}

// ============================================================
// Environment Variables
// ============================================================

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
if (!SUPABASE_URL) throw new Error("SUPABASE_URL is required");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
if (!SUPABASE_SERVICE_ROLE_KEY) throw new Error("SUPABASE_SERVICE_ROLE_KEY is required");
const B2_ENDPOINT = Deno.env.get("B2_ENDPOINT");
if (!B2_ENDPOINT) throw new Error("B2_ENDPOINT is required");
const B2_REGION = Deno.env.get("B2_REGION");
if (!B2_REGION) throw new Error("B2_REGION is required");
const B2_BUCKET_NAME = Deno.env.get("B2_BUCKET_NAME");
if (!B2_BUCKET_NAME) throw new Error("B2_BUCKET_NAME is required");
const B2_APPLICATION_KEY_ID = Deno.env.get("B2_APPLICATION_KEY_ID");
if (!B2_APPLICATION_KEY_ID) throw new Error("B2_APPLICATION_KEY_ID is required");
const B2_APPLICATION_KEY = Deno.env.get("B2_APPLICATION_KEY");
if (!B2_APPLICATION_KEY) throw new Error("B2_APPLICATION_KEY is required");

// ============================================================
// B2 S3 Client Setup
// ============================================================

const s3Client = new S3Client({
  region: B2_REGION,
  endpoint: B2_ENDPOINT,
  credentials: {
    accessKeyId: B2_APPLICATION_KEY_ID,
    secretAccessKey: B2_APPLICATION_KEY,
  },
});

// ============================================================
// Knowledge Graph Writer (Markdown/JSON Generation)
// ============================================================

function generateFrontmatter(node: ConceptNode): string {
  const tags = ["concept", `course:${node.course_id}`];

  return `---
conceptId: "${node.concept_id}"
courseId: "${node.course_id}"
term: "${node.term}"
tags: [${tags.map((t) => `"${t}"`).join(", ")}]
sourceEvidence:
  transcriptRef: "${node.source_transcript_ref || ""}"
  slideUri: "${node.source_slide_uri || ""}"
relatedTerms: [${node.related_terms.map((t) => `"${t}"`).join(", ")}]
---
`;
}

function writeConceptNodeMarkdown(node: ConceptNode): string {
  const frontmatter = generateFrontmatter(node);
  const relatedLinks = node.related_terms.map((t) => `[[${t}]]`).join("、");

  let markdown = frontmatter;
  markdown += `# ${node.term}\n\n`;
  markdown += `${node.explanation}\n\n`;

  if (node.related_terms.length > 0) {
    markdown += `## 相關概念\n${relatedLinks}\n\n`;
  }

  if (node.source_transcript_ref) {
    markdown += `> 來源逐字稿: ${node.source_transcript_ref}\n\n`;
  }

  if (node.source_slide_uri) {
    markdown += `> 來源投影片: ${node.source_slide_uri}\n\n`;
  }

  markdown += `---\n*導出時間: ${new Date().toISOString()}*\n`;

  return markdown;
}

function writeCourseIndexMarkdown(
  courseId: string,
  courseName: string,
  nodes: ConceptNode[],
): string {
  const courseTag = `course:${courseId}`;
  let markdown = `---
courseId: "${courseId}"
courseName: "${courseName}"
type: "course-index"
tags: ["course-index", "${courseTag}"]
exportedAt: "${new Date().toISOString()}"
---\n\n`;

  markdown += `# ${courseName} - 課程主控台 (MOC)\n\n`;
  markdown += `> 自動生成於 ${new Date().toLocaleString("zh-TW")}\n\n`;

  // Group by first letter for index
  const grouped = new Map<string, ConceptNode[]>();
  for (const node of nodes) {
    const firstChar = node.term.charAt(0).toUpperCase();
    if (!grouped.has(firstChar)) grouped.set(firstChar, []);
    grouped.get(firstChar)?.push(node);
  }

  for (const [letter, letterNodes] of Array.from(grouped.entries()).sort()) {
    markdown += `## ${letter}\n\n`;
    for (const node of letterNodes.sort((a, b) => a.term.localeCompare(b.term))) {
      markdown += `- [[${node.term}]]\n`;
    }
    markdown += "\n";
  }

  markdown += `---\n*包含 ${nodes.length} 個概念節點*\n`;

  return markdown;
}

function writeQuizJson(items: QuizItem[]): string {
  const exportData = {
    exportedAt: new Date().toISOString(),
    version: "1.0",
    items: items.map((item) => ({
      quizId: item.quiz_id,
      type: item.type,
      question: item.question,
      options: item.options,
      correctAnswer: item.correct_answer,
      explanation: item.explanation,
      contextReference: item.context_reference,
    })),
  };

  return JSON.stringify(exportData, null, 2);
}

// ============================================================
// B2 Upload Helpers
// ============================================================

async function uploadToB2(key: string, content: string, contentType: string): Promise<string> {
  const command = new PutObjectCommand({
    Bucket: B2_BUCKET_NAME,
    Key: key,
    Body: new TextEncoder().encode(content),
    ContentType: contentType,
  });

  await s3Client.send(command);
  return `s3://${B2_BUCKET_NAME}/${key}`;
}

function getB2ExportPath(course: Course, fileName: string): string {
  const baseDir = course.b2_export_dir || `courses/${course.id}`;
  // Remove s3://bucket/ prefix if present
  const cleanBaseDir = baseDir.replace(/^s3:\/\/[^/]+\//, "");
  return `${cleanBaseDir}/${fileName}`;
}

// ============================================================
// Error Logging
// ============================================================

async function logExportError(
  supabase: SupabaseClient,
  courseId: string,
  entityType: "concept_node" | "quiz_item" | "course_index",
  entityId: string,
  errorCode: string,
  errorMessage: string,
): Promise<void> {
  try {
    await supabase.rpc("log_export_error", {
      p_course_id: courseId,
      p_entity_type: entityType,
      p_entity_id: entityId,
      p_error_code: errorCode,
      p_error_message: errorMessage,
      p_max_retries: 3,
    });
  } catch (err) {
    console.error("Failed to log export error:", err);
  }
}

async function resolveExportError(
  supabase: SupabaseClient,
  entityType: "concept_node" | "quiz_item" | "course_index",
  entityId: string,
): Promise<void> {
  try {
    await supabase.rpc("resolve_export_error", {
      p_entity_type: entityType,
      p_entity_id: entityId,
    });
  } catch (err) {
    console.error("Failed to resolve export error:", err);
  }
}

// ============================================================
// Main Export Logic
// ============================================================

async function exportCourse(courseId: string, supabase: SupabaseClient): Promise<ExportResult> {
  const result: ExportResult = {
    conceptNodesExported: 0,
    quizItemsExported: 0,
    courseIndexExported: false,
    errors: [],
  };

  try {
    // 1. Get course info
    const { data: course, error: courseError } = await supabase
      .from("courses")
      .select("id, user_id, name, b2_export_dir")
      .eq("id", courseId)
      .single();

    if (courseError || !course) {
      throw new Error(`Course not found: ${courseError?.message}`);
    }

    if (!course.b2_export_dir) {
      throw new Error(`Course ${courseId} has no B2 export directory configured`);
    }

    // 2. Fetch unexported concept nodes
    const { data: conceptNodes, error: nodesError } = await supabase
      .from("concept_nodes")
      .select("*")
      .eq("course_id", courseId)
      .is("exported_at", null);

    if (nodesError) {
      throw new Error(`Failed to fetch concept nodes: ${nodesError.message}`);
    }

    // 3. Fetch unexported quiz items
    const { data: quizItems, error: quizError } = await supabase
      .from("quiz_items")
      .select("*")
      .eq("course_id", courseId)
      .is("exported_at", null);

    if (quizError) {
      throw new Error(`Failed to fetch quiz items: ${quizError.message}`);
    }

    // 4. Export concept nodes
    for (const node of conceptNodes || []) {
      try {
        const markdown = writeConceptNodeMarkdown(node);
        const fileName = `concepts/${node.concept_id}.md`;
        const key = getB2ExportPath(course, fileName);

        const uri = await uploadToB2(key, markdown, "text/markdown");

        // Update concept node with export info
        const { error: updateError } = await supabase
          .from("concept_nodes")
          .update({
            b2_markdown_uri: uri,
            exported_at: new Date().toISOString(),
          })
          .eq("id", node.id);

        if (updateError) {
          throw new Error(`Failed to update concept node: ${updateError.message}`);
        }

        // Resolve any previous error
        await resolveExportError(supabase, "concept_node", node.concept_id);

        result.conceptNodesExported++;
      } catch (err) {
        const errorMsg = `Failed to export concept node ${node.concept_id}: ${err instanceof Error ? err.message : String(err)}`;
        result.errors.push(errorMsg);
        await logExportError(
          supabase,
          courseId,
          "concept_node",
          node.concept_id,
          "EXPORT_FAILED",
          errorMsg,
        );
      }
    }

    // 5. Export quiz items
    if (quizItems && quizItems.length > 0) {
      try {
        const jsonContent = writeQuizJson(quizItems);
        const fileName = "quiz/quiz-items.json";
        const key = getB2ExportPath(course, fileName);

        const uri = await uploadToB2(key, jsonContent, "application/json");

        // Update all quiz items with export info
        const quizIds = quizItems.map((q) => q.id);
        const { error: updateError } = await supabase
          .from("quiz_items")
          .update({
            b2_json_uri: uri,
            exported_at: new Date().toISOString(),
          })
          .in("id", quizIds);

        if (updateError) {
          throw new Error(`Failed to update quiz items: ${updateError.message}`);
        }

        // Resolve errors for all quiz items
        for (const item of quizItems) {
          await resolveExportError(supabase, "quiz_item", item.quiz_id);
        }

        result.quizItemsExported = quizItems.length;
      } catch (err) {
        const errorMsg = `Failed to export quiz items: ${err instanceof Error ? err.message : String(err)}`;
        result.errors.push(errorMsg);
        for (const item of quizItems) {
          await logExportError(
            supabase,
            courseId,
            "quiz_item",
            item.quiz_id,
            "EXPORT_FAILED",
            errorMsg,
          );
        }
      }
    }

    // 6. Export course index (MOC)
    if (conceptNodes && conceptNodes.length > 0) {
      try {
        const indexMarkdown = writeCourseIndexMarkdown(courseId, course.name, conceptNodes);
        const fileName = "index.md";
        const key = getB2ExportPath(course, fileName);

        const _uri = await uploadToB2(key, indexMarkdown, "text/markdown");

        // Update course with index URI (optional: add index_uri column to courses table)
        // For now, we just log success

        await resolveExportError(supabase, "course_index", courseId);

        result.courseIndexExported = true;
      } catch (err) {
        const errorMsg = `Failed to export course index: ${err instanceof Error ? err.message : String(err)}`;
        result.errors.push(errorMsg);
        await logExportError(
          supabase,
          courseId,
          "course_index",
          courseId,
          "EXPORT_FAILED",
          errorMsg,
        );
      }
    }
  } catch (err) {
    const errorMsg = `Export failed for course ${courseId}: ${err instanceof Error ? err.message : String(err)}`;
    result.errors.push(errorMsg);
    console.error(errorMsg);
  }

  return result;
}

// ============================================================
// HTTP Handler
// ============================================================

serve(async (req: Request) => {
  // CORS headers
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    // Parse request
    const body: ExportRequest = await req.json();
    const { course_id } = body;

    if (!course_id) {
      return new Response(JSON.stringify({ error: "course_id is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create Supabase client with service role key (bypasses RLS)
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Execute export
    const result = await exportCourse(course_id, supabase);

    return new Response(
      JSON.stringify({
        success: result.errors.length === 0,
        course_id,
        ...result,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("Export function error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
