export const VOLLEYBALL_DEF = {
  id: 'volleyball',
  label: 'Volleyball',
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
      id: 'mini-4v4', label: 'Mini Volleyball 4v4', playerCount: 4, squadMin: 5, squadMax: 8,
      defaultPresetId: 'Square', goalkeeper: 'none',
      roleVocab: ['S', 'H'],
      ageGradeRule: { yearGroupMax: 9, notes: 'Small courts and soft balls maximise touches' },
      presets: {
        Square: { label: 'Square', slots: [
          { id: 'fl', role: 'H', x: 0.30, y: 0.35 },
          { id: 'fr', role: 'H', x: 0.70, y: 0.35 },
          { id: 'bl', role: 'S', x: 0.30, y: 0.75 },
          { id: 'br', role: 'H', x: 0.70, y: 0.75 },
        ]},
      },
    },
    '6v6': {
      id: '6v6', label: '6v6', playerCount: 6, squadMin: 8, squadMax: 12,
      defaultPresetId: 'W-Receive', goalkeeper: 'none',
      roleVocab: ['S', 'OH', 'MB', 'L'],
      ageGradeRule: { yearGroupMin: 7 },
      presets: {
        'W-Receive': { label: 'W-Receive', slots: [
          { id: 'p4', role: 'OH', x: 0.22, y: 0.35 },
          { id: 'p3', role: 'MB', x: 0.50, y: 0.28 },
          { id: 'p2', role: 'OH', x: 0.78, y: 0.35 },
          { id: 'p5', role: 'L',  x: 0.25, y: 0.74 },
          { id: 'p6', role: 'MB', x: 0.50, y: 0.80 },
          { id: 'p1', role: 'S',  x: 0.75, y: 0.74 },
        ]},
      },
    },
  },

  PitchLines: null,
  pitchGradient: null,
}
