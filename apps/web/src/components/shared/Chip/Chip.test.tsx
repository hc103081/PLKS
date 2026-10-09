import { render, screen } from "@testing-library/react";
import { fireEvent } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { Chip } from "./Chip";

describe("Chip", () => {
  it("應該渲染預設變體和大小的 chip", () => {
    const children = "預設 chip";
    render(<Chip>{children}</Chip>);
    const textElement = screen.getByText(children);
    const chipElement = textElement.parentElement as HTMLElement;
    expect(chipElement).toBeInTheDocument();
    // 檢查基礎類別存在
    expect(chipElement).toHaveClass("inline-flex");
    expect(chipElement).toHaveClass("items-center");
    expect(chipElement).toHaveClass("justify-center");
    expect(chipElement).toHaveClass("gap-1.5");
    expect(chipElement).toHaveClass("whitespace-nowrap");
    expect(chipElement).toHaveClass("rounded-md");
    expect(chipElement).toHaveClass("text-xs");
    expect(chipElement).toHaveClass("font-medium");
    // 檢查預設變體類別
    expect(chipElement).toHaveClass("bg-surface-container-lowest");
    expect(chipElement).toHaveClass("text-on-surface-variant");
    // 檢預設大小
    expect(chipElement).toHaveClass("h-9");
    expect(chipElement).toHaveClass("px-3");
  });

  it("應該渲�正確的變體類別", () => {
    const variants = ["default", "primary", "secondary", "success", "warning", "error"] as const;
    for (const variant of variants) {
      const children = variant;
      render(<Chip variant={variant}>{children}</Chip>);
      const textElement = screen.getByText(children);
      const chipElement = textElement.parentElement as HTMLElement;
      // 檢查每個變體的特定類別
      switch (variant) {
        case "default":
          expect(chipElement).toHaveClass("bg-surface-container-lowest");
          expect(chipElement).toHaveClass("text-on-surface-variant");
          break;
        case "primary":
          expect(chipElement).toHaveClass("bg-primary-fixed/10");
          expect(chipElement).toHaveClass("text-primary");
          break;
        case "secondary":
          expect(chipElement).toHaveClass("bg-secondary-fixed/10");
          expect(chipElement).toHaveClass("text-secondary");
          break;
        case "success":
          expect(chipElement).toHaveClass("bg-success-fixed/10");
          expect(chipElement).toHaveClass("text-success");
          break;
        case "warning":
          expect(chipElement).toHaveClass("bg-warning-fixed/10");
          expect(chipElement).toHaveClass("text-warning");
          break;
        case "error":
          expect(chipElement).toHaveClass("bg-error-fixed/10");
          expect(chipElement).toHaveClass("text-error");
          break;
      }
    }
  });

  it("應該渲�正確的大小類別", () => {
    // 小尺寸
    const childrenSm = "小 chip";
    render(<Chip size="sm">{childrenSm}</Chip>);
    const textElementSm = screen.getByText(childrenSm);
    const chipElementSm = textElementSm.parentElement as HTMLElement;
    expect(chipElementSm).toHaveClass("h-8");
    expect(chipElementSm).toHaveClass("px-2.5");
    expect(chipElementSm).not.toHaveClass("h-9");
    expect(chipElementSm).not.toHaveClass("px-3");

    // 中尺寸
    const childrenMd = "中 chip";
    render(<Chip size="md">{childrenMd}</Chip>);
    const textElementMd = screen.getByText(childrenMd);
    const chipElementMd = textElementMd.parentElement as HTMLElement;
    expect(chipElementMd).toHaveClass("h-9");
    expect(chipElementMd).toHaveClass("px-3");
    expect(chipElementMd).not.toHaveClass("h-8");
    expect(chipElementMd).not.toHaveClass("px-2.5");
  });

  it("應該在 clickable 為 true 時渲�為可點擊元素", () => {
    const onClick = vi.fn();
    const children = "點擊 me";
    render(
      <Chip clickable onClick={onClick}>
        {children}
      </Chip>,
    );
    const textElement = screen.getByText(children);
    const chipElement = textElement.parentElement as HTMLElement;
    // 檢查 role 和 tabIndex
    expect(chipElement).toHaveAttribute("role", "button");
    expect(chipElement).toHaveAttribute("tabindex", "0");
    // 檢查點擊類別
    expect(chipElement).toHaveClass("cursor-pointer");
    expect(chipElement).toHaveClass("hover:opacity-90");

    // 模擬點擊
    fireEvent.click(chipElement);
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("應該在 clickable 為 false 時不渲�為可點擊元器", () => {
    const onClick = vi.fn();
    const children = "不可點擊";
    render(
      <Chip clickable={false} onClick={onClick}>
        {children}
      </Chip>,
    );
    const textElement = screen.getByText(children);
    const chipElement = textElement.parentElement as HTMLElement;
    // 檢查 role 和 tabIndex 不應存在
    expect(chipElement).not.toHaveAttribute("role");
    expect(chipElement).not.toHaveAttribute("tabindex");
    // 檢查點擊類別不應存在
    expect(chipElement).not.toHaveClass("cursor-pointer");
    expect(chipElement).not.toHaveClass("hover:opacity-90");

    // 模擬點擊不應該調用 onClick
    fireEvent.click(chipElement);
    expect(onClick).not.toHaveBeenCalled();
  });

  it("應該正確渲�左側和右側圖標", () => {
    const leftIconText = "[L]";
    const rightIconText = "[R]";
    const children = "中間內容";
    render(
      <Chip iconLeft={leftIconText} iconRight={rightIconText}>
        {children}
      </Chip>,
    );

    // 檢查左側圖標存在
    const leftIconElement = screen.getByText(leftIconText);
    expect(leftIconElement).toBeInTheDocument();
    // 檢查右側圖標存在
    const rightIconElement = screen.getByText(rightIconText);
    expect(rightIconElement).toBeInTheDocument();
    // 檢查中間內容
    expect(screen.getByText(children)).toBeInTheDocument();

    // 檢查圖標的 flex-shrink-0 類別
    expect(leftIconElement).toHaveClass("flex-shrink-0");
    expect(rightIconElement).toHaveClass("flex-shrink-0");
  });

  it("應該在 bordered 為 true 時渲�邊框", () => {
    const children = "有邊框";
    render(<Chip bordered>{children}</Chip>);
    const textElement = screen.getByText(children);
    const chipElement = textElement.parentElement as HTMLElement;
    expect(chipElement).toHaveClass("border");
    expect(chipElement).toHaveClass("border-solid");

    render(<Chip bordered={false}>無邊框</Chip>);
    const textElement2 = screen.getByText(/無邊框/i);
    const chipElement2 = textElement2.parentElement as HTMLElement;
    expect(chipElement2).not.toHaveClass("border");
    expect(chipElement2).not.toHaveClass("border-solid");
  });

  it("應該正確處理 onClick 事件", () => {
    const onClick = vi.fn();
    const children = "點擊我";
    render(
      <Chip clickable onClick={onClick}>
        {children}
      </Chip>,
    );
    const textElement = screen.getByText(children);
    const chipElement = textElement.parentElement as HTMLElement;

    // 模擬點擊事件
    fireEvent.click(chipElement);
    expect(onClick).toHaveBeenCalled();
  });
});
