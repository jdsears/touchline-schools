function HockeyPitchLines() {
  return (
    <svg viewBox="0 0 100 150" preserveAspectRatio="none" className="absolute inset-0 w-full h-full pointer-events-none">
      {/* Outer */}
      <rect x="2" y="2" width="96" height="146" fill="none" stroke="rgba(255,255,255,0.55)" strokeWidth="0.4" />
      {/* Halfway */}
      <line x1="2" y1="75" x2="98" y2="75" stroke="rgba(255,255,255,0.55)" strokeWidth="0.4" />
      {/* 23m lines */}
      <line x1="2" y1="30" x2="98" y2="30" stroke="rgba(255,255,255,0.50)" strokeWidth="0.4" />
      <line x1="2" y1="120" x2="98" y2="120" stroke="rgba(255,255,255,0.50)" strokeWidth="0.4" />
      {/* Shooting circles (D) -- semicircles */}
      <path d="M 26 2 A 24 24 0 0 1 74 2" fill="none" stroke="rgba(255,255,255,0.55)" strokeWidth="0.4" />
      <path d="M 26 148 A 24 24 0 0 0 74 148" fill="none" stroke="rgba(255,255,255,0.55)" strokeWidth="0.4" />
      {/* Goal markers */}
      <rect x="46" y="0" width="8" height="2.5" fill="none" stroke="rgba(255,255,255,0.6)" strokeWidth="0.4" />
      <rect x="46" y="147.5" width="8" height="2.5" fill="none" stroke="rgba(255,255,255,0.6)" strokeWidth="0.4" />
    </svg>
  )
}

export const HOCKEY_DEF = {
  id: 'hockey',
  label: 'Hockey',
  assignmentModel: 'starting-xi',

  validFormatsFor({ yearGroup }) {
    return Object.keys(this.formats).filter(fid => {
      const r = this.formats[fid].ageGradeRule
      if (r.yearGroupMin && yearGroup < r.yearGroupMin) return false
      if (r.yearGroupMax && yearGroup > r.yearGroupMax) return false
      return true
    })
  },

  formats: {
    'hockey-6v6': {
      id: 'hockey-6v6', label: 'In2Hockey 6v6', playerCount: 6, squadMin: 8, squadMax: 12,
      goalkeeper: 'forbidden',
      roleVocab: ['DEF', 'MID', 'ST', 'Floater'],
      ageGradeRule: { yearGroupMin: 5, yearGroupMax: 7, notes: 'England Hockey In2Hockey 6-a-side: no goalkeeper' },
      presets: {
        '2-2-1': { label: '2-2-1', slots: [
          { id: 'lb', role: 'DEF', x: 0.30, y: 0.76 },
          { id: 'rb', role: 'DEF', x: 0.70, y: 0.76 },
          { id: 'lm', role: 'MID', x: 0.30, y: 0.50 },
          { id: 'rm', role: 'MID', x: 0.70, y: 0.50 },
          { id: 'st', role: 'ST', x: 0.50, y: 0.24 },
          { id: 'fl', role: 'Floater', x: 0.50, y: 0.62 },
        ]},
        '1-2-2': { label: '1-2-2', slots: [
          { id: 'cb', role: 'DEF', x: 0.50, y: 0.78 },
          { id: 'lm', role: 'MID', x: 0.28, y: 0.52 },
          { id: 'rm', role: 'MID', x: 0.72, y: 0.52 },
          { id: 'lst', role: 'ST', x: 0.34, y: 0.26 },
          { id: 'rst', role: 'ST', x: 0.66, y: 0.26 },
          { id: 'fl', role: 'Floater', x: 0.50, y: 0.40 },
        ]},
      },
      defaultPresetId: '2-2-1',
    },
    'hockey-7v7': {
      id: 'hockey-7v7', label: 'In2Hockey 7v7', playerCount: 7, squadMin: 10, squadMax: 14,
      goalkeeper: 'required',
      roleVocab: ['GK', 'DEF', 'MID', 'ST'],
      ageGradeRule: { yearGroupMin: 6, yearGroupMax: 8, notes: 'England Hockey In2Hockey 7-a-side' },
      presets: {
        '2-3-1': { label: '2-3-1', slots: [
          { id: 'gk', role: 'GK', x: 0.50, y: 0.92 },
          { id: 'lb', role: 'DEF', x: 0.30, y: 0.74 },
          { id: 'rb', role: 'DEF', x: 0.70, y: 0.74 },
          { id: 'lm', role: 'MID', x: 0.22, y: 0.48 },
          { id: 'cm', role: 'MID', x: 0.50, y: 0.50 },
          { id: 'rm', role: 'MID', x: 0.78, y: 0.48 },
          { id: 'st', role: 'ST', x: 0.50, y: 0.22 },
        ]},
        '3-2-1': { label: '3-2-1', slots: [
          { id: 'gk', role: 'GK', x: 0.50, y: 0.92 },
          { id: 'lb', role: 'DEF', x: 0.22, y: 0.72 },
          { id: 'cb', role: 'DEF', x: 0.50, y: 0.76 },
          { id: 'rb', role: 'DEF', x: 0.78, y: 0.72 },
          { id: 'lm', role: 'MID', x: 0.34, y: 0.46 },
          { id: 'rm', role: 'MID', x: 0.66, y: 0.46 },
          { id: 'st', role: 'ST', x: 0.50, y: 0.22 },
        ]},
      },
      defaultPresetId: '2-3-1',
    },
    'hockey-11v11': {
      id: 'hockey-11v11', label: '11-a-side', playerCount: 11, squadMin: 14, squadMax: 18,
      goalkeeper: 'required',
      roleVocab: ['GK', 'LB', 'LCB', 'CB', 'RCB', 'RB', 'DM', 'LM', 'CM', 'RM', 'AM', 'LW', 'RW', 'ST'],
      ageGradeRule: { yearGroupMin: 8 },
      presets: {
        '5-3-2': { label: '5-3-2', slots: [
          { id: 'gk', role: 'GK', x: 0.50, y: 0.92 },
          { id: 'lb', role: 'LB', x: 0.12, y: 0.72 },
          { id: 'lcb', role: 'CB', x: 0.30, y: 0.76 },
          { id: 'cb', role: 'CB', x: 0.50, y: 0.78 },
          { id: 'rcb', role: 'CB', x: 0.70, y: 0.76 },
          { id: 'rb', role: 'RB', x: 0.88, y: 0.72 },
          { id: 'lm', role: 'LM', x: 0.24, y: 0.50 },
          { id: 'cm', role: 'CM', x: 0.50, y: 0.48 },
          { id: 'rm', role: 'RM', x: 0.76, y: 0.50 },
          { id: 'lst', role: 'ST', x: 0.38, y: 0.22 },
          { id: 'rst', role: 'ST', x: 0.62, y: 0.22 },
        ]},
        '4-3-3': { label: '4-3-3', slots: [
          { id: 'gk', role: 'GK', x: 0.50, y: 0.92 },
          { id: 'lb', role: 'LB', x: 0.16, y: 0.74 },
          { id: 'lcb', role: 'CB', x: 0.38, y: 0.78 },
          { id: 'rcb', role: 'CB', x: 0.62, y: 0.78 },
          { id: 'rb', role: 'RB', x: 0.84, y: 0.74 },
          { id: 'lcm', role: 'CM', x: 0.30, y: 0.52 },
          { id: 'cm', role: 'CM', x: 0.50, y: 0.48 },
          { id: 'rcm', role: 'CM', x: 0.70, y: 0.52 },
          { id: 'lw', role: 'LW', x: 0.18, y: 0.26 },
          { id: 'st', role: 'ST', x: 0.50, y: 0.18 },
          { id: 'rw', role: 'RW', x: 0.82, y: 0.26 },
        ]},
        '4-4-2-Diamond': { label: '4-4-2 Diamond', slots: [
          { id: 'gk', role: 'GK', x: 0.50, y: 0.92 },
          { id: 'lb', role: 'LB', x: 0.16, y: 0.74 },
          { id: 'lcb', role: 'CB', x: 0.38, y: 0.78 },
          { id: 'rcb', role: 'CB', x: 0.62, y: 0.78 },
          { id: 'rb', role: 'RB', x: 0.84, y: 0.74 },
          { id: 'dm', role: 'DM', x: 0.50, y: 0.58 },
          { id: 'lm', role: 'LM', x: 0.22, y: 0.46 },
          { id: 'rm', role: 'RM', x: 0.78, y: 0.46 },
          { id: 'am', role: 'AM', x: 0.50, y: 0.36 },
          { id: 'lst', role: 'ST', x: 0.38, y: 0.20 },
          { id: 'rst', role: 'ST', x: 0.62, y: 0.20 },
        ]},
      },
      defaultPresetId: '5-3-2',
    },
  },

  PitchLines: HockeyPitchLines,
  pitchGradient: 'linear-gradient(180deg, #1a5e35 0%, #2a8b4e 30%, #1e6e3a 70%, #1a5e35 100%)',
}
