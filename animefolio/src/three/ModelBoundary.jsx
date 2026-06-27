// ============================================================================
// ModelBoundary — an error boundary so a missing/broken glTF degrades to a
// placeholder instead of blanking the scene. Keeps the app at least as good
// as the primitive placeholders from Steps 2–3.
// ============================================================================

import { Component } from "react";

export default class ModelBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { failed: false };
  }

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error) {
    // eslint-disable-next-line no-console
    console.warn("[AnimeFolio] model failed to load, using placeholder:", error?.message);
  }

  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}
