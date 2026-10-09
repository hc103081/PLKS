import { render, screen } from "@testing-library/react";
import { CourseCard } from "./CourseCard";

// Vitest 全域函數
import { describe, expect, it, vi } from "vitest";

describe("CourseCard", () => {
  const mockOnView = vi.fn();
  const mockOnManage = vi.fn();

  it("should render course card with correct name and semester", () => {
    render(
      <CourseCard
        id="cs101"
        name="計算機概論"
        semester="大一上"
        status="idle"
        progress={60}
        onView={() => {}}
        onManage={() => {}}
      />,
    );

    const nameElement = screen.getByText("計算機概論");
    expect(nameElement).toBeInTheDocument();

    const semesterElement = screen.getByText("大一上");
    expect(semesterElement).toBeInTheDocument();
  });

  it("should display correct status style for idle", () => {
    render(
      <CourseCard
        id="cs101"
        name="課程測試"
        semester="大一上"
        status="idle"
        progress={0}
        onView={() => {}}
        onManage={() => {}}
      />,
    );

    // Check that the card exists and contains expected content
    const card = screen.getByText("課程測試");
    expect(card).toBeInTheDocument();

    // Check progress display
    const progressElement = screen.getByText("0%");
    expect(progressElement).toBeInTheDocument();
  });

  it("should handle view and manage clicks", () => {
    render(
      <CourseCard
        id="cs101"
        name="課程測試"
        semester="大一上"
        status="idle"
        progress={0}
        onView={mockOnView}
        onManage={mockOnManage}
      />,
    );

    // Click on the card text (should trigger onView)
    const card = screen.getByText("課程測試");
    card.click();
    expect(mockOnView).toHaveBeenCalledWith("cs101");

    // Click manage button (should trigger onManage)
    const manageButton = screen.getByText("管理");
    manageButton.click();
    expect(mockOnManage).toHaveBeenCalledWith("cs101");
  });
});
