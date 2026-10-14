import { Component, type ErrorInfo, type ReactNode } from "react";
import { toast } from "sonner";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public override state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public override componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
    toast.error("發生未預期的錯誤", {
      description: error.message,
      duration: 8000,
    });
  }

  public override render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
          <div className="max-w-md w-full text-center">
            <div className="w-20 h-20 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-6">
              <span className="material-symbols-outlined text-destructive text-[40px]">error</span>
            </div>
            <h2 className="font-heading-lg text-on-surface mb-2">發生錯誤</h2>
            <p className="font-body-md text-on-surface-variant mb-6">
              {this.state.error?.message || "應用程式發生未預期的錯誤，請重新整理頁面。"}
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-lg font-body-md hover:bg-primary/90 transition-colors"
            >
              <span className="material-symbols-outlined">refresh</span>
              重新整理頁面
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
