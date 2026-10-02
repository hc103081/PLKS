import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { CoursePageStore, GameUIState, PipelineNodeKey } from "../types/course";

const initialGameState: GameUIState = {
  sessionId: "",
  currentQuizIndex: 0,
  score: 0,
  streak: 0,
  sidekickOpen: false,
};

const initialOutlineState = {
  editingNodeId: null as string | null,
  viewMode: "split" as const,
  expandedNodeIds: [] as string[],
};

const initialPipelineState = {
  selectedNode: null as PipelineNodeKey | null,
  configDrawerOpen: false,
  nodeDetailDrawerOpen: false,
};

const initialRawState = {
  activeSubTab: "audio" as const,
  currentTime: 0,
  currentSlide: 0,
};

export const useCoursePageStore = create<CoursePageStore>()(
  persist(
    (set) => ({
      game: initialGameState,
      outline: initialOutlineState,
      pipeline: initialPipelineState,
      raw: initialRawState,

      setGameSession: (sessionId) =>
        set({
          game: { ...initialGameState, sessionId },
        }),

      updateGameProgress: (patch) =>
        set((state) => ({
          game: { ...state.game, ...patch },
        })),

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
