import type { FC } from "react";

interface TooltipProps {
  /** 觸發元素 */
  children: React.ReactNode;
  /** 提示文字 */
  content: string;
  /** 顯示位置 */
  placement?: "top" | "bottom" | "left" | "right";
  /** 延遲顯示時間（毫秒） */
  delay?: number;
  /** 是否啟用 */
  enabled?: boolean;
}

/**
 * Tooltip 元件 - 在元件上方顯示提示訊息
 */
export const Tooltip: FC<TooltipProps> = ({
  children,
  content,
  placement = "top",
  delay = 200,
  enabled = true,
}) => {
  // 這是一個簡化的實作，在真實應用中應該使用更完整的 tooltip 方案
  // 例如使用浮動 UI 库或更複雜的定位邏輯

  return (
    <span className="relative inline-block" data-enabled={enabled}>
      {children}
      {enabled && (
        <span
          className={`
          absolute ${placement === "top" ? "bottom-full" : placement === "bottom" ? "top-full" : placement === "left" ? "right-full" : "left-full"}
          ${placement === "top" ? "-bottom-1" : placement === "bottom" ? "top-1" : placement === "left" ? "-right-1" : "left-1"}
          ${placement === "top" ? "mb-1" : placement === "bottom" ? "mt-1" : placement === "left" ? "mr-1" : "ml-1"}
          bg-surface-container-highest text-on-surface-fixed text-xs rounded-md px-2 py-1
          opacity-0 pointer-events-none transition-opacity duration-100
          tooltip-${placement}
          animate-[tooltip-fade_0.1s_ease-out]
        `}
        >
          {content}
        </span>
      )}
    </span>
  );
};
