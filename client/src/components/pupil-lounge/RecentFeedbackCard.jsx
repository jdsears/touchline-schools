import { useState, useEffect } from 'react'
import { MessageSquare } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import api from '../../services/api'

const SPORT_EMOJI = {
  football: '⚽', rugby: '🏉', cricket: '🏏', hockey: '🏑',
  netball: '🤾', athletics: '🏃', swimming: '🏊', tennis: '🎾',
}

export default function RecentFeedbackCard() {
  const [feedback, setFeedback] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/pupils/me/development')
      .then(r => {
        // Only show pupil-visible observations (the endpoint will
        // be updated to filter by visible_to_pupil in a later pass;
        // for now show the latest 2)
        setFeedback((r.data || []).slice(0, 2))
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="mx-4 mb-4 space-y-2">
        <div className="h-20 bg-navy-800 rounded-xl animate-pulse" />
      </div>
    )
  }

  // Brief says: "If none exist, hide the card entirely"
  if (feedback.length === 0) return null

  return (
    <div className="mx-4 mb-4">
      <h3 className="text-xs font-semibold text-navy-400 uppercase tracking-wide mb-2 px-1">
        Recent Feedback
      </h3>
      <div className="space-y-2">
        {feedback.map(obs => (
          <div
            key={obs.id}
            className="bg-navy-900 border border-navy-800 rounded-xl p-3"
          >
            <div className="flex items-start gap-2.5">
              <MessageSquare size={14} className="text-gold-400 mt-0.5 flex-shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-sm text-white leading-relaxed line-clamp-3">
                  {obs.content}
                </p>
                <div className="flex items-center gap-2 mt-1.5 text-[10px] text-navy-500">
                  <span>{obs.observer_name}</span>
                  {obs.sport && (
                    <>
                      <span>·</span>
                      <span>{SPORT_EMOJI[obs.sport] || ''} {obs.sport}</span>
                    </>
                  )}
                  <span>·</span>
                  <span>{formatDistanceToNow(new Date(obs.created_at), { addSuffix: true })}</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
