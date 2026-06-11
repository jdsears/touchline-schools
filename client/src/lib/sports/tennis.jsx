export const TENNIS_DEF = {
  id: 'tennis',
  label: 'Tennis',
  assignmentModel: 'batting-order',

  validFormatsFor({ yearGroup }) {
    return Object.keys(this.formats).filter(fid => {
      const r = this.formats[fid].ageGradeRule
      if (r.yearGroupMin && yearGroup < r.yearGroupMin) return false
      if (r.yearGroupMax && yearGroup > r.yearGroupMax) return false
      return true
    })
  },

  formats: {
    'team-6': {
      id: 'team-6', label: 'Team of 6 (singles order)', playerCount: 6, squadMin: 6, squadMax: 10,
      assignmentModel: 'batting-order', orderLabel: 'Playing Order',
      roleVocab: [],
      ageGradeRule: {},
    },
    'team-4': {
      id: 'team-4', label: 'Team Tennis 4', playerCount: 4, squadMin: 4, squadMax: 8,
      assignmentModel: 'batting-order', orderLabel: 'Playing Order',
      roleVocab: [],
      ageGradeRule: { yearGroupMax: 8, notes: 'LTA Team Tennis format' },
    },
  },

  PitchLines: null,
  pitchGradient: null,
}
