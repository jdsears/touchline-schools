import { AlertCircle, RefreshCw, WifiOff } from 'lucide-react'

export default function PageError({ title, description, onRetry, isNetworkError }) {
  const Icon = isNetworkError ? WifiOff : AlertCircle
  return (
    <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
      <div className="w-14 h-14 rounded-xl flex items-center justify-center mb-4"
        style={{ backgroundColor: 'var(--color-error-bg)', color: 'var(--color-error)' }}>
        <Icon className="w-7 h-7" />
      </div>
      <h3 className="heading-section mb-2">{title || (isNetworkError ? 'Connection issue' : 'Something went wrong')}</h3>
      <p className="text-secondary-styled max-w-sm mb-5">
        {description || (isNetworkError
          ? 'Please check your connection and try again.'
          : 'We could not load this page. Please try again.')}
      </p>
      {onRetry && (
        <button onClick={onRetry} className="btn-secondary btn-sm">
          <RefreshCw className="w-4 h-4" /> Try again
        </button>
      )}
    </div>
  )
}
