import { render, screen } from "@testing-library/react";
import { CourseCardSkeleton } from "./CourseCardSkeleton";

// Vitest 全域函數
import { describe, expect, it } from "vitest";

describe("CourseCardSkeleton", () => {
  it("should render skeleton cards with count 3", () => {
    render(<CourseCardSkeleton skeletonCount={3} />);

    // Check that skeleton elements exist (15 elements with empty text)
    const skeletons = screen.getAllByText("");
    expect(skeletons.length).toBe(15);
  });

  it("should render skeleton cards with default count", () => {
    render(<CourseCardSkeleton />);

    // Check that skeleton elements exist (15 elements with empty text)
    const skeletons = screen.getAllByText("");
    expect(skeletons.length).toBe(15);
  });
});
