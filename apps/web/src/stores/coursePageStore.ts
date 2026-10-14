import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { PipelineNodeKey } from "../types/course";

type OutlineViewMode = "tree" | "canvas" | "split";
type RawSubTab = "audio" | "slides" | "transcript";

const initialOutlineState = {
  editingNodeId: null as string | null,
  viewMode: "split" as OutlineViewMode,
  expandedNodeIds: [] as string[],
};

const initialPipelineState = {
  selectedNode: null as PipelineNodeKey | null,
  configDrawerOpen: false,
  nodeDetailDrawerOpen: false,
};

const initialRawState = {
  activeSubTab: "audio" as RawSubTab,
  currentTime: 0,
  currentSlide: 0,
};

interface CoursePageStore {
  outline: typeof initialOutlineState;
  pipeline: typeof initialPipelineState;
  raw: typeof initialRawState;

  setEditingNode: (editingNodeId: string | null) => void;
  setOutlineViewMode: (viewMode: OutlineViewMode) => void;
  toggleNodeExpanded: (nodeId: string) => void;
  setPipelineSelectedNode: (selectedNode: PipelineNodeKey | null) => void;
  setPipelineConfigDrawer: (configDrawerOpen: boolean) => void;
  setPipelineNodeDetailDrawer: (nodeDetailDrawerOpen: boolean) => void;
  setRawSubTab: (activeSubTab: RawSubTab) => void;
  setRawCurrentTime: (currentTime: number) => void;
  setRawCurrentSlide: (currentSlide: number) => void;
}

export const useCoursePageStore = create<CoursePageStore>()(
  persist(
    (set) => ({
      outline: initialOutlineState,
      pipeline: initialPipelineState,
      raw: initialRawState,

      setEditingNode: (editingNodeId) =>
        set((state) => ({
          outline: { ...state.outline, editingNodeId },
        })),

      setOutlineViewMode: (viewMode) =>
        set((state) => ({
          outline: { ...state.outline, viewMode },
        })),

      toggleNodeExpanded: (nodeId) =>
        set((state) => {
          const expanded = state.outline.expandedNodeIds.includes(nodeId);
          return {
            outline: {
              ...state.outline,
              expandedNodeIds: expanded
                ? state.outline.expandedNodeIds.filter((id) => id !== nodeId)
                : [...state.outline.expandedNodeIds, nodeId],
            },
          };
        }),

      setPipelineSelectedNode: (selectedNode) =>
        set((state) => ({
          pipeline: { ...state.pipeline, selectedNode },
        })),

      setPipelineConfigDrawer: (configDrawerOpen) =>
        set((state) => ({
          pipeline: { ...state.pipeline, configDrawerOpen },
        })),

      setPipelineNodeDetailDrawer: (nodeDetailDrawerOpen) =>
        set((state) => ({
          pipeline: { ...state.pipeline, nodeDetailDrawerOpen },
        })),

      setRawSubTab: (activeSubTab) =>
        set((state) => ({
          raw: { ...state.raw, activeSubTab },
        })),

      setRawCurrentTime: (currentTime) =>
        set((state) => ({
          raw: { ...state.raw, currentTime },
        })),

      setRawCurrentSlide: (currentSlide) =>
        set((state) => ({
          raw: { ...state.raw, currentSlide },
        })),
    }),
    {
      name: "plks-course-page-store",
      partialize: (state) => ({
        outline: {
          viewMode: state.outline.viewMode,
          expandedNodeIds: state.outline.expandedNodeIds,
        },
        pipeline: {
          configDrawerOpen: state.pipeline.configDrawerOpen,
          nodeDetailDrawerOpen: state.pipeline.nodeDetailDrawerOpen,
        },
        raw: {
          activeSubTab: state.raw.activeSubTab,
        },
      }),
    },
  ),
);
