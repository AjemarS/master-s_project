"use client";

import { Component, createElement } from "react";
import { useTranslations } from "next-intl";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "~/ui/primitives/button";

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface Labels {
  title: string;
  unexpected: string;
  retry: string;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

/** Class components cannot use hooks, so the translated labels come from the wrapper below */
class ErrorBoundaryInner extends Component<ErrorBoundaryProps & { labels: Labels }, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps & { labels: Labels }) {
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
        { role: "alert", className: "flex flex-col items-center justify-center min-h-[400px] p-8 text-center" },
        createElement(AlertTriangle, { className: "h-12 w-12 text-destructive mb-4" }),
        createElement("h2", { className: "text-xl font-semibold text-foreground mb-2" },
          this.props.labels.title
        ),
        createElement("p", { className: "text-sm text-muted-foreground mb-4 max-w-md" },
          this.state.error?.message || this.props.labels.unexpected
        ),
        createElement(
          Button,
          { variant: "outline", onClick: this.handleRetry, className: "gap-2" },
          createElement(RefreshCw, { className: "h-4 w-4" }),
          this.props.labels.retry
        )
      );
    }

    return this.props.children;
  }
}

export function ErrorBoundary(props: ErrorBoundaryProps) {
  const t = useTranslations("errors");
  return <ErrorBoundaryInner {...props} labels={{ title: t("title"), unexpected: t("unexpected"), retry: t("retry") }} />;
}
