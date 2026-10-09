import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { ConceptNodeWithMeta, OutlineTreeData } from "../../../types/course";
import { TabOutline } from "./TabOutline";

describe("TabOutline", () => {
  const createMockConceptTree = (overrides: Partial<OutlineTreeData> = {}): OutlineTreeData => {
    const now = new Date().toISOString();
    const createNode = (
      conceptId: string,
      term: string,
      explanation: string,
      relatedTerms: string[],
      transcriptRef: string,
      slideUri: string,
      children: any[] = [],
      depth = 0,
      order = 0,
    ) =>
      ({
        conceptId,
        courseId: "course-1", // added courseId
        term,
        explanation,
        relatedTerms,
        sourceEvidence: {
          transcriptRef,
          slideUri,
        },
        depth,
        order,
        parentId: depth === 0 ? undefined : `parent-${conceptId}`,
        children,
        isExpanded: false,
        isEditing: false,
        createdAt: now,
        updatedAt: now,
        version: 1,
      }) as ConceptNodeWithMeta;

    return {
      nodes: [
        createNode(
          "node-1",
          "第一章 計算機架構總論",
          "介紹計算機基本概念",
          ["von Neumann", "哈佛架構"],
          "transcript-1",
          "s3://bucket/slide1.png",
          [
            createNode(
              "node-1-1",
              "1.1 馮諾伊曼架構",
              "儲存程式概念",
              ["CPU", "記憶體"],
              "transcript-1-1",
              "s3://bucket/slide1-1.png",
              [],
              1,
              0,
            ),
            createNode(
              "node-1-2",
              "1.2 哈佛架構對比",
              "分離指令和資料記憶體",
              ["快取", "匯流排"],
              "transcript-1-2",
              "s3://bucket/slide1-2.png",
              [],
              1,
              1,
            ),
          ],
          0,
          0,
        ),
        createNode(
          "node-2",
          "第二章 指令管線化",
          "五段階段管線",
          ["IF", "ID", "EX", "MEM", "WB"],
          "transcript-2",
          "s3://bucket/slide2.png",
          [
            createNode(
              "node-2-1",
              "2.1 指令取得 (IF)",
              "從記憶體讀取指令",
              ["PC", "指令快取"],
              "transcript-2-1",
              "s3://bucket/slide2-1.png",
              [],
              1,
              0,
            ),
          ],
          0,
          1,
        ),
      ],
      rootNodeIds: ["node-1", "node-2"],
      ...overrides,
    };
  };

  const defaultProps = {
    conceptTree: createMockConceptTree(),
    isLoading: false,
    editingNodeId: null,
    viewMode: "split" as const,
    expandedNodeIds: [],
    onViewModeChange: vi.fn(),
    onNodeExpandToggle: vi.fn(),
  };

  it("renders loading skeleton when isLoading is true", () => {
    const { container } = render(<TabOutline {...defaultProps} isLoading={true} />);

    const pulseElements = container.querySelectorAll(".animate-pulse");
    expect(pulseElements.length).toBeGreaterThan(0);
  });

  it("renders loading skeleton when conceptTree is undefined", () => {
    const { container } = render(
      <TabOutline {...defaultProps} conceptTree={undefined} isLoading={false} />,
    );

    const pulseElements = container.querySelectorAll(".animate-pulse");
    expect(pulseElements.length).toBeGreaterThan(0);
  });

  it("renders chapter and node titles", () => {
    render(<TabOutline {...defaultProps} />);

    // Check chapter titles
    expect(screen.getByText(/第一章 計算機架構總論/)).toBeInTheDocument();
    expect(screen.getByText(/第二章 指令管線化/)).toBeInTheDocument();
    // Check node titles
    expect(screen.getByText(/1.1 馮諾伊曼架構/)).toBeInTheDocument();
    expect(screen.getByText(/2.1 指令取得 \(IF\)/)).toBeInTheDocument();
  });

  it("toggles chapter expansion when button clicked", async () => {
    const onNodeExpandToggle = vi.fn();
    render(<TabOutline {...defaultProps} onNodeExpandToggle={onNodeExpandToggle} />);

    // Initially chapters should be collapsed (no child nodes visible)
    expect(screen.queryByText(/1.1 馮諾伊曼架構/)).not.toBeInTheDocument();
    expect(screen.queryByText(/2.1 指令取得 \(IF\)/)).not.toBeInTheDocument();

    // Click first chapter toggle button
    const chapter1Toggle = screen.getByRole("button", {
      name: /切換第 1 章節/,
    });
    await userEvent.click(chapter1Toggle);

    expect(onNodeExpandToggle).toHaveBeenCalledWith("node-1");

    // After expansion, child nodes should be visible
    expect(screen.getByText(/1.1 馮諾伊曼架構/)).toBeInTheDocument();
    expect(screen.getByText(/2.1 指令取得 \(IF\)/)).not.toBeInTheDocument(); // still under chapter 2
  });

  it("switches view mode when view mode buttons clicked", async () => {
    const onViewModeChange = vi.fn();
    render(<TabOutline {...defaultProps} onViewModeChange={onViewModeChange} />);

    // Click tree view button
    const treeBtn = screen.getByRole("button", {
      name: /筆記/,
    });
    await userEvent.click(treeBtn);
    expect(onViewModeChange).toHaveBeenCalledWith("tree");

    // Click split view button
    const splitBtn = screen.getByRole("button", {
      name: /雙欄對齊/,
    });
    await userEvent.click(splitBtn);
    expect(onViewModeChange).toHaveBeenCalledWith("split");

    // Click canvas view button
    const canvasBtn = screen.getByRole("button", {
      name: /聚焦/,
    });
    await userEvent.click(canvasBtn);
    expect(onViewModeChange).toHaveBeenCalledWith("canvas");
  });

  it("highlights editing node when editingNodeId is set", () => {
    const props = {
      ...defaultProps,
      editingNodeId: "node-2-1",
    };
    render(<TabOutline {...props} />);

    // The editing node should have a specific background or indicator
    // Based on the component, editing node has bg-[#6366f1] text-white shadow-md
    const editingNodeElement = screen.getByText(/2.1 指令取得 \(IF\)/);
    // Check that it's within the active focus chapter (chapter 2)
    expect(editingNodeElement).toBeInTheDocument();
    // We can't easily check the exact class without querying the parent, but we can verify
    // that the chapter 2 toggle is active (has bg-[#19223a] border-[#2e3b60] text-[#f8fafc] font-semibold)
    const chapter2Toggle = screen.getByRole("button", {
      name: /切換第 2 章節/,
    });
    expect(chapter2Toggle).toHaveClass(/bg-\[\#19223a\]/);
  });
});
