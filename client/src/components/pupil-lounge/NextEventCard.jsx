import { useState, useEffect } from 'react'
import { MapPin, Clock, Shirt, ChevronRight } from 'lucide-react'
import { format, formatDistanceToNow } from 'date-fns'
import api from '../../services/api'

const TYPE_STYLE = {
  fixture: { label: 'Match', gradient: 'from-gold-600 to-amber-700' },
  training: { label: 'Training', gradient: 'from-navy-700 to-navy-800' },
  lesson: { label: 'PE Lesson', gradient: 'from-emerald-700 to-green-800' },
}

const SPORT_EMOJI = {
  football: '⚽', rugby: '🏉', cricket: '🏏', hockey: '🏑',
  netball: '🤾', athletics: '🏃', swimming: '🏊', tennis: '🎾',
}

export default function NextEventCard() {
  const [event, setEvent] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const today = format(new Date(), 'yyyy-MM-dd')
    const future = new Date()
    future.setDate(future.getDate() + 30)
    const to = format(future, 'yyyy-MM-dd')

    api.get(`/pupils/me/schedule?from=${today}&to=${to}`)
      .then(r => {
        const events = r.data || []
        // Find the next upcoming event (today or future, prefer today first)
        if (events.length > 0) setEvent(events[0])
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="mx-4 mb-4">
        <div className="h-36 bg-navy-800 rounded-2xl animate-pulse" />
      </div>
    )
  }

  if (!event) return null

  const style = TYPE_STYLE[event.type] || TYPE_STYLE.training
  const extra = event.extra || {}
  const sport = extra.sport
  const eventDate = event.date ? new Date(event.date + 'T00:00:00') : null
  const isToday = eventDate && format(eventDate, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd')
  const countdown = eventDate ? formatDistanceToNow(eventDate, { addSuffix: true }) : ''

  return (
    <div className={`mx-4 mb-4 rounded-2xl bg-gradient-to-br ${style.gradient} border border-white/10 p-4 overflow-hidden`}>
      {/* Type badge */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold uppercase tracking-wider text-white/70">
            {style.label}
          </span>
          {sport && (
            <span className="text-sm">{SPORT_EMOJI[sport] || ''}</span>
          )}
        </div>
        {!isToday && countdown && (
          <span className="text-[10px] text-white/60 font-medium">{countdown}</span>
        )}
        {isToday && (
          <span className="text-[10px] bg-white/20 text-white px-2 py-0.5 rounded-full font-semibold">TODAY</span>
        )}
      </div>

      {/* Title */}
      <h3 className="text-lg font-bold text-white leading-tight mb-2">
        {event.type === 'fixture' && extra.home_away
          ? `vs ${event.title} (${extra.home_away})`
          : event.title}
      </h3>

      {/* Details */}
      <div className="space-y-1.5">
        {eventDate && (
          <div className="flex items-center gap-2 text-xs text-white/70">
            <Clock size={13} />
            <span>
              {format(eventDate, 'EEE d MMM')}
              {event.start_time ? ` at ${event.start_time.slice(0, 5)}` : ''}
              {extra.meet_time ? ` (meet ${extra.meet_time.slice(0, 5)})` : ''}
            </span>
          </div>
        )}

        {event.venue && (
          <div className="flex items-center gap-2 text-xs text-white/70">
            <MapPin size={13} />
            <span>{event.venue}</span>
          </div>
        )}

        {event.type === 'fixture' && extra.kit_type && (
          <div className="flex items-center gap-2 text-xs text-white/70">
            <Shirt size={13} />
            <span className="capitalize">{extra.kit_type} kit</span>
          </div>
        )}

        {extra.team_name && (
          <p className="text-xs text-white/50 mt-1">{extra.team_name}</p>
        )}
      </div>

      {/* Tap hint */}
      <div className="flex items-center justify-end mt-3 text-white/40">
        <ChevronRight size={16} />
      </div>
    </div>
  )
}
