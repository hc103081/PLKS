import * as React from "react";
import type { FC, HTMLAttributes, PropsWithChildren } from "react";

interface CardProps extends PropsWithChildren, HTMLAttributes<HTMLElement> {
  asChild?: boolean;
}

export const Card: FC<CardProps> = ({ asChild = false, className = "", children, ...props }) => {
  const BaseElement = asChild ? React.Fragment : "div";

  // 基礎卡片樣式符合 DESIGN.md
  const baseClasses =
    "bg-surface-container border border-outline/50 rounded-lg shadow-sm transition-all duration-200 hover:-translate-y-1 hover:border-primary/50 hover:shadow-[0_0_24px_rgba(192,193,255,0.15)]";

  return (
    <BaseElement className={`${baseClasses} ${className}`} {...props}>
      {children}
    </BaseElement>
  );
};