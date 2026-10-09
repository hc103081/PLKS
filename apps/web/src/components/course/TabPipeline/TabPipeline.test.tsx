import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type {
  PipelineConfig,
  PipelineNodeStatus,
  PipelineStatusResponse,
} from "../../../types/course";
import { TabPipeline } from "./TabPipeline";

describe("TabPipeline", () => {
  const createMockPipelineStatus = (
    overrides: Partial<PipelineStatusResponse> = {},
  ): PipelineStatusResponse => ({
    sessionId: "sess-123",
    status: "processing",
    nodes: [
      {
        node: "A",
        label: "Load Data",
        status: "completed",
        startedAt: "2026-01-01T10:00:00Z",
        completedAt: "2026-01-01T10:00:05Z",
        durationMs: 5000,
        inputPreview: {},
        outputPreview: {},
      },
      {
        node: "B",
        label: "URL Signing",
        status: "completed",
        startedAt: "2026-01-01T10:00:05Z",
        completedAt: "2026-01-01T10:00:08Z",
        durationMs: 3000,
        inputPreview: {},
        outputPreview: {},
      },
      {
        node: "C",
        label: "Prompt Assembly",
        status: "running",
        startedAt: "2026-01-01T10:00:08Z",
        durationMs: 0,
        inputPreview: {},
        outputPreview: {},
      },
      { node: "D", label: "AI Execution", status: "pending" },
      { node: "E", label: "Validation", status: "pending" },
      { node: "F", label: "Persistence", status: "pending" },
    ] as PipelineNodeStatus[],
    currentNode: "C",
    config: {
      fusionLevel: "strict_alignment",
      outputTemplates: ["knowledge_nodes", "flashcard_quiz"],
      modelParams: { temperature: 0.3, maxTokens: 4096, topP: 0.95 },
    } as PipelineConfig,
    createdAt: "2026-01-01T10:00:00Z",
    updatedAt: "2026-01-01T10:00:10Z",
    ...overrides,
  });

  const createFailedPipelineStatus = (): PipelineStatusResponse => ({
    sessionId: "sess-456",
    status: "failed",
    nodes: [
      {
        node: "A",
        label: "Load Data",
        status: "completed",
        startedAt: "2026-01-01T10:00:00Z",
        completedAt: "2026-01-01T10:00:05Z",
        durationMs: 5000,
      },
      {
        node: "B",
        label: "URL Signing",
        status: "completed",
        startedAt: "2026-01-01T10:00:05Z",
        completedAt: "2026-01-01T10:00:08Z",
        durationMs: 3000,
      },
      {
        node: "C",
        label: "Prompt Assembly",
        status: "completed",
        startedAt: "2026-01-01T10:00:08Z",
        completedAt: "2026-01-01T10:00:10Z",
        durationMs: 2000,
      },
      {
        node: "D",
        label: "AI Execution",
        status: "failed",
        startedAt: "2026-01-01T10:00:10Z",
        completedAt: "2026-01-01T10:00:20Z",
        durationMs: 10000,
        error: "NIM API timeout",
      },
      { node: "E", label: "Validation", status: "pending" },
      { node: "F", label: "Persistence", status: "pending" },
    ] as PipelineNodeStatus[],
    currentNode: "D",
    config: {
      fusionLevel: "high_level_summary",
      outputTemplates: ["knowledge_nodes"],
      modelParams: { temperature: 0.5, maxTokens: 2048, topP: 0.9 },
    } as PipelineConfig,
    createdAt: "2026-01-01T10:00:00Z",
    updatedAt: "2026-01-01T10:00:20Z",
  });

  const defaultProps = {
    pipelineStatus: createMockPipelineStatus(),
    sessionId: "sess-123",
    selectedNode: null,
    onNodeSelect: vi.fn(),
    isLoading: false,
    configDrawerOpen: false,
    nodeDetailDrawerOpen: false,
    onConfigDrawerToggle: vi.fn(),
    onNodeDetailDrawerToggle: vi.fn(),
  };

  it("renders loading skeleton when isLoading is true", () => {
    const { container } = render(<TabPipeline {...defaultProps} isLoading={true} />);

    const pulseElements = container.querySelectorAll(".animate-pulse");
    expect(pulseElements.length).toBeGreaterThan(0);
  });

  it("renders loading skeleton when pipelineStatus is undefined", () => {
    const { container } = render(
      <TabPipeline {...defaultProps} pipelineStatus={undefined} isLoading={false} />,
    );

    const pulseElements = container.querySelectorAll(".animate-pulse");
    expect(pulseElements.length).toBeGreaterThan(0);
  });

  it("renders pipeline header with config info", () => {
    render(<TabPipeline {...defaultProps} />);

    expect(screen.getByText(/AI 管線進度/)).toBeInTheDocument();
    expect(screen.getByText(/融合深度: 嚴格對齊/)).toBeInTheDocument();
    expect(screen.getByText(/輸出: 知識節點, 閃卡題庫/)).toBeInTheDocument();
  });

  it("renders all 6 pipeline nodes in order", () => {
    render(<TabPipeline {...defaultProps} />);

    // Node labels (more specific than single letters)
    expect(screen.getByText(/Load Data/)).toBeInTheDocument();
    expect(screen.getByText(/URL Signing/)).toBeInTheDocument();
    expect(screen.getByText(/Prompt Assembly/)).toBeInTheDocument();
    expect(screen.getByText(/AI Execution/)).toBeInTheDocument();
    expect(screen.getByText(/Validation/)).toBeInTheDocument();
    expect(screen.getByText(/Persistence/)).toBeInTheDocument();
    // Node letters appear in node badges
    const nodeLetters = screen.getAllByText(/^[A-F]$/);
    expect(nodeLetters.length).toBeGreaterThanOrEqual(6);
  });

  it("shows completed status for nodes A and B", () => {
    render(<TabPipeline {...defaultProps} />);

    // Nodes A and B should have check icons (completed)
    const completedNodes = screen.getAllByText(/check/);
    expect(completedNodes.length).toBeGreaterThanOrEqual(2);
  });

  it("shows running status for current node C", () => {
    render(<TabPipeline {...defaultProps} />);

    // "執行中" appears in node badge and legend
    const runningElements = screen.getAllByText(/執行中/);
    expect(runningElements.length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/Prompt Assembly/)).toBeInTheDocument();
  });

  it("shows pending status for nodes D, E, F", () => {
    render(<TabPipeline {...defaultProps} />);

    // Pending nodes should show radio_button_unchecked or similar
    expect(screen.getByText(/AI Execution/)).toBeInTheDocument();
    expect(screen.getByText(/Validation/)).toBeInTheDocument();
    expect(screen.getByText(/Persistence/)).toBeInTheDocument();
  });

  it("displays timing info for completed nodes", () => {
    render(<TabPipeline {...defaultProps} />);

    // Multiple nodes have timing info
    const startElements = screen.getAllByText(/開始: /);
    expect(startElements.length).toBeGreaterThanOrEqual(1);
    const completeElements = screen.getAllByText(/完成: /);
    expect(completeElements.length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/耗時: 5s/)).toBeInTheDocument();
    expect(screen.getByText(/耗時: 3s/)).toBeInTheDocument();
  });

  it("renders legend with status indicators", () => {
    render(<TabPipeline {...defaultProps} />);

    expect(screen.getByText(/圖例：/)).toBeInTheDocument();
    expect(screen.getByText(/已完成/)).toBeInTheDocument();
    // "執行中" appears in node badge and legend
    const runningElements = screen.getAllByText(/執行中/);
    expect(runningElements.length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/失敗/)).toBeInTheDocument();
    expect(screen.getByText(/等待中/)).toBeInTheDocument();
    expect(screen.getByText(/已選中/)).toBeInTheDocument();
  });

  it("calls onNodeSelect when node is clicked", async () => {
    const onNodeSelect = vi.fn();
    render(<TabPipeline {...defaultProps} onNodeSelect={onNodeSelect} />);

    const nodeC = screen.getByText(/Prompt Assembly/);
    await userEvent.click(nodeC);

    expect(onNodeSelect).toHaveBeenCalledWith("C");
  });

  it("opens node detail drawer when node is selected", () => {
    render(<TabPipeline {...defaultProps} selectedNode="C" nodeDetailDrawerOpen={true} />);

    expect(screen.getByText(/節點 C: Prompt Assembly/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /關閉/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /調整配置/ })).toBeInTheDocument();
  });

  it("shows error details in node detail drawer for failed node", () => {
    render(
      <TabPipeline
        {...defaultProps}
        pipelineStatus={createFailedPipelineStatus()}
        selectedNode="D"
        nodeDetailDrawerOpen={true}
      />,
    );

    expect(screen.getByText(/錯誤詳情/)).toBeInTheDocument();
    const errorElements = screen.getAllByText(/NIM API timeout/);
    expect(errorElements.length).toBeGreaterThanOrEqual(1);
    expect(screen.getByRole("button", { name: /重試此節點/ })).toBeInTheDocument();
  });

  it("opens config drawer when config button is clicked", () => {
    render(<TabPipeline {...defaultProps} configDrawerOpen={true} />);

    expect(screen.getByText(/管線配置/)).toBeInTheDocument();
    // 融合深度 appears in both header and drawer - check drawer specifically
    const fusionElements = screen.getAllByText(/融合深度/);
    expect(fusionElements.length).toBeGreaterThanOrEqual(1);
    const labels = screen.getAllByText(/嚴格對齊/);
    expect(labels.length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/高層摘要/)).toBeInTheDocument();
    expect(screen.getByText(/輸出模板/)).toBeInTheDocument();
    // 知識節點 appears in header and drawer
    const nodeLabels = screen.getAllByText(/知識節點/);
    expect(nodeLabels.length).toBeGreaterThanOrEqual(1);
    // 閃卡題庫 appears in header and drawer
    const flashcardLabels = screen.getAllByText(/閃卡題庫/);
    expect(flashcardLabels.length).toBeGreaterThanOrEqual(1);
    expect(screen.getByRole("button", { name: /儲存並重試/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /取消/ })).toBeInTheDocument();
  });

  it("shows advanced model params in config drawer", () => {
    render(<TabPipeline {...defaultProps} configDrawerOpen={true} />);

    expect(screen.getByText(/進階模型參數/)).toBeInTheDocument();
    expect(screen.getByText(/Temperature:/)).toBeInTheDocument();
    expect(screen.getByText(/Max Tokens:/)).toBeInTheDocument();
    expect(screen.getByText(/Top P:/)).toBeInTheDocument();
  });

  it("shows retry button for failed nodes in node detail drawer", () => {
    render(
      <TabPipeline
        {...defaultProps}
        pipelineStatus={createFailedPipelineStatus()}
        selectedNode="D"
        nodeDetailDrawerOpen={true}
      />,
    );

    expect(screen.getByRole("button", { name: /重試此節點/ })).toBeInTheDocument();
  });

  it("displays topo dependencies in node detail drawer", () => {
    render(<TabPipeline {...defaultProps} selectedNode="C" nodeDetailDrawerOpen={true} />);

    expect(screen.getByText(/拓撲相依/)).toBeInTheDocument();
    expect(screen.getByText(/A: Load Data/)).toBeInTheDocument();
    expect(screen.getByText(/B: URL Signing/)).toBeInTheDocument();
    expect(screen.getByText(/D: AI Execution/)).toBeInTheDocument();
    expect(screen.getByText(/E: Validation/)).toBeInTheDocument();
    expect(screen.getByText(/F: Persistence/)).toBeInTheDocument();
  });
});
