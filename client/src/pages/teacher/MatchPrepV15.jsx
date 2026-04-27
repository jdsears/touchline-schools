import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { teamService } from '../../services/api'
import { CheckCircle, Circle, AlertTriangle, Sparkles, ChevronRight, Loader2, X, FileText, Users, Shirt } from 'lucide-react'
import MatchHeader from '../../components/MatchHeader'
import FormationEditor from '../../components/FormationEditor'

const SECTIONS = [
  { id: 'formation', label: 'Formation', icon: '⚽' },
  { id: 'briefing', label: 'Briefing', icon: '🧠' },
  { id: 'opposition', label: 'Opposition', icon: '🔍' },
  { id: 'set-pieces', label: 'Set pieces', icon: '📐' },
  { id: 'talking-pts', label: 'Talking points', icon: '💬' },
  { id: 'squad', label: 'Squad', icon: '👥' },
  { id: 'kit', label: 'Kit', icon: '👕' },
]

function PrepRail({ activeId, onSelect }) {
  return (
    <nav className="sticky top-0 space-y-0.5">
      {SECTIONS.map(s => {
        const active = activeId === s.id
        return (
          <button key={s.id} onClick={() => onSelect(s.id)}
            className={`w-full flex items-center gap-2 px-3 py-2 rounded-[var(--radius-md)] text-left text-[13px] font-medium transition-colors
              ${active ? 'font-semibold' : ''}`}
            style={{
              background: active ? 'var(--brand-accent-tint)' : 'transparent',
              color: active ? 'var(--brand-primary)' : 'var(--text-secondary)',
              borderLeft: active ? '2px solid var(--brand-accent)' : '2px solid transparent',
            }}>
            <span className="text-[12px]">{s.icon}</span>
            {s.label}
          </button>
        )
      })}
    </nav>
  )
}

function SuggestAIButton({ onClick }) {
  return (
    <button onClick={onClick}
      className="inline-flex items-center gap-1.5 px-3 py-[5px] rounded-[var(--radius-md)] text-[12px] font-semibold"
      style={{ color: 'var(--brand-primary)', border: '1px solid var(--brand-accent)', background: 'transparent' }}>
      <Sparkles size={12} style={{ color: 'var(--brand-accent)' }} /> Suggest with AI
    </button>
  )
}

function ContentBlock({ id, title, children, showAI }) {
  return (
    <div id={`prep-${id}`} className="rounded-[var(--radius-lg)] border border-[var(--border-subtle)] bg-[var(--surface-card)] shadow-[var(--shadow-sm)] mb-4">
      <div className="px-5 pt-4 pb-3 flex items-center justify-between">
        <h3 className="text-[15px] font-semibold tracking-[-0.005em]" style={{ color: 'var(--text-primary)' }}>{title}</h3>
        {showAI && <SuggestAIButton />}
      </div>
      <div className="px-5 pb-4">{children}</div>
    </div>
  )
}

function ReadOnlyBlock({ icon: Icon, title, summary, linkLabel, linkHref }) {
  return (
    <div className="rounded-[var(--radius-lg)] border border-dashed border-[var(--border-default)] bg-[var(--surface-sunken)] p-4 flex items-center gap-3 mb-4">
      <span className="w-8 h-8 rounded-[var(--radius-md)] inline-flex items-center justify-center shrink-0"
        style={{ background: 'var(--brand-primary-tint)', color: 'var(--brand-primary)' }}>
        <Icon size={16} />
      </span>
      <div className="flex-1 min-w-0">
        <span className="text-[13px] font-semibold block" style={{ color: 'var(--text-primary)' }}>{title}</span>
        <span className="text-[12px] block" style={{ color: 'var(--text-secondary)' }}>{summary}</span>
      </div>
      <Link to={linkHref || '#'} className="text-[12px] font-semibold inline-flex items-center gap-1"
        style={{ color: 'var(--brand-primary)' }}>
        {linkLabel} <ChevronRight size={12} />
      </Link>
    </div>
  )
}

export default function MatchPrepV15() {
  const { id } = useParams()
  const [match, setMatch] = useState(null)
  const [team, setTeam] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activeSection, setActiveSection] = useState('formation')
  const [briefingOpen, setBriefingOpen] = useState(false)

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
    <div className="max-w-[1200px] mx-auto px-7 py-6">
      <MatchHeader match={match} team={team} />

      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-[20px] font-bold tracking-[-0.015em]" style={{ color: 'var(--text-primary)' }}>Match prep</h2>
          <p className="text-[13px]" style={{ color: 'var(--text-secondary)' }}>Prepare your team for the fixture</p>
        </div>
        {!briefingOpen && (
          <button onClick={() => setBriefingOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-[6px] rounded-[var(--radius-md)] text-[13px] font-semibold"
            style={{ background: 'var(--brand-primary)', color: 'var(--on-brand-primary)' }}>
            <Sparkles size={13} /> Open AI tactical briefing
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[200px_1fr] gap-5" style={{ gridTemplateColumns: briefingOpen ? '200px 1fr 380px' : '200px 1fr' }}>
        <PrepRail activeId={activeSection} onSelect={setActiveSection} />

        <div>
          <div id="prep-formation" className="mb-4">
            <FormationEditor format={team?.team_format ? `${team.team_format}v${team.team_format}` : '11v11'} />
          </div>

          <ContentBlock id="opposition" title="Opposition notes" showAI>
            <textarea rows={4} placeholder="Notes about the opposition..."
              className="w-full rounded-[var(--radius-md)] border border-[var(--border-default)] p-3 text-[14px] resize-none"
              style={{ background: 'var(--surface-card)', color: 'var(--text-primary)' }} />
          </ContentBlock>

          <ContentBlock id="set-pieces" title="Set pieces" showAI>
            <textarea rows={3} placeholder="Corners, free kicks, penalties..."
              className="w-full rounded-[var(--radius-md)] border border-[var(--border-default)] p-3 text-[14px] resize-none"
              style={{ background: 'var(--surface-card)', color: 'var(--text-primary)' }} />
          </ContentBlock>

          <ContentBlock id="talking-pts" title="Pre-match talking points" showAI>
            <textarea rows={3} placeholder="Key messages for the team..."
              className="w-full rounded-[var(--radius-md)] border border-[var(--border-default)] p-3 text-[14px] resize-none"
              style={{ background: 'var(--surface-card)', color: 'var(--text-primary)' }} />
          </ContentBlock>

          <ReadOnlyBlock icon={Users} title="Squad" summary="Read from Squad tab" linkLabel="Edit on Squad" linkHref="#" />
          <ReadOnlyBlock icon={Shirt} title="Kit" summary={match.kit_type || 'Not chosen'} linkLabel="Edit on Overview" linkHref="#" />

          <div className="sticky bottom-0 py-4" style={{ background: 'var(--surface-page)' }}>
            <button className="w-full py-3 rounded-[var(--radius-md)] text-[14px] font-semibold"
              style={{ background: 'var(--brand-primary)', color: 'var(--on-brand-primary)' }}>
              Mark prep complete
            </button>
          </div>
        </div>

        {briefingOpen && (
          <div className="rounded-[var(--radius-lg)] border border-[var(--border-subtle)] bg-[var(--surface-card)] shadow-[var(--shadow-sm)] h-fit sticky top-0">
            <div className="px-5 pt-4 pb-3 flex items-center justify-between border-b border-[var(--border-subtle)]">
              <div className="flex items-center gap-2">
                <span className="text-[14px] font-semibold" style={{ color: 'var(--text-primary)' }}>Tactical briefing</span>
                <span className="text-[9.5px] font-bold px-1.5 py-px rounded-full"
                  style={{ background: 'var(--brand-primary)', color: 'var(--brand-accent)' }}>AI</span>
              </div>
              <button onClick={() => setBriefingOpen(false)} className="p-1" style={{ color: 'var(--text-tertiary)' }}><X size={16} /></button>
            </div>
            <div className="px-5 py-4">
              <p className="text-[11px] mb-4" style={{ color: 'var(--text-tertiary)' }}>
                Synthesised from last meetings, scouting notes, and squad availability.
              </p>
              <div className="text-center py-8">
                <Sparkles size={24} className="mx-auto mb-2" style={{ color: 'var(--text-tertiary)' }} />
                <p className="text-[13px] italic" style={{ color: 'var(--text-tertiary)' }}>
                  Tactical briefing not yet generated.
                </p>
                <button className="mt-3 px-4 py-2 rounded-[var(--radius-md)] text-[13px] font-semibold"
                  style={{ background: 'var(--brand-primary)', color: 'var(--on-brand-primary)' }}>
                  Generate briefing
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
