import { useState, useMemo, useEffect, useRef, useCallback } from 'react'
import { Plus, X, AlertTriangle, Check, Sparkles } from 'lucide-react'
import { FOOTBALL_PRESETS, DEFAULT_PRESETS, getPresetsForFormat, validateFormation, transferAssignment } from '../lib/formationPresets'

const DEMO_SQUAD = [
  { id: 'p1', name: 'Reuben Asante', first: 'R.', last: 'Asante', number: 9, preferred: ['ST', 'LW'], status: 'ready' },
  { id: 'p2', name: 'Toby Lindgren', first: 'T.', last: 'Lindgren', number: 10, preferred: ['AM', 'CM'], status: 'ready' },
  { id: 'p3', name: 'Marcus Hill', first: 'M.', last: 'Hill', number: 7, preferred: ['RW', 'RM'], status: 'ready' },
  { id: 'p4', name: 'Olu Adekunle', first: 'O.', last: 'Adekunle', number: 11, preferred: ['LW', 'ST'], status: 'ready' },
  { id: 'p5', name: 'Sam Whitford', first: 'S.', last: 'Whitford', number: 4, preferred: ['CM', 'DM'], status: 'ready' },
  { id: 'p6', name: 'Ben Carrington', first: 'B.', last: 'Carrington', number: 6, preferred: ['CB'], status: 'ready' },
  { id: 'p7', name: 'Ethan Reid', first: 'E.', last: 'Reid', number: 5, preferred: ['CB'], status: 'ready' },
  { id: 'p8', name: "Liam O'Connor", first: 'L.', last: "O'Connor", number: 3, preferred: ['LB'], status: 'ready' },
  { id: 'p9', name: 'Joshua Brookes', first: 'J.', last: 'Brookes', number: 2, preferred: ['RB'], status: 'ready' },
  { id: 'p10', name: 'Daniel Park', first: 'D.', last: 'Park', number: 1, preferred: ['GK'], status: 'ready' },
  { id: 'p11', name: 'Akin Hassan', first: 'A.', last: 'Hassan', number: 8, preferred: ['CM', 'DM'], status: 'ready' },
  { id: 'p12', name: 'George Whitaker', first: 'G.', last: 'Whitaker', number: 12, preferred: ['CB', 'DM'], status: 'ready' },
  { id: 'p13', name: 'Felix Tan', first: 'F.', last: 'Tan', number: 14, preferred: ['CM', 'AM'], status: 'ready' },
  { id: 'p14', name: 'Noah Jansen', first: 'N.', last: 'Jansen', number: 15, preferred: ['LW', 'LM'], status: 'queried' },
  { id: 'p15', name: 'Adam Petrescu', first: 'A.', last: 'Petrescu', number: 16, preferred: ['RB', 'RM'], status: 'ready' },
  { id: 'p16', name: 'Kai Nakamura', first: 'K.', last: 'Nakamura', number: 17, preferred: ['GK'], status: 'queried' },
]

function FootballPitchLines() {
  return (
    <svg viewBox="0 0 100 150" preserveAspectRatio="none" className="absolute inset-0 w-full h-full pointer-events-none">
      <rect x="2" y="2" width="96" height="146" fill="none" stroke="rgba(255,255,255,0.55)" strokeWidth="0.4" />
      <line x1="2" y1="75" x2="98" y2="75" stroke="rgba(255,255,255,0.55)" strokeWidth="0.4" />
      <circle cx="50" cy="75" r="9" fill="none" stroke="rgba(255,255,255,0.55)" strokeWidth="0.4" />
      <circle cx="50" cy="75" r="0.6" fill="rgba(255,255,255,0.7)" />
      <rect x="22" y="2" width="56" height="14" fill="none" stroke="rgba(255,255,255,0.55)" strokeWidth="0.4" />
      <rect x="36" y="2" width="28" height="5" fill="none" stroke="rgba(255,255,255,0.55)" strokeWidth="0.4" />
      <rect x="22" y="134" width="56" height="14" fill="none" stroke="rgba(255,255,255,0.55)" strokeWidth="0.4" />
      <rect x="36" y="143" width="28" height="5" fill="none" stroke="rgba(255,255,255,0.55)" strokeWidth="0.4" />
    </svg>
  )
}

function PitchSlot({ slot, player, focused, dim, onClick }) {
  const size = 38
  const initials = player ? `${player.first[0]}${player.last[0]}` : null
  const queried = player?.status === 'queried'

  return (
    <div onClick={onClick} className="absolute cursor-pointer text-center"
      style={{
        left: `calc(${slot.x * 100}% - ${size / 2}px)`,
        top: `calc(${slot.y * 100}% - ${size / 2}px)`,
        width: size, opacity: dim ? 0.45 : 1,
        transition: 'opacity 0.15s, transform 0.15s',
        transform: focused ? 'scale(1.06)' : 'scale(1)',
        zIndex: focused ? 5 : player ? 3 : 2,
      }}>
      <div className="rounded-full flex items-center justify-center relative"
        style={{
          width: size, height: size,
          background: player ? 'var(--surface-card)' : 'rgba(255,255,255,0.16)',
          border: focused ? '2px solid var(--brand-accent)'
            : player ? `1.5px solid ${queried ? 'var(--status-warning)' : 'rgba(255,255,255,0.85)'}`
            : '1.5px dashed rgba(255,255,255,0.55)',
          boxShadow: player ? '0 2px 6px rgba(0,0,0,0.25)' : 'none',
        }}>
        {player ? (
          <span className="font-bold tracking-[-0.01em]" style={{ fontSize: size * 0.32, color: 'var(--text-primary)', fontFamily: 'var(--font-display)' }}>{initials}</span>
        ) : (
          <Plus size={size * 0.45} style={{ color: 'rgba(255,255,255,0.85)' }} />
        )}
        {player && (
          <span className="absolute -top-1 -right-1 rounded-full text-[8px] font-bold w-[16px] h-[16px] flex items-center justify-center"
            style={{ background: 'var(--brand-primary)', color: 'var(--on-brand-primary)' }}>
            {player.number || '·'}
          </span>
        )}
      </div>
      <div className="mt-0.5 text-[9px] font-semibold tracking-[0.02em] uppercase" style={{ color: 'rgba(255,255,255,0.7)' }}>
        {slot.role}
      </div>
      {player && <div className="text-[9.5px] font-medium truncate" style={{ color: 'rgba(255,255,255,0.9)' }}>{player.last}</div>}
    </div>
  )
}

function RosterSheet({ slot, squad, assignment, onPick, onClear }) {
  if (!slot) return null
  const currentPlayerId = assignment[slot.id]
  const placedIds = new Set(Object.values(assignment).filter(Boolean))
  const squadMap = new Map(squad.map(p => [p.id, p]))

  const sorted = [...squad].sort((a, b) => {
    const aFit = a.preferred?.includes(slot.role) ? 0 : 1
    const bFit = b.preferred?.includes(slot.role) ? 0 : 1
    return aFit - bFit
  })

  return (
    <div className="h-full overflow-y-auto">
      <div className="px-3 py-2 text-[11px] font-bold tracking-[0.06em] uppercase" style={{ color: 'var(--text-tertiary)' }}>
        Pick for {slot.role}
      </div>
      {sorted.map(p => {
        const isCurrent = p.id === currentPlayerId
        const isPlaced = placedIds.has(p.id) && !isCurrent
        const isBestFit = p.preferred?.includes(slot.role)
        return (
          <button key={p.id} onClick={() => !isCurrent && onPick(slot.id, p.id)}
            className="w-full flex items-center gap-2.5 px-3 py-2 text-left transition-colors"
            style={{
              opacity: isCurrent ? 0.5 : 1,
              background: isCurrent ? 'var(--brand-accent-tint)' : 'transparent',
              cursor: isCurrent ? 'default' : 'pointer',
            }}>
            <span className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0"
              style={{ background: 'var(--brand-primary-tint)', color: 'var(--brand-primary)' }}>
              {p.number || '·'}
            </span>
            <div className="flex-1 min-w-0">
              <span className="text-[13px] font-semibold block truncate" style={{ color: 'var(--text-primary)' }}>{p.name}</span>
              <span className="text-[11px] block" style={{ color: 'var(--text-tertiary)' }}>{(p.preferred || []).join(', ')}</span>
            </div>
            {isBestFit && <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full" style={{ background: 'var(--status-success-tint)', color: 'var(--status-success)' }}>Best fit</span>}
            {isPlaced && <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full" style={{ background: 'var(--surface-sunken)', color: 'var(--text-secondary)' }}>Will swap</span>}
            {p.status === 'queried' && <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full" style={{ background: 'var(--status-warning-tint)', color: 'var(--status-warning)' }}>Queried</span>}
          </button>
        )
      })}
      {currentPlayerId && (
        <div className="px-3 py-2 mt-1" style={{ borderTop: '1px solid var(--border-subtle)' }}>
          <button onClick={() => onClear(slot.id)} className="text-[12px] font-semibold" style={{ color: 'var(--status-error)' }}>Clear slot</button>
        </div>
      )}
    </div>
  )
}

function useFormationPersistence(fixtureId) {
  const key = `formation-${fixtureId || 'demo'}`
  const [data, setData] = useState(() => {
    try {
      const saved = localStorage.getItem(key)
      return saved ? JSON.parse(saved) : { primary: null, backup: null, format: '11v11' }
    } catch { return { primary: null, backup: null, format: '11v11' } }
  })
  const saveTimer = useRef(null)
  const [saveState, setSaveState] = useState('idle')

  const persist = useCallback((next) => {
    setData(next)
    setSaveState('saving')
    clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => {
      try { localStorage.setItem(key, JSON.stringify(next)) } catch {}
      setSaveState('saved')
      setTimeout(() => setSaveState('idle'), 1500)
    }, 500)
  }, [key])

  return { data, persist, saveState }
}

export default function FormationEditor({ format: initFormat = '11v11', squad = DEMO_SQUAD, fixtureId, onMobileSheet }) {
  const { data, persist, saveState } = useFormationPersistence(fixtureId)
  const [activeTab, setActiveTab] = useState('primary')
  const [format] = useState(initFormat)

  const tabData = activeTab === 'primary' ? data.primary : data.backup
  const [presetId, setPresetId] = useState(tabData?.presetId || DEFAULT_PRESETS[format])
  const [assignment, setAssignment] = useState(tabData?.assignment || {})
  const [focusedSlotId, setFocusedSlotId] = useState(null)

  useEffect(() => {
    const td = activeTab === 'primary' ? data.primary : data.backup
    setPresetId(td?.presetId || DEFAULT_PRESETS[format])
    setAssignment(td?.assignment || {})
    setFocusedSlotId(null)
  }, [activeTab])

  const presets = useMemo(() => getPresetsForFormat(format), [format])
  const preset = FOOTBALL_PRESETS[format]?.[presetId]
  const slots = preset?.slots || []
  const squadMap = useMemo(() => new Map(squad.map(p => [p.id, p])), [squad])
  const filledCount = Object.values(assignment).filter(Boolean).length
  const focusedSlot = focusedSlotId ? slots.find(s => s.id === focusedSlotId) : null
  const issues = useMemo(() => validateFormation({ slots }, assignment, squad), [slots, assignment, squad])

  function saveTab(newAssignment, newPresetId) {
    const tabState = { presetId: newPresetId || presetId, assignment: newAssignment || assignment }
    persist({
      ...data,
      format,
      [activeTab]: tabState,
    })
  }

  function handlePick(slotId, playerId) {
    setAssignment(prev => {
      const next = { ...prev }
      const existingSlot = Object.entries(next).find(([, pid]) => pid === playerId)?.[0]
      if (existingSlot && existingSlot !== slotId) {
        next[existingSlot] = next[slotId] || null
      }
      next[slotId] = playerId
      saveTab(next)
      return next
    })
    setFocusedSlotId(null)
  }

  function handleClear(slotId) {
    setAssignment(prev => {
      const n = { ...prev }; delete n[slotId]
      saveTab(n)
      return n
    })
    setFocusedSlotId(null)
  }

  function handlePresetChange(newId) {
    const oldPreset = FOOTBALL_PRESETS[format]?.[presetId]
    const newPreset = FOOTBALL_PRESETS[format]?.[newId]
    if (!newPreset) return
    const { assignment: kept } = transferAssignment(oldPreset, newPreset, assignment)
    setPresetId(newId)
    setAssignment(kept)
    saveTab(kept, newId)
  }

  function switchTab(tab) {
    saveTab()
    setActiveTab(tab)
  }

  return (
    <div className="rounded-[var(--radius-lg)] border border-[var(--border-subtle)] bg-[var(--surface-card)] shadow-[var(--shadow-sm)] overflow-hidden">
      <div className="px-[18px] py-[14px] flex items-center justify-between gap-3 flex-wrap" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
        <div className="flex items-center gap-[10px]">
          <span className="w-[30px] h-[30px] rounded-[var(--radius-md)] inline-flex items-center justify-center"
            style={{ background: 'var(--brand-primary)', color: 'var(--brand-accent)' }}>
            <Sparkles size={15} />
          </span>
          <div>
            <div className="text-[14.5px] font-semibold" style={{ color: 'var(--text-primary)' }}>Starting XI</div>
            <div className="text-[11.5px]" style={{ color: 'var(--text-tertiary)' }}>
              {saveState === 'saving' ? 'Saving...' : saveState === 'saved' ? 'Saved' : `${filledCount}/${slots.length} placed`}
            </div>
          </div>
        </div>
        {/* Primary / Backup toggle */}
        <div className="flex items-center gap-1.5 p-[2px] rounded-[var(--radius-sm)]" style={{ background: 'var(--surface-sunken)', border: '1px solid var(--border-subtle)' }}>
          <button onClick={() => switchTab('primary')} className="px-[10px] py-[4px] rounded-[var(--radius-sm)] text-[12px] font-semibold flex items-center gap-1"
            style={{ background: activeTab === 'primary' ? 'var(--surface-card)' : 'transparent', color: activeTab === 'primary' ? 'var(--text-primary)' : 'var(--text-tertiary)', boxShadow: activeTab === 'primary' ? 'var(--shadow-sm)' : 'none' }}>
            Primary {data.primary && <Check size={10} />}
          </button>
          <button onClick={() => switchTab('backup')} className="px-[10px] py-[4px] rounded-[var(--radius-sm)] text-[12px] font-semibold flex items-center gap-1"
            style={{ background: activeTab === 'backup' ? 'var(--surface-card)' : 'transparent', color: activeTab === 'backup' ? 'var(--text-primary)' : 'var(--text-tertiary)', boxShadow: activeTab === 'backup' ? 'var(--shadow-sm)' : 'none' }}>
            {data.backup ? 'Backup' : '+ Backup'}
          </button>
        </div>
        {/* Preset selector */}
        <div className="flex items-center gap-1.5 p-[2px] rounded-[var(--radius-sm)]" style={{ background: 'var(--surface-sunken)', border: '1px solid var(--border-subtle)' }}>
          {presets.map(p => (
            <button key={p.id} onClick={() => handlePresetChange(p.id)}
              className="px-[10px] py-[4px] rounded-[var(--radius-sm)] text-[12px] font-semibold transition-colors"
              style={{
                background: presetId === p.id ? 'var(--surface-card)' : 'transparent',
                color: presetId === p.id ? 'var(--text-primary)' : 'var(--text-tertiary)',
                boxShadow: presetId === p.id ? 'var(--shadow-sm)' : 'none',
              }}>
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex">
        <div className="relative flex-1" style={{ aspectRatio: '2/3', background: 'linear-gradient(180deg, #1a5e35 0%, #2a8b4e 30%, #1e6e3a 70%, #1a5e35 100%)', minHeight: 380 }}>
          <FootballPitchLines />
          {slots.map(slot => (
            <PitchSlot key={slot.id} slot={slot}
              player={assignment[slot.id] ? squadMap.get(assignment[slot.id]) : null}
              focused={focusedSlotId === slot.id}
              dim={focusedSlotId && focusedSlotId !== slot.id}
              onClick={() => setFocusedSlotId(focusedSlotId === slot.id ? null : slot.id)}
            />
          ))}
        </div>

        {/* Desktop right column: picker or bench */}
        <div className="w-[240px] shrink-0 hidden lg:block" style={{ borderLeft: '1px solid var(--border-subtle)' }}>
          {focusedSlot ? (
            <RosterSheet slot={focusedSlot} squad={squad} assignment={assignment} onPick={handlePick} onClear={handleClear} />
          ) : (
            <div className="p-3">
              <div className="text-[11px] font-bold tracking-[0.06em] uppercase mb-2" style={{ color: 'var(--text-tertiary)' }}>Bench</div>
              {squad.filter(p => !Object.values(assignment).includes(p.id)).map(p => (
                <div key={p.id} className="flex items-center gap-2 py-1.5 text-[12px]" style={{ color: 'var(--text-secondary)' }}>
                  <span className="w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-bold" style={{ background: 'var(--brand-primary-tint)', color: 'var(--brand-primary)' }}>{p.number}</span>
                  <span className="truncate">{p.name}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Mobile bottom sheet */}
      {focusedSlot && (
        <div className="lg:hidden fixed inset-0 z-50">
          <div className="absolute inset-0" style={{ background: 'rgba(15,30,61,0.32)' }} onClick={() => setFocusedSlotId(null)} />
          <div className="absolute bottom-0 left-0 right-0 rounded-t-[var(--radius-xl)] overflow-hidden"
            className="animate-sheet-up"
            style={{ background: 'var(--surface-card)', maxHeight: '65vh' }}>
            <div className="flex justify-center pt-2 pb-1">
              <div className="w-8 h-1 rounded-full" style={{ background: 'var(--border-default)' }} />
            </div>
            <div className="px-4 pb-1 flex items-center justify-between">
              <span className="text-[13px] font-semibold" style={{ color: 'var(--text-primary)' }}>Pick for {focusedSlot.role}</span>
              <button onClick={() => setFocusedSlotId(null)} className="p-1" style={{ color: 'var(--text-tertiary)' }}><X size={18} /></button>
            </div>
            <div className="overflow-y-auto" style={{ maxHeight: 'calc(65vh - 52px)' }}>
              <RosterSheet slot={focusedSlot} squad={squad} assignment={assignment} onPick={handlePick} onClear={handleClear} />
            </div>
          </div>
        </div>
      )}

      {issues.filter(i => i.severity !== 'info').length > 0 && (
        <div className="px-4 py-3" style={{ background: 'var(--status-warning-tint)', borderTop: '1px solid var(--border-subtle)' }}>
          <div className="flex items-center gap-1.5 text-[12px] font-semibold mb-1" style={{ color: 'var(--status-warning)' }}>
            <AlertTriangle size={13} /> {issues.filter(i => i.severity !== 'info').length} issue{issues.filter(i => i.severity !== 'info').length !== 1 ? 's' : ''}
          </div>
          {issues.filter(i => i.severity !== 'info').map((iss, i) => (
            <div key={i} className="text-[11.5px] ml-5" style={{ color: 'var(--text-secondary)' }}>{iss.message}</div>
          ))}
        </div>
      )}
    </div>
  )
}
