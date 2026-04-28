import { useState, useEffect, useMemo } from 'react'
import { useParams, Link } from 'react-router-dom'
import { teamService } from '../../services/api'
import { Users, UserCheck, Plus, Send, ChevronRight, Loader2, Star, Shield, X, AlertTriangle } from 'lucide-react'
import MatchHeader from '../../components/MatchHeader'
import TabStrip from '../../components/TabStrip'
import toast from 'react-hot-toast'
import { getSportDef } from '../../lib/sports'

const MATCH_TABS = [
  { id: 'overview', label: 'Overview', href: '' },
  { id: 'squad', label: 'Squad', href: '/squad' },
  { id: 'prep', label: 'Match Prep', href: '/prep' },
  { id: 'report', label: 'Report', href: '/report' },
  { id: 'video', label: 'Video', href: '/video' },
]

export default function MatchSquadV15() {
  const { id } = useParams()
  const [match, setMatch] = useState(null)
  const [team, setTeam] = useState(null)
  const [squad, setSquad] = useState([])
  const [players, setPlayers] = useState([])
  const [loading, setLoading] = useState(true)
  const [showPicker, setShowPicker] = useState(false)
  const [announcing, setAnnouncing] = useState(false)

  useEffect(() => {
    if (!id) return
    Promise.all([
      teamService.getMatch(id),
    ]).then(async ([matchRes]) => {
      const m = matchRes.data
      setMatch(m)
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
    }).catch(() => {}).finally(() => setLoading(false))
  }, [id])

  const sport = useMemo(() => getSportDef(team?.sport || 'football'), [team?.sport])
  const format = team?.team_format ? sport.formats[`${team.team_format}v${team.team_format}`] || sport.formats[Object.keys(sport.formats)[0]] : null
  const playerCount = format?.playerCount || 11
  const roleVocab = format?.roleVocab || ['GK', 'DEF', 'MID', 'ST']

  const starters = squad.filter(s => s.is_starting)
  const subs = squad.filter(s => !s.is_starting)
  const squadIds = new Set(squad.map(s => s.pupil_id))
  const available = players.filter(p => !squadIds.has(p.id))

  async function saveSquad(newSquad) {
    try {
      await teamService.updateSquad(id, newSquad.map(s => ({
        pupil_id: s.pupil_id, position: s.position || null, is_starting: s.is_starting, notes: s.notes || null,
      })))
    } catch { toast.error('Failed to save squad') }
  }

  function addToSquad(playerId) {
    const isStarting = starters.length < playerCount
    const p = players.find(pl => pl.id === playerId)
    const newEntry = { pupil_id: playerId, player_name: p?.name, is_starting: isStarting, position: null }
    const newSquad = [...squad, newEntry]
    setSquad(newSquad)
    saveSquad(newSquad)
    setShowPicker(false)
  }

  function removeFromSquad(pupilId) {
    const newSquad = squad.filter(s => s.pupil_id !== pupilId)
    setSquad(newSquad)
    saveSquad(newSquad)
  }

  function toggleStarting(pupilId) {
    const newSquad = squad.map(s => s.pupil_id === pupilId ? { ...s, is_starting: !s.is_starting } : s)
    setSquad(newSquad)
    saveSquad(newSquad)
  }

  function updatePosition(pupilId, position) {
    const newSquad = squad.map(s => s.pupil_id === pupilId ? { ...s, position } : s)
    setSquad(newSquad)
    saveSquad(newSquad)
  }

  async function handleAnnounce() {
    setAnnouncing(true)
    try {
      await teamService.announceSquad(id, { force: !!match?.squad_announced })
      toast.success('Squad announced to parents')
      const res = await teamService.getMatch(id)
      setMatch(res.data)
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to announce') }
    finally { setAnnouncing(false) }
  }

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin" style={{ color: 'var(--text-tertiary)' }} /></div>
  if (!match) return <div className="text-center py-20 text-[14px]" style={{ color: 'var(--text-tertiary)' }}>Match not found</div>

  return (
    <div className="max-w-[1100px] mx-auto px-7 py-6">
      <MatchHeader match={match} team={team} />
      <div className="mb-5 sticky top-0 z-10 py-2" style={{ background: 'var(--surface-page)' }}>
        <TabStrip tabs={MATCH_TABS} basePath={`/teacher/match/${id}`} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-5">
        <div className="space-y-4">
          {/* Starters */}
          <div className="rounded-[var(--radius-lg)] border border-[var(--border-subtle)] bg-[var(--surface-card)] shadow-[var(--shadow-sm)]">
            <div className="px-5 pt-4 pb-3 flex items-center justify-between">
              <div>
                <h2 className="text-[15px] font-semibold" style={{ color: 'var(--text-primary)' }}>Starting {playerCount}</h2>
                <span className="text-[12px]" style={{ color: 'var(--text-tertiary)' }}>{starters.length}/{playerCount} selected</span>
              </div>
              <button onClick={() => setShowPicker(true)} className="inline-flex items-center gap-1 px-[10px] py-[5px] rounded-[var(--radius-md)] text-[12px] font-semibold"
                style={{ background: 'var(--brand-primary)', color: 'var(--on-brand-primary)' }}>
                <Plus size={12} /> Add player
              </button>
            </div>
            <div className="px-5 pb-4">
              {starters.length === 0 ? (
                <p className="text-[13px] italic py-4 text-center" style={{ color: 'var(--text-tertiary)' }}>No starters selected yet. Add players from the roster.</p>
              ) : starters.map(s => (
                <PlayerRow key={s.pupil_id} entry={s} roleVocab={roleVocab} onToggle={() => toggleStarting(s.pupil_id)}
                  onPosition={(pos) => updatePosition(s.pupil_id, pos)} onRemove={() => removeFromSquad(s.pupil_id)} toggleLabel="Move to bench" />
              ))}
            </div>
          </div>

          {/* Bench */}
          <div className="rounded-[var(--radius-lg)] border border-[var(--border-subtle)] bg-[var(--surface-card)] shadow-[var(--shadow-sm)]">
            <div className="px-5 pt-4 pb-3">
              <h2 className="text-[15px] font-semibold" style={{ color: 'var(--text-primary)' }}>Bench</h2>
              <span className="text-[12px]" style={{ color: 'var(--text-tertiary)' }}>{subs.length} substitute{subs.length !== 1 ? 's' : ''}</span>
            </div>
            <div className="px-5 pb-4">
              {subs.length === 0 ? (
                <p className="text-[13px] italic py-3 text-center" style={{ color: 'var(--text-tertiary)' }}>No substitutes added.</p>
              ) : subs.map(s => (
                <PlayerRow key={s.pupil_id} entry={s} roleVocab={roleVocab} onToggle={() => toggleStarting(s.pupil_id)}
                  onPosition={(pos) => updatePosition(s.pupil_id, pos)} onRemove={() => removeFromSquad(s.pupil_id)} toggleLabel="Move to starters" />
              ))}
            </div>
          </div>
        </div>

        {/* Right rail */}
        <div className="space-y-4">
          <div className="rounded-[var(--radius-lg)] border border-[var(--border-subtle)] bg-[var(--surface-card)] shadow-[var(--shadow-sm)] p-5">
            <button onClick={handleAnnounce} disabled={announcing || squad.length === 0}
              className="w-full inline-flex items-center justify-center gap-2 py-[10px] rounded-[var(--radius-md)] text-[13px] font-semibold mb-3"
              style={{ background: 'var(--brand-primary)', color: 'var(--on-brand-primary)', opacity: squad.length === 0 ? 0.5 : 1 }}>
              {announcing ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
              {match?.squad_announced ? 'Update and re-notify' : 'Announce squad'}
            </button>
            {match?.squad_announced && (
              <p className="text-[11px] mb-3 flex items-center gap-1" style={{ color: 'var(--status-success)' }}>
                <UserCheck size={12} /> Announced {new Date(match.squad_announced_at).toLocaleDateString('en-GB')}
              </p>
            )}
            <div className="text-[12px] space-y-1" style={{ color: 'var(--text-secondary)' }}>
              <div>{starters.length} starter{starters.length !== 1 ? 's' : ''}, {subs.length} sub{subs.length !== 1 ? 's' : ''}</div>
              {match?.kit_type && <div>Kit: {match.kit_type}</div>}
            </div>
          </div>
        </div>
      </div>

      {/* Player picker modal */}
      {showPicker && (
        <div className="fixed inset-0 z-50" style={{ background: 'var(--surface-overlay, rgba(15,30,61,0.45))' }} onClick={() => setShowPicker(false)}>
          <div className="absolute bottom-0 left-0 right-0 lg:relative lg:top-1/2 lg:left-1/2 lg:-translate-x-1/2 lg:-translate-y-1/2 lg:max-w-md lg:rounded-[var(--radius-xl)] rounded-t-[var(--radius-xl)]"
            style={{ background: 'var(--surface-card)', maxHeight: '65vh' }} onClick={e => e.stopPropagation()}>
            <div className="px-4 py-3 flex items-center justify-between" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
              <span className="text-[14px] font-semibold" style={{ color: 'var(--text-primary)' }}>Add to squad</span>
              <button onClick={() => setShowPicker(false)} style={{ color: 'var(--text-tertiary)' }}><X size={18} /></button>
            </div>
            <div className="overflow-y-auto p-2" style={{ maxHeight: 'calc(65vh - 52px)' }}>
              {available.length === 0 ? (
                <p className="text-[13px] italic py-6 text-center" style={{ color: 'var(--text-tertiary)' }}>All players already in squad.</p>
              ) : available.map(p => (
                <button key={p.id} onClick={() => addToSquad(p.id)}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-left rounded-[var(--radius-md)] transition-colors"
                  style={{ color: 'var(--text-primary)' }}>
                  <span className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0"
                    style={{ background: 'var(--brand-primary-tint)', color: 'var(--brand-primary)' }}>
                    {(p.name || '').split(' ').map(w => w[0]).join('').slice(0, 2)}
                  </span>
                  <div className="flex-1 min-w-0">
                    <span className="text-[13px] font-semibold block truncate">{p.name}</span>
                    {p.positions && <span className="text-[11px] block" style={{ color: 'var(--text-tertiary)' }}>{Array.isArray(p.positions) ? p.positions.join(', ') : p.positions}</span>}
                  </div>
                  <Plus size={14} style={{ color: 'var(--text-tertiary)' }} />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function PlayerRow({ entry, roleVocab, onToggle, onPosition, onRemove, toggleLabel }) {
  return (
    <div className="flex items-center gap-2.5 py-[10px]" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
      <span className="w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0"
        style={{ background: 'var(--brand-primary-tint)', color: 'var(--brand-primary)' }}>
        {(entry.player_name || '').split(' ').map(w => w[0]).join('').slice(0, 2)}
      </span>
      <div className="flex-1 min-w-0">
        <span className="text-[13px] font-semibold block truncate" style={{ color: 'var(--text-primary)' }}>{entry.player_name}</span>
      </div>
      <select value={entry.position || ''} onChange={e => onPosition(e.target.value)}
        className="text-[11px] px-1.5 py-0.5 rounded-[var(--radius-sm)]"
        style={{ background: 'var(--surface-sunken)', border: '1px solid var(--border-subtle)', color: 'var(--text-secondary)' }}>
        <option value="">Pos</option>
        {roleVocab.map(r => <option key={r} value={r}>{r}</option>)}
      </select>
      <button onClick={onToggle} className="text-[10px] font-semibold px-2 py-0.5 rounded-[var(--radius-sm)]"
        style={{ background: 'var(--surface-sunken)', color: 'var(--text-secondary)' }}>{toggleLabel}</button>
      <button onClick={onRemove} style={{ color: 'var(--text-tertiary)' }}><X size={14} /></button>
    </div>
  )
}
