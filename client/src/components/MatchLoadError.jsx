import { Link } from 'react-router-dom'
import { AlertCircle, RefreshCw } from 'lucide-react'

// Why a match page could not load, in words a teacher can act on. Every
// failure used to read "Match not found", which hid expired sessions, rate
// limiting and access problems behind the one message.
export function describeLoadError(error) {
  const status = error?.response?.status
  if (!error) {
    return { title: 'Match not found', hint: 'This fixture may have been removed.' }
  }
  if (!error.response) {
    return { title: "Can't reach the server", hint: 'Check your connection and try again.' }
  }
  switch (status) {
    case 404:
      return { title: 'Match not found', hint: 'This fixture no longer exists. If the demo data was refreshed, open it again from the dashboard.' }
    case 403:
      return { title: "You don't have access to this fixture", hint: "It belongs to a team you don't oversee." }
    case 429:
      return { title: 'The server is busy', hint: 'Too many requests in the last minute. Wait a moment and try again.' }
    case 401:
      return { title: 'Your session has ended', hint: 'Sign in again to continue.' }
    default:
      return { title: "Couldn't load this fixture", hint: `The server returned an error (${status}). Try again in a moment.` }
  }
}

export default function MatchLoadError({ error }) {
  const { title, hint } = describeLoadError(error)
  return (
    <div className="text-center py-20 px-6">
      <AlertCircle className="w-6 h-6 mx-auto mb-3" style={{ color: 'var(--text-tertiary)' }} />
      <p className="text-[15px] font-semibold" style={{ color: 'var(--text-primary)' }}>{title}</p>
      <p className="text-[13px] mt-1 max-w-md mx-auto" style={{ color: 'var(--text-tertiary)' }}>{hint}</p>
      <div className="flex justify-center gap-2 mt-5">
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[13px] font-semibold bg-brand-primary text-on-dark"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Try again
        </button>
        <Link to="/teacher/fixtures" className="inline-flex items-center px-3 py-1.5 rounded-lg text-[13px] font-semibold bg-subtle text-secondary">
          All fixtures
        </Link>
      </div>
    </div>
  )
}
