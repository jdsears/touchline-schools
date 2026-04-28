import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { teamService } from '../../services/api'
import { CheckCircle, Circle, AlertTriangle, ChevronRight, Sparkles, MessageSquare, Video, Loader2 } from 'lucide-react'
import MatchHeader from '../../components/MatchHeader'
import TabStrip from '../../components/TabStrip'

const MATCH_TABS = [
  { id: 'overview', label: 'Overview', href: '' },
  { id: 'squad', label: 'Squad', href: '/squad' },
  { id: 'prep', label: 'Match Prep', href: '/prep' },
  { id: 'report', label: 'Report', href: '/report' },
  { id: 'video', label: 'Video', href: '/video' },
]

function ReadinessRow({ state, title, meta, detail, actionLabel, actionHref }) {
  const tone = {
    done: { bg: 'var(--status-success-tint)', fg: 'var(--status-success)', Icon: CheckCircle },
    pending: { bg: 'var(--surface-sunken)', fg: 'var(--text-tertiary)', Icon: Circle },
    blocked: { bg: 'var(--status-warning-tint)', fg: 'var(--status-warning)', Icon: AlertTriangle },
  }[state] || { bg: 'var(--surface-sunken)', fg: 'var(--text-tertiary)', Icon: Circle }

  return (
    <div className="grid grid-cols-[auto_1fr_auto] items-center gap-[14px] py-[14px] border-b border-[var(--border-subtle)] last:border-0">
      <span className="w-7 h-7 rounded-full inline-flex items-center justify-center shrink-0"
        style={{ background: tone.bg, color: tone.fg }}>
        <tone.Icon size={state === 'pending' ? 8 : 14} strokeWidth={2.2} />
      </span>
      <div className="flex flex-col gap-0.5 min-w-0">
        <div className="flex items-baseline gap-2 flex-wrap">
          <span className="text-[14px] font-semibold" style={{ color: state === 'pending' ? 'var(--text-secondary)' : 'var(--text-primary)' }}>{title}</span>
          {meta && <span className="text-[12px] font-medium" style={{ color: 'var(--text-tertiary)' }}>{meta}</span>}
        </div>
        {detail && <span className="text-[12.5px]" style={{ color: 'var(--text-secondary)' }}>{detail}</span>}
      </div>
      {actionLabel && (
        <Link to={actionHref || '#'} className="inline-flex items-center gap-1 px-[10px] py-[5px] rounded-[var(--radius-md)] text-[12px] font-semibold"
          style={{ background: 'transparent', color: 'var(--text-secondary)', border: '1px solid var(--border-default)' }}>
          {actionLabel} <ChevronRight size={12} />
        </Link>
      )}
    </div>
  )
}

function ReadinessPanel({ match, matchId }) {
  const checklist = [
    { state: match?.squad_announced ? 'done' : 'pending', title: match?.squad_announced ? 'Squad confirmed' : 'Squad not confirmed', actionLabel: 'Open Squad', actionHref: `/teacher/match/${matchId}/squad` },
    { state: 'pending', title: 'Formation', detail: 'Set your starting formation', actionLabel: 'Open Match Prep', actionHref: `/teacher/match/${matchId}/prep` },
    { state: match?.kit_type ? 'done' : 'blocked', title: match?.kit_type ? `Kit: ${match.kit_type}` : 'Kit not yet chosen', meta: match?.kit_type ? '' : '', actionLabel: 'Choose kit', actionHref: '#kit' },
    { state: 'pending', title: 'Tactical briefing', detail: 'Not yet reviewed', actionLabel: 'Open briefing', actionHref: `/teacher/match/${matchId}/prep?briefing=open` },
  ]
  const done = checklist.filter(c => c.state === 'done').length

  return (
    <div className="rounded-[var(--radius-lg)] border border-[var(--border-subtle)] bg-[var(--surface-card)] shadow-[var(--shadow-sm)]">
      <div className="px-5 pt-5 pb-3">
        <h2 className="text-[17px] font-semibold tracking-[-0.01em] m-0" style={{ color: 'var(--text-primary)' }}>Match readiness</h2>
        <span className="text-[13px]" style={{ color: 'var(--text-secondary)' }}>{done} of {checklist.length} steps complete</span>
        <div className="mt-2 h-[5px] rounded-full overflow-hidden" style={{ background: 'var(--border-subtle)' }}>
          <div className="h-full rounded-full transition-all" style={{ width: `${(done / checklist.length) * 100}%`, background: 'var(--status-success)' }} />
        </div>
      </div>
      <div className="px-5 pb-4">
        {checklist.map((item, i) => <ReadinessRow key={i} {...item} />)}
      </div>
    </div>
  )
}

function OppositionCard({ match }) {
  return (
    <div className="rounded-[var(--radius-lg)] border border-[var(--border-subtle)] bg-[var(--surface-card)] shadow-[var(--shadow-sm)]">
      <div className="px-5 pt-5 pb-3">
        <div className="flex items-center gap-3">
          <span className="w-6 h-6 rounded-[var(--crest-radius)] inline-flex items-center justify-center text-[9px] font-bold"
            style={{ background: 'var(--brand-primary-tint)', color: 'var(--brand-primary)' }}>
            {(match?.opponent || '??').slice(0, 2).toUpperCase()}
          </span>
          <span className="text-[14px] font-semibold" style={{ color: 'var(--text-primary)' }}>{match?.opponent}</span>
        </div>
      </div>
      <div className="px-5 pb-4">
        <span className="text-[10px] font-bold tracking-[0.1em] uppercase" style={{ color: 'var(--brand-accent)' }}>Last meetings</span>
        <p className="text-[13px] italic mt-2" style={{ color: 'var(--text-tertiary)' }}>No previous meetings logged.</p>
      </div>
    </div>
  )
}

function AIShortcuts({ matchId }) {
  const cards = [
    { icon: Sparkles, title: 'AI tactical briefing', desc: 'Review AI-generated tactical analysis', cta: 'Open briefing', href: `/teacher/match/${matchId}/prep?briefing=open` },
    { icon: MessageSquare, title: 'Chat about this match', desc: 'Ask questions about the fixture', cta: 'Ask a question', href: '/teacher/assistant' },
    { icon: Video, title: 'Add video', desc: 'No clips uploaded yet', cta: 'Upload', href: `/teacher/match/${matchId}/video` },
  ]
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
      {cards.map(c => (
        <Link key={c.title} to={c.href} className="rounded-[var(--radius-lg)] border border-[var(--border-subtle)] bg-[var(--surface-card)] shadow-[var(--shadow-sm)] p-4 relative block transition-shadow hover:shadow-[var(--shadow-md)]">
          <c.icon size={12} className="absolute top-4 right-4" style={{ color: 'var(--brand-accent)' }} />
          <h3 className="text-[14px] font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>{c.title}</h3>
          <p className="text-[12.5px] mb-3" style={{ color: 'var(--text-secondary)' }}>{c.desc}</p>
          <span className="text-[12px] font-semibold" style={{ color: 'var(--brand-primary)' }}>{c.cta} &rarr;</span>
        </Link>
      ))}
    </div>
  )
}

export default function MatchOverviewV15() {
  const { id } = useParams()
  const [match, setMatch] = useState(null)
  const [team, setTeam] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!id) return
    teamService.getMatch(id)
      .then(async res => {
        setMatch(res.data)
        if (res.data.team_id) {
          const t = await teamService.getTeam(res.data.team_id)
          setTeam(t.data)
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [id])

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin" style={{ color: 'var(--text-tertiary)' }} /></div>
  if (!match) return <div className="text-center py-20 text-[14px]" style={{ color: 'var(--text-tertiary)' }}>Match not found</div>

  return (
    <div className="max-w-[1100px] mx-auto px-7 py-6">
      <MatchHeader match={match} team={team} />
      <div className="mb-5 sticky top-0 z-10 py-2" style={{ background: 'var(--surface-page)' }}>
        <TabStrip tabs={MATCH_TABS} basePath={`/teacher/match/${id}`} />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-[3fr_2fr] gap-5">
        <div className="space-y-5">
          <ReadinessPanel match={match} matchId={id} />
          <AIShortcuts matchId={id} />
        </div>
        <div className="space-y-5">
          <OppositionCard match={match} />
        </div>
      </div>
    </div>
  )
}
