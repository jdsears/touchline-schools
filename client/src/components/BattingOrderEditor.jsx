import { useState } from 'react'
import { GripVertical, Plus, X, AlertTriangle } from 'lucide-react'

function WicketkeeperIcon({ active, onClick }) {
  return (
    <button onClick={onClick} title={active ? 'Wicketkeeper' : 'Set as wicketkeeper'}
      className="w-6 h-6 rounded-full flex items-center justify-center transition-colors"
      style={{
        background: active ? 'var(--brand-accent-tint)' : 'transparent',
        color: active ? 'var(--brand-accent)' : 'var(--text-tertiary)',
        border: active ? '1px solid var(--brand-accent)' : '1px solid var(--border-subtle)',
      }}>
      <span className="text-[10px] font-bold">WK</span>
    </button>
  )
}

export default function BattingOrderEditor({ squad = [], format }) {
  const [order, setOrder] = useState(() => squad.slice(0, format?.playerCount || 11).map(p => p.id))
  const [wkId, setWkId] = useState(null)
  const [dragIdx, setDragIdx] = useState(null)
  const squadMap = new Map(squad.map(p => [p.id, p]))
  const bench = squad.filter(p => !order.includes(p.id))
  const issues = []

  if (order.length < (format?.playerCount || 11)) {
    issues.push(`${(format?.playerCount || 11) - order.length} positions empty`)
  }
  if (!wkId && order.length > 0) {
    issues.push('No wicketkeeper designated')
  }

  function addPlayer(playerId) {
    if (order.length >= (format?.playerCount || 11)) return
    setOrder(prev => [...prev, playerId])
  }

  function removePlayer(idx) {
    const pid = order[idx]
    if (pid === wkId) setWkId(null)
    setOrder(prev => prev.filter((_, i) => i !== idx))
  }

  function handleDragStart(idx) { setDragIdx(idx) }
  function handleDragOver(e, idx) {
    e.preventDefault()
    if (dragIdx === null || dragIdx === idx) return
    setOrder(prev => {
      const next = [...prev]
      const [moved] = next.splice(dragIdx, 1)
      next.splice(idx, 0, moved)
      return next
    })
    setDragIdx(idx)
  }
  function handleDragEnd() { setDragIdx(null) }

  return (
    <div className="rounded-[var(--radius-lg)] border border-[var(--border-subtle)] bg-[var(--surface-card)] shadow-[var(--shadow-sm)] overflow-hidden">
      <div className="px-[18px] py-[14px] flex items-center justify-between" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
        <div>
          <div className="text-[14.5px] font-semibold" style={{ color: 'var(--text-primary)' }}>{format?.orderLabel || 'Batting Order'}</div>
          <div className="text-[11.5px]" style={{ color: 'var(--text-tertiary)' }}>{order.length}/{format?.playerCount || 11} placed</div>
        </div>
      </div>

      <div className="divide-y" style={{ borderColor: 'var(--border-subtle)' }}>
        {order.map((pid, idx) => {
          const p = squadMap.get(pid)
          if (!p) return null
          return (
            <div key={pid} draggable onDragStart={() => handleDragStart(idx)}
              onDragOver={e => handleDragOver(e, idx)} onDragEnd={handleDragEnd}
              className="flex items-center gap-3 px-4 py-2.5 transition-colors"
              style={{ background: dragIdx === idx ? 'var(--brand-accent-tint)' : 'transparent' }}>
              <span className="text-[14px] font-bold tabular-nums w-6 text-right" style={{ color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)' }}>{idx + 1}</span>
              <GripVertical size={14} className="cursor-grab shrink-0" style={{ color: 'var(--text-tertiary)' }} />
              <span className="text-[13px] font-semibold flex-1" style={{ color: 'var(--text-primary)' }}>{p.name}</span>
              <span className="text-[11px] px-1.5 py-0.5 rounded" style={{ background: 'var(--surface-sunken)', color: 'var(--text-tertiary)' }}>
                {p.preferred?.includes('LHB') ? 'LHB' : 'RHB'}
              </span>
              <WicketkeeperIcon active={wkId === pid} onClick={() => setWkId(wkId === pid ? null : pid)} />
              <button onClick={() => removePlayer(idx)} className="p-0.5" style={{ color: 'var(--text-tertiary)' }}><X size={14} /></button>
            </div>
          )
        })}
      </div>

      {bench.length > 0 && order.length < (format?.playerCount || 11) && (
        <div className="px-4 py-3" style={{ borderTop: '1px solid var(--border-subtle)', background: 'var(--surface-sunken)' }}>
          <div className="text-[10px] font-bold tracking-[0.06em] uppercase mb-2" style={{ color: 'var(--text-tertiary)' }}>Available</div>
          <div className="flex flex-wrap gap-1.5">
            {bench.map(p => (
              <button key={p.id} onClick={() => addPlayer(p.id)}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-[var(--radius-sm)] text-[12px] font-medium"
                style={{ background: 'var(--surface-card)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }}>
                <Plus size={10} /> {p.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {issues.length > 0 && (
        <div className="px-4 py-3" style={{ background: 'var(--status-warning-tint)', borderTop: '1px solid var(--border-subtle)' }}>
          <div className="flex items-center gap-1.5 text-[12px] font-semibold mb-1" style={{ color: 'var(--status-warning)' }}>
            <AlertTriangle size={13} /> {issues.length} issue{issues.length !== 1 ? 's' : ''}
          </div>
          {issues.map((iss, i) => (
            <div key={i} className="text-[11.5px] ml-5" style={{ color: 'var(--text-secondary)' }}>{iss}</div>
          ))}
        </div>
      )}
    </div>
  )
}

export function BattingPairsEditor({ squad = [], format }) {
  const pairCount = format?.pairsConfig?.pairCount || 4
  const oversPerPair = format?.pairsConfig?.oversPerPair || 3
  const [pairs, setPairs] = useState(() =>
    Array.from({ length: pairCount }, (_, i) => ({
      batterA: squad[i * 2]?.id || null,
      batterB: squad[i * 2 + 1]?.id || null,
    }))
  )
  const [wkId, setWkId] = useState(null)
  const squadMap = new Map(squad.map(p => [p.id, p]))
  const usedIds = new Set(pairs.flatMap(p => [p.batterA, p.batterB].filter(Boolean)))
  const bench = squad.filter(p => !usedIds.has(p.id))

  function assignToPair(pairIdx, slot, playerId) {
    setPairs(prev => prev.map((p, i) => i === pairIdx ? { ...p, [slot]: playerId } : p))
  }

  function swapWithinPair(pairIdx) {
    setPairs(prev => prev.map((p, i) => i === pairIdx ? { batterA: p.batterB, batterB: p.batterA } : p))
  }

  const issues = []
  const incomplete = pairs.filter(p => !p.batterA || !p.batterB)
  if (incomplete.length > 0) issues.push(`${incomplete.length} pair${incomplete.length !== 1 ? 's' : ''} incomplete`)
  if (!wkId) issues.push('No wicketkeeper designated')

  return (
    <div className="rounded-[var(--radius-lg)] border border-[var(--border-subtle)] bg-[var(--surface-card)] shadow-[var(--shadow-sm)] overflow-hidden">
      <div className="px-[18px] py-[14px] flex items-center justify-between" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
        <div>
          <div className="text-[14.5px] font-semibold" style={{ color: 'var(--text-primary)' }}>Batting Pairs</div>
          <div className="text-[11.5px]" style={{ color: 'var(--text-tertiary)' }}>{pairCount} pairs, {oversPerPair} overs each</div>
        </div>
      </div>

      {pairs.map((pair, idx) => (
        <div key={idx} className="px-4 py-3" style={{ borderTop: idx > 0 ? '1px solid var(--border-subtle)' : undefined }}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold tracking-[0.06em] uppercase" style={{ color: 'var(--text-tertiary)' }}>Pair {idx + 1}</span>
            <button onClick={() => swapWithinPair(idx)} className="text-[10px] font-semibold" style={{ color: 'var(--brand-primary)' }}>Swap</button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {['batterA', 'batterB'].map(slot => {
              const pid = pair[slot]
              const p = pid ? squadMap.get(pid) : null
              return (
                <div key={slot} className="flex items-center gap-2 p-2 rounded-[var(--radius-md)]"
                  style={{ background: p ? 'var(--surface-card)' : 'var(--surface-sunken)', border: `1px solid ${p ? 'var(--border-default)' : 'var(--border-subtle)'}` }}>
                  {p ? (
                    <>
                      <span className="text-[13px] font-semibold flex-1 truncate" style={{ color: 'var(--text-primary)' }}>{p.name}</span>
                      <span className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>{p.preferred?.includes('LHB') ? 'LHB' : 'RHB'}</span>
                    </>
                  ) : (
                    <span className="text-[12px] italic" style={{ color: 'var(--text-tertiary)' }}>Pick batter</span>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      ))}

      {bench.length > 0 && (
        <div className="px-4 py-3" style={{ borderTop: '1px solid var(--border-subtle)', background: 'var(--surface-sunken)' }}>
          <div className="text-[10px] font-bold tracking-[0.06em] uppercase mb-2" style={{ color: 'var(--text-tertiary)' }}>Available</div>
          <div className="flex flex-wrap gap-1.5">
            {bench.map(p => (
              <span key={p.id} className="text-[12px] px-2 py-0.5 rounded" style={{ background: 'var(--surface-card)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }}>
                {p.name}
              </span>
            ))}
          </div>
        </div>
      )}

      {issues.length > 0 && (
        <div className="px-4 py-3" style={{ background: 'var(--status-warning-tint)', borderTop: '1px solid var(--border-subtle)' }}>
          <div className="flex items-center gap-1.5 text-[12px] font-semibold" style={{ color: 'var(--status-warning)' }}>
            <AlertTriangle size={13} /> {issues.join(' · ')}
          </div>
        </div>
      )}
    </div>
  )
}
