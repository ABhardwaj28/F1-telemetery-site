import { Component, type ErrorInfo, type ReactNode, StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.tsx";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class RootErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Global React Error Boundary caught:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            padding: 40,
            color: "#ffffff",
            background: "#0c0c0e",
            minHeight: "100vh",
            fontFamily: "IBM Plex Mono, monospace",
          }}
        >
          <div
            style={{
              display: "inline-block",
              background: "rgba(225, 6, 0, 0.15)",
              color: "#e10600",
              border: "1px solid rgba(225, 6, 0, 0.4)",
              borderRadius: 3,
              padding: "4px 12px",
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: "0.15em",
              marginBottom: 16,
            }}
          >
            APPLICATION RECOVERY
          </div>
          <h2 style={{ fontSize: 24, margin: "0 0 12px", color: "#eeeeef" }}>
            An unexpected render error occurred
          </h2>
          <pre
            style={{
              background: "#141418",
              border: "1px solid #2a2a32",
              padding: 20,
              borderRadius: 6,
              color: "#ff6b6b",
              overflowX: "auto",
              fontSize: 12,
              lineHeight: 1.5,
              maxWidth: 900,
            }}
          >
            {this.state.error?.stack || this.state.error?.message || String(this.state.error)}
          </pre>
          <button
            onClick={() => {
              try {
                localStorage.removeItem("f1_app_state");
                window.location.href = window.location.pathname;
              } catch {}
            }}
            style={{
              marginTop: 20,
              padding: "12px 24px",
              background: "#e10600",
              color: "#ffffff",
              border: "none",
              borderRadius: 4,
              cursor: "pointer",
              fontWeight: 700,
              fontFamily: "IBM Plex Mono, monospace",
              fontSize: 12,
              letterSpacing: "0.08em",
            }}
          >
            RESET CACHE & RELOAD
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <RootErrorBoundary>
      <App />
    </RootErrorBoundary>
  </StrictMode>,
);