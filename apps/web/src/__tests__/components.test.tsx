import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { CourseConsole } from "../pages/CourseConsole.js";
import { Dashboard } from "../pages/Dashboard.js";
import { QuizPlayer } from "../pages/QuizPlayer.js";
import { SidekickChat } from "../pages/SidekickChat.js";

// Test wrapper with providers
const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 1000 * 60 * 5, retry: 0 },
  },
});

const renderWithProviders = (ui: React.ReactElement) => {
  return render(
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>{ui}</BrowserRouter>
    </QueryClientProvider>,
  );
};

// Mock API service
vi.mock("../services/api", () => ({
  getIngestionStatus: vi.fn().mockResolvedValue({ status: "stopped" }),
  getCourses: vi.fn().mockResolvedValue([
    { id: "CS101", name: "機器學習基礎", progress: 65 },
    { id: "CS102", name: "深度學習", progress: 30 },
    { id: "CS103", name: "自然語言處理", progress: 0 },
  ]),
  startSession: vi.fn().mockResolvedValue({}),
  uploadFile: vi.fn().mockResolvedValue({ sessionId: "test-session", courseId: "CS101" }),
  getQuiz: vi.fn().mockResolvedValue({
    sessionId: "session-1",
    quiz: {
      quizId: "q1",
      question: "Test?",
      type: "multiple_choice",
      options: ["A", "B"],
      correctAnswer: "A",
    },
  }),
  submitAnswer: vi.fn().mockResolvedValue({
    isCorrect: true,
    xpEarned: 100,
    nextQuiz: null,
    session: { state: "PLAYING" },
  }),
  requestSidekickHelp: vi
    .fn()
    .mockResolvedValue({ hint: "Hint", explanation: "Explanation", socraticQuestion: "Question?" }),
}));

// Mock hooks
vi.mock("../hooks/useGamification", () => ({
  useGamification: () => ({
    startNewGame: vi.fn(),
    answerQuiz: vi.fn(),
    requestSidekickHelp: vi.fn(),
  }),
}));

describe("Dashboard", () => {
  it("renders without crashing (shows loading initially)", () => {
    renderWithProviders(<Dashboard />);
    // Dashboard shows loading initially, then loads data
    expect(screen.getByText(/載入中/i)).toBeInTheDocument();
  });

  it("eventually shows dashboard content after loading", async () => {
    renderWithProviders(<Dashboard />);
    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.queryByText(/載入中/i)).not.toBeInTheDocument();
    });
    // Then check that PLKS is visible (there are two: header and footer)
    const plksElements = screen.getAllByText(/PLKS/i);
    expect(plksElements.length).toBeGreaterThan(0);
  });
});

describe("CourseConsole", () => {
  it("renders without crashing", () => {
    renderWithProviders(<CourseConsole />);
    expect(screen.getByText(/課程主控台/i)).toBeInTheDocument();
  });

  it("shows quiz section", () => {
    renderWithProviders(<CourseConsole />);
    expect(screen.getByText(/練習測驗/i)).toBeInTheDocument();
  });
});

describe("QuizPlayer", () => {
  it("renders without crashing (shows no course selected)", () => {
    renderWithProviders(<QuizPlayer />);
    expect(screen.getByText(/未選擇課程/i)).toBeInTheDocument();
  });
});

describe("SidekickChat", () => {
  it("renders without crashing", () => {
    renderWithProviders(<SidekickChat />);
    expect(screen.getByText(/小幫手聊天/i)).toBeInTheDocument();
  });

  it("shows chat input", () => {
    renderWithProviders(<SidekickChat />);
    expect(screen.getByPlaceholderText(/詢問小幫手問題/i)).toBeInTheDocument();
  });

  it("shows send button", () => {
    renderWithProviders(<SidekickChat />);
    expect(screen.getByRole("button", { name: /發送/i })).toBeInTheDocument();
  });
});
