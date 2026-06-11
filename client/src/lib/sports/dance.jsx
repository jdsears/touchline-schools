export const DANCE_DEF = {
  id: 'dance',
  label: 'Dance',
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
    'ensemble': {
      id: 'ensemble', label: 'Ensemble', playerCount: 12, squadMin: 4, squadMax: 30,
      assignmentModel: 'batting-order', orderLabel: 'Performance Order',
      roleVocab: [],
      ageGradeRule: {},
    },
  },

  PitchLines: null,
  pitchGradient: null,
}
