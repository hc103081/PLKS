// apps/web/src/services/api.ts
import type {
  GameSession,
  IngestFileResponse,
  SessionStatusResponse,
  SidekickRequest,
  SidekickResponse,
  StartGameResponse,
  StartSessionRequest,
  StartSessionResponse,
  SubmitAnswerRequest,
  SubmitAnswerResponse,
} from "../types/api.js";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:3000";
const API_PREFIX = "/api";

async function fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${url}`, {
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
    ...options,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: "Unknown error" }));
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

  const response = await fetch(`${API_BASE_URL}${API_PREFIX}/ingestion/upload`, {
    method: "POST",
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
  return fetchJson<StartGameResponse>(`${API_PREFIX}/gamification/start`, {
    method: "POST",
    body: JSON.stringify({ courseId }),
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
  return fetchJson<GameSession>(`${API_PREFIX}/gamification/state/${sessionId}`);
}
