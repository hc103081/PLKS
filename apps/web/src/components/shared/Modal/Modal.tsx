import { useEffect } from "react";
import { createPortal } from "react-dom";

interface ModalProps {
  children: React.ReactNode;
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  size?: "sm" | "md" | "lg" | "full";
  disableEscClose?: boolean;
  disableBackdropClose?: boolean;
  backdropClassName?: string;
  modalClassName?: string;
}

export function Modal({
  children,
  isOpen,
  onClose,
  title,
  size = "md",
  disableEscClose = false,
  disableBackdropClose = false,
  backdropClassName = "",
  modalClassName = "",
}: ModalProps) {
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

  const modalStyle = {
    backdrop: `fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-[#000000]/75 backdrop-blur-md overflow-y-auto${backdropClassName ? ` ${backdropClassName}` : ""}`,
    container: `relative w-full max-w-[710px] my-auto bg-surface-container-high rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.85)] shadow-primary/10 overflow-hidden transition-all transform flex flex-col ${sizeClasses[size]} ${modalClassName}`,
    header: `relative flex items-start justify-between p-space-lg bg-surface-container-highest/60`,
    titleContainer: `flex items-start gap-space-md`,
    iconContainer: `w-11 h-11 rounded-xl bg-primary/20 flex items-center justify-center text-primary shadow-[0_0_16px_rgba(192,193,255,0.25)] shrink-0 mt-0.5`,
    icon: `material-symbols-outlined text-[24px]`,
    titleContent: `flex items-center gap-space-sm`,
    modalTitle: `id="modal-title" font-headline-sm text-headline-sm text-on-surface font-bold tracking-tight`,
    modalDescription: `font-body-sm text-body-sm text-on-surface-variant mt-1`,
    closeButton: `flex items-center gap-space-xs shrink-0`,
    escHint: `hidden sm:inline-flex px-1.5 py-0.5 rounded bg-surface-container-low text-on-surface-variant font-label-code-sm text-label-code-sm`,
    closeIconButton: `w-8 h-8 rounded-lg flex items-center justify-center text-on-surface-variant hover:text-on-surface hover:bg-surface-container-low transition-colors`,
    closeIcon: `material-symbols-outlined text-[20px]`,
    body: `p-space-lg space-y-6 overflow-y-auto max-h-[calc(85vh-130px)]`,
    footer: `p-space-lg bg-surface-container-highest/80 flex flex-col sm:flex-row items-center justify-between gap-space-md`,
    statusTip: `flex items-center gap-2 text-on-surface-variant font-label-code-sm text-label-code-sm`,
    statusIcon: `material-symbols-outlined text-secondary text-[16px]`,
    statusText: `truncate max-w-[320px]`,
    actionButtons: `flex items-center gap-space-sm w-full sm:w-auto justify-end`,
    cancelButton: `px-space-lg py-2.5 rounded-lg bg-surface-container-low hover:bg-surface-container text-on-surface font-body-sm text-body-sm transition-colors shadow-sm`,
    confirmButton: `px-space-lg py-2.5 rounded-lg bg-primary-container hover:bg-primary-container/90 text-on-primary-container font-body-sm text-body-sm font-semibold flex items-center justify-center gap-space-xs transition-all shadow-[0_0_20px_rgba(128,131,255,0.4)] hover:shadow-[0_0_24px_rgba(128,131,255,0.6)]`,
  };

  const modal = (
    <div
      className={modalStyle.backdrop}
      onClick={(e) => !disableBackdropClose && e.target === e.currentTarget && onClose()}
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? "modal-title" : undefined}
    >
      {/* MODAL CONTAINER */}
      <div className={modalStyle.container}>
        {/* Ambient Glow Decorator behind modal card */}
        <div className="absolute -top-24 -right-24 w-64 h-64 bg-primary/15 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-secondary-container/10 rounded-full blur-3xl pointer-events-none"></div>

        {/* 1. MODAL HEADER */}
        {title && (
          <div className={modalStyle.header}>
            <div className={modalStyle.titleContainer}>
              <div className={modalStyle.iconContainer}>
                <span className={modalStyle.icon}>person_add</span>
              </div>
              <div className={modalStyle.titleContent}>
                <h2 id="modal-title" className={modalStyle.modalTitle}>
                  {title}
                </h2>
                {title && <p className={modalStyle.modalDescription}>{title}</p>}
              </div>
            </div>

            {/* Close & Esc action */}
            <div className={modalStyle.closeButton}>
              <span className={modalStyle.escHint}>ESC</span>
              <button
                aria-label="關閉視窗"
                className={modalStyle.closeIconButton}
                type="button"
                onClick={onClose}
              >
                <span className={modalStyle.closeIcon}>close</span>
              </button>
            </div>
          </div>
        )}

        {/* MODAL SCROLLABLE BODY */}
        <div className={modalStyle.body}>{children}</div>

        {/* 5. MODAL FOOTER ACTION BAR */}
        <div className={modalStyle.footer}>
          {/* Status Tip */}
          <div className={modalStyle.statusTip}>
            <span className={modalStyle.statusIcon}>info</span>
            <span className={modalStyle.statusText}>確認後將執行相應操作</span>
          </div>

          {/* Action Buttons */}
          <div className={modalStyle.actionButtons}>
            <button className={modalStyle.cancelButton} type="button" onClick={onClose}>
              取消
            </button>
            <button className={modalStyle.confirmButton} type="button" onClick={onClose}>
              確認
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(modal, document.body);
}
