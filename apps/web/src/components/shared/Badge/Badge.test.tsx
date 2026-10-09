import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Badge } from "./Badge";

describe("Badge", () => {
  it("應該渲染預設變體和大小的 badge", () => {
    const children = "預設 badge";
    const { container } = render(<Badge>{children}</Badge>);
    const textElement = screen.getByText(children);
    // textElement is the badge span itself
    const badgeElement = textElement as HTMLElement;
    expect(badgeElement).toBeInTheDocument();
    // 檢查基礎類別存在
    expect(badgeElement).toHaveClass("inline-flex");
    expect(badgeElement).toHaveClass("items-center");
    expect(badgeElement).toHaveClass("justify-center");
    expect(badgeElement).toHaveClass("rounded-full");
    expect(badgeElement).toHaveClass("text-xs");
    expect(badgeElement).toHaveClass("font-medium");
    expect(badgeElement).toHaveClass("transition-all");
    // 檢查預設變體類別
    expect(badgeElement).toHaveClass("bg-surface-container-lowest");
    expect(badgeElement).toHaveClass("text-on-surface-variant");
    // 檢預設大小
    expect(badgeElement).toHaveClass("h-7");
    expect(badgeElement).toHaveClass("w-7");
  });

  it("應該渲染正確的變體類別", () => {
    const variants = ["default", "primary", "secondary", "success", "warning", "error"] as const;
    variants.forEach((variant) => {
      const children = variant;
      const { container } = render(<Badge variant={variant}>{children}</Badge>);
      const textElement = screen.getByText(children);
      const badgeElement = textElement as HTMLElement;
      // 檢查每個變體的特定類別
      switch (variant) {
        case "default":
          expect(badgeElement).toHaveClass("bg-surface-container-lowest");
          expect(badgeElement).toHaveClass("text-on-surface-variant");
          break;
        case "primary":
          expect(badgeElement).toHaveClass("bg-primary-fixed");
          expect(badgeElement).toHaveClass("text-on-primary-fixed");
          break;
        case "secondary":
          expect(badgeElement).toHaveClass("bg-secondary-fixed");
          expect(badgeElement).toHaveClass("text-on-secondary-fixed");
          break;
        case "success":
          expect(badgeElement).toHaveClass("bg-success-fixed");
          expect(badgeElement).toHaveClass("text-on-success-fixed");
          break;
        case "warning":
          expect(badgeElement).toHaveClass("bg-warning-fixed");
          expect(badgeElement).toHaveClass("text-on-warning-fixed");
          break;
        case "error":
          expect(badgeElement).toHaveClass("bg-error-fixed");
          expect(badgeElement).toHaveClass("text-on-error-fixed");
          break;
      }
    });
  });

  it("應該渲染正確的大小類別", () => {
    // 小尺寸
    const childrenSm = "小 badge";
    const { container: containerSm } = render(<Badge size="sm">{childrenSm}</Badge>);
    const textElementSm = screen.getByText(childrenSm);
    const badgeElementSm = textElementSm as HTMLElement;
    expect(badgeElementSm).toHaveClass("h-6");
    expect(badgeElementSm).toHaveClass("w-6");
    expect(badgeElementSm).not.toHaveClass("h-7");
    expect(badgeElementSm).not.toHaveClass("w-7");

    // 中尺寸
    const childrenMd = "中 badge";
    const { container: containerMd } = render(<Badge size="md">{childrenMd}</Badge>);
    const textElementMd = screen.getByText(childrenMd);
    const badgeElementMd = textElementMd as HTMLElement;
    expect(badgeElementMd).toHaveClass("h-7");
    expect(badgeElementMd).toHaveClass("w-7");
    expect(badgeElementMd).not.toHaveClass("h-6");
    expect(badgeElementMd).not.toHaveClass("w-6");
  });

  it("應該在 dot 為 true 時渲染為點狀", () => {
    const { container } = render(<Badge dot />);
    // Dot badge should have width/height of 2.5 and rounded-full
    const dotBadge = container.querySelector(".h-2\\.5") as HTMLElement;
    expect(dotBadge).toBeInTheDocument();
    expect(dotBadge).toHaveClass("w-2.5");
    expect(dotBadge).toHaveClass("rounded-full");
    // Should not have size classes h-6/h-7 etc.
    expect(dotBadge).not.toHaveClass("h-6");
    expect(dotBadge).not.toHaveClass("w-6");
    expect(dotBadge).not.toHaveClass("h-7");
    expect(dotBadge).not.toHaveClass("w-7");
  });

  it("應該在 dot 為 false 時不渲染點狀樣式", () => {
    const children = "有內容";
    const { container } = render(<Badge dot={false}>{children}</Badge>);
    const textElement = screen.getByText(children);
    const badgeElement = textElement as HTMLElement;
    expect(badgeElement).not.toHaveClass("h-2\\.5");
    expect(badgeElement).not.toHaveClass("w-2\\.5");
    expect(badgeElement).toHaveClass("h-7");
    expect(badgeElement).toHaveClass("w-7");
  });
});
