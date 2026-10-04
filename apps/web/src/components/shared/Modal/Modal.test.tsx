import { render, screen } from "@testing-library/react";
import { fireEvent } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { Modal } from "./Modal";

describe("Modal", () => {
  it("應該在 isOpen 為 true 時渲染遮罩和內容", () => {
    const onClose = vi.fn();
    render(
      <Modal isOpen={true} onClose={onClose}>
        Modal 內容
      </Modal>,
    );
    // 檢查遮罩存在 - Modal使用createPortal將內容渲染到document.body
    // 角色屬性設置在Modal容器上
    const modalElement = document.body.querySelector('[role="dialog"]');
    expect(modalElement).toBeInTheDocument();
    expect(screen.getByText(/modal 內容/i)).toBeInTheDocument();
  });

  it("應該響應 Esc 鍵關閉", () => {
    const onClose = vi.fn();
    const { container } = render(
      <Modal isOpen={true} onClose={onClose}>
        Modal 內容
      </Modal>,
    );
    // 先確認Modal是否存在
    const modalElement = document.body.querySelector('[role="dialog"]');
    expect(modalElement).toBeInTheDocument();

    // 使用fireEvent模擬Esc鍵按下
    fireEvent.keyDown(document.body, { key: "Escape" });
    expect(onClose).toHaveBeenCalled();
  });

  it("應該在 isOpen 為 false 時不渲染內容", () => {
    const { container } = render(
      <Modal isOpen={false} onClose={() => {}}>
        不應該顯示
      </Modal>,
    );
    // 檢查文本內容不包含特定文字
    expect(container.textContent).not.toContain("不應該顯示");
  });

  it("應該在點擊遮罩時關閉（當未禁用遮罩點擊關閉）", () => {
    const onClose = vi.fn();
    const { container } = render(
      <Modal isOpen={true} onClose={onClose}>
        Modal 內容
      </Modal>,
    );
    // 獲取遮罩元素（role="dialog"的元素）
    const backdrop = document.body.querySelector('[role="dialog"]');
    expect(backdrop).toBeInTheDocument(); // 確認遮罩存在

    // 使用fireEvent點擊遮罩
    fireEvent.click(backdrop);
    expect(onClose).toHaveBeenCalled();
  });

  it("應該不響應Esc鍵當disableEscClose為true時", () => {
    const onClose = vi.fn();
    render(
      <Modal isOpen={true} onClose={onClose} disableEscClose={true}>
        Modal 內容
      </Modal>,
    );
    // 使用fireEvent模擬Esc鍵按下
    fireEvent.keyDown(document.body, { key: "Escape" });
    expect(onClose).not.toHaveBeenCalled();
  });

  it("應該不響應遮罩點擊當disableBackdropClose為true時", () => {
    const onClose = vi.fn();
    render(
      <Modal isOpen={true} onClose={onClose} disableBackdropClose={true}>
        Modal 內容
      </Modal>,
    );
    // 獲取遮罩元素
    const backdrop = document.body.querySelector('[role="dialog"]');
    if (backdrop) {
      // 使用fireEvent點擊
      fireEvent.click(backdrop);
      expect(onClose).not.toHaveBeenCalled();
    }
  });
});
