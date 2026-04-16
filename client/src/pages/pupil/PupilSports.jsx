import { useState, useEffect } from 'react'
import { Home } from 'lucide-react'
import { api } from '../../services/api'

const SPORT_EMOJI = {
  football: '⚽',
  rugby: '🏉',
  cricket: '🏏',
  hockey: '🏑',
  netball: '🤾',
  athletics: '🏃',
  swimming: '🏊',
  tennis: '🎾',
  basketball: '🏀',
  rounders: '🥎',
}

const SPORT_GRADIENT = {
  football: 'from-green-700 to-emerald-900',
  rugby: 'from-amber-700 to-orange-900',
  cricket: 'from-sky-700 to-blue-900',
  hockey: 'from-purple-700 to-violet-900',
  netball: 'from-pink-700 to-rose-900',
  athletics: 'from-yellow-700 to-amber-900',
  swimming: 'from-cyan-700 to-teal-900',
  tennis: 'from-lime-700 to-green-900',
  basketball: 'from-orange-700 to-red-900',
}

export default function PupilSports() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/pupils/me')
      .then(r => setData(r.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="p-6 max-w-5xl mx-auto">
        <div className="mb-8">
          <div className="h-8 w-40 bg-navy-800 rounded animate-pulse mb-2" />
          <div className="h-4 w-64 bg-navy-800 rounded animate-pulse" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2].map(i => <div key={i} className="h-32 bg-navy-800 rounded-xl animate-pulse" />)}
        </div>
      </div>
    )
  }

  const { sports = [], teams = [], teachingGroups = [] } = data || {}

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">My Sports</h1>
        <p className="text-navy-400 mt-1">Everything you play, all in one place</p>
      </div>

      {sports.length === 0 ? (
        <div className="bg-navy-900 rounded-xl border border-navy-800 p-12 text-center">
          <div className="w-16 h-16 rounded-full bg-navy-800 flex items-center justify-center mx-auto mb-4">
            <Home className="w-8 h-8 text-navy-500" />
          </div>
          <h3 className="text-lg font-semibold text-white mb-2">Welcome to your portal</h3>
          <p className="text-navy-400 text-sm max-w-md mx-auto">
            Once your teachers add you to classes and teams, you will see each sport you play here.
            Tap a sport to see your schedule, assessments, and development for that activity.
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
            {sports.map(sport => {
              const sportTeams = teams.filter(t => t.sport === sport)
              return (
                <div
                  key={sport}
                  className={`rounded-xl bg-gradient-to-br ${SPORT_GRADIENT[sport] || 'from-navy-700 to-navy-900'} p-5 border border-white/10`}
                >
                  <div className="text-3xl mb-3">{SPORT_EMOJI[sport] || '🏅'}</div>
                  <h3 className="text-white font-semibold text-lg capitalize">{sport}</h3>
                  {sportTeams.length > 0 && (
                    <p className="text-white/60 text-sm mt-1">{sportTeams.map(t => t.name).join(' · ')}</p>
                  )}
                </div>
              )
            })}
          </div>

          {teachingGroups.length > 0 && (
            <div>
              <h2 className="text-white font-semibold mb-3 text-sm uppercase tracking-wide text-navy-400">My Classes</h2>
              <div className="space-y-2">
                {teachingGroups.map(g => (
                  <div
                    key={g.id}
                    className="bg-navy-900 border border-navy-800 rounded-lg px-4 py-3 flex items-center justify-between"
                  >
                    <span className="text-white text-sm">{g.name}</span>
                    <span className="text-navy-500 text-xs">{g.key_stage}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
