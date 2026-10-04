import type { FC } from "react";

interface SelectProps {
  /** 選項列表 */
  options: Array<{
    value: string | number;
    label: React.ReactNode;
    disabled?: boolean;
  }>;
  /** 選中的值 */
  value: string | number | null;
  /** 值變更處理函數 */
  onChange: (value: string | number | null) => void;
  /** 是否禁用 */
  disabled?: boolean;
  /** 大小 */
  size?: "sm" | "md";
  /** 變體樣式 */
  variant?: "default" | "primary" | "secondary";
  /** 預留文字 */
  placeholder?: string;
}

/**
 * Select 元件 - 下拉選單表單控件
 */
export const Select: FC<SelectProps> = ({
  options,
  value,
  onChange,
  disabled = false,
  size = "md",
  variant = "default",
  placeholder,
}) => {
  // 基礎類別
  const baseClasses =
    "inline-flex w-full items-center justify-between whitespace-nowrap rounded-md border border-solid text-sm font-medium transition-all" +
    " focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2" +
    " disabled:opacity-50 disabled:pointer-events-none";

  // 大小類別
  const sizeClasses = {
    sm: "h-9 px-3",
    md: "h-10 px-4",
  }[size];

  // 變體類別
  const variantClasses = {
    default:
      "bg-surface-container-highest text-on-surface hover:bg-surface-container" +
      " border-surface-container",
    primary: "bg-primary-fixed/10 text-primary hover:bg-primary-fixed/20" + " border-primary/30",
    secondary:
      "bg-secondary-fixed/10 text-secondary hover:bg-secondary-fixed/20" + " border-secondary/30",
  }[variant];

  // 下拉箭頭圖示
  const ArrowIcon = () => (
    <span className="material-symbols-outlined text-on-surface-variant/70">expand_more</span>
  );

  return (
    <select
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value as string | number)}
      disabled={disabled}
      className={`${baseClasses} ${sizeClasses} ${variantClasses}`}
    >
      {placeholder && (
        <option value="" disabled hidden>
          {placeholder}
        </option>
      )}
      {options.map((option) => (
        <option key={option.value} value={option.value} disabled={option.disabled}>
          {option.label}
        </option>
      ))}
    </select>
  );
};
