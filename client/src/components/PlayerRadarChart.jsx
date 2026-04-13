import { useState, useMemo } from 'react'
import {
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  Radar, ResponsiveContainer, Legend, Tooltip,
} from 'recharts'
import { Users, X, Search, ChevronDown, Activity } from 'lucide-react'
import { teamService } from '../services/api'

// Map text ratings to numeric values (0-100 scale)
const RATING_MAP = {
  'excellent': 95,
  'very good': 80,
  'good': 65,
  'developing': 45,
  'needs work': 25,
  'not observed': 0,
}

function ratingToNumber(rating) {
  if (!rating) return 0
  return RATING_MAP[rating.toLowerCase()] ?? 0
}

const CATEGORIES = {
  physical: { label: 'Physical', attrs: ['pace', 'stamina', 'strength', 'agility', 'balance'], source: 'physical_attributes' },
  technical: { label: 'Technical', attrs: ['first_touch', 'passing', 'shooting', 'dribbling', 'heading', 'weak_foot'], source: 'technical_skills' },
  tactical: { label: 'Tactical', attrs: ['positioning', 'game_reading', 'movement_off_ball', 'defensive_awareness', 'decision_making'], source: 'tactical_understanding' },
  mental: { label: 'Mental', attrs: ['confidence', 'work_rate', 'communication', 'coachability', 'resilience', 'leadership'], source: 'mental_traits' },
}

// FA's 6 Core Capabilities — used for the overview radar
const CORE_CAPABILITIES = ['scanning', 'timing', 'movement', 'positioning', 'deception', 'techniques']

// Build overview data from the 6 FA core capabilities
function buildSummaryData(player, label) {
  const source = player?.core_capabilities
  return CORE_CAPABILITIES.map(attr => {
    const val = source?.[attr]
    return {
      attribute: attr.charAt(0).toUpperCase() + attr.slice(1),
      [label]: ratingToNumber(val),
      [`${label}_raw`]: val || 'Not Observed',
    }
  })
}

// Build detail data for a single category
function buildCategoryData(player, label, categoryKey) {
  const cat = CATEGORIES[categoryKey]
  if (!cat) return []
  const source = player?.[cat.source]
  return cat.attrs.map(attr => {
    const val = source?.[attr]
    return {
      attribute: attr.replace(/_/g, ' '),
      [label]: ratingToNumber(val),
      [`${label}_raw`]: val || 'Not Observed',
    }
  })
}

const COLORS = ['#2ED573', '#3b82f6', '#f97316', '#a855f7']

// Custom tooltip
function RadarTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-navy-900 border border-navy-700 rounded-lg px-3 py-2 shadow-xl">
      <p className="text-xs text-navy-400 font-medium capitalize mb-1">{label}</p>
      {payload.map((entry, i) => {
        const rawKey = `${entry.name}_raw`
        const rawVal = entry.payload[rawKey]
        return (
          <p key={i} className="text-sm" style={{ color: entry.color }}>
            {entry.name}: <span className="font-semibold">{rawVal}</span>
          </p>
        )
      })}
    </div>
  )
}

const VIEWS = [
  { id: 'all', label: 'Overview' },
  { id: 'physical', label: 'Physical' },
  { id: 'technical', label: 'Technical' },
  { id: 'tactical', label: 'Tactical' },
  { id: 'mental', label: 'Mental' },
]

export default function PlayerRadarChart({ player, teamPlayers }) {
  // Default to overview if core capabilities exist, otherwise first populated detail tab
  const hasCoreCapabilities = player?.core_capabilities && Object.values(player.core_capabilities).some(v => v)
  const defaultView = hasCoreCapabilities ? 'all' : (() => {
    for (const [key, cat] of Object.entries(CATEGORIES)) {
      const source = player?.[cat.source]
      if (source && Object.values(source).some(v => v && ratingToNumber(v) > 0)) return key
    }
    return 'all'
  })()

  const [view, setView] = useState(defaultView)
  const [comparisons, setComparisons] = useState([])
  const [compData, setCompData] = useState({})
  const [showPicker, setShowPicker] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')

  const playerLabel = player.name?.split(' ')[0] || 'Player'

  // Build chart data based on view
  const chartData = useMemo(() => {
    const buildFn = view === 'all' ? buildSummaryData : (p, l) => buildCategoryData(p, l, view)
    let data = buildFn(player, playerLabel)

    for (const comp of comparisons) {
      if (compData[comp.id]) {
        const compLabel = comp.name?.split(' ')[0] || 'Player'
        const compRadar = buildFn(compData[comp.id], compLabel)
        data = data.map((item, i) => ({
          ...item,
          [compLabel]: compRadar[i]?.[compLabel] ?? 0,
          [`${compLabel}_raw`]: compRadar[i]?.[`${compLabel}_raw`] ?? 'Not Observed',
        }))
      }
    }
    return data
  }, [player, playerLabel, view, comparisons, compData])

  // Fetch comparison player data
  async function addComparison(compPlayer) {
    if (comparisons.length >= 3) return
    if (comparisons.find(c => c.id === compPlayer.id)) return
    if (compPlayer.id === player.id) return

    setComparisons(prev => [...prev, compPlayer])
    setShowPicker(false)
    setSearchTerm('')

    if (!compData[compPlayer.id]) {
      try {
        const res = await teamService.getPlayer(compPlayer.id)
        setCompData(prev => ({ ...prev, [compPlayer.id]: res.data }))
      } catch {
        setComparisons(prev => prev.filter(c => c.id !== compPlayer.id))
      }
    }
  }

  function removeComparison(playerId) {
    setComparisons(prev => prev.filter(c => c.id !== playerId))
  }

  // Available players for comparison
  const availablePlayers = useMemo(() => {
    const selectedIds = new Set([player.id, ...comparisons.map(c => c.id)])
    let filtered = (teamPlayers || []).filter(p => !selectedIds.has(p.id) && (p.is_active !== false))
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      filtered = filtered.filter(p => p.name?.toLowerCase().includes(term))
    }
    return filtered
  }, [teamPlayers, player.id, comparisons, searchTerm])

  // Check if any attributes exist (core capabilities OR detail attributes)
  const hasAttributes = useMemo(() => {
    const summary = buildSummaryData(player, playerLabel)
    if (summary.some(d => d[playerLabel] > 0)) return true
    // Also check detail categories for pre-existing data
    return Object.values(CATEGORIES).some(cat => {
      const source = player?.[cat.source]
      return source && Object.values(source).some(v => v && ratingToNumber(v) > 0)
    })
  }, [player, playerLabel])

  if (!hasAttributes) {
    return (
      <div className="card p-6 text-center">
        <div className="w-16 h-16 rounded-2xl bg-navy-800 flex items-center justify-center mx-auto mb-4">
          <Activity className="w-8 h-8 text-navy-500" />
        </div>
        <p className="text-navy-400">No attributes analyzed yet.</p>
        <p className="text-sm text-navy-500 mt-1">Use "Analyze Attributes with AI" below to generate ratings from observations.</p>
      </div>
    )
  }

  return (
    <div className="card p-6">
      {/* Header with view toggle */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
        <h2 className="font-display font-semibold text-white text-lg">Player Attributes</h2>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex bg-navy-800 rounded-lg p-0.5">
            {VIEWS.map(v => (
              <button
                key={v.id}
                onClick={() => setView(v.id)}
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                  view === v.id
                    ? 'bg-pitch-500 text-white'
                    : 'text-navy-400 hover:text-navy-200'
                }`}
              >
                {v.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Comparison bar */}
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        {comparisons.map((comp, i) => (
          <span
            key={comp.id}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium"
            style={{ backgroundColor: `${COLORS[i + 1]}20`, color: COLORS[i + 1] }}
          >
            {comp.name?.split(' ')[0]}
            <button
              onClick={() => removeComparison(comp.id)}
              className="hover:opacity-70"
            >
              <X className="w-3 h-3" />
            </button>
          </span>
        ))}
        {comparisons.length < 3 && (
          <div className="relative">
            <button
              onClick={() => setShowPicker(!showPicker)}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-navy-800 text-navy-400 hover:text-navy-200 hover:bg-navy-700 transition-colors"
            >
              <Users className="w-3 h-3" />
              Compare Player
              <ChevronDown className="w-3 h-3" />
            </button>
            {showPicker && (
              <div className="absolute top-full mt-1 left-0 z-50 bg-navy-900 border border-navy-700 rounded-xl shadow-2xl w-64 overflow-hidden">
                <div className="p-2 border-b border-navy-700">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-navy-500" />
                    <input
                      type="text"
                      value={searchTerm}
                      onChange={e => setSearchTerm(e.target.value)}
                      placeholder="Search players..."
                      className="w-full pl-8 pr-3 py-1.5 text-sm bg-navy-800 border border-navy-700 rounded-lg text-white placeholder:text-navy-500 focus:outline-none focus:border-pitch-500"
                      autoFocus
                    />
                  </div>
                </div>
                <div className="max-h-48 overflow-y-auto">
                  {availablePlayers.length === 0 ? (
                    <p className="text-xs text-navy-500 p-3 text-center">No players found</p>
                  ) : (
                    availablePlayers.map(p => (
                      <button
                        key={p.id}
                        onClick={() => addComparison(p)}
                        className="w-full text-left px-3 py-2 text-sm text-navy-200 hover:bg-navy-800 transition-colors flex items-center gap-2"
                      >
                        <div className="w-6 h-6 rounded-full bg-navy-700 flex items-center justify-center text-xs font-medium text-navy-300">
                          {p.name?.charAt(0)}
                        </div>
                        <span>{p.name}</span>
                        {p.squad_number && <span className="text-navy-500 text-xs ml-auto">#{p.squad_number}</span>}
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Radar Chart */}
      <ResponsiveContainer width="100%" height={view === 'all' ? 350 : 380}>
        <RadarChart data={chartData} cx="50%" cy="50%" outerRadius="80%">
          <PolarGrid stroke="#334155" strokeDasharray="3 3" />
          <PolarAngleAxis
            dataKey="attribute"
            tick={{ fill: '#94a3b8', fontSize: view === 'all' ? 13 : 11 }}
            className="capitalize"
          />
          <PolarRadiusAxis
            angle={90}
            domain={[0, 100]}
            tick={false}
            axisLine={false}
          />
          <Radar
            name={playerLabel}
            dataKey={playerLabel}
            stroke={COLORS[0]}
            fill={COLORS[0]}
            fillOpacity={comparisons.length > 0 ? 0.15 : 0.25}
            strokeWidth={2}
          />
          {comparisons.map((comp, i) => {
            const label = comp.name?.split(' ')[0] || 'Player'
            return (
              <Radar
                key={comp.id}
                name={label}
                dataKey={label}
                stroke={COLORS[i + 1]}
                fill={COLORS[i + 1]}
                fillOpacity={0.1}
                strokeWidth={2}
              />
            )
          })}
          <Tooltip content={<RadarTooltip />} />
          {comparisons.length > 0 && (
            <Legend
              wrapperStyle={{ fontSize: 12, color: '#94a3b8' }}
            />
          )}
        </RadarChart>
      </ResponsiveContainer>
    </div>
  )
}
