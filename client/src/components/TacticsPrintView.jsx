import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { X, Printer } from 'lucide-react'

function formatPlayerName(name) {
  if (!name) return ''
  const parts = name.trim().split(' ')
  if (parts.length === 1) return parts[0]
  const firstName = parts[0]
  const lastInitial = parts[parts.length - 1].charAt(0).toUpperCase()
  return `${firstName} ${lastInitial}.`
}

// SVG pitch with pupil positions
function PitchSVG({ positions, pupils, teamFormat, formation }) {
  const w = 300
  const h = 400
  const pad = 12 // pitch field padding inside the SVG

  const getPlayer = (posId) => {
    const pos = positions.find(p => p.id === posId)
    if (!pos?.pupilId) return null
    return pupils.find(p => p.id === pos.pupilId)
  }

  // Pitch markings helper
  const renderMarkings = () => {
    const fx = pad
    const fy = pad
    const fw = w - pad * 2
    const fh = h - pad * 2

    const elements = [
      // Field border
      <rect key="border" x={fx} y={fy} width={fw} height={fh} fill="none" stroke="white" strokeWidth="2" />,
      // Halfway line
      <line key="half" x1={fx} y1={fy + fh / 2} x2={fx + fw} y2={fy + fh / 2} stroke="white" strokeWidth="1.5" />,
      // Center circle
      <circle key="center-circle" cx={fx + fw / 2} cy={fy + fh / 2} r={fw * 0.1} fill="none" stroke="white" strokeWidth="1.5" />,
      // Center spot
      <circle key="center-spot" cx={fx + fw / 2} cy={fy + fh / 2} r={2} fill="white" />,
    ]

    if (teamFormat >= 11) {
      // Penalty areas
      const paW = fw * 0.44
      const paH = fh * 0.16
      const gaW = fw * 0.20
      const gaH = fh * 0.06
      elements.push(
        <rect key="pa-top" x={fx + (fw - paW) / 2} y={fy} width={paW} height={paH} fill="none" stroke="white" strokeWidth="1.5" />,
        <rect key="pa-bot" x={fx + (fw - paW) / 2} y={fy + fh - paH} width={paW} height={paH} fill="none" stroke="white" strokeWidth="1.5" />,
        <rect key="ga-top" x={fx + (fw - gaW) / 2} y={fy} width={gaW} height={gaH} fill="none" stroke="white" strokeWidth="1.5" />,
        <rect key="ga-bot" x={fx + (fw - gaW) / 2} y={fy + fh - gaH} width={gaW} height={gaH} fill="none" stroke="white" strokeWidth="1.5" />,
        // Pen spots
        <circle key="pen-top" cx={fx + fw / 2} cy={fy + fh * 0.11} r={1.5} fill="white" />,
        <circle key="pen-bot" cx={fx + fw / 2} cy={fy + fh * 0.89} r={1.5} fill="white" />,
      )
    } else {
      // Smaller formats: simple arcs
      const arcW = fw * (teamFormat <= 7 ? 0.28 : 0.32)
      const arcH = fh * (teamFormat <= 7 ? 0.10 : 0.12)
      elements.push(
        <ellipse key="arc-top" cx={fx + fw / 2} cy={fy} rx={arcW / 2} ry={arcH} fill="none" stroke="white" strokeWidth="1.5" />,
        <ellipse key="arc-bot" cx={fx + fw / 2} cy={fy + fh} rx={arcW / 2} ry={arcH} fill="none" stroke="white" strokeWidth="1.5" />,
      )
    }

    return elements
  }

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="print-pitch-svg" xmlns="http://www.w3.org/2000/svg">
      {/* Grass background */}
      <defs>
        <pattern id="grass-print" patternUnits="userSpaceOnUse" width={w} height="24">
          <rect width={w} height="12" fill="#22c55e" />
          <rect y="12" width={w} height="12" fill="#16a34a" />
        </pattern>
      </defs>
      <rect width={w} height={h} rx="6" fill="url(#grass-print)" />

      {/* Markings */}
      {renderMarkings()}

      {/* Pupil dots */}
      {positions.map(pos => {
        const pupil = getPlayer(pos.id)
        const cx = pad + (pos.x / 100) * (w - pad * 2)
        const cy = pad + (pos.y / 100) * (h - pad * 2)

        return (
          <g key={pos.id}>
            {/* Shadow */}
            <circle cx={cx} cy={cy + 1} r={14} fill="rgba(0,0,0,0.2)" />
            {/* Dot */}
            <circle cx={cx} cy={cy} r={13} fill={pupil ? 'white' : 'rgba(255,255,255,0.5)'} stroke={pupil ? '#e5e7eb' : 'rgba(255,255,255,0.3)'} strokeWidth="1" />
            {/* Squad number */}
            <text
              x={cx}
              y={cy}
              textAnchor="middle"
              dominantBaseline="central"
              fill={pupil ? '#1e293b' : '#94a3b8'}
              fontSize="11"
              fontWeight="700"
              fontFamily="system-ui, sans-serif"
            >
              {pupil?.squad_number || ''}
            </text>
            {/* Name label below */}
            <rect
              x={cx - 28}
              y={cy + 15}
              width="56"
              height="14"
              rx="3"
              fill="rgba(0,0,0,0.6)"
            />
            <text
              x={cx}
              y={cy + 23}
              textAnchor="middle"
              dominantBaseline="central"
              fill="white"
              fontSize="7"
              fontWeight="600"
              fontFamily="system-ui, sans-serif"
            >
              {pupil ? formatPlayerName(pupil.name) : pos.label}
            </text>
          </g>
        )
      })}
    </svg>
  )
}

export default function TacticsPrintView({
  onClose,
  positions,
  pupils,
  formation,
  teamFormat,
  teamName,
  ageGroup,
  logoUrl,
  gameModel,
  benchPlayers,
  setPieceTakers,
}) {
  // Escape to close
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  const today = new Date().toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

  // Build bench pupil list
  const benchList = (benchPlayers || [])
    .map(id => pupils.find(p => p.id === id))
    .filter(Boolean)

  // Set piece takers info
  const setPieces = setPieceTakers || {}
  const setPieceEntries = Object.entries(setPieces)
    .filter(([, pupilId]) => pupilId)
    .map(([role, pupilId]) => {
      const pupil = pupils.find(p => p.id === Number(pupilId) || p.id === pupilId)
      const labels = {
        corners_left: 'Corners (L)',
        corners_right: 'Corners (R)',
        free_kicks: 'Free Kicks',
        penalties: 'Penalties',
        throw_ins_long: 'Long Throws',
      }
      return { label: labels[role] || role, pupil }
    })
    .filter(e => e.pupil)

  // Game model summary
  const gmEntries = []
  if (gameModel?.style) gmEntries.push({ label: 'Style', value: gameModel.style })
  if (gameModel?.buildUp) gmEntries.push({ label: 'Build Up', value: gameModel.buildUp })
  if (gameModel?.pressing) gmEntries.push({ label: 'Pressing', value: gameModel.pressing })
  if (gameModel?.inPossession) gmEntries.push({ label: 'In Possession', value: gameModel.inPossession })
  if (gameModel?.outOfPossession) gmEntries.push({ label: 'Out of Possession', value: gameModel.outOfPossession })

  const content = (
    <div className="print-overlay-portal">
      <div className="print-overlay" style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: 'rgba(0,0,0,0.85)',
        display: 'flex',
        flexDirection: 'column',
      }}>
        {/* Toolbar */}
        <div className="print-hide" style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '12px 20px',
          borderBottom: '1px solid rgba(255,255,255,0.1)',
        }}>
          <span style={{ color: 'white', fontWeight: 600, fontSize: '14px' }}>
            Tactics Board — Print Preview
          </span>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={() => window.print()}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 16px',
                background: '#22c55e',
                color: '#0f172a',
                border: 'none',
                borderRadius: '8px',
                fontWeight: 600,
                fontSize: '13px',
                cursor: 'pointer',
              }}
            >
              <Printer size={16} />
              Print
            </button>
            <button
              onClick={onClose}
              style={{
                display: 'flex',
                alignItems: 'center',
                padding: '8px',
                background: 'rgba(255,255,255,0.1)',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
              }}
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Scrollable preview */}
        <div className="print-content-area" style={{
          flex: 1,
          overflow: 'auto',
          padding: '24px',
          display: 'flex',
          justifyContent: 'center',
        }}>
          <div className="print-page" style={{
            background: 'white',
            color: '#1e293b',
            fontFamily: 'system-ui, -apple-system, sans-serif',
            padding: '12mm 15mm',
            width: '210mm',
            minHeight: '297mm',
          }}>
            {/* Header with logos */}
            <div className="print-header" style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '6mm',
              paddingBottom: '4mm',
              borderBottom: '2px solid #22c55e',
            }}>
              {/* School logo */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                {logoUrl && (
                  <img
                    src={logoUrl}
                    alt="School badge"
                    style={{ height: '40px', width: 'auto', objectFit: 'contain' }}
                    crossOrigin="anonymous"
                  />
                )}
                <div>
                  <div style={{ fontSize: '16pt', fontWeight: 700, color: '#0f172a' }}>
                    {teamName || 'Team'}
                  </div>
                  {ageGroup && (
                    <div style={{ fontSize: '9pt', color: '#64748b' }}>{ageGroup}</div>
                  )}
                </div>
              </div>

              {/* Touchline branding */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <svg viewBox="0 10 64 38" style={{ width: '32px', height: '20px' }} xmlns="http://www.w3.org/2000/svg">
                  <defs>
                    <linearGradient id="tl-print-grad" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#2ED573"/>
                      <stop offset="100%" stopColor="#F5A623"/>
                    </linearGradient>
                  </defs>
                  <g fill="none">
                    <path d="M12 44 C18 12, 46 12, 52 44"
                          stroke="url(#tl-print-grad)"
                          strokeWidth="4.5"
                          strokeLinecap="round"/>
                    <line x1="8" y1="44" x2="56" y2="44"
                          stroke="#2ED573"
                          strokeWidth="3.5"
                          strokeLinecap="round"/>
                    <circle cx="32" cy="44" r="5" fill="#2ED573"/>
                  </g>
                </svg>
                <span style={{ fontSize: '11pt', fontWeight: 600, color: '#64748b' }}>Touchline</span>
              </div>
            </div>

            {/* Formation title */}
            <div style={{ textAlign: 'center', marginBottom: '5mm' }}>
              <div style={{ fontSize: '14pt', fontWeight: 700, color: '#0f172a' }}>
                Formation: {formation}
              </div>
              <div style={{ fontSize: '9pt', color: '#64748b', marginTop: '2px' }}>
                {teamFormat}-a-side &middot; {today}
              </div>
            </div>

            {/* Main pitch */}
            <div style={{ maxWidth: '160mm', margin: '0 auto', marginBottom: '6mm' }}>
              <PitchSVG
                positions={positions}
                pupils={pupils}
                teamFormat={teamFormat}
                formation={formation}
              />
            </div>

            {/* Two-column layout: Bench + Set Pieces | Game Model */}
            <div className="print-columns" style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '5mm',
              marginBottom: '5mm',
            }}>
              {/* Left column */}
              <div>
                {/* Bench */}
                {benchList.length > 0 && (
                  <div style={{ marginBottom: '4mm' }}>
                    <div style={{
                      fontSize: '10pt',
                      fontWeight: 700,
                      color: '#0f172a',
                      marginBottom: '2mm',
                      paddingBottom: '1mm',
                      borderBottom: '1px solid #e2e8f0',
                    }}>
                      Substitutes
                    </div>
                    <div style={{ fontSize: '9pt', color: '#334155' }}>
                      {benchList.map((p, i) => (
                        <div key={p.id} style={{ padding: '1mm 0', display: 'flex', gap: '4px' }}>
                          <span style={{ fontWeight: 600, minWidth: '16px' }}>{p.squad_number || '-'}</span>
                          <span>{p.name}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Set pieces */}
                {setPieceEntries.length > 0 && (
                  <div>
                    <div style={{
                      fontSize: '10pt',
                      fontWeight: 700,
                      color: '#0f172a',
                      marginBottom: '2mm',
                      paddingBottom: '1mm',
                      borderBottom: '1px solid #e2e8f0',
                    }}>
                      Set Piece Takers
                    </div>
                    <div style={{ fontSize: '9pt', color: '#334155' }}>
                      {setPieceEntries.map((e, i) => (
                        <div key={i} style={{ padding: '1mm 0', display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ color: '#64748b' }}>{e.label}</span>
                          <span style={{ fontWeight: 600 }}>{formatPlayerName(e.pupil.name)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Right column: Game Model */}
              <div>
                {gmEntries.length > 0 && (
                  <div>
                    <div style={{
                      fontSize: '10pt',
                      fontWeight: 700,
                      color: '#0f172a',
                      marginBottom: '2mm',
                      paddingBottom: '1mm',
                      borderBottom: '1px solid #e2e8f0',
                    }}>
                      Game Model
                    </div>
                    <div style={{ fontSize: '9pt', color: '#334155' }}>
                      {gmEntries.map((e, i) => (
                        <div key={i} style={{ padding: '1mm 0' }}>
                          <span style={{ color: '#64748b', fontWeight: 600 }}>{e.label}: </span>
                          <span>{e.value}</span>
                        </div>
                      ))}
                    </div>
                    {gameModel?.notes && (
                      <div style={{ marginTop: '2mm', fontSize: '8pt', color: '#64748b', fontStyle: 'italic' }}>
                        {gameModel.notes}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Squad list */}
            <div style={{ marginBottom: '4mm' }}>
              <div style={{
                fontSize: '10pt',
                fontWeight: 700,
                color: '#0f172a',
                marginBottom: '2mm',
                paddingBottom: '1mm',
                borderBottom: '1px solid #e2e8f0',
              }}>
                Starting Lineup
              </div>
              <div className="print-squad-grid" style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
                gap: '1mm 4mm',
                fontSize: '8pt',
                color: '#334155',
              }}>
                {positions
                  .filter(pos => pos.pupilId)
                  .map(pos => {
                    const pupil = pupils.find(p => p.id === pos.pupilId)
                    if (!pupil) return null
                    return (
                      <div key={pos.id} style={{ display: 'flex', gap: '4px', padding: '0.5mm 0' }}>
                        <span style={{ fontWeight: 700, minWidth: '16px' }}>{pupil.squad_number || '-'}</span>
                        <span>{pupil.name}</span>
                        <span style={{ color: '#94a3b8', marginLeft: 'auto' }}>({pos.label})</span>
                      </div>
                    )
                  })}
              </div>
            </div>

            {/* Footer */}
            <div className="print-footer" style={{
              marginTop: '5mm',
              paddingTop: '3mm',
              borderTop: '1px solid #e2e8f0',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              fontSize: '7pt',
              color: '#94a3b8',
            }}>
              <span>{teamName}{ageGroup ? ` ${ageGroup}` : ''} &middot; {formation} &middot; {today}</span>
              <span>Generated by Touchline</span>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @page {
          size: A4 portrait;
          margin: 8mm;
        }

        .print-pitch-svg {
          width: 100%;
          height: auto;
        }

        /* ===== SCREEN PREVIEW ===== */
        @media screen {
          .print-page {
            box-shadow: 0 4px 20px rgba(0,0,0,0.5);
            border-radius: 4px;
            max-width: 210mm;
          }
        }

        /* ===== PRINT MEDIA ===== */
        @media print {
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

          .print-columns {
            page-break-inside: avoid;
          }
        }
      `}</style>
    </div>
  )

  return createPortal(content, document.body)
}
