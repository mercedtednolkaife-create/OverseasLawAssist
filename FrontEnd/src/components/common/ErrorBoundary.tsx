import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertCircle, RefreshCw, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('React ErrorBoundary caught an uncaught error:', error, errorInfo);
    this.setState({ error, errorInfo });
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen bg-zinc-50 flex items-center justify-center p-6 text-zinc-900 font-sans">
          <div className="max-w-xl w-full bg-white rounded-2xl border border-zinc-200 shadow-xl p-8 space-y-6">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center shrink-0">
                <AlertCircle className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h1 className="text-base font-bold text-zinc-900 tracking-tight">
                  页面渲染遇到非预期异常
                </h1>
                <p className="text-xs text-zinc-500 leading-relaxed">
                  系统已捕获该前端运行时错误，未导致数据丢失。您可以尝试刷新视图或返回主控制台。
                </p>
              </div>
            </div>

            {this.state.error && (
              <div className="p-3.5 bg-zinc-50 rounded-xl border border-zinc-200 font-mono text-[11px] text-zinc-700 overflow-x-auto max-h-48 leading-relaxed">
                <p className="font-bold text-rose-600 mb-1">{this.state.error.name}: {this.state.error.message}</p>
                {this.state.errorInfo?.componentStack && (
                  <pre className="text-zinc-500 whitespace-pre-wrap text-[10px]">
                    {this.state.errorInfo.componentStack}
                  </pre>
                )}
              </div>
            )}

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={this.handleReset}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg transition-colors shadow-xs"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>重新加载页面</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  window.location.href = '/';
                }}
                className="flex items-center gap-2 px-4 py-2 bg-white hover:bg-zinc-50 text-zinc-700 border border-zinc-200 text-xs font-medium rounded-lg transition-colors shadow-2xs"
              >
                <Home className="w-3.5 h-3.5" />
                <span>返回首页</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
