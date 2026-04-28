const THIRDS_TOOLTIPS = {
  GK: 'Defending third + D',
  GD: 'Defending + Centre',
  WD: 'Defending + Centre',
  C: 'All except shooting circles',
  WA: 'Centre + Attacking',
  GA: 'Centre + Attacking + D',
  GS: 'Attacking third + D',
}

function NetballPitchLines() {
  return (
    <svg viewBox="0 0 100 150" preserveAspectRatio="none" className="absolute inset-0 w-full h-full pointer-events-none">
      {/* Outer */}
      <rect x="2" y="2" width="96" height="146" fill="none" stroke="rgba(255,255,255,0.6)" strokeWidth="0.4" />
      {/* Thirds lines */}
      <line x1="2" y1="50" x2="98" y2="50" stroke="rgba(255,255,255,0.6)" strokeWidth="0.4" />
      <line x1="2" y1="100" x2="98" y2="100" stroke="rgba(255,255,255,0.6)" strokeWidth="0.4" />
      {/* Centre circle */}
      <circle cx="50" cy="75" r="9" fill="none" stroke="rgba(255,255,255,0.55)" strokeWidth="0.4" />
      <circle cx="50" cy="75" r="0.6" fill="rgba(255,255,255,0.7)" />
      {/* Shooting circles (semicircles at each end) */}
      <path d="M 20 2 A 30 30 0 0 1 80 2" fill="none" stroke="rgba(255,255,255,0.55)" strokeWidth="0.4" />
      <path d="M 20 148 A 30 30 0 0 0 80 148" fill="none" stroke="rgba(255,255,255,0.55)" strokeWidth="0.4" />
      {/* Goal posts */}
      <line x1="50" y1="0" x2="50" y2="3" stroke="rgba(255,255,255,0.6)" strokeWidth="0.5" />
      <circle cx="50" cy="1" r="1.5" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="0.3" />
      <line x1="50" y1="147" x2="50" y2="150" stroke="rgba(255,255,255,0.6)" strokeWidth="0.5" />
      <circle cx="50" cy="149" r="1.5" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="0.3" />
    </svg>
  )
}

export const NETBALL_DEF = {
  id: 'netball',
  label: 'Netball',

  validFormatsFor({ yearGroup, gender }) {
    return Object.keys(this.formats).filter(fid => {
      const r = this.formats[fid].ageGradeRule
      if (r.yearGroupMin && yearGroup < r.yearGroupMin) return false
      if (r.yearGroupMax && yearGroup > r.yearGroupMax) return false
      if (r.gender && r.gender !== 'any' && r.gender !== gender) return false
      return true
    })
  },

  formats: {
    'stinger-5v5': {
      id: 'stinger-5v5', label: 'Stinger (Bee Netball)', playerCount: 5, squadMin: 7, squadMax: 9,
      assignmentModel: 'fixed-positions-rotating',
      goalkeeper: 'required',
      roleVocab: ['GK', 'GD', 'C', 'GA', 'GS'],
      ageGradeRule: { yearGroupMin: 5, yearGroupMax: 6, gender: 'any', notes: 'Bee Netball Stinger: mixed, max 3 boys in squad, max 2 on court' },
      rotation: { quarters: 4, maxBoysOnCourt: 2 },
      presets: {
        'stinger': { label: 'Stinger', slots: [
          { id: 'gk', role: 'GK', x: 0.50, y: 0.88 },
          { id: 'gd', role: 'GD', x: 0.50, y: 0.72 },
          { id: 'c', role: 'C', x: 0.50, y: 0.50 },
          { id: 'ga', role: 'GA', x: 0.50, y: 0.28 },
          { id: 'gs', role: 'GS', x: 0.50, y: 0.12 },
        ]},
      },
      defaultPresetId: 'stinger',
    },
    'netball-7v7': {
      id: 'netball-7v7', label: 'Netball 7v7', playerCount: 7, squadMin: 10, squadMax: 12,
      assignmentModel: 'fixed-positions',
      goalkeeper: 'required',
      roleVocab: ['GK', 'GD', 'WD', 'C', 'WA', 'GA', 'GS'],
      ageGradeRule: { yearGroupMin: 7 },
      presets: {
        '7v7': { label: '7v7', slots: [
          { id: 'gk', role: 'GK', x: 0.50, y: 0.92 },
          { id: 'gd', role: 'GD', x: 0.36, y: 0.78 },
          { id: 'wd', role: 'WD', x: 0.64, y: 0.62 },
          { id: 'c', role: 'C', x: 0.50, y: 0.50 },
          { id: 'wa', role: 'WA', x: 0.36, y: 0.38 },
          { id: 'ga', role: 'GA', x: 0.64, y: 0.22 },
          { id: 'gs', role: 'GS', x: 0.50, y: 0.10 },
        ]},
      },
      defaultPresetId: '7v7',
    },
  },

  PitchLines: NetballPitchLines,
  pitchGradient: 'linear-gradient(180deg, #c8985a 0%, #d3a466 30%, #be8d4e 70%, #a87a3e 100%)',

  thirdsTooltips: THIRDS_TOOLTIPS,
}
