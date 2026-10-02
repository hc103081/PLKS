import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { DashboardStore } from "../types/course";

export const useDashboardStore = create<DashboardStore>()(
  persist(
    (set) => ({
      semesterFilter: "104-1" as const, // default to 大二上
      viewMode: "grid" as const,
      createModal: { open: false, mode: "create" as const },

      setSemesterFilter: (semesterFilter) => set({ semesterFilter }),
      setViewMode: (viewMode) => set({ viewMode }),
      openCreateModal: (mode, courseId) => set({ createModal: { open: true, mode, courseId } }),
      closeCreateModal: () => set({ createModal: { open: false, mode: "create" } }),
    }),
    {
      name: "plks-dashboard-store",
      partialize: (state) => ({
        semesterFilter: state.semesterFilter,
        viewMode: state.viewMode,
      }),
    },
  ),
);
