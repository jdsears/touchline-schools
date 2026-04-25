import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { voiceObservationService } from '../../services/api'
import {
  Mic, Check, X, Edit3, ChevronDown, ChevronUp,
  AlertTriangle, User, Users, Loader2, Trash2, CheckCheck,
  Shield,
} from 'lucide-react'
import toast from 'react-hot-toast'

const OBS_TYPE_LABELS = {
  development: { label: 'Development', color: 'bg-pitch-600/20 text-pitch-400' },
  skill: { label: 'Skill', color: 'bg-blue-500/20 text-blue-400' },
  tactical: { label: 'Tactical', color: 'bg-purple-500/20 text-purple-400' },
  behaviour: { label: 'Behaviour', color: 'bg-amber-400/20 text-amber-400' },
  training_implication: { label: 'Training', color: 'bg-cyan-500/20 text-cyan-400' },
  team_level: { label: 'Team', color: 'bg-navy-600/40 text-secondary' },
}

const CONTEXT_LABELS = {
  general: 'Quick note',
  session: 'Session observation',
  match: 'Match observation',
  half_time: 'Half-time',
  post_fixture: 'Post-fixture debrief',
  lesson: 'Lesson observation',
}

export default function VoiceObservationReview() {
  const { audioSourceId } = useParams()
  const navigate = useNavigate()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showTranscript, setShowTranscript] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [discarding, setDiscarding] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [editContent, setEditContent] = useState('')

  useEffect(() => {
    loadReview()
  }, [audioSourceId])

  async function loadReview() {
    try {
      const res = await voiceObservationService.getReview(audioSourceId)
      setData(res.data)
    } catch (err) {
      console.error('Failed to load review:', err)
      toast.error('Failed to load voice observation')
    } finally {
      setLoading(false)
    }
  }

  async function handleConfirmAll() {
    setConfirming(true)
    try {
      const res = await voiceObservationService.confirmAll(audioSourceId)
      toast.success(`${res.data.confirmed} observations filed`)
      navigate('/teacher')
    } catch (err) {
      toast.error('Failed to confirm')
    } finally {
      setConfirming(false)
    }
  }

  async function handleReject(observationId) {
    try {
      await voiceObservationService.rejectObservation(audioSourceId, observationId)
      setData(prev => ({
        ...prev,
        observations: prev.observations.map(o =>
          o.id === observationId ? { ...o, review_state: 'rejected' } : o
        ),
      }))
      toast.success('Observation removed')
    } catch (err) {
      toast.error('Failed to reject')
    }
  }

  async function handleEdit(observationId) {
    try {
      await voiceObservationService.editObservation(audioSourceId, observationId, {
        content: editContent,
      })
      setData(prev => ({
        ...prev,
        observations: prev.observations.map(o =>
          o.id === observationId ? { ...o, content: editContent, review_state: 'edited' } : o
        ),
      }))
      setEditingId(null)
      toast.success('Observation updated')
    } catch (err) {
      toast.error('Failed to update')
    }
  }

  async function handleDiscard() {
    if (!confirm('Discard this entire voice observation? All extracted observations will be removed.')) return
    setDiscarding(true)
    try {
      await voiceObservationService.discard(audioSourceId)
      toast.success('Voice observation discarded')
      navigate('/teacher')
    } catch (err) {
      toast.error('Failed to discard')
    } finally {
      setDiscarding(false)
    }
  }

  if (loading) {
    return <div className="p-6 flex items-center justify-center min-h-[50vh]"><div className="spinner w-8 h-8" /></div>
  }

  if (!data) {
    return (
      <div className="p-6 text-center">
        <p className="text-secondary">Voice observation not found or still processing.</p>
        <button onClick={() => navigate('/teacher')} className="text-pitch-400 hover:underline text-sm mt-2">
          Back to Teacher Hub
        </button>
      </div>
    )
  }

  const { audio_source, observations } = data
  const pendingObs = observations.filter(o => o.review_state === 'pending_review' || o.review_state === 'edited')
  const rejectedObs = observations.filter(o => o.review_state === 'rejected')
  const safeguardingObs = pendingObs.filter(o => o.safeguarding_flag)
  const routineObs = pendingObs.filter(o => !o.safeguarding_flag)

  return (
    <div className="p-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-pitch-600/20 flex items-center justify-center">
            <Mic className="w-5 h-5 text-pitch-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-primary">Review Voice Observation</h1>
            <p className="text-xs text-secondary">
              {CONTEXT_LABELS[audio_source.context_type] || 'Observation'}
              {audio_source.duration_seconds && ` - ${Math.round(audio_source.duration_seconds)}s`}
            </p>
          </div>
        </div>
      </div>

      {/* Transcript (collapsible) */}
      {audio_source.transcript && (
        <div className="bg-card rounded-xl border border-border-default mb-6">
          <button
            onClick={() => setShowTranscript(!showTranscript)}
            className="w-full flex items-center justify-between px-5 py-3 text-sm text-secondary hover:text-link transition-colors"
          >
            <span>Transcript</span>
            {showTranscript ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
          {showTranscript && (
            <div className="px-5 pb-4">
              <p className="text-sm text-secondary leading-relaxed whitespace-pre-wrap">
                {audio_source.transcript}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Safeguarding-flagged observations */}
      {safeguardingObs.length > 0 && (
        <div className="mb-6">
          <div className="bg-alert-600/10 border border-alert-600/30 rounded-xl p-4 mb-3">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-alert-400 shrink-0 mt-0.5" />
              <div>
                <h3 className="text-sm font-semibold text-alert-400">Safeguarding content detected</h3>
                <p className="text-xs text-secondary mt-1">
                  The following observations have been flagged as potentially safeguarding-relevant.
                  If confirmed, they will be routed to the Designated Safeguarding Lead rather than
                  filed as routine observations.
                </p>
              </div>
            </div>
          </div>
          {safeguardingObs.map(obs => (
            <ObservationCard
              key={obs.id}
              obs={obs}
              isSafeguarding
              editingId={editingId}
              editContent={editContent}
              onStartEdit={(id, content) => { setEditingId(id); setEditContent(content) }}
              onSaveEdit={handleEdit}
              onCancelEdit={() => setEditingId(null)}
              onEditContentChange={setEditContent}
              onReject={handleReject}
            />
          ))}
        </div>
      )}

      {/* Routine observations */}
      {routineObs.length > 0 ? (
        <div className="space-y-3 mb-6">
          {routineObs.map(obs => (
            <ObservationCard
              key={obs.id}
              obs={obs}
              editingId={editingId}
              editContent={editContent}
              onStartEdit={(id, content) => { setEditingId(id); setEditContent(content) }}
              onSaveEdit={handleEdit}
              onCancelEdit={() => setEditingId(null)}
              onEditContentChange={setEditContent}
              onReject={handleReject}
            />
          ))}
        </div>
      ) : pendingObs.length === 0 && (
        <div className="bg-card rounded-xl border border-border-default p-8 text-center mb-6">
          <p className="text-secondary text-sm">No observations were extracted from this recording.</p>
          <p className="text-tertiary text-xs mt-1">The transcript may not have contained actionable coaching content.</p>
        </div>
      )}

      {/* Rejected (collapsed) */}
      {rejectedObs.length > 0 && (
        <div className="text-xs text-tertiary mb-6">
          {rejectedObs.length} observation{rejectedObs.length > 1 ? 's' : ''} removed
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between pt-4 border-t border-border-default">
        <button
          onClick={handleDiscard}
          disabled={discarding}
          className="flex items-center gap-1.5 px-4 py-2.5 text-secondary hover:text-alert-400 text-sm transition-colors"
        >
          <Trash2 className="w-4 h-4" />
          Discard everything
        </button>
        {pendingObs.length > 0 && (
          <button
            onClick={handleConfirmAll}
            disabled={confirming}
            className="flex items-center gap-2 px-6 py-3 bg-pitch-600 hover:bg-pitch-700 text-on-dark rounded-lg font-medium transition-colors disabled:opacity-50"
          >
            {confirming ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCheck className="w-4 h-4" />}
            Confirm all ({pendingObs.length})
          </button>
        )}
      </div>
    </div>
  )
}

function ObservationCard({ obs, isSafeguarding, editingId, editContent, onStartEdit, onSaveEdit, onCancelEdit, onEditContentChange, onReject }) {
  const typeConfig = OBS_TYPE_LABELS[obs.type] || OBS_TYPE_LABELS.development
  const isEditing = editingId === obs.id
  const [showFragment, setShowFragment] = useState(false)

  return (
    <div className={`bg-card rounded-xl border ${isSafeguarding ? 'border-alert-600/30' : 'border-border-default'} p-4`}>
      {/* Pupil and type */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          {obs.pupil_id ? (
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-border-default flex items-center justify-center">
                <span className="text-xs font-medium text-primary">
                  {obs.first_name?.charAt(0)}{obs.last_name?.charAt(0)}
                </span>
              </div>
              <span className="text-sm font-medium text-primary">{obs.first_name} {obs.last_name}</span>
              {obs.year_group && <span className="text-xs text-tertiary">Y{obs.year_group}</span>}
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-secondary" />
              <span className="text-sm text-secondary">Team-level note</span>
            </div>
          )}
          <span className={`px-2 py-0.5 rounded text-xs font-medium ${typeConfig.color}`}>
            {typeConfig.label}
          </span>
          {isSafeguarding && (
            <span className="px-2 py-0.5 bg-alert-600/20 text-alert-400 rounded text-xs font-medium flex items-center gap-1">
              <Shield className="w-3 h-3" /> DSL Review
            </span>
          )}
        </div>
        {obs.confidence != null && (
          <span className="text-xs text-tertiary">{Math.round(obs.confidence * 100)}%</span>
        )}
      </div>

      {/* Content */}
      {isEditing ? (
        <div className="mb-2">
          <textarea
            value={editContent}
            onChange={e => onEditContentChange(e.target.value)}
            rows={3}
            className="w-full px-3 py-2 bg-subtle border border-border-strong rounded-lg text-primary text-sm focus:outline-none focus:border-pitch-500 resize-none"
          />
          <div className="flex gap-2 mt-2">
            <button onClick={onCancelEdit} className="px-3 py-1 bg-subtle text-secondary rounded text-xs">Cancel</button>
            <button onClick={() => onSaveEdit(obs.id)} className="px-3 py-1 bg-pitch-600 text-on-dark rounded text-xs">Save</button>
          </div>
        </div>
      ) : (
        <p className="text-sm text-primary mb-2">{obs.content}</p>
      )}

      {/* Transcript fragment */}
      {obs.transcript_fragment && (
        <button
          onClick={() => setShowFragment(!showFragment)}
          className="text-xs text-tertiary hover:text-secondary transition-colors"
        >
          {showFragment ? 'Hide source' : 'Show source'}
        </button>
      )}
      {showFragment && obs.transcript_fragment && (
        <div className="mt-1 px-3 py-2 bg-subtle rounded text-xs text-secondary italic">
          "{obs.transcript_fragment}"
        </div>
      )}

      {/* Actions */}
      {!isEditing && obs.review_state !== 'rejected' && (
        <div className="flex gap-2 mt-3 pt-2 border-t border-border-subtle">
          <button
            onClick={() => onStartEdit(obs.id, obs.content)}
            className="flex items-center gap-1 px-2.5 py-1 bg-subtle hover:bg-border-default text-secondary rounded text-xs transition-colors"
          >
            <Edit3 className="w-3 h-3" /> Edit
          </button>
          <button
            onClick={() => onReject(obs.id)}
            className="flex items-center gap-1 px-2.5 py-1 bg-subtle hover:bg-border-default text-secondary hover:text-alert-400 rounded text-xs transition-colors"
          >
            <X className="w-3 h-3" /> Remove
          </button>
        </div>
      )}
    </div>
  )
}
