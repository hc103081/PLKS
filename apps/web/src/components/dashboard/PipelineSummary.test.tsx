import { render, screen } from "@testing-library/react";
import { PipelineSummary } from "./PipelineSummary";

// Vitest 全域函數
import { describe, expect, it } from "vitest";

describe("PipelineSummary", () => {
  it("should render summary with in progress count", () => {
    render(
      <PipelineSummary
        inProgress={3}
        pending={2}
        needsAttention={1}
        healthy
        healthPercentage={75}
      />,
    );

    // Check that "進行中" label exists
    const inProgressLabel = screen.getByText("進行中");
    expect(inProgressLabel).toBeInTheDocument();

    // Check that the value 3 is displayed
    const inProgressValue = screen.getByText("3");
    expect(inProgressValue).toBeInTheDocument();
  });

  it("should render summary with all counts", () => {
    render(
      <PipelineSummary
        inProgress={5}
        pending={3}
        needsAttention={2}
        healthy={false}
        healthPercentage={40}
      />,
    );

    // Check that counts are displayed
    expect(screen.getByText("5")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();

    // Check that health percentage is displayed
    expect(screen.getByText("40%")).toBeInTheDocument();
  });

  it("should display healthy and unhealthy states", () => {
    // Healthy state
    render(
      <PipelineSummary
        inProgress={1}
        pending={0}
        needsAttention={0}
        healthy={true}
        healthPercentage={100}
      />,
    );

    // Check green progress bar for healthy state
    expect(screen.getByText("100%")).toBeInTheDocument();

    // Unhealthy state
    render(
      <PipelineSummary
        inProgress={1}
        pending={0}
        needsAttention={0}
        healthy={false}
        healthPercentage={30}
      />,
    );

    // Check red progress bar for unhealthy state
    expect(screen.getByText("30%")).toBeInTheDocument();
  });
});
