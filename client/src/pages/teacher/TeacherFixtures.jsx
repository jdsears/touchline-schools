import { useState, useEffect, useMemo } from 'react'
import { teacherService } from '../../services/api'
import { Trophy, Calendar as CalIcon, List, MapPin, ChevronLeft, ChevronRight } from 'lucide-react'
import {
  format, startOfMonth, endOfMonth, eachDayOfInterval, startOfWeek,
  endOfWeek, isSameMonth, isSameDay, addMonths, subMonths, isToday,
} from 'date-fns'

const SPORT_ICONS = {
  football: '\u26BD', rugby: '\uD83C\uDFC9', cricket: '\uD83C\uDFCF',
  hockey: '\uD83C\uDFD1', netball: '\uD83E\uDD3E',
}

function resultBadge(match) {
  if (match.score_for == null && match.goals_for == null) return null
  const gf = parseInt(match.score_for ?? match.goals_for)
  const ga = parseInt(match.score_against ?? match.goals_against)
  if (isNaN(gf) || isNaN(ga)) return null
  if (gf > ga) return { label: 'W', score: `${gf}-${ga}`, color: 'bg-pitch-600/20 text-pitch-400' }
  if (gf < ga) return { label: 'L', score: `${gf}-${ga}`, color: 'bg-alert-600/20 text-alert-400' }
  return { label: 'D', score: `${gf}-${ga}`, color: 'bg-amber-400/20 text-amber-400' }
}

function FixtureRow({ match }) {
  const result = resultBadge(match)
  const dateStr = match.date || match.match_date
  const d = dateStr ? new Date(dateStr) : null
  const isUpcoming = d && d >= new Date()

  return (
    <div className="bg-navy-900 rounded-xl border border-navy-800 p-4 hover:border-navy-600 transition-colors">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-lg bg-navy-800 flex items-center justify-center text-base flex-shrink-0">
            {SPORT_ICONS[match.sport] || <Trophy className="w-4 h-4 text-navy-400" />}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-sm font-medium text-white truncate">{match.team_name}</span>
              <span className="text-navy-600 text-xs">vs</span>
              <span className="text-sm font-medium text-white truncate">{match.opponent || 'TBC'}</span>
            </div>
            <div className="flex items-center gap-2.5 mt-0.5 text-[11px] text-navy-400">
              {d && <span>{format(d, 'EEE d MMM yyyy')}</span>}
              {match.match_time && <span>{match.match_time.slice(0, 5)}</span>}
              <span className="flex items-center gap-0.5">
                <MapPin className="w-2.5 h-2.5" />
                {match.home_away === 'home' ? 'Home' : 'Away'}
              </span>
            </div>
          </div>
        </div>

        {result ? (
          <div className="flex items-center gap-2 flex-shrink-0">
            <span className="text-base font-bold text-white">{result.score}</span>
            <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${result.color}`}>{result.label}</span>
          </div>
        ) : isUpcoming ? (
          <span className="px-2 py-0.5 bg-navy-800 rounded text-[10px] text-navy-400 flex-shrink-0">Upcoming</span>
        ) : null}
      </div>
    </div>
  )
}

function CalendarView({ fixtures, month, setMonth }) {
  const monthStart = startOfMonth(month)
  const monthEnd = endOfMonth(month)
  const calStart = startOfWeek(monthStart, { weekStartsOn: 1 })
  const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 })
  const days = eachDayOfInterval({ start: calStart, end: calEnd })

  const fixturesByDate = useMemo(() => {
    const map = {}
    fixtures.forEach(f => {
      const d = f.date || f.match_date
      if (d) {
        const key = d.split('T')[0]
        if (!map[key]) map[key] = []
        map[key].push(f)
      }
    })
    return map
  }, [fixtures])

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <button onClick={() => setMonth(m => subMonths(m, 1))} className="p-1.5 text-navy-400 hover:text-white"><ChevronLeft size={18} /></button>
        <h2 className="text-sm font-bold text-white">{format(month, 'MMMM yyyy')}</h2>
        <button onClick={() => setMonth(m => addMonths(m, 1))} className="p-1.5 text-navy-400 hover:text-white"><ChevronRight size={18} /></button>
      </div>
      <div className="grid grid-cols-7 gap-px text-center text-[10px] text-navy-500 mb-1">
        {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => <div key={i} className="py-1">{d}</div>)}
      </div>
      <div className="grid grid-cols-7 gap-px">
        {days.map(day => {
          const key = format(day, 'yyyy-MM-dd')
          const dayFixtures = fixturesByDate[key] || []
          const inMonth = isSameMonth(day, month)
          const today = isToday(day)
          return (
            <div
              key={key}
              className={`relative p-1 min-h-[36px] rounded text-center text-[11px] ${
                !inMonth ? 'text-navy-700' : today ? 'text-gold-400 font-bold' : 'text-navy-300'
              }`}
            >
              {format(day, 'd')}
              {dayFixtures.length > 0 && (
                <div className="flex justify-center gap-0.5 mt-0.5">
                  {dayFixtures.slice(0, 3).map((f, i) => (
                    <div key={i} className="w-1.5 h-1.5 rounded-full bg-pitch-500" title={`${f.team_name} vs ${f.opponent}`} />
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default function TeacherFixtures() {
  const [fixtures, setFixtures] = useState([])
  const [teams, setTeams] = useState([])
  const [loading, setLoading] = useState(true)
  const [sportFilter, setSportFilter] = useState('all')
  const [timeFilter, setTimeFilter] = useState('all')
  const [view, setView] = useState('list')
  const [calMonth, setCalMonth] = useState(new Date())

  useEffect(() => {
    Promise.all([
      teacherService.getMyFixtures(),
      teacherService.getMyTeams(),
    ]).then(([fRes, tRes]) => {
      setFixtures(fRes.data)
      setTeams(tRes.data)
    }).catch(err => console.error('Failed to load fixtures:', err))
      .finally(() => setLoading(false))
  }, [])

  const sports = [...new Set(fixtures.map(f => f.sport).filter(Boolean))]

  const filtered = useMemo(() => {
    const now = new Date()
    let list = [...fixtures]
    if (sportFilter !== 'all') list = list.filter(f => f.sport === sportFilter)
    if (timeFilter === 'upcoming') list = list.filter(f => new Date(f.date || f.match_date) >= now)
    if (timeFilter === 'results') list = list.filter(f => f.score_for != null || f.goals_for != null)
    list.sort((a, b) => {
      const da = new Date(a.date || a.match_date)
      const db = new Date(b.date || b.match_date)
      return timeFilter === 'results' ? db - da : da - db
    })
    return list
  }, [fixtures, sportFilter, timeFilter])

  if (loading) {
    return <div className="p-6 flex items-center justify-center min-h-[50vh]"><div className="spinner w-8 h-8" /></div>
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Fixtures & Results</h1>
          <p className="text-navy-400 text-sm mt-0.5">{fixtures.length} matches across {teams.length} teams</p>
        </div>
        <div className="flex items-center gap-1 bg-navy-800 rounded-lg p-0.5">
          <button onClick={() => setView('list')} className={`p-1.5 rounded ${view === 'list' ? 'bg-navy-700 text-white' : 'text-navy-400'}`}><List size={16} /></button>
          <button onClick={() => setView('calendar')} className={`p-1.5 rounded ${view === 'calendar' ? 'bg-navy-700 text-white' : 'text-navy-400'}`}><CalIcon size={16} /></button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2 mb-5">
        {['all', 'upcoming', 'results'].map(f => (
          <button
            key={f}
            onClick={() => setTimeFilter(f)}
            className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors capitalize ${
              timeFilter === f ? 'bg-pitch-600/20 text-pitch-400' : 'bg-navy-800 text-navy-400 hover:text-white'
            }`}
          >
            {f === 'all' ? 'All' : f === 'upcoming' ? 'Upcoming' : 'Results'}
          </button>
        ))}
        {sports.length > 1 && (
          <>
            <div className="w-px h-5 bg-navy-700" />
            {sports.map(sport => (
              <button
                key={sport}
                onClick={() => setSportFilter(sportFilter === sport ? 'all' : sport)}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors capitalize ${
                  sportFilter === sport ? 'bg-pitch-600/20 text-pitch-400' : 'bg-navy-800 text-navy-400 hover:text-white'
                }`}
              >
                {SPORT_ICONS[sport] || ''} {sport}
              </button>
            ))}
          </>
        )}
      </div>

      {view === 'calendar' ? (
        <div className="bg-navy-900 rounded-xl border border-navy-800 p-4">
          <CalendarView fixtures={filtered} month={calMonth} setMonth={setCalMonth} />
        </div>
      ) : filtered.length > 0 ? (
        <div className="space-y-2">
          {filtered.map(match => <FixtureRow key={match.id} match={match} />)}
        </div>
      ) : (
        <div className="bg-navy-900 rounded-xl border border-navy-800 p-12 text-center">
          <Trophy className="w-8 h-8 text-navy-500 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-white mb-1">
            {teams.length === 0 ? 'No teams assigned' : 'No fixtures match your filters'}
          </h3>
          <p className="text-navy-400 text-sm">
            {teams.length === 0 ? 'Once you have teams, fixtures appear here.' : 'Try changing the filter above.'}
          </p>
        </div>
      )}
    </div>
  )
}
