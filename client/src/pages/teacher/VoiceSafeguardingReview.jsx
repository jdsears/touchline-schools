import { useState, useEffect } from 'react'
import api from '../../services/api'
import {
  Shield, AlertTriangle, Check, ChevronRight, User,
  Clock, Mic, ChevronDown, ChevronUp,
} from 'lucide-react'
import toast from 'react-hot-toast'

const CONTEXT_LABELS = {
  general: 'Quick note', session: 'Session', match: 'Match',
  half_time: 'Half-time', post_fixture: 'Post-fixture', lesson: 'Lesson',
}

export default function VoiceSafeguardingReview() {
  const [flagged, setFlagged] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/voice-safeguarding/flagged')
      .then(res => setFlagged(res.data))
      .catch(err => console.error('Failed to load flagged:', err))
      .finally(() => setLoading(false))
  }, [])

  async function handleReview(observationId, action, notes) {
    try {
      await api.post(`/voice-safeguarding/flagged/${observationId}/review`, { action, notes })
      setFlagged(prev => prev.filter(f => f.observation_id !== observationId))
      toast.success(action === 'dismiss' ? 'Dismissed and filed as routine observation' : 'Escalated for formal incident')
    } catch (err) {
      toast.error('Failed to review')
    }
  }

  if (loading) {
    return <div className="p-6 flex items-center justify-center min-h-[50vh]"><div className="spinner w-8 h-8" /></div>
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-primary flex items-center gap-3">
          <Shield className="w-7 h-7 text-alert-400" />
          Voice Observation Safeguarding Review
        </h1>
        <p className="text-secondary mt-1">Observations flagged by the AI as potentially safeguarding-relevant</p>
      </div>

      {/* Guidance */}
      <div className="bg-card rounded-xl border border-amber-400/30 p-5 mb-6">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div className="text-xs text-secondary space-y-1">
            <p className="font-medium text-amber-400 text-sm">DSL Review Required</p>
            <p>These observations were flagged during AI extraction from voice observations. The AI detected language that may indicate a safeguarding concern (injury, distress, disclosure, or behaviour beyond routine).</p>
            <p>For each item, you can <strong className="text-primary">dismiss</strong> (files as a routine observation) or <strong className="text-primary">escalate</strong> (keeps it flagged; create a formal safeguarding incident through the incident system).</p>
          </div>
        </div>
      </div>

      {flagged.length > 0 ? (
        <div className="space-y-4">
          {flagged.map(item => (
            <FlaggedCard key={item.log_id} item={item} onReview={handleReview} />
          ))}
        </div>
      ) : (
        <div className="bg-card rounded-xl border border-border-default p-12 text-center">
          <Check className="w-8 h-8 text-pitch-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-primary mb-2">No flagged observations</h3>
          <p className="text-secondary text-sm">
            No voice observations have been flagged for safeguarding review in the last 30 days.
          </p>
        </div>
      )}
    </div>
  )
}

function FlaggedCard({ item, onReview }) {
  const [showTranscript, setShowTranscript] = useState(false)
  const [notes, setNotes] = useState('')

  const details = typeof item.details === 'string' ? JSON.parse(item.details) : item.details || {}

  return (
    <div className="bg-card rounded-xl border border-alert-600/30 p-5">
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Mic className="w-4 h-4 text-alert-400" />
            <span className="text-sm font-medium text-primary">{item.teacher_name}</span>
            <span className="px-2 py-0.5 bg-subtle rounded text-xs text-secondary capitalize">
              {CONTEXT_LABELS[item.context_type] || item.context_type}
            </span>
          </div>
          <div className="flex items-center gap-2 text-xs text-tertiary">
            <Clock className="w-3 h-3" />
            {new Date(item.created_at).toLocaleDateString('en-GB', {
              day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
            })}
            {item.duration_seconds && <span>({item.duration_seconds}s recording)</span>}
          </div>
        </div>
        {item.pupil_first_name && (
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-border-default flex items-center justify-center">
              <span className="text-xs font-medium text-primary">
                {item.pupil_first_name?.charAt(0)}{item.pupil_last_name?.charAt(0)}
              </span>
            </div>
            <span className="text-sm text-secondary">{item.pupil_first_name} {item.pupil_last_name}</span>
          </div>
        )}
      </div>

      {/* Why flagged */}
      {details.reason && (
        <div className="bg-alert-600/10 rounded-lg px-3 py-2 mb-3">
          <span className="text-xs font-medium text-alert-400">Flagged reason: </span>
          <span className="text-xs text-secondary">{details.reason}</span>
        </div>
      )}

      {/* Observation content */}
      {item.observation_content && (
        <div className="bg-subtle rounded-lg px-4 py-3 mb-3">
          <p className="text-sm text-primary">{item.observation_content}</p>
        </div>
      )}

      {/* Transcript fragment */}
      {item.transcript_fragment && (
        <div className="mb-3">
          <button
            onClick={() => setShowTranscript(!showTranscript)}
            className="text-xs text-tertiary hover:text-secondary flex items-center gap-1"
          >
            {showTranscript ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            {showTranscript ? 'Hide transcript' : 'Show transcript fragment'}
          </button>
          {showTranscript && (
            <div className="mt-1 px-3 py-2 bg-subtle rounded text-xs text-secondary italic">
              "{item.transcript_fragment}"
            </div>
          )}
        </div>
      )}

      {/* DSL notes */}
      <div className="mb-3">
        <textarea
          value={notes}
          onChange={e => setNotes(e.target.value)}
          placeholder="DSL review notes (optional)"
          rows={2}
          className="w-full px-3 py-2 bg-subtle border border-border-strong rounded-lg text-primary text-xs placeholder:text-tertiary focus:outline-none focus:border-pitch-500 resize-none"
        />
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <button
          onClick={() => onReview(item.observation_id, 'dismiss', notes)}
          className="flex items-center gap-1.5 px-4 py-2 bg-subtle hover:bg-border-default text-secondary rounded-lg text-xs transition-colors"
        >
          <Check className="w-3.5 h-3.5" />
          Dismiss (file as routine)
        </button>
        <button
          onClick={() => onReview(item.observation_id, 'escalate', notes)}
          className="flex items-center gap-1.5 px-4 py-2 bg-alert-600 hover:bg-alert-700 text-primary rounded-lg text-xs transition-colors"
        >
          <AlertTriangle className="w-3.5 h-3.5" />
          Escalate to incident
        </button>
      </div>
    </div>
  )
}
