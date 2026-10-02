import { FC } from 'react';

interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  loading?: boolean;
  iconLeft?: React.ReactNode;
  iconRight?: React.ReactNode;
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  children: React.ReactNode;
}

export const Button: FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  iconLeft,
  iconRight,
  onClick,
  children,
}) => {
  // 基礎類別
  const baseClasses = 'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none';
  
  // 變體類別
  const variantClasses = {
    primary: 'bg-primary-fixed text-on-primary-fixed hover:bg-primary-fixed/90 focus-visible:ring-primary',
    secondary: 'bg-secondary-fixed text-on-secondary-fixed hover:bg-secondary-fixed/90 focus-visible:ring-secondary',
    ghost: 'bg-transparent text-on-primary hover:bg-primary-fixed/10 focus-visible:ring-primary',
  }[variant];
  
  // 大小類別
  const sizeClasses = {
    sm: 'h-9 px-3',
    md: 'h-10 px-4 py-2',
    lg: 'h-11 px-5 py-3',
  }[size];
  
  // 載入狀態類別
  const loadingClasses = loading ? 'opacity-75' : '';
  
  return (
    <button
      type="button"
      className={`${baseClasses} ${variantClasses} ${sizeClasses} ${loadingClasses}`}
      disabled={disabled || loading}
      onClick={onClick}
    >
      {iconLeft && <span className="flex-shrink-0">{iconLeft}</span>}
      <span className="flex-1">{children}</span>
      {iconRight && <span className="flex-shrink-0">{iconRight}</span>}
    </button>
  );
};