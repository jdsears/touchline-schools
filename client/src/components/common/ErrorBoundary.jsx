import { Component } from 'react'
import { AlertCircle, RefreshCw } from 'lucide-react'

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo)
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null })
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[60vh] flex items-center justify-center p-8">
          <div className="text-center max-w-md">
            <AlertCircle className="w-12 h-12 text-alert-400 mx-auto mb-4" />
            <h2 className="text-lg font-display font-semibold text-white mb-2">
              Something went wrong
            </h2>
            <p className="text-navy-400 text-sm mb-6">
              This page failed to load. This can happen due to a network issue or a temporary error.
            </p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={this.handleRetry}
                className="px-4 py-2 bg-pitch-600 hover:bg-pitch-500 text-white rounded-lg text-sm transition-colors flex items-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                Try Again
              </button>
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-2 bg-navy-800 hover:bg-navy-700 text-navy-300 rounded-lg text-sm transition-colors"
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
