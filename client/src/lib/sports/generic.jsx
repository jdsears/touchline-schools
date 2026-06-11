export const GENERIC_DEF = {
  id: 'generic',
  label: 'Squad',
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
    'squad': {
      id: 'squad', label: 'Squad', playerCount: 12, squadMin: 1, squadMax: 30,
      assignmentModel: 'batting-order', orderLabel: 'Squad Order',
      roleVocab: [],
      ageGradeRule: {},
    },
  },

  PitchLines: null,
  pitchGradient: null,
}
