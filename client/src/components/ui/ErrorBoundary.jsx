import { Component } from "react";

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="panel p-10 text-center space-y-4 max-w-lg mx-auto mt-12">
          <div className="h-14 w-14 mx-auto rounded-2xl bg-red-50 flex items-center justify-center text-red-500 text-2xl">
            ⚠️
          </div>
          <h2 className="text-xl font-bold text-ink">Something went wrong</h2>
          <p className="text-sm text-ink/55">
            {this.state.error?.message || "An unexpected error occurred while rendering this page."}
          </p>
          <button
            onClick={() => {
              this.setState({ hasError: false, error: null });
              window.location.reload();
            }}
            className="inline-flex items-center gap-2 rounded-full bg-accent px-6 py-2.5 text-sm font-bold text-white hover:opacity-90 transition"
          >
            Reload Page
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
