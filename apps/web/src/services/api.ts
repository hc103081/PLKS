// apps/web/src/services/api.ts
import type {
  GameSession,
  GameSessionState,
  IngestFileResponse,
  SessionStatusResponse,
  SidekickRequest,
  SidekickResponse,
  StartGameResponse,
  StartSessionRequest,
  StartSessionResponse,
  SubmitAnswerRequest,
  SubmitAnswerResponse,
} from "../types/api";
// apps/web/src/services/api.ts
import type {
  CourseCardData,
  CourseTab,
  CoursesResponse,
  CreateCourseRequest,
  OutlineTreeData,
  PipelineStatusResponse,
  PipelineSummary,
  RawAssetData,
  UpdateCourseRequest,
} from "../types/course";
import { supabase } from "./supabase";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:3000";
const API_PREFIX = "/api";

async function getAccessToken(): Promise<string | null> {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  // Debug logging
  console.log(
    "[api.ts] getAccessToken - session:",
    session
      ? {
          user_id: session.user?.id,
          expires_at: session.expires_at,
          has_token: !!session.access_token,
          token_preview: `${session.access_token?.substring(0, 20)}...`,
        }
      : "NO SESSION",
  );

  return session?.access_token ?? null;
}

async function fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
  const accessToken = await getAccessToken();

  // Debug logging
  console.log(
    "[api.ts] fetchJson - url:",
    url,
    "hasToken:",
    !!accessToken,
    "tokenPreview:",
    `${accessToken?.substring(0, 20)}...`,
  );

  const response = await fetch(`${API_BASE_URL}${url}`, {
    headers: {
      "Content-Type": "application/json",
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...options?.headers,
    },
    ...options,
  });

  // Debug logging
  console.log("[api.ts] fetchJson - response status:", response.status, "url:", url);

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: "Unknown error" }));
    console.error("[api.ts] fetchJson - error:", error);
    throw new Error(error.error ?? `HTTP ${response.status}`);
  }

  return response.json();
}

// Orchestrator API
export async function startSession(data: StartSessionRequest): Promise<StartSessionResponse> {
  return fetchJson<StartSessionResponse>(`${API_PREFIX}/orchestrator/start`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function getSessionStatus(sessionId: string): Promise<SessionStatusResponse> {
  return fetchJson<SessionStatusResponse>(`${API_PREFIX}/orchestrator/status/${sessionId}`);
}

export async function retrySession(sessionId: string): Promise<StartSessionResponse> {
  return fetchJson<StartSessionResponse>(`${API_PREFIX}/orchestrator/retry/${sessionId}`, {
    method: "POST",
  });
}

// Ingestion API
export async function uploadFile(file: File, courseId?: string): Promise<IngestFileResponse> {
  const formData = new FormData();
  formData.append("file", file);
  if (courseId) {
    formData.append("courseId", courseId);
  }

  const accessToken = await getAccessToken();

  const response = await fetch(`${API_BASE_URL}${API_PREFIX}/ingestion/upload`, {
    method: "POST",
    headers: {
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: "Upload failed" }));
    throw new Error(error.error ?? `HTTP ${response.status}`);
  }

  return response.json();
}

export async function getIngestionStatus(): Promise<{
  status: string;
  inboxPath: string;
  processingPath: string;
}> {
  return fetchJson(`${API_PREFIX}/ingestion/status`);
}

// Gamification API
export async function startGame(courseId: string): Promise<StartGameResponse> {
  return fetchJson<StartGameResponse>(`${API_PREFIX}/gamification/quiz/${courseId}`, {
    method: "POST",
  });
}

export async function submitAnswer(data: SubmitAnswerRequest): Promise<SubmitAnswerResponse> {
  return fetchJson<SubmitAnswerResponse>(`${API_PREFIX}/gamification/answer`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function requestSidekickHelp(sessionId: string): Promise<SidekickResponse> {
  return fetchJson<SidekickResponse>(`${API_PREFIX}/gamification/sidekick`, {
    method: "POST",
    body: JSON.stringify({ sessionId }),
  });
}

export async function getGameState(sessionId: string): Promise<GameSession> {
  return fetchJson<GameSession>(`${API_PREFIX}/gamification/session/${sessionId}`);
}

// Export API
export interface ExportTriggerResponse {
  success: boolean;
  data: ExportResult;
}

export interface ExportResult {
  conceptNodesExported: number;
  quizItemsExported: number;
  indexExported: boolean;
}

export async function triggerExport(courseId: string): Promise<ExportTriggerResponse> {
  return fetchJson<ExportTriggerResponse>(`${API_PREFIX}/export/course/${courseId}`, {
    method: "POST",
  });
}

export async function triggerExportAll(): Promise<{ success: boolean; data: ExportResult[] }> {
  return fetchJson<{ success: boolean; data: ExportResult[] }>(`${API_PREFIX}/export/all`, {
    method: "POST",
  });
}

// Course management APIs
export async function getCourses(semesterFilter?: string): Promise<CoursesResponse> {
  const params = new URLSearchParams();
  if (semesterFilter && semesterFilter !== "all") {
    params.set("semester", semesterFilter);
  }
  const query = params.toString();
  return fetchJson<CoursesResponse>(`${API_PREFIX}/courses${query ? `?${query}` : ""}`);
}

export async function getPipelineSummary(): Promise<PipelineSummary> {
  return fetchJson<PipelineSummary>(`${API_PREFIX}/pipeline/summary`);
}

export async function createCourse(data: CreateCourseRequest): Promise<void> {
  console.log("[api.ts] createCourse request:", data);
  const response = await fetchJson<unknown>(`${API_PREFIX}/courses`, {
    method: "POST",
    body: JSON.stringify(data),
  });

  console.log(
    "[api.ts] createCourse response status:",
    (response as { status?: number }).status ?? "N/A",
  );

  // fetchJson already throws on non-ok status, so we just need to check the body
  console.log("[api.ts] createCourse response body:", response);
}

export async function updateCourse(data: UpdateCourseRequest): Promise<void> {
  await fetchJson(`${API_PREFIX}/courses/${data.id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export async function deleteCourse(courseId: string): Promise<void> {
  await fetchJson(`${API_PREFIX}/courses/${courseId}`, {
    method: "DELETE",
  });
}

// Course detail APIs
export async function getCourseById(courseId: string): Promise<CourseCardData> {
  return fetchJson<CourseCardData>(`${API_PREFIX}/courses/${courseId}`);
}

export async function getRawAsset(courseId: string, sessionId: string): Promise<RawAssetData> {
  return fetchJson<RawAssetData>(
    `${API_PREFIX}/raw-asset?courseId=${courseId}&sessionId=${sessionId}`,
  );
}

// Pipeline APIs
export async function getPipelineStatus(sessionId: string): Promise<PipelineStatusResponse> {
  return fetchJson<PipelineStatusResponse>(`${API_PREFIX}/pipeline/${sessionId}`);
}

export async function startPipeline(courseId: string): Promise<void> {
  await fetchJson(`${API_PREFIX}/pipeline/start`, {
    method: "POST",
    body: JSON.stringify({ courseId }),
  });
}

export async function retryPipeline(sessionId: string): Promise<void> {
  await fetchJson(`${API_PREFIX}/pipeline/retry/${sessionId}`, {
    method: "POST",
  });
}

// Concept tree API
export async function getConceptTree(courseId: string): Promise<OutlineTreeData> {
  return fetchJson<OutlineTreeData>(`${API_PREFIX}/concept-tree/${courseId}`);
}

// Game session state API
export async function getGameSessionState(sessionId: string): Promise<GameSessionState> {
  return fetchJson<GameSessionState>(`${API_PREFIX}/gamification/session-state/${sessionId}`);
}
