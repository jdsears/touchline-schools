import { Component } from 'react'
import { AlertCircle, RefreshCw } from 'lucide-react'

function isStaleChunkError(err) {
  const msg = String(err?.message || err || '')
  return (
    msg.includes('Failed to fetch dynamically imported module') ||
    msg.includes('Importing a module script failed') ||
    msg.includes('error loading dynamically imported module') ||
    /Loading chunk \S+ failed/.test(msg) ||
    /Loading CSS chunk \S+ failed/.test(msg)
  )
}

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null, isStale: false }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error, isStale: isStaleChunkError(error) }
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo)
    if (isStaleChunkError(error)) {
      // Stale chunk after a deploy — reload once to fetch the new manifest.
      // sessionStorage guard (shared with lazyWithRetry) prevents infinite loops.
      const key = 'stale_chunk_reload'
      if (window.sessionStorage.getItem(key) !== '1') {
        window.sessionStorage.setItem(key, '1')
        setTimeout(() => window.location.reload(), 50)
      }
    }
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null, isStale: false })
  }

  render() {
    if (this.state.hasError) {
      const errorMessage = this.state.error?.message || String(this.state.error || '')

      // Stale-chunk error: we've already triggered a reload in componentDidCatch.
      // Show a calm "updating" message instead of the red error screen.
      if (this.state.isStale) {
        return (
          <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 32, background: 'var(--mb-navy, #0F1E3D)' }}>
            <div style={{ textAlign: 'center', maxWidth: 420 }}>
              <div style={{
                width: 32, height: 32, borderRadius: '50%',
                border: '2px solid rgba(201, 169, 97, 0.2)',
                borderTopColor: 'var(--mb-gold, #C9A961)',
                animation: 'spin 0.8s linear infinite',
                margin: '0 auto 20px',
              }} />
              <p style={{ fontFamily: 'var(--font-sans, Poppins, sans-serif)', fontSize: 14, color: 'rgba(250, 250, 247, 0.7)' }}>
                Updating to the latest version…
              </p>
            </div>
          </div>
        )
      }

      return (
        <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 32, background: 'var(--mb-navy, #0F1E3D)' }}>
          <div style={{ textAlign: 'center', maxWidth: 560 }}>
            <AlertCircle size={48} style={{ color: '#ef4444', margin: '0 auto 16px' }} />
            <h2 style={{ fontFamily: 'var(--font-serif, "Crimson Pro", Georgia, serif)', fontSize: 22, fontWeight: 700, color: 'white', marginBottom: 8 }}>
              Something went wrong
            </h2>
            <p style={{ fontFamily: 'var(--font-sans, Poppins, sans-serif)', fontSize: 14, color: 'rgba(250, 250, 247, 0.6)', lineHeight: 1.6, marginBottom: 16 }}>
              This page failed to load. This can happen due to a network issue or a temporary error.
            </p>
            {errorMessage && (
              <pre style={{
                fontFamily: 'ui-monospace, SFMono-Regular, Consolas, monospace',
                fontSize: 11,
                color: 'rgba(250, 250, 247, 0.5)',
                background: 'rgba(0,0,0,0.3)',
                padding: '10px 14px',
                borderRadius: 4,
                marginBottom: 24,
                textAlign: 'left',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
                border: '1px solid rgba(239, 68, 68, 0.2)',
              }}>
                {errorMessage}
              </pre>
            )}
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
              <button
                onClick={this.handleRetry}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '10px 20px', borderRadius: 4, border: 'none', cursor: 'pointer',
                  background: 'var(--mb-gold, #C9A961)', color: 'var(--mb-navy, #0F1E3D)',
                  fontFamily: 'var(--font-sans, Poppins, sans-serif)', fontSize: 14, fontWeight: 600,
                  transition: 'background 0.15s ease',
                }}
              >
                <RefreshCw size={16} />
                Try Again
              </button>
              <button
                onClick={() => window.location.reload()}
                style={{
                  padding: '10px 20px', borderRadius: 4, cursor: 'pointer',
                  background: 'rgba(255,255,255,0.06)', color: 'rgba(250, 250, 247, 0.7)',
                  border: '1px solid rgba(201, 169, 97, 0.2)',
                  fontFamily: 'var(--font-sans, Poppins, sans-serif)', fontSize: 14, fontWeight: 500,
                  transition: 'background 0.15s ease',
                }}
              >
                Refresh Page
              </button>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
