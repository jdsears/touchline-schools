export const GYMNASTICS_DEF = {
  id: 'gymnastics',
  label: 'Gymnastics',
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
      id: 'squad', label: 'Squad', playerCount: 8, squadMin: 4, squadMax: 16,
      assignmentModel: 'batting-order', orderLabel: 'Performance Order',
      roleVocab: [],
      ageGradeRule: {},
    },
  },

  PitchLines: null,
  pitchGradient: null,
}
