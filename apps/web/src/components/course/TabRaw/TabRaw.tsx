import type React from "react";
import { useEffect, useRef, useState } from "react";
import type { RawAssetData, TranscriptSegment, VisualAsset } from "../../../types/course";
import { LoadingSkeleton } from "../../shared";

// Updated TabRaw component matching the UI specification
export function TabRaw({
  course,
  rawAsset,
  sessionId,
  activeSubTab,
  onSubTabChange,
  isLoading,
  currentTime,
  currentSlide,
  onTimeUpdate,
  onSlideChange,
}: {
  course: any;
  rawAsset: RawAssetData | undefined;
  sessionId: string | undefined;
  activeSubTab: "audio" | "slides" | "transcript";
  onSubTabChange: (tab: "audio" | "slides" | "transcript") => void;
  isLoading: boolean;
  currentTime: number;
  currentSlide: number;
  onTimeUpdate: (time: number) => void;
  onSlideChange: (slide: number) => void;
}) {
  // Handle case when no raw asset data
  if (isLoading || !rawAsset) {
    return (
      <div className="p-8">
        <div className="max-w-6xl mx-auto animate-pulse">
          <div className="flex gap-2 mb-6">
            <LoadingSkeleton key="audio-tab" variant="rectangular" width={120} height={40} />
            <LoadingSkeleton key="slides-tab" variant="rectangular" width={120} height={40} />
            <LoadingSkeleton key="transcript-tab" variant="rectangular" width={120} height={40} />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <LoadingSkeleton variant="card" height={500} />
            <LoadingSkeleton variant="card" height={500} />
            <LoadingSkeleton variant="card" height={500} />
          </div>
        </div>
      </div>
    );
  }

  const audioCount = 1; // Single audio file per session
  const slideCount = rawAsset.visualAssets?.length || 0;
  const transcriptCount = rawAsset.transcripts?.length || 0;

  const subTabsWithCounts = [
    { key: "audio" as const, label: "音檔分析", icon: "audiotrack", count: audioCount },
    { key: "slides" as const, label: "講義投影片", icon: "picture_as_pdf", count: slideCount },
    { key: "transcript" as const, label: "課堂逐字稿", icon: "article", count: transcriptCount },
  ];

  // Audio player state
  const audioRef = useRef<HTMLAudioElement>(null);
  const [duration, setDuration] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(1);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [isMuted, setIsMuted] = useState(false);

  // Sync lock state
  const [autoSync, setAutoSync] = useState(true);

  // Initialize audio metadata
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !rawAsset?.audioUrl) return;

    audio.src = rawAsset.audioUrl;
    audio.playbackRate = playbackRate;
    audio.volume = isMuted ? 0 : volume;

    const handleLoadedMetadata = () => {
      setDuration(audio.duration);
    };

    const handleEnded = () => {
      setIsPlaying(false);
    };

    audio.addEventListener("loadedmetadata", handleLoadedMetadata);
    audio.addEventListener("ended", handleEnded);

    return () => {
      audio.removeEventListener("loadedmetadata", handleLoadedMetadata);
      audio.removeEventListener("ended", handleEnded);
      audio.pause();
      audio.src = "";
    };
  }, [rawAsset?.audioUrl, playbackRate, volume, isMuted]);

  // Update audio current time when seeked externally
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    // Only update if the difference is significant to avoid feedback loops
    if (Math.abs(audio.currentTime - currentTime) > 0.5) {
      audio.currentTime = currentTime;
    }
  }, [currentTime]);

  const formatTime = (time: number): string => {
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const handlePlayPause = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (isPlaying) {
      audio.pause();
    } else {
      audio.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const audio = audioRef.current;
    if (!audio) return;
    const time = Number.parseFloat(e.target.value);
    audio.currentTime = time;
    onTimeUpdate(time);
  };

  const handleSkipBack = () => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = Math.max(0, audio.currentTime - 10);
    onTimeUpdate(audio.currentTime);
  };

  const handleSkipForward = () => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = Math.min(duration, audio.currentTime + 10);
    onTimeUpdate(audio.currentTime);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const vol = Number.parseFloat(e.target.value);
    setVolume(vol);
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : vol;
    }
  };

  const handlePlaybackRateChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const rate = Number.parseFloat(e.target.value);
    setPlaybackRate(rate);
    if (audioRef.current) {
      audioRef.current.playbackRate = rate;
    }
  };

  const handleMuteToggle = () => {
    setIsMuted(!isMuted);
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume;
    }
  };

  // Get current transcript segment
  const getCurrentSegment = (segments: TranscriptSegment[], time: number) => {
    return segments.find((s) => time >= s.startTime && time <= s.endTime);
  };

  // Format time for display
  const formatDisplayTime = (time: number): string => {
    const hours = Math.floor(time / 3600);
    const mins = Math.floor((time % 3600) / 60);
    const secs = Math.floor(time % 60);
    if (hours > 0) {
      return `${hours}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
    }
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className="w-full">
      {/* Top Context Sub-Bar & SubTab Controls */}
      <section className="w-full bg-[#0F131C] border-b border-slate-800/80 shadow-md">
        <div className="w-full px-6 py-3 flex flex-col xl:flex-row items-start xl:items-center justify-between gap-4">
          {/* SubTab Segmented Switcher */}
          <div className="flex items-center gap-1.5 p-1 bg-[#111827] border border-slate-800 rounded-xl overflow-x-auto w-full sm:w-auto shrink-0">
            {/* 三合一同步檢視 (Split View) */}
            <button
              onClick={() => onSubTabChange("audio")} // In spec, this seems to be a combined view
              className={`flex items-center gap-space-xs px-space-md py-1.5 rounded-lg ${activeSubTab === "audio" ? "bg-indigo-600 text-white font-headline-sm text-body-sm shadow-sm transition-all" : "text-slate-400 hover:text-slate-200 font-body-sm text-body-sm hover:bg-slate-800/60 transition-all"}`}
              type="button"
            >
              <span className="material-symbols-outlined text-[18px]">view_column</span>
              <span className="whitespace-nowrap">三合一同步檢視 (Split View)</span>
            </button>

            {/* 音檔分析 (Audio) */}
            <button
              onClick={() => onSubTabChange("audio")}
              className={`flex items-center gap-space-xs px-space-md py-1.5 rounded-lg ${activeSubTab === "audio" ? "bg-indigo-600 text-white font-headline-sm text-body-sm shadow-sm transition-all" : "text-slate-400 hover:text-slate-200 font-body-sm text-body-sm hover:bg-slate-800/60 transition-all"}`}
              type="button"
            >
              <span className="material-symbols-outlined text-[18px]">graphic_eq</span>
              <span className="whitespace-nowrap">音檔分析 (Audio)</span>
            </button>

            {/* 講義投影片 (Slides) */}
            <button
              onClick={() => onSubTabChange("slides")}
              className={`flex items-center gap-space-xs px-space-md py-1.5 rounded-lg ${activeSubTab === "slides" ? "bg-indigo-600 text-white font-headline-sm text-body-sm shadow-sm transition-all" : "text-slate-400 hover:text-slate-200 font-body-sm text-body-sm hover:bg-slate-800/60 transition-all"}`}
              type="button"
            >
              <span className="material-symbols-outlined text-[18px]">slideshow</span>
              <span className="whitespace-nowrap">講義投影片 (Slides)</span>
            </button>

            {/* 課堂逐字稿 (Transcript) */}
            <button
              onClick={() => onSubTabChange("transcript")}
              className={`flex items-center gap-space-xs px-space-md py-1.5 rounded-lg ${activeSubTab === "transcript" ? "bg-indigo-600 text-white font-headline-sm text-body-sm shadow-sm transition-all" : "text-slate-400 hover:text-slate-200 font-body-sm text-body-sm hover:bg-slate-800/60 transition-all"}`}
              type="button"
            >
              <span className="material-symbols-outlined text-[18px]">notes</span>
              <span className="whitespace-nowrap">課堂逐字稿 (Transcript)</span>
            </button>
          </div>

          {/* Current Unit Metadata & Sync Lock */}
          <div className="flex items-center gap-space-md min-w-0">
            <div className="flex items-center gap-space-xs">
              <div className="w-8 h-8 rounded-lg bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center shrink-0 text-indigo-400">
                <span className="material-symbols-outlined text-[20px]">smart_display</span>
              </div>
              <div className="flex flex-col min-w-0">
                <div className="flex items-center gap-space-xs">
                  <span className="font-headline-sm text-body-sm text-slate-100 truncate">
                    Unit 04: 指令管線化與處理器架構
                  </span>
                  <span className="bg-slate-800 text-slate-300 border border-slate-700/60 text-label-code-sm font-label-code-sm px-1.5 py-0.5 rounded">
                    CS101_Lecture_Wk04.mp4
                  </span>
                </div>
                <div className="flex items-center gap-2 text-label-code-sm font-label-code-sm text-slate-400">
                  <span className="">錄製: 2026-09-28</span>
                  <span className="">•</span>
                  <span className="text-slate-300 font-medium">128kbps AAC</span>
                  <span className="">•</span>
                  <span className="text-emerald-400 font-medium">總長 01:14:32</span>
                </div>
              </div>
            </div>
          </div>

          {/* Global Synchronization Toggle */}
          <div className="flex items-center gap-space-xs bg-[#111827] border border-slate-800 px-space-md py-1.5 rounded-full shrink-0 shadow-inner">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.8)]"></span>
            <span className="font-label-code-sm text-label-code-sm font-medium text-emerald-400">
              時間軸自動捲動 & 投影片連動 (Auto-Sync: {autoSync ? "ON" : "OFF"})
            </span>
            <button
              aria-label="切換連動模式"
              className="ml-1 w-7 h-4 bg-emerald-500/80 rounded-full relative transition-colors focus:outline-none"
              onClick={() => setAutoSync(!autoSync)}
              type="button"
            >
              <span className="w-3 h-3 bg-slate-950 rounded-full absolute right-0.5 top-0.5 shadow-sm"></span>
            </button>
          </div>
        </div>
      </section>

      {/* Main Body Content: High-density Academic Workbench */}
      <div className="w-full px-6 py-4 flex flex-col gap-4">
        {/* 1. WaveSurfer Audio Player Section */}
        <section className="w-full bg-[#111827] border border-slate-800/90 rounded-xl shadow-lg shadow-black/40 p-4 flex flex-col gap-3 relative overflow-hidden">
          {/* Active Section Header & Segment Alert Strip */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
            <div className="flex items-center gap-1">
              <span className="inline-flex items-center justify-center w-6 h-6 rounded-md bg-indigo-600 text-white font-label-code-sm text-label-code-sm shadow-sm">
                04
              </span>
              <div className="flex items-center gap-0.5">
                <span className="font-headline-sm text-body-md text-slate-100 font-semibold">
                  WaveSurfer 課堂聲學頻譜
                </span>
                <span className="text-label-code-sm font-label-code-sm text-slate-400">
                  AI 聲紋降噪已啟用 (Whisper v3 Turbo)
                </span>
              </div>
            </div>
            {/* Quick Jump Prompt Card */}
            <div className="flex items-center gap-1 bg-indigo-950/60 border border-indigo-500/30 px-3 py-2 rounded-lg">
              <span className="material-symbols-outlined text-indigo-400 text-[16px]">
                bookmark
              </span>
              <span className="text-label-code-sm font-label-code-sm text-slate-300">
                當前播放段落：
                <strong className="text-indigo-300 font-semibold">
                  {getCurrentSegment(rawAsset?.transcripts || [], currentTime)?.text?.substring(
                    0,
                    20,
                  )}
                  ...
                </strong>
              </span>
            </div>
          </div>

          {/* Waveform Visualizer & Timeline Markers */}
          <div className="w-full bg-[#0B0F17] border border-slate-800 rounded-lg p-3 relative flex flex-col gap-2">
            {/* Timeline Chapter Pin Markers */}
            <div className="relative w-full h-4 text-label-code-sm font-label-code-sm">
              {/* These would be dynamically generated based on actual chapters */}
              <div className="absolute left-[7%] -translate-x-1/2 flex items-center gap-0.5 bg-slate-800/90 border border-slate-700/60 px-1.5 py-0.5 rounded text-slate-300 hover:text-white cursor-pointer shadow-xs">
                <span className="w-1.5 h-1.5 rounded-full bg-sky-400 shadow-[0_0_6px_rgba(56,189,248,0.8)]"></span>
                <span className="">00:05:10 緒論</span>
              </div>
              <div className="absolute left-[26%] -translate-x-1/2 flex items-center gap-0.5 bg-indigo-600 text-white px-1.5 py-0.5 rounded cursor-pointer shadow-md shadow-indigo-900/50 z-10 border border-indigo-400/30">
                <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping"></span>
                <span className="">00:18:42 經典五大階段</span>
              </div>
              <div className="absolute left-[44%] -translate-x-1/2 flex items-center gap-0.5 bg-slate-800/90 border border-slate-700/60 px-1.5 py-0.5 rounded text-slate-300 hover:text-white cursor-pointer shadow-xs">
                <span className="w-1.5 h-1.5 rounded-full bg-sky-400 shadow-[0_0_6px_rgba(56,189,248,0.8)]"></span>
                <span className="">00:32:15 管線衝突冒險</span>
              </div>
            </div>

            {/* WaveSurfer Dual-tone Waveform Canvas (Simulated via SVG) */}
            <div className="w-full h-10 relative flex items-center group cursor-pointer bg-slate-950/40 rounded">
              {/* Background Inactive Spectral Wave */}
              <svg
                className="w-full h-full text-slate-700/70"
                fill="currentColor"
                preserveAspectRatio="none"
                viewBox="0 0 1000 64"
              >
                <path d="M0,32 Q10,12 20,32 T40,32 T60,18 T80,46 T100,10 T120,54 T140,24 T160,40 T180,6 T200,58 T220,16 T240,48 T260,14 T280,50 T300,8 T320,56 T340,20 T360,44 T380,12 T400,52 T420,18 T440,46 T460,10 T480,54 T500,22 T520,42 T540,14 T560,50 T580,26 T600,38 T620,16 T640,48 T660,20 T680,44 T700,10 T720,54 T740,18 T760,46 T780,14 T800,50 T820,24 T840,40 T860,12 T880,52 T900,16 T920,48 T940,22 T960,42 T980,28 T1000,32 L1000,32 L0,32 Z"></path>
              </svg>
              {/* Foreground Active Played Spectral Wave (Clipped to current progress) */}
              <div className="absolute inset-y-0 left-0 w-[{Math.min(100, (currentTime / duration) * 100)}%] overflow-hidden">
                <svg
                  className="h-full text-cyan-400 drop-shadow-[0_0_6px_rgba(56,189,248,0.7)]"
                  fill="currentColor"
                  preserveAspectRatio="none"
                  style={{ width: "1000px", maxWidth: "none" }}
                  viewBox="0 0 1000 64"
                >
                  <path d="M0,32 Q10,12 20,32 T40,32 T60,18 T80,46 T100,10 T120,54 T140,24 T160,40 T180,6 T200,58 T220,16 T240,48 T260,14 T280,50 T300,8 T320,56 T340,20 T360,44 T380,12 T400,52 T420,18 T440,46 T460,10 T480,54 T500,22 T520,42 T540,14 T560,50 T580,26 T600,38 T620,16 T640,48 T660,20 T680,44 T700,10 T720,54 T740,18 T760,46 T780,14 T800,50 T820,24 T840,40 T860,12 T880,52 T900,16 T920,48 T940,22 T960,42 T980,28 T1000,32 L1000,32 L0,32 Z"></path>
                </svg>
              </div>
              {/* Playhead Needle */}
              <div className="absolute left-[{Math.min(100, (currentTime / duration) * 100)}%] inset-y-0 w-0.5 bg-cyan-300 z-20 flex flex-col items-center shadow-[0_0_12px_rgba(56,189,248,0.9)]">
                <div className="w-3 h-3 -mt-1 bg-cyan-400 border border-white rounded-full shadow-[0_0_8px_rgba(56,189,248,1)]"></div>
              </div>
            </div>

            {/* Time Axis Tick Indicators */}
            <div className="w-full flex justify-between text-label-code-sm font-label-code-sm text-slate-400 px-1">
              <span className="">00:00:00</span>
              <span className="">00:15:00</span>
              <span className="text-cyan-400 font-bold drop-shadow-[0_0_4px_rgba(56,189,248,0.5)]">
                00:19:35 (現在)
              </span>
              <span className="">00:30:00</span>
              <span className="">00:45:00</span>
              <span className="">01:00:00</span>
              <span className="">01:14:32</span>
            </div>
          </div>

          {/* Controls Dashboard Row */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
            {/* Playback Navigation Group */}
            <div className="flex items-center gap-1">
              <button
                aria-label="快退 10 秒"
                onClick={handleSkipBack}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors border border-transparent hover:border-slate-700"
                type="button"
              >
                <span className="material-symbols-outlined text-[20px]">replay_10</span>
              </button>
              <button
                aria-label="播放或暫停"
                onClick={handlePlayPause}
                className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-lg shadow-indigo-900/60 hover:bg-indigo-500 transition-all active:scale-95 border border-indigo-400/30"
                type="button"
              >
                <span
                  className="material-symbols-outlined text-[24px]"
                  style={{ fontVariationSettings: "'FILL' 1;" }}
                >
                  {isPlaying ? "pause" : "play_arrow"}
                </span>
              </button>
              <button
                aria-label="快進 10 秒"
                onClick={handleSkipForward}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors border border-transparent hover:border-slate-700"
                type="button"
              >
                <span className="material-symbols-outlined text-[20px]">forward_10</span>
              </button>
              {/* Current Time Code Readout */}
              <div className="ml-2 px-3 py-1 bg-[#0B0F17] border border-slate-800 rounded-lg font-label-code-md text-label-code-md text-slate-200 flex items-center gap-1.5">
                <span className="text-cyan-400 font-bold">{formatTime(currentTime)}</span>
                <span className="text-slate-600">/</span>
                <span className="text-slate-400">{formatTime(duration)}</span>
              </div>
            </div>
            {/* Volume, Speed & Audio Engineering Utilities */}
            <div className="flex items-center gap-2">
              {/* Speed Controller Selector */}
              <div className="flex items-center gap-0.5 bg-[#0B0F17] border border-slate-800 p-0.5 rounded-lg text-body-sm font-body-sm">
                <button
                  onClick={() => setPlaybackRate(0.5)}
                  className={`px-2 py-0.5 rounded-md text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 ${playbackRate === 0.5 ? "bg-indigo-600 text-white font-semibold shadow-xs" : ""}`}
                  type="button"
                >
                  0.5x
                </button>
                <button
                  onClick={() => setPlaybackRate(0.75)}
                  className={`px-2 py-0.5 rounded-md text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 ${playbackRate === 0.75 ? "bg-indigo-600 text-white font-semibold shadow-xs" : ""}`}
                  type="button"
                >
                  0.75x
                </button>
                <button
                  onClick={() => setPlaybackRate(1.0)}
                  className={`px-2 py-0.5 rounded-md text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 ${playbackRate === 1.0 ? "bg-indigo-600 text-white font-semibold shadow-xs" : ""}`}
                  type="button"
                >
                  1.0x
                </button>
                <button
                  onClick={() => setPlaybackRate(1.25)}
                  className={`px-2 py-0.5 rounded-md text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 ${playbackRate === 1.25 ? "bg-indigo-600 text-white font-semibold shadow-xs" : ""}`}
                  type="button"
                >
                  1.25x
                </button>
                <button
                  onClick={() => setPlaybackRate(1.5)}
                  className={`px-2 py-0.5 rounded-md text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 ${playbackRate === 1.5 ? "bg-indigo-600 text-white font-semibold shadow-xs" : ""}`}
                  type="button"
                >
                  1.5x
                </button>
                <button
                  onClick={() => setPlaybackRate(2.0)}
                  className={`px-2 py-0.5 rounded-md text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 ${playbackRate === 2.0 ? "bg-indigo-600 text-white font-semibold shadow-xs" : ""}`}
                  type="button"
                >
                  2.0x
                </button>
              </div>
              {/* Volume Slider */}
              <div className="hidden sm:flex items-center gap-1">
                <button
                  aria-label="靜音控制"
                  onClick={handleMuteToggle}
                  className={isMuted ? "text-indigo-600" : "text-slate-400"}
                  type="button"
                >
                  <span className="material-symbols-outlined text-[20px]">
                    {isMuted ? "volume_off" : "volume_up"}
                  </span>
                </button>
                <div className="w-20 h-1.5 bg-slate-800 rounded-full overflow-hidden flex items-center">
                  <div
                    className={`w-3/4 h-full bg-cyan-400 shadow-[0_0_8px_rgba(56,189,248,0.7)] rounded-full`}
                  ></div>
                </div>
                <span className="font-label-code-sm text-label-code-sm text-slate-400">
                  {Math.round(volume * 100)}%
                </span>
              </div>
              {/* Audio Equalizer / Quality Filter Marker */}
              <button
                className="inline-flex items-center gap-0.5 text-label-code-sm font-label-code-sm text-slate-300 bg-[#0B0F17] hover:bg-slate-800/80 border border-slate-800 px-2 py-1 rounded-lg transition-colors"
                type="button"
              >
                <span className="material-symbols-outlined text-[16px] text-cyan-400">tune</span>
                <span className="hidden md:inline">降噪強化中</span>
              </button>
            </div>
          </div>
        </section>

        {/* 2. Lower Split Panels: PDF SlideViewer (Left) + TranscriptTimeline (Right) */}
        <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
          {/* Left Panel: Slide Viewer (8 cols) */}
          <section className="lg:col-span-8 bg-[#111827] border border-slate-800/90 rounded-xl shadow-lg shadow-black/40 overflow-hidden flex flex-col">
            {/* Viewer Top Control Ribbon */}
            <div className="w-full px-4 py-2 bg-[#0B0F17] border-b border-slate-800/80 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-1">
                <span className="material-symbols-outlined text-rose-400 text-[20px]">
                  picture_as_pdf
                </span>
                <span className="font-headline-sm text-body-md text-slate-100 truncate font-medium">
                  Lecture04_MIPS_Pipeline_Hazards.pdf
                </span>
                <span className="bg-slate-800 text-slate-300 border border-slate-700/60 font-label-code-sm text-label-code-sm px-1.5 py-0.5 rounded">
                  PDF v1.7
                </span>
              </div>
              {/* Slide Controls Bar */}
              <div className="flex items-center gap-0.5">
                {/* Pager */}
                <div className="flex items-center bg-[#111827] border border-slate-800 rounded-lg shadow-xs px-1">
                  <button
                    aria-label="上一頁"
                    onClick={() => onSlideChange(Math.max(0, currentSlide - 1))}
                    className="p-1 text-slate-400 hover:text-slate-100"
                    type="button"
                  >
                    <span className="material-symbols-outlined text-[18px]">chevron_left</span>
                  </button>
                  <div className="px-2 font-label-code-md text-label-code-md font-medium text-slate-200">
                    <span className="text-cyan-400 font-bold">{currentSlide + 1}</span>
                    <span className="text-slate-600">/</span>
                    <span className="">{rawAsset?.visualAssets?.length || 0}</span>
                  </div>
                  <button
                    aria-label="下一頁"
                    onClick={() =>
                      onSlideChange(
                        Math.min((rawAsset?.visualAssets?.length || 0) - 1, currentSlide + 1),
                      )
                    }
                    className="p-1 text-slate-400 hover:text-slate-100"
                    type="button"
                  >
                    <span className="material-symbols-outlined text-[18px]">chevron_right</span>
                  </button>
                </div>
                {/* Zoom */}
                <div className="hidden sm:flex items-center bg-[#111827] border border-slate-800 rounded-lg shadow-xs px-2 py-1 gap-1 text-label-code-sm font-label-code-sm text-slate-300">
                  <span className="">125%</span>
                  <button aria-label="縮放選項" className="hover:text-white" type="button">
                    <span className="material-symbols-outlined text-[16px]">arrow_drop_down</span>
                  </button>
                </div>
                {/* Fullscreen & Download Buttons */}
                <button
                  aria-label="適合寬度"
                  className="w-8 h-8 rounded-lg bg-[#111827] border border-slate-800 text-slate-400 hover:text-slate-100 flex items-center justify-center shadow-xs hover:bg-slate-800"
                  type="button"
                >
                  <span className="material-symbols-outlined text-[18px]">fit_screen</span>
                </button>
                <button
                  aria-label="全螢幕檢視"
                  className="w-8 h-8 rounded-lg bg-[#111827] border border-slate-800 text-slate-400 hover:text-slate-100 flex items-center justify-center shadow-xs hover:bg-slate-800"
                  type="button"
                >
                  <span className="material-symbols-outlined text-[18px]">fullscreen</span>
                </button>
                <button
                  aria-label="下載原檔 PDF"
                  className="inline-flex items-center gap-0.5 bg-[#111827] border border-slate-800 text-slate-300 hover:text-cyan-300 hover:border-slate-700 px-2 py-1 rounded-lg text-body-sm font-body-sm shadow-xs transition-colors"
                  type="button"
                >
                  <span className="material-symbols-outlined text-[16px]">download</span>
                  <span className="hidden md:inline">原檔</span>
                </button>
              </div>
            </div>

            {/* Slide Canvas & Side Thumbnails Row */}
            <div className="w-full flex h-[580px] bg-[#070A0F] relative">
              {/* Collapsible Thumbnails Sidebar */}
              <aside className="w-36 bg-[#0B0F17] border-r border-slate-800/80 p-3 overflow-y-auto flex flex-col gap-2 shrink-0">
                <div className="text-label-caps font-label-caps text-slate-500 uppercase tracking-wider px-1">
                  投影片縮圖
                </div>
                {/* Thumbnails would be generated dynamically */}
                {rawAsset?.visualAssets?.map((slide, index) => (
                  <div
                    key={slide.id}
                    className={`flex flex-col gap-1 cursor-pointer group ${index === currentSlide ? "" : "opacity-75 hover:opacity-100 transition-opacity"}`}
                  >
                    <div
                      className={`w-full aspect-[4/3] bg-[#111827] border border-slate-800 rounded-md p-1.5 shadow-xs flex flex-col justify-between group-hover:border-slate-700 transition-all ${index === currentSlide ? "bg-indigo-500/20" : ""}`}
                    >
                      <div className="h-1.5 w-3/4 bg-slate-700 rounded"></div>
                      <div className="space-y-0.5">
                        <div className="h-1 w-full bg-slate-800 rounded"></div>
                        <div className="h-1 w-5/6 bg-slate-800 rounded"></div>
                      </div>
                      <div className="h-2 w-full bg-slate-800/80 rounded flex items-center justify-center">
                        <span className="font-label-code-sm text-[8px] text-slate-500">
                          {slide.pageNum}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-label-code-sm font-label-code-sm text-indigo-400 font-bold px-1">
                      <span className="">p.{slide.pageNum}</span>
                      <span className="text-[10px] text-indigo-400/80">
                        {formatDisplayTime(slide.pageNum * 20)}
                      </span>{" "}
                      {/* Approximate time mapping */}
                    </div>
                  </div>
                ))}
              </aside>

              {/* Main Slide Presentation Canvas */}
              <div className="flex-1 p-4 overflow-auto flex items-center justify-center">
                {/* High-Fidelity Slide Paper Canvas (Dark Mode Adaptation) */}
                <div className="w-full max-w-2xl aspect-[16/10] bg-[#111827] border border-slate-800 rounded-xl shadow-2xl p-6 flex flex-col justify-between relative select-none">
                  {/* Slide Header */}
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="font-label-code-sm text-label-code-sm text-indigo-400 uppercase tracking-wider font-semibold">
                        MIPS Core Architecture // Lesson 04
                      </span>
                      <h3 className="font-headline-lg text-headline-sm text-slate-100 mt-0.5">
                        Five-stage MIPS Pipeline Timing Diagram
                      </h3>
                    </div>
                    <span className="text-headline-sm font-headline-sm text-slate-500 font-mono">
                      {currentSlide + 1} / {rawAsset?.visualAssets?.length || 0}
                    </span>
                  </div>
                  {/* High-Fi Structural Architectural Timing Chart with Forwarding Lines (SVG placeholder) */}
                  <div className="my-auto py-3">
                    <div className="w-full bg-[#0B0F17] border border-slate-800/80 rounded-lg p-4">
                      <div className="text-label-code-sm font-label-code-sm text-slate-400 mb-2 flex items-center justify-between">
                        <span className="">時脈週期 (Clock Cycles: CC1 ~ CC7)</span>
                        <span className="text-emerald-400 font-label-code-sm text-label-code-sm">
                          Forwarding Path Active (EX/MEM → EX)
                        </span>
                      </div>
                      {/* Simplified timing chart */}
                      <div className="space-y-1">
                        <div className="flex items-center">
                          <span className="font-label-code-sm text-indigo-400">IF</span>
                          <span className="w-2 h-2 rounded-full bg-cyan-400 absolute -bottom-1 left-1/2 -translate-x-1/2 shadow-[0_0_6px_rgba(56,189,248,0.9)]"></span>
                          <span className="font-label-code-sm text-indigo-400">ID</span>
                          <span className="font-label-code-sm text-indigo-400">EX*</span>
                          <span className="font-label-code-sm text-indigo-400">MEM</span>
                          <span className="font-label-code-sm text-indigo-400">WB</span>
                        </div>
                        <div className="flex items-center mt-2">
                          <span className="font-label-code-sm text-indigo-400">
                            AND $12, $2, $5
                          </span>
                          <span className="font-label-code-sm text-indigo-400">
                            ← Forwarded from EX/MEM
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                  {/* Slide Footer Caption */}
                  <div className="pt-2 flex items-center justify-between text-body-sm font-body-sm text-slate-300 bg-[#0B0F17] border border-slate-800/80 px-3 py-1.5 rounded-lg">
                    <div className="flex items-center gap-1">
                      <span className="material-symbols-outlined text-cyan-400 text-[16px]">
                        info
                      </span>
                      <span>
                        無需插入 NOP 氣泡 (Bubble)，硬體繞送單元消除 1 週期停頓 (No-Stall)。
                      </span>
                    </div>
                    <span className="font-label-code-sm text-label-code-sm text-slate-400">
                      RISC-V / MIPS Pipeline Chapter 4.7
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Right Panel: Transcript Timeline (4 cols / ~380px) */}
          <section className="lg:col-span-4 bg-[#111827] border border-slate-800/90 rounded-xl shadow-lg shadow-black/40 overflow-hidden flex flex-col h-[670px]">
            {/* Header & Keyword Search Filter Strip */}
            <div className="p-4 bg-[#0B0F17] border-b border-slate-800/80 flex flex-col gap-1">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-0.5">
                  <span className="material-symbols-outlined text-indigo-400 text-[20px]">
                    transcribe
                  </span>
                  <h2 className="font-headline-sm text-body-md text-slate-100 font-semibold">
                    課堂逐字稿時間軸
                  </h2>
                </div>
                <span className="bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 font-label-code-sm text-label-code-sm px-2 py-0.5 rounded-full font-medium">
                  98.4% 辨識信賴度
                </span>
              </div>
              {/* Search Input Box */}
              <div className="relative w-full mt-2">
                <span className="material-symbols-outlined absolute left-2.5 top-2.5 text-[18px] text-slate-400">
                  search
                </span>
                <input
                  className="w-full pl-4 pr-10 py-2 bg-[#111827] border border-slate-700/80 rounded-lg text-body-sm font-body-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 shadow-xs transition-all"
                  placeholder="搜尋逐字稿關鍵字... (例如: Data Hazard, forwarding)"
                  value="Forwarding"
                />
                <span className="absolute right-2.5 top-2.5 font-label-code-sm text-label-code-sm text-cyan-400 font-semibold bg-cyan-950/70 border border-cyan-800 px-1.5 rounded">
                  3 筆結果
                </span>
              </div>
              {/* Transcript Role Tag Filters */}
              <div className="flex items-center gap-0.5 overflow-x-auto text-label-code-sm font-label-code-sm mt-2">
                <button
                  className="px-2 py-0.5 rounded-md bg-indigo-600 text-white font-medium"
                  type="button"
                >
                  全部 (42)
                </button>
                <button
                  className="px-2 py-0.5 rounded-md bg-[#182032] border border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
                  type="button"
                >
                  教授講授 (38)
                </button>
                <button
                  className="px-2 py-0.5 rounded-md bg-[#182032] border border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
                  type="button"
                >
                  學生提問 (3)
                </button>
                <button
                  className="px-2 py-0.5 rounded-md bg-[#182032] border border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
                  type="button"
                >
                  考題提醒 (1)
                </button>
              </div>
            </div>

            {/* Virtualized Transcript Paragraphs Flow */}
            <div className="flex-1 p-4 overflow-y-auto flex flex-col gap-2">
              {/* Paragraph 1: Past Context */}
              <article className="p-3 rounded-xl bg-[#0F131C] border border-slate-800/80 hover:border-slate-700 hover:bg-[#151c29] transition-all flex flex-col gap-1 group">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-0.5">
                    <span className="font-label-code-md text-label-code-md text-indigo-400 font-bold">
                      00:18:42 - 00:19:30
                    </span>
                    <span className="bg-slate-800 text-slate-300 border border-slate-700/60 font-label-code-sm text-label-code-sm px-1.5 py-0.2 rounded">
                      投影片 p.13
                    </span>
                  </div>
                  <span className="bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-label-code-sm text-label-code-sm px-1.5 py-0.5 rounded font-medium">
                    重點概念
                  </span>
                </div>
                <p className="text-body-md font-body-md text-slate-300 leading-relaxed">
                  …五級管線最經典的瓶頸就是資料相依性 (Data Dependency)，如果前一個指令的寫回 (WB)
                  還沒發生，後面的指令在譯碼階段就必須強行 stall…
                </p>
                <div className="flex items-center justify-between pt-0.5">
                  <span className="text-label-code-sm font-label-code-sm text-slate-500">
                    講授者：李教授
                  </span>
                  <div className="flex items-center gap-0.5 opacity-80 group-hover:opacity-100 transition-opacity">
                    <button
                      className="inline-flex items-center gap-0.25 px-1 py-0.5 rounded bg-[#182032] border border-slate-700 hover:bg-indigo-600 hover:text-white text-slate-300 text-label-code-sm font-label-code-sm shadow-xs transition-colors"
                      title="跳轉音檔至 00:18:42"
                      onClick={() => onTimeUpdate(1122)} // 00:18:42 in seconds
                      type="button"
                    >
                      <span className="material-symbols-outlined text-[14px]">play_circle</span>
                      跳轉音檔
                    </button>
                    <button
                      className="inline-flex items-center gap-0.25 px-1 py-0.5 rounded bg-[#182032] border border-slate-700 hover:bg-indigo-600 hover:text-white text-slate-300 text-label-code-sm font-label-code-sm shadow-xs transition-colors"
                      title="同步翻至投影片 13 頁"
                      onClick={() => onSlideChange(12)} // Assuming p.13 is index 12
                      type="button"
                    >
                      <span className="material-symbols-outlined text-[14px]">menu_book</span>
                      翻至 p.13
                    </button>
                  </div>
                </div>
              </article>

              {/* Paragraph 2: CURRENT PLAYING HIGHLIGHTED */}
              <article className="p-3 rounded-xl bg-[#1e1b4b]/80 border-2 border-indigo-500 shadow-xl shadow-indigo-950/60 flex flex-col gap-1 relative overflow-hidden">
                {/* Pulsing Current Glow Indicator */}
                <div className="absolute -top-8 -right-8 w-24 h-24 bg-indigo-500/25 rounded-full blur-2xl pointer-events-none"></div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-0.5">
                    <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping"></span>
                    <span className="font-label-code-md text-label-code-md text-cyan-300 font-bold">
                      00:19:30 - 00:20:15
                    </span>
                    <span className="bg-indigo-600 text-white font-label-code-sm text-label-code-sm px-1.5 py-0.2 rounded font-bold shadow-xs">
                      播映中 • p.14
                    </span>
                  </div>
                  <span className="bg-indigo-950 text-indigo-300 border border-indigo-500/40 font-label-code-sm text-label-code-sm px-1.5 py-0.5 rounded font-bold">
                    考題常客 (85% 機率)
                  </span>
                </div>
                {/* Content with keyword matches highlighted */}
                <p className="text-body-md font-body-md text-slate-100 leading-relaxed font-medium">
                  …大家注意投影片第 14 頁這張時序圖，為了解決 ALU
                  結果要等下一週期才寫入暫存器的延遲，硬體設計引入了{" "}
                  <mark className="bg-cyan-500/30 text-cyan-200 border border-cyan-400/40 font-semibold px-1 rounded">
                    Forwarding
                  </mark>
                  （前向傳遞）單元，直接把 EX 階段的運算結果繞送到下一個指令的輸入端…
                </p>
                <div className="flex items-center justify-between pt-0.5">
                  <span className="text-label-code-sm font-label-code-sm text-cyan-300 font-semibold flex items-center gap-1">
                    <span className="material-symbols-outlined text-[14px]">mic</span>
                    即時語音辨識流同步中
                  </span>
                  <div className="flex items-center gap-0.5">
                    <button
                      className="inline-flex items-center gap-0.25 px-1 py-0.5 rounded bg-indigo-600 hover:bg-indigo-500 text-white text-label-code-sm font-label-code-sm font-label-code-sm shadow-xs transition-colors"
                      type="button"
                    >
                      <span className="material-symbols-outlined text-[14px]">replay</span>
                      重聽本句
                    </button>
                    <button
                      className="inline-flex items-center gap-0.25 px-1 py-0.5 rounded bg-[#182032] border border-slate-700 hover:bg-slate-800 text-cyan-300 text-label-code-sm font-label-code-sm font-label-code-sm shadow-xs transition-colors"
                      type="button"
                    >
                      <span className="material-symbols-outlined text-[14px]">share</span>
                      引用筆記
                    </button>
                  </div>
                </div>
              </article>

              {/* Paragraph 3: Upcoming Sequence */}
              <article className="p-3 rounded-xl bg-[#0F131C] border border-slate-800/80 hover:border-slate-700 hover:bg-[#151c29] transition-all flex flex-col gap-1 group">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-0.5">
                    <span className="font-label-code-md text-label-code-md text-slate-300 font-bold">
                      00:20:15 - 00:21:05
                    </span>
                    <span className="bg-slate-800 text-slate-300 border border-slate-700/60 font-label-code-sm text-label-code-sm px-1.5 py-0.2 rounded">
                      投影片 p.14
                    </span>
                  </div>
                  <span className="text-label-code-sm font-label-code-sm text-slate-500">
                    下個段落
                  </span>
                </div>
                <p className="text-body-md font-body-md text-slate-300 leading-relaxed">
                  …這就是為什麼我們可以在不降低時脈頻率的前提下，大幅消除 RAW (Read-After-Write)
                  hazard，保證五級流水線維持接近 IPC = 1 的吞吐效能…
                </p>
                <div className="flex items-center justify-between pt-0.5">
                  <span className="text-label-code-sm font-label-code-sm text-slate-500">
                    關鍵字：RAW Hazard, IPC=1
                  </span>
                  <div className="flex items-center gap-0.5 opacity-80 group-hover:opacity-100 transition-opacity">
                    <button
                      className="inline-flex items-center gap-0.25 px-1 py-0.5 rounded bg-[#182032] border border-slate-700 hover:bg-indigo-600 hover:text-white text-slate-300 text-label-code-sm font-label-code-sm shadow-xs transition-colors"
                      title="預先跳轉音檔"
                      onClick={() => onTimeUpdate(1265)} // 00:21:05 in seconds
                      type="button"
                    >
                      <span className="material-symbols-outlined text-[14px]">fast_forward</span>
                      跳至此處
                    </button>
                  </div>
                </div>
              </article>

              {/* Paragraph 4: Load-Use Hazard Stall Preview */}
              <article className="p-3 rounded-xl bg-[#0F131C] border border-slate-800/80 hover:border-slate-700 hover:bg-[#151c29] transition-all flex flex-col gap-1 opacity-70 group">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-0.5">
                    <span className="font-label-code-md text-label-code-md text-slate-500 font-bold">
                      00:21:05 - 00:22:15
                    </span>
                    <span className="bg-slate-800 text-slate-400 border border-slate-700/60 font-label-code-sm text-label-code-sm px-1.5 py-0.2 rounded">
                      投影片 p.15
                    </span>
                  </div>
                  <span className="text-label-code-sm font-label-code-sm text-slate-500">
                    未播放
                  </span>
                </div>
                <p className="text-body-md font-body-md text-slate-400 leading-relaxed">
                  …但是！有一種情況連 Forwarding 都救不了，那就是緊接在 lw (Load Word)
                  指令後面的相依運算，這叫做 Load-Use Hazard，我們必須插進一個硬體 stall…
                </p>
              </article>
            </div>

            {/* Transcript Footer Stats & Action Strip */}
            <div className="p-2 bg-[#0B0F17] border-t border-slate-800/80 flex items-center justify-between text-label-code-sm font-label-code-sm">
              <div className="flex items-center gap-0.5">
                <span className="material-symbols-outlined text-emerald-400 text-[16px]">
                  sync_saved_locally
                </span>
                已與原檔音訊軌 100% 毫秒級對齊
              </div>
              <button
                className="text-indigo-400 hover:text-indigo-300 hover:underline font-medium inline-flex items-center gap-0.5"
                type="button"
              >
                導出完整 SRT/TXT
                <span className="material-symbols-outlined text-[14px]">file_download</span>
              </button>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
