import { useState, useEffect } from 'react'
import MatchLoadError from '../../components/MatchLoadError'
import { useParams, Link } from 'react-router-dom'
import { teamService } from '../../services/api'
import { CheckCircle, Circle, AlertTriangle, ChevronRight, Sparkles, MessageSquare, Video, Loader2, X, Shirt, Trophy } from 'lucide-react'
import toast from 'react-hot-toast'
import MatchHeader from '../../components/MatchHeader'
import TabStrip from '../../components/TabStrip'
import { ResultDetailsEditor, ResultDetailsSummary } from '../../components/MatchResultDetails'
import { scoreVocab, headlineLabel, headlineFromDetails, hasDetailSchema, resultOutcome, scoreline, resultSentence, hasRecordedResult } from '../../lib/results'

const MATCH_TABS = [
  { id: 'overview', label: 'Overview', href: '' },
  { id: 'squad', label: 'Squad', href: '/squad' },
  { id: 'prep', label: 'Match Prep', href: '/prep' },
  { id: 'report', label: 'Report', href: '/report' },
  { id: 'video', label: 'Video', href: '/video' },
]

function fmtDate(d) {
  if (!d) return ''
  return new Date(d).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })
}

function isPastDate(d) {
  if (!d) return false
  const target = new Date(d); target.setHours(0, 0, 0, 0)
  const today = new Date(); today.setHours(0, 0, 0, 0)
  return target < today
}

function ReadinessRow({ state, title, meta, detail, actionLabel, actionHref, onAction }) {
  const tone = {
    done: { bg: 'var(--status-success-tint)', fg: 'var(--status-success)', Icon: CheckCircle },
    pending: { bg: 'var(--surface-sunken)', fg: 'var(--text-tertiary)', Icon: Circle },
    blocked: { bg: 'var(--status-warning-tint)', fg: 'var(--status-warning)', Icon: AlertTriangle },
  }[state] || { bg: 'var(--surface-sunken)', fg: 'var(--text-tertiary)', Icon: Circle }

  const actionClass = 'inline-flex items-center gap-1 px-[10px] py-[5px] rounded-[var(--radius-md)] text-[12px] font-semibold'
  const actionStyle = { background: 'transparent', color: 'var(--text-secondary)', border: '1px solid var(--border-default)' }

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
        onAction ? (
          <button onClick={onAction} className={actionClass} style={actionStyle}>
            {actionLabel} <ChevronRight size={12} />
          </button>
        ) : actionHref ? (
          <Link to={actionHref} className={actionClass} style={actionStyle}>
            {actionLabel} <ChevronRight size={12} />
          </Link>
        ) : null
      )}
    </div>
  )
}

function ReadinessPanel({ match, matchId, squad, sport, onChooseKit, onRecordResult }) {
  const hasResult = hasRecordedResult(match)
  const played = isPastDate(match.date || match.match_date)
  const starters = squad.filter(s => s.is_starting).length
  const primary = match.formations?.primary
  const placed = primary?.assignment ? Object.values(primary.assignment).filter(Boolean).length : 0

  const checklist = [
    match.squad_announced
      ? { state: 'done', title: 'Squad announced', meta: `${squad.length} selected · ${starters} starting`, actionLabel: 'Open Squad', actionHref: `/teacher/match/${matchId}/squad` }
      : squad.length > 0
        ? { state: 'blocked', title: 'Squad selected, not announced', meta: `${squad.length} selected · ${starters} starting`, detail: 'Announce it so parents and pupils are notified', actionLabel: 'Open Squad', actionHref: `/teacher/match/${matchId}/squad` }
        : { state: 'pending', title: 'Squad not selected', detail: 'Pick your starters and bench', actionLabel: 'Open Squad', actionHref: `/teacher/match/${matchId}/squad` },
    placed > 0
      ? { state: 'done', title: 'Formation set', meta: `${placed} placed${primary?.presetId ? ` · ${primary.presetId}` : ''}`, actionLabel: 'Open Match Prep', actionHref: `/teacher/match/${matchId}/prep` }
      : { state: 'pending', title: 'Formation', detail: 'Set your starting formation', actionLabel: 'Open Match Prep', actionHref: `/teacher/match/${matchId}/prep` },
    match.kit_type
      ? { state: 'done', title: `Kit: ${match.kit_type}`, actionLabel: 'Change kit', onAction: onChooseKit }
      : { state: 'blocked', title: 'Kit not yet chosen', actionLabel: 'Choose kit', onAction: onChooseKit },
    match.prep_draft
      ? { state: 'done', title: 'Tactical briefing generated', detail: 'Open it to review before the match', actionLabel: 'Open briefing', actionHref: `/teacher/match/${matchId}/prep?briefing=open` }
      : { state: 'pending', title: 'Tactical briefing', detail: 'Not yet generated', actionLabel: 'Generate', actionHref: `/teacher/match/${matchId}/prep?briefing=open` },
  ]
  if (played || hasResult) {
    checklist.push(hasResult
      ? { state: 'done', title: `Result recorded: ${scoreline(match, sport)}`, detail: resultSentence(match, sport), actionLabel: 'Edit result', onAction: onRecordResult }
      : { state: 'blocked', title: 'Result not recorded', detail: `Record the ${scoreVocab(sport).unit} to unlock the match report`, actionLabel: 'Record result', onAction: onRecordResult })
  }
  const done = checklist.filter(c => c.state === 'done').length

  return (
    <div className="rounded-[var(--radius-lg)] border border-[var(--border-subtle)] bg-[var(--surface-card)] shadow-[var(--shadow-sm)]">
      <div className="px-5 pt-5 pb-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-[17px] font-semibold tracking-[-0.01em] m-0" style={{ color: 'var(--text-primary)' }}>Match readiness</h2>
          {match.prep_completed_at && (
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-[3px] rounded-full"
              style={{ background: 'var(--status-success-tint)', color: 'var(--status-success)' }}>
              <CheckCircle size={11} /> Prep signed off
            </span>
          )}
        </div>
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

function meetingOutcome(m, sport) {
  const label = resultOutcome(m, sport)
  if (!label) return null
  const colour = { W: 'var(--status-success)', L: 'var(--status-error)', D: 'var(--brand-accent)' }[label]
  return <span className="text-[12px] font-bold font-mono" style={{ color: colour }}>{label} {scoreline(m, sport)}</span>
}

function OppositionCard({ match, history, loading, sport }) {
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
        {loading ? (
          <p className="text-[13px] italic mt-2" style={{ color: 'var(--text-tertiary)' }}>Loading…</p>
        ) : history.length === 0 ? (
          <p className="text-[13px] italic mt-2" style={{ color: 'var(--text-tertiary)' }}>No previous meetings with {match?.opponent || 'this opponent'} on record.</p>
        ) : (
          <div className="mt-2">
            {history.map(m => (
              <Link key={m.id} to={`/teacher/match/${m.id}`} className="flex items-center justify-between gap-3 py-2 no-underline"
                style={{ borderTop: '1px solid var(--border-subtle)' }}>
                <span className="text-[12.5px]" style={{ color: 'var(--text-secondary)' }}>
                  {fmtDate(m.date || m.match_date)} · {m.home_away === 'home' ? 'Home' : 'Away'}
                </span>
                {meetingOutcome(m, sport)}
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function AIShortcuts({ match, matchId }) {
  const hasVideo = !!(match?.video_url || match?.video_id || match?.veo_link)
  const cards = [
    {
      icon: Sparkles, title: 'AI tactical briefing',
      desc: match?.prep_draft ? 'Briefing generated — review it before kick-off' : 'Generate a briefing from results, observations and your squad',
      cta: match?.prep_draft ? 'Open briefing' : 'Generate briefing', href: `/teacher/match/${matchId}/prep?briefing=open`,
    },
    { icon: MessageSquare, title: 'Chat about this match', desc: 'Ask Coach about the fixture, the opposition or your squad', cta: 'Ask a question', href: '/teacher/assistant' },
    {
      icon: Video, title: hasVideo ? 'Match video' : 'Add video',
      desc: hasVideo ? 'Footage is attached to this fixture' : 'No footage attached yet',
      cta: hasVideo ? 'Open video' : 'Upload', href: `/teacher/match/${matchId}/video`,
    },
  ]
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
      {cards.map(c => (
        <Link key={c.title} to={c.href} className="rounded-[var(--radius-lg)] border border-[var(--border-subtle)] bg-[var(--surface-card)] shadow-[var(--shadow-sm)] p-4 relative block transition-shadow hover:shadow-[var(--shadow-md)] no-underline">
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
  const [squad, setSquad] = useState([])
  const [history, setHistory] = useState([])
  const [historyLoading, setHistoryLoading] = useState(true)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(null)
  const [showKitModal, setShowKitModal] = useState(false)
  const [kitChoice, setKitChoice] = useState(null)
  const [savingKit, setSavingKit] = useState(false)
  const [showResultModal, setShowResultModal] = useState(false)
  const [scoreFor, setScoreFor] = useState('')
  const [scoreAgainst, setScoreAgainst] = useState('')
  const [resultDetails, setResultDetails] = useState(null)
  const [savingResult, setSavingResult] = useState(false)

  function openKit() {
    setKitChoice(match?.kit_type || 'home')
    setShowKitModal(true)
  }

  function openResult() {
    setScoreFor(match?.score_for != null ? String(match.score_for) : '')
    setScoreAgainst(match?.score_against != null ? String(match.score_against) : '')
    setResultDetails(match?.result_data || null)
    setShowResultModal(true)
  }

  async function handleKitSave() {
    if (!kitChoice) return
    setSavingKit(true)
    try {
      await teamService.patchMatch(id, { kit_type: kitChoice })
      setMatch(prev => ({ ...prev, kit_type: kitChoice }))
      setShowKitModal(false)
      toast.success(`Kit set to ${kitChoice}`)
    } catch { toast.error('Failed to save kit') }
    finally { setSavingKit(false) }
  }

  // Innings sports take the headline from the innings block; team-points
  // sports may have no headline at all (the event list is the result).
  function resolveHeadline() {
    const derived = headlineFromDetails(team?.sport, resultDetails)
    if (derived) return derived
    if (scoreFor === '' || scoreAgainst === '') return null
    return { score_for: Number(scoreFor), score_against: Number(scoreAgainst) }
  }

  async function handleResultSave() {
    const vocab = scoreVocab(team?.sport)
    const headline = resolveHeadline()
    const hasRows = Array.isArray(resultDetails?.rows) && resultDetails.rows.some(r => Object.values(r).some(Boolean))
    if (!headline && !(vocab.teamPoints && hasRows)) {
      toast.error(vocab.innings ? 'Enter both innings first' : `Enter the ${vocab.unit} for both sides`)
      return
    }
    setSavingResult(true)
    try {
      const payload = { result_data: resultDetails || null }
      if (headline) Object.assign(payload, headline)
      const res = await teamService.patchMatch(id, payload)
      setMatch(prev => ({
        ...prev,
        score_for: res.data?.score_for ?? headline?.score_for ?? prev.score_for,
        score_against: res.data?.score_against ?? headline?.score_against ?? prev.score_against,
        result_data: res.data?.result_data ?? resultDetails,
      }))
      setShowResultModal(false)
      toast.success('Result recorded')
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to save result') }
    finally { setSavingResult(false) }
  }

  useEffect(() => {
    if (!id) return
    teamService.getMatch(id)
      .then(async res => {
        const m = res.data
        setMatch(m)
        if (m.team_id) {
          const [teamRes, squadRes, matchesRes] = await Promise.all([
            teamService.getTeam(m.team_id),
            teamService.getMatchSquad(id).catch(() => ({ data: [] })),
            teamService.getMatches(m.team_id).catch(() => ({ data: [] })),
          ])
          setTeam(teamRes.data)
          setSquad(Array.isArray(squadRes.data) ? squadRes.data : [])
          const opponent = (m.opponent || '').trim().toLowerCase()
          const previous = (Array.isArray(matchesRes.data) ? matchesRes.data : [])
            .filter(x => x.id !== m.id && (x.opponent || '').trim().toLowerCase() === opponent && x.score_for != null && x.score_against != null)
            .sort((a, b) => new Date(b.date || b.match_date) - new Date(a.date || a.match_date))
            .slice(0, 3)
          setHistory(previous)
        }
      })
      .catch(setLoadError)
      .finally(() => { setLoading(false); setHistoryLoading(false) })
  }, [id])

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin" style={{ color: 'var(--text-tertiary)' }} /></div>
  if (!match) return <MatchLoadError error={loadError} />

  const teamLabel = team?.name || 'Us'
  const sport = team?.sport || 'football'
  const vocab = scoreVocab(sport)
  const derivedHeadline = headlineFromDetails(sport, resultDetails)

  return (
    <div className="max-w-[1100px] mx-auto px-7 py-6">
      <MatchHeader match={match} team={team} />
      <div className="mb-5 sticky top-0 z-10 py-2" style={{ background: 'var(--surface-page)' }}>
        <TabStrip tabs={MATCH_TABS} basePath={`/teacher/match/${id}`} />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-[3fr_2fr] gap-5">
        <div className="space-y-5">
          <ReadinessPanel match={match} matchId={id} squad={squad} sport={sport} onChooseKit={openKit} onRecordResult={openResult} />
          {hasRecordedResult(match) && match.result_data && (
            <div className="rounded-[var(--radius-lg)] border border-[var(--border-subtle)] bg-[var(--surface-card)] shadow-[var(--shadow-sm)] px-5 py-4">
              <span className="text-[10px] font-bold tracking-[0.1em] uppercase block mb-2" style={{ color: 'var(--brand-accent)' }}>Result breakdown</span>
              <ResultDetailsSummary sport={sport} data={match.result_data} usLabel={teamLabel} themLabel={match.opponent} />
            </div>
          )}
          <AIShortcuts match={match} matchId={id} />
        </div>
        <div className="space-y-5">
          <OppositionCard match={match} history={history} loading={historyLoading} sport={sport} />
        </div>
      </div>

      {showKitModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'var(--surface-overlay, rgba(15,30,61,0.45))' }} onClick={() => setShowKitModal(false)}>
          <div className="rounded-[var(--radius-xl)] p-6 w-full max-w-sm" style={{ background: 'var(--surface-card)' }} onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[15px] font-semibold" style={{ color: 'var(--text-primary)' }}>Choose kit</h3>
              <button onClick={() => setShowKitModal(false)} style={{ color: 'var(--text-tertiary)' }}><X size={18} /></button>
            </div>
            <div className="space-y-2 mb-4">
              {['home', 'away', 'third'].map(k => (
                <button key={k} onClick={() => setKitChoice(k)}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-[var(--radius-md)] text-left text-[14px] font-medium transition-colors"
                  style={{
                    background: kitChoice === k ? 'var(--brand-accent-tint)' : 'var(--surface-sunken)',
                    border: kitChoice === k ? '1.5px solid var(--brand-accent)' : '1.5px solid transparent',
                    color: 'var(--text-primary)',
                  }}>
                  <Shirt size={16} style={{ color: kitChoice === k ? 'var(--brand-accent)' : 'var(--text-tertiary)' }} />
                  {k === 'home' ? 'Home strip' : k === 'away' ? 'Away strip' : 'Third strip'}
                </button>
              ))}
            </div>
            <button onClick={handleKitSave} disabled={savingKit || !kitChoice}
              className="w-full py-[10px] rounded-[var(--radius-md)] text-[13px] font-semibold"
              style={{ background: 'var(--brand-primary)', color: 'var(--on-brand-primary)', opacity: !kitChoice ? 0.5 : 1 }}>
              {savingKit ? 'Saving...' : 'Confirm kit'}
            </button>
          </div>
        </div>
      )}

      {showResultModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'var(--surface-overlay, rgba(15,30,61,0.45))' }} onClick={() => setShowResultModal(false)}>
          <div className={`rounded-[var(--radius-xl)] p-6 w-full ${hasDetailSchema(sport) ? 'max-w-lg' : 'max-w-sm'}`} style={{ background: 'var(--surface-card)' }} onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-[15px] font-semibold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                <Trophy size={15} style={{ color: 'var(--brand-accent)' }} /> Record result
              </h3>
              <button onClick={() => setShowResultModal(false)} style={{ color: 'var(--text-tertiary)' }}><X size={18} /></button>
            </div>
            <p className="text-[12.5px] mb-4" style={{ color: 'var(--text-secondary)' }}>
              {vocab.innings ? 'Innings' : vocab.teamPoints ? 'Results' : headlineLabel(sport)} for {teamLabel} {match.home_away === 'home' ? 'vs' : 'at'} {match.opponent}.
            </p>
            {vocab.innings ? (
              derivedHeadline && (
                <p className="text-[13px] font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
                  Headline: {derivedHeadline.score_for} – {derivedHeadline.score_against} {vocab.unit}
                </p>
              )
            ) : (
              <div className="grid grid-cols-[1fr_auto_1fr] items-end gap-3 mb-2">
                <label className="block">
                  <span className="text-[11px] font-semibold uppercase tracking-wide block mb-1 truncate" style={{ color: 'var(--text-tertiary)' }}>{teamLabel} · {headlineLabel(sport)}</span>
                  <input type="number" min="0" step={vocab.step || 1} inputMode="numeric" value={scoreFor} onChange={e => setScoreFor(e.target.value)}
                    className="w-full text-center text-[22px] font-bold rounded-[var(--radius-md)] border border-[var(--border-default)] py-2"
                    style={{ background: 'var(--surface-card)', color: 'var(--text-primary)' }} />
                </label>
                <span className="text-[18px] font-bold pb-3" style={{ color: 'var(--text-tertiary)' }}>–</span>
                <label className="block">
                  <span className="text-[11px] font-semibold uppercase tracking-wide block mb-1 truncate" style={{ color: 'var(--text-tertiary)' }}>{match.opponent}</span>
                  <input type="number" min="0" step={vocab.step || 1} inputMode="numeric" value={scoreAgainst} onChange={e => setScoreAgainst(e.target.value)}
                    className="w-full text-center text-[22px] font-bold rounded-[var(--radius-md)] border border-[var(--border-default)] py-2"
                    style={{ background: 'var(--surface-card)', color: 'var(--text-primary)' }} />
                </label>
              </div>
            )}
            {hasDetailSchema(sport) && (
              <div className="max-h-[50vh] overflow-y-auto pr-1">
                <ResultDetailsEditor sport={sport} value={resultDetails} onChange={setResultDetails} usLabel={teamLabel} themLabel={match.opponent} />
              </div>
            )}
            <button onClick={handleResultSave} disabled={savingResult}
              className="w-full mt-5 py-[10px] rounded-[var(--radius-md)] text-[13px] font-semibold"
              style={{ background: 'var(--brand-primary)', color: 'var(--on-brand-primary)', opacity: savingResult ? 0.6 : 1 }}>
              {savingResult ? 'Saving...' : 'Save result'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
