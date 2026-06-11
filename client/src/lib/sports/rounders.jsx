export const ROUNDERS_DEF = {
  id: 'rounders',
  label: 'Rounders',
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
    '9-a-side': {
      id: '9-a-side', label: '9-a-side', playerCount: 9, squadMin: 9, squadMax: 12,
      assignmentModel: 'batting-order', orderLabel: 'Batting Order',
      roleVocab: [],
      ageGradeRule: {},
    },
    'mini-6': {
      id: 'mini-6', label: 'Mini Rounders 6s', playerCount: 6, squadMin: 6, squadMax: 9,
      assignmentModel: 'batting-order', orderLabel: 'Batting Order',
      roleVocab: [],
      ageGradeRule: { yearGroupMax: 6, notes: 'Modified primary format: big ball, everyone bats' },
    },
  },

  PitchLines: null,
  pitchGradient: null,
}
