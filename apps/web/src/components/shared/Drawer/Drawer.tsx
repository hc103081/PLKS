import { useEffect } from "react";
import { createPortal } from "react-dom";

interface DrawerProps {
  children: React.ReactNode;
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  placement?: "left" | "right" | "top" | "bottom";
  size?: "sm" | "md" | "lg" | "full";
  disableEscClose?: boolean;
  disableBackdropClose?: boolean;
  backdropClassName?: string;
  drawerClassName?: string;
}

export function Drawer({
  children,
  isOpen,
  onClose,
  title,
  placement = "right",
  size = "md",
  disableEscClose = false,
  disableBackdropClose = false,
  backdropClassName = "",
  drawerClassName = "",
}: DrawerProps) {
  // Handle ESC key press
  useEffect(() => {
    if (isOpen && !disableEscClose) {
      const handleEscape = (e: KeyboardEvent) => {
        if (e.key === "Escape") {
          onClose();
        }
      };
      document.addEventListener("keydown", handleEscape);
      return () => {
        document.removeEventListener("keydown", handleEscape);
      };
    }
  }, [isOpen, disableEscClose, onClose]);

  if (!isOpen) return null;

  // Define size classes
  const sizeClasses = {
    sm: "max-w-sm",
    md: "max-w-md",
    lg: "max-w-lg",
    full: "max-w-full w-full",
  };

  // Define placement classes
  const placementClasses = {
    left: "left-0",
    right: "right-0",
    top: "top-0",
    bottom: "bottom-0",
  };

  const drawerStyle = {
    backdrop: `fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-[#000000]/75 backdrop-blur-md overflow-y-auto${backdropClassName ? ` ${backdropClassName}` : ""}`,
    container: `fixed z-50 flex-shrink-0 ${placementClasses[placement]} max-w-[710px] w-[85%] ${sizeClasses[size]} bg-surface-container-high border-l border-outline shadow-[0_0_32px_rgba(0,0,0,0.25)] shadow-primary/20 flex flex-col h-full overflow-hidden transform transition-all ${drawerClassName}`,
    header: `flex items-start justify-between p-space-lg bg-surface-container-highest/60 border-b border-outline`,
    titleContainer: `flex items-start gap-space-md`,
    iconContainer: `w-11 h-11 rounded-xl bg-primary/20 flex items-center justify-center text-primary shadow-[0_0_16px_rgba(192,193,255,0.25)] shrink-0 mt-0.5`,
    icon: `material-symbols-outlined text-[24px]`,
    titleContent: `flex items-center gap-space-sm`,
    modalTitle: `id="drawer-title" font-headline-sm text-headline-sm text-on-surface font-bold tracking-tight`,
    modalDescription: `font-body-sm text-body-sm text-on-surface-variant mt-1`,
    closeButton: `flex items-center gap-space-xs shrink-0`,
    escHint: `hidden sm:inline-flex px-1.5 py-0.5 rounded bg-surface-container-low text-on-surface-variant font-label-code-sm text-label-code-sm`,
    closeIconButton: `w-8 h-8 rounded-lg flex items-center justify-center text-on-surface-variant hover:text-on-surface hover:bg-surface-container-low transition-colors`,
    closeIcon: `material-symbols-outlined text-[20px]`,
    body: `flex-1 p-space-lg overflow-y-auto space-y-6`,
  };

  const drawer = (
    <div
      className={drawerStyle.backdrop}
      onClick={(e) => !disableBackdropClose && e.target === e.currentTarget && onClose()}
    >
      {/* DRAWER CONTAINER */}
      <div className={drawerStyle.container}>
        {/* Ambient Glow Decorator behind drawer card */}
        {placement === "right" && (
          <div className="absolute -top-24 -right-24 w-64 h-64 bg-primary/15 rounded-full blur-3xl pointer-events-none"></div>
        )}
        {placement === "left" && (
          <div className="absolute -top-24 -left-24 w-64 h-64 bg-primary/15 rounded-full blur-3xl pointer-events-none"></div>
        )}

        {/* 1. DRAWER HEADER */}
        {title && (
          <div className={drawerStyle.header}>
            <div className={drawerStyle.titleContainer}>
              <div className={drawerStyle.iconContainer}>
                <span className={drawerStyle.icon}>tune</span>
              </div>
              <div className={drawerStyle.titleContent}>
                <h2 id="drawer-title" className={drawerStyle.modalTitle}>
                  {title}
                </h2>
                {title && <p className={drawerStyle.modalDescription}>{title}</p>}
              </div>
            </div>

            {/* Close & Esc action */}
            <div className={drawerStyle.closeButton}>
              <span className={drawerStyle.escHint}>ESC</span>
              <button
                aria-label="關閉抽屜"
                className={drawerStyle.closeIconButton}
                type="button"
                onClick={onClose}
              >
                <span className={drawerStyle.closeIcon}>close</span>
              </button>
            </div>
          </div>
        )}

        {/* DRAWER SCROLLABLE BODY */}
        <div className={drawerStyle.body}>{children}</div>
      </div>
    </div>
  );

  return createPortal(drawer, document.body);
}
