import { Link } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { hodService, teacherService, lessonService } from '../services/api'
import { StatCard } from './common/ui'
import { Clock, ChevronRight, ClipboardCheck, BookOpen, Calendar } from 'lucide-react'

function fmtDate(d) {
  if (!d) return ''
  return new Date(d).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })
}

function hhmm(t) {
  return t ? String(t).slice(0, 5) : ''
}

function daysUntil(d) {
  if (!d) return null
  const target = new Date(d); target.setHours(0, 0, 0, 0)
  const today = new Date(); today.setHours(0, 0, 0, 0)
  return Math.round((target - today) / 86400000)
}

function resultBadge(r) {
  if (!r || r.score_for == null) return null
  const w = r.score_for > r.score_against ? 'W' : r.score_for < r.score_against ? 'L' : 'D'
  const colour = { W: 'var(--status-success)', L: 'var(--status-error)', D: 'var(--brand-accent)' }[w]
  return <span className="text-[11px] font-bold font-mono" style={{ color: colour }}>{w} {r.score_for}-{r.score_against}</span>
}

function Card({ title, action, children }) {
  return (
    <div className="rounded-[var(--radius-lg)] p-5" style={{ background: 'var(--surface-card)', border: '1px solid var(--border-subtle)' }}>
      <div className="flex items-baseline justify-between mb-3">
        <h3 className="text-[15px] font-semibold tracking-[-0.005em] m-0" style={{ color: 'var(--text-primary)' }}>{title}</h3>
        {action}
      </div>
      {children}
    </div>
  )
}

function CardLink({ to, children }) {
  return (
    <Link to={to} className="text-[12px] font-semibold no-underline" style={{ color: 'var(--brand-primary)' }}>{children}</Link>
  )
}

function Row({ to, children, right }) {
  return (
    <Link to={to} className="flex items-center justify-between gap-3 py-2.5 no-underline transition-colors hover:bg-[var(--surface-sunken)] -mx-2 px-2 rounded-[var(--radius-md)]"
      style={{ borderTop: '1px solid var(--border-subtle)' }}>
      <div className="min-w-0 flex-1">{children}</div>
      <div className="flex items-center gap-2 shrink-0">
        {right}
        <ChevronRight size={14} style={{ color: 'var(--text-tertiary)' }} />
      </div>
    </Link>
  )
}

function Empty({ text, cta, to }) {
  return (
    <div className="text-center py-4">
      <p className="text-[13px] italic mb-2" style={{ color: 'var(--text-tertiary)' }}>{text}</p>
      {cta && <CardLink to={to}>{cta} →</CardLink>}
    </div>
  )
}

function Loading() {
  return <p className="text-[12.5px] italic py-3" style={{ color: 'var(--text-tertiary)' }}>Loading…</p>
}

function ReportingWindowRow({ window: w }) {
  const completed = Number(w.submitted || 0) + Number(w.published || 0)
  const total = Number(w.total || 0)
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0
  const isComplete = total > 0 && completed === total
  const closesIn = daysUntil(w.closes_at)
  let dueLabel, dueTone = 'neutral'
  if (w.status === 'draft') {
    dueLabel = w.opens_at ? `Opens ${fmtDate(w.opens_at)}` : 'Not yet open'
  } else if (closesIn != null && closesIn < 0) {
    dueLabel = `Was due ${fmtDate(w.closes_at)}`
    dueTone = isComplete ? 'neutral' : 'warning'
  } else if (closesIn != null) {
    dueLabel = closesIn === 0 ? 'Closes today' : `Closes ${fmtDate(w.closes_at)}`
    dueTone = !isComplete && closesIn <= 14 ? 'warning' : 'neutral'
  } else {
    dueLabel = 'No closing date'
  }
  const barColor = isComplete ? 'var(--status-success)' : dueTone === 'warning' ? 'var(--status-warning)' : 'var(--brand-primary)'
  return (
    <Link to={`/teacher/hod/reporting/windows/${w.id}`} className="block py-3 no-underline" style={{ borderTop: '1px solid var(--border-subtle)' }}>
      <div className="flex items-baseline justify-between mb-1.5">
        <span className="text-[13px] font-semibold" style={{ color: 'var(--text-primary)' }}>{w.name}</span>
        <span className="text-[12px] font-semibold font-mono" style={{ color: isComplete ? 'var(--status-success)' : 'var(--text-primary)' }}>{completed}/{total}</span>
      </div>
      <div className="h-1.5 rounded-full overflow-hidden mb-1.5" style={{ background: 'var(--surface-sunken)' }}>
        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: barColor }} />
      </div>
      <div className="flex items-center gap-1.5 text-[11.5px]" style={{ color: dueTone === 'warning' ? 'var(--status-warning)' : 'var(--text-tertiary)' }}>
        <Clock size={11} /><span>{dueLabel}</span>
        {Number(w.submitted) > 0 && <span style={{ color: 'var(--text-tertiary)' }}>· {w.submitted} awaiting moderation</span>}
      </div>
    </Link>
  )
}

function SectionHeading({ label, single }) {
  if (single) return null
  return (
    <div className="mb-3 mt-6 first:mt-0">
      <span className="text-[10px] font-bold tracking-[0.1em] uppercase" style={{ color: 'var(--brand-accent)' }}>{label}</span>
    </div>
  )
}

export function HoDSection({ single }) {
  const [weekly, setWeekly] = useState(null)
  // undefined = loading, null = failed
  const [attention, setAttention] = useState(undefined)
  useEffect(() => {
    hodService.getSchoolOverviewWeekly()
      .then(res => setWeekly(res.data))
      .catch(() => setWeekly(null))
    hodService.getSchoolOverviewAttention()
      .then(res => setAttention(res.data))
      .catch(() => setAttention(null))
  }, [])

  const staff = weekly?.staff_activity || []
  const activeStaff = staff.filter(t => Number(t.observations_logged) > 0 || Number(t.reports_updated) > 0).length
  const fixturesThisWeek = (weekly?.fixtures || []).length

  // Honest week-over-week chips: only rendered when the server has a frozen
  // prior-week snapshot to compare against (trends is null otherwise).
  const trendChip = (key) => {
    const t = weekly?.trends?.[key]
    if (!t || !Number.isFinite(t.delta) || t.delta === 0) return undefined
    return {
      tone: t.delta > 0 ? 'positive' : 'negative',
      label: `${t.delta > 0 ? '↑' : '↓'} ${Math.abs(t.delta)}`,
    }
  }

  const windows = attention?.reporting_windows || []
  const awaitingModeration = windows.filter(w => Number(w.submitted) > 0)
  const awaitingCount = awaitingModeration.reduce((n, w) => n + Number(w.submitted), 0)

  return (
    <div>
      <SectionHeading label="Head of Department" single={single} />
      <div className="flex gap-3 mb-4 flex-wrap">
        <StatCard label="Sports active" value={weekly ? Number(weekly.participation?.sports_active) || 0 : null} sub="Across all year groups" trend={trendChip('sports_active')} />
        <StatCard label="Pupils involved" value={weekly ? Number(weekly.participation?.unique_pupils) || 0 : null} sub="In teams and classes" trend={trendChip('unique_pupils')} />
        <StatCard label="Staff activity" value={weekly ? activeStaff : null} suffix={weekly && staff.length ? `/${staff.length}` : ''} sub="Logged this week" trend={trendChip('active_staff')} />
        <StatCard label="Fixtures this week" value={weekly ? fixturesThisWeek : null} sub="Across all teams" trend={trendChip('fixtures_count')} />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-[var(--radius-lg)] p-5" style={{ background: 'var(--surface-card)', border: '1px solid var(--border-subtle)' }}>
          <div className="flex items-baseline justify-between mb-3">
            <span className="text-[10px] font-bold tracking-[0.08em] uppercase" style={{ color: 'var(--text-tertiary)' }}>Report moderation</span>
            <CardLink to="/teacher/hod/reporting">Reporting</CardLink>
          </div>
          {attention === undefined ? <Loading /> : awaitingCount === 0 ? (
            <p className="text-[13px] italic" style={{ color: 'var(--text-tertiary)' }}>No reports awaiting moderation.</p>
          ) : (
            <div>
              <p className="text-[13px] mb-2" style={{ color: 'var(--text-primary)' }}>
                <strong>{awaitingCount}</strong> report{awaitingCount === 1 ? '' : 's'} submitted and waiting for your review.
              </p>
              {awaitingModeration.map(w => (
                <Row key={w.id} to={`/teacher/hod/reporting/windows/${w.id}`}
                  right={<span className="text-[12px] font-semibold font-mono" style={{ color: 'var(--status-warning)' }}>{w.submitted}</span>}>
                  <span className="text-[13px]" style={{ color: 'var(--text-primary)' }}>{w.name}</span>
                </Row>
              ))}
            </div>
          )}
        </div>
        <div className="rounded-[var(--radius-lg)] p-5" style={{ background: 'var(--surface-card)', border: '1px solid var(--border-subtle)' }}>
          <div className="flex items-baseline justify-between mb-1">
            <span className="text-[10px] font-bold tracking-[0.08em] uppercase" style={{ color: 'var(--text-tertiary)' }}>Reporting windows</span>
            <CardLink to="/teacher/hod/reporting">Reporting</CardLink>
          </div>
          {attention === undefined ? <Loading /> : windows.length === 0 ? (
            <Empty text="No open reporting windows." cta="Open a window" to="/teacher/hod/reporting" />
          ) : (
            windows.map(w => <ReportingWindowRow key={w.id} window={w} />)
          )}
        </div>
      </div>
    </div>
  )
}

export function CurriculumSection({ single }) {
  const [classes, setClasses] = useState(undefined)
  const [lessons, setLessons] = useState(undefined)

  useEffect(() => {
    teacherService.getDashboardClasses()
      .then(res => setClasses(Array.isArray(res.data) ? res.data : []))
      .catch(() => setClasses([]))
    lessonService.list()
      .then(res => {
        const list = Array.isArray(res.data) ? res.data : []
        const upcoming = list
          .filter(l => { const d = daysUntil(l.lesson_date); return d != null && d >= 0 && d <= 7 })
          .sort((a, b) => String(a.lesson_date).localeCompare(String(b.lesson_date)))
          .slice(0, 5)
        setLessons(upcoming)
      })
      .catch(() => setLessons([]))
  }, [])

  return (
    <div>
      <SectionHeading label="Curriculum PE" single={single} />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card title="My Classes" action={<CardLink to="/teacher/classes">View all</CardLink>}>
          {classes === undefined ? <Loading /> : classes.length === 0 ? (
            <Empty text="No classes assigned yet." cta="Set up a class" to="/teacher/classes" />
          ) : classes.map(c => {
            const unit = c.current_units?.[0]
            return (
              <Row key={c.id} to={`/teacher/classes/${c.id}`}
                right={Number(c.assessments_this_term) > 0 && (
                  <span className="text-[11px] flex items-center gap-1" style={{ color: 'var(--text-secondary)' }}>
                    <ClipboardCheck size={12} />{c.assessments_this_term}
                  </span>
                )}>
                <div className="text-[13px] font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{c.name}</div>
                <div className="text-[12px]" style={{ color: 'var(--text-secondary)' }}>
                  Yr {c.year_group} · {c.pupil_count} pupils{unit ? ` · ${unit.unit_name || unit.sport}` : ''}
                </div>
              </Row>
            )
          })}
        </Card>
        <Card title="Lessons this week" action={<CardLink to="/teacher/lessons">All lessons</CardLink>}>
          {lessons === undefined ? <Loading /> : lessons.length === 0 ? (
            <Empty text="No lessons planned for the next 7 days." cta="Plan a lesson" to="/teacher/lessons" />
          ) : lessons.map(l => (
            <Row key={l.id} to="/teacher/lessons"
              right={<span className="text-[11px] font-mono" style={{ color: 'var(--text-tertiary)' }}>{fmtDate(l.lesson_date)}</span>}>
              <div className="text-[13px] font-semibold truncate flex items-center gap-1.5" style={{ color: 'var(--text-primary)' }}>
                <BookOpen size={12} style={{ color: 'var(--status-info)' }} />{l.title || 'Untitled lesson'}
              </div>
              <div className="text-[12px] truncate" style={{ color: 'var(--text-secondary)' }}>
                {[l.teaching_group_name, l.unit_name || l.sport].filter(Boolean).join(' · ')}
              </div>
            </Row>
          ))}
        </Card>
      </div>
    </div>
  )
}

function squadChip(f) {
  if (f.squad_announced) return { label: 'Squad announced', bg: 'var(--status-success-tint)', fg: 'var(--status-success)' }
  if (Number(f.squad_size) > 0) return { label: `${f.squad_size} selected`, bg: 'var(--status-warning-tint)', fg: 'var(--status-warning)' }
  return { label: 'No squad yet', bg: 'var(--status-error-tint)', fg: 'var(--status-error)' }
}

export function ExtraCurricularSection({ single }) {
  const [teams, setTeams] = useState(undefined)

  useEffect(() => {
    teacherService.getDashboardTeams()
      .then(res => setTeams(Array.isArray(res.data) ? res.data : []))
      .catch(() => setTeams([]))
  }, [])

  if (teams === undefined) {
    return (
      <div>
        <SectionHeading label="Extra-Curricular" single={single} />
        <div className="rounded-[var(--radius-lg)] p-5" style={{ background: 'var(--surface-card)', border: '1px solid var(--border-subtle)' }}><Loading /></div>
      </div>
    )
  }

  if (teams.length === 0) {
    return (
      <div>
        <SectionHeading label="Extra-Curricular" single={single} />
        <div className="rounded-[var(--radius-lg)] p-5 text-center" style={{ background: 'var(--surface-card)', border: '1px solid var(--border-subtle)' }}>
          <p className="text-[13px] italic mb-3" style={{ color: 'var(--text-tertiary)' }}>You don't run any teams yet.</p>
          <div className="flex gap-2 justify-center">
            <Link to="/teacher/teams" className="inline-flex items-center gap-1.5 px-3 py-[6px] rounded-[var(--radius-md)] text-[13px] font-semibold no-underline"
              style={{ background: 'var(--brand-primary)', color: 'var(--on-brand-primary)' }}>Set up a team</Link>
            <Link to="/teacher/sessions" className="inline-flex items-center gap-1.5 px-3 py-[6px] rounded-[var(--radius-md)] text-[13px] font-semibold no-underline"
              style={{ background: 'var(--surface-card)', color: 'var(--text-primary)', border: '1px solid var(--border-default)' }}>Plan a session</Link>
          </div>
        </div>
      </div>
    )
  }

  const upcoming = teams
    .filter(t => t.next_fixture)
    .map(t => ({ team: t, fixture: t.next_fixture }))
    .sort((a, b) => `${a.fixture.date}${a.fixture.time || ''}`.localeCompare(`${b.fixture.date}${b.fixture.time || ''}`))

  return (
    <div>
      <SectionHeading label="Extra-Curricular" single={single} />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card title="Upcoming fixtures" action={<CardLink to="/teacher/fixtures">All fixtures</CardLink>}>
          {upcoming.length === 0 ? (
            <Empty text="No upcoming fixtures." cta="Create a fixture" to="/teacher/fixtures" />
          ) : upcoming.map(({ team, fixture: f }) => {
            const chip = squadChip(f)
            return (
              <Row key={f.id} to={`/teacher/match/${f.id}`}
                right={<span className="text-[10.5px] font-semibold px-2 py-[2px] rounded-full whitespace-nowrap" style={{ background: chip.bg, color: chip.fg }}>{chip.label}</span>}>
                <div className="text-[13px] font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
                  {team.name} {f.home_away === 'home' ? 'vs' : 'at'} {f.opponent}
                </div>
                <div className="text-[12px] flex items-center gap-1.5" style={{ color: 'var(--text-secondary)' }}>
                  <Calendar size={11} />{fmtDate(f.date)}{f.time ? ` · ${hhmm(f.time)}` : ''}{f.location ? ` · ${f.location}` : ''}
                </div>
              </Row>
            )
          })}
        </Card>
        <Card title="My Teams" action={<CardLink to="/teacher/teams">View all</CardLink>}>
          {teams.map(t => (
            <Row key={t.id} to={`/teacher/teams/${t.id}`} right={resultBadge(t.last_result)}>
              <div className="text-[13px] font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{t.name}</div>
              <div className="text-[12px] truncate" style={{ color: 'var(--text-secondary)' }}>
                {[t.sport, t.age_group].filter(Boolean).join(' · ')} · {t.pupil_count} pupils
                {t.next_training ? ` · Training ${fmtDate(t.next_training.date)}${t.next_training.time ? ` ${hhmm(t.next_training.time)}` : ''}` : ''}
              </div>
            </Row>
          ))}
        </Card>
      </div>
    </div>
  )
}
