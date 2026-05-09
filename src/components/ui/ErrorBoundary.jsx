import { Component } from 'react';

/* Class component because hooks don't expose componentDidCatch — the only way
 * to actually intercept a render-phase exception in React.
 *
 * Use this to wrap features that are nice-to-have but shouldn't take down the
 * whole page if they break (chatbot, embeds, third-party widgets). */
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    // Surface to console + analytics so we know it happened in the wild.
    // Don't throw here — that'd unmount the whole tree.
    console.error('[ErrorBoundary]', error, info?.componentStack);
    if (typeof window !== 'undefined' && typeof window.gtag === 'function') {
      try {
        window.gtag('event', 'exception', {
          description: `${this.props.label || 'unknown'}: ${error?.message || error}`,
          fatal: false,
        });
      } catch {}
    }
  }

  reset = () => this.setState({ error: null });

  render() {
    if (this.state.error) {
      if (typeof this.props.fallback === 'function') {
        return this.props.fallback(this.state.error, this.reset);
      }
      if (this.props.fallback !== undefined) return this.props.fallback;
      // Default — silent. The chatbot just disappears instead of crashing the page.
      return null;
    }
    return this.props.children;
  }
}
