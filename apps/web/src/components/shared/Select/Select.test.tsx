import { render, screen } from "@testing-library/react";
import { fireEvent } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { Select } from "./Select";

describe("Select", () => {
  const options = [
    { value: "1", label: "Option 1" },
    { value: "2", label: "Option 2", disabled: true },
    { value: "3", label: "Option 3" },
  ];

  it("應該渲染選項並顯示正確的選中值", () => {
    const handleChange = vi.fn();
    render(<Select options={options} value="1" onChange={handleChange} />);
    const selectElement = screen.getByRole("combobox");
    expect(selectElement).toHaveValue("1");
  });

  it("應該在選擇不同選項時調用 onChange 回調", () => {
    const handleChange = vi.fn();
    render(<Select options={options} value="1" onChange={handleChange} />);
    const selectElement = screen.getByRole("combobox");
    // 使用 fireEvent 觸發 change 事件（模擬用户選擇）
    fireEvent.change(selectElement, { target: { value: "3" } });
    expect(handleChange).toHaveBeenCalledWith("3");
    // 注意：值不會更新，因為受控組件需要外部更新 value prop
    // 所以 select 元素的值仍然是 "1"
    expect(selectElement).toHaveValue("1");
  });

  it("應該在禁用狀態下不允許選項變更", () => {
    const handleChange = vi.fn();
    render(<Select options={options} value="1" onChange={handleChange} disabled={true} />);
    const selectElement = screen.getByRole("combobox");
    // 確認 select 是禁用的
    expect(selectElement).toBeDisabled();
    // 嘗試使用 userEvent 更改選項（應該不會觸發 onChange）
    userEvent.selectOptions(selectElement, "3");
    expect(handleChange).not.toHaveBeenCalled();
    // 值應該保持不變
    expect(selectElement).toHaveValue("1");
  });

  it("應該渲染 sm 大小 variant", () => {
    render(<Select options={options} value="1" onChange={vi.fn()} size="sm" />);
    const selectElement = screen.getByRole("combobox");
    expect(selectElement).toHaveClass("h-9");
    expect(selectElement).toHaveClass("px-3");
  });

  it("應該渲染 md 大小 variant (預設)", () => {
    render(<Select options={options} value="1" onChange={vi.fn()} />);
    const selectElement = screen.getByRole("combobox");
    expect(selectElement).toHaveClass("h-10");
    expect(selectElement).toHaveClass("px-4");
  });

  it("應該渲染 default variant 樣式", () => {
    render(<Select options={options} value="1" onChange={vi.fn()} variant="default" />);
    const selectElement = screen.getByRole("combobox");
    expect(selectElement).toHaveClass("bg-surface-container-highest");
    expect(selectElement).toHaveClass("border-surface-container");
  });

  it("應該渲染 primary variant 樣式", () => {
    render(<Select options={options} value="1" onChange={vi.fn()} variant="primary" />);
    const selectElement = screen.getByRole("combobox");
    expect(selectElement).toHaveClass("bg-primary-fixed/10");
    expect(selectElement).toHaveClass("border-primary/30");
  });

  it("應該渲染 secondary variant 樣式", () => {
    render(<Select options={options} value="1" onChange={vi.fn()} variant="secondary" />);
    const selectElement = screen.getByRole("combobox");
    expect(selectElement).toHaveClass("bg-secondary-fixed/10");
    expect(selectElement).toHaveClass("border-secondary/30");
  });

  it("應該顯示預留文字並正確處理", () => {
    const handleChange = vi.fn();
    render(
      <Select options={options} value={null} onChange={handleChange} placeholder="請選擇水果" />,
    );
    const selectElement = screen.getByRole("combobox");
    // 預留文字應該作為第一個選項顯示（disabled 和 hidden）
    const placeholderOption = screen.getByText("請選擇水果");
    expect(placeholderOption).toBeDisabled();
    expect(placeholderOption).toHaveAttribute("hidden");
    // 初始值為 null，所以選中的值應該是空字符串（因為 value 轉換為 ""）
    expect(selectElement).toHaveValue("");
  });

  it("應該處理帶有 disabled 狀態的選項", () => {
    const handleChange = vi.fn();
    render(<Select options={options} value="1" onChange={handleChange} />);
    const selectElement = screen.getByRole("combobox");
    // 嘗試選擇被禁用的選項 (value="2") 使用 userEvent
    userEvent.selectOptions(selectElement, "2");
    // 被禁用的選項不應該被選中，值應該保持不變
    expect(handleChange).not.toHaveBeenCalled();
    expect(selectElement).toHaveValue("1");
    // 選擇啟用的選項應該有效
    fireEvent.change(selectElement, { target: { value: "3" } });
    expect(handleChange).toHaveBeenCalledWith("3");
    expect(selectElement).toHaveValue("1"); // 值仍然是 1，因為受控組件
  });
});
