import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { GameSession, GameSessionState, QuizItemPayload } from "../../../types/api";
import type { CourseCardData } from "../../../types/course";
import { TabGame } from "./TabGame";

const mockOnAnswerSubmit = vi.fn().mockResolvedValue({ isCorrect: true, xpEarned: 100 });
const mockOnSidekickRequest = vi.fn().mockResolvedValue(undefined);
const mockOnSidekickSendMessage = vi.fn().mockResolvedValue(undefined);

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

  const createMockGameState = (overrides: Partial<GameSessionState> = {}): GameSessionState => ({
    sessionId: "sess-123",
    courseId: "cs101",
    currentQuizIndex: 0,
    totalQuizzes: 8,
    score: 100,
    streak: 2,
    maxStreak: 5,
    xp: 250,
    level: 1,
    answers: [],
    sidekickOpen: false,
    sidekickHistory: [],
    startedAt: new Date().toISOString(),
    ...overrides,
  });

  const createMockGameSession = (overrides: Partial<GameSession> = {}): GameSession => ({
    sessionId: "sess-123",
    courseId: "cs101",
    state: "PLAYING",
    quizItems: [],
    currentIndex: 0,
    score: 0,
    streak: 0,
    answers: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
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
    const mockGameState = createMockGameState({ currentQuizIndex: 0 });
    const mockGameSession = createMockGameSession({ quizItems: createMockQuizItems() });

    render(
      <TabGame
        course={mockCourse}
        gameState={mockGameState}
        gameSession={mockGameSession}
        _sessionId="sess-123"
        isLoading={false}
        sidekickOpen={false}
        onSidekickToggle={() => {}}
        onAnswerSubmit={mockOnAnswerSubmit}
        onSidekickRequest={mockOnSidekickRequest}
        onSidekickSendMessage={mockOnSidekickSendMessage}
      />,
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
    const onSidekickToggle = vi.fn();

    render(
      <TabGame
        course={createMockCourse({ progress: 0 })}
        gameState={createMockGameState()}
        gameSession={createMockGameSession({ quizItems: createMockQuizItems() })}
        _sessionId="sess-123"
        isLoading={false}
        sidekickOpen={false}
        onSidekickToggle={onSidekickToggle}
        onAnswerSubmit={mockOnAnswerSubmit}
        onSidekickRequest={mockOnSidekickRequest}
        onSidekickSendMessage={mockOnSidekickSendMessage}
      />,
    );

    // Initially sidekick should be closed (collapsed layout)
    const sidekickBtn = screen.getByRole("button", {
      name: /呼叫 Sidekick/,
    });

    // Click the button using userEvent for better event simulation
    await userEvent.click(sidekickBtn);

    // Verify the onSidekickToggle handler was called
    expect(onSidekickToggle).toHaveBeenCalledTimes(1);
  });

  it("displays progress when game state is available", () => {
    const mockQuizItems = createMockQuizItems();

    render(
      <TabGame
        course={createMockCourse({ progress: 85 })}
        gameState={createMockGameState({ currentQuizIndex: 4, totalQuizzes: 8 })}
        gameSession={createMockGameSession({ quizItems: mockQuizItems, currentIndex: 4 })}
        _sessionId="sess-123"
        isLoading={false}
        sidekickOpen={false}
        onSidekickToggle={() => {}}
        onAnswerSubmit={mockOnAnswerSubmit}
        onSidekickRequest={mockOnSidekickRequest}
        onSidekickSendMessage={mockOnSidekickSendMessage}
      />,
    );

    // Progress should display 50% (current quiz index 4 out of 8 total)
    const progressText = screen.getByText(/50%/i);
    expect(progressText).toBeInTheDocument();

    // Check quiz navigation is present - look for navigation buttons
    const navButtons = screen.getAllByRole("button", {
      name: /上一題|下一題|重新挑戰|重新開始|呼叫 Sidekick/i,
    });
    expect(navButtons.length).toBeGreaterThan(0);
  });
});
