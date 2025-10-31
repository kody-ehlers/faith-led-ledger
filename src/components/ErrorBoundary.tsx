import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Props = { children: React.ReactNode };

type State = {
  hasError: boolean;
  error?: Error | null;
  componentStack?: string | null;
};

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: { componentStack?: string }) {
    // Save component stack so we can show exactly where in our tree the error happened
    // You could also send this to remote logging here.
    this.setState({ error, componentStack: info.componentStack ?? null });
    // console.error('ErrorBoundary caught', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-4">
          <Card className="border-destructive/20">
            <CardHeader>
              <CardTitle className="text-destructive">
                An error occurred
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-muted-foreground">
                The application encountered an error while rendering. You can
                try reloading or report this error.
              </div>
              <div className="mt-4 text-sm font-medium text-foreground">
                {this.state.error?.message ?? String(this.state.error)}
              </div>
              <div className="mt-2 text-xs text-muted-foreground">
                Component stack:
              </div>
              <pre className="mt-2 max-h-40 overflow-auto whitespace-pre-wrap rounded bg-muted/10 p-2 text-xs text-muted-foreground">
                {this.state.componentStack ??
                  this.state.error?.stack ??
                  String(this.state.error)}
              </pre>
              <div className="mt-3">
                <button
                  className="rounded bg-primary px-3 py-1 text-sm text-white"
                  onClick={() => window.location.reload()}
                >
                  Reload
                </button>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }
    return this.props.children as React.ReactElement;
  }
}

export default ErrorBoundary;
