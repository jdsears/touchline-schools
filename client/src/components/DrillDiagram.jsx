// DrillDiagram.jsx - 2D drill setup visualization for training sessions
import { motion } from 'framer-motion'

const TEAM_COLORS = {
  A: { fill: '#3b82f6', stroke: '#1d4ed8', text: '#ffffff' }, // Blue
  B: { fill: '#ef4444', stroke: '#b91c1c', text: '#ffffff' }, // Red
}

const ARROW_COLORS = {
  pass: '#facc15',   // Yellow dashed - ball movement
  run: '#ffffff',    // White solid - player runs
  dribble: '#22d3ee', // Cyan wavy - dribble
}

// SVG arrow marker IDs per type
function ArrowDefs() {
  return (
    <defs>
      {Object.entries(ARROW_COLORS).map(([type, color]) => (
        <marker
          key={type}
          id={`arrow-${type}`}
          markerWidth="8"
          markerHeight="6"
          refX="7"
          refY="3"
          orient="auto"
        >
          <polygon points="0 0, 8 3, 0 6" fill={color} />
        </marker>
      ))}
    </defs>
  )
}

function PitchMarkings({ area }) {
  // Common pitch markings scaled to viewBox (0-400 x 0-300 for half, 0-400 x 0-600 for full)
  const isHalf = area === 'half' || area === 'box'
  const h = isHalf ? 300 : 600

  return (
    <g stroke="rgba(255,255,255,0.35)" strokeWidth="1.5" fill="none">
      {/* Outer boundary */}
      <rect x="10" y="10" width="380" height={h - 20} rx="2" />

      {isHalf ? (
        <>
          {/* Half pitch: goal area at bottom */}
          <rect x="130" y={h - 60} width="140" height="50" />
          <rect x="165" y={h - 30} width="70" height="20" />
          {/* Center arc at top */}
          <path d={`M 10 10 L 390 10`} />
        </>
      ) : (
        <>
          {/* Full pitch */}
          <line x1="10" y1={h / 2} x2="390" y2={h / 2} />
          <circle cx="200" cy={h / 2} r="40" />
          <circle cx="200" cy={h / 2} r="2" fill="rgba(255,255,255,0.5)" />
          {/* Top penalty area */}
          <rect x="130" y="10" width="140" height="50" />
          <rect x="165" y="10" width="70" height="20" />
          {/* Bottom penalty area */}
          <rect x="130" y={h - 60} width="140" height="50" />
          <rect x="165" y={h - 30} width="70" height="20" />
        </>
      )}
    </g>
  )
}

export default function DrillDiagram({ diagram, className = '' }) {
  if (!diagram || (!diagram.players?.length && !diagram.cones?.length)) {
    return null
  }

  const area = diagram.area || 'half'
  const isHalf = area === 'half' || area === 'box'
  const viewHeight = isHalf ? 300 : 600
  const aspectClass = isHalf ? 'aspect-[4/3]' : 'aspect-[2/3]'

  // Convert percentage coords to SVG coords
  const toSvg = (x, y) => ({
    x: 10 + (x / 100) * 380,
    y: 10 + (y / 100) * (viewHeight - 20),
  })

  return (
    <div className={`${className}`}>
      <div
        className={`${aspectClass} w-full max-w-sm relative rounded-lg overflow-hidden shadow-md ring-1 ring-white/10`}
        style={{
          background: `
            linear-gradient(135deg, rgba(255,255,255,0.03) 0%, transparent 50%),
            linear-gradient(to bottom,
              #15803d 0%, #16a34a 20%, #22c55e 40%,
              #16a34a 60%, #22c55e 80%, #15803d 100%
            )
          `
        }}
      >
        {/* Grass stripes */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: `repeating-linear-gradient(0deg,
              rgba(255,255,255,0.03) 0px, rgba(255,255,255,0.03) 12px,
              transparent 12px, transparent 24px
            )`,
            backgroundSize: '100% 24px'
          }}
        />

        <svg
          viewBox={`0 0 400 ${viewHeight}`}
          className="absolute inset-0 w-full h-full"
        >
          <ArrowDefs />
          <PitchMarkings area={area} />

          {/* Zones */}
          {diagram.zones?.map((zone, i) => {
            const pos = toSvg(zone.x, zone.y)
            const w = (zone.width / 100) * 380
            const h = (zone.height / 100) * (viewHeight - 20)
            return (
              <g key={`zone-${i}`}>
                <rect
                  x={pos.x} y={pos.y} width={w} height={h}
                  fill="rgba(255,255,255,0.08)"
                  stroke="rgba(255,255,255,0.2)"
                  strokeWidth="1"
                  strokeDasharray="4 3"
                  rx="3"
                />
                {zone.label && (
                  <text
                    x={pos.x + w / 2} y={pos.y + h / 2}
                    textAnchor="middle" dominantBaseline="middle"
                    fill="rgba(255,255,255,0.4)" fontSize="11" fontWeight="500"
                  >
                    {zone.label}
                  </text>
                )}
              </g>
            )
          })}

          {/* Arrows */}
          {diagram.arrows?.map((arrow, i) => {
            const from = toSvg(arrow.from.x, arrow.from.y)
            const to = toSvg(arrow.to.x, arrow.to.y)
            const type = arrow.type || 'run'
            const color = ARROW_COLORS[type] || ARROW_COLORS.run

            // Shorten arrow slightly so it doesn't overlap markers
            const dx = to.x - from.x
            const dy = to.y - from.y
            const len = Math.sqrt(dx * dx + dy * dy)
            const offset = 12
            const startX = from.x + (dx / len) * offset
            const startY = from.y + (dy / len) * offset
            const endX = to.x - (dx / len) * offset
            const endY = to.y - (dy / len) * offset

            return (
              <motion.line
                key={`arrow-${i}`}
                x1={startX} y1={startY} x2={endX} y2={endY}
                stroke={color}
                strokeWidth="2"
                strokeDasharray={type === 'pass' ? '6 4' : type === 'dribble' ? '3 3' : 'none'}
                markerEnd={`url(#arrow-${type})`}
                opacity="0.85"
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 0.85 }}
                transition={{ delay: 0.3 + i * 0.15, duration: 0.4 }}
              />
            )
          })}

          {/* Cones */}
          {diagram.cones?.map((cone, i) => {
            const pos = toSvg(cone.x, cone.y)
            return (
              <motion.g
                key={`cone-${i}`}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.1 + i * 0.03, type: 'spring', stiffness: 400 }}
              >
                <polygon
                  points={`${pos.x},${pos.y - 6} ${pos.x - 5},${pos.y + 4} ${pos.x + 5},${pos.y + 4}`}
                  fill="#f97316"
                  stroke="#ea580c"
                  strokeWidth="1"
                />
              </motion.g>
            )
          })}

          {/* Players */}
          {diagram.players?.map((player, i) => {
            const pos = toSvg(player.x, player.y)
            const colors = TEAM_COLORS[player.team] || TEAM_COLORS.A
            return (
              <motion.g
                key={`player-${i}`}
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.05 * i, type: 'spring', stiffness: 300, damping: 20 }}
              >
                <circle
                  cx={pos.x} cy={pos.y} r="14"
                  fill={colors.fill} stroke={colors.stroke} strokeWidth="2"
                />
                <text
                  x={pos.x} y={pos.y}
                  textAnchor="middle" dominantBaseline="central"
                  fill={colors.text} fontSize="9" fontWeight="700"
                  style={{ fontFamily: 'system-ui, sans-serif' }}
                >
                  {player.label}
                </text>
              </motion.g>
            )
          })}
        </svg>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 mt-2 text-[10px] text-navy-400">
        <span className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded-full bg-blue-500 inline-block" /> Team A
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block" /> Team B
        </span>
        <span className="flex items-center gap-1">
          <svg width="10" height="10"><polygon points="5,1 1,9 9,9" fill="#f97316" /></svg> Cone
        </span>
        <span className="flex items-center gap-1">
          <span className="w-4 border-t-2 border-dashed border-yellow-400 inline-block" /> Pass
        </span>
        <span className="flex items-center gap-1">
          <span className="w-4 border-t-2 border-white inline-block" /> Run
        </span>
      </div>
    </div>
  )
}
