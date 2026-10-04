import { type FC, type HTMLAttributes, type PropsWithChildren, useState } from "react";

interface InputProps extends PropsWithChildren, HTMLAttributes<HTMLInputElement> {
  type?: "text" | "password" | "email" | "number" | "textarea";
  placeholder?: string;
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  disabled?: boolean;
  error?: boolean;
  helperText?: string;
  iconLeft?: React.ReactNode;
  iconRight?: React.ReactNode;
  rows?: number; // 針對 textarea
}

export const Input: FC<InputProps> = ({
  type = "text",
  placeholder = "",
  value = "",
  onChange,
  disabled = false,
  error = false,
  helperText,
  iconLeft,
  iconRight,
  rows,
  ...props
}) => {
  const [isFocused, setIsFocused] = useState(false);

  const handleFocus = () => setIsFocused(true);
  const handleBlur = () => setIsFocused(false);

  // 基礎輸入框樣式
  const baseClasses =
    "flex min-w-0 flex-1 rounded-md border border-input-background bg-transparent px-3 py-2 text-sm ring-offset-scrollbar placeholder:text-on-outline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50";

  // 狀態樣式
  const stateClasses = {
    focused: isFocused ? "ring-primary/50" : "",
    error: error ? "border-destructive/50 text-destructive" : "",
  };

  // 變體類別（text vs textarea）
  const inputClasses =
    type === "textarea"
      ? `${baseClasses} ${stateClasses.focused} ${stateClasses.error} resize-none ${rows ? `${rows * 3.5}` : "min-h-[80px]"}`
      : `${baseClasses} ${stateClasses.focused} ${stateClasses.error}`;

  // 過濾掉我們自己處理的 props，避免衝突
  const { onChange: _, onFocus: __, onBlur: ___, ...otherProps } = props;

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center gap-2">
        {iconLeft && <span className="flex-shrink-0">{iconLeft}</span>}
        <input
          type={type === "textarea" ? undefined : type}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          disabled={disabled}
          className={inputClasses}
          {...otherProps}
        />
        {iconRight && <span className="flex-shrink-0">{iconRight}</span>}
      </div>
      {type === "textarea" && (
        <textarea
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          disabled={disabled}
          className={`${baseClasses} ${stateClasses.focused} ${stateClasses.error} resize-none ${rows ? `${rows * 3.5}` : "min-h-[80px]"}`}
          {...otherProps}
        />
      )}
      {helperText && <p className="text-xs text-on-outline/60">{helperText}</p>}
      {error && helperText === undefined && <p className="text-xs text-destructive">發生錯誤</p>}
    </div>
  );
};
