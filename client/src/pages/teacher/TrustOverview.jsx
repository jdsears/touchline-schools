import { useState, useEffect } from 'react'
import { hodService } from '../../services/api'
import { Building2, Users, Shield, Trophy, Mic, AlertTriangle, FileBarChart, ShieldCheck, Loader2, ArrowRight, CheckCircle } from 'lucide-react'

// One row per school the signed-in leader oversees (a trust or federation
// PE lead, or a site admin). Numbers come straight from each school's data
// for the current week; "Open" switches the whole app into that school.

function fmtDate(d) {
  return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

const ROLE_LABEL = { owner: 'Owner', school_admin: 'School admin', admin: 'Admin', head_of_pe: 'Head of PE', head_of_sport: 'Head of Sport' }

function Stat({ icon: Icon, label, value }) {
  return (
    <div className="inline-flex items-center gap-1.5 text-sm whitespace-nowrap">
      <Icon className="w-4 h-4 text-tertiary shrink-0" />
      <span className="text-primary font-semibold tabular-nums">{value}</span>
      <span className="text-secondary">{label}</span>
    </div>
  )
}

function AttentionChip({ icon: Icon, count, label, tone }) {
  if (!count) return null
  const cls = tone === 'error' ? 'bg-status-error-tint text-status-error' : 'bg-brand-accent-tint text-brand-accent'
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${cls}`}>
      <Icon className="w-3 h-3" /> {count} {label}
    </span>
  )
}

export default function TrustOverview() {
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    hodService.getSchools()
      .then(res => setData(res.data))
      .catch(err => setError(err.response?.data?.error || 'Could not load your schools'))
  }, [])

  function open(id) {
    try { localStorage.setItem('active_school_id', id) } catch { /* storage blocked */ }
    window.location.assign('/teacher/hod')
  }

  if (error) return <div className="p-6 text-sm text-status-error">{error}</div>
  if (!data) return <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-secondary" /></div>

  const schools = data.schools || []
  const totals = schools.reduce((t, s) => ({
    pupils: t.pupils + s.pupils, staff: t.staff + s.staff, teams: t.teams + s.teams,
    fixtures: t.fixtures + s.fixtures_this_week, observations: t.observations + s.observations_this_week,
    attention: t.attention + s.attention,
  }), { pupils: 0, staff: 0, teams: 0, fixtures: 0, observations: 0, attention: 0 })

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="font-display text-2xl md:text-3xl font-bold tracking-[-0.015em] text-primary flex items-center gap-3">
          <Building2 className="w-6 h-6 text-brand-accent" /> Trust overview
        </h1>
        <p className="text-secondary text-sm mt-0.5">
          {schools.length} school{schools.length === 1 ? '' : 's'} · week of {fmtDate(data.week_start)} – {fmtDate(data.week_end)}
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          ['Pupils', totals.pupils], ['Staff', totals.staff], ['Teams', totals.teams],
          ['Fixtures this week', totals.fixtures], ['Observations this week', totals.observations], ['Needs attention', totals.attention],
        ].map(([label, value]) => (
          <div key={label} className="bg-card rounded-xl border border-border-default px-4 py-3">
            <p className="text-2xl font-bold text-primary tabular-nums">{value}</p>
            <p className="text-xs text-secondary">{label}</p>
          </div>
        ))}
      </div>

      <div className="space-y-3">
        {schools.map(s => (
          <div key={s.id} className="bg-card rounded-xl border border-border-default p-5 flex flex-col lg:flex-row lg:items-center gap-4">
            <div className="flex items-center gap-3 min-w-[260px]">
              <span className="w-10 h-10 rounded-lg inline-flex items-center justify-center text-sm font-bold text-white shrink-0"
                style={{ background: s.primary_color || 'var(--brand-primary)' }}>
                {(s.name || '').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
              </span>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-semibold text-primary truncate">{s.name}</h2>
                  {s.active && <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-full bg-status-success-tint text-status-success"><CheckCircle className="w-3 h-3" /> Current</span>}
                </div>
                <p className="text-xs text-secondary">{ROLE_LABEL[s.role] || String(s.role || '').replace(/_/g, ' ')}</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-x-5 gap-y-1.5 flex-1">
              <Stat icon={Users} label="pupils" value={s.pupils} />
              <Stat icon={Shield} label="teams" value={s.teams} />
              <Stat icon={Users} label="staff" value={s.staff} />
              <Stat icon={Trophy} label="fixtures this week" value={s.fixtures_this_week} />
              <Stat icon={Mic} label="observations this week" value={s.observations_this_week} />
            </div>
            <div className="flex flex-wrap items-center gap-1.5 lg:max-w-[260px]">
              <AttentionChip icon={AlertTriangle} count={s.open_safeguarding} label="safeguarding open" tone="error" />
              <AttentionChip icon={FileBarChart} count={s.reports_awaiting} label="reports to moderate" />
              <AttentionChip icon={Mic} count={s.pending_voice} label="voice notes to review" />
              <AttentionChip icon={ShieldCheck} count={s.consents_expiring} label="consents expiring" />
              {s.attention === 0 && <span className="text-xs text-tertiary">Nothing waiting</span>}
            </div>
            <button onClick={() => open(s.id)} disabled={s.active}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold bg-brand-primary text-on-dark disabled:opacity-40 shrink-0">
              {s.active ? 'Open now' : 'Open'} <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
