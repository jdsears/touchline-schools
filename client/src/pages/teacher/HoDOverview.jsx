import { useState, useEffect, useRef, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { hodService } from '../../services/api'
import {
  Building2, Calendar, AlertTriangle, BarChart3, Clock,
  Users, ChevronRight, Loader2, Shield, FileBarChart,
  Trophy, GraduationCap, Plus, Download, UserCog,
} from 'lucide-react'

const TYPE_PILL = {
  fixture: 'bg-amber-500/20 text-amber-400',
  training: 'bg-pitch-500/20 text-pitch-400',
  lesson: 'bg-sky-500/20 text-sky-400',
}

function formatTime(t) {
  if (!t) return ''
  const [h, m] = t.split(':')
  const hr = parseInt(h, 10)
  return `${hr > 12 ? hr - 12 : hr}:${m} ${hr >= 12 ? 'pm' : 'am'}`
}

function formatDate(d) {
  if (!d) return ''
  return new Date(d).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })
}

function resultPill(scoreFor, scoreAgainst) {
  if (scoreFor == null || scoreAgainst == null) return null
  const w = scoreFor > scoreAgainst ? 'W' : scoreFor < scoreAgainst ? 'L' : 'D'
  const colours = { W: 'bg-emerald-500/20 text-emerald-400', L: 'bg-red-500/20 text-red-400', D: 'bg-amber-500/20 text-amber-400' }
  return (
    <span className={`text-xs font-bold px-2 py-0.5 rounded ${colours[w]}`}>
      {w} {scoreFor}-{scoreAgainst}
    </span>
  )
}

export default function HoDOverview() {
  const [today, setToday] = useState(null)
  const [attention, setAttention] = useState(null)
  const [weekly, setWeekly] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const pollRef = useRef(null)

  const fetchToday = useCallback(() => {
    hodService.getSchoolOverviewToday().then(r => setToday(r.data)).catch(() => {})
  }, [])

  useEffect(() => {
    Promise.all([
      hodService.getSchoolOverviewToday().then(r => setToday(r.data)),
      hodService.getSchoolOverviewAttention().then(r => setAttention(r.data)),
      hodService.getSchoolOverviewWeekly().then(r => setWeekly(r.data)),
    ])
      .catch(err => { console.error('Dashboard load error:', err); setError('Failed to load dashboard') })
      .finally(() => setLoading(false))

    pollRef.current = setInterval(fetchToday, 30000)
    return () => clearInterval(pollRef.current)
  }, [fetchToday])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-pitch-400 animate-spin" />
      </div>
    )
  }

  if (error && !today && !attention && !weekly) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <AlertTriangle className="w-8 h-8 text-amber-400 mb-3" />
        <p className="text-secondary text-sm mb-4">{error}</p>
        <button onClick={() => window.location.reload()} className="px-4 py-2 bg-pitch-600 hover:bg-pitch-700 text-primary text-sm rounded-lg transition-colors">
          Retry
        </button>
      </div>
    )
  }

  const todayDate = new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  const todayItems = [
    ...(today?.lessons || []).map(l => ({ type: 'lesson', time: null, label: `${l.class_name} – ${l.unit_name}`, sub: `${l.teacher_name} · Yr ${l.year_group}`, pupils: l.pupil_count, sport: l.sport })),
    ...(today?.training || []).map(t => ({ type: 'training', time: t.time, label: `${t.team_name} training`, sub: `${t.coach_name || 'TBC'} · ${t.location || 'TBC'}`, pupils: t.pupil_count, sport: t.sport })),
    ...(today?.fixtures || []).map(f => ({ type: 'fixture', time: f.match_time, label: `${f.team_name} vs ${f.opponent}`, sub: `${f.coach_name || 'TBC'} · ${f.location || 'TBC'} (${f.home_away})`, pupils: f.pupil_count, sport: f.sport })),
  ].sort((a, b) => (a.time || '99:99').localeCompare(b.time || '99:99'))

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-primary flex items-center gap-3">
            <Building2 className="w-6 h-6 text-amber-400" />
            School Overview
          </h1>
          <p className="text-secondary text-sm mt-0.5">{todayDate}</p>
        </div>
      </div>

      {/* Quick actions */}
      <div className="flex flex-wrap gap-3">
        <Link to="/teacher/hod/reporting" className="flex items-center gap-2 px-4 py-2.5 bg-pitch-600 hover:bg-pitch-700 text-primary text-sm font-medium rounded-lg transition-colors">
          <Plus className="w-4 h-4" />New reporting window
        </Link>
        <Link to="/teacher/hod/staff-activity" className="flex items-center gap-2 px-4 py-2.5 bg-subtle hover:bg-subtle text-primary text-sm rounded-lg border border-border-strong transition-colors">
          <UserCog className="w-4 h-4" />Staff activity report
        </Link>
        <button onClick={() => window.print()} className="flex items-center gap-2 px-4 py-2.5 bg-subtle hover:bg-subtle text-primary text-sm rounded-lg border border-border-strong transition-colors">
          <Download className="w-4 h-4" />Export summary
        </button>
      </div>

      {/* Two-column layout: Today + Attention */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Column 1: Today (60%) */}
        <div className="lg:col-span-3 bg-card rounded-xl border border-border-default p-5">
          <h2 className="text-base font-semibold text-primary flex items-center gap-2 mb-4">
            <Calendar className="w-4 h-4 text-pitch-400" />
            Today in your department
          </h2>
          {todayItems.length === 0 ? (
            <p className="text-tertiary text-sm text-center py-8">Quiet day in the department</p>
          ) : (
            <div className="space-y-2">
              {todayItems.map((item, i) => (
                <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-subtle">
                  <div className="w-14 text-right">
                    <span className="text-xs text-secondary font-mono">{item.time ? formatTime(item.time) : '—'}</span>
                  </div>
                  <span className={`text-[10px] uppercase tracking-wide font-semibold px-2 py-0.5 rounded ${TYPE_PILL[item.type]}`}>{item.type}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-primary truncate">{item.label}</div>
                    <div className="text-xs text-secondary truncate">{item.sub}</div>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-tertiary">
                    <Users className="w-3 h-3" />{item.pupils}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Column 2: Attention (40%) */}
        <div className="lg:col-span-2 bg-card rounded-xl border border-border-default p-5">
          <h2 className="text-base font-semibold text-primary flex items-center gap-2 mb-4">
            <AlertTriangle className="w-4 h-4 text-amber-400" />
            Attention needed
          </h2>
          <div className="space-y-4">
            {/* Reporting windows */}
            {(attention?.reporting_windows || []).map(rw => {
              const pct = rw.total > 0 ? Math.round((rw.submitted / rw.total) * 100) : 0
              return (
                <Link key={rw.id} to={`/teacher/hod/reporting`} className="block p-3 rounded-lg bg-subtle hover:bg-subtle transition-colors">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-sm text-primary font-medium flex items-center gap-2">
                      <FileBarChart className="w-3.5 h-3.5 text-secondary" />{rw.name}
                    </span>
                    <span className="text-xs text-secondary">{rw.submitted}/{rw.total}</span>
                  </div>
                  <div className="w-full h-1.5 bg-border-default rounded-full overflow-hidden">
                    <div className="h-full bg-pitch-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
                  </div>
                  {rw.closes_at && (
                    <div className="text-[11px] text-tertiary mt-1 flex items-center gap-1">
                      <Clock className="w-3 h-3" />Closes {formatDate(rw.closes_at)}
                    </div>
                  )}
                </Link>
              )
            })}

            {/* Flagged observations */}
            {(attention?.flagged_observations || []).length > 0 && (
              <div>
                <h3 className="text-xs font-semibold text-secondary uppercase tracking-wide mb-2">Flagged pupils</h3>
                {attention.flagged_observations.slice(0, 5).map(o => (
                  <Link key={o.id} to={`/teacher/hod/pupils/${o.pupil_id}`} className="flex items-center gap-3 p-2 rounded-lg hover:bg-subtle transition-colors">
                    <div className="w-7 h-7 rounded-full bg-amber-500/20 flex items-center justify-center">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-primary truncate">{o.pupil_name}</div>
                      <div className="text-xs text-tertiary truncate">{o.type} – {o.observer_name}</div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-tertiary" />
                  </Link>
                ))}
              </div>
            )}

            {/* Open safeguarding */}
            {(attention?.open_safeguarding || []).length > 0 && (
              <div>
                <h3 className="text-xs font-semibold text-secondary uppercase tracking-wide mb-2">Open safeguarding</h3>
                {attention.open_safeguarding.slice(0, 3).map(si => {
                  const href = attention.school_slug
                    ? `/school/${attention.school_slug}/safeguarding/incidents?highlight=${si.id}`
                    : '/teacher/safeguarding'
                  return (
                    <Link key={si.id} to={href} className="flex items-center gap-3 p-2 rounded-lg hover:bg-subtle transition-colors">
                      <Shield className="w-4 h-4 text-red-400" />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm text-primary truncate capitalize">{si.incident_type?.replace(/_/g, ' ')}</div>
                        <div className="text-xs text-tertiary">{si.severity} · {formatDate(si.created_at)}</div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-tertiary" />
                    </Link>
                  )
                })}
              </div>
            )}

            {!attention?.reporting_windows?.length && !attention?.flagged_observations?.length && !attention?.open_safeguarding?.length && (
              <p className="text-tertiary text-sm text-center py-4">Nothing urgent right now</p>
            )}
          </div>
        </div>
      </div>

      {/* Full-width: This week */}
      <div className="bg-card rounded-xl border border-border-default p-5">
        <h2 className="text-base font-semibold text-primary flex items-center gap-2 mb-4">
          <BarChart3 className="w-4 h-4 text-pitch-400" />
          This week in the department
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <WeeklyFixtures fixtures={weekly?.fixtures || []} />
          <WeeklyStaffActivity staff={weekly?.staff_activity || []} />
          <WeeklyParticipation data={weekly?.participation} />
        </div>
      </div>
    </div>
  )
}

function SectionHeader({ icon: Icon, children }) {
  return <h3 className="text-xs font-semibold text-secondary uppercase tracking-wide mb-3 flex items-center gap-2"><Icon className="w-3.5 h-3.5" />{children}</h3>
}

function WeeklyFixtures({ fixtures }) {
  return (
    <div>
      <SectionHeader icon={Trophy}>Fixtures</SectionHeader>
      {fixtures.length === 0 ? <p className="text-tertiary text-xs">No fixtures this week</p> : (
        <div className="space-y-2">
          {fixtures.map(f => (
            <Link key={f.id} to={`/matches/${f.id}`} className="block p-2.5 rounded-lg bg-subtle hover:bg-subtle transition-colors">
              <div className="flex items-center justify-between mb-0.5">
                <span className="text-sm text-primary">{f.team_name} vs {f.opponent}</span>
                {resultPill(f.score_for, f.score_against)}
              </div>
              <div className="text-xs text-tertiary">{formatDate(f.match_date)} {f.match_time ? `· ${formatTime(f.match_time)}` : ''} · {f.home_away}</div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

function WeeklyStaffActivity({ staff }) {
  const active = staff.filter(s => s.observations_logged > 0 || s.reports_updated > 0)
  return (
    <div>
      <SectionHeader icon={GraduationCap}>Staff activity</SectionHeader>
      {active.length === 0 ? <p className="text-tertiary text-xs">No activity recorded</p> : (
        <div className="space-y-1.5">
          {active.map(s => (
            <div key={s.id} className="flex items-center justify-between p-2 rounded-lg bg-subtle">
              <span className="text-sm text-primary">{s.name}</span>
              <div className="flex gap-3 text-xs text-secondary">
                {s.observations_logged > 0 && <span>{s.observations_logged} obs</span>}
                {s.reports_updated > 0 && <span>{s.reports_updated} reports</span>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function WeeklyParticipation({ data }) {
  return (
    <div>
      <SectionHeader icon={Users}>Participation</SectionHeader>
      <div className="grid grid-cols-2 gap-3">
        <div className="p-3 rounded-lg bg-subtle text-center">
          <div className="text-2xl font-bold text-primary">{data?.sports_active || 0}</div>
          <div className="text-xs text-secondary">Sports active</div>
        </div>
        <div className="p-3 rounded-lg bg-subtle text-center">
          <div className="text-2xl font-bold text-primary">{data?.unique_pupils || 0}</div>
          <div className="text-xs text-secondary">Pupils involved</div>
        </div>
      </div>
    </div>
  )
}
