export const BADMINTON_DEF = {
  id: 'badminton',
  label: 'Badminton',
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
      id: 'team-6', label: 'Team of 6', playerCount: 6, squadMin: 6, squadMax: 10,
      assignmentModel: 'batting-order', orderLabel: 'Playing Order',
      roleVocab: [],
      ageGradeRule: {},
    },
  },

  PitchLines: null,
  pitchGradient: null,
}
