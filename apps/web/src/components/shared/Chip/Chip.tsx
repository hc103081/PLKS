import type { FC } from "react";

interface ChipProps {
  /** 變體樣式 */
  variant?: "default" | "primary" | "secondary" | "success" | "warning" | "error";
  /** 大小 */
  size?: "sm" | "md";
  /** 是否可點擊 */
  clickable?: boolean;
  /** 點擊處理 */
  onClick?: (e: React.MouseEvent<HTMLSpanElement>) => void;
  /** 左側圖標 */
  iconLeft?: React.ReactNode;
  /** 右側圖標 */
  iconRight?: React.ReactNode;
  /** 內容 */
  children: React.ReactNode;
  /** 是否顯示邊框 */
  bordered?: boolean;
}

/**
 * Chip 元件 - 用於顯示標籤、狀態或小型資訊塊
 * 類似於標籤或徽章，但可包含更多內容和圖標
 */
export const Chip: FC<ChipProps> = ({
  variant = "default",
  size = "md",
  clickable = false,
  onClick,
  iconLeft,
  iconRight,
  children,
  bordered = false,
}) => {
  // 基礎類別
  const baseClasses =
    "inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-md text-xs font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2";

  // 變體類別
  const variantClasses = {
    default: "bg-surface-container-lowest text-on-surface-variant hover:bg-surface-container-low",
    primary: "bg-primary-fixed/10 text-primary hover:bg-primary-fixed/20",
    secondary: "bg-secondary-fixed/10 text-secondary hover:bg-secondary-fixed/20",
    success: "bg-success-fixed/10 text-success hover:bg-success-fixed/20",
    warning: "bg-warning-fixed/10 text-warning hover:bg-warning-fixed/20",
    error: "bg-error-fixed/10 text-error hover:bg-error-fixed/20",
  }[variant];

  // 大小類別
  const sizeClasses = {
    sm: "h-8 px-2.5",
    md: "h-9 px-3",
  }[size];

  // 邊框類別
  const borderClasses = bordered ? "border border-solid" : "";

  // 點擊類別
  const interactiveClasses = clickable ? "cursor-pointer hover:opacity-90" : "";

  return (
    <span
      role={clickable ? "button" : undefined}
      tabIndex={clickable ? 0 : undefined}
      aria-disabled={!clickable}
      className={`${baseClasses} ${variantClasses} ${sizeClasses} ${borderClasses} ${interactiveClasses}`}
      onClick={clickable ? onClick : undefined}
    >
      {iconLeft && <span className="flex-shrink-0">{iconLeft}</span>}
      <span className="flex-1">{children}</span>
      {iconRight && <span className="flex-shrink-0">{iconRight}</span>}
    </span>
  );
};
