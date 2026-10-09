import React, { useState, useRef } from "react";
import type { ConceptNodeWithMeta, EvidenceData, OutlineTreeData } from "../../../types/course";

// Recursively flatten a concept tree into a single-level array
function flattenTree(nodes: ConceptNodeWithMeta[]): ConceptNodeWithMeta[] {
  const result: ConceptNodeWithMeta[] = [];

  function recurse(nodeList: ConceptNodeWithMeta[]) {
    for (const node of nodeList) {
      result.push(node);
      if (node.children && node.children.length > 0) {
        recurse(node.children);
      }
    }
  }

  recurse(nodes);
  return result;
}

import { LoadingSkeleton } from "../../shared";

// Updated TabOutline component matching the UI specification
export function TabOutline({
  conceptTree,
  isLoading,
  editingNodeId,
  viewMode,
  expandedNodeIds,
  onViewModeChange,
  onNodeExpandToggle,
}: {
  conceptTree: OutlineTreeData | undefined;
  isLoading: boolean;
  editingNodeId: string | null;
  viewMode: "tree" | "canvas" | "split";
  expandedNodeIds: string[];
  onViewModeChange: (mode: "tree" | "canvas" | "split") => void;
  onNodeExpandToggle: (nodeId: string) => void;
}) {
  if (isLoading || !conceptTree) {
    return (
      <div className="p-8">
        <div className="max-w-6xl mx-auto animate-pulse">
          <div
            className="grid grid-cols-1 lg:grid-cols-3 gap-6"
            style={{ gridTemplateColumns: "280px 1fr 320px" }}
          >
            <LoadingSkeleton variant="card" height={700} />
            <LoadingSkeleton variant="card" height={700} />
            <LoadingSkeleton variant="card" height={700} />
          </div>
        </div>
      </div>
    );
  }

  const allNodes = flattenTree(conceptTree.nodes);

  // Get the currently editing node
  const currentNode = editingNodeId
    ? allNodes.find((n) => n.conceptId === editingNodeId) || null
    : null;

  // Get transcript and slide evidence for current node
  const transcriptRef = currentNode?.sourceEvidence.transcriptRef || "";
  const slideUri = currentNode?.sourceEvidence.slideUri || "";

  // Mock data for evidence counts
  const transcriptCount = transcriptRef ? 1 : 0;
  const slideCount = slideUri ? 1 : 0;

  // Helper to check if a node is expanded
  const isExpanded = (nodeId: string) => expandedNodeIds.includes(nodeId);

  // Recursive function to render tree nodes
  const renderTreeNode = (node: ConceptNodeWithMeta, level = 0) => {
    const isEditing = editingNodeId === node.conceptId;
    const isChapter = level === 0; // Assuming root nodes are chapters
    const indentClass = `w-[${24 * level}px] inline-block`;
    const iconClassName = `material-symbols-outlined text-[16px] text-[${isChapter ? (isExpanded(node.conceptId) ? "#94a3b8" : "#94a3b8") : "inherit"}] chevron-icon transition-transform ${isChapter && isExpanded(node.conceptId) ? "rotate-90" : ""}`;
    const divClassName = "test";

    return (
      <>
        {/* Node container */}
        <div
          className={divClassName}
          onClick={isChapter ? () => onNodeExpandToggle(node.conceptId) : undefined} // Concept nodes are not expandable in this design
        >
          <div className="flex items-center gap-1.5 min-w-0">
            {/* Indentation for non-chapter nodes */}
            {!isChapter && <div className={indentClass} />}
            {/* Expander icon for chapters */}
            {isChapter && (
              <span className={iconClassName}>
                {isExpanded(node.conceptId) ? "expand_more" : "chevron_right"}
              </span>
            )}
            {/* Chapter/Concept number and title */}
            {!isChapter && (
              <>
                <span className="font-label-code-sm text-label-code-sm text-white/80">
                  {/* We don't have a numbering scheme for concepts; we can use index? */}
                  {/* For simplicity, we'll just show a dot or nothing */}
                  {/* We'll skip the number for concepts */}
                </span>
              </>
            )}
            {isChapter && (
              <span className="font-label-code-sm text-label-code-sm font-medium text-[#94a3b8]">
                {/* We need to extract chapter number from term? For now, we'll just show a placeholder */}
                {/* We'll use the node's conceptId to generate a number? */}
                {/* We'll just show "第 X 章" based on index in rootNodeIds? */}
                {/* Since we don't have index here, we'll skip and just show the term */}
                {/* Actually, the term already includes the chapter number and title */}
                {/* We'll just show the term */}
                {node.term}
              </span>
            )}
            {!isChapter && (
              <span className="truncate font-semibold text-[#f8fafc]">{node.term}</span>
            )}
          </div>

          {/* Status indicators */}
          {isChapter && (
            <>
              {/* Percentage badge (placeholder) */}
              <span className="text-label-code-sm font-label-code-sm px-1.5 py-0.2 rounded-full bg-surface-container-high text-on-surface-variant shrink-0">
                0%
              </span>
              {/* Expander icon for chapters (already shown above? Actually we have two icons: one on left, one on right?) */}
              {/* In the original design, there is only the chevron on the left, and the percentage on the right. */}
              {/* We already placed the expander icon on the left inside the flex items-center. */}
              {/* The original also had a second icon? Looking at the hardcoded version, there was only the chevron on the left and the percentage on the right. */}
              {/* So we don't need an extra icon here. */}
            </>
          )}
          {!isChapter && (
            <>
              {/* Check mark for concept nodes (if not editing) */}
              {!isEditing && (
                <span className="material-symbols-outlined text-[13px] text-[#34d399]">
                  check_circle
                </span>
              )}
              {/* Editing label */}
              {isEditing && (
                <span className="text-label-code-sm font-label-code-sm px-1.5 py-0.2 rounded bg-[#312e81] text-[#c0c1ff] font-medium border border-indigo-400/30">
                  編輯中
                </span>
              )}
            </>
          )}
        </div>

        {/* Children if expanded and chapter */}
        {isChapter && isExpanded(node.conceptId) && (
          <div className="pl-6 pr-1 space-y-0.5">
            {node.children?.map((child) => (
              <React.Fragment key={child.conceptId}>
                {/* Concept item */}
                <div className="flex items-center justify-between py-1 px-3 rounded hover:bg-[#1c2438]/60 text-[#94a3b8] hover:text-[#f8fafc] cursor-pointer">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#38bdf8] animate-pulse"></span>
                    <span className="font-label-code-sm text-label-code-sm text-white/80">
                      {/* We don't have a numbering for concepts; we can use index? */}
                      {/* We'll just show a placeholder like "•" */}
                      {/* For now, we'll skip the number */}
                    </span>
                    <span className="truncate font-semibold text-[#f8fafc]">{child.term}</span>
                  </div>
                  {/* Check mark for concept */}
                  <span className="material-symbols-outlined text-[13px] text-[#34d399]">
                    check_circle
                  </span>
                </div>
              </React.Fragment>
            ))}
          </div>
        )}
      </>
    );
  };

  return (
    <div className="flex h-[calc(100vh-4rem)] bg-[#0b0f17]">
      {/* ========================================================================= */}
      {/* 1. LEFT COLUMN: OutlineTree (知識大綱樹 ~260px)                            */}
      {/* ========================================================================= */}
      <aside
        className="w-[260px] shrink-0 h-full flex flex-col bg-[#111827] border-r border-[#1e293b] transition-all duration-200 z-10"
        id="tree-panel"
      >
        {/* Panel Header */}
        <div className="p-4 pb-2 flex flex-col gap-2 bg-[#111827] border-b border-[#1e293b]/70">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1">
              <span className="material-symbols-outlined text-[18px] text-primary">
                account_tree
              </span>
              <span className="title-md font-title-md text-[#f8fafc]">課程知識大綱</span>
            </div>
            <div className="flex items-center gap-1">
              <button
                className="p-1 rounded text-[#94a3b8] hover:text-[#f8fafc] hover:bg-surface-container-high transition-colors"
                id="toggle-all-tree"
                title="全部摺疊/展開"
                type="button"
                onClick={() => {
                  // Implement toggle all logic
                }}
              >
                <span className="material-symbols-outlined text-[16px]">unfold_less</span>
              </button>
              <button
                className="flex items-center gap-0.5 px-1 py-0.5 rounded text-body-sm font-body-sm bg-[#1e2238] border border-[#3b4277] text-primary hover:bg-[#6366f1] hover:text-white transition-all"
                id="add-chapter-btn"
                title="新增章節"
                type="button"
              >
                <span className="material-symbols-outlined text-[14px]">add</span>
                <span>章節</span>
              </button>
            </div>
          </div>

          {/* Outline Search Filter */}
          <div className="relative w-full">
            <span className="material-symbols-outlined absolute left-2.5 top-1/2 -translate-y-1/2 text-[15px] text-[#94a3b8]">
              search
            </span>
            <input
              className="w-full pl-8 pr-3 py-1 bg-[#0a0e16] border border-[#1e293b] text-[#e2e8f0] text-body-sm font-body-sm rounded-lg focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary shadow-inner placeholder:text-[#94a3b8]/60"
              id="outline-search"
              placeholder="檢索章節或概念..."
              type="text"
              onChange={(e) => {
                // Implement search filtering
              }}
            />
          </div>
        </div>

        {/* Tree Nodes List */}
        <div className="flex-1 overflow-y-auto px-3 py-2 space-y-0.5 text-body-sm font-body-sm">
          {/* Render root nodes (chapters) */}
          {conceptTree.rootNodeIds?.map((rootId) => {
            const rootNode = conceptTree.nodes?.find((n) => n.conceptId === rootId);
            if (!rootNode) return null;
            return renderTreeNode(rootNode, 0);
          })}
        </div>

        {/* Tree Footer Actions & Drag info */}
        <div className="p-3 bg-[#0d121c] border-t border-[#1e293b] flex flex-col gap-1 text-body-sm font-body-sm text-[#94a3b8]">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1 text-[#34d399]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#34d399]"></span>
              大綱樹同步完畢
            </span>
            <span className="font-label-code-sm text-label-code-sm text-[#94a3b8]">8 章節</span>
          </div>
          <p className="text-label-code-sm font-label-code-sm text-[#94a3b8]/80 flex items-center gap-1">
            <span className="material-symbols-outlined text-[13px]">drag_indicator</span>
            長按可拖曳調換章節層次順序
          </p>
        </div>
      </aside>

      {/* Resizer Divider L-C */}
      <div
        className="w-0.5 bg-[#1e293b] hover:bg-primary cursor-col-resize transition-colors shrink-0"
        id="resizer-left"
        role="separator"
        aria-label="左右面板分隔條"
      ></div>

      {/* ========================================================================= */}
      {/* 2. CENTER COLUMN: OutlineEditor (TipTap 筆記編輯器 flex-1)              */}
      {/* ========================================================================= */}
      {viewMode !== "tree" && (
        <section
          className={`flex-1 min-w-[540px] h-full flex flex-col bg-[#0f172a] overflow-hidden shadow-inner ${viewMode === "split" ? "border-r border-[#1e293b]" : ""}`}
        >
          {/* Top Action Ribbon & Rich Toolbar */}
          <div className="h-12 px-4 bg-[#111827]/80 backdrop-blur border-b border-[#1e293b] flex items-center justify-between gap-3 shrink-0 z-10">
            {/* Breadcrumb & Status */}
            <div className="flex items-center gap-2 min-w-0">
              <div className="flex items-center gap-1 text-body-sm font-body-sm text-[#94a3b8] truncate">
                <span className="text-[#94a3b8]">第 2 章 CPU 運作機制</span>
                <span className="text-outline-variant">/</span>
                <span className="font-medium text-[#f8fafc] text-headline-sm font-headline-sm">
                  2.1 指令管線化
                </span>
              </div>
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-label-code-sm font-label-code-sm bg-[#102a24] text-[#6ee7b7] border border-[#14532d] shrink-0">
                <span className="material-symbols-outlined text-[11px]">sync</span>
                已儲存
              </span>
            </div>

            {/* View Controls & Tool Toggles */}
            <div className="flex items-center gap-2 shrink-0">
              {/* View switcher */}
              <div className="flex items-center bg-[#0a0e16] border border-[#1e293b] p-0.5 rounded-lg text-body-sm font-body-sm">
                <button
                  className="px-2.5 py-1 rounded bg-[#1e293b] text-primary font-medium shadow-sm flex items-center gap-1"
                  type="button"
                  onClick={() => onViewModeChange("tree")}
                >
                  <span className="material-symbols-outlined text-[15px]">article</span>
                  <span>筆記</span>
                </button>
                <button
                  className="px-2.5 py-1 rounded text-[#94a3b8] hover:text-[#f8fafc] flex items-center gap-1"
                  type="button"
                  onClick={() => onViewModeChange("split")}
                >
                  <span className="material-symbols-outlined text-[15px]">view_column</span>
                  <span>雙欄對齊</span>
                </button>
                <button
                  className="px-2.5 py-1 rounded text-[#94a3b8] hover:text-[#f8fafc] flex items-center gap-1"
                  type="button"
                  onClick={() => onViewModeChange("canvas")}
                >
                  <span className="material-symbols-outlined text-[15px]">fullscreen</span>
                  <span>聚焦</span>
                </button>
              </div>
              <div
                className="h-4 w-0.5 bg-[#1e293b]"
                role="separator"
                aria-label="垂直分隔條"
              ></div>
              {/* Secondary Actions */}
              <button
                className="p-1.5 rounded-lg text-[#94a3b8] hover:text-[#f8fafc] hover:bg-surface-container transition-colors"
                title="歷史版本"
                type="button"
              >
                <span className="material-symbols-outlined text-[18px]">history</span>
              </button>
              <button
                className="p-1.5 rounded-lg text-[#94a3b8] hover:text-primary hover:bg-surface-container transition-colors"
                id="toggle-evidence-panel"
                title="收展右側圖譜面板"
                type="button"
                onClick={() => {
                  // Toggle evidence panel
                }}
              >
                <span className="material-symbols-outlined text-[18px]">dock_to_left</span>
              </button>
            </div>
          </div>

          {/* Notion Style Floating Formatting Bar (Compact Subheader) */}
          <div className="h-10 px-4 bg-[#0d1322] border-b border-[#1e293b]/70 flex items-center gap-1 overflow-x-auto text-body-sm font-body-sm shrink-0">
            <button
              className="px-2 py-1 rounded hover:bg-surface-container-high text-[#f8fafc] font-bold text-body-sm font-body-sm"
              type="button"
            >
              B
            </button>
            <button
              className="px-2 py-1 rounded hover:bg-surface-container-high text-[#f8fafc] italic text-body-sm font-body-sm font-body-sm"
              type="button"
            >
              I
            </button>
            <button
              className="px-2 py-1 rounded hover:bg-surface-container-high text-[#f8fafc] line-through text-body-sm font-body-sm font-body-sm"
              type="button"
            >
              S
            </button>
            <div
              className="h-3 w-0.5 bg-outline-variant/30 mx-1"
              role="separator"
              aria-label="垂直分隔條"
            ></div>
            <button
              className="px-2 py-0.5 rounded hover:bg-surface-container-high text-[#f8fafc] font-semibold text-body-sm font-body-sm"
              type="button"
            >
              H1
            </button>
            <button
              className="px-2 py-0.5 rounded hover:bg-surface-container-high text-[#f8fafc] font-semibold text-body-sm font-body-sm"
              type="button"
            >
              H2
            </button>
            <button
              className="px-2 py-0.5 rounded hover:bg-surface-container-high text-[#f8fafc] text-body-sm font-body-sm flex items-center"
              type="button"
            >
              <span className="material-symbols-outlined text-[16px]">format_quote</span>
            </button>
            <button
              className="px-2 py-0.5 rounded hover:bg-surface-container-high font-label-code-sm text-label-code-sm text-[#f8fafc]"
              type="button"
            >
              <span className="material-symbols-outlined text-[14px]">link</span>
              <span>[[雙向連結]]</span>
            </button>
            {/* AI Semantic Enhancer */}
            <button
              className="ml-auto px-2.5 py-1 rounded-full bg-gradient-to-r from-[#6366f1] to-[#38bdf8] text-white text-body-sm font-body-sm flex items-center gap-1 shadow-md shadow-indigo-900/30 hover:opacity-95 transition-opacity"
              type="button"
            >
              <span className="material-symbols-outlined text-[14px]">auto_awesome</span>
              <span>語意自動對齊</span>
            </button>
          </div>

          {/* Main Rich Document Content (TipTap Canvas) */}
          <div className="flex-1 overflow-y-auto px-6 lg:px-8 py-6 space-y-6 max-w-4xl mx-auto w-full bg-[#0f172a]">
            {/* Header Banner Meta */}
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-label-code-sm font-label-code-sm font-medium bg-[#1e2238] text-primary border border-[#3b4277]">
                  #計算機架構
                </span>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-label-code-sm font-label-code-sm font-medium bg-surface-container-high text-[#94a3b8] border border-outline-variant/30">
                  #效能優化
                </span>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-label-code-sm font-label-code-sm font-medium bg-[#082f49] text-secondary border border-sky-800">
                  #管線技術
                </span>
                <span className="text-body-sm font-body-sm text-[#94a3b8] ml-auto">
                  最後編修：今天 14:28 (AI 協助排版)
                </span>
              </div>
              <h1 className="text-headline-lg font-headline-lg lg:text-display-lg lg:font-display-lg text-[#f8fafc] tracking-tight">
                指令管線化 (Instruction Pipelining)
              </h1>
              <p className="text-body-lg font-body-lg text-[#94a3b8] leading-relaxed">
                透過將 CPU 指令週期拆分為多個重疊執行的子階段，在維持單一指令執行延遲 (Latency)
                的前提下，顯著提升指令通量 (Throughput)。
              </p>
            </div>

            {/* Notion Style Math / Key Takeaway Callout Block (Violet Border + Dark Obsidian) */}
            <div
              className="relative overflow-hidden rounded-xl bg-[#131d31] border border-indigo-500/30 p-6 shadow-lg shadow-black/30"
              role="region"
              aria-label="關鍵取訊方塊"
            >
              <div
                className="absolute left-0 top-0 bottom-0 w-1.5 bg-[#6366f1]"
                aria-hidden="true"
              ></div>
              <div className="flex items-start gap-3">
                <div
                  className="p-2 rounded-lg bg-[#1e2238] border border-[#3b4277] text-primary shrink-0"
                  role="img"
                  aria-label="函數圖示"
                >
                  <span className="material-symbols-outlined text-[20px]">functions</span>
                </div>
                <div className="space-y-1.5 flex-1 min-w-0">
                  <h2 className="text-headline-sm font-headline-sm text-[#f8fafc]">
                    核心加速比公式 (Speedup Ratio)
                  </h2>
                  <div className="p-2.5 rounded-lg bg-[#090d16] border border-[#1e293b] font-label-code-md text-label-code-md text-[#e2e8f0] shadow-inner flex items-center justify-between">
                    <span className="">Speedup (S) = (n × k) / (k + n - 1)</span>
                    <span className="text-label-code-sm font-label-code-sm text-primary font-medium">
                      當 n → ∞ 時，S ≈ k (級數)
                    </span>
                  </div>
                  <p className="text-body-sm font-body-sm text-[#94a3b8] leading-relaxed">
                    式中{" "}
                    <span className="font-label-code-sm text-label-code-sm font-medium text-primary">
                      k
                    </span>{" "}
                    為管線階段數，
                    <span className="font-label-code-sm text-label-code-sm font-medium text-primary">
                      n
                    </span>{" "}
                    為連續執行之指令總量。理想條件下，吞吐量將提高為非管線系統之{" "}
                    <span className="font-semibold text-[#f8fafc]">k 倍</span>。
                  </p>
                </div>
              </div>
            </div>

            {/* Section: Five-stage Pipeline */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <h2 className="text-headline-lg font-headline-lg text-[#f8fafc] flex items-center gap-2">
                  <span
                    className="w-2 h-5 rounded-full bg-secondary"
                    role="img"
                    aria-label="五段階段圖示"
                  ></span>
                  經典五大階段 (Five-stage MIPS Pipeline)
                </h2>
                <button
                  className="text-body-sm font-body-sm text-primary hover:text-white flex items-center gap-0.5 transition-colors"
                  type="button"
                >
                  <span className="">展開細部電路圖</span>
                  <span className="material-symbols-outlined text-[16px]">chevron_right</span>
                </button>
              </div>
              {/* Pipeline Interactive Breakdown Visual Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-5 gap-2 pt-1">
                <div
                  className="p-3 rounded-xl bg-[#131d31] border border-[#1e293b] hover:border-indigo-500/50 hover:bg-[#18233a] transition-all"
                  role="img"
                  aria-label="取指階段"
                >
                  <span className="text-label-code-sm font-label-code-sm font-bold text-primary block mb-1">
                    01 / IF
                  </span>
                  <div className="font-semibold text-body-md font-body-md text-[#f8fafc]">
                    Instruction Fetch
                  </div>
                  <div className="text-body-sm font-body-sm text-[#94a3b8] mt-1">
                    從指令記憶體 (I-Cache) 讀取指令，PC += 4。
                  </div>
                </div>
                <div
                  className="p-3 rounded-xl bg-[#131d31] border border-[#1e293b] hover:border-indigo-500/50 hover:bg-[#18233a] transition-all"
                  role="img"
                  aria-label="指令解碼階段"
                >
                  <span className="text-label-code-sm font-label-code-sm font-bold text-primary block mb-1">
                    02 / ID
                  </span>
                  <div className="font-semibold text-body-md font-body-md text-[#f8fafc]">
                    Instruction Decode
                  </div>
                  <div className="text-body-sm font-body-sm text-[#94a3b8] mt-1">
                    解碼指令，生成控制信號並讀取暫存器。
                  </div>
                </div>
                <div
                  className="p-3 rounded-xl bg-[#131d31] border border-[#1e293b] hover:border-indigo-500/50 hover:bg-[#18233a] transition-all"
                  role="img"
                  aria-label="執行階段"
                >
                  <span className="text-label-code-sm font-label-code-sm font-bold text-primary block mb-1">
                    03 / EX
                  </span>
                  <div className="font-semibold text-body-md font-body-md text-[#f8fafc]">
                    Execute
                  </div>
                  <div className="text-body-sm font-body-sm text-[#94a3b8] mt-1">
                    執行運算或邏輯操作，執行分支跳躍。
                  </div>
                </div>
                <div
                  className="p-3 rounded-xl bg-[#131d31] border border-[#1e293b] hover:border-indigo-500/50 hover:bg-[#18233a] transition-all"
                  role="img"
                  aria-label="存取階段"
                >
                  <span className="text-label-code-sm font-label-code-sm font-bold text-primary block mb-1">
                    04 / MEM
                  </span>
                  <div className="font-semibold text-body-md font-body-md text-[#f8fafc]">
                    Memory Access
                  </div>
                  <div className="text-body-sm font-body-sm text-[#94a3b8] mt-1">
                    讀取或寫入資料記憶體 (D-Cache)，執行載入/存儲指令。
                  </div>
                </div>
                <div
                  className="p-3 rounded-xl bg-[#131d31] border border-[#1e293b] hover:border-indigo-500/50 hover:bg-[#18233a] transition-all"
                  role="img"
                  aria-label="寫回階段"
                >
                  <span className="text-label-code-sm font-label-code-sm font-bold text-primary block mb-1">
                    05 / WB
                  </span>
                  <div className="font-semibold text-body-md font-body-md text-[#f8fafc]">
                    Write Back
                  </div>
                  <div className="text-body-sm font-body-sm text-[#94a3b8] mt-1">
                    將結果寫回暫存器，完成指令執行。
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
