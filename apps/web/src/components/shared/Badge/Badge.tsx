import type { FC } from "react";

interface BadgeProps {
  /** 變體樣式 */
  variant?: "default" | "primary" | "secondary" | "success" | "warning" | "error";
  /** 大小 */
  size?: "sm" | "md";
  /** 是否為點狀 */
  dot?: boolean;
  /** 內容 */
  children?: React.ReactNode;
}

/**
 * Badge 元件 - 用於顯示狀態、計數或小型提示
 * 通常比 Chip 更小、更簡潔
 */
export const Badge: FC<BadgeProps> = ({
  variant = "default",
  size = "md",
  dot = false,
  children,
}) => {
  // 基礎類別
  const baseClasses =
    "inline-flex items-center justify-center rounded-full text-xs font-medium transition-all";

  // 變體類別
  const variantClasses = {
    default: "bg-surface-container-lowest text-on-surface-variant",
    primary: "bg-primary-fixed text-on-primary-fixed",
    secondary: "bg-secondary-fixed text-on-secondary-fixed",
    success: "bg-success-fixed text-on-success-fixed",
    warning: "bg-warning-fixed text-on-warning-fixed",
    error: "bg-error-fixed text-on-error-fixed",
  }[variant];

  // 大小類別
  const sizeClasses = {
    sm: "h-6 w-6",
    md: "h-7 w-7",
  }[size];

  // 點狀類別
  const dotClasses = dot ? "h-2.5 w-2.5 rounded-full" : sizeClasses;

  return <span className={`${baseClasses} ${variantClasses} ${dotClasses}`}>{children}</span>;
};
