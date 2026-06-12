import { Link } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { hodService } from '../services/api'
import { StatCard } from './common/ui'
import { Clock, ChevronRight, TrendingUp, TrendingDown } from 'lucide-react'

function ReportingWindowRow({ name, completed, total, dueLabel, dueTone = 'neutral' }) {
  const pct = Math.round((completed / total) * 100)
  const isComplete = completed === total
  const barColor = isComplete ? 'var(--status-success)' : dueTone === 'warning' ? 'var(--status-warning)' : 'var(--brand-primary)'
  return (
    <div className="py-3" style={{ borderTop: '1px solid var(--border-subtle)' }}>
      <div className="flex items-baseline justify-between mb-1.5">
        <span className="text-[13px] font-semibold" style={{ color: 'var(--text-primary)' }}>{name}</span>
        <span className="text-[12px] font-semibold font-mono" style={{ color: isComplete ? 'var(--status-success)' : 'var(--text-primary)' }}>{completed}/{total}</span>
      </div>
      <div className="h-1.5 rounded-full overflow-hidden mb-1.5" style={{ background: 'var(--surface-sunken)' }}>
        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: barColor }} />
      </div>
      <div className="flex items-center gap-1.5 text-[11.5px]" style={{ color: 'var(--text-tertiary)' }}>
        <Clock size={11} /><span>{dueLabel}</span>
      </div>
    </div>
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
  // Live weekly metrics - these were hardcoded demo values until v1.6
  const [weekly, setWeekly] = useState(null)
  useEffect(() => {
    hodService.getSchoolOverviewWeekly()
      .then(res => setWeekly(res.data))
      .catch(() => setWeekly(null))
  }, [])

  const staff = weekly?.staff_activity || []
  const activeStaff = staff.filter(t => Number(t.observations_logged) > 0 || Number(t.reports_updated) > 0).length
  const fixturesThisWeek = (weekly?.fixtures || []).length

  return (
    <div>
      <SectionHeading label="Head of Department" single={single} />
      <div className="flex gap-3 mb-4 flex-wrap">
        <StatCard label="Sports active" value={weekly ? Number(weekly.participation?.sports_active) || 0 : null} sub="Across all year groups" />
        <StatCard label="Pupils involved" value={weekly ? Number(weekly.participation?.unique_pupils) || 0 : null} sub="In teams and classes" />
        <StatCard label="Staff activity" value={weekly ? activeStaff : null} suffix={weekly && staff.length ? `/${staff.length}` : ''} sub="Logged this week" />
        <StatCard label="Fixtures this week" value={weekly ? fixturesThisWeek : null} sub="Across all teams" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-[var(--radius-lg)] p-5" style={{ background: 'var(--surface-card)', border: '1px solid var(--border-subtle)' }}>
          <div className="flex items-baseline justify-between mb-3">
            <span className="text-[10px] font-bold tracking-[0.08em] uppercase" style={{ color: 'var(--text-tertiary)' }}>Assessment moderation</span>
          </div>
          <p className="text-[13px] italic" style={{ color: 'var(--text-tertiary)' }}>No assessments awaiting moderation.</p>
        </div>
        <div className="space-y-4">
          <div className="rounded-[var(--radius-lg)] p-5" style={{ background: 'var(--surface-card)', border: '1px solid var(--border-subtle)' }}>
            <div className="flex items-baseline justify-between mb-1">
              <span className="text-[10px] font-bold tracking-[0.08em] uppercase" style={{ color: 'var(--text-tertiary)' }}>Reporting windows</span>
              <Link to="/teacher/hod/reporting" className="text-[12px] font-semibold" style={{ color: 'var(--brand-primary)' }}>Reporting</Link>
            </div>
            <ReportingWindowRow name="Spring Report 2026 · Y7" completed={4} total={4} dueLabel="Closed Tue 31 Mar" />
            <ReportingWindowRow name="Spring Report 2026 · Y8" completed={14} total={31} dueLabel="Closes Thu 30 Apr" dueTone="warning" />
          </div>
        </div>
      </div>
    </div>
  )
}

export function CurriculumSection({ single }) {
  return (
    <div>
      <SectionHeading label="Curriculum PE" single={single} />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded-[var(--radius-lg)] p-5" style={{ background: 'var(--surface-card)', border: '1px solid var(--border-subtle)' }}>
          <h3 className="text-[15px] font-semibold tracking-[-0.005em] mb-3" style={{ color: 'var(--text-primary)' }}>My Classes</h3>
          <p className="text-[13px] italic text-center py-4" style={{ color: 'var(--text-tertiary)' }}>No classes assigned yet</p>
        </div>
        <div className="rounded-[var(--radius-lg)] p-5" style={{ background: 'var(--surface-card)', border: '1px solid var(--border-subtle)' }}>
          <h3 className="text-[15px] font-semibold tracking-[-0.005em] mb-3" style={{ color: 'var(--text-primary)' }}>My Teams</h3>
          <p className="text-[13px] italic text-center py-4" style={{ color: 'var(--text-tertiary)' }}>No teams assigned yet</p>
        </div>
      </div>
    </div>
  )
}

export function ExtraCurricularSection({ single }) {
  return (
    <div>
      <SectionHeading label="Extra-Curricular" single={single} />
      <div className="rounded-[var(--radius-lg)] p-5 text-center" style={{ background: 'var(--surface-card)', border: '1px solid var(--border-subtle)' }}>
        <p className="text-[13px] italic mb-3" style={{ color: 'var(--text-tertiary)' }}>No fixtures or training scheduled</p>
        <div className="flex gap-2 justify-center">
          <Link to="/teacher/fixtures" className="inline-flex items-center gap-1.5 px-3 py-[6px] rounded-[var(--radius-md)] text-[13px] font-semibold"
            style={{ background: 'var(--brand-primary)', color: 'var(--on-brand-primary)' }}>Create a fixture</Link>
          <Link to="/teacher/sessions" className="inline-flex items-center gap-1.5 px-3 py-[6px] rounded-[var(--radius-md)] text-[13px] font-semibold"
            style={{ background: 'var(--surface-card)', color: 'var(--text-primary)', border: '1px solid var(--border-default)' }}>Plan a session</Link>
        </div>
      </div>
    </div>
  )
}
