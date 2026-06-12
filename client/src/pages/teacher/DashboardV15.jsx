import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { teacherService, hodService } from '../../services/api'
import { RefreshCw, Sparkles, ChevronRight, CheckCircle, Calendar, Clock, AlertTriangle, Settings } from 'lucide-react'
import { CalendarStrip, AttentionQueue, ROLE_DOTS, ROLE_TAG } from '../../components/CalendarStrip'

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

function parseEventTime(ev) {
  const t = ev.time || ev.session_time || ev.match_time || ''
  const parts = t.match(/(\d+):(\d+)/)
  if (!parts) return null
  return parseInt(parts[1]) + parseInt(parts[2]) / 60
}

function TodaySection({ roles }) {
  const label = roles.includes('schoolAdmin') ? 'Across the school today'
    : roles.includes('hod') ? 'Today in your department' : "Today's schedule"
  const emptyMsg = roles.includes('schoolAdmin') ? 'Nothing scheduled across the school today.' : 'Nothing scheduled today.'

  const [rawEvents, setRawEvents] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    teacherService.getDashboardToday()
      .then(res => setRawEvents(res.data?.sessions || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const calEvents = rawEvents.map((ev, i) => {
    const startH = parseEventTime(ev) || 9
    return {
      start: startH, end: startH + 1, lane: i % 2,
      label: ev.name || ev.team_name || 'Session',
      role: ev.type === 'fixture' ? 'teacherExtraCurricular' : 'teacherCurriculum',
    }
  })

  const attentionActions = [
    { role: 'teacherExtraCurricular', verb: 'Confirm squad', subject: 'vs Whitfield Grove, Thu 14:30', deadline: 'Tomorrow', urgency: 'medium' },
  ]

  const visibleRoles = roles.filter(r => ROLE_DOTS[r])
  const showLegend = visibleRoles.length > 1

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

      {calEvents.length === 0 && !loading ? (
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
        <div className="px-5 pb-2">
          <CalendarStrip events={calEvents} />
        </div>
      )}

      {/* Attention queue */}
      <div style={{ background: 'var(--surface-sunken)' }}>
        <div className="px-5 py-[10px] flex items-center justify-between">
          <span className="text-[13px] font-semibold" style={{ color: 'var(--text-primary)' }}>
            Needs your attention · {attentionActions.length}
          </span>
          <button className="text-[12px] font-semibold" style={{ color: 'var(--brand-primary)' }}>View all</button>
        </div>
        <AttentionQueue actions={attentionActions} />
      </div>
    </div>
  )
}

import { HoDSection, CurriculumSection, ExtraCurricularSection } from '../../components/DashboardSections'

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
                  ['briefing', 'Morning briefing'],
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

      {!hidden.includes('briefing') && <BriefingCard />}
      {!hidden.includes('today') && <TodaySection roles={roles} />}

      {/* Role sections in priority order */}
      {!hidden.includes('hod') && (roles.includes('schoolAdmin') || roles.includes('hod')) && (
        <HoDSection single={roles.length <= 2} />
      )}
      {!hidden.includes('curriculum') && <CurriculumSection single={roles.length <= 2} />}
      {!hidden.includes('extra') && <ExtraCurricularSection single={roles.length <= 2} />}
    </div>
  )
}
