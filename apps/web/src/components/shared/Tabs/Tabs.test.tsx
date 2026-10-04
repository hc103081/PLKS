import { render, screen, fireEvent } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { Tabs } from "./Tabs";

describe("Tabs", () => {
  const tabs = [
    { key: "tab1", label: "標籤 1" },
    { key: "tab2", label: "標籤 2" },
    { key: "tab3", label: "標籤 3", disabled: true },
  ];

  it("應該渲染標籤並正確顯示激活狀態", () => {
    const mockOnChange = vi.fn();
    const { getByRole } = render(<Tabs tabs={tabs} activeKey="tab1" onChange={mockOnChange} />);

    // 檢查所有標籤按鈕是否存在
    expect(getByRole("button", { name: /標籤 1/i })).toBeInTheDocument();
    expect(getByRole("button", { name: /標籤 2/i })).toBeInTheDocument();
    expect(getByRole("button", { name: /標籤 3/i })).toBeInTheDocument();

    // 檢查激活標籤的 aria-current
    const activeTab = getByRole("button", { name: /標籤 1/i });
    expect(activeTab).toHaveAttribute("aria-current", "true");

    // 檢查非激活標籤沒有 aria-current
    const inactiveTab = getByRole("button", { name: /標籤 2/i });
    expect(inactiveTab).not.toHaveAttribute("aria-current");
  });

  it("應該在點擊標籤時呼叫 onChange", () => {
    const mockOnChange = vi.fn();
    const { getByRole } = render(
      <Tabs tabs={tabs} activeKey="tab1" onChange={mockOnChange} />,
    );

    // Log all buttons to see what we're working with
    const buttons = screen.getAllByRole("button");
    console.log(`Found ${buttons.length} buttons:`);
    buttons.forEach((button, index) => {
      console.log(`  Button ${index}: "${button.textContent}"`);
    });

    const tab2Button = getByRole("button", { name: /標籤 2/i });
    console.log(`Clicking button: "${tab2Button.textContent}"`);
    // Try using the native DOM click method
    tab2Button.click();
    expect(mockOnChange).toHaveBeenCalledWith("tab2");
  });

  it("應該在點擊禁用標籤時不呼叫 onChange", () => {
    const mockOnChange = vi.fn();
    const { getByRole } = render(<Tabs tabs={tabs} activeKey="tab1" onChange={mockOnChange} />);

    const disabledTab = getByRole("button", { name: /標籤 3/i });
    userEvent.click(disabledTab);
    expect(mockOnChange).not.toHaveBeenCalled();
  });

  it("應該正確應用 sm 大小樣式", () => {
    const mockOnChange = vi.fn();
    const { getByRole } = render(
      <Tabs tabs={tabs} activeKey="tab1" onChange={mockOnChange} size="sm" />,
    );
    const firstButton = getByRole("button", { name: /標籤 1/i });
    const tabsContainer = firstButton.parentElement as HTMLElement;
    // 檢查是否包含 sm 類別 (text-sm)
    expect(tabsContainer).toHaveClass("text-sm");
  });

  it("應該正確應用 md 大小樣式", () => {
    const mockOnChange = vi.fn();
    const { getByRole } = render(
      <Tabs tabs={tabs} activeKey="tab1" onChange={mockOnChange} size="md" />,
    );
    const firstButton = getByRole("button", { name: /標籤 1/i });
    const tabsContainer = firstButton.parentElement as HTMLElement;
    expect(tabsContainer).toHaveClass("text-base");
  });

  it("應該正確應用 default 變體樣式", () => {
    const mockOnChange = vi.fn();
    const { getByRole } = render(
      <Tabs tabs={tabs} activeKey="tab1" onChange={mockOnChange} variant="default" />,
    );
    const firstButton = getByRole("button", { name: /標籤 1/i });
    const tabsContainer = firstButton.parentElement as HTMLElement;
    // 檢查是否包含 default 變體類別 (border-b border-transparent)
    expect(tabsContainer).toHaveClass("border-b");
    expect(tabsContainer).toHaveClass("border-transparent");
  });

  it("應該正確應用 primary 變體樣式", () => {
    const mockOnChange = vi.fn();
    const { getByRole } = render(
      <Tabs tabs={tabs} activeKey="tab1" onChange={mockOnChange} variant="primary" />,
    );
    const firstButton = getByRole("button", { name: /標籤 1/i });
    const tabsContainer = firstButton.parentElement as HTMLElement;
    expect(tabsContainer).toHaveClass("border-primary");
  });

  it("應該正確應用 secondary 變體樣式", () => {
    const mockOnChange = vi.fn();
    const { getByRole } = render(
      <Tabs tabs={tabs} activeKey="tab1" onChange={mockOnChange} variant="secondary" />,
    );
    const firstButton = getByRole("button", { name: /標籤 1/i });
    const tabsContainer = firstButton.parentElement as HTMLElement;
    expect(tabsContainer).toHaveClass("border-secondary");
  });

  it("應該渲染子內容", () => {
    const mockOnChange = vi.fn();
    const { getByRole } = render(
      <Tabs tabs={tabs} activeKey="tab1" onChange={mockOnChange}>
        <div>內容區域</div>
      </Tabs>,
    );
    // 只需確認元件已渲染且子內容存在
    expect(document.body).toHaveTextContent(/內容區域/i);
  });
});