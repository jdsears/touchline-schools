import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Calendar, MessageSquare, TrendingUp } from 'lucide-react'
import { format, formatDistanceToNow } from 'date-fns'
import { usePupilProfile } from '../../hooks/usePupilProfile'
import api from '../../services/api'

const SPORT_EMOJI = {
  football: '⚽', rugby: '🏉', cricket: '🏏', hockey: '🏑',
  netball: '🤾', athletics: '🏃', swimming: '🏊', tennis: '🎾',
  basketball: '🏀', gymnastics: '🤸',
}

const SPORT_GRADIENT = {
  football: 'from-green-700 to-emerald-900',
  rugby: 'from-amber-700 to-orange-900',
  hockey: 'from-purple-700 to-violet-900',
  netball: 'from-pink-700 to-rose-900',
  cricket: 'from-sky-700 to-blue-900',
}

export default function SportDetailPage() {
  const { sportKey } = useParams()
  const navigate = useNavigate()
  const { teams, teachingGroups } = usePupilProfile()
  const [events, setEvents] = useState([])
  const [feedback, setFeedback] = useState([])
  const [loading, setLoading] = useState(true)

  const sportTeams = (teams || []).filter(t => t.sport === sportKey)
  const gradient = SPORT_GRADIENT[sportKey] || 'from-navy-700 to-navy-900'
  const emoji = SPORT_EMOJI[sportKey] || '🏅'

  useEffect(() => {
    const today = format(new Date(), 'yyyy-MM-dd')
    const future = new Date()
    future.setDate(future.getDate() + 60)
    const to = format(future, 'yyyy-MM-dd')

    Promise.all([
      api.get(`/pupils/me/schedule?from=${today}&to=${to}`).catch(() => ({ data: [] })),
      api.get('/pupils/me/development').catch(() => ({ data: [] })),
    ]).then(([scheduleRes, devRes]) => {
      // Filter events for this sport
      setEvents(
        (scheduleRes.data || [])
          .filter(e => (e.extra?.sport || '').toLowerCase() === sportKey.toLowerCase())
          .slice(0, 5)
      )
      // Filter feedback for this sport
      setFeedback(
        (devRes.data || [])
          .filter(o => (o.sport || '').toLowerCase() === sportKey.toLowerCase())
          .slice(0, 5)
      )
      setLoading(false)
    })
  }, [sportKey])

  if (loading) {
    return (
      <div className="p-4 space-y-3">
        <div className="h-24 bg-navy-800 rounded-2xl animate-pulse" />
        <div className="h-16 bg-navy-800 rounded-xl animate-pulse" />
        <div className="h-16 bg-navy-800 rounded-xl animate-pulse" />
      </div>
    )
  }

  return (
    <div className="pb-4">
      {/* Sport identity header */}
      <div className={`bg-gradient-to-br ${gradient} px-4 pt-3 pb-6 relative overflow-hidden`}>
        <span className="absolute -right-6 -bottom-6 text-[120px] opacity-[0.06] leading-none select-none">{emoji}</span>
        <button
          onClick={() => navigate('/pupil-lounge/sports')}
          className="relative flex items-center gap-1 text-white/60 hover:text-white text-[11px] mb-3 transition-colors"
        >
          <ArrowLeft size={13} />
          Sports
        </button>
        <div className="relative flex items-center gap-3">
          <span className="text-4xl">{emoji}</span>
          <div>
            <h1 className="text-[22px] font-bold text-white capitalize leading-tight">{sportKey}</h1>
            {sportTeams.length > 0 && (
              <p className="text-white/50 text-[11px] mt-0.5">
                {sportTeams.map(t => t.name).join(' \u00B7 ')}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Upcoming events */}
      <div className="px-4 mt-4">
        <h2 className="text-xs font-semibold text-navy-400 uppercase tracking-wide mb-2">
          <Calendar size={12} className="inline mr-1 -mt-0.5" />
          Upcoming
        </h2>
        {events.length === 0 ? (
          <p className="text-xs text-navy-600 italic">No upcoming events for {sportKey}</p>
        ) : (
          <div className="space-y-2">
            {events.map(e => {
              const extra = e.extra || {}
              const eventDate = e.date ? new Date(e.date + 'T00:00:00') : null
              return (
                <div key={e.id} className="bg-navy-900/60 border border-navy-800/50 rounded-xl px-3 py-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-white font-medium">
                      {e.type === 'fixture' ? `vs ${e.title}` : e.title}
                    </span>
                    <span className="text-[10px] text-navy-500 capitalize">{e.type}</span>
                  </div>
                  {eventDate && (
                    <p className="text-[10px] text-navy-500 mt-0.5">
                      {format(eventDate, 'EEE d MMM')}
                      {e.start_time ? ` at ${e.start_time.slice(0, 5)}` : ''}
                      {extra.team_name ? ` - ${extra.team_name}` : ''}
                    </p>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Teacher feedback for this sport */}
      <div className="px-4 mt-5">
        <h2 className="text-xs font-semibold text-navy-400 uppercase tracking-wide mb-2">
          <MessageSquare size={12} className="inline mr-1 -mt-0.5" />
          Teacher Feedback
        </h2>
        {feedback.length === 0 ? (
          <p className="text-xs text-navy-600 italic">No feedback for {sportKey} yet</p>
        ) : (
          <div className="space-y-2">
            {feedback.map(obs => (
              <div key={obs.id} className="bg-navy-900/60 border border-navy-800/50 rounded-xl px-3 py-2.5">
                <p className="text-sm text-white leading-relaxed line-clamp-3">{obs.content}</p>
                <p className="text-[10px] text-navy-500 mt-1.5">
                  {obs.observer_name} - {formatDistanceToNow(new Date(obs.created_at), { addSuffix: true })}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
