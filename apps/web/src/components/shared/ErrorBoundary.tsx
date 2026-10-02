import { Component, type ErrorInfo, type ReactNode } from "react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public override state: State = { hasError: false, error: null };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public override componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  public override render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex flex-col items-center justify-center min-h-[400px] p-8 text-center">
          <div className="w-16 h-16 rounded-full bg-error/10 border border-error/30 flex items-center justify-center text-error mb-4">
            <span className="material-symbols-outlined text-[32px]">error</span>
          </div>
          <h2 className="font-headline-sm text-headline-sm text-on-surface mb-2">發生錯誤</h2>
          <p className="font-body-md text-body-md text-on-surface-variant mb-4 max-w-md">
            這個組件發生了錯誤，無法正常顯示。請嘗試重新整理頁面或稍後再試。
          </p>
          <details className="text-left w-full max-w-md mb-4">
            <summary className="font-label-code-sm text-label-code-sm text-on-surface-variant cursor-pointer">
              錯誤詳情
            </summary>
            <pre className="mt-2 p-3 bg-surface-container-low rounded-lg overflow-x-auto text-xs text-on-surface-variant">
              {this.state.error?.message}
            </pre>
          </details>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            className="btn-primary"
          >
            <span className="material-symbols-outlined text-[16px]">refresh</span>
            重試
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
