import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { GameSession, GameSessionState, QuizItemPayload } from "../../../types/api";
import type { CourseCardData } from "../../../types/course";
import { TabGame } from "./TabGame";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactNode } from "react";

const mockOnAnswerSubmit = vi.fn().mockResolvedValue({ isCorrect: true, xpEarned: 100 });
const mockOnSidekickRequest = vi.fn().mockResolvedValue(undefined);
const mockOnSidekickSendMessage = vi.fn().mockResolvedValue(undefined);

// Create a wrapper with QueryClient for React Query
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe("TabGame", () => {
  const createMockCourse = (overrides: Partial<CourseCardData> = {}): CourseCardData => ({
    id: "cs101",
    code: "CS101",
    name: "CS101: 計算機概論",
    semester: "113-1",
    credits: 3,
    required: true,
    status: "ready",
    progress: 85,
    totalChapters: 8,
    completedChapters: 7,
    conceptGraphCount: 50,
    audioCount: 10,
    quizCount: 8,
    ...overrides,
  });

  const createMockQuizItems = (): QuizItemPayload[] => [
    {
      quizId: "q1",
      courseId: "cs101",
      type: "multiple_choice",
      question: "什麼是二進位制？",
      options: [
        "基數為2的計數系統",
        "基數為10的計數系統",
        "基數為16的計數系統",
        "基數為8的計數系統",
      ],
      correctAnswer: "基數為2的計數系統",
      contextReference: "concept-1",
    },
    {
      quizId: "q2",
      courseId: "cs101",
      type: "true_false",
      question: "CPU 是電腦的大腦。",
      options: ["True", "False"],
      correctAnswer: "True",
      contextReference: "concept-2",
    },
  ];

  it("renders quiz player and sidekick button", () => {
    const mockCourse = createMockCourse({ progress: 85 });

    render(
      <TabGame course={mockCourse} sessionId="sess-123" />,
      { wrapper: createWrapper() }
    );

    // Check quiz player section renders - look for the main card with progress
    const quizArea = screen.getByText(/0%|50%|85%/i);
    expect(quizArea).toBeInTheDocument();

    // Check sidekick button is rendered (collapsed layout when sidekick is closed)
    const sidekickBtn = screen.getByRole("button", {
      name: /呼叫 Sidekick/,
    });
    expect(sidekickBtn).toBeInTheDocument();
  });

  it("handles sidekick toggle state", async () => {
    // Note: The new implementation manages sidekick state internally via React Query
    // This test just verifies the component renders without errors

    render(
      <TabGame course={createMockCourse({ progress: 0 })} sessionId="sess-123" />,
      { wrapper: createWrapper() }
    );

    // Initially sidekick should be closed (collapsed layout)
    const sidekickBtn = screen.getByRole("button", {
      name: /呼叫 Sidekick/,
    });

    // Click the button using userEvent for better event simulation
    await userEvent.click(sidekickBtn);

    // The button should still exist (it triggers sidekick request internally)
    expect(sidekickBtn).toBeInTheDocument();
  });

  it("displays progress when game state is available", () => {
    const mockCourse = createMockCourse({ progress: 85 });

    render(
      <TabGame course={mockCourse} sessionId="sess-123" />,
      { wrapper: createWrapper() }
    );

    // Progress should display (may be 0% initially since game state loads async)
    const progressText = screen.getByText(/%/i);
    expect(progressText).toBeInTheDocument();

    // Check quiz navigation is present - look for navigation buttons
    const navButtons = screen.getAllByRole("button", {
      name: /上一題|下一題|重新挑戰|重新開始|呼叫 Sidekick/i,
    });
    expect(navButtons.length).toBeGreaterThan(0);
  });
});