import { useState, useEffect, useCallback, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { teacherService, hodService } from '../../services/api'
import { RefreshCw, CheckCircle, Calendar, Clock, AlertTriangle, Settings, Sunrise, BookOpen, ChevronRight } from 'lucide-react'
import { CalendarStrip, AttentionQueue, ROLE_DOTS, ROLE_TAG } from '../../components/CalendarStrip'
import { HoDSection, CurriculumSection, ExtraCurricularSection } from '../../components/DashboardSections'

function greetingFor(hour) {
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}

function formatDate() {
  return new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
}

// ── Date helpers (all in the browser's local calendar) ──────────────

function localDate(iso) {
  const [y, m, d] = String(iso).slice(0, 10).split('-').map(Number)
  return new Date(y, m - 1, d)
}

function localTodayIso() {
  const n = new Date()
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}-${String(n.getDate()).padStart(2, '0')}`
}

function daysFromToday(iso) {
  return Math.round((localDate(iso) - localDate(localTodayIso())) / 86400000)
}

// Relative label for a due date: Overdue / Today / Tomorrow / Thu / Mon 24 Sep
function dueLabel(iso) {
  if (!iso) return null
  const diff = daysFromToday(iso)
  if (diff < 0) return 'Overdue'
  if (diff === 0) return 'Today'
  if (diff === 1) return 'Tomorrow'
  if (diff <= 6) return localDate(iso).toLocaleDateString('en-GB', { weekday: 'short' })
  return localDate(iso).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })
}

// Calendar wording for a date inside a sentence: "today", "tomorrow", "Thu 18 Sep"
function whenLabel(iso) {
  if (!iso) return ''
  const diff = daysFromToday(iso)
  if (diff === 0) return 'today'
  if (diff === 1) return 'tomorrow'
  if (diff === -1) return 'yesterday'
  return localDate(iso).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })
}

// Age label for something that happened: Today / Yesterday / 3 days ago
function ageLabel(timestamp) {
  if (!timestamp) return null
  const days = -daysFromToday(new Date(timestamp).toLocaleDateString('en-CA'))
  if (days <= 0) return 'Today'
  if (days === 1) return 'Yesterday'
  return `${days} days ago`
}

function hhmm(t) {
  return t ? String(t).slice(0, 5) : null
}

function parseHour(t) {
  const parts = String(t || '').match(/(\d+):(\d+)/)
  if (!parts) return null
  return parseInt(parts[1], 10) + parseInt(parts[2], 10) / 60
}

function plural(n, noun) {
  return `${n} ${noun}${n === 1 ? '' : 's'}`
}

function joinNatural(parts) {
  if (parts.length <= 1) return parts.join('')
  return `${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]}`
}

// ── Data ────────────────────────────────────────────────────────────

function useDashboardData() {
  const [today, setToday] = useState(null)
  const [attention, setAttention] = useState(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [refreshedAt, setRefreshedAt] = useState(null)

  const load = useCallback(async (isRefresh) => {
    if (isRefresh) setRefreshing(true)
    const [t, a] = await Promise.allSettled([
      teacherService.getDashboardToday(),
      teacherService.getDashboardAttention(),
    ])
    if (t.status === 'fulfilled') setToday(t.value.data)
    if (a.status === 'fulfilled') setAttention(a.value.data)
    setRefreshedAt(new Date())
    setLoading(false)
    setRefreshing(false)
  }, [])

  useEffect(() => { load(false) }, [load])

  return { today, attention, loading, refreshing, refreshedAt, refresh: () => load(true) }
}

// Timed events for the strip (training and fixtures carry a time; lesson
// plans only carry a date, so they are listed separately).
function buildEvents(today) {
  if (!today) return []
  const raw = [
    ...(today.training || []).map(t => ({
      id: `training-${t.id}`, start: parseHour(t.time), label: `${t.team_name} training`,
      role: 'teacherExtraCurricular', href: `/teacher/teams/${t.team_id}`,
    })),
    ...(today.fixtures || []).map(f => ({
      id: `fixture-${f.id}`, start: parseHour(f.match_time), label: `${f.team_name} ${f.home_away === 'home' ? 'vs' : 'at'} ${f.opponent}`,
      role: 'teacherExtraCurricular', href: `/teacher/match/${f.id}`,
    })),
  ].filter(ev => ev.start != null).sort((a, b) => a.start - b.start)

  // Two lanes: drop an event to the second lane when it overlaps the previous one.
  let lastEnd = -1
  return raw.map(ev => {
    const end = ev.start + 1
    const lane = ev.start < lastEnd ? 1 : 0
    if (lane === 0) lastEnd = end
    return { ...ev, end, lane }
  })
}

function buildActions(attention) {
  return (attention?.items || []).map(item => {
    const when = item.due_date ? whenLabel(item.due_date) : null
    const time = item.due_time ? ` ${item.due_time}` : ''
    return {
      ...item,
      subject: when ? `${item.subject}, ${when}${time}` : item.subject,
      deadline: item.due_date ? dueLabel(item.due_date) : ageLabel(item.since),
    }
  })
}

// ── Briefing ────────────────────────────────────────────────────────

function BriefingCard({ today, actions, events, loading, refreshing, refreshedAt, onRefresh }) {
  const lessons = today?.lessons?.length || 0
  const training = today?.training?.length || 0
  const fixtures = today?.fixtures?.length || 0
  const scheduled = lessons + training + fixtures

  const parts = []
  if (lessons) parts.push(plural(lessons, 'lesson'))
  if (training) parts.push(plural(training, 'training session'))
  if (fixtures) parts.push(plural(fixtures, 'fixture'))

  const urgent = actions.filter(a => a.urgency === 'high').length
  const first = actions[0]

  let headline
  if (loading) {
    headline = 'Pulling together your day…'
  } else if (!scheduled && !actions.length) {
    headline = 'All quiet today. Nothing scheduled and nothing waiting on you.'
  } else {
    const scheduleLine = scheduled ? `You have ${joinNatural(parts)} today.` : 'Nothing is scheduled today.'
    const attentionLine = actions.length
      ? `${actions.length === 1 ? 'One thing needs' : `${actions.length} things need`} your attention${urgent ? ` (${urgent} urgent)` : ''} — first up: ${first.verb.toLowerCase()}, ${first.subject}.`
      : 'Nothing is waiting on you.'
    headline = `${scheduleLine} ${attentionLine}`
  }

  const nowHour = new Date().getHours() + new Date().getMinutes() / 60
  const next = events.find(ev => ev.start > nowHour)
  let secondary
  if (loading) {
    secondary = null
  } else if (next) {
    const h = Math.floor(next.start), m = Math.round((next.start - h) * 60)
    secondary = { Icon: Clock, text: `Next up: ${next.label} at ${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}.` }
  } else if (events.length) {
    secondary = { Icon: CheckCircle, text: "Today's timed schedule is done." }
  } else if (actions.length) {
    secondary = { Icon: AlertTriangle, text: 'Start with the queue below — each row opens the page that completes it.' }
  } else {
    secondary = { Icon: CheckCircle, text: 'A good day to plan ahead.' }
  }

  const stamp = refreshedAt
    ? `${String(refreshedAt.getHours()).padStart(2, '0')}:${String(refreshedAt.getMinutes()).padStart(2, '0')}`
    : null

  return (
    <div className="relative overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border-subtle)] bg-[var(--surface-card)] shadow-[var(--shadow-sm)] mb-[18px]">
      <div className="absolute top-0 left-0 bottom-0 w-[3px]" style={{ background: 'var(--brand-accent)' }} />
      <div className="py-4 px-[18px] pl-[22px]">
        <div className="flex items-center gap-2 mb-[10px]">
          <span className="w-[22px] h-[22px] rounded-full inline-flex items-center justify-center shrink-0"
            style={{ background: 'var(--brand-primary)', color: 'var(--brand-accent)' }}>
            <Sunrise size={11} />
          </span>
          <span className="text-[10.5px] font-bold tracking-[0.1em] uppercase" style={{ color: 'var(--brand-primary)' }}>
            Today's briefing
          </span>
          <span className="flex-1" />
          {stamp && <span className="text-[11px] font-mono" style={{ color: 'var(--text-tertiary)' }}>Refreshed {stamp}</span>}
          <button onClick={onRefresh} disabled={refreshing}
            className="inline-flex items-center gap-[5px] px-2 py-1 rounded-[var(--radius-md)] text-[11.5px] font-semibold cursor-pointer"
            style={{ background: 'transparent', border: '1px solid var(--border-subtle)', color: 'var(--text-secondary)', opacity: refreshing ? 0.6 : 1 }}>
            <RefreshCw size={11} className={refreshing ? 'animate-spin' : ''} /> Refresh
          </button>
        </div>

        <p className="text-[14px] leading-[1.55] font-medium m-0" style={{ color: 'var(--text-primary)' }}>
          {headline}
        </p>
        {secondary && (
          <div className="flex items-center gap-2 mt-[10px] text-[12.5px]" style={{ color: 'var(--text-secondary)' }}>
            <secondary.Icon size={14} style={{ color: secondary.Icon === AlertTriangle ? 'var(--status-warning)' : 'var(--status-success)' }} />
            <span>{secondary.text}</span>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Today + attention queue ─────────────────────────────────────────

function TodaySection({ roles, today, actions, events, loading }) {
  const label = roles.includes('schoolAdmin') ? 'Across the school today'
    : roles.includes('hod') ? 'Today in your department' : "Today's schedule"
  const emptyMsg = roles.includes('schoolAdmin') ? 'Nothing scheduled across the school today.' : 'Nothing scheduled today.'
  const [showAll, setShowAll] = useState(false)

  const lessons = today?.lessons || []
  const visibleRoles = roles.filter(r => ROLE_DOTS[r])
  const showLegend = visibleRoles.length > 1
  const nothingToday = !loading && events.length === 0 && lessons.length === 0

  return (
    <div className="rounded-[var(--radius-lg)] border border-[var(--border-subtle)] bg-[var(--surface-card)] shadow-[var(--shadow-sm)] mb-6 overflow-hidden">
      <div className="px-5 pt-4 pb-3 flex items-center justify-between">
        <span className="text-[10px] font-bold tracking-[0.1em] uppercase" style={{ color: 'var(--brand-accent)' }}>
          {label}
        </span>
        {showLegend && (
          <div className="flex items-center gap-3">
            {visibleRoles.map(r => (
              <span key={r} className="flex items-center gap-1.5 text-[10px] font-bold tracking-[0.06em] uppercase" style={{ color: 'var(--text-tertiary)' }}>
                <span className="w-2 h-2 rounded-full" style={{ background: ROLE_DOTS[r] }} />
                {ROLE_TAG[r]}
              </span>
            ))}
          </div>
        )}
      </div>

      {nothingToday ? (
        <div className="px-5 pb-5 text-center">
          <Calendar size={24} className="mx-auto mb-2" style={{ color: 'var(--text-tertiary)' }} />
          <p className="text-[13px] italic" style={{ color: 'var(--text-tertiary)' }}>{emptyMsg}</p>
          <div className="flex gap-2 justify-center mt-3">
            <Link to="/teacher/fixtures" className="inline-flex items-center gap-1.5 px-3 py-[6px] rounded-[var(--radius-md)] text-[13px] font-semibold"
              style={{ background: 'var(--brand-primary)', color: 'var(--on-brand-primary)' }}>Schedule a fixture</Link>
            <Link to="/teacher/lessons" className="inline-flex items-center gap-1.5 px-3 py-[6px] rounded-[var(--radius-md)] text-[13px] font-semibold"
              style={{ background: 'var(--surface-card)', color: 'var(--text-primary)', border: '1px solid var(--border-default)' }}>Plan a lesson</Link>
          </div>
        </div>
      ) : (
        <div className="px-5 pb-3">
          {events.length > 0 && <CalendarStrip events={events} />}
          {lessons.length > 0 && (
            <div className={`flex flex-wrap items-center gap-2 ${events.length ? 'pt-1' : ''}`}>
              <span className="text-[10px] font-bold tracking-[0.06em] uppercase" style={{ color: 'var(--text-tertiary)' }}>Lessons today</span>
              {lessons.map(l => (
                <Link key={l.id} to="/teacher/lessons"
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[12px] font-medium no-underline"
                  style={{ background: 'var(--surface-sunken)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)' }}>
                  <BookOpen size={11} style={{ color: ROLE_DOTS.teacherCurriculum }} />
                  {l.title}{l.class_name ? ` · ${l.class_name}` : ''}
                </Link>
              ))}
            </div>
          )}
          {loading && events.length === 0 && lessons.length === 0 && (
            <p className="text-[12.5px] italic py-2" style={{ color: 'var(--text-tertiary)' }}>Loading today's schedule…</p>
          )}
        </div>
      )}

      {/* Attention queue */}
      <div style={{ background: 'var(--surface-sunken)' }}>
        <div className="px-5 py-[10px] flex items-center justify-between">
          <span className="text-[13px] font-semibold" style={{ color: 'var(--text-primary)' }}>
            Needs your attention · {actions.length}
          </span>
          {actions.length > 5 && (
            <button onClick={() => setShowAll(v => !v)} className="text-[12px] font-semibold cursor-pointer" style={{ color: 'var(--brand-primary)', background: 'transparent', border: 'none' }}>
              {showAll ? 'Show fewer' : `View all ${actions.length}`}
            </button>
          )}
        </div>
        {loading && actions.length === 0 ? (
          <p className="text-[12.5px] italic px-5 pb-3" style={{ color: 'var(--text-tertiary)' }}>Checking what needs you…</p>
        ) : (
          <AttentionQueue actions={actions} showAll={showAll} />
        )}
      </div>
    </div>
  )
}

export default function DashboardV15() {
  const { user } = useAuth()
  const [isHoD, setIsHoD] = useState(false)
  const [showCustomise, setShowCustomise] = useState(false)
  const [hidden, setHidden] = useState(() => {
    try { return JSON.parse(localStorage.getItem('dash_hidden_sections') || '[]') } catch { return [] }
  })
  function toggleSection(key) {
    setHidden(prev => {
      const next = prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
      localStorage.setItem('dash_hidden_sections', JSON.stringify(next))
      return next
    })
  }
  const [schoolRole, setSchoolRole] = useState(null)
  // First name for the greeting, skipping honorifics ("Mr James Okonkwo" -> "James")
  const HONORIFICS = ['mr', 'mrs', 'ms', 'miss', 'dr', 'mx', 'prof', 'rev', 'sir']
  const nameParts = (user?.name || '').trim().split(/\s+/).filter(Boolean)
  const firstName = (HONORIFICS.includes(nameParts[0]?.toLowerCase().replace(/\.$/, ''))
    ? nameParts[1]
    : nameParts[0]) || 'there'
  const hour = new Date().getHours()

  const { today, attention, loading, refreshing, refreshedAt, refresh } = useDashboardData()
  const events = useMemo(() => buildEvents(today), [today])
  const actions = useMemo(() => buildActions(attention), [attention])

  useEffect(() => {
    hodService.check()
      .then(res => { setIsHoD(res.data.isHoD); if (res.data.role) setSchoolRole(res.data.role) })
      .catch(() => {})
  }, [])

  const roles = []
  if (['owner', 'school_admin', 'admin'].includes(schoolRole)) roles.push('schoolAdmin')
  if (isHoD && !roles.includes('schoolAdmin')) roles.push('hod')
  roles.push('teacherCurriculum', 'teacherExtraCurricular')

  return (
    <div className="max-w-[1100px] mx-auto px-7 py-6">
      {/* Page header */}
      <div className="flex items-baseline justify-between gap-4 mb-4">
        <div>
          <h1 className="text-[26px] font-bold tracking-[-0.015em] leading-[1.15] m-0" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-display)' }}>
            {greetingFor(hour)}, {firstName}.
          </h1>
          <p className="text-[13.5px] mt-1" style={{ color: 'var(--text-tertiary)' }}>{formatDate()}</p>
        </div>
        <div className="relative">
          <button
            onClick={() => setShowCustomise(v => !v)}
            className="inline-flex items-center gap-1.5 px-3 py-[6px] rounded-[var(--radius-md)] text-[13px] font-semibold cursor-pointer transition-colors hover:bg-[var(--surface-subtle)]"
            style={{ background: 'transparent', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)' }}
          >
            <Settings size={14} /> Customise
          </button>
          {showCustomise && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowCustomise(false)} />
              <div className="absolute right-0 top-full z-20 mt-2 w-60 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-card)] p-3 shadow-lg">
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>
                  Show on your dashboard
                </p>
                {[
                  ['briefing', "Today's briefing"],
                  ['today', 'Today in your department'],
                  ['hod', 'Head of Department'],
                  ['curriculum', 'Curriculum PE'],
                  ['extra', 'Extra-curricular'],
                ].map(([key, label]) => (
                  <label key={key} className="flex cursor-pointer items-center gap-2.5 rounded-lg px-2 py-1.5 text-[13px] transition-colors hover:bg-[var(--surface-subtle)]" style={{ color: 'var(--text-primary)' }}>
                    <input
                      type="checkbox"
                      checked={!hidden.includes(key)}
                      onChange={() => toggleSection(key)}
                      className="h-3.5 w-3.5 accent-[var(--brand-primary)]"
                    />
                    {label}
                  </label>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {!hidden.includes('briefing') && (
        <BriefingCard today={today} actions={actions} events={events} loading={loading}
          refreshing={refreshing} refreshedAt={refreshedAt} onRefresh={refresh} />
      )}
      {!hidden.includes('today') && <TodaySection roles={roles} today={today} actions={actions} events={events} loading={loading} />}

      {/* Role sections in priority order */}
      {!hidden.includes('hod') && (roles.includes('schoolAdmin') || roles.includes('hod')) && (
        <HoDSection single={roles.length <= 2} />
      )}
      {!hidden.includes('curriculum') && <CurriculumSection single={roles.length <= 2} />}
      {!hidden.includes('extra') && <ExtraCurricularSection single={roles.length <= 2} />}
    </div>
  )
}
