"use client";

import { Component, createElement } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "~/ui/primitives/button";

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return createElement(
        "div",
        { className: "flex flex-col items-center justify-center min-h-[400px] p-8 text-center" },
        createElement(AlertTriangle, { className: "h-12 w-12 text-destructive mb-4" }),
        createElement("h2", { className: "text-xl font-semibold text-foreground mb-2" },
          "Щось пішло не так"
        ),
        createElement("p", { className: "text-sm text-muted-foreground mb-4 max-w-md" },
          this.state.error?.message || "Сталася неочікувана помилка"
        ),
        createElement(
          Button,
          { variant: "outline", onClick: this.handleRetry, className: "gap-2" },
          createElement(RefreshCw, { className: "h-4 w-4" }),
          "Спробувати знову"
        )
      );
    }

    return this.props.children;
  }
}
