import React, { useState, useRef } from "react";
import type { ConceptNodeWithMeta, EvidenceData, OutlineTreeData } from "../../../types/course";
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
              <span className="text-title-md font-title-md text-[#f8fafc]">課程知識大綱</span>
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
          {/* Chapter 1 (Collapsed) */}
          <div className="tree-group">
            <button
              className={`group flex items-center justify-between px-3 py-1.5 rounded-lg hover:bg-[#1c2438] cursor-pointer text-[#e2e8f0] transition-colors ${expandedNodeIds.includes("ch1") ? "bg-[#19223a] border border-[#2e3b60] text-[#f8fafc] font-semibold" : ""}`}
              id="chapter-1-toggle"
              title="切換第 1 章節"
              type="button"
              onClick={(e) => {
                onNodeExpandToggle("ch1");
              }}
            >
              <div className="flex items-center gap-1.5 min-w-0">
                <span
                  className={`material-symbols-outlined text-[16px] text-[#94a3b8] chevron-icon transition-transform ${expandedNodeIds.includes("ch1") ? "rotate-90" : ""}`}
                >
                  chevron_right
                </span>
                <span className="font-label-code-sm text-label-code-sm font-medium text-[#94a3b8]">
                  1.
                </span>
                <span className="truncate font-medium">計算機架構總論</span>
              </div>
              <span className="text-label-code-sm font-label-code-sm px-1.5 py-0.2 rounded-full bg-[#102a24] text-[#6ee7b7] border border-[#14532d] shrink-0">
                100%
              </span>
            </button>
            {expandedNodeIds.includes("ch1") && (
              <div className="pl-6 pr-1 space-y-0.5">
                <div className="flex items-center justify-between py-1 px-3 rounded hover:bg-[#1c2438]/60 text-[#94a3b8] hover:text-[#f8fafc] cursor-pointer">
                  <span className="truncate">1.1 馮諾伊曼架構</span>
                  <span className="material-symbols-outlined text-[13px] text-[#34d399]">
                    check_circle
                  </span>
                </div>
                <div className="flex items-center justify-between py-1 px-3 rounded hover:bg-[#1c2438]/60 text-[#94a3b8] hover:text-[#f8fafc] cursor-pointer">
                  <span className="truncate">1.2 哈佛架構對比</span>
                  <span className="material-symbols-outlined text-[13px] text-[#34d399]">
                    check_circle
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Chapter 2 (Active Focus) */}
          <div className="tree-group">
            <button
              className={`group flex items-center justify-between px-3 py-1.5 rounded-lg bg-[#19223a] border border-[#2e3b60] text-[#f8fafc] font-semibold cursor-pointer ${!expandedNodeIds.includes("ch2") ? "hover:bg-[#1c2438]":""}`}
              id="chapter-2-toggle"
              title="切換第 2 章節"
              type="button"
              onClick={(e) => {
                onNodeExpandToggle("ch2");
              }}
            >
              <div className="flex items-center gap-1.5 min-w-0">
                <span
                  className={`material-symbols-outlined text-[16px] text-primary chevron-icon transition-transform ${expandedNodeIds.includes("ch2") ? "rotate-90" : ""}`}
                >
                  expand_more
                </span>
                <span className="font-label-code-sm text-label-code-sm text-primary font-semibold">
                  2.
                </span>
                <span className="truncate font-semibold text-[#f8fafc]">指令管線化</span>
              </div>
              <span className="text-body-sm font-body-sm px-1.5 py-0.5 rounded-full bg-[#1e2238] text-primary shrink-0 font-normal border border-[#3b4277]/50">
                4 子概念
              </span>
            </button>
            {expandedNodeIds.includes("ch2") && (
              <div className="pl-5 pr-1 space-y-1 my-1">
                {/* 2.1 Currently Editing Node */}
                <div
                  className={`relative flex items-center justify-between py-1.5 px-3 rounded-lg bg-[#6366f1] text-white shadow-md shadow-indigo-950/60 cursor-pointer ${editingNodeId === "node-2-1" ? "" : ""}`}
                >
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#38bdf8] animate-pulse"></span>
                    <span className="font-label-code-sm text-label-code-sm text-white/80">2.1</span>
                    <span className="truncate font-semibold text-[#f8fafc]">指令管線化</span>
                  </div>
                  <span className="text-label-code-sm font-label-code-sm px-1.5 py-0.2 rounded bg-[#312e81] text-[#c0c1ff] font-medium border border-indigo-400/30">
                    編輯中
                  </span>
                </div>
                {/* 2.2 */}
                <div className="flex items-center justify-between py-1.5 px-3 rounded-lg hover:bg-[#1c2438] text-[#94a3b8] hover:text-[#f8fafc] cursor-pointer group">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="font-label-code-sm text-label-code-sm text-[#94a3b8]">
                      2.2
                    </span>
                    <span className="truncate">管線冒險 (Hazards)</span>
                  </div>
                  <span className="material-symbols-outlined text-[14px] text-[#94a3b8] opacity-0 group-hover:opacity-100">
                    arrow_forward
                  </span>
                </div>
                {/* 2.3 */}
                <div className="flex items-center justify-between py-1.5 px-3 rounded-lg hover:bg-[#1c2438] text-[#94a3b8] hover:text-[#f8fafc] cursor-pointer group">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="font-label-code-sm text-label-code-sm text-[#94a3b8]">
                      2.3
                    </span>
                    <span className="truncate">分支預測技術</span>
                  </div>
                  <span className="material-symbols-outlined text-[14px] text-[#94a3b8] opacity-0 group-hover:opacity-100">
                    arrow_forward
                  </span>
                </div>
                {/* 2.4 */}
                <div className="flex items-center justify-between py-1.5 px-3 rounded-lg hover:bg-[#1c2438] text-[#94a3b8] hover:text-[#f8fafc] cursor-pointer group">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="font-label-code-sm text-label-code-sm text-[#94a3b8]">
                      2.4
                    </span>
                    <span className="truncate">超純量與動態調度</span>
                  </div>
                  <span className="material-symbols-outlined text-[14px] text-[#94a3b8] opacity-0 group-hover:opacity-100">
                    arrow_forward
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Chapter 3 */}
          <div className="tree-group">
            <button
              className={`group flex items-center justify-between px-3 py-1.5 rounded-lg hover:bg-[#1c2438] cursor-pointer text-[#e2e8f0] transition-colors ${expandedNodeIds.includes("ch3") ? "bg-[#19223a] border border-[#2e3b60] text-[#f8fafc] font-semibold" : ""}`}
              id="chapter-3-toggle"
              title="切換第 3 章節"
              type="button"
              onClick={(e) => {
                onNodeExpandToggle("ch3");
              }}
            >
              <div className="flex items-center gap-1.5 min-w-0">
                <span
                  className={`material-symbols-outlined text-[16px] text-[#94a3b8] chevron-icon transition-transform ${expandedNodeIds.includes("ch3") ? "rotate-90" : ""}`}
                >
                  chevron_right
                </span>
                <span className="font-label-code-sm text-label-code-sm text-[#94a3b8]">3.</span>
                <span className="truncate">記憶體階層架構</span>
              </div>
              <span className="text-label-code-sm font-label-code-sm px-1.5 py-0.2 rounded-full bg-surface-container-high text-on-surface-variant shrink-0">
                45%
              </span>
            </button>
            {expandedNodeIds.includes("ch3") && (
              <div className="pl-6 pr-1 space-y-0.5">
                <div className="py-1 px-3 rounded hover:bg-[#1c2438]/60 text-[#94a3b8] hover:text-[#f8fafc] cursor-pointer truncate">
                  3.1 快取記憶體對映原理
                </div>
                <div className="py-1 px-3 rounded hover:bg-[#1c2438]/60 text-[#94a3b8] hover:text-[#f8fafc] cursor-pointer truncate">
                  3.2 快取缺失 (Cache Misses)
                </div>
              </div>
            )}
          </div>

          {/* Chapter 4 */}
          <div className="tree-group">
            <button
              className={`group flex items-center justify-between px-3 py-1.5 rounded-lg hover:bg-[#1c2438] cursor-pointer text-[#e2e8f0] transition-colors ${expandedNodeIds.includes("ch4") ? "bg-[#19223a] border border-[#2e3b60] text-[#f8fafc] font-semibold" : ""}`}
              id="chapter-4-toggle"
              title="切換第 4 章節"
              type="button"
              onClick={(e) => {
                onNodeExpandToggle("ch4");
              }}
            >
              <div className="flex items-center gap-1.5 min-w-0">
                <span
                  className={`material-symbols-outlined text-[16px] text-[#94a3b8] chevron-icon transition-transform ${expandedNodeIds.includes("ch4") ? "rotate-90" : ""}`}
                >
                  chevron_right
                </span>
                <span className="font-label-code-sm text-label-code-sm text-[#94a3b8]">4.</span>
                <span className="truncate">虛擬記憶體與 TLB</span>
              </div>
              <span className="text-label-code-sm font-label-code-sm px-1.5 py-0.2 rounded-full bg-surface-container-high text-on-surface-variant shrink-0">
                20%
              </span>
            </button>
            {expandedNodeIds.includes("ch4") && (
              <div className="pl-6 pr-1 space-y-0.5">
                <div className="py-1 px-3 rounded hover:bg-[#1c2438]/60 text-[#94a3b8] hover:text-[#f8fafc] cursor-pointer truncate">
                  4.1 分頁式定址機制 (Paging)
                </div>
              </div>
            )}
          </div>

          {/* Chapter 5 */}
          <div className="tree-group">
            <div className="group flex items-center justify-between px-3 py-1.5 rounded-lg hover:bg-[#1c2438] cursor-pointer text-[#e2e8f0] transition-colors">
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="material-symbols-outlined text-[16px] text-[#94a3b8]">
                  chevron_right
                </span>
                <span className="font-label-code-sm text-label-code-sm text-[#94a3b8]">5.</span>
                <span className="truncate">I/O 與中斷處理系統</span>
              </div>
              <span className="text-label-code-sm font-label-code-sm px-1.5 py-0.2 rounded-full bg-surface-container-high text-on-surface-variant shrink-0">
                0%
              </span>
            </div>
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
              <div className="h-4 w-0.5 bg-[#1e293b]" role="separator" aria-label="垂直分隔條"></div>
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
            <button className="px-2 py-1 rounded hover:bg-surface-container-high text-[#f8fafc] font-bold text-body-sm font-body-sm" type="button">
              B
            </button>
            <button className="px-2 py-1 rounded hover:bg-surface-container-high text-[#f8fafc] italic text-body-sm font-body-sm font-body-sm" type="button">
              I
            </button>
            <button className="px-2 py-1 rounded hover:bg-surface-container-high text-[#f8fafc] line-through text-body-sm font-body-sm font-body-sm" type="button">
              S
            </button>
            <div className="h-3 w-0.5 bg-outline-variant/30 mx-1" role="separator" aria-label="垂直分隔條"></div>
            <button className="px-2 py-0.5 rounded hover:bg-surface-container-high text-[#f8fafc] font-semibold text-body-sm font-body-sm" type="button">
              H1
            </button>
            <button className="px-2 py-0.5 rounded hover:bg-surface-container-high text-[#f8fafc] font-semibold text-body-sm font-body-sm" type="button">
              H2
            </button>
            <button className="px-2 py-0.5 rounded hover:bg-surface-container-high text-[#f8fafc] text-body-sm font-body-sm flex items-center" type="button">
              <span className="material-symbols-outlined text-[16px]">format_quote</span>
            </button>
            <button className="px-2 py-0.5 rounded hover:bg-surface-container-high font-label-code-sm text-label-code-sm text-[#f8fafc]" type="button">
              <span className="material-symbols-outlined text-[14px]">link</span>
              <span>[[雙向連結]]</span>
            </button>
            {/* AI Semantic Enhancer */}
            <button className="ml-auto px-2.5 py-1 rounded-full bg-gradient-to-r from-[#6366f1] to-[#38bdf8] text-white text-body-sm font-body-sm flex items-center gap-1 shadow-md shadow-indigo-900/30 hover:opacity-95 transition-opacity" type="button">
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
            <div className="relative overflow-hidden rounded-xl bg-[#131d31] border border-indigo-500/30 p-6 shadow-lg shadow-black/30" role="region" aria-label="關鍵取訊方塊">
              <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-[#6366f1]" aria-hidden="true"></div>
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-[#1e2238] border border-[#3b4277] text-primary shrink-0" role="img" aria-label="函數圖示">
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
                <h2 className="text-headline-lg font-headline-lg text-[#f8fafc] flex items-center gap-2" type="button">
                  <span className="w-2 h-5 rounded-full bg-secondary" role="img" aria-label="五段階段圖示"></span>
                  經典五大階段 (Five-stage MIPS Pipeline)
                </h2>
                <button className="text-body-sm font-body-sm text-primary hover:text-white flex items-center gap-0.5 transition-colors" type="button">
                  <span className="">展開細部電路圖</span>
                  <span className="material-symbols-outlined text-[16px]">chevron_right</span>
                </button>
              </div>
              {/* Pipeline Interactive Breakdown Visual Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-5 gap-2 pt-1">
                <div className="p-3 rounded-xl bg-[#131d31] border border-[#1e293b] hover:border-indigo-500/50 hover:bg-[#18233a] transition-all" role="img" aria-label="取指階段">
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
                <div className="p-3 rounded-xl bg-[#131d31] border border-[#1e293b] hover:border-indigo-500/50 hover:bg-[#18233a] transition-all" role="img" aria-label="指令解碼階段">
                  <span className="text-label-code-sm font-label-code-sm font-bold text-primary block mb-1">
                    02 / ID
                  </span>
                  <div className="font-semibold text-body-md font-body-md text-[#f8fafc]">
                    Instruction Decode
                  </div>
                  <div className="text-body-sm font-body-sm text-[#94a3b8] mt-1">
                    譯碼控制信號，同時自 Register File 讀取暫存器運算元。
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-[#131d31] border border-[#1e293b] hover:border-indigo-500/50 hover:bg-[#18233a] transition-all" role="img" aria-label="執行階段">
                  <span className="text-label-code-sm font-label-code-sm font-bold text-primary block mb-1">
                    03 / EX
                  </span>
                  <div className="font-semibold text-body-md font-body-md text-[#f8fafc]">
                    Execution (ALU)
                  </div>
                  <div className="text-body-sm font-body-sm text-[#94a3b8] mt-1">
                    執行算術運算或計算記憶體存取位址。
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-[#131d31] border border-[#1e293b] hover:border-indigo-500/50 hover:bg-[#18233a] transition-all" role="img" aria-label="記憶體存取階段">
                  <span className="text-label-code-sm font-label-code-sm font-bold text-primary block mb-1">
                    04 / MEM
                  </span>
                  <div className="font-semibold text-body-md font-body-md text-[#f8fafc]">
                    Memory Access
                  </div>
                  <div className="text-body-sm font-body-sm text-[#94a3b8] mt-1">
                    讀取或寫入資料記憶體 (D-Cache)。
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-[#131d31] border border-[#1e293b] hover:border-indigo-500/50 hover:bg-[#18233a] transition-all" role="img" aria-label="寫回階段">
                  <span className="text-label-code-sm font-label-code-sm font-bold text-primary block mb-1">
                    05 / WB
                  </span>
                  <div className="font-semibold text-body-md font-body-md text-[#f8fafc]">
                    Write Back
                  </div>
                  <div className="text-body-sm font-body-sm text-[#94a3b8] mt-1">
                    將結果寫回暫存器檔案。
                  </div>
                </div>
              </div>
            </div>
        </section>
      )}