export const ATHLETICS_DEF = {
  id: 'athletics',
  label: 'Athletics',
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
    'team': {
      id: 'team', label: 'Track & Field Team', playerCount: 12, squadMin: 8, squadMax: 24,
      assignmentModel: 'batting-order', orderLabel: 'Event Order',
      roleVocab: [],
      ageGradeRule: {},
    },
    'relay-4': {
      id: 'relay-4', label: 'Relay Squad', playerCount: 4, squadMin: 4, squadMax: 6,
      assignmentModel: 'batting-order', orderLabel: 'Relay Order',
      roleVocab: [],
      ageGradeRule: {},
    },
  },

  PitchLines: null,
  pitchGradient: null,
}
