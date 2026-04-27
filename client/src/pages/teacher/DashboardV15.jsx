import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { teacherService, hodService } from '../../services/api'
import { RefreshCw, Sparkles, ChevronRight, CheckCircle, Calendar, Clock, AlertTriangle, Settings } from 'lucide-react'

function greetingFor(hour) {
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}

function formatDate() {
  return new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
}

function BriefingCard() {
  const [state, setState] = useState('quiet')
  const now = new Date()
  const time = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`

  return (
    <div className="relative overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border-subtle)] bg-[var(--surface-card)] shadow-[var(--shadow-sm)] mb-[18px]">
      <div className="absolute top-0 left-0 bottom-0 w-[3px]" style={{ background: 'var(--brand-accent)' }} />
      <div className="py-4 px-[18px] pl-[22px]">
        <div className="flex items-center gap-2 mb-[10px]">
          <span className="w-[22px] h-[22px] rounded-full inline-flex items-center justify-center shrink-0"
            style={{ background: 'var(--brand-primary)', color: 'var(--brand-accent)' }}>
            <Sparkles size={11} />
          </span>
          <span className="text-[10.5px] font-bold tracking-[0.1em] uppercase" style={{ color: 'var(--brand-primary)' }}>
            Morning briefing
          </span>
          <span className="text-[9.5px] font-bold tracking-[0.06em] px-1.5 py-px rounded-full"
            style={{ background: 'var(--brand-primary)', color: 'var(--brand-accent)' }}>AI</span>
          <span className="flex-1" />
          <span className="text-[11px] font-mono" style={{ color: 'var(--text-tertiary)' }}>Refreshed {time}</span>
          <button className="inline-flex items-center gap-[5px] px-2 py-1 rounded-[var(--radius-md)] text-[11.5px] font-semibold cursor-pointer"
            style={{ background: 'transparent', border: '1px solid var(--border-subtle)', color: 'var(--text-secondary)' }}>
            <RefreshCw size={11} /> Refresh
          </button>
        </div>

        <p className="text-[14px] leading-[1.55] font-medium m-0" style={{ color: 'var(--text-primary)' }}>
          All quiet today. Nothing flagged across your department, no fixtures or assessments outstanding.
        </p>
        <div className="flex items-center gap-2 mt-[10px] text-[12.5px]" style={{ color: 'var(--text-secondary)' }}>
          <CheckCircle size={14} style={{ color: 'var(--status-success)' }} />
          <span>A good day to plan ahead -- review next week's fixtures or moderate any pending grades.</span>
        </div>
      </div>
    </div>
  )
}

function TodaySection({ roles }) {
  const label = roles.includes('schoolAdmin') ? 'Across the school today'
    : roles.includes('hod') ? 'Today in your department' : "Today's schedule"

  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    teacherService.getDashboardToday()
      .then(res => setEvents(res.data?.sessions || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="rounded-[var(--radius-lg)] border border-[var(--border-subtle)] bg-[var(--surface-card)] shadow-[var(--shadow-sm)] mb-6">
      <div className="px-5 pt-4 pb-3 flex items-center justify-between">
        <span className="text-[10px] font-bold tracking-[0.1em] uppercase" style={{ color: 'var(--brand-accent)' }}>
          {label}
        </span>
      </div>

      {events.length === 0 && !loading ? (
        <div className="px-5 pb-5 text-center">
          <Calendar size={24} className="mx-auto mb-2" style={{ color: 'var(--text-tertiary)' }} />
          <p className="text-[13px] italic" style={{ color: 'var(--text-tertiary)' }}>
            {roles.includes('schoolAdmin') ? 'Nothing scheduled across the school today.' : 'Nothing scheduled today.'}
          </p>
          <div className="flex gap-2 justify-center mt-3">
            <Link to="/teacher/fixtures" className="inline-flex items-center gap-1.5 px-3 py-[6px] rounded-[var(--radius-md)] text-[13px] font-semibold"
              style={{ background: 'var(--brand-primary)', color: 'var(--on-brand-primary)' }}>Schedule a fixture</Link>
            <Link to="/teacher/lessons" className="inline-flex items-center gap-1.5 px-3 py-[6px] rounded-[var(--radius-md)] text-[13px] font-semibold"
              style={{ background: 'var(--surface-card)', color: 'var(--text-primary)', border: '1px solid var(--border-default)' }}>Plan a lesson</Link>
          </div>
        </div>
      ) : (
        <div className="px-5 pb-4 space-y-2">
          {events.slice(0, 5).map((ev, i) => (
            <div key={i} className="flex items-center gap-3 py-2 px-3 rounded-[var(--radius-md)]"
              style={{ background: 'var(--surface-sunken)', border: '1px solid var(--border-subtle)' }}>
              <span className="text-[12px] font-mono tabular-nums shrink-0" style={{ color: 'var(--text-tertiary)' }}>
                {ev.time || ev.session_time || '--:--'}
              </span>
              <div className="flex-1 min-w-0">
                <span className="text-[13px] font-medium truncate block" style={{ color: 'var(--text-primary)' }}>
                  {ev.name || ev.team_name || 'Session'}
                </span>
                <span className="text-[11px] truncate block" style={{ color: 'var(--text-tertiary)' }}>
                  {ev.focus || ev.location || ''}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function DashboardV15() {
  const { user } = useAuth()
  const [isHoD, setIsHoD] = useState(false)
  const [schoolRole, setSchoolRole] = useState(null)
  const firstName = user?.name?.split(' ')[0] || 'there'
  const hour = new Date().getHours()

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
    <div className="max-w-[860px] mx-auto px-7 py-6">
      {/* Page header */}
      <div className="flex items-baseline justify-between gap-4 mb-4">
        <div>
          <h1 className="text-[26px] font-bold tracking-[-0.015em] leading-[1.15] m-0" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-display)' }}>
            {greetingFor(hour)}, {firstName}.
          </h1>
          <p className="text-[13.5px] mt-1" style={{ color: 'var(--text-tertiary)' }}>{formatDate()}</p>
        </div>
        <button className="inline-flex items-center gap-1.5 px-3 py-[6px] rounded-[var(--radius-md)] text-[13px] font-semibold cursor-pointer"
          style={{ background: 'transparent', border: '1px solid transparent', color: 'var(--text-primary)' }}>
          <Settings size={14} /> Customise
        </button>
      </div>

      <BriefingCard />
      <TodaySection roles={roles} />
    </div>
  )
}
