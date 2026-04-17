import { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { teacherService } from '../../services/api'
import { Trophy, Calendar as CalIcon, List, MapPin, ChevronLeft, ChevronRight, X, Clock, Shirt } from 'lucide-react'
import { format, startOfMonth, endOfMonth, eachDayOfInterval, startOfWeek, endOfWeek, isSameMonth, isSameDay, addMonths, subMonths, isToday, isWeekend } from 'date-fns'

const SPORT_ICONS = { football: '\u26BD', rugby: '\uD83C\uDFC9', cricket: '\uD83C\uDFCF', hockey: '\uD83C\uDFD1', netball: '\uD83E\uDD3E' }
const SPORT_DOT = { football: 'bg-navy-300', rugby: 'bg-amber-500', cricket: 'bg-emerald-500', hockey: 'bg-sky-500', netball: 'bg-purple-500' }

function resultBadge(m) {
  const gf = parseInt(m.score_for ?? m.goals_for)
  const ga = parseInt(m.score_against ?? m.goals_against)
  if (isNaN(gf) || isNaN(ga)) return null
  const w = gf > ga ? 'W' : gf < ga ? 'L' : 'D'
  const c = { W: 'bg-pitch-600/20 text-pitch-400', L: 'bg-alert-600/20 text-alert-400', D: 'bg-amber-400/20 text-amber-400' }
  return { label: w, score: `${gf}-${ga}`, color: c[w] }
}

function FixtureCard({ match, compact }) {
  const result = resultBadge(match)
  const d = match.date || match.match_date
  return (
    <Link to={`/matches/${match.id}`} className={`block bg-navy-900 rounded-xl border border-navy-800 ${compact ? 'p-3' : 'p-4'} hover:border-navy-600 transition-colors`}>
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-lg bg-navy-800 flex items-center justify-center text-base shrink-0">
            {SPORT_ICONS[match.sport] || <Trophy className="w-4 h-4 text-navy-400" />}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-sm font-medium text-white truncate">{match.team_name}</span>
              <span className="text-navy-600 text-xs">vs</span>
              <span className="text-sm font-medium text-white truncate">{match.opponent || 'TBC'}</span>
            </div>
            <div className="flex items-center gap-2 mt-0.5 text-[11px] text-navy-400 flex-wrap">
              {!compact && d && <span>{format(new Date(d), 'EEE d MMM')}</span>}
              {match.match_time && <span className="flex items-center gap-0.5"><Clock className="w-2.5 h-2.5" />{match.match_time.slice(0, 5)}</span>}
              <span className="flex items-center gap-0.5"><MapPin className="w-2.5 h-2.5" />{match.home_away === 'home' ? 'Home' : 'Away'}</span>
              {match.kit_type && <span className="flex items-center gap-0.5"><Shirt className="w-2.5 h-2.5" />{match.kit_type}</span>}
            </div>
          </div>
        </div>
        {result ? (
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-base font-bold text-white">{result.score}</span>
            <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${result.color}`}>{result.label}</span>
          </div>
        ) : (
          <span className="px-2 py-0.5 bg-navy-800 rounded text-[10px] text-navy-400 shrink-0">Upcoming</span>
        )}
      </div>
    </Link>
  )
}

function CalendarView({ fixtures, month, setMonth, selectedDate, onSelectDate }) {
  const calStart = startOfWeek(startOfMonth(month), { weekStartsOn: 1 })
  const calEnd = endOfWeek(endOfMonth(month), { weekStartsOn: 1 })
  const days = eachDayOfInterval({ start: calStart, end: calEnd })

  const byDate = useMemo(() => {
    const m = {}
    fixtures.forEach(f => { const k = (f.date || f.match_date)?.split('T')[0]; if (k) { if (!m[k]) m[k] = []; m[k].push(f) } })
    return m
  }, [fixtures])

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <button onClick={() => setMonth(m => subMonths(m, 1))} className="p-1.5 text-navy-400 hover:text-white"><ChevronLeft size={18} /></button>
        <h2 className="text-sm font-bold text-white">{format(month, 'MMMM yyyy')}</h2>
        <button onClick={() => setMonth(m => addMonths(m, 1))} className="p-1.5 text-navy-400 hover:text-white"><ChevronRight size={18} /></button>
      </div>
      <div className="grid grid-cols-7 gap-px text-center text-[10px] text-navy-500 mb-1">
        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(d => <div key={d} className="py-1">{d}</div>)}
      </div>
      <div className="grid grid-cols-7 gap-px">
        {days.map(day => {
          const key = format(day, 'yyyy-MM-dd')
          const df = byDate[key] || []
          const inMonth = isSameMonth(day, month)
          const isT = isToday(day)
          const isWe = isWeekend(day)
          const isSel = selectedDate && isSameDay(day, selectedDate)
          return (
            <button
              key={key}
              onClick={() => onSelectDate(df.length > 0 ? day : null)}
              className={`relative p-1.5 min-h-[44px] rounded-lg text-center text-xs transition-colors ${
                !inMonth ? 'text-navy-700' : isWe ? 'bg-navy-800/30 text-navy-400' : 'text-navy-300 hover:bg-navy-800/50'
              } ${isSel ? 'ring-1 ring-pitch-500' : ''}`}
            >
              <span className={isT ? 'w-6 h-6 inline-flex items-center justify-center rounded-full ring-2 ring-amber-400/60 text-amber-400 font-bold' : ''}>
                {format(day, 'd')}
              </span>
              {df.length > 0 && (
                <div className="flex justify-center gap-0.5 mt-1">
                  {df.slice(0, 3).map((f, i) => (
                    <div key={i} className={`w-1.5 h-1.5 rounded-full ${SPORT_DOT[f.sport] || 'bg-pitch-500'}`} title={`${f.team_name} vs ${f.opponent}`} />
                  ))}
                  {df.length > 3 && <span className="text-[8px] text-navy-500">+{df.length - 3}</span>}
                </div>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}

function DayPanel({ date, fixtures, onClose }) {
  const dayFixtures = fixtures.filter(f => {
    const d = (f.date || f.match_date)?.split('T')[0]
    return d === format(date, 'yyyy-MM-dd')
  })
  return (
    <div className="bg-navy-900 rounded-xl border border-navy-800 p-4 mt-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-bold text-white">{format(date, 'EEEE d MMMM yyyy')}</h3>
        <button onClick={onClose} className="p-1 text-navy-400 hover:text-white"><X size={16} /></button>
      </div>
      {dayFixtures.length === 0 ? (
        <p className="text-navy-500 text-sm py-2">No fixtures on this day</p>
      ) : (
        <div className="space-y-2">
          {dayFixtures.map(f => <FixtureCard key={f.id} match={f} compact />)}
        </div>
      )}
    </div>
  )
}

export default function TeacherFixtures() {
  const [fixtures, setFixtures] = useState([])
  const [teams, setTeams] = useState([])
  const [loading, setLoading] = useState(true)
  const [sportFilter, setSportFilter] = useState('all')
  const [timeFilter, setTimeFilter] = useState('all')
  const [venueFilter, setVenueFilter] = useState('all')
  const [view, setView] = useState('list')
  const [calMonth, setCalMonth] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState(null)

  useEffect(() => {
    Promise.all([teacherService.getMyFixtures(), teacherService.getMyTeams()])
      .then(([f, t]) => { setFixtures(f.data); setTeams(t.data) })
      .catch(err => console.error('Failed to load fixtures:', err))
      .finally(() => setLoading(false))
  }, [])

  const sports = [...new Set(fixtures.map(f => f.sport).filter(Boolean))]

  const filtered = useMemo(() => {
    const now = new Date()
    let list = [...fixtures]
    if (sportFilter !== 'all') list = list.filter(f => f.sport === sportFilter)
    if (venueFilter !== 'all') list = list.filter(f => f.home_away === venueFilter)
    if (timeFilter === 'upcoming') list = list.filter(f => new Date(f.date || f.match_date) >= now)
    if (timeFilter === 'results') list = list.filter(f => f.score_for != null || f.goals_for != null)
    list.sort((a, b) => {
      const da = new Date(a.date || a.match_date), db = new Date(b.date || b.match_date)
      return timeFilter === 'results' ? db - da : da - db
    })
    return list
  }, [fixtures, sportFilter, timeFilter, venueFilter])

  if (loading) return <div className="p-6 flex items-center justify-center min-h-[50vh]"><div className="spinner w-8 h-8" /></div>

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-white">Fixtures & Results</h1>
          <p className="text-navy-400 text-sm mt-0.5">{fixtures.length} matches across {teams.length} team{teams.length !== 1 ? 's' : ''}</p>
        </div>
        <div className="flex items-center gap-1 bg-navy-800 rounded-lg p-0.5">
          <button onClick={() => setView('list')} className={`p-1.5 rounded ${view === 'list' ? 'bg-navy-700 text-white' : 'text-navy-400'}`}><List size={16} /></button>
          <button onClick={() => setView('calendar')} className={`p-1.5 rounded ${view === 'calendar' ? 'bg-navy-700 text-white' : 'text-navy-400'}`}><CalIcon size={16} /></button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2 mb-5">
        {['all', 'upcoming', 'results'].map(f => (
          <button key={f} onClick={() => setTimeFilter(f)} className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors capitalize ${timeFilter === f ? 'bg-pitch-600/20 text-pitch-400' : 'bg-navy-800 text-navy-400 hover:text-white'}`}>
            {f === 'all' ? 'All' : f}
          </button>
        ))}
        <div className="w-px h-5 bg-navy-700" />
        {['all', 'home', 'away'].map(v => (
          <button key={v} onClick={() => setVenueFilter(v)} className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors capitalize ${venueFilter === v ? 'bg-amber-500/20 text-amber-400' : 'bg-navy-800 text-navy-400 hover:text-white'}`}>
            {v === 'all' ? 'H/A' : v}
          </button>
        ))}
        {sports.length > 1 && (
          <>
            <div className="w-px h-5 bg-navy-700" />
            {sports.map(s => (
              <button key={s} onClick={() => setSportFilter(sportFilter === s ? 'all' : s)} className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors capitalize ${sportFilter === s ? 'bg-pitch-600/20 text-pitch-400' : 'bg-navy-800 text-navy-400 hover:text-white'}`}>
                {SPORT_ICONS[s] || ''} {s}
              </button>
            ))}
          </>
        )}
      </div>

      {view === 'calendar' ? (
        <>
          <div className="bg-navy-900 rounded-xl border border-navy-800 p-4">
            <CalendarView fixtures={filtered} month={calMonth} setMonth={setCalMonth} selectedDate={selectedDate} onSelectDate={setSelectedDate} />
          </div>
          {selectedDate && <DayPanel date={selectedDate} fixtures={filtered} onClose={() => setSelectedDate(null)} />}
        </>
      ) : filtered.length > 0 ? (
        <div className="space-y-2">
          {filtered.map(m => <FixtureCard key={m.id} match={m} />)}
        </div>
      ) : (
        <div className="bg-navy-900 rounded-xl border border-navy-800 p-12 text-center">
          <Trophy className="w-8 h-8 text-navy-500 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-white mb-1">{teams.length === 0 ? 'No teams assigned' : 'No fixtures match your filters'}</h3>
          <p className="text-navy-400 text-sm">{teams.length === 0 ? 'Once you have teams, fixtures appear here.' : 'Try changing the filters above.'}</p>
        </div>
      )}
    </div>
  )
}
