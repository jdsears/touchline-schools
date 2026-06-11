export const BASKETBALL_DEF = {
  id: 'basketball',
  label: 'Basketball',
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
    'mini-4v4': {
      id: 'mini-4v4', label: 'Mini Basketball 4v4', playerCount: 4, squadMin: 6, squadMax: 10,
      defaultPresetId: 'Diamond', goalkeeper: 'none',
      roleVocab: ['G', 'F', 'C'],
      ageGradeRule: { yearGroupMax: 6, notes: 'Basketball England mini basketball: lowered rings, size 5 ball' },
      presets: {
        Diamond: { label: 'Diamond', slots: [
          { id: 'g1', role: 'G', x: 0.50, y: 0.80 },
          { id: 'f1', role: 'F', x: 0.25, y: 0.50 },
          { id: 'f2', role: 'F', x: 0.75, y: 0.50 },
          { id: 'c1', role: 'C', x: 0.50, y: 0.25 },
        ]},
      },
    },
    '5v5': {
      id: '5v5', label: '5v5', playerCount: 5, squadMin: 7, squadMax: 12,
      defaultPresetId: '1-2-2', goalkeeper: 'none',
      roleVocab: ['G', 'F', 'C'],
      ageGradeRule: { yearGroupMin: 5 },
      presets: {
        '1-2-2': { label: '1-2-2', slots: [
          { id: 'pg', role: 'G', x: 0.50, y: 0.82 },
          { id: 'lw', role: 'G', x: 0.24, y: 0.55 },
          { id: 'rw', role: 'F', x: 0.76, y: 0.55 },
          { id: 'lp', role: 'F', x: 0.35, y: 0.24 },
          { id: 'rp', role: 'C', x: 0.65, y: 0.24 },
        ]},
        '2-1-2': { label: '2-1-2', slots: [
          { id: 'g1', role: 'G', x: 0.35, y: 0.82 },
          { id: 'g2', role: 'G', x: 0.65, y: 0.82 },
          { id: 'f1', role: 'F', x: 0.50, y: 0.52 },
          { id: 'p1', role: 'F', x: 0.30, y: 0.22 },
          { id: 'p2', role: 'C', x: 0.70, y: 0.22 },
        ]},
        '2-3': { label: '2-3', slots: [
          { id: 'g1', role: 'G', x: 0.38, y: 0.78 },
          { id: 'g2', role: 'G', x: 0.62, y: 0.78 },
          { id: 'f1', role: 'F', x: 0.20, y: 0.36 },
          { id: 'c1', role: 'C', x: 0.50, y: 0.28 },
          { id: 'f2', role: 'F', x: 0.80, y: 0.36 },
        ]},
      },
    },
  },

  PitchLines: null,
  pitchGradient: null,
}
