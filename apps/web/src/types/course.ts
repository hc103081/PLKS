// 學期定義
export type SemesterKey =
  | "103-1"
  | "103-2"
  | "104-1"
  | "104-2"
  | "105-1"
  | "105-2"
  | "106-1"
  | "106-2"
  | "all";

export interface Semester {
  key: SemesterKey;
  label: string;
  year: number;
  term: 1 | 2;
}

export const SEMESTERS: Semester[] = [
  { key: "103-1", label: "大一上", year: 103, term: 1 },
  { key: "103-2", label: "大一下", year: 103, term: 2 },
  { key: "104-1", label: "大二上", year: 104, term: 1 },
  { key: "104-2", label: "大二下", year: 104, term: 2 },
  { key: "105-1", label: "大三上", year: 105, term: 1 },
  { key: "105-2", label: "大三下", year: 105, term: 2 },
  { key: "106-1", label: "大四上", year: 106, term: 1 },
  { key: "106-2", label: "大四下", year: 106, term: 2 },
];

export const SEMESTER_LABELS: Record<SemesterKey, string> = {
  "103-1": "大一上",
  "103-2": "大一下",
  "104-1": "大二上",
  "104-2": "大二下",
  "105-1": "大三上",
  "105-2": "大三下",
  "106-1": "大四上",
  "106-2": "大四下",
  all: "全部",
};

// 課程卡片狀態
export type CourseStatus = "idle" | "processing" | "ready" | "error";

export interface CourseCardData {
  id: string;
  code: string;
  name: string;
  semester: string;
  credits: number;
  required: boolean;
  instructor?: string;
  location?: string;
  status: CourseStatus;
  progress: number; // 0-100
  totalChapters: number;
  completedChapters: number;
  lastReviewedAt?: string;
  currentTopic?: string;
  conceptGraphCount: number;
  audioCount: number;
  quizCount: number;
  latestSessionId?: string;
  pipelineStage?: {
    currentNode: "A" | "B" | "C" | "D" | "E" | "F";
    completedNodes: ("A" | "B" | "C" | "D" | "E" | "F")[];
    failedNode?: "A" | "B" | "C" | "D" | "E" | "F";
    errorMessage?: string;
    retryCount?: number;
    maxRetries?: number;
    estimatedTimeRemaining?: number; // seconds
  };
}

// 管線摘要
export interface PipelineSummary {
  inProgress: number;
  pending: number;
  needsAttention: number;
  healthy: boolean;
  healthPercentage: number;
  gpuLoad?: string;
}

// API 回應型別
export interface CoursesResponse {
  courses: CourseCardData[];
  pipelineSummary: PipelineSummary;
}

export interface CreateCourseRequest {
  code: string;
  name: string;
  semester: string;
  credits: number;
  type: "required" | "elective" | "general";
  instructor?: string;
  location?: string;
}

export interface UpdateCourseRequest extends Partial<CreateCourseRequest> {
  id: string;
}

// Tab 類型
export type CourseTab = "raw" | "pipeline" | "outline" | "game";

export interface CoursePageURLState {
  tab: CourseTab;
  session?: string;
  subTab?: "audio" | "slides" | "transcript";
  node?: "A" | "B" | "C" | "D" | "E" | "F";
  view?: "tree" | "canvas" | "split";
}

// Raw Asset (TabRaw)
export interface TranscriptSegment {
  id: string;
  startTime: number;
  endTime: number;
  text: string;
  speaker?: string;
  confidence?: number;
}

export interface VisualAsset {
  id: string;
  pageNum: number;
  b2Uri: string;
  presignedUrl?: string;
  width?: number;
  height?: number;
  mimeType: string;
}

export interface RawAssetData {
  sessionId: string;
  courseId: string;
  audioUrl: string;
  transcripts: TranscriptSegment[];
  visualAssets: VisualAsset[];
  duration: number; // seconds
}

// Pipeline (TabPipeline)
export type PipelineNodeKey = "A" | "B" | "C" | "D" | "E" | "F";

export type NodeStatus = "pending" | "running" | "completed" | "failed";

export const NODE_LABELS: Record<PipelineNodeKey, string> = {
  A: "Load Data",
  B: "URL Signing",
  C: "Prompt Assembly",
  D: "AI Execution",
  E: "Validation",
  F: "Persistence",
};

export const NODE_DESCRIPTIONS: Record<PipelineNodeKey, string> = {
  A: "讀取原始教材資料",
  B: "產生視覺資產預簽名 URL",
  C: "組裝多模態提示詞",
  D: "呼叫 NVIDIA NIM 多模態推理",
  E: "Zod Schema 驗證輸出",
  F: "持久化至 Supabase 與產出 Markdown",
};

export const NODE_ORDER: PipelineNodeKey[] = ["A", "B", "C", "D", "E", "F"];

export interface PipelineNodeStatus {
  node: PipelineNodeKey;
  label: string;
  status: NodeStatus;
  startedAt?: string;
  completedAt?: string;
  error?: string;
  inputPreview?: unknown;
  outputPreview?: unknown;
  durationMs?: number;
}

export interface PipelineConfig {
  fusionLevel: "strict_alignment" | "high_level_summary";
  outputTemplates: ("knowledge_nodes" | "flashcard_quiz")[];
  modelParams?: {
    temperature?: number;
    maxTokens?: number;
    topP?: number;
  };
}

export interface PipelineStatusResponse {
  sessionId: string;
  status: "pending" | "processing" | "completed" | "failed";
  nodes: PipelineNodeStatus[];
  currentNode?: PipelineNodeKey;
  config: PipelineConfig;
  createdAt: string;
  updatedAt: string;
}

export interface RetryNodeRequest {
  fromNode: PipelineNodeKey;
  config?: Partial<PipelineConfig>;
}

// Outline (TabOutline)
export interface ConceptNodeWithMeta {
  conceptId: string;
  courseId: string;
  term: string;
  explanation: string;
  relatedTerms: string[];
  sourceEvidence: {
    transcriptRef: string;
    slideUri: string;
  };
  depth: number;
  order: number;
  parentId?: string;
  children: ConceptNodeWithMeta[];
  isExpanded: boolean;
  isEditing: boolean;
  createdAt: string;
  updatedAt: string;
  version: number;
}

export interface OutlineTreeData {
  nodes: ConceptNodeWithMeta[];
  rootNodeIds: string[];
}

export interface EvidenceData {
  transcriptSegments: TranscriptSegment[];
  slideUris: string[];
}

export interface UpdateConceptNodesRequest {
  courseId: string;
  nodes: Array<{
    conceptId: string;
    term?: string;
    explanation?: string;
    relatedTerms?: string[];
    depth?: number;
    order?: number;
    parentId?: string | null;
    isExpanded?: boolean;
    version: number;
  }>;
}

// Game (TabGame) - re-export from api.ts
export type { GameSessionState, GameAnswer, SidekickMessage, QuizItem } from "./api";

// Dashboard Store
export interface DashboardStore {
  semesterFilter: SemesterKey;
  viewMode: "grid" | "list";
  createModal: { open: boolean; mode: "create" | "edit"; courseId?: string | undefined };
  setSemesterFilter: (s: SemesterKey) => void;
  setViewMode: (m: "grid" | "list") => void;
  openCreateModal: (mode: "create" | "edit", courseId?: string) => void;
  closeCreateModal: () => void;
}

// Course Page Store - UI state only (not server state)
export interface GameUIState {
  sessionId: string;
  currentQuizIndex: number;
  score: number;
  streak: number;
  sidekickOpen: boolean;
}

export interface OutlineUIState {
  editingNodeId: string | null;
  viewMode: "tree" | "canvas" | "split";
  expandedNodeIds: string[];
}

export interface PipelineUIState {
  selectedNode: PipelineNodeKey | null;
  configDrawerOpen: boolean;
  nodeDetailDrawerOpen: boolean;
}

export interface RawUIState {
  activeSubTab: "audio" | "slides" | "transcript";
  currentTime: number;
  currentSlide: number;
}

export interface CoursePageStore {
  game: GameUIState;
  outline: OutlineUIState;
  pipeline: PipelineUIState;
  raw: RawUIState;
  setGameSession: (sessionId: string) => void;
  updateGameProgress: (patch: Partial<GameUIState>) => void;
  setEditingNode: (nodeId: string | null) => void;
  setOutlineViewMode: (mode: "tree" | "canvas" | "split") => void;
  toggleNodeExpanded: (nodeId: string) => void;
  setPipelineSelectedNode: (node: PipelineNodeKey | null) => void;
  setPipelineConfigDrawer: (open: boolean) => void;
  setPipelineNodeDetailDrawer: (open: boolean) => void;
  setRawSubTab: (tab: "audio" | "slides" | "transcript") => void;
  setRawCurrentTime: (time: number) => void;
  setRawCurrentSlide: (slide: number) => void;
}
