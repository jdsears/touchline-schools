export const CRICKET_DEF = {
  id: 'cricket',
  label: 'Cricket',

  validFormatsFor({ yearGroup }) {
    return Object.keys(this.formats).filter(fid => {
      const r = this.formats[fid].ageGradeRule
      if (r.yearGroupMin && yearGroup < r.yearGroupMin) return false
      if (r.yearGroupMax && yearGroup > r.yearGroupMax) return false
      return true
    })
  },

  formats: {
    'dynamos-pairs': {
      id: 'dynamos-pairs', label: 'Dynamos Pairs', playerCount: 8, squadMin: 8, squadMax: 10,
      assignmentModel: 'batting-pairs',
      roleVocab: ['RHB', 'LHB'],
      ageGradeRule: { yearGroupMin: 3, yearGroupMax: 6, notes: 'ECB Dynamos: soft-ball pairs cricket for primary' },
      pairsConfig: { pairCount: 4, oversPerPair: 2 },
    },
    'pairs-8s': {
      id: 'pairs-8s', label: 'Pairs Cricket 8s', playerCount: 8, squadMin: 8, squadMax: 10,
      assignmentModel: 'batting-pairs',
      roleVocab: ['RHB', 'LHB'],
      ageGradeRule: { yearGroupMin: 6, yearGroupMax: 8 },
      pairsConfig: { pairCount: 4, oversPerPair: 3 },
    },
    'pairs-10s': {
      id: 'pairs-10s', label: 'Pairs Cricket 10s', playerCount: 10, squadMin: 10, squadMax: 12,
      assignmentModel: 'batting-pairs',
      roleVocab: ['RHB', 'LHB'],
      ageGradeRule: { yearGroupMin: 7, yearGroupMax: 8 },
      pairsConfig: { pairCount: 5, oversPerPair: 3 },
    },
    'chance-to-compete-8s': {
      id: 'chance-to-compete-8s', label: 'Chance to Compete', playerCount: 8, squadMin: 8, squadMax: 10,
      assignmentModel: 'batting-order',
      roleVocab: ['RHB', 'LHB'],
      ageGradeRule: { yearGroupMin: 8, yearGroupMax: 10, notes: 'ECB Chance to Compete: 8-a-side modified rules' },
    },
    't20-11s': {
      id: 't20-11s', label: 'T20', playerCount: 11, squadMin: 11, squadMax: 14,
      assignmentModel: 'batting-order',
      roleVocab: ['RHB', 'LHB'],
      ageGradeRule: { yearGroupMin: 9 },
    },
    'declaration-11s': {
      id: 'declaration-11s', label: 'Declaration', playerCount: 11, squadMin: 11, squadMax: 14,
      assignmentModel: 'batting-order',
      roleVocab: ['RHB', 'LHB'],
      ageGradeRule: { yearGroupMin: 10 },
    },
  },

  PitchLines: null,
  pitchGradient: null,
}

// Data shape for future bowling rotation (not built in UI)
// type BowlingOrder = { overs: Array<{ bowlerId: string, overNumber: number }> }
