import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { Sparkles, X, ChevronRight } from 'lucide-react'

// Guided journey strip for live-demo visitors (user.is_demo_user).
// Dismissible; remembers dismissal per browser.
const STEPS = [
  { label: 'Your day at a glance', to: '/teacher' },
  { label: 'Open a team & plan a session', to: '/teacher/teams' },
  { label: 'Ask Coach for drills', to: '/teacher/assistant' },
  // Voice notes live behind the gold mic button - open the recorder directly
  { label: 'Speak a voice note from the field', action: 'open-voice-recorder' },
  { label: 'Fixtures & results', to: '/teacher/fixtures' },
  { label: 'Pupil development', to: '/teacher/development' },
]

export default function DemoGuideBanner() {
  const { user } = useAuth()
  const location = useLocation()
  const [dismissed, setDismissed] = useState(() => localStorage.getItem('demo_guide_dismissed') === '1')

  if (!user?.is_demo_user || dismissed) return null

  return (
    <div className="border-b border-brand-accent/30 bg-brand-accent-tint px-4 py-2.5 lg:px-6">
      <div className="mx-auto flex max-w-[1200px] flex-wrap items-center gap-x-4 gap-y-2">
        <span className="flex items-center gap-2 font-display text-[13px] font-semibold text-primary">
          <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-brand-primary">
            <Sparkles className="h-3 w-3 text-brand-accent" />
          </span>
          Welcome to the Ashworth Park demo
        </span>
        <div className="flex flex-wrap items-center gap-1.5">
          {STEPS.map((step, i) => {
            const active = step.to && location.pathname === step.to
            const cls = `flex items-center gap-1 rounded-full px-2.5 py-1 text-[12px] font-medium transition-colors ${
              active
                ? 'bg-brand-primary text-on-dark'
                : 'bg-card/70 text-secondary hover:bg-card hover:text-primary'
            }`
            if (step.action) {
              return (
                <button
                  key={step.label}
                  type="button"
                  onClick={() => window.dispatchEvent(new CustomEvent(step.action))}
                  className={cls}
                >
                  <span className="font-semibold">{i + 1}.</span> {step.label}
                  <ChevronRight className="h-3 w-3 opacity-50" />
                </button>
              )
            }
            return (
              <Link key={step.to} to={step.to} className={cls}>
                <span className="font-semibold">{i + 1}.</span> {step.label}
                {!active && <ChevronRight className="h-3 w-3 opacity-50" />}
              </Link>
            )
          })}
        </div>
        <button
          onClick={() => {
            localStorage.setItem('demo_guide_dismissed', '1')
            setDismissed(true)
          }}
          aria-label="Dismiss demo guide"
          className="ml-auto rounded-lg p-1.5 text-tertiary transition-colors hover:bg-card hover:text-primary"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  )
}
