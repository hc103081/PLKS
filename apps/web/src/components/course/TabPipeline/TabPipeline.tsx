import React from "react";
import type {
  PipelineConfig,
  PipelineNodeKey,
  PipelineNodeStatus,
  PipelineStatusResponse,
} from "../../../types/course";
import { NODE_DESCRIPTIONS, NODE_LABELS, NODE_ORDER } from "../../../types/course";
import { LoadingSkeleton } from "../../shared";

interface TabPipelineProps {
  pipelineStatus: PipelineStatusResponse | undefined;
  sessionId: string | undefined;
  selectedNode: PipelineNodeKey | null;
  onNodeSelect: (node: PipelineNodeKey | null) => void;
  isLoading: boolean;
  configDrawerOpen: boolean;
  nodeDetailDrawerOpen: boolean;
  onConfigDrawerToggle: (open: boolean) => void;
  onNodeDetailDrawerToggle: (open: boolean) => void;
}

export function TabPipeline({
  pipelineStatus,
  sessionId,
  selectedNode,
  onNodeSelect,
  isLoading,
  configDrawerOpen,
  nodeDetailDrawerOpen,
  onConfigDrawerToggle,
  onNodeDetailDrawerToggle,
}: TabPipelineProps) {
  if (isLoading || !pipelineStatus) {
    return (
      <div className="p-8">
        <div className="max-w-6xl mx-auto animate-pulse">
          <LoadingSkeleton variant="card" height={600} />
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-6 max-w-[1440px] mx-auto relative">
      {/* Pipeline DAG Visualization */}
      <div className="lg:pr-96">
        <PipelineDAG
          nodes={pipelineStatus.nodes}
          currentNode={pipelineStatus.currentNode}
          selectedNode={selectedNode}
          onNodeClick={onNodeSelect}
          config={pipelineStatus.config}
        />
      </div>

      {/* Node Detail Drawer */}
      {nodeDetailDrawerOpen && selectedNode && (
        <PipelineNodeDetailDrawer
          node={getNodeStatus(pipelineStatus.nodes, selectedNode)}
          pipelineStatus={pipelineStatus}
          onClose={() => onNodeDetailDrawerToggle(false)}
          onRetry={() => {
            // Trigger retry from this node
          }}
          onConfig={() => {
            onNodeDetailDrawerToggle(false);
            onConfigDrawerToggle(true);
          }}
        />
      )}

      {/* Config Drawer */}
      {configDrawerOpen && (
        <PipelineConfigDrawer
          config={pipelineStatus.config}
          onClose={() => onConfigDrawerToggle(false)}
          onSave={(_newConfig) => {
            // Save config and retry
          }}
        />
      )}
    </div>
  );
}

function getNodeStatus(
  nodes: PipelineNodeStatus[],
  nodeKey: PipelineNodeKey,
): PipelineNodeStatus | undefined {
  return nodes.find((n) => n.node === nodeKey);
}

// Pipeline DAG Component
function PipelineDAG({
  nodes,
  currentNode,
  selectedNode,
  onNodeClick,
  config,
}: {
  nodes: PipelineNodeStatus[];
  currentNode: PipelineNodeKey | undefined;
  selectedNode: PipelineNodeKey | null;
  onNodeClick: (node: PipelineNodeKey | null) => void;
  config: PipelineConfig;
}) {
  const nodeMap = new Map(nodes.map((n) => [n.node, n]));

  return (
    <div className="card-base p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="font-title-md font-bold text-on-surface">AI 管線進度</h3>
        <div className="flex items-center gap-4">
          <span className="font-label-code-sm text-on-surface-variant">
            融合深度: {config.fusionLevel === "strict_alignment" ? "嚴格對齊" : "高層摘要"}
          </span>
          <span className="font-label-code-sm text-on-surface-variant">
            輸出:{" "}
            {config.outputTemplates
              .map((t) => (t === "knowledge_nodes" ? "知識節點" : "閃卡題庫"))
              .join(", ")}
          </span>
        </div>
      </div>

      {/* Pipeline Flow */}
      <div className="relative">
        {/* Connecting line */}
        <div
          className="absolute left-10 top-0 bottom-0 w-0.5 bg-outline"
          style={{ left: "2.5rem" }}
        />

        <div className="flex flex-col gap-6 pl-12 relative">
          {NODE_ORDER.map((nodeKey: PipelineNodeKey, index: number) => {
            const node = nodeMap.get(nodeKey);
            const status = node?.status || "pending";
            const isSelected = selectedNode === nodeKey;
            const isCurrent = currentNode === nodeKey;

            return (
              <PipelineNode
                key={nodeKey}
                nodeKey={nodeKey}
                node={node}
                status={status}
                index={index}
                isSelected={isSelected}
                isCurrent={isCurrent}
                onClick={() => onNodeClick(nodeKey)}
              />
            );
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="mt-6 flex flex-wrap items-center gap-4 p-4 bg-surface-container-low rounded-lg border border-outline">
        <span className="font-label-code-sm font-bold text-on-surface">圖例：</span>
        <LegendItem color="bg-tertiary" label="已完成" />
        <LegendItem color="bg-amber-500 animate-pulse" label="執行中" />
        <LegendItem color="bg-error" label="失敗" />
        <LegendItem color="bg-outline-variant" label="等待中" />
        <LegendItem color="ring-2 ring-primary" label="已選中" isRing />
      </div>
    </div>
  );
}

function LegendItem({ color, label, isRing }: { color: string; label: string; isRing?: boolean }) {
  return (
    <span className="flex items-center gap-1.5 font-body-sm text-on-surface-variant">
      <span
        className={`w-3 h-3 rounded-full ${isRing ? "bg-transparent" : color} ${isRing ? "ring-2 ring-primary" : ""}`}
      />
      <span>{label}</span>
    </span>
  );
}

function PipelineNode({
  nodeKey,
  node,
  status,
  index,
  isSelected,
  isCurrent,
  onClick,
}: {
  nodeKey: PipelineNodeKey;
  node: PipelineNodeStatus | undefined;
  status: "pending" | "running" | "completed" | "failed";
  index: number;
  isSelected: boolean;
  isCurrent: boolean;
  onClick: () => void;
}) {
  const getStatusColor = () => {
    switch (status) {
      case "completed":
        return "bg-tertiary border-tertiary text-white";
      case "running":
        return "bg-amber-500 border-amber-500 text-white animate-pulse";
      case "failed":
        return "bg-error border-error text-white";
      default:
        return "bg-surface-container-low border-outline text-on-surface-variant";
    }
  };

  const getStatusIcon = () => {
    switch (status) {
      case "completed":
        return "check";
      case "running":
        return "sync";
      case "failed":
        return "error";
      default:
        return "radio_button_unchecked";
    }
  };

  return (
    <div className="relative group">
      <button
        onClick={onClick}
        className={`
          flex items-center gap-4 p-4 rounded-xl border-2 transition-all w-full text-left
          ${isSelected ? "border-primary shadow-glow-primary" : "border-transparent hover:border-primary/30"}
          ${status === "completed" ? "bg-tertiary/5" : status === "running" ? "bg-amber-500/5" : status === "failed" ? "bg-error/5" : ""}
        `}
        aria-pressed={isSelected}
      >
        {/* Status Indicator */}
        <div
          className={`
          flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center
          ${getStatusColor()}
          ${isCurrent && status === "running" ? "animate-pulse" : ""}
          ${isSelected ? "ring-2 ring-primary ring-offset-2 ring-offset-surface" : ""}
        `}
        >
          <span className="material-symbols-outlined text-[20px]">{getStatusIcon()}</span>
        </div>

        {/* Node Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-label-code-sm font-bold text-on-surface-variant">{nodeKey}</span>
            <span className="font-body-sm font-bold text-on-surface">{NODE_LABELS[nodeKey]}</span>
            {isCurrent && status === "running" && (
              <span className="px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/30 text-amber-500 font-label-code-sm animate-pulse">
                執行中
              </span>
            )}
          </div>
          <p className="font-body-sm text-on-surface-variant mt-1 truncate">
            {NODE_DESCRIPTIONS[nodeKey]}
          </p>
          {node && (node.startedAt || node.completedAt) && (
            <div className="flex items-center gap-3 mt-2 font-label-code-sm text-on-surface-variant">
              {node.startedAt && <span>開始: {new Date(node.startedAt).toLocaleTimeString()}</span>}
              {node.completedAt && (
                <span>完成: {new Date(node.completedAt).toLocaleTimeString()}</span>
              )}
              {node.durationMs && <span>耗時: {Math.round(node.durationMs / 1000)}s</span>}
            </div>
          )}
          {node?.error && (
            <div className="mt-2 p-2 bg-error/10 border border-error/30 rounded text-error font-body-sm">
              {node.error}
            </div>
          )}
        </div>

        {/* Duration / Actions */}
        <div className="flex items-center gap-2">
          {node?.durationMs && (
            <span className="font-label-code-sm text-on-surface-variant">
              {Math.round(node.durationMs / 1000)}s
            </span>
          )}
          {status === "failed" && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onClick();
              }}
              className="btn-danger text-xs px-3 py-1"
            >
              重試
            </button>
          )}
        </div>
      </button>

      {/* Connection line to next node */}
      {index < NODE_ORDER.length - 1 && (
        <div
          className="absolute left-[20px] top-[50px] bottom-0 w-0.5"
          style={{
            background:
              status === "completed" ? "#10B981" : status === "running" ? "#F59E0B" : "#334155",
          }}
        />
      )}
    </div>
  );
}

// Node Detail Drawer
function PipelineNodeDetailDrawer({
  node,
  pipelineStatus,
  onClose,
  onRetry,
  onConfig,
}: {
  node: PipelineNodeStatus | undefined;
  pipelineStatus: PipelineStatusResponse;
  onClose: () => void;
  onRetry: () => void;
  onConfig: () => void;
}) {
  if (!node) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-end">
      <div className="w-full lg:w-96 bg-surface-container border-l border-outline shadow-xl h-full flex flex-col animate-in slide-in-right">
        <div className="p-4 border-b border-outline flex items-center justify-between">
          <h3 className="font-title-md font-bold text-on-surface">
            節點 {node.node}: {NODE_LABELS[node.node]}
          </h3>
          <button onClick={onClose} className="btn-ghost p-2">
            <span className="material-symbols-outlined text-[24px]">close</span>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {/* Status & Timing */}
          <div className="p-4 bg-surface-container-low rounded-lg border border-outline">
            <h4 className="font-label-code-sm font-bold text-on-surface-variant mb-3">執行狀態</h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="font-label-code-sm text-on-surface-variant">狀態</span>
                <p className="font-body-sm font-bold text-on-surface capitalize">{node.status}</p>
              </div>
              <div>
                <span className="font-label-code-sm text-on-surface-variant">耗時</span>
                <p className="font-body-sm font-bold text-on-surface">
                  {node.durationMs ? `${Math.round(node.durationMs / 1000)}s` : "—"}
                </p>
              </div>
              <div>
                <span className="font-label-code-sm text-on-surface-variant">開始時間</span>
                <p className="font-body-sm font-bold text-on-surface">
                  {node.startedAt ? new Date(node.startedAt).toLocaleString() : "—"}
                </p>
              </div>
              <div>
                <span className="font-label-code-sm text-on-surface-variant">完成時間</span>
                <p className="font-body-sm font-bold text-on-surface">
                  {node.completedAt ? new Date(node.completedAt).toLocaleString() : "—"}
                </p>
              </div>
            </div>
          </div>

          {/* Error */}
          {node.error && (
            <div className="p-4 bg-error/10 border border-error/30 rounded-lg">
              <h4 className="font-label-code-sm font-bold text-error mb-2">錯誤詳情</h4>
              <pre className="font-body-sm text-error-container/90 whitespace-pre-wrap">
                {node.error}
              </pre>
            </div>
          )}

          {/* Input Preview */}
          {node.inputPreview !== null && node.inputPreview !== undefined && (
            <div>
              <h4 className="font-label-code-sm font-bold text-on-surface-variant mb-2">
                輸入資料
              </h4>
              <pre className="p-3 bg-surface-container-low rounded-lg border border-outline max-h-64 overflow-auto font-body-sm text-on-surface">
                {JSON.stringify(node.inputPreview as unknown, null, 2)}
              </pre>
            </div>
          )}

          {/* Output Preview */}
          {node.outputPreview !== null && node.outputPreview !== undefined && (
            <div>
              <h4 className="font-label-code-sm font-bold text-on-surface-variant mb-2">
                輸出結果
              </h4>
              <pre className="p-3 bg-surface-container-low rounded-lg border border-outline max-h-64 overflow-auto font-body-sm text-on-surface">
                {JSON.stringify(node.outputPreview as unknown, null, 2)}
              </pre>
            </div>
          )}

          {/* Dependencies */}
          <div>
            <h4 className="font-label-code-sm font-bold text-on-surface-variant mb-2">拓撲相依</h4>
            <div className="flex flex-wrap gap-1">
              {NODE_ORDER.filter((n: PipelineNodeKey) => n !== node.node).map(
                (n: PipelineNodeKey) => (
                  <span
                    key={n}
                    className={`px-2 py-1 rounded text-xs font-medium ${
                      pipelineStatus.nodes.find((nn: PipelineNodeStatus) => nn.node === n)
                        ?.status === "completed"
                        ? "bg-tertiary/20 text-tertiary"
                        : "bg-surface-variant text-on-surface-variant"
                    }`}
                  >
                    {n}: {NODE_LABELS[n]}
                  </span>
                ),
              )}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="p-4 border-t border-outline flex gap-2">
          {node.status === "failed" && (
            <button onClick={onRetry} className="btn-danger flex-1">
              <span className="material-symbols-outlined text-[16px]">replay</span>
              重試此節點
            </button>
          )}
          <button onClick={onConfig} className="btn-secondary flex-1">
            <span className="material-symbols-outlined text-[16px]">tune</span>
            調整配置
          </button>
          <button onClick={onClose} className="btn-ghost">
            關閉
          </button>
        </div>
      </div>
    </div>
  );
}

// Config Drawer
function PipelineConfigDrawer({
  config,
  onClose,
  onSave,
}: {
  config: PipelineConfig;
  onClose: () => void;
  onSave: (config: PipelineConfig) => void;
}) {
  const [fusionLevel, setFusionLevel] = React.useState(config.fusionLevel);
  const [outputTemplates, setOutputTemplates] = React.useState(config.outputTemplates);
  const [temperature, setTemperature] = React.useState(config.modelParams?.temperature ?? 0.3);
  const [maxTokens, setMaxTokens] = React.useState(config.modelParams?.maxTokens ?? 4096);
  const [topP, setTopP] = React.useState(config.modelParams?.topP ?? 0.95);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-end">
      <div className="w-full lg:w-96 bg-surface-container border-l border-outline shadow-xl h-full flex flex-col animate-in slide-in-right">
        <div className="p-4 border-b border-outline flex items-center justify-between">
          <h3 className="font-title-md font-bold text-on-surface">管線配置</h3>
          <button onClick={onClose} className="btn-ghost p-2">
            <span className="material-symbols-outlined text-[24px]">close</span>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {/* Fusion Level */}
          <div>
            <div className="font-label-code-sm font-bold text-on-surface-variant block mb-3">
              融合深度
            </div>
            <div className="space-y-2">
              {[
                {
                  value: "strict_alignment",
                  label: "嚴格對齊",
                  desc: "逐字稿與投影片強制對齊，適合精確引用",
                },
                {
                  value: "high_level_summary",
                  label: "高層摘要",
                  desc: "提取核心概念，忽略細節對齊",
                },
              ].map((opt) => (
                <label
                  key={opt.value}
                  className="flex items-start gap-3 p-3 rounded-lg border transition-all cursor-pointer"
                >
                  <input
                    type="radio"
                    name="fusionLevel"
                    value={opt.value}
                    checked={fusionLevel === opt.value}
                    onChange={() => setFusionLevel(opt.value as PipelineConfig["fusionLevel"])}
                    className="mt-1 w-4 h-4 accent-primary"
                  />
                  <div>
                    <p className="font-body-sm font-bold text-on-surface">{opt.label}</p>
                    <p className="font-body-sm text-on-surface-variant">{opt.desc}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Output Templates */}
          <div>
            <div className="font-label-code-sm font-bold text-on-surface-variant block mb-3">
              輸出模板
            </div>
            <div className="space-y-2">
              {[
                { value: "knowledge_nodes", label: "知識節點", desc: "生成概念節點與關係圖譜" },
                { value: "flashcard_quiz", label: "閃卡題庫", desc: "生成選擇/問答題供複習使用" },
              ].map((opt) => (
                <label
                  key={opt.value}
                  className="flex items-start gap-3 p-3 rounded-lg border transition-all cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={outputTemplates.includes(opt.value as any)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setOutputTemplates([
                          ...outputTemplates,
                          opt.value as PipelineConfig["outputTemplates"][number],
                        ]);
                      } else {
                        setOutputTemplates(
                          outputTemplates.filter(
                            (t) => t !== (opt.value as PipelineConfig["outputTemplates"][number]),
                          ),
                        );
                      }
                    }}
                    className="mt-1 w-4 h-4 accent-primary"
                  />
                  <div>
                    <p className="font-body-sm font-bold text-on-surface">{opt.label}</p>
                    <p className="font-body-sm text-on-surface-variant">{opt.desc}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Advanced Model Params */}
          <details className="border-t border-outline pt-4">
            <summary className="font-label-code-sm font-bold text-on-surface-variant cursor-pointer flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px]">settings</span>
              進階模型參數
            </summary>
            <div className="mt-4 space-y-4">
              <div>
                <label
                  htmlFor="temperature-slider"
                  className="font-label-code-sm font-bold text-on-surface-variant block mb-2"
                >
                  Temperature: {temperature.toFixed(1)}
                </label>
                <input
                  id="temperature-slider"
                  type="range"
                  min={0}
                  max={1}
                  step={0.1}
                  value={temperature}
                  onChange={(e) => setTemperature(Number.parseFloat(e.target.value))}
                  className="w-full h-2 -webkit-appearance-none bg-surface-container-low rounded-full accent-primary"
                />
              </div>
              <div>
                <label
                  htmlFor="max-tokens-slider"
                  className="font-label-code-sm font-bold text-on-surface-variant block mb-2"
                >
                  Max Tokens: {maxTokens}
                </label>
                <input
                  id="max-tokens-slider"
                  type="range"
                  min={512}
                  max={8192}
                  step={512}
                  value={maxTokens}
                  onChange={(e) => setMaxTokens(Number.parseInt(e.target.value))}
                  className="w-full h-2 -webkit-appearance-none bg-surface-container-low rounded-full accent-primary"
                />
              </div>
              <div>
                <label
                  htmlFor="top-p-slider"
                  className="font-label-code-sm font-bold text-on-surface-variant block mb-2"
                >
                  Top P: {topP.toFixed(2)}
                </label>
                <input
                  id="top-p-slider"
                  type="range"
                  min={0.1}
                  max={1}
                  step={0.05}
                  value={topP}
                  onChange={(e) => setTopP(Number.parseFloat(e.target.value))}
                  className="w-full h-2 -webkit-appearance-none bg-surface-container-low rounded-full accent-primary"
                />
              </div>
            </div>
          </details>
        </div>

        {/* Actions */}
        <div className="p-4 border-t border-outline flex gap-2">
          <button onClick={onClose} className="btn-secondary flex-1">
            取消
          </button>
          <button
            onClick={() =>
              onSave({
                fusionLevel,
                outputTemplates,
                modelParams: { temperature, maxTokens, topP },
              })
            }
            className="btn-primary flex-1"
          >
            儲存並重試
          </button>
        </div>
      </div>
    </div>
  );
}
