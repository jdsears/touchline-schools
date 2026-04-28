export const FOOTBALL_DEF = {
  id: 'football',
  label: 'Football',
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
    '5v5': {
      id: '5v5', label: '5-a-side', playerCount: 5, squadMin: 7, squadMax: 12,
      defaultPresetId: '1-2-1', goalkeeper: 'required',
      roleVocab: ['GK', 'DEF', 'MID', 'ST'],
      ageGradeRule: { yearGroupMin: 3, yearGroupMax: 6 },
      presets: {
        '1-2-1': { label: '1-2-1', slots: [
          { id: 'gk', role: 'GK', x: 0.50, y: 0.92 },
          { id: 'cb', role: 'DEF', x: 0.50, y: 0.72 },
          { id: 'lm', role: 'MID', x: 0.28, y: 0.46 },
          { id: 'rm', role: 'MID', x: 0.72, y: 0.46 },
          { id: 'st', role: 'ST', x: 0.50, y: 0.20 },
        ]},
        '2-1-1': { label: '2-1-1', slots: [
          { id: 'gk', role: 'GK', x: 0.50, y: 0.92 },
          { id: 'lb', role: 'DEF', x: 0.30, y: 0.72 },
          { id: 'rb', role: 'DEF', x: 0.70, y: 0.72 },
          { id: 'cm', role: 'MID', x: 0.50, y: 0.46 },
          { id: 'st', role: 'ST', x: 0.50, y: 0.20 },
        ]},
        'Diamond': { label: 'Diamond', slots: [
          { id: 'gk', role: 'GK', x: 0.50, y: 0.92 },
          { id: 'cb', role: 'DEF', x: 0.50, y: 0.70 },
          { id: 'lm', role: 'MID', x: 0.25, y: 0.46 },
          { id: 'rm', role: 'MID', x: 0.75, y: 0.46 },
          { id: 'st', role: 'ST', x: 0.50, y: 0.20 },
        ]},
      },
    },
    '7v7': {
      id: '7v7', label: '7-a-side', playerCount: 7, squadMin: 10, squadMax: 14,
      defaultPresetId: '3-2-1', goalkeeper: 'required',
      roleVocab: ['GK', 'DEF', 'MID', 'ST'],
      ageGradeRule: { yearGroupMin: 5, yearGroupMax: 6 },
      presets: {
        '3-2-1': { label: '3-2-1', slots: [
          { id: 'gk', role: 'GK', x: 0.50, y: 0.92 },
          { id: 'lb', role: 'DEF', x: 0.20, y: 0.72 },
          { id: 'cb', role: 'DEF', x: 0.50, y: 0.76 },
          { id: 'rb', role: 'DEF', x: 0.80, y: 0.72 },
          { id: 'lm', role: 'MID', x: 0.32, y: 0.46 },
          { id: 'rm', role: 'MID', x: 0.68, y: 0.46 },
          { id: 'st', role: 'ST', x: 0.50, y: 0.20 },
        ]},
        '2-3-1': { label: '2-3-1', slots: [
          { id: 'gk', role: 'GK', x: 0.50, y: 0.92 },
          { id: 'lb', role: 'DEF', x: 0.30, y: 0.74 },
          { id: 'rb', role: 'DEF', x: 0.70, y: 0.74 },
          { id: 'lm', role: 'MID', x: 0.20, y: 0.48 },
          { id: 'cm', role: 'MID', x: 0.50, y: 0.50 },
          { id: 'rm', role: 'MID', x: 0.80, y: 0.48 },
          { id: 'st', role: 'ST', x: 0.50, y: 0.20 },
        ]},
        '3-1-2': { label: '3-1-2', slots: [
          { id: 'gk', role: 'GK', x: 0.50, y: 0.92 },
          { id: 'lb', role: 'DEF', x: 0.20, y: 0.74 },
          { id: 'cb', role: 'DEF', x: 0.50, y: 0.78 },
          { id: 'rb', role: 'DEF', x: 0.80, y: 0.74 },
          { id: 'cm', role: 'MID', x: 0.50, y: 0.48 },
          { id: 'lst', role: 'ST', x: 0.34, y: 0.22 },
          { id: 'rst', role: 'ST', x: 0.66, y: 0.22 },
        ]},
        '2-1-2-1': { label: '2-1-2-1', slots: [
          { id: 'gk', role: 'GK', x: 0.50, y: 0.92 },
          { id: 'lb', role: 'DEF', x: 0.30, y: 0.74 },
          { id: 'rb', role: 'DEF', x: 0.70, y: 0.74 },
          { id: 'cm', role: 'MID', x: 0.50, y: 0.56 },
          { id: 'lm', role: 'MID', x: 0.25, y: 0.38 },
          { id: 'rm', role: 'MID', x: 0.75, y: 0.38 },
          { id: 'st', role: 'ST', x: 0.50, y: 0.20 },
        ]},
      },
    },
    '9v9': {
      id: '9v9', label: '9-a-side', playerCount: 9, squadMin: 12, squadMax: 16,
      defaultPresetId: '3-2-3', goalkeeper: 'required',
      roleVocab: ['GK', 'DEF', 'MID', 'LW', 'RW', 'ST'],
      ageGradeRule: { yearGroupMin: 7, yearGroupMax: 8, notes: 'FA-mandated step-up format for Year 7-8' },
      presets: {
        '3-2-3': { label: '3-2-3', slots: [
          { id: 'gk', role: 'GK', x: 0.50, y: 0.92 },
          { id: 'lb', role: 'DEF', x: 0.22, y: 0.72 },
          { id: 'cb', role: 'DEF', x: 0.50, y: 0.78 },
          { id: 'rb', role: 'DEF', x: 0.78, y: 0.72 },
          { id: 'ldm', role: 'MID', x: 0.36, y: 0.50 },
          { id: 'rdm', role: 'MID', x: 0.64, y: 0.50 },
          { id: 'lw', role: 'LW', x: 0.20, y: 0.24 },
          { id: 'st', role: 'ST', x: 0.50, y: 0.18 },
          { id: 'rw', role: 'RW', x: 0.80, y: 0.24 },
        ]},
        '2-3-3': { label: '2-3-3', slots: [
          { id: 'gk', role: 'GK', x: 0.50, y: 0.92 },
          { id: 'lb', role: 'DEF', x: 0.30, y: 0.74 },
          { id: 'rb', role: 'DEF', x: 0.70, y: 0.74 },
          { id: 'lm', role: 'MID', x: 0.22, y: 0.50 },
          { id: 'cm', role: 'MID', x: 0.50, y: 0.46 },
          { id: 'rm', role: 'MID', x: 0.78, y: 0.50 },
          { id: 'lw', role: 'LW', x: 0.20, y: 0.22 },
          { id: 'st', role: 'ST', x: 0.50, y: 0.18 },
          { id: 'rw', role: 'RW', x: 0.80, y: 0.22 },
        ]},
        '3-3-2': { label: '3-3-2', slots: [
          { id: 'gk', role: 'GK', x: 0.50, y: 0.92 },
          { id: 'lb', role: 'DEF', x: 0.22, y: 0.72 },
          { id: 'cb', role: 'DEF', x: 0.50, y: 0.78 },
          { id: 'rb', role: 'DEF', x: 0.78, y: 0.72 },
          { id: 'lm', role: 'MID', x: 0.22, y: 0.50 },
          { id: 'cm', role: 'MID', x: 0.50, y: 0.46 },
          { id: 'rm', role: 'MID', x: 0.78, y: 0.50 },
          { id: 'lst', role: 'ST', x: 0.38, y: 0.20 },
          { id: 'rst', role: 'ST', x: 0.62, y: 0.20 },
        ]},
      },
    },
    '11v11': {
      id: '11v11', label: '11-a-side', playerCount: 11, squadMin: 14, squadMax: 18,
      defaultPresetId: '4-3-3', goalkeeper: 'required',
      roleVocab: ['GK', 'LB', 'CB', 'RB', 'DM', 'CM', 'AM', 'LM', 'RM', 'LW', 'RW', 'ST', 'WB'],
      ageGradeRule: { yearGroupMin: 9 },
      presets: {
        '4-3-3': { label: '4-3-3', slots: [
          { id: 'gk', role: 'GK', x: 0.50, y: 0.92 },
          { id: 'lb', role: 'LB', x: 0.16, y: 0.74 },
          { id: 'lcb', role: 'CB', x: 0.36, y: 0.78 },
          { id: 'rcb', role: 'CB', x: 0.64, y: 0.78 },
          { id: 'rb', role: 'RB', x: 0.84, y: 0.74 },
          { id: 'lcm', role: 'CM', x: 0.30, y: 0.55 },
          { id: 'cm', role: 'CM', x: 0.50, y: 0.50 },
          { id: 'rcm', role: 'CM', x: 0.70, y: 0.55 },
          { id: 'lw', role: 'LW', x: 0.18, y: 0.28 },
          { id: 'st', role: 'ST', x: 0.50, y: 0.18 },
          { id: 'rw', role: 'RW', x: 0.82, y: 0.28 },
        ]},
        '4-4-2': { label: '4-4-2', slots: [
          { id: 'gk', role: 'GK', x: 0.50, y: 0.92 },
          { id: 'lb', role: 'LB', x: 0.16, y: 0.74 },
          { id: 'lcb', role: 'CB', x: 0.36, y: 0.78 },
          { id: 'rcb', role: 'CB', x: 0.64, y: 0.78 },
          { id: 'rb', role: 'RB', x: 0.84, y: 0.74 },
          { id: 'lm', role: 'LM', x: 0.16, y: 0.50 },
          { id: 'lcm', role: 'CM', x: 0.38, y: 0.55 },
          { id: 'rcm', role: 'CM', x: 0.62, y: 0.55 },
          { id: 'rm', role: 'RM', x: 0.84, y: 0.50 },
          { id: 'lst', role: 'ST', x: 0.38, y: 0.22 },
          { id: 'rst', role: 'ST', x: 0.62, y: 0.22 },
        ]},
        '4-2-3-1': { label: '4-2-3-1', slots: [
          { id: 'gk', role: 'GK', x: 0.50, y: 0.92 },
          { id: 'lb', role: 'LB', x: 0.16, y: 0.74 },
          { id: 'lcb', role: 'CB', x: 0.36, y: 0.78 },
          { id: 'rcb', role: 'CB', x: 0.64, y: 0.78 },
          { id: 'rb', role: 'RB', x: 0.84, y: 0.74 },
          { id: 'ldm', role: 'DM', x: 0.38, y: 0.60 },
          { id: 'rdm', role: 'DM', x: 0.62, y: 0.60 },
          { id: 'lam', role: 'AM', x: 0.22, y: 0.38 },
          { id: 'cam', role: 'AM', x: 0.50, y: 0.36 },
          { id: 'ram', role: 'AM', x: 0.78, y: 0.38 },
          { id: 'st', role: 'ST', x: 0.50, y: 0.18 },
        ]},
        '3-5-2': { label: '3-5-2', slots: [
          { id: 'gk', role: 'GK', x: 0.50, y: 0.92 },
          { id: 'lcb', role: 'CB', x: 0.28, y: 0.78 },
          { id: 'ccb', role: 'CB', x: 0.50, y: 0.80 },
          { id: 'rcb', role: 'CB', x: 0.72, y: 0.78 },
          { id: 'lwb', role: 'WB', x: 0.12, y: 0.55 },
          { id: 'lcm', role: 'CM', x: 0.34, y: 0.58 },
          { id: 'cm', role: 'CM', x: 0.50, y: 0.52 },
          { id: 'rcm', role: 'CM', x: 0.66, y: 0.58 },
          { id: 'rwb', role: 'WB', x: 0.88, y: 0.55 },
          { id: 'lst', role: 'ST', x: 0.40, y: 0.22 },
          { id: 'rst', role: 'ST', x: 0.60, y: 0.22 },
        ]},
        '5-3-2': { label: '5-3-2', slots: [
          { id: 'gk', role: 'GK', x: 0.50, y: 0.92 },
          { id: 'lwb', role: 'WB', x: 0.10, y: 0.68 },
          { id: 'lcb', role: 'CB', x: 0.28, y: 0.76 },
          { id: 'ccb', role: 'CB', x: 0.50, y: 0.80 },
          { id: 'rcb', role: 'CB', x: 0.72, y: 0.76 },
          { id: 'rwb', role: 'WB', x: 0.90, y: 0.68 },
          { id: 'lcm', role: 'CM', x: 0.30, y: 0.52 },
          { id: 'cm', role: 'CM', x: 0.50, y: 0.48 },
          { id: 'rcm', role: 'CM', x: 0.70, y: 0.52 },
          { id: 'lst', role: 'ST', x: 0.38, y: 0.22 },
          { id: 'rst', role: 'ST', x: 0.62, y: 0.22 },
        ]},
      },
    },
  },

  PitchLines: function FootballPitchLines() {
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
  },

  pitchGradient: 'linear-gradient(180deg, #1a5e35 0%, #2a8b4e 30%, #1e6e3a 70%, #1a5e35 100%)',
}
