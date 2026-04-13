import { useState, useEffect, useMemo } from 'react'
import { useTeam } from '../context/TeamContext'
import { useAuth } from '../context/AuthContext'
import { seasonDevelopmentService } from '../services/api'
import { TrendingUp, TrendingDown, Minus, Trophy, Dumbbell, Star, Brain, ChevronDown, ChevronUp, Sparkles, Loader2, ArrowUpRight, Users, Target, Flame, Shield } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'

const EFFORT_LABELS = ['', 'Low', 'Fair', 'Good', 'High', 'Outstanding']

function ratingToColor(score) {
  if (score >= 30) return 'text-pitch-400'
  if (score >= 10) return 'text-pitch-500'
  if (score > -10) return 'text-navy-400'
  if (score > -30) return 'text-energy-400'
  return 'text-alert-400'
}

function ImprovementBadge({ score }) {
  if (score === null || score === undefined) return <span className="text-xs text-navy-600">No data</span>
  const color = ratingToColor(score)
  const Icon = score > 5 ? TrendingUp : score < -5 ? TrendingDown : Minus
  return (
    <span className={`flex items-center gap-1 text-sm font-medium ${color}`}>
      <Icon className="w-3.5 h-3.5" />
      {score > 0 ? '+' : ''}{score}
    </span>
  )
}

function EffortStars({ rating, size = 'sm' }) {
  if (!rating) return <span className="text-xs text-navy-600">-</span>
  const stars = Math.round(rating)
  const sz = size === 'sm' ? 'w-3 h-3' : 'w-4 h-4'
  return (
    <div className="flex gap-0.5" title={`${rating.toFixed(1)} avg effort`}>
      {[1,2,3,4,5].map(i => (
        <span key={i} className={i <= stars ? 'text-energy-400' : 'text-navy-700'}>
          <Flame className={sz} />
        </span>
      ))}
    </div>
  )
}

function StatCard({ icon: Icon, label, value, sub, color = 'text-pitch-400' }) {
  return (
    <div className="bg-navy-900 border border-navy-800 rounded-xl p-4">
      <div className="flex items-center gap-2 mb-2">
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center bg-navy-800 ${color}`}>
          <Icon className="w-4 h-4" />
        </div>
        <span className="text-xs text-navy-400">{label}</span>
      </div>
      <div className="text-xl font-bold text-white">{value}</div>
      {sub && <div className="text-xs text-navy-500 mt-0.5">{sub}</div>}
    </div>
  )
}

export default function SeasonDevelopment() {
  const { team, players } = useTeam()
  const { user } = useAuth()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [sortBy, setSortBy] = useState('improvement')
  const [sortDir, setSortDir] = useState('desc')
  const [expandedPlayer, setExpandedPlayer] = useState(null)
  const [aiReview, setAiReview] = useState(null)
  const [generatingReview, setGeneratingReview] = useState(false)

  useEffect(() => {
    if (team?.id) loadDashboard()
  }, [team?.id])

  async function loadDashboard() {
    setLoading(true)
    try {
      const res = await seasonDevelopmentService.getDashboard(team.id)
      setData(res.data)
    } catch (err) {
      toast.error('Failed to load season development data')
    } finally {
      setLoading(false)
    }
  }

  async function handleGenerateReview() {
    setGeneratingReview(true)
    try {
      const res = await seasonDevelopmentService.generateSeasonReview(team.id, {
        players: data.players,
        summary: data.summary,
      })
      setAiReview(res.data)
    } catch (err) {
      if (err.response?.status === 429) {
        toast.error('AI usage limit reached for this month')
      } else {
        toast.error('Failed to generate season review')
      }
    } finally {
      setGeneratingReview(false)
    }
  }

  const sortedPlayers = useMemo(() => {
    if (!data?.players) return []
    const list = [...data.players]
    list.sort((a, b) => {
      let aVal, bVal
      switch (sortBy) {
        case 'improvement':
          aVal = a.development?.improvement_score ?? -999
          bVal = b.development?.improvement_score ?? -999
          break
        case 'effort':
          aVal = a.training?.avg_effort ?? 0
          bVal = b.training?.avg_effort ?? 0
          break
        case 'attendance':
          aVal = a.training?.attendance_rate ?? 0
          bVal = b.training?.attendance_rate ?? 0
          break
        case 'observations':
          aVal = a.observations?.total ?? 0
          bVal = b.observations?.total ?? 0
          break
        case 'name':
          return sortDir === 'asc' ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name)
        default:
          aVal = 0; bVal = 0
      }
      return sortDir === 'desc' ? bVal - aVal : aVal - bVal
    })
    return list
  }, [data?.players, sortBy, sortDir])

  function toggleSort(col) {
    if (sortBy === col) {
      setSortDir(d => d === 'desc' ? 'asc' : 'desc')
    } else {
      setSortBy(col)
      setSortDir('desc')
    }
  }

  function SortHeader({ col, children, className = '' }) {
    const active = sortBy === col
    return (
      <button
        onClick={() => toggleSort(col)}
        className={`flex items-center gap-1 text-xs font-medium transition ${active ? 'text-pitch-400' : 'text-navy-400 hover:text-navy-300'} ${className}`}
      >
        {children}
        {active && (sortDir === 'desc' ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />)}
      </button>
    )
  }

  if (loading) {
    return (
      <div className="p-4 sm:p-6 max-w-6xl mx-auto">
        <div className="h-8 w-60 bg-navy-800 rounded animate-pulse mb-6" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          {[1,2,3,4].map(i => <div key={i} className="h-24 bg-navy-900 rounded-xl animate-pulse" />)}
        </div>
        <div className="h-96 bg-navy-900 rounded-xl animate-pulse" />
      </div>
    )
  }

  if (!data) {
    return (
      <div className="p-4 sm:p-6 max-w-6xl mx-auto text-center py-20">
        <TrendingUp className="w-12 h-12 mx-auto mb-4 text-navy-600" />
        <h2 className="text-xl font-bold text-white mb-2">No development data yet</h2>
        <p className="text-navy-400 text-sm">Start recording training attendance, match observations, and player analyses to see development insights here.</p>
      </div>
    )
  }

  const summary = data.squad_summary || {}

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-pitch-600/10 text-pitch-400">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Season Development</h1>
            <p className="text-navy-400 text-sm mt-0.5">Track player growth, effort and breakthrough potential</p>
          </div>
        </div>
        <button
          onClick={handleGenerateReview}
          disabled={generatingReview}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-pitch-600 to-pitch-500 hover:from-pitch-500 hover:to-pitch-400 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition"
        >
          {generatingReview ? (
            <><Loader2 className="w-4 h-4 animate-spin" /> Generating...</>
          ) : (
            <><Sparkles className="w-4 h-4" /> AI Season Review</>
          )}
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard
          icon={Users}
          label="Squad Size"
          value={summary.total || 0}
          sub={`${summary.with_snapshots || 0} with attribute data`}
        />
        <StatCard
          icon={Dumbbell}
          label="Avg Attendance"
          value={summary.avg_attendance_rate ? `${Math.round(summary.avg_attendance_rate)}%` : '-'}
          sub={`${summary.total_sessions || 0} sessions this season`}
          color="text-energy-400"
        />
        <StatCard
          icon={Flame}
          label="Avg Effort"
          value={summary.avg_effort ? Number(summary.avg_effort).toFixed(1) : '-'}
          sub={summary.avg_effort ? EFFORT_LABELS[Math.round(Number(summary.avg_effort))] : 'No ratings yet'}
          color="text-energy-400"
        />
        <StatCard
          icon={Trophy}
          label="Achievements"
          value={summary.total_achievements || 0}
          sub={`${summary.total_potm || 0} POTM awards`}
          color="text-caution-400"
        />
      </div>

      {/* AI Season Review */}
      <AnimatePresence>
        {aiReview && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="bg-gradient-to-br from-navy-900 to-navy-900/80 border border-pitch-600/30 rounded-xl p-5"
          >
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="w-5 h-5 text-pitch-400" />
              <h2 className="text-lg font-semibold text-white">AI Season Review</h2>
              {aiReview.squad_development_score && (
                <span className="ml-auto text-sm bg-pitch-600/20 text-pitch-400 px-2 py-0.5 rounded-full">
                  Squad Score: {aiReview.squad_development_score}/100
                </span>
              )}
            </div>

            {aiReview.most_improved && (
              <ReviewSection icon={TrendingUp} title="Most Improved" color="text-pitch-400">
                {aiReview.most_improved}
              </ReviewSection>
            )}
            {aiReview.hardest_trainers && (
              <ReviewSection icon={Flame} title="Hardest Trainers" color="text-energy-400">
                {aiReview.hardest_trainers}
              </ReviewSection>
            )}
            {aiReview.breakthrough_potential && (
              <ReviewSection icon={Star} title="Breakthrough Potential" color="text-caution-400">
                {aiReview.breakthrough_potential}
              </ReviewSection>
            )}
            {aiReview.needs_support && (
              <ReviewSection icon={Shield} title="Needs Extra Support" color="text-alert-400">
                {aiReview.needs_support}
              </ReviewSection>
            )}
            {aiReview.overall_summary && (
              <div className="mt-4 pt-4 border-t border-navy-800">
                <p className="text-sm text-navy-300 leading-relaxed">{aiReview.overall_summary}</p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Player table */}
      <div className="bg-navy-900 border border-navy-800 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-navy-800">
                <th className="text-left px-4 py-3">
                  <SortHeader col="name">Player</SortHeader>
                </th>
                <th className="text-center px-3 py-3">
                  <SortHeader col="improvement" className="justify-center">Improvement</SortHeader>
                </th>
                <th className="text-center px-3 py-3">
                  <SortHeader col="attendance" className="justify-center">Attendance</SortHeader>
                </th>
                <th className="text-center px-3 py-3">
                  <SortHeader col="effort" className="justify-center">Effort</SortHeader>
                </th>
                <th className="text-center px-3 py-3">
                  <SortHeader col="observations" className="justify-center">Observations</SortHeader>
                </th>
                <th className="text-center px-3 py-3">
                  <span className="text-xs text-navy-400">Achievements</span>
                </th>
                <th className="px-3 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {sortedPlayers.map(player => (
                <PlayerRow
                  key={player.id}
                  player={player}
                  expanded={expandedPlayer === player.id}
                  onToggle={() => setExpandedPlayer(expandedPlayer === player.id ? null : player.id)}
                />
              ))}
              {sortedPlayers.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-navy-500">
                    No player data available for this season
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

function PlayerRow({ player, expanded, onToggle }) {
  const training = player.training || {}
  return (
    <>
      <tr
        className="border-b border-navy-800/50 hover:bg-navy-800/20 cursor-pointer transition"
        onClick={onToggle}
      >
        <td className="px-4 py-3">
          <div>
            <span className="text-white font-medium">{player.name}</span>
            {player.position && (
              <span className="ml-2 text-xs text-navy-500">{player.position}</span>
            )}
          </div>
        </td>
        <td className="px-3 py-3 text-center">
          <ImprovementBadge score={player.development?.improvement_score} />
        </td>
        <td className="px-3 py-3 text-center">
          {training.attendance_rate != null ? (
            <span className={`text-sm font-medium ${
              training.attendance_rate >= 80 ? 'text-pitch-400' :
              training.attendance_rate >= 60 ? 'text-energy-400' : 'text-alert-400'
            }`}>
              {Math.round(training.attendance_rate)}%
            </span>
          ) : (
            <span className="text-xs text-navy-600">-</span>
          )}
        </td>
        <td className="px-3 py-3">
          <div className="flex justify-center">
            <EffortStars rating={training.avg_effort} />
          </div>
        </td>
        <td className="px-3 py-3 text-center">
          <span className="text-sm text-navy-300">{player.observations?.total || 0}</span>
        </td>
        <td className="px-3 py-3 text-center">
          <div className="flex items-center justify-center gap-1">
            {(player.match?.potm_awards > 0) && (
              <span className="text-xs bg-caution-500/20 text-caution-400 px-1.5 py-0.5 rounded" title="Player of the Match">
                {player.match.potm_awards} POTM
              </span>
            )}
            {(player.achievements?.list?.length > 0) && (
              <span className="text-xs bg-pitch-600/20 text-pitch-400 px-1.5 py-0.5 rounded">
                {player.achievements.list.length}
              </span>
            )}
            {(!player.match?.potm_awards && !player.achievements?.list?.length) && (
              <span className="text-xs text-navy-600">-</span>
            )}
          </div>
        </td>
        <td className="px-3 py-3">
          <ChevronDown className={`w-4 h-4 text-navy-500 transition-transform ${expanded ? 'rotate-180' : ''}`} />
        </td>
      </tr>
      <AnimatePresence>
        {expanded && (
          <tr>
            <td colSpan={7} className="px-0 py-0">
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <PlayerExpandedDetail player={player} />
              </motion.div>
            </td>
          </tr>
        )}
      </AnimatePresence>
    </>
  )
}

function PlayerExpandedDetail({ player }) {
  const training = player.training || {}
  const observations = player.observations || {}
  const matches = player.match || {}

  return (
    <div className="bg-navy-800/30 px-4 py-4 border-b border-navy-800">
      <div className="grid sm:grid-cols-3 gap-4">
        {/* Training */}
        <div className="space-y-2">
          <h4 className="text-xs font-medium text-navy-400 uppercase tracking-wider">Training</h4>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-navy-400">Sessions attended</span>
              <span className="text-white">{training.sessions_attended || 0} / {training.sessions_total || 0}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-navy-400">Avg effort</span>
              <span className="text-white">{training.avg_effort ? `${training.avg_effort.toFixed(1)} / 5` : '-'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-navy-400">Highest effort</span>
              <span className="text-white">{training.max_effort || '-'}</span>
            </div>
          </div>
        </div>

        {/* Observations & Matches */}
        <div className="space-y-2">
          <h4 className="text-xs font-medium text-navy-400 uppercase tracking-wider">Match Involvement</h4>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-navy-400">Appearances</span>
              <span className="text-white">{matches.appearances || 0}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-navy-400">Starts</span>
              <span className="text-white">{matches.starts || 0}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-navy-400">Observations</span>
              <span className="text-white">{observations.total || 0}</span>
            </div>
            {['technical', 'tactical', 'physical', 'mental'].map(type => (
              observations[type] > 0 && (
                <div key={type} className="flex justify-between">
                  <span className="text-navy-500 capitalize">{type}</span>
                  <span className="text-navy-300">{observations[type]}</span>
                </div>
              )
            ))}
          </div>
        </div>

        {/* Achievements */}
        <div className="space-y-2">
          <h4 className="text-xs font-medium text-navy-400 uppercase tracking-wider">Achievements</h4>
          {player.achievements?.list?.length > 0 ? (
            <div className="space-y-1">
              {player.achievements.list.map((a, i) => (
                <div key={i} className="flex items-center gap-2 text-sm">
                  <Trophy className="w-3 h-3 text-caution-400 shrink-0" />
                  <span className="text-navy-300 truncate">{a.title || a.type}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-navy-600">No achievements recorded</p>
          )}
          {player.match?.potm_awards > 0 && (
            <div className="flex items-center gap-2 text-sm mt-1">
              <Star className="w-3 h-3 text-caution-400" />
              <span className="text-caution-400 font-medium">{player.match.potm_awards}x Player of the Match</span>
            </div>
          )}
        </div>
      </div>

      {/* Development info */}
      {player.development?.has_snapshots && (
        <div className="mt-4 pt-4 border-t border-navy-800">
          <h4 className="text-xs font-medium text-navy-400 uppercase tracking-wider mb-2">Development</h4>
          <div className="flex items-center gap-3 text-sm">
            <span className="text-navy-400">Improvement Score:</span>
            <ImprovementBadge score={player.development.improvement_score} />
            <span className="text-xs text-navy-600">
              ({player.development.snapshot_count} snapshot{player.development.snapshot_count !== 1 ? 's' : ''})
            </span>
          </div>
        </div>
      )}
    </div>
  )
}

function ReviewSection({ icon: Icon, title, color, children }) {
  return (
    <div className="mb-3">
      <div className={`flex items-center gap-2 mb-1 ${color}`}>
        <Icon className="w-4 h-4" />
        <h3 className="text-sm font-semibold">{title}</h3>
      </div>
      <p className="text-sm text-navy-300 leading-relaxed pl-6">{children}</p>
    </div>
  )
}
