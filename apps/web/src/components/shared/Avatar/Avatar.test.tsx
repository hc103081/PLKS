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
    ["xs", 6] as const,
    ["sm", 8] as const,
    ["md", 10] as const,
    ["lg", 12] as const,
    ["xl", 14] as const,
  ])(
    "applies size classes correctly for size %s",
    (size: "xs" | "sm" | "md" | "lg" | "xl", expectedSize: number) => {
      render(<Avatar size={size} />);
      const fallbackSpan = screen.getByText("person");
      const innerDiv = fallbackSpan.parentElement as HTMLElement;
      expect(innerDiv).toHaveClass(`h-${expectedSize}`);
      expect(innerDiv).toHaveClass(`w-${expectedSize}`);
    },
  );

  // Variant tests
  it.each([
    ["default", "rounded-md"] as const,
    ["circular", "rounded-full"] as const,
    ["square", "rounded-none"] as const,
  ])(
    "applies variant classes correctly for variant %s",
    (variant: "default" | "circular" | "square", expectedClass: string) => {
      render(<Avatar variant={variant} />);
      const fallbackSpan = screen.getByText("person");
      const innerDiv = fallbackSpan.parentElement as HTMLElement;
      expect(innerDiv).toHaveClass(expectedClass);
    },
  );

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
    ["success", "bg-success-fixed"] as const,
    ["warning", "bg-warning-fixed"] as const,
    ["error", "bg-error-fixed"] as const,
    ["default", "bg-primary-fixed"] as const,
  ])(
    "renders dot status indicator with correct color for %s",
    (statusColor: "success" | "warning" | "error" | "default", expectedColorClass: string) => {
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
