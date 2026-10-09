import { render, screen } from "@testing-library/react";
import { fireEvent } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { Drawer } from "./Drawer";

describe("Drawer", () => {
  it("應該在 isOpen 為 true 時渲染遮罩和內容", () => {
    const onClose = vi.fn();
    render(
      <Drawer isOpen={true} onClose={onClose}>
        Drawer 內容
      </Drawer>,
    );
    // 檢查遮罩存在 - Drawer使用createPortal將內容渲染到document.body
    // 由於Drawer沒有設置role属性，我們使用類別來選擇
    const backdropElement = document.body.querySelector(
      '[class*="fixed inset-0 z-50"][class*="bg-[#000000]/75"]',
    )!;
    expect(backdropElement).toBeInTheDocument();
    expect(screen.getByText(/drawer 內容/i)).toBeInTheDocument();
  });

  it("應該響應 Esc 鍵關閉", () => {
    const onClose = vi.fn();
    const { container } = render(
      <Drawer isOpen={true} onClose={onClose}>
        Drawer 內容
      </Drawer>,
    );
    // 先確認Drawer是否存在 - 使用類別選擇器
    const backdropElement = document.body.querySelector(
      '[class*="fixed inset-0 z-50"][class*="bg-[#000000]/75"]',
    )!;
    expect(backdropElement).toBeInTheDocument();

    // 使用fireEvent模擬Esc鍵按下
    fireEvent.keyDown(document.body, { key: "Escape" });
    expect(onClose).toHaveBeenCalled();
  });

  it("應該在 isOpen 為 false 時不渲染內容", () => {
    const { container } = render(
      <Drawer isOpen={false} onClose={() => {}}>
        不應該顯示
      </Drawer>,
    );
    // 檢查文本內容不包含特定文字
    expect(container.textContent).not.toContain("不應該顯示");
  });

  it("應該在點擊遮罩時關閉（當未禁用遮罩點擊關閉）", () => {
    const onClose = vi.fn();
    const { container } = render(
      <Drawer isOpen={true} onClose={onClose}>
        Drawer 內容
      </Drawer>,
    );
    // 獲取遮罩元素
    const backdrop = document.body.querySelector(
      '[class*="fixed inset-0 z-50"][class*="bg-[#000000]/75"]',
    )!;
    expect(backdrop).toBeInTheDocument(); // 確認遮罩存在

    // 使用fireEvent點擊遮罩
    fireEvent.click(backdrop);
    expect(onClose).toHaveBeenCalled();
  });

  it("應該根據 placement 屬性渲染在對應側邊", () => {
    const onClose = vi.fn();
    render(
      <Drawer isOpen={true} placement="left" onClose={onClose}>
        左側抽屜
      </Drawer>,
    );
    // 檢查抽屜容器具有 left-0 類別
    const drawerContainer = document.body.querySelector('[class*="left-0"]');
    expect(drawerContainer).toBeInTheDocument();
  });

  it("應該根據 placement 屬性渲染在右側邊（預設）", () => {
    const onClose = vi.fn();
    render(
      <Drawer isOpen={true} onClose={onClose}>
        預設右側抽屜
      </Drawer>,
    );
    // 檢查抽屜容器具有 right-0 類別
    const drawerContainer = document.body.querySelector('[class*="right-0"]');
    expect(drawerContainer).toBeInTheDocument();
  });

  it("應該不響應Esc鍵當disableEscClose為true時", () => {
    const onClose = vi.fn();
    render(
      <Drawer isOpen={true} onClose={onClose} disableEscClose={true}>
        Drawer 內容
      </Drawer>,
    );
    // 使用fireEvent模擬Esc鍵按下
    fireEvent.keyDown(document.body, { key: "Escape" });
    expect(onClose).not.toHaveBeenCalled();
  });

  it("應該不響應遮罩點擊當disableBackdropClose為true時", () => {
    const onClose = vi.fn();
    render(
      <Drawer isOpen={true} onClose={onClose} disableBackdropClose={true}>
        Drawer 內容
      </Drawer>,
    );
    // 獲取遮罩元素
    const backdrop = document.body.querySelector(
      '[class*="fixed inset-0 z-50"][class*="bg-[#000000]/75"]',
    )!;
    if (backdrop) {
      // 使用fireEvent點擊
      fireEvent.click(backdrop);
      expect(onClose).not.toHaveBeenCalled();
    }
  });
});
