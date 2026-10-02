// apps/web/src/hooks/useDashboard.ts
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createCourse,
  deleteCourse,
  getCourses,
  getPipelineSummary,
  retryPipeline,
  startPipeline,
  updateCourse,
  uploadFile,
} from "../services/api";
import { useDashboardStore } from "../stores/dashboardStore";
import type {
  CourseCardData,
  CoursesResponse,
  CreateCourseRequest,
  UpdateCourseRequest,
} from "../types/course";

export function useDashboard() {
  const queryClient = useQueryClient();
  const { semesterFilter, viewMode } = useDashboardStore();

  // Get courses with progress and status
  const {
    data: coursesResponse,
    isLoading: coursesLoading,
    error: coursesError,
    refetch: coursesRefetch,
  } = useQuery({
    queryKey: ["courses", semesterFilter],
    queryFn: () => getCourses(semesterFilter),
    staleTime: 30000,
  });

  // Get pipeline summary
  const {
    data: pipelineSummary,
    isLoading: pipelineLoading,
    error: pipelineError,
  } = useQuery({
    queryKey: ["pipeline-summary"],
    queryFn: () => getPipelineSummary(),
    staleTime: 60000,
  });

  // Create course mutation
  const createCourseMutation = useMutation({
    mutationFn: (data: CreateCourseRequest) => createCourse(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["courses"] });
      queryClient.invalidateQueries({ queryKey: ["pipeline-summary"] });
    },
  });

  // Update course mutation
  const updateCourseMutation = useMutation({
    mutationFn: (data: UpdateCourseRequest) => updateCourse(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["courses"] });
    },
  });

  // Delete course mutation
  const deleteCourseMutation = useMutation({
    mutationFn: (courseId: string) => deleteCourse(courseId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["courses"] });
      queryClient.invalidateQueries({ queryKey: ["pipeline-summary"] });
    },
  });

  // Upload file mutation
  const uploadFileMutation = useMutation({
    mutationFn: ({ file, courseId }: { file: File; courseId?: string }) =>
      uploadFile(file, courseId),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["courses"] });
      queryClient.invalidateQueries({ queryKey: ["pipeline-summary"] });
      return data;
    },
  });

  // Start pipeline mutation
  const startPipelineMutation = useMutation({
    mutationFn: (courseId: string) => startPipeline(courseId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["courses"] });
      queryClient.invalidateQueries({ queryKey: ["pipeline-summary"] });
    },
  });

  // Retry pipeline mutation
  const retryPipelineMutation = useMutation({
    mutationFn: (sessionId: string) => retryPipeline(sessionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["courses"] });
      queryClient.invalidateQueries({ queryKey: ["pipeline-summary"] });
    },
  });

  return {
    // Data
    courses: coursesResponse?.courses || [],
    pipelineSummary: pipelineSummary || {
      inProgress: 0,
      pending: 0,
      needsAttention: 0,
      healthy: true,
      healthPercentage: 100,
    },
    // Loading states
    isLoading: coursesLoading || pipelineLoading,
    error: coursesError || pipelineError,
    // Mutations
    createCourse: createCourseMutation.mutateAsync,
    updateCourse: updateCourseMutation.mutateAsync,
    deleteCourse: deleteCourseMutation.mutateAsync,
    uploadFile: uploadFileMutation.mutateAsync,
    startPipeline: startPipelineMutation.mutateAsync,
    retryPipeline: retryPipelineMutation.mutateAsync,
    // Mutation states
    isCreating: createCourseMutation.isPending,
    isUpdating: updateCourseMutation.isPending,
    isDeleting: deleteCourseMutation.isPending,
    isUploading: uploadFileMutation.isPending,
    isStartingPipeline: startPipelineMutation.isPending,
    isRetryingPipeline: retryPipelineMutation.isPending,
    // Refetch functions
    refetch: () => {
      coursesRefetch();
      queryClient.invalidateQueries({ queryKey: ["pipeline-summary"] });
    },
  };
}
