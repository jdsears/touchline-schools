import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useParams, Link, useSearchParams } from 'react-router-dom'
import { teamService } from '../../services/api'
import { CheckCircle, Sparkles, ChevronRight, Loader2, X, Users, Shirt, RotateCcw } from 'lucide-react'
import toast from 'react-hot-toast'
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

function ContentBlock({ id, title, children, onSuggest }) {
  return (
    <div id={`prep-${id}`} className="rounded-[var(--radius-lg)] border border-[var(--border-subtle)] bg-[var(--surface-card)] shadow-[var(--shadow-sm)] mb-4">
      <div className="px-5 pt-4 pb-3 flex items-center justify-between">
        <h3 className="text-[15px] font-semibold tracking-[-0.005em]" style={{ color: 'var(--text-primary)' }}>{title}</h3>
        {onSuggest && <SuggestAIButton onClick={onSuggest} />}
      </div>
      <div className="px-5 pb-4">{children}</div>
    </div>
  )
}

function ReadOnlyBlock({ id, icon: Icon, title, summary, linkLabel, linkHref }) {
  return (
    <div id={`prep-${id}`} className="rounded-[var(--radius-lg)] border border-dashed border-[var(--border-default)] bg-[var(--surface-sunken)] p-4 flex items-center gap-3 mb-4">
      <span className="w-8 h-8 rounded-[var(--radius-md)] inline-flex items-center justify-center shrink-0"
        style={{ background: 'var(--brand-primary-tint)', color: 'var(--brand-primary)' }}>
        <Icon size={16} />
      </span>
      <div className="flex-1 min-w-0">
        <span className="text-[13px] font-semibold block" style={{ color: 'var(--text-primary)' }}>{title}</span>
        <span className="text-[12px] block" style={{ color: 'var(--text-secondary)' }}>{summary}</span>
      </div>
      <Link to={linkHref} className="text-[12px] font-semibold inline-flex items-center gap-1"
        style={{ color: 'var(--brand-primary)' }}>
        {linkLabel} <ChevronRight size={12} />
      </Link>
    </div>
  )
}

function normalisePositions(value) {
  if (!value) return []
  if (Array.isArray(value)) {
    return value.map(p => (typeof p === 'string' ? p : p?.position || p?.name || p?.label || null)).filter(Boolean)
  }
  if (typeof value === 'string') {
    try { return normalisePositions(JSON.parse(value)) } catch { return [value] }
  }
  return []
}

// Shape a pupil into what the formation editor renders on the pitch.
function toFormationPlayer(id, name, number, positions) {
  const safeName = String(name || '').trim() || 'Unnamed pupil'
  const parts = safeName.split(/\s+/)
  const last = parts.length > 1 ? parts[parts.length - 1] : parts[0]
  const first = `${parts[0][0]}.`
  return { id, name: safeName, first, last, number: number ?? null, preferred: normalisePositions(positions), status: 'ready' }
}

function parsePrepNotes(raw) {
  if (!raw) return { opposition: '', setPieces: '', talkingPoints: '' }
  try {
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw
    return { opposition: parsed.opposition || '', setPieces: parsed.setPieces || '', talkingPoints: parsed.talkingPoints || '' }
  } catch {
    return { opposition: String(raw), setPieces: '', talkingPoints: '' }
  }
}

export default function MatchPrepV15() {
  const { id } = useParams()
  const [searchParams] = useSearchParams()
  const [match, setMatch] = useState(null)
  const [team, setTeam] = useState(null)
  const [squad, setSquad] = useState([])
  const [players, setPlayers] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeSection, setActiveSection] = useState('formation')
  const [briefingOpen, setBriefingOpen] = useState(searchParams.get('briefing') === 'open')
  const [briefingText, setBriefingText] = useState('')
  const [briefingLoading, setBriefingLoading] = useState(false)
  const [notes, setNotes] = useState({ opposition: '', setPieces: '', talkingPoints: '' })
  const [togglingPrep, setTogglingPrep] = useState(false)
  const saveTimer = useRef(null)

  useEffect(() => {
    if (!id) return
    teamService.getMatch(id)
      .then(async res => {
        const m = res.data
        setMatch(m)
        setBriefingText(m.prep_draft || '')
        setNotes(parsePrepNotes(m.prep_notes))
        if (m.team_id) {
          const [teamRes, squadRes, playersRes] = await Promise.all([
            teamService.getTeam(m.team_id),
            teamService.getMatchSquad(id).catch(() => ({ data: [] })),
            teamService.getPlayers(m.team_id).catch(() => ({ data: [] })),
          ])
          setTeam(teamRes.data)
          setSquad(Array.isArray(squadRes.data) ? squadRes.data : [])
          setPlayers(Array.isArray(playersRes.data) ? playersRes.data : [])
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [id])

  // Pitch roster: the selected match squad when there is one, otherwise the
  // whole team so a formation can be sketched before the squad is picked.
  const formationSquad = useMemo(() => {
    if (squad.length > 0) {
      return squad.map(s => toFormationPlayer(s.pupil_id, s.player_name, s.squad_number, s.player_positions || s.position))
    }
    return players.filter(p => p.is_active !== false).map(p => toFormationPlayer(p.id, p.name, p.squad_number ?? p.jersey_number, p.positions || p.position))
  }, [squad, players])

  const persistFormation = useCallback(async (data) => {
    await teamService.patchMatch(id, { formations: data })
    setMatch(prev => (prev ? { ...prev, formations: data } : prev))
  }, [id])

  function handleNoteChange(field, value) {
    const updated = { ...notes, [field]: value }
    setNotes(updated)
    clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => {
      teamService.patchMatch(id, { prep_notes: JSON.stringify(updated) })
        .then(() => setMatch(prev => (prev ? { ...prev, prep_notes: JSON.stringify(updated) } : prev)))
        .catch(() => toast.error('Prep notes were not saved'))
    }, 800)
  }

  async function generateBriefing() {
    setBriefingLoading(true)
    setBriefingOpen(true)
    setBriefingText('')
    try {
      const token = localStorage.getItem('fam_token')
      const res = await fetch(`${window.location.origin}/api/matches/${id}/prep/generate`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      })
      if (!res.ok) throw new Error('Generation failed')
      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let text = ''
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const chunk = decoder.decode(value)
        const lines = chunk.split('\n').filter(l => l.startsWith('data: '))
        for (const line of lines) {
          const data = line.slice(6)
          if (data === '[DONE]') break
          try {
            const parsed = JSON.parse(data)
            if (parsed.text) { text += parsed.text; setBriefingText(text) }
          } catch {}
        }
      }
      if (!text) throw new Error('No briefing was generated')
      setMatch(prev => (prev ? { ...prev, prep_draft: text } : prev))
      toast.success('Tactical briefing generated')
    } catch (err) { toast.error(err.message || 'Failed to generate briefing') }
    finally { setBriefingLoading(false) }
  }

  function openBriefing(generateIfEmpty) {
    setBriefingOpen(true)
    if (generateIfEmpty && !briefingText && !briefingLoading) generateBriefing()
  }

  function selectSection(sectionId) {
    setActiveSection(sectionId)
    if (sectionId === 'briefing') { openBriefing(false); return }
    document.getElementById(`prep-${sectionId}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  async function togglePrepComplete() {
    const next = !match.prep_completed_at
    setTogglingPrep(true)
    try {
      const res = await teamService.patchMatch(id, { prep_completed: next })
      setMatch(prev => ({ ...prev, prep_completed_at: res.data?.prep_completed_at ?? (next ? new Date().toISOString() : null) }))
      toast.success(next ? 'Prep marked complete' : 'Prep reopened')
    } catch { toast.error('Could not update prep status') }
    finally { setTogglingPrep(false) }
  }

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin" style={{ color: 'var(--text-tertiary)' }} /></div>
  if (!match) return <div className="text-center py-20 text-[14px]" style={{ color: 'var(--text-tertiary)' }}>Match not found</div>

  const starters = squad.filter(s => s.is_starting).length
  const bench = squad.length - starters
  const squadSummary = squad.length === 0
    ? 'No squad selected yet'
    : `${starters} starting, ${bench} on the bench · ${match.squad_announced ? 'announced' : 'not yet announced'}`
  const kitSummary = match.kit_type ? `${match.kit_type.charAt(0).toUpperCase()}${match.kit_type.slice(1)} strip` : 'Not chosen'
  const prepComplete = !!match.prep_completed_at

  return (
    <div className="max-w-[1200px] mx-auto px-7 py-6">
      <MatchHeader match={match} team={team} />

      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-[20px] font-bold tracking-[-0.015em]" style={{ color: 'var(--text-primary)' }}>Match prep</h2>
          <p className="text-[13px]" style={{ color: 'var(--text-secondary)' }}>Prepare your team for the fixture</p>
        </div>
        {!briefingOpen && (
          <button onClick={() => openBriefing(false)}
            className="inline-flex items-center gap-1.5 px-3 py-[6px] rounded-[var(--radius-md)] text-[13px] font-semibold"
            style={{ background: 'var(--brand-primary)', color: 'var(--on-brand-primary)' }}>
            <Sparkles size={13} /> {briefingText ? 'Open AI tactical briefing' : 'Generate AI tactical briefing'}
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[200px_1fr] gap-5" style={{ gridTemplateColumns: briefingOpen ? '200px 1fr 380px' : '200px 1fr' }}>
        <PrepRail activeId={activeSection} onSelect={selectSection} />

        <div>
          <div id="prep-formation" className="mb-4">
            <FormationEditor
              sport={team?.sport || 'football'}
              format={team?.team_format ? `${team.team_format}v${team.team_format}` : '11v11'}
              squad={formationSquad}
              fixtureId={id}
              initialData={match.formations}
              onPersist={persistFormation}
            />
          </div>

          <ContentBlock id="opposition" title="Opposition notes" onSuggest={() => openBriefing(true)}>
            <textarea rows={4} value={notes.opposition} onChange={e => handleNoteChange('opposition', e.target.value)}
              placeholder="Notes about the opposition..."
              className="w-full rounded-[var(--radius-md)] border border-[var(--border-default)] p-3 text-[14px] resize-none"
              style={{ background: 'var(--surface-card)', color: 'var(--text-primary)' }} />
          </ContentBlock>

          <ContentBlock id="set-pieces" title="Set pieces" onSuggest={() => openBriefing(true)}>
            <textarea rows={3} value={notes.setPieces} onChange={e => handleNoteChange('setPieces', e.target.value)}
              placeholder="Corners, free kicks, penalties..."
              className="w-full rounded-[var(--radius-md)] border border-[var(--border-default)] p-3 text-[14px] resize-none"
              style={{ background: 'var(--surface-card)', color: 'var(--text-primary)' }} />
          </ContentBlock>

          <ContentBlock id="talking-pts" title="Pre-match talking points" onSuggest={() => openBriefing(true)}>
            <textarea rows={3} value={notes.talkingPoints} onChange={e => handleNoteChange('talkingPoints', e.target.value)}
              placeholder="Key messages for the team..."
              className="w-full rounded-[var(--radius-md)] border border-[var(--border-default)] p-3 text-[14px] resize-none"
              style={{ background: 'var(--surface-card)', color: 'var(--text-primary)' }} />
          </ContentBlock>

          <ReadOnlyBlock id="squad" icon={Users} title="Squad" summary={squadSummary} linkLabel="Edit on Squad" linkHref={`/teacher/match/${id}/squad`} />
          <ReadOnlyBlock id="kit" icon={Shirt} title="Kit" summary={kitSummary} linkLabel="Choose on Overview" linkHref={`/teacher/match/${id}`} />

          <div className="sticky bottom-0 py-4" style={{ background: 'var(--surface-page)' }}>
            {prepComplete ? (
              <div className="flex items-center justify-between gap-3 px-4 py-3 rounded-[var(--radius-md)]"
                style={{ background: 'var(--status-success-tint)', color: 'var(--status-success)' }}>
                <span className="inline-flex items-center gap-2 text-[13px] font-semibold">
                  <CheckCircle size={15} /> Prep marked complete {new Date(match.prep_completed_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                </span>
                <button onClick={togglePrepComplete} disabled={togglingPrep}
                  className="inline-flex items-center gap-1 text-[12px] font-semibold" style={{ color: 'var(--status-success)' }}>
                  <RotateCcw size={12} /> Reopen
                </button>
              </div>
            ) : (
              <button onClick={togglePrepComplete} disabled={togglingPrep}
                className="w-full inline-flex items-center justify-center gap-2 py-3 rounded-[var(--radius-md)] text-[14px] font-semibold"
                style={{ background: 'var(--brand-primary)', color: 'var(--on-brand-primary)', opacity: togglingPrep ? 0.7 : 1 }}>
                {togglingPrep ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle size={14} />} Mark prep complete
              </button>
            )}
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
                Built from recent results, the league table, squad observations and your selected squad.
              </p>
              {briefingText ? (
                <div>
                  <div className="text-[14px] leading-[1.6] whitespace-pre-line" style={{ color: 'var(--text-primary)' }}>
                    {briefingText}
                    {briefingLoading && <span className="animate-pulse">...</span>}
                  </div>
                  {!briefingLoading && (
                    <button onClick={generateBriefing}
                      className="mt-4 inline-flex items-center gap-1.5 text-[12px] font-semibold" style={{ color: 'var(--brand-primary)' }}>
                      <Sparkles size={12} /> Regenerate
                    </button>
                  )}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Sparkles size={24} className="mx-auto mb-2" style={{ color: 'var(--text-tertiary)' }} />
                  <p className="text-[13px] italic" style={{ color: 'var(--text-tertiary)' }}>
                    {briefingLoading ? 'Generating your briefing…' : 'Tactical briefing not yet generated.'}
                  </p>
                  <button onClick={generateBriefing} disabled={briefingLoading}
                    className="mt-3 px-4 py-2 rounded-[var(--radius-md)] text-[13px] font-semibold"
                    style={{ background: 'var(--brand-primary)', color: 'var(--on-brand-primary)' }}>
                    {briefingLoading ? 'Generating...' : 'Generate briefing'}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
