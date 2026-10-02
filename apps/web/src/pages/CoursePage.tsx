import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { CourseHeader } from "../components/course/CourseHeader";
import { CourseTabs } from "../components/course/CourseTabs";
import { TabGame } from "../components/course/TabGame/TabGame";
import { TabOutline } from "../components/course/TabOutline/TabOutline";
import { TabPipeline } from "../components/course/TabPipeline/TabPipeline";
import { TabRaw } from "../components/course/TabRaw/TabRaw";
import { CourseCardSkeleton, LoadingSkeleton } from "../components/shared";
import {
  getConceptTree,
  getCourseById,
  getGameSessionState,
  getGameState,
  getPipelineStatus,
  getRawAsset,
  startSession,
} from "../services/api";
import { useCoursePageStore } from "../stores/coursePageStore";
import type {
  CourseCardData,
  CourseTab,
  GameSessionState,
  OutlineTreeData,
  PipelineStatusResponse,
  RawAssetData,
} from "../types/course";

export function CoursePage() {
  const { courseId } = useParams<{ courseId: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  // URL State
  const tab = (searchParams.get("tab") as CourseTab) || "outline";
  const sessionId = searchParams.get("session") || undefined;
  const subTab = (searchParams.get("subTab") as "audio" | "slides" | "transcript") || "audio";
  const node = (searchParams.get("node") as any) || undefined;
  const view = (searchParams.get("view") as "tree" | "canvas" | "split") || "split";

  // Store actions
  const {
    game,
    outline,
    pipeline,
    raw,
    setGameSession,
    updateGameProgress,
    setEditingNode,
    setOutlineViewMode,
    toggleNodeExpanded,
    setPipelineSelectedNode,
    setPipelineConfigDrawer,
    setPipelineNodeDetailDrawer,
    setRawSubTab,
    setRawCurrentTime,
    setRawCurrentSlide,
  } = useCoursePageStore();

  // Fetch course data
  const { data: course, isLoading: courseLoading } = useQuery({
    queryKey: ["course", courseId],
    queryFn: () => getCourseById(courseId!),
    enabled: !!courseId,
  });

  // Fetch raw asset data
  const { data: rawAsset, isLoading: rawLoading } = useQuery({
    queryKey: ["raw-asset", sessionId],
    queryFn: () => getRawAsset(courseId!, sessionId!),
    enabled: !!courseId && !!sessionId && (tab === "raw" || tab === "pipeline"),
    staleTime: 30000,
  });

  // Fetch pipeline status
  const { data: pipelineStatus, isLoading: pipelineLoading } = useQuery({
    queryKey: ["pipeline", sessionId],
    queryFn: () => getPipelineStatus(sessionId!),
    enabled: !!sessionId && tab === "pipeline",
    refetchInterval: tab === "pipeline" ? 3000 : false,
    staleTime: 2000,
  });

  // Fetch concept tree
  const { data: conceptTree, isLoading: outlineLoading } = useQuery({
    queryKey: ["concept-tree", courseId],
    queryFn: () => getConceptTree(courseId!),
    enabled: !!courseId && (tab === "outline" || tab === "game"),
    staleTime: 60000,
  });

  // Fetch game state for UI and full game session for data
  const { data: gameState, isLoading: gameLoading } = useQuery({
    queryKey: ["game-session-state", sessionId],
    queryFn: () => getGameSessionState(sessionId!),
    enabled: !!sessionId && tab === "game",
    staleTime: 5000,
  });

  const { data: gameSession } = useQuery({
    queryKey: ["game-session", sessionId],
    queryFn: () => getGameState(sessionId!),
    enabled: !!sessionId && tab === "game",
    staleTime: 5000,
  });

  // Sync URL to store
  useEffect(() => {
    if (sessionId && sessionId !== game.sessionId) {
      setGameSession(sessionId);
    }
  }, [sessionId, game.sessionId, setGameSession]);

  useEffect(() => {
    setRawSubTab(subTab);
  }, [subTab, setRawSubTab]);

  useEffect(() => {
    setPipelineSelectedNode(node);
  }, [node, setPipelineSelectedNode]);

  useEffect(() => {
    setOutlineViewMode(view);
  }, [view, setOutlineViewMode]);

  // Handle tab change
  const handleTabChange = (newTab: CourseTab) => {
    const params = new URLSearchParams(searchParams);
    params.set("tab", newTab);
    if (newTab === "pipeline" && sessionId) {
      params.set("session", sessionId);
    } else if (newTab !== "pipeline") {
      params.delete("session");
    }
    params.delete("subTab");
    params.delete("node");
    params.delete("view");
    setSearchParams(params, { replace: true });
  };

  // Handle sub-tab change (raw)
  const handleRawSubTabChange = (newSubTab: "audio" | "slides" | "transcript") => {
    const params = new URLSearchParams(searchParams);
    params.set("subTab", newSubTab);
    setSearchParams(params, { replace: true });
  };

  // Handle pipeline node selection
  const handlePipelineNodeSelect = (newNode: any) => {
    const params = new URLSearchParams(searchParams);
    if (newNode) {
      params.set("node", newNode);
    } else {
      params.delete("node");
    }
    setSearchParams(params, { replace: true });
  };

  // Handle outline view mode change
  const handleViewModeChange = (newView: "tree" | "canvas" | "split") => {
    const params = new URLSearchParams(searchParams);
    params.set("view", newView);
    setSearchParams(params, { replace: true });
  };

  // Handle start new session
  const handleStartSession = () => {
    if (!courseId) return;
    startSession({ sessionId: crypto.randomUUID(), courseId })
      .then((response) => {
        const params = new URLSearchParams(searchParams);
        params.set("session", response.sessionId);
        params.set("tab", "pipeline");
        setSearchParams(params, { replace: true });
      })
      .catch((error) => {
        console.error("Failed to start session:", error);
      });
  };

  if (courseLoading || !course) {
    return <CoursePageSkeleton />;
  }

  return (
    <div className="main-content">
      {/* Sticky Header */}
      <CourseHeader
        course={course!}
        activeTab={tab}
        onTabChange={handleTabChange}
        onBack={() => navigate("/")}
        {...(sessionId !== undefined ? { sessionId } : {})}
        onStartSession={handleStartSession}
      />

      {/* Tab Navigation */}
      <CourseTabs
        activeTab={tab}
        onTabChange={handleTabChange}
        {...(sessionId !== undefined ? { sessionId } : {})}
        {...(pipelineStatus ? { pipelineStatus: pipelineStatus.status } : {})}
      />

      {/* Tab Panels */}
      <div className="min-h-[calc(100vh-200px)] overflow-auto">
        {tab === "raw" && (
          <TabRaw
            course={course}
            rawAsset={rawAsset}
            sessionId={sessionId}
            activeSubTab={subTab}
            onSubTabChange={handleRawSubTabChange}
            isLoading={rawLoading}
            currentTime={raw.currentTime}
            currentSlide={raw.currentSlide}
            onTimeUpdate={setRawCurrentTime}
            onSlideChange={setRawCurrentSlide}
          />
        )}

        {tab === "pipeline" && (
          <TabPipeline
            pipelineStatus={pipelineStatus}
            sessionId={sessionId}
            selectedNode={node}
            onNodeSelect={handlePipelineNodeSelect}
            isLoading={pipelineLoading}
            configDrawerOpen={pipeline.configDrawerOpen}
            nodeDetailDrawerOpen={pipeline.nodeDetailDrawerOpen}
            onConfigDrawerToggle={setPipelineConfigDrawer}
            onNodeDetailDrawerToggle={setPipelineNodeDetailDrawer}
          />
        )}

        {tab === "outline" && (
          <TabOutline
            course={course}
            conceptTree={conceptTree}
            sessionId={sessionId}
            isLoading={outlineLoading}
            editingNodeId={outline.editingNodeId}
            viewMode={outline.viewMode}
            expandedNodeIds={outline.expandedNodeIds}
            onEditingNodeChange={setEditingNode}
            onViewModeChange={handleViewModeChange}
            onNodeExpandToggle={toggleNodeExpanded}
          />
        )}

        {tab === "game" && (
          <TabGame
            course={course}
            gameState={gameState}
            gameSession={gameSession}
            sessionId={sessionId}
            isLoading={gameLoading}
            sidekickOpen={game.sidekickOpen}
            onSidekickToggle={() => updateGameProgress({ sidekickOpen: !game.sidekickOpen })}
          />
        )}
      </div>
    </div>
  );
}

function CoursePageSkeleton() {
  return (
    <div className="main-content">
      <div className="page-header-content h-16 px-4 lg:px-8 flex items-center justify-between gap-4 animate-pulse">
        <div className="flex items-center gap-3">
          <LoadingSkeleton variant="circular" width={40} height={40} />
          <LoadingSkeleton variant="text" width={200} />
        </div>
        <LoadingSkeleton variant="rectangular" width={300} height={40} />
      </div>
      <div className="h-12 px-4 lg:px-8 flex items-center gap-2 border-b border-outline animate-pulse">
        {["原檔", "AI管線", "重點排版", "遊戲學習"].map((t) => (
          <LoadingSkeleton key={t} variant="rectangular" width={100} height={36} />
        ))}
      </div>
      <div className="main-content-wrapper p-8 animate-pulse">
        <div
          className="grid grid-cols-1 lg:grid-cols-3 gap-6"
          style={{ gridTemplateColumns: "280px 1fr 320px" }}
        >
          <LoadingSkeleton variant="card" height={600} />
          <LoadingSkeleton variant="card" height={600} />
          <LoadingSkeleton variant="card" height={600} />
        </div>
      </div>
    </div>
  );
}
