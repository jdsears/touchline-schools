import { useState, useEffect } from 'react'
import { Star, AlertTriangle, FileText, TrendingUp } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { api } from '../../services/api'

const OBS_TYPE = {
  praise: {
    Icon: Star,
    color: 'text-yellow-400',
    border: 'border-yellow-500/20',
    bg: 'bg-yellow-500/5',
    label: 'Praise',
  },
  concern: {
    Icon: AlertTriangle,
    color: 'text-red-400',
    border: 'border-red-500/20',
    bg: 'bg-red-500/5',
    label: 'Area to work on',
  },
  development: {
    Icon: TrendingUp,
    color: 'text-green-400',
    border: 'border-green-500/20',
    bg: 'bg-green-500/5',
    label: 'Development',
  },
  note: {
    Icon: FileText,
    color: 'text-blue-400',
    border: 'border-blue-500/20',
    bg: 'bg-blue-500/5',
    label: 'Note',
  },
}

const SPORT_EMOJI = {
  football: '⚽',
  rugby: '🏉',
  cricket: '🏏',
  hockey: '🏑',
  netball: '🤾',
  athletics: '🏃',
  swimming: '🏊',
  tennis: '🎾',
}

export default function PupilDevelopment() {
  const [observations, setObservations] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')

  useEffect(() => {
    api.get('/pupils/me/development')
      .then(r => setObservations(r.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const sports = [...new Set(observations.map(o => o.sport).filter(Boolean))]
  const filtered = filter === 'all' ? observations : observations.filter(o => o.sport === filter)

  if (loading) {
    return (
      <div className="p-6 max-w-3xl mx-auto space-y-3">
        <div className="h-8 w-48 bg-navy-800 rounded animate-pulse mb-6" />
        {[1, 2, 3].map(i => <div key={i} className="h-20 bg-navy-800 rounded-xl animate-pulse" />)}
      </div>
    )
  }

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">My Development</h1>
        <p className="text-navy-400 mt-1">Feedback and observations from your teachers</p>
      </div>

      {observations.length === 0 ? (
        <div className="bg-navy-900 rounded-xl border border-navy-800 p-12 text-center">
          <TrendingUp className="w-10 h-10 text-navy-600 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-white mb-2">No feedback yet</h3>
          <p className="text-navy-400 text-sm">Your teachers' observations will appear here.</p>
        </div>
      ) : (
        <>
          {/* Sport filter pills */}
          {sports.length > 1 && (
            <div className="flex flex-wrap gap-2 mb-5">
              <button
                onClick={() => setFilter('all')}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                  filter === 'all' ? 'bg-white text-navy-900' : 'bg-navy-800 text-navy-300 hover:bg-navy-700'
                }`}
              >
                All ({observations.length})
              </button>
              {sports.map(sport => (
                <button
                  key={sport}
                  onClick={() => setFilter(sport)}
                  className={`px-3 py-1 rounded-full text-xs font-medium capitalize transition-colors ${
                    filter === sport ? 'bg-white text-navy-900' : 'bg-navy-800 text-navy-300 hover:bg-navy-700'
                  }`}
                >
                  {SPORT_EMOJI[sport] || ''} {sport} ({observations.filter(o => o.sport === sport).length})
                </button>
              ))}
            </div>
          )}

          <div className="space-y-3">
            {filtered.map(obs => {
              const cfg = OBS_TYPE[obs.type] || OBS_TYPE.note
              const { Icon } = cfg
              return (
                <div
                  key={obs.id}
                  className={`rounded-xl border p-4 ${cfg.bg} ${cfg.border}`}
                >
                  <div className="flex items-start gap-3">
                    <Icon className={`w-4 h-4 mt-0.5 flex-shrink-0 ${cfg.color}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                        <span className={`text-xs font-semibold ${cfg.color}`}>{cfg.label}</span>
                        {obs.sport && (
                          <span className="text-xs text-navy-400 capitalize">
                            {SPORT_EMOJI[obs.sport] || ''} {obs.sport}
                          </span>
                        )}
                      </div>
                      <p className="text-white text-sm leading-relaxed">{obs.content}</p>
                      <p className="text-navy-500 text-xs mt-2">
                        {obs.observer_name} · {formatDistanceToNow(new Date(obs.created_at), { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
