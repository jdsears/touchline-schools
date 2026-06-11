export const CROSS_COUNTRY_DEF = {
  id: 'cross-country',
  label: 'Cross Country',
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
    'race-team': {
      id: 'race-team', label: 'Race Team', playerCount: 8, squadMin: 4, squadMax: 16,
      assignmentModel: 'batting-order', orderLabel: 'Race Order',
      roleVocab: [],
      ageGradeRule: {},
    },
  },

  PitchLines: null,
  pitchGradient: null,
}
