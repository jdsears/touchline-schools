import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { X, Printer } from 'lucide-react'

// Generate unique short initials for each pupil
function generateInitials(pupils) {
  const initials = new Map()

  // First pass: try first letter of first name
  const firstLetters = new Map()
  for (const p of pupils) {
    const name = p.player_name || p.name || 'P'
    const first = name.charAt(0).toUpperCase()
    if (!firstLetters.has(first)) firstLetters.set(first, [])
    firstLetters.get(first).push(p)
  }

  for (const [letter, group] of firstLetters) {
    if (group.length === 1) {
      initials.set(group[0].pupil_id, letter)
    } else {
      // Collision: use first letter + second letter of name (or surname initial)
      const secondPass = new Map()
      for (const p of group) {
        const name = p.player_name || p.name || 'P'
        const parts = name.trim().split(/\s+/)
        let init
        if (parts.length > 1) {
          init = parts[0].charAt(0).toUpperCase() + parts[parts.length - 1].charAt(0).toUpperCase()
        } else {
          init = name.substring(0, 2).toUpperCase()
        }
        if (!secondPass.has(init)) secondPass.set(init, [])
        secondPass.get(init).push(p)
      }
      for (const [init, subGroup] of secondPass) {
        if (subGroup.length === 1) {
          initials.set(subGroup[0].pupil_id, init)
        } else {
          // Still colliding, add index
          subGroup.forEach((p, idx) => {
            initials.set(p.pupil_id, init + (idx + 1))
          })
        }
      }
    }
  }

  return initials
}

// Get which pupils are on field for each period
function getPerPeriodLineups(result, numPeriods, matchDuration) {
  const periodLength = matchDuration / numPeriods
  const periods = []

  for (let i = 0; i < numPeriods; i++) {
    const periodStart = Math.round(i * periodLength)
    const periodEnd = Math.round((i + 1) * periodLength)
    const periodMid = (periodStart + periodEnd) / 2

    const onField = result.slots.filter(slot =>
      slot.segments.some(seg => seg.start <= periodMid && seg.end > periodMid)
    )
    const offField = result.slots.filter(slot =>
      !slot.segments.some(seg => seg.start <= periodMid && seg.end > periodMid)
    )

    periods.push({
      index: i,
      start: periodStart,
      end: periodEnd,
      duration: periodEnd - periodStart,
      onField,
      offField,
    })
  }

  return periods
}

// Mini pitch SVG with pupil initials
function MiniPitch({ pupils, formation, formationPositions, initials, playersOnField }) {
  const positions = formationPositions || []

  // Match pupils to formation positions by their match-day position
  const assigned = new Map()
  const unassignedPlayers = [...pupils]
  const unassignedPositions = [...positions]

  // First: match by position label
  for (let i = unassignedPlayers.length - 1; i >= 0; i--) {
    const pupil = unassignedPlayers[i]
    if (!pupil.pupil?.position) continue
    const posIdx = unassignedPositions.findIndex(
      pos => pos.label === pupil.pupil.position
    )
    if (posIdx !== -1) {
      assigned.set(unassignedPositions[posIdx].id, pupil)
      unassignedPositions.splice(posIdx, 1)
      unassignedPlayers.splice(i, 1)
    }
  }

  // Second: fill remaining positions in order
  for (let i = 0; i < unassignedPositions.length && unassignedPlayers.length > 0; i++) {
    assigned.set(unassignedPositions[i].id, unassignedPlayers.shift())
  }

  return (
    <svg viewBox="0 0 200 280" className="print-pitch">
      {/* Pitch background with stripes */}
      <defs>
        <pattern id="grass" width="200" height="40" patternUnits="userSpaceOnUse">
          <rect width="200" height="20" fill="#2a9d4e" />
          <rect y="20" width="200" height="20" fill="#24913f" />
        </pattern>
      </defs>
      <rect width="200" height="280" fill="url(#grass)" rx="6" />

      {/* Pitch boundary */}
      <rect x="12" y="12" width="176" height="256" fill="none" stroke="white" strokeWidth="1.5" strokeOpacity="0.6" rx="2" />

      {/* Center line */}
      <line x1="12" y1="140" x2="188" y2="140" stroke="white" strokeWidth="1.5" strokeOpacity="0.6" />

      {/* Center circle */}
      <circle cx="100" cy="140" r={playersOnField <= 5 ? 18 : playersOnField <= 7 ? 22 : 28} fill="none" stroke="white" strokeWidth="1.5" strokeOpacity="0.6" />
      <circle cx="100" cy="140" r="2" fill="white" fillOpacity="0.6" />

      {/* Penalty areas - scale based on format */}
      {playersOnField <= 5 ? (
        <>
          <path d={`M 70 12 Q 70 42 100 42 Q 130 42 130 12`} fill="none" stroke="white" strokeWidth="1.5" strokeOpacity="0.6" />
          <path d={`M 70 268 Q 70 238 100 238 Q 130 238 130 268`} fill="none" stroke="white" strokeWidth="1.5" strokeOpacity="0.6" />
        </>
      ) : playersOnField <= 7 ? (
        <>
          <path d={`M 65 12 Q 65 48 100 48 Q 135 48 135 12`} fill="none" stroke="white" strokeWidth="1.5" strokeOpacity="0.6" />
          <path d={`M 65 268 Q 65 232 100 232 Q 135 232 135 268`} fill="none" stroke="white" strokeWidth="1.5" strokeOpacity="0.6" />
        </>
      ) : (
        <>
          <rect x="56" y="12" width="88" height="40" fill="none" stroke="white" strokeWidth="1.5" strokeOpacity="0.6" />
          <rect x="56" y="228" width="88" height="40" fill="none" stroke="white" strokeWidth="1.5" strokeOpacity="0.6" />
          <rect x="76" y="12" width="48" height="16" fill="none" stroke="white" strokeWidth="1.5" strokeOpacity="0.6" />
          <rect x="76" y="252" width="48" height="16" fill="none" stroke="white" strokeWidth="1.5" strokeOpacity="0.6" />
        </>
      )}

      {/* Pupil dots with initials */}
      {positions.map(pos => {
        const pupil = assigned.get(pos.id)
        if (!pupil) return null
        const initial = initials.get(pupil.pupil?.pupil_id || pupil.pupil?.id) || '?'
        const cx = pos.x * 1.76 + 12 // Scale 0-100% to 12-188 (pitch area)
        const cy = pos.y * 2.56 + 12 // Scale 0-100% to 12-268

        return (
          <g key={pos.id}>
            <circle cx={cx} cy={cy} r="14" fill="#1a1a2e" stroke="#333" strokeWidth="1" />
            <text
              x={cx}
              y={cy}
              textAnchor="middle"
              dominantBaseline="central"
              fill="#e63946"
              fontSize={initial.length > 2 ? "8" : "10"}
              fontWeight="bold"
              fontFamily="sans-serif"
            >
              {initial}
            </text>
          </g>
        )
      })}
    </svg>
  )
}

export default function PlayingTimePrintView({
  result,
  squad,
  matchDuration,
  numPeriods,
  playersOnField,
  formation,
  formationPositions,
  teamName,
  teamFormat,
  matchInfo,
  onClose,
}) {
  const printRef = useRef()

  // Generate unique initials for all squad pupils
  const allPlayers = squad.map(s => ({
    pupil_id: s.pupil_id || s.id,
    player_name: s.player_name || s.name,
    ...s,
  }))
  const initials = generateInitials(allPlayers)

  // Get per-period lineups
  const periods = getPerPeriodLineups(result, numPeriods, matchDuration)

  function handlePrint() {
    window.print()
  }

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  // Build the legend key
  const legendItems = allPlayers.map(p => ({
    initial: initials.get(p.pupil_id) || '?',
    name: p.player_name || p.name || 'Pupil',
  }))

  const content = (
    <div className="fixed inset-0 z-[9999] bg-black/80 flex flex-col print-overlay">
      {/* Screen-only toolbar */}
      <div className="print-hide flex items-center justify-between px-4 py-3 bg-navy-900 border-b border-navy-800">
        <h2 className="text-white font-display font-semibold">Rotation Plan — Print Preview</h2>
        <div className="flex items-center gap-3">
          <button
            onClick={handlePrint}
            className="btn-primary btn-sm flex items-center gap-2"
          >
            <Printer className="w-4 h-4" />
            Print
          </button>
          <button onClick={onClose} className="text-navy-400 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Scrollable preview area */}
      <div className="flex-1 overflow-auto flex justify-center py-6 print-content-area">
        <div ref={printRef} className="print-page">
          {/* Header */}
          <div className="print-header">
            <h1 className="print-title">
              {teamName || 'Team'}{teamFormat ? ` U${teamFormat === 5 ? '6' : teamFormat === 7 ? '8' : teamFormat === 9 ? '10' : teamFormat === 11 ? '12+' : ''}` : ''}
            </h1>
            {matchInfo && (
              <p className="print-subtitle">
                {matchInfo.opponent ? `vs ${matchInfo.opponent}` : ''}
                {matchInfo.date ? ` — ${new Date(matchInfo.date).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}` : ''}
              </p>
            )}
          </div>

          {/* Pupil key */}
          <div className="print-key">
            <span className="print-key-label">Key:</span>
            {legendItems.map((item, i) => (
              <span key={i} className="print-key-item">
                <span className="print-key-dot">{item.initial}</span>
                <span>= {item.name}</span>
              </span>
            ))}
          </div>

          {/* Periods */}
          <div className="print-periods">
            {periods.map((period, idx) => (
              <div key={idx} className="print-period-row">
                {/* Duration */}
                <div className="print-period-duration">
                  <span className="print-duration-number">{period.duration}</span>
                  <span className="print-duration-label">Mins</span>
                </div>

                {/* Mini pitch */}
                <div className="print-period-pitch">
                  <MiniPitch
                    pupils={period.onField}
                    formation={formation}
                    formationPositions={formationPositions}
                    initials={initials}
                    playersOnField={playersOnField}
                  />
                </div>

                {/* Formation name */}
                <div className="print-period-formation">
                  {formation || '—'}
                </div>

                {/* Subs for this period */}
                {period.offField.length > 0 && (
                  <div className="print-period-subs">
                    <span className="print-subs-label">Subs:</span>
                    {period.offField.map((s, i) => (
                      <span key={i} className="print-sub-dot">
                        {initials.get(s.pupil?.pupil_id || s.pupil?.id) || '?'}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Summary footer */}
          <div className="print-footer">
            <p>
              {result.allEqual
                ? `Equal playing time: ~${result.idealMinutesPerPlayer} min each`
                : `Range: ${result.minMinutes}–${result.maxMinutes} min per pupil (target: ~${result.idealMinutesPerPlayer} min)`
              }
            </p>
            {result.subTimes.length > 0 && (
              <p>Substitution windows: {result.subTimes.map(t => `${t}'`).join(', ')}</p>
            )}
          </div>
        </div>
      </div>

      {/* Print styles injected via portal */}
      <style>{`
        /* ===== PRINT PAGE STYLES ===== */
        .print-page {
          width: 210mm;
          min-height: auto;
          background: white;
          color: #111;
          padding: 12mm 15mm;
          font-family: 'Inter', 'Helvetica Neue', sans-serif;
          box-sizing: border-box;
        }

        .print-header {
          text-align: center;
          margin-bottom: 4mm;
          padding-bottom: 3mm;
          border-bottom: 2px solid #111;
        }

        .print-title {
          font-family: 'Outfit', 'Helvetica Neue', sans-serif;
          font-size: 18pt;
          font-weight: 700;
          margin: 0;
          color: #111;
          text-decoration: underline;
        }

        .print-subtitle {
          font-size: 10pt;
          color: #444;
          margin: 2mm 0 0 0;
        }

        .print-key {
          display: flex;
          flex-wrap: wrap;
          gap: 3mm;
          align-items: center;
          margin-bottom: 4mm;
          font-size: 8pt;
          color: #333;
        }

        .print-key-label {
          font-weight: 700;
          margin-right: 1mm;
        }

        .print-key-item {
          display: inline-flex;
          align-items: center;
          gap: 1mm;
        }

        .print-key-dot {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 5mm;
          height: 5mm;
          border-radius: 50%;
          background: #1a1a2e;
          color: #e63946;
          font-size: 6pt;
          font-weight: 700;
        }

        .print-periods {
          display: flex;
          flex-direction: column;
        }

        .print-period-row {
          display: grid;
          grid-template-columns: 22mm 1fr 22mm;
          grid-template-rows: auto auto;
          align-items: center;
          padding: 3mm 0;
          border-bottom: 2.5px solid #e63946;
          gap: 0 3mm;
          min-height: 0;
        }

        .print-period-row:last-child {
          border-bottom: none;
        }

        .print-period-duration {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
        }

        .print-duration-number {
          font-size: 16pt;
          font-weight: 800;
          line-height: 1;
          color: #111;
        }

        .print-duration-label {
          font-size: 9pt;
          font-weight: 600;
          color: #111;
        }

        .print-period-pitch {
          display: flex;
          justify-content: center;
          align-items: center;
        }

        .print-pitch {
          width: auto;
          height: 100%;
          max-height: 100%;
        }

        .print-period-formation {
          font-size: 14pt;
          font-weight: 700;
          text-align: center;
          color: #111;
        }

        .print-period-subs {
          grid-column: 1 / -1;
          display: flex;
          align-items: center;
          gap: 2mm;
          font-size: 7pt;
          color: #666;
          margin-top: 1mm;
          justify-content: center;
        }

        .print-subs-label {
          font-weight: 600;
          font-size: 7pt;
        }

        .print-sub-dot {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 5mm;
          height: 5mm;
          border-radius: 50%;
          background: #ccc;
          color: #333;
          font-size: 6pt;
          font-weight: 700;
        }

        .print-footer {
          margin-top: 4mm;
          padding-top: 3mm;
          border-top: 1px solid #ccc;
          font-size: 8pt;
          color: #666;
          text-align: center;
        }

        .print-footer p {
          margin: 1mm 0;
        }

        /* ===== SCREEN PREVIEW ===== */
        @media screen {
          .print-page {
            box-shadow: 0 4px 20px rgba(0,0,0,0.5);
            border-radius: 4px;
            max-width: 210mm;
          }

          .print-period-pitch {
            height: 140px;
          }

          .print-pitch {
            height: 140px;
          }
        }

        /* ===== PRINT MEDIA ===== */
        @media print {
          /* Hide everything except our print page */
          body > *:not(.print-overlay-portal) {
            display: none !important;
          }

          .print-overlay {
            position: static !important;
            background: none !important;
          }

          .print-hide {
            display: none !important;
          }

          .print-content-area {
            overflow: visible !important;
            padding: 0 !important;
            display: block !important;
          }

          .print-page {
            width: 100%;
            padding: 8mm 10mm;
            box-shadow: none;
            border-radius: 0;
          }

          .print-periods {
            page-break-inside: avoid;
          }

          .print-period-row {
            page-break-inside: avoid;
          }

          /* Dynamically size pitches to fit page */
          .print-period-pitch {
            height: auto;
          }

          .print-pitch {
            height: auto;
            max-height: 42mm;
          }

          @page {
            size: A4 portrait;
            margin: 8mm;
          }
        }
      `}</style>
    </div>
  )

  return createPortal(content, document.body)
}
