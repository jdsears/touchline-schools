import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Calendar, MessageSquare, Layout } from 'lucide-react'
import { format, formatDistanceToNow } from 'date-fns'
import { usePupilProfile } from '../../hooks/usePupilProfile'
import api from '../../services/api'
import { PITCH_BACKGROUNDS, PITCH_ASPECT_RATIOS } from '../../components/tactics/pitches/PitchRenderer'
import FootballPitch from '../../components/tactics/pitches/FootballPitch'
import RugbyPitch from '../../components/tactics/pitches/RugbyPitch'
import HockeyPitch from '../../components/tactics/pitches/HockeyPitch'
import NetballCourt from '../../components/tactics/pitches/NetballCourt'
import CricketField from '../../components/tactics/pitches/CricketField'

const PITCH_COMPONENTS = { football: FootballPitch, rugby: RugbyPitch, hockey: HockeyPitch, netball: NetballCourt, cricket: CricketField }

function MiniPitchView({ team, myPupilId }) {
  const sport = team?.sport || 'football'
  const PitchMarkings = PITCH_COMPONENTS[sport] || FootballPitch
  const bg = PITCH_BACKGROUNDS[sport] || PITCH_BACKGROUNDS.football
  const aspect = PITCH_ASPECT_RATIOS[sport] || '3/4'
  const positions = team?.positions || []
  const formation = team?.formation || ''

  if (!positions.length) return null

  return (
    <div className="mt-4 px-4">
      <h2 className="text-xs font-semibold text-navy-400 uppercase tracking-wide mb-2 flex items-center gap-1">
        <Layout size={12} className="-mt-0.5" />
        Team Formation {formation && <span className="ml-1 text-navy-300">· {formation}</span>}
      </h2>
      <div className="relative rounded-xl overflow-hidden shadow-lg" style={{ background: bg, aspectRatio: aspect }}>
        <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: `repeating-linear-gradient(0deg, rgba(255,255,255,0.03) 0px, rgba(255,255,255,0.03) 24px, transparent 24px, transparent 48px)`, backgroundSize: '100% 48px' }} />
        <PitchMarkings teamFormat={team?.team_format || 11} />
        {positions.map(pos => {
          const isMe = pos.pupilId && String(pos.pupilId) === String(myPupilId)
          return (
            <div
              key={pos.id}
              className="absolute flex flex-col items-center"
              style={{ left: `${pos.x}%`, top: `${pos.y}%`, transform: 'translate(-50%, -50%)' }}
            >
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[9px] font-bold shadow-md ${isMe ? 'bg-yellow-400 text-navy-900 ring-2 ring-white' : 'bg-white/90 text-navy-700'}`}>
                {pos.label?.charAt(0) || '?'}
              </div>
              <span className={`mt-0.5 text-[7px] font-medium px-1 rounded ${isMe ? 'text-yellow-300' : 'text-white/70'}`}>{pos.label}</span>
            </div>
          )
        })}
      </div>
      {team?.game_model?.style && (
        <p className="text-[10px] text-navy-500 mt-1.5 text-center italic">{team.game_model.style}</p>
      )}
    </div>
  )
}

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
  const { teams, pupil } = usePupilProfile()
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

      {/* Team formation view */}
      {sportTeams.map(team => (
        <MiniPitchView key={team.id} team={team} myPupilId={pupil?.id} />
      ))}

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
