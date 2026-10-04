import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Avatar } from "./Avatar";

describe("Avatar", () => {
  const testSrc = "https://example.com/avatar.jpg";
  const testAlt = "Test Avatar";

  it("renders with image src and alt text", () => {
    render(<Avatar src={testSrc} alt={testAlt} />);
    const img = screen.getByRole("img");
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute("src", testSrc);
    expect(img).toHaveAttribute("alt", testAlt);
  });

  it("renders fallback content when no src is provided", () => {
    render(<Avatar fallback={<span>Test</span>} />);
    const fallbackEl = screen.getByText("Test");
    expect(fallbackEl).toBeInTheDocument();
    // Should not have an img
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });

  // Size tests
  it.each([
    ["xs", 6],
    ["sm", 8],
    ["md", 10],
    ["lg", 12],
    ["xl", 14],
  ])("applies size classes correctly for size %s", (size, expectedSize) => {
    render(<Avatar size={size} />);
    const fallbackSpan = screen.getByText("person");
    const innerDiv = fallbackSpan.parentElement as HTMLElement;
    expect(innerDiv).toHaveClass(`h-${expectedSize}`);
    expect(innerDiv).toHaveClass(`w-${expectedSize}`);
  });

  // Variant tests
  it.each([
    ["default", "rounded-md"],
    ["circular", "rounded-full"],
    ["square", "rounded-none"],
  ])("applies variant classes correctly for variant %s", (variant, expectedClass) => {
    render(<Avatar variant={variant} />);
    const fallbackSpan = screen.getByText("person");
    const innerDiv = fallbackSpan.parentElement as HTMLElement;
    expect(innerDiv).toHaveClass(expectedClass);
  });

  it("applies bordered class when bordered is true", () => {
    render(<Avatar bordered />);
    const fallbackSpan = screen.getByText("person");
    const innerDiv = fallbackSpan.parentElement as HTMLElement;
    expect(innerDiv).toHaveClass("border");
    expect(innerDiv).toHaveClass("border-surface-container");
  });

  it("does not apply bordered class when bordered is false", () => {
    render(<Avatar bordered={false} />);
    const fallbackSpan = screen.getByText("person");
    const innerDiv = fallbackSpan.parentElement as HTMLElement;
    expect(innerDiv).not.toHaveClass("border");
  });

  // Dot status indicator tests
  it.each([
    ["success", "bg-success-fixed"],
    ["warning", "bg-warning-fixed"],
    ["error", "bg-error-fixed"],
    ["default", "bg-primary-fixed"],
  ])(
    "renders dot status indicator with correct color for %s",
    (statusColor, expectedColorClass) => {
      render(<Avatar src={testSrc} alt={testAlt} dot statusColor={statusColor} />);
      const img = screen.getByRole("img");
      expect(img).toBeInTheDocument();
      const outerDiv = img.parentElement as HTMLElement;
      const dotEl = outerDiv.querySelector(
        "span.absolute.bottom-0.right-0.w-2.h-2.rounded-full.border-2.border-surface-container-high",
      );
      expect(dotEl).toBeInTheDocument();
      expect(dotEl).toHaveClass(expectedColorClass);
    },
  );

  it("does not render dot when dot is false", () => {
    render(<Avatar src={testSrc} alt={testAlt} dot={false} />);
    const img = screen.getByRole("img");
    expect(img).toBeInTheDocument();
    const outerDiv = img.parentElement as HTMLElement;
    const dotEl = outerDiv.querySelector(
      "span.absolute.bottom-0.right-0.w-2.h-2.rounded-full.border-2.border-surface-container-high",
    );
    expect(dotEl).not.toBeInTheDocument();
  });

  it("handles alt text correctly when src is provided", () => {
    render(<Avatar src={testSrc} alt={testAlt} />);
    const img = screen.getByRole("img");
    expect(img).toHaveAttribute("alt", testAlt);
  });

  it("uses empty alt when src is provided but alt is not", () => {
    render(<Avatar src={testSrc} />);
    // The img element has an empty alt, so its role is presentation.
    const imgEl = screen.getByRole("img");
    expect(imgEl).toBeInTheDocument();
    expect(imgEl).toHaveAttribute("alt", "");
    expect(imgEl).toHaveAttribute("src", testSrc);
  });
});
