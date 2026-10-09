import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { RawAssetData, TranscriptSegment, VisualAsset } from "../../../types/course";
import { TabRaw } from "./TabRaw";

describe("TabRaw", () => {
  const createMockRawAsset = (overrides: Partial<RawAssetData> = {}): RawAssetData => ({
    sessionId: "sess-123",
    courseId: "cs101",
    audioUrl: "https://example.com/audio.mp3",
    transcripts: [
      {
        id: "t1",
        startTime: 0,
        endTime: 30,
        text: "Welcome to the lecture",
        speaker: "Professor",
        confidence: 0.95,
      },
      {
        id: "t2",
        startTime: 30,
        endTime: 60,
        text: "Today we discuss pipelines",
        speaker: "Professor",
        confidence: 0.92,
      },
    ] as TranscriptSegment[],
    visualAssets: [
      {
        id: "v1",
        pageNum: 1,
        b2Uri: "s3://bucket/slide1.png",
        width: 1920,
        height: 1080,
        mimeType: "image/png",
      },
      {
        id: "v2",
        pageNum: 2,
        b2Uri: "s3://bucket/slide2.png",
        width: 1920,
        height: 1080,
        mimeType: "image/png",
      },
    ] as VisualAsset[],
    duration: 4500,
    ...overrides,
  });

  const mockCourse = {
    id: "cs101",
    name: "CS101: Computer Architecture",
    code: "CS101",
    semester: "113-1",
    credits: 3,
    required: true,
    status: "ready" as const,
    progress: 50,
    totalChapters: 8,
    completedChapters: 4,
    conceptGraphCount: 50,
    audioCount: 10,
    quizCount: 8,
  };

  const defaultProps = {
    course: mockCourse,
    rawAsset: createMockRawAsset(),
    sessionId: "sess-123",
    activeSubTab: "audio" as const,
    onSubTabChange: vi.fn(),
    isLoading: false,
    currentTime: 1122,
    currentSlide: 0,
    onTimeUpdate: vi.fn(),
    onSlideChange: vi.fn(),
  };

  it("renders loading skeletons when isLoading is true", () => {
    const { container } = render(<TabRaw {...defaultProps} isLoading={true} />);

    // In loading state, container should have animate-pulse elements
    const pulseElements = container.querySelectorAll(".animate-pulse");
    expect(pulseElements.length).toBeGreaterThan(0);
  });

  it("renders loading skeletons when rawAsset is undefined", () => {
    const { container } = render(
      <TabRaw {...defaultProps} rawAsset={undefined} isLoading={false} />,
    );

    // In loading state, container should have animate-pulse elements
    const pulseElements = container.querySelectorAll(".animate-pulse");
    expect(pulseElements.length).toBeGreaterThan(0);
  });

  it("renders sub-tab navigation buttons", () => {
    render(<TabRaw {...defaultProps} />);

    // Check all 4 sub-tab buttons exist (Split View + Audio + Slides + Transcript)
    const splitViewBtn = screen.getByRole("button", { name: /三合一同步檢視/ });
    const audioBtn = screen.getByRole("button", { name: /音檔分析/ });
    const slidesBtn = screen.getByRole("button", { name: /講義投影片/ });
    const transcriptBtn = screen.getByRole("button", { name: /課堂逐字稿/ });

    expect(splitViewBtn).toBeInTheDocument();
    expect(audioBtn).toBeInTheDocument();
    expect(slidesBtn).toBeInTheDocument();
    expect(transcriptBtn).toBeInTheDocument();
  });

  it("highlights active sub-tab", () => {
    render(<TabRaw {...defaultProps} activeSubTab="slides" />);

    const slidesBtn = screen.getByRole("button", { name: /講義投影片/ });
    // Active tab should have indigo background
    expect(slidesBtn).toHaveClass("bg-indigo-600");
  });

  it("calls onSubTabChange when sub-tab is clicked", async () => {
    const onSubTabChange = vi.fn();
    render(<TabRaw {...defaultProps} onSubTabChange={onSubTabChange} />);

    const transcriptBtn = screen.getByRole("button", { name: /課堂逐字稿/ });
    await userEvent.click(transcriptBtn);

    expect(onSubTabChange).toHaveBeenCalledWith("transcript");
  });

  it("renders audio player section with controls", () => {
    render(<TabRaw {...defaultProps} />);

    // Check audio player elements
    expect(screen.getByRole("button", { name: /快退/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /播放或暫停/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /快進/ })).toBeInTheDocument();
    // Current time display exists in the player controls
    const timeElements = screen.getAllByText(/00:18:42/);
    expect(timeElements.length).toBeGreaterThanOrEqual(1);
    // Duration shows as 01:14:32 in the metadata (multiple occurrences)
    const durationElements = screen.getAllByText(/01:14:32/);
    expect(durationElements.length).toBeGreaterThanOrEqual(1);
  });

  it("renders slide viewer with navigation", () => {
    render(<TabRaw {...defaultProps} activeSubTab="slides" />);

    // Check slide viewer elements
    expect(screen.getByRole("button", { name: /上一頁/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /下一頁/ })).toBeInTheDocument();
    expect(screen.getByText(/1 \/ 2/)).toBeInTheDocument(); // current slide / total (0-indexed + 1)
    expect(screen.getByRole("button", { name: /適合寬度/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /全螢幕檢視/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /下載原檔/ })).toBeInTheDocument();
  });

  it("calls onSlideChange when slide navigation is clicked", async () => {
    const onSlideChange = vi.fn();
    render(<TabRaw {...defaultProps} onSlideChange={onSlideChange} activeSubTab="slides" />);

    const nextBtn = screen.getByRole("button", { name: /下一頁/ });
    await userEvent.click(nextBtn);

    expect(onSlideChange).toHaveBeenCalledWith(1); // from 0 to 1
  });

  it("renders transcript timeline with search and filters", () => {
    render(<TabRaw {...defaultProps} activeSubTab="transcript" />);

    // Check transcript section
    expect(screen.getByText(/課堂逐字稿時間軸/)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/搜尋逐字稿關鍵字/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /全部/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /教授講授/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /學生提問/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /考題提醒/ })).toBeInTheDocument();
  });

  it("renders transcript paragraphs with sync buttons", () => {
    render(<TabRaw {...defaultProps} activeSubTab="transcript" />);

    // Check transcript paragraphs
    expect(screen.getByText(/00:18:42 - 00:19:30/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /跳轉音檔/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /翻至 p\.13/ })).toBeInTheDocument();
  });

  it("calls onTimeUpdate when transcript jump button is clicked", async () => {
    const onTimeUpdate = vi.fn();
    render(<TabRaw {...defaultProps} activeSubTab="transcript" onTimeUpdate={onTimeUpdate} />);

    const jumpBtn = screen.getByRole("button", { name: /跳轉音檔/ });
    await userEvent.click(jumpBtn);

    expect(onTimeUpdate).toHaveBeenCalledWith(1122); // 00:18:42 in seconds
  });

  it("displays auto-sync toggle", () => {
    render(<TabRaw {...defaultProps} />);

    expect(screen.getByText(/時間軸自動捲動.*投影片連動/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /切換連動模式/ })).toBeInTheDocument();
  });

  it("renders chapter timeline markers on waveform", () => {
    render(<TabRaw {...defaultProps} />);

    // Check chapter markers
    expect(screen.getByText(/00:05:10 緒論/)).toBeInTheDocument();
    expect(screen.getByText(/00:18:42 經典五大階段/)).toBeInTheDocument();
    expect(screen.getByText(/00:32:15 管線衝突冒險/)).toBeInTheDocument();
  });

  it("renders slide thumbnails sidebar", () => {
    render(<TabRaw {...defaultProps} activeSubTab="slides" />);

    // Check thumbnails sidebar
    expect(screen.getByText(/投影片縮圖/)).toBeInTheDocument();
    // Use more specific selector for thumbnail page numbers
    const thumbnails = screen.getAllByText(/^p\.\d+$/);
    expect(thumbnails.length).toBeGreaterThanOrEqual(2);
  });

  it("displays export button in transcript footer", () => {
    render(<TabRaw {...defaultProps} activeSubTab="transcript" />);

    expect(screen.getByRole("button", { name: /導出完整 SRT\/TXT/ })).toBeInTheDocument();
  });
});
