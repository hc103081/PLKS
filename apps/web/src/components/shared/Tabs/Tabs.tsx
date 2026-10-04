import type { FC } from "react";

interface TabsProps {
  /** 標籤列表 */
  tabs: Array<{
    key: string;
    label: string;
    disabled?: boolean;
  }>;
  /** 目前激活的標籤鍵 */
  activeKey: string;
  /** 標籤變更處理函數 */
  onChange: (key: string) => void;
  /** 大小 */
  size?: "sm" | "md";
  /** 變體樣式 */
  variant?: "default" | "primary" | "secondary";
  /** 內容 */
  children?: React.ReactNode;
}

/**
 * Tabs 元件 - 用於在不同視圖或內容之間切換
 */
export const Tabs: FC<TabsProps> = ({
  tabs,
  activeKey,
  onChange,
  size = "md",
  variant = "primary",
  children,
}) => {
  // 基礎類別
  const baseClasses = "inline-flex items-center space-x-1 whitespace-nowrap";

  // 大小類別
  const sizeClasses = {
    sm: "text-sm",
    md: "text-base",
  }[size];

  // 變體類別
  const variantClasses = {
    default: "border-b border-transparent",
    primary: "border-b border-primary",
    secondary: "border-b border-secondary",
  }[variant];

  console.log("Tabs size prop:", size, "sizeClasses:", sizeClasses);
  console.log("Tabs variant prop:", variant, "variantClasses:", variantClasses);
  console.log("Tabs onChange prop:", onChange);
  console.log("className:", `${baseClasses} ${sizeClasses} ${variantClasses} mb-2`);

  return (
    <div className="w-full">
      <div className={`${baseClasses} ${sizeClasses} ${variantClasses} mb-2`}>
        {tabs.map((tab) => {
          const isActive = tab.key === activeKey;
          const tabClasses = `
            flex items-center justify-center px-3 py-2 rounded-t-md text-sm font-medium
            ${isActive ? "border-b-2 border-primary bg-primary/10 text-primary" : "text-on-surface-variant hover:bg-surface-container-low"}
            transition-colors
            ${tab.disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer"}
          `;

          return (
            <button
              key={tab.key}
              className={tabClasses}
              onClick={
                tab.disabled
                  ? undefined
                  : () => {
                      console.log("onClick handler called for", tab.key);
                      onChange(tab.key);
                    }
              }
              disabled={tab.disabled}
              aria-current={isActive ? "true" : undefined}
            >
              {tab.label}
            </button>
          );
        })}
      </div>
      <div className="mt-2">{children}</div>
    </div>
  );
};
