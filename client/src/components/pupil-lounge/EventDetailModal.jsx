import { X, MapPin, Clock, Shirt, Users, BookOpen } from 'lucide-react'
import { format } from 'date-fns'

const TYPE_LABEL = {
  fixture: 'Match',
  training: 'Training',
  lesson: 'PE Lesson',
  assessment: 'Assessment',
}

const SPORT_EMOJI = {
  football: '⚽', rugby: '🏉', cricket: '🏏', hockey: '🏑',
  netball: '🤾', athletics: '🏃', swimming: '🏊', tennis: '🎾',
}

function DetailRow({ icon: Icon, children }) {
  return (
    <div className="flex items-start gap-3 text-sm text-white/80">
      <Icon size={16} className="text-navy-400 mt-0.5 flex-shrink-0" />
      <span>{children}</span>
    </div>
  )
}

function FixtureDetail({ event, extra }) {
  return (
    <div className="space-y-3">
      {extra.home_away && (
        <DetailRow icon={MapPin}>
          {extra.home_away === 'home' ? 'Home' : 'Away'} fixture
        </DetailRow>
      )}
      {event.venue && <DetailRow icon={MapPin}>{event.venue}</DetailRow>}
      {extra.kit_type && (
        <DetailRow icon={Shirt}>
          <span className="capitalize">{extra.kit_type}</span> kit
        </DetailRow>
      )}
      {extra.meet_time && (
        <DetailRow icon={Clock}>Meet at {extra.meet_time.slice(0, 5)}</DetailRow>
      )}
      {extra.team_name && (
        <DetailRow icon={Users}>{extra.team_name}</DetailRow>
      )}
    </div>
  )
}

function TrainingDetail({ event, extra }) {
  return (
    <div className="space-y-3">
      {event.venue && <DetailRow icon={MapPin}>{event.venue}</DetailRow>}
      {extra.duration && (
        <DetailRow icon={Clock}>{extra.duration} minutes</DetailRow>
      )}
      {extra.meet_time && (
        <DetailRow icon={Clock}>Meet at {extra.meet_time.slice(0, 5)}</DetailRow>
      )}
      {extra.team_name && (
        <DetailRow icon={Users}>{extra.team_name}</DetailRow>
      )}
    </div>
  )
}

function LessonDetail({ extra }) {
  return (
    <div className="space-y-3">
      {extra.group_name && (
        <DetailRow icon={Users}>{extra.group_name}</DetailRow>
      )}
      {extra.unit_name && (
        <DetailRow icon={BookOpen}>Unit: {extra.unit_name}</DetailRow>
      )}
      {extra.duration && (
        <DetailRow icon={Clock}>{extra.duration} minutes</DetailRow>
      )}
    </div>
  )
}

export default function EventDetailModal({ event, onClose }) {
  if (!event) return null

  const extra = event.extra || {}
  const sport = extra.sport
  const typeLabel = TYPE_LABEL[event.type] || event.type
  const eventDate = event.date ? new Date(event.date + 'T00:00:00') : null

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-50 bg-black/60" onClick={onClose} />

      {/* Sheet */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-navy-900 rounded-t-2xl max-h-[80vh] overflow-y-auto animate-sheet-up">
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-navy-700" />
        </div>

        {/* Close */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 p-2 text-navy-400 hover:text-white"
          aria-label="Close"
        >
          <X size={20} />
        </button>

        <div className="px-5 pb-8 pt-2">
          {/* Header */}
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] uppercase tracking-wider font-bold text-navy-400">
              {typeLabel}
            </span>
            {sport && <span className="text-sm">{SPORT_EMOJI[sport] || ''}</span>}
          </div>

          <h2 className="text-xl font-bold text-white mb-1">
            {event.type === 'fixture' ? `vs ${event.title}` : event.title}
          </h2>

          {eventDate && (
            <p className="text-sm text-navy-400 mb-4">
              {format(eventDate, 'EEEE d MMMM yyyy')}
              {event.start_time ? ` at ${event.start_time.slice(0, 5)}` : ''}
            </p>
          )}

          {/* Type-specific details */}
          {event.type === 'fixture' && <FixtureDetail event={event} extra={extra} />}
          {event.type === 'training' && <TrainingDetail event={event} extra={extra} />}
          {event.type === 'lesson' && <LessonDetail extra={extra} />}

          {/* Score (for past fixtures) */}
          {event.type === 'fixture' && extra.score_for != null && (
            <div className="mt-5 bg-navy-800 rounded-xl p-4 text-center">
              <p className="text-[10px] uppercase tracking-wider text-navy-500 mb-1">Result</p>
              <p className="text-2xl font-bold text-white">
                {extra.score_for} - {extra.score_against}
              </p>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
