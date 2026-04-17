import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { teacherService } from '../../services/api'
import {
  Calendar, GraduationCap, Shield, ClipboardCheck, ChevronRight,
  Users, Loader2, AlertTriangle, Trophy,
} from 'lucide-react'

const TYPE_PILL = {
  fixture: 'bg-amber-500/20 text-amber-400',
  training: 'bg-pitch-500/20 text-pitch-400',
  lesson: 'bg-sky-500/20 text-sky-400',
}

function fmt(t) {
  if (!t) return ''
  const [h, m] = t.split(':')
  const hr = parseInt(h, 10)
  return `${hr > 12 ? hr - 12 : hr}:${m} ${hr >= 12 ? 'pm' : 'am'}`
}

function fmtDate(d) {
  if (!d) return ''
  return new Date(d).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })
}

function resultBadge(r) {
  if (!r || r.score_for == null) return null
  const w = r.score_for > r.score_against ? 'W' : r.score_for < r.score_against ? 'L' : 'D'
  const c = { W: 'text-emerald-400', L: 'text-red-400', D: 'text-amber-400' }
  return <span className={`text-xs font-bold ${c[w]}`}>{w} {r.score_for}-{r.score_against}</span>
}

export default function TeacherDashboard() {
  const [today, setToday] = useState(null)
  const [classes, setClasses] = useState([])
  const [teams, setTeams] = useState([])
  const [attention, setAttention] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      teacherService.getDashboardToday().then(r => setToday(r.data)),
      teacherService.getDashboardClasses().then(r => setClasses(r.data)),
      teacherService.getDashboardTeams().then(r => setTeams(r.data)),
      teacherService.getDashboardAttention().then(r => setAttention(r.data)),
    ])
      .catch(err => console.error('Dashboard error:', err))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 text-pitch-400 animate-spin" /></div>

  const todayDate = new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  const todayItems = [
    ...(today?.classes || []).map(c => ({ type: 'lesson', time: null, label: `${c.class_name} – ${c.unit_name}`, sub: `Yr ${c.year_group} · ${c.pupil_count} pupils`, href: `/teacher/classes/${c.group_id}` })),
    ...(today?.training || []).map(t => ({ type: 'training', time: t.time, label: `${t.team_name} training`, sub: `${t.location || 'TBC'} · ${t.pupil_count} pupils`, href: `/teacher/teams/${t.team_id}` })),
    ...(today?.fixtures || []).map(f => ({ type: 'fixture', time: f.match_time, label: `${f.team_name} vs ${f.opponent}`, sub: `${f.location || 'TBC'} (${f.home_away}) · ${f.pupil_count} pupils`, href: `/matches/${f.id}` })),
  ].sort((a, b) => (a.time || '99:99').localeCompare(b.time || '99:99'))

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl md:text-2xl font-bold text-white">Dashboard</h1>
        <p className="text-navy-400 text-sm mt-0.5">{todayDate}</p>
      </div>

      {/* Today strip */}
      <div className="bg-navy-900 rounded-xl border border-navy-800 p-5">
        <h2 className="text-base font-semibold text-white flex items-center gap-2 mb-4">
          <Calendar className="w-4 h-4 text-pitch-400" />Today
        </h2>
        {todayItems.length === 0 ? (
          <p className="text-navy-500 text-sm text-center py-4">Nothing scheduled today</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
            {todayItems.map((item, i) => (
              <Link key={i} to={item.href} className="flex items-center gap-3 p-3 rounded-lg bg-navy-800/50 hover:bg-navy-800 transition-colors">
                <div className="w-12 text-right shrink-0">
                  <span className="text-xs text-navy-400 font-mono">{item.time ? fmt(item.time) : '—'}</span>
                </div>
                <span className={`text-[10px] uppercase tracking-wide font-semibold px-1.5 py-0.5 rounded shrink-0 ${TYPE_PILL[item.type]}`}>{item.type}</span>
                <div className="min-w-0 flex-1">
                  <div className="text-sm text-white truncate">{item.label}</div>
                  <div className="text-xs text-navy-400 truncate">{item.sub}</div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Two-column: Classes + Teams */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* My Classes */}
        <div className="bg-navy-900 rounded-xl border border-navy-800 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-white flex items-center gap-2">
              <GraduationCap className="w-4 h-4 text-pitch-400" />My Classes
            </h2>
            <Link to="/teacher/classes" className="text-xs text-pitch-400 hover:text-pitch-300">View all</Link>
          </div>
          {classes.length === 0 ? <p className="text-navy-500 text-sm text-center py-6">No classes assigned yet</p> : (
            <div className="space-y-2">
              {classes.map(c => {
                const unit = c.current_units?.[0]
                return (
                  <Link key={c.id} to={`/teacher/classes/${c.id}`} className="flex items-center justify-between p-3 rounded-lg bg-navy-800/50 hover:bg-navy-800 transition-colors">
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium text-white truncate">{c.name}</div>
                      <div className="text-xs text-navy-400">Yr {c.year_group} · {c.pupil_count} pupils{unit ? ` · ${unit.sport}` : ''}</div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {c.assessments_this_term > 0 && (
                        <span className="text-[11px] text-navy-400 flex items-center gap-1">
                          <ClipboardCheck className="w-3 h-3" />{c.assessments_this_term}
                        </span>
                      )}
                      <ChevronRight className="w-4 h-4 text-navy-600" />
                    </div>
                  </Link>
                )
              })}
            </div>
          )}
        </div>

        {/* My Teams */}
        <div className="bg-navy-900 rounded-xl border border-navy-800 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-white flex items-center gap-2">
              <Shield className="w-4 h-4 text-amber-400" />My Teams
            </h2>
            <Link to="/teacher/teams" className="text-xs text-pitch-400 hover:text-pitch-300">View all</Link>
          </div>
          {teams.length === 0 ? <p className="text-navy-500 text-sm text-center py-6">No teams assigned yet</p> : (
            <div className="space-y-2">
              {teams.map(t => (
                <Link key={t.id} to={`/teacher/teams/${t.id}`} className="flex items-center justify-between p-3 rounded-lg bg-navy-800/50 hover:bg-navy-800 transition-colors">
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium text-white truncate">{t.name}</div>
                    <div className="text-xs text-navy-400">
                      {t.pupil_count} pupils
                      {t.next_fixture && <> · Next: vs {t.next_fixture.opponent} {fmtDate(t.next_fixture.date)}</>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {resultBadge(t.last_result)}
                    <ChevronRight className="w-4 h-4 text-navy-600" />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Pupils needing attention */}
      {attention.length > 0 && (
        <div className="bg-navy-900 rounded-xl border border-navy-800 p-5">
          <h2 className="text-base font-semibold text-white flex items-center gap-2 mb-4">
            <AlertTriangle className="w-4 h-4 text-amber-400" />Pupils needing attention
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
            {attention.map(a => (
              <Link key={a.pupil_id} to={`/teacher/hod/pupils/${a.pupil_id}`} className="flex items-center gap-3 p-3 rounded-lg bg-navy-800/50 hover:bg-navy-800 transition-colors">
                <div className="w-8 h-8 rounded-full bg-amber-500/20 flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-4 h-4 text-amber-400" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm text-white truncate">{a.name}</div>
                  <div className="text-xs text-navy-500 truncate capitalize">{a.observation_type} · {a.team_name}</div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
