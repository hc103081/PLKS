import type { FC } from "react";

interface AvatarProps {
  /** 圖片來源 URL */
  src?: string;
  /** 替代文字 */
  alt?: string;
  /** 大小 */
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  /** 變體樣式 */
  variant?: "default" | "circular" | "square";
  /** 備用內容（當沒有圖片時顯示的文字或圖標） */
  fallback?: React.ReactNode;
  /** 是否顯示邊框 */
  bordered?: boolean;
  /** 是否為點狀狀態指示器 */
  dot?: boolean;
  /** 狀態顏色 */
  statusColor?: "success" | "warning" | "error" | "default";
}

/**
 * Avatar 元件 - 用於顯示使用者頭像或圖標
 */
export const Avatar: FC<AvatarProps> = ({
  src,
  alt,
  size = "md",
  variant = "circular",
  fallback,
  bordered = false,
  dot = false,
  statusColor,
}) => {
  // 基礎類別
  const baseClasses = "flex-shrink-0 overflow-hidden transition-all";

  // 大小類別
  const sizeClasses = {
    xs: "h-6 w-6",
    sm: "h-8 w-8",
    md: "h-10 w-10",
    lg: "h-12 w-12",
    xl: "h-14 w-14",
  }[size];

  // 變體類別
  const variantClasses = {
    default: "rounded-md",
    circular: "rounded-full",
    square: "rounded-none",
  }[variant];

  // 邊框類別
  const borderClasses = bordered ? "border border-surface-container" : "";

  // 圖片類別
  const imageClasses = "object-cover";

  // 點狀狀態指示器類別
  const statusDotClasses = statusColor
    ? `absolute bottom-0 right-0 w-2 h-2 rounded-full border-2 border-surface-container-high`
    : "";

  const statusColorMap = {
    success: "bg-success-fixed",
    warning: "bg-warning-fixed",
    error: "bg-error-fixed",
    default: "bg-primary-fixed",
  }[statusColor ?? "default"];

  return (
    <div className="relative inline-block">
      {src ? (
        <img
          src={src}
          alt={alt ?? ""}
          className={`${baseClasses} ${sizeClasses} ${variantClasses} ${borderClasses} ${imageClasses}`}
        />
      ) : (
        <div
          className={`${baseClasses} ${sizeClasses} ${variantClasses} ${borderClasses} bg-surface-container-lowest flex items-center justify-center`}
        >
          {fallback || (
            <span className="material-symbols-outlined text-on-surface-variant">person</span>
          )}
        </div>
      )}
      {dot && <span className={`${statusDotClasses} ${statusColorMap}`} />}
    </div>
  );
};
