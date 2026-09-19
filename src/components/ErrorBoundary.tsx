import { Component, type ErrorInfo, type ReactNode } from "react";
import { RefreshCw } from "lucide-react";

interface Props {
  children: ReactNode;
  /** Changing this value resets the boundary — pass the current route. */
  resetKey?: string;
}

interface State {
  error: Error | null;
}

/**
 * Catches render/lifecycle errors anywhere below it so a single broken page
 * shows a recoverable panel instead of blanking the entire app.
 * A class component is still the only supported mechanism in React.
 */
export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Unhandled render error:", error, info.componentStack);
  }

  componentDidUpdate(prev: Props) {
    if (prev.resetKey !== this.props.resetKey && this.state.error) {
      this.setState({ error: null });
    }
  }

  private reset = () => this.setState({ error: null });

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center px-6 text-center">
        <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-3">
          Something went wrong
        </p>
        <h1 className="font-serif text-3xl sm:text-4xl text-foreground mb-3 leading-tight">
          This page didn't load
        </h1>
        <p className="text-sm text-muted-foreground max-w-md mb-7">
          The rest of Sarevista is still working. Try again, or head back to the map.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-2">
          <button
            onClick={this.reset}
            className="h-10 px-5 rounded-full bg-card border border-border text-sm font-medium text-foreground hover:border-amber/40 transition-colors inline-flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4 text-amber" /> Try again
          </button>
          <a
            href="/"
            className="h-10 px-5 rounded-full border border-border text-sm font-medium text-muted-foreground hover:text-foreground transition-colors inline-flex items-center"
          >
            Back to home
          </a>
        </div>
      </div>
    );
  }
}
