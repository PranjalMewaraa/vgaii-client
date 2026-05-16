"use client";

import { Component, type ErrorInfo, type ReactNode } from "react";

// React 19 has stricter useEffect cleanup ordering and react-joyride
// has historically hit edge cases with portal-based positioners. If
// anything inside <Joyride> throws, the user shouldn't be trapped on a
// half-rendered overlay — the boundary silently unmounts the tree and
// notifies the parent so it can auto-skip.

type Props = {
  children: ReactNode;
  onError?: (err: unknown) => void;
};

type State = { failed: boolean };

export default class JoyrideBoundary extends Component<Props, State> {
  state: State = { failed: false };

  static getDerivedStateFromError(): State {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Log to console so we still notice in dev, but never re-throw.
    console.error("[JoyrideBoundary] tour crashed:", error, info);
    this.props.onError?.(error);
  }

  render() {
    if (this.state.failed) return null;
    return this.props.children;
  }
}
