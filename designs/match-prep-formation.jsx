/* global React, Icon, Pill, Button, Card, SectionLabel, Crest */

// =====================================================================
// Match Prep — formation editor
//
// Pattern: preset-with-swaps.
//   1. Teacher picks a formation preset (e.g. 4-3-3 for 11v11, 3-2-3 for 7v7).
//   2. The pitch fills with role-labelled SLOTS (no players yet, or carrying
//      players from the squad if the squad is set).
//   3. Tapping a slot opens a roster sheet: pick a player to assign, swap
//      with another, or clear. Swap-in-place is the dominant gesture.
//   4. Drag-to-rearrange exists on desktop as a power-user secondary; mobile
//      relies entirely on tap-to-assign because cold-hand drag is unreliable.
//
// The pitch is sport-aware (this v1 ships football). The shape, the role
// vocabulary, the preset list, and the size toggles are all driven by
// SPORT_DEFS so cricket / netball / rugby can be added without rewriting
// the editor. v1 ships football only; the abstraction proves it can extend.
// =====================================================================

// ---------------------------------------------------------------------
// Sport definitions — football presets only in v1
// ---------------------------------------------------------------------
//
// Coordinates are normalised: x ∈ [0,1] left→right, y ∈ [0,1] top→bottom
// (top of pitch = own goal, bottom = opposition goal — coach standing on
// touchline looks down the pitch).

const FOOTBALL_PRESETS = {
  "11v11": {
    "4-3-3": {
      label: "4-3-3",
      slots: [
        { id: "gk",  role: "GK",  x: 0.50, y: 0.92 },
        { id: "lb",  role: "LB",  x: 0.16, y: 0.74 },
        { id: "lcb", role: "CB",  x: 0.36, y: 0.78 },
        { id: "rcb", role: "CB",  x: 0.64, y: 0.78 },
        { id: "rb",  role: "RB",  x: 0.84, y: 0.74 },
        { id: "lcm", role: "CM",  x: 0.30, y: 0.55 },
        { id: "cm",  role: "CM",  x: 0.50, y: 0.50 },
        { id: "rcm", role: "CM",  x: 0.70, y: 0.55 },
        { id: "lw",  role: "LW",  x: 0.18, y: 0.28 },
        { id: "st",  role: "ST",  x: 0.50, y: 0.18 },
        { id: "rw",  role: "RW",  x: 0.82, y: 0.28 },
      ],
    },
    "4-4-2": {
      label: "4-4-2",
      slots: [
        { id: "gk",  role: "GK",  x: 0.50, y: 0.92 },
        { id: "lb",  role: "LB",  x: 0.16, y: 0.74 },
        { id: "lcb", role: "CB",  x: 0.36, y: 0.78 },
        { id: "rcb", role: "CB",  x: 0.64, y: 0.78 },
        { id: "rb",  role: "RB",  x: 0.84, y: 0.74 },
        { id: "lm",  role: "LM",  x: 0.16, y: 0.50 },
        { id: "lcm", role: "CM",  x: 0.38, y: 0.55 },
        { id: "rcm", role: "CM",  x: 0.62, y: 0.55 },
        { id: "rm",  role: "RM",  x: 0.84, y: 0.50 },
        { id: "lst", role: "ST",  x: 0.38, y: 0.22 },
        { id: "rst", role: "ST",  x: 0.62, y: 0.22 },
      ],
    },
    "4-2-3-1": {
      label: "4-2-3-1",
      slots: [
        { id: "gk",  role: "GK",  x: 0.50, y: 0.92 },
        { id: "lb",  role: "LB",  x: 0.16, y: 0.74 },
        { id: "lcb", role: "CB",  x: 0.36, y: 0.78 },
        { id: "rcb", role: "CB",  x: 0.64, y: 0.78 },
        { id: "rb",  role: "RB",  x: 0.84, y: 0.74 },
        { id: "ldm", role: "DM",  x: 0.38, y: 0.60 },
        { id: "rdm", role: "DM",  x: 0.62, y: 0.60 },
        { id: "lam", role: "AM",  x: 0.22, y: 0.38 },
        { id: "cam", role: "AM",  x: 0.50, y: 0.36 },
        { id: "ram", role: "AM",  x: 0.78, y: 0.38 },
        { id: "st",  role: "ST",  x: 0.50, y: 0.18 },
      ],
    },
    "3-5-2": {
      label: "3-5-2",
      slots: [
        { id: "gk",  role: "GK",  x: 0.50, y: 0.92 },
        { id: "lcb", role: "CB",  x: 0.28, y: 0.78 },
        { id: "ccb", role: "CB",  x: 0.50, y: 0.80 },
        { id: "rcb", role: "CB",  x: 0.72, y: 0.78 },
        { id: "lwb", role: "WB",  x: 0.12, y: 0.55 },
        { id: "lcm", role: "CM",  x: 0.34, y: 0.58 },
        { id: "cm",  role: "CM",  x: 0.50, y: 0.52 },
        { id: "rcm", role: "CM",  x: 0.66, y: 0.58 },
        { id: "rwb", role: "WB",  x: 0.88, y: 0.55 },
        { id: "lst", role: "ST",  x: 0.40, y: 0.22 },
        { id: "rst", role: "ST",  x: 0.60, y: 0.22 },
      ],
    },
  },
  "7v7": {
    "3-2-1": {
      label: "3-2-1",
      slots: [
        { id: "gk",  role: "GK",  x: 0.50, y: 0.92 },
        { id: "lb",  role: "DEF", x: 0.20, y: 0.72 },
        { id: "cb",  role: "DEF", x: 0.50, y: 0.76 },
        { id: "rb",  role: "DEF", x: 0.80, y: 0.72 },
        { id: "lm",  role: "MID", x: 0.32, y: 0.46 },
        { id: "rm",  role: "MID", x: 0.68, y: 0.46 },
        { id: "st",  role: "ST",  x: 0.50, y: 0.20 },
      ],
    },
    "2-3-1": {
      label: "2-3-1",
      slots: [
        { id: "gk",  role: "GK",  x: 0.50, y: 0.92 },
        { id: "lb",  role: "DEF", x: 0.30, y: 0.74 },
        { id: "rb",  role: "DEF", x: 0.70, y: 0.74 },
        { id: "lm",  role: "MID", x: 0.20, y: 0.48 },
        { id: "cm",  role: "MID", x: 0.50, y: 0.50 },
        { id: "rm",  role: "MID", x: 0.80, y: 0.48 },
        { id: "st",  role: "ST",  x: 0.50, y: 0.20 },
      ],
    },
    "3-1-2": {
      label: "3-1-2",
      slots: [
        { id: "gk",  role: "GK",  x: 0.50, y: 0.92 },
        { id: "lb",  role: "DEF", x: 0.20, y: 0.74 },
        { id: "cb",  role: "DEF", x: 0.50, y: 0.78 },
        { id: "rb",  role: "DEF", x: 0.80, y: 0.74 },
        { id: "cm",  role: "MID", x: 0.50, y: 0.48 },
        { id: "lst", role: "ST",  x: 0.34, y: 0.22 },
        { id: "rst", role: "ST",  x: 0.66, y: 0.22 },
      ],
    },
  },
  "9v9": {
    "3-2-3": {
      label: "3-2-3",
      slots: [
        { id: "gk",  role: "GK",  x: 0.50, y: 0.92 },
        { id: "lb",  role: "DEF", x: 0.22, y: 0.72 },
        { id: "cb",  role: "DEF", x: 0.50, y: 0.78 },
        { id: "rb",  role: "DEF", x: 0.78, y: 0.72 },
        { id: "ldm", role: "MID", x: 0.36, y: 0.50 },
        { id: "rdm", role: "MID", x: 0.64, y: 0.50 },
        { id: "lw",  role: "LW",  x: 0.20, y: 0.24 },
        { id: "st",  role: "ST",  x: 0.50, y: 0.18 },
        { id: "rw",  role: "RW",  x: 0.80, y: 0.24 },
      ],
    },
    "3-3-2": {
      label: "3-3-2",
      slots: [
        { id: "gk",  role: "GK",  x: 0.50, y: 0.92 },
        { id: "lb",  role: "DEF", x: 0.22, y: 0.72 },
        { id: "cb",  role: "DEF", x: 0.50, y: 0.78 },
        { id: "rb",  role: "DEF", x: 0.78, y: 0.72 },
        { id: "lm",  role: "MID", x: 0.22, y: 0.50 },
        { id: "cm",  role: "MID", x: 0.50, y: 0.46 },
        { id: "rm",  role: "MID", x: 0.78, y: 0.50 },
        { id: "lst", role: "ST",  x: 0.38, y: 0.20 },
        { id: "rst", role: "ST",  x: 0.62, y: 0.20 },
      ],
    },
  },
};

const FOOTBALL_SIZES = ["7v7", "9v9", "11v11"];

// Demo squad — Year 9 boys.
const DEMO_SQUAD = [
  { id: "p1",  name: "Reuben Asante",      first: "R.", last: "Asante",      number: 9,  preferred: ["ST", "LW"],  status: "ready" },
  { id: "p2",  name: "Toby Lindgren",      first: "T.", last: "Lindgren",    number: 10, preferred: ["AM", "CM"],  status: "ready" },
  { id: "p3",  name: "Marcus Hill",        first: "M.", last: "Hill",        number: 7,  preferred: ["RW", "RM"],  status: "ready" },
  { id: "p4",  name: "Olu Adekunle",       first: "O.", last: "Adekunle",    number: 11, preferred: ["LW", "ST"],  status: "ready" },
  { id: "p5",  name: "Sam Whitford",       first: "S.", last: "Whitford",    number: 4,  preferred: ["CM", "DM"],  status: "ready" },
  { id: "p6",  name: "Ben Carrington",     first: "B.", last: "Carrington",  number: 6,  preferred: ["CB"],         status: "ready" },
  { id: "p7",  name: "Ethan Reid",         first: "E.", last: "Reid",        number: 5,  preferred: ["CB"],         status: "ready" },
  { id: "p8",  name: "Liam O'Connor",      first: "L.", last: "O'Connor",    number: 3,  preferred: ["LB"],         status: "ready" },
  { id: "p9",  name: "Joshua Brookes",     first: "J.", last: "Brookes",     number: 2,  preferred: ["RB"],         status: "ready" },
  { id: "p10", name: "Daniel Park",        first: "D.", last: "Park",        number: 1,  preferred: ["GK"],         status: "ready" },
  { id: "p11", name: "Akin Hassan",        first: "A.", last: "Hassan",      number: 8,  preferred: ["CM", "DM"],  status: "ready" },
  { id: "p12", name: "George Whitaker",    first: "G.", last: "Whitaker",    number: 12, preferred: ["CB", "DM"],  status: "ready" },
  { id: "p13", name: "Felix Tan",          first: "F.", last: "Tan",         number: 14, preferred: ["CM", "AM"],  status: "ready" },
  { id: "p14", name: "Noah Jansen",        first: "N.", last: "Jansen",      number: 15, preferred: ["LW", "LM"],  status: "queried" },
  { id: "p15", name: "Adam Petrescu",      first: "A.", last: "Petrescu",    number: 16, preferred: ["RB", "RM"],  status: "ready" },
  { id: "p16", name: "Kai Nakamura",       first: "K.", last: "Nakamura",    number: 17, preferred: ["GK"],         status: "queried" },
];

// Default starting XI for the 4-3-3 demo (good fit to preferred roles).
const DEFAULT_ASSIGNMENT_4_3_3 = {
  gk: "p10", lb: "p8", lcb: "p7", rcb: "p6", rb: "p9",
  lcm: "p11", cm: "p5", rcm: "p2",
  lw: "p4", st: "p1", rw: "p3",
};

// ---------------------------------------------------------------------
// Pitch lines (football)
// ---------------------------------------------------------------------
const FootballPitchLines = ({ width, height }) => (
  <svg viewBox="0 0 100 150" preserveAspectRatio="none" width={width} height={height} style={{
    position: "absolute", inset: 0,
    pointerEvents: "none",
  }}>
    {/* outer */}
    <rect x="2" y="2" width="96" height="146" fill="none" stroke="rgba(255,255,255,0.55)" strokeWidth="0.4" />
    {/* halfway */}
    <line x1="2" y1="75" x2="98" y2="75" stroke="rgba(255,255,255,0.55)" strokeWidth="0.4" />
    <circle cx="50" cy="75" r="9" fill="none" stroke="rgba(255,255,255,0.55)" strokeWidth="0.4" />
    <circle cx="50" cy="75" r="0.6" fill="rgba(255,255,255,0.7)" />
    {/* top penalty box (own goal) */}
    <rect x="22" y="2" width="56" height="14" fill="none" stroke="rgba(255,255,255,0.55)" strokeWidth="0.4" />
    <rect x="36" y="2" width="28" height="5" fill="none" stroke="rgba(255,255,255,0.55)" strokeWidth="0.4" />
    {/* bottom penalty box */}
    <rect x="22" y="134" width="56" height="14" fill="none" stroke="rgba(255,255,255,0.55)" strokeWidth="0.4" />
    <rect x="36" y="143" width="28" height="5" fill="none" stroke="rgba(255,255,255,0.55)" strokeWidth="0.4" />
    {/* corner arcs */}
    <path d="M2 4 A2 2 0 0 1 4 2" fill="none" stroke="rgba(255,255,255,0.45)" strokeWidth="0.3" />
    <path d="M96 2 A2 2 0 0 1 98 4" fill="none" stroke="rgba(255,255,255,0.45)" strokeWidth="0.3" />
    <path d="M2 146 A2 2 0 0 0 4 148" fill="none" stroke="rgba(255,255,255,0.45)" strokeWidth="0.3" />
    <path d="M96 148 A2 2 0 0 0 98 146" fill="none" stroke="rgba(255,255,255,0.45)" strokeWidth="0.3" />
  </svg>
);

// ---------------------------------------------------------------------
// Player chip on the pitch
// ---------------------------------------------------------------------
const PitchSlot = ({ slot, player, focused, dim, scale = 1, onClick }) => {
  const size = Math.round(38 * scale);
  const initials = player ? `${player.first[0]}${player.last[0]}` : null;
  const queried = player?.status === "queried";

  return (
    <div
      onClick={onClick}
      style={{
        position: "absolute",
        left: `calc(${slot.x * 100}% - ${size / 2}px)`,
        top: `calc(${slot.y * 100}% - ${size / 2}px)`,
        width: size, cursor: "pointer",
        textAlign: "center",
        opacity: dim ? 0.45 : 1,
        transition: "opacity 0.15s, transform 0.15s",
        transform: focused ? "scale(1.06)" : "scale(1)",
        zIndex: focused ? 5 : player ? 3 : 2,
      }}
    >
      <div style={{
        width: size, height: size, borderRadius: "50%",
        background: player ? "var(--surface-card)" : "rgba(255,255,255,0.16)",
        border: focused
          ? `2px solid var(--brand-accent)`
          : player
            ? `1.5px solid ${queried ? "var(--status-warning)" : "rgba(255,255,255,0.85)"}`
            : "1.5px dashed rgba(255,255,255,0.55)",
        display: "flex", alignItems: "center", justifyContent: "center",
        boxShadow: player ? "0 2px 6px rgba(0,0,0,0.25)" : "none",
        position: "relative",
      }}>
        {player ? (
          <span style={{
            fontFamily: "var(--font-display)",
            fontSize: Math.round(size * 0.32),
            fontWeight: 700,
            color: "var(--text-primary)",
            letterSpacing: "-0.01em",
          }}>{initials}</span>
        ) : (
          <Icon name="plus" size={Math.round(size * 0.45)} style={{ color: "rgba(255,255,255,0.85)" }} />
        )}
        {player && (
          <span style={{
            position: "absolute",
            top: -4, right: -4,
            background: "var(--brand-primary)",
            color: "var(--on-brand-primary)",
            fontFamily: "var(--font-mono)",
            fontSize: Math.round(size * 0.24),
            fontWeight: 700,
            width: Math.round(size * 0.42),
            height: Math.round(size * 0.42),
            borderRadius: "50%",
            display: "flex", alignItems: "center", justifyContent: "center",
            border: "1.5px solid var(--surface-card)",
          }}>{player.number}</span>
        )}
        {queried && (
          <span style={{
            position: "absolute",
            bottom: -3, right: -3,
            background: "var(--status-warning)",
            color: "var(--on-brand-primary)",
            fontSize: Math.round(size * 0.30),
            fontWeight: 700,
            width: Math.round(size * 0.38),
            height: Math.round(size * 0.38),
            borderRadius: "50%",
            display: "flex", alignItems: "center", justifyContent: "center",
            border: "1.5px solid var(--surface-card)",
            lineHeight: 1,
          }}>!</span>
        )}
      </div>
      <div style={{
        marginTop: 3,
        background: "rgba(15,30,61,0.78)",
        color: "white",
        fontFamily: "var(--font-mono)",
        fontSize: Math.max(9, Math.round(size * 0.22)),
        fontWeight: 700,
        letterSpacing: "0.04em",
        padding: "1px 5px",
        borderRadius: 3,
        display: "inline-block",
      }}>{slot.role}</div>
      {player && scale >= 0.9 && (
        <div style={{
          marginTop: 2,
          color: "white",
          fontSize: Math.max(9, Math.round(size * 0.22)),
          fontWeight: 600,
          textShadow: "0 1px 2px rgba(0,0,0,0.6)",
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
          maxWidth: size * 2.4,
          marginLeft: -size * 0.7,
          marginRight: -size * 0.7,
        }}>{player.last}</div>
      )}
    </div>
  );
};

// ---------------------------------------------------------------------
// The pitch itself
// ---------------------------------------------------------------------
const FormationPitch = ({
  preset,
  assignment,
  squad,
  focusedSlotId,
  onSlotClick,
  width = 460,
  height = 690,
  scale = 1,
}) => {
  const playerById = (id) => squad.find(p => p.id === id);
  return (
    <div style={{
      position: "relative",
      width, height,
      background: "linear-gradient(180deg, #1f6f3a, #2a8b46 30%, #237a3c 70%, #1c6533)",
      borderRadius: "var(--radius-lg)",
      overflow: "hidden",
      boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.05), 0 6px 20px rgba(15,30,61,0.18)",
    }}>
      {/* Mowing stripes */}
      {[0,1,2,3,4,5,6].map(i => (
        <div key={i} style={{
          position: "absolute",
          top: `${(i * 100) / 7}%`,
          height: `${100/7}%`,
          left: 0, right: 0,
          background: i % 2 ? "rgba(255,255,255,0.025)" : "transparent",
        }} />
      ))}
      <FootballPitchLines width={width} height={height} />
      {preset.slots.map(slot => (
        <PitchSlot
          key={slot.id}
          slot={slot}
          player={playerById(assignment[slot.id])}
          focused={focusedSlotId === slot.id}
          scale={scale}
          onClick={() => onSlotClick?.(slot.id)}
        />
      ))}
    </div>
  );
};

// ---------------------------------------------------------------------
// Roster sheet — what the teacher sees when they tap a slot
// ---------------------------------------------------------------------
const RosterSheet = ({ slot, currentPlayerId, assignment, squad, onPick, onClear, onClose, embedded = false }) => {
  const slotRole = slot.role;
  const placedIds = new Set(Object.values(assignment).filter(Boolean));
  // Sort: best fits first (preferred role match), then placed-elsewhere flagged, then rest.
  const ranked = [...squad].sort((a, b) => {
    const aFit = a.preferred.includes(slotRole) ? 0 : a.preferred.some(r => slotRole.includes(r)) ? 1 : 2;
    const bFit = b.preferred.includes(slotRole) ? 0 : b.preferred.some(r => slotRole.includes(r)) ? 1 : 2;
    return aFit - bFit;
  });

  return (
    <div style={{
      background: "var(--surface-card)",
      border: embedded ? "none" : "1px solid var(--border-default)",
      borderRadius: embedded ? 0 : "var(--radius-lg)",
      boxShadow: embedded ? "none" : "var(--shadow-md)",
      width: "100%",
      display: "flex", flexDirection: "column",
      maxHeight: "100%",
    }}>
      <div style={{
        padding: "12px 16px",
        borderBottom: "1px solid var(--border-subtle)",
        display: "flex", alignItems: "center", gap: 10,
      }}>
        <div style={{
          width: 30, height: 30, borderRadius: "var(--radius-sm)",
          background: "var(--brand-primary)", color: "var(--on-brand-primary)",
          fontFamily: "var(--font-mono)", fontSize: 11, fontWeight: 700,
          letterSpacing: "0.05em",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>{slot.role}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>
            {currentPlayerId ? "Swap player" : "Assign player"}
          </div>
          <div style={{ fontSize: 11.5, color: "var(--text-tertiary)" }}>
            {squad.filter(p => p.preferred.includes(slotRole)).length} preferred fits
          </div>
        </div>
        {onClose && (
          <button onClick={onClose} aria-label="Close" style={{
            background: "transparent", border: "none", cursor: "pointer",
            color: "var(--text-tertiary)",
            display: "inline-flex", alignItems: "center", justifyContent: "center",
            padding: 4,
          }}><Icon name="close" size={16} /></button>
        )}
      </div>

      <div style={{ overflowY: "auto", flex: 1, padding: 6 }}>
        {ranked.map(p => {
          const isCurrent = p.id === currentPlayerId;
          const placedElsewhere = placedIds.has(p.id) && !isCurrent;
          const isPreferred = p.preferred.includes(slotRole);
          return (
            <div key={p.id}
              onClick={() => !isCurrent && onPick?.(p.id)}
              style={{
                display: "flex", alignItems: "center", gap: 10,
                padding: "8px 10px",
                borderRadius: "var(--radius-md)",
                background: isCurrent ? "var(--brand-accent-tint)" : "transparent",
                cursor: isCurrent ? "default" : "pointer",
                opacity: isCurrent ? 0.65 : 1,
                marginBottom: 2,
              }}>
              <span style={{
                width: 28, height: 28, borderRadius: "50%",
                background: "var(--surface-sunken)",
                color: "var(--text-primary)",
                fontFamily: "var(--font-mono)", fontSize: 11, fontWeight: 700,
                display: "inline-flex", alignItems: "center", justifyContent: "center",
                border: "1px solid var(--border-subtle)",
                flexShrink: 0,
              }}>{p.number}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 500, color: "var(--text-primary)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {p.name}
                </div>
                <div style={{ fontSize: 11, color: "var(--text-tertiary)", display: "flex", alignItems: "center", gap: 6 }}>
                  <span>{p.preferred.join(" · ")}</span>
                  {p.status === "queried" && (
                    <Pill tone="warning" dot style={{ fontSize: 10, padding: "0 6px" }}>Medical clearance</Pill>
                  )}
                </div>
              </div>
              {isCurrent ? (
                <Pill tone="accent" style={{ fontSize: 10.5 }}>On pitch · {slotRole}</Pill>
              ) : placedElsewhere ? (
                <Pill tone="neutral" dot style={{ fontSize: 10.5 }}>Will swap</Pill>
              ) : isPreferred ? (
                <Pill tone="success" dot style={{ fontSize: 10.5 }}>Best fit</Pill>
              ) : null}
            </div>
          );
        })}
      </div>

      {currentPlayerId && (
        <div style={{
          padding: "10px 14px",
          borderTop: "1px solid var(--border-subtle)",
          background: "var(--surface-sunken)",
          display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
          <span style={{ fontSize: 12, color: "var(--text-tertiary)" }}>
            Or remove from this position
          </span>
          <Button variant="danger" size="sm" icon="trash" onClick={onClear}>Clear slot</Button>
        </div>
      )}
    </div>
  );
};

// ---------------------------------------------------------------------
// Public components
// ---------------------------------------------------------------------
window.FOOTBALL_PRESETS = FOOTBALL_PRESETS;
window.FOOTBALL_SIZES = FOOTBALL_SIZES;
window.DEMO_SQUAD = DEMO_SQUAD;
window.DEFAULT_ASSIGNMENT_4_3_3 = DEFAULT_ASSIGNMENT_4_3_3;
window.FormationPitch = FormationPitch;
window.RosterSheet = RosterSheet;
window.PitchSlot = PitchSlot;
