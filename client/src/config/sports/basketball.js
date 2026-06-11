// Basketball sport configuration
// Portrait half-court orientation; attack towards the top

export const formationsByFormat = {
  5: ['1-2-2', '2-1-2', '2-3'],
  4: ['diamond'],
}

export const defaultFormationByFormat = {
  5: '1-2-2',
  4: 'diamond',
}

export const defaultPositions5 = {
  '1-2-2': [
    { id: 'PG', label: 'PG', x: 50, y: 78, pupilId: null },
    { id: 'SG', label: 'SG', x: 26, y: 54, pupilId: null },
    { id: 'SF', label: 'SF', x: 74, y: 54, pupilId: null },
    { id: 'PF', label: 'PF', x: 34, y: 26, pupilId: null },
    { id: 'C',  label: 'C',  x: 66, y: 26, pupilId: null },
  ],
  '2-1-2': [
    { id: 'PG', label: 'PG', x: 35, y: 78, pupilId: null },
    { id: 'SG', label: 'SG', x: 65, y: 78, pupilId: null },
    { id: 'SF', label: 'SF', x: 50, y: 50, pupilId: null },
    { id: 'PF', label: 'PF', x: 30, y: 24, pupilId: null },
    { id: 'C',  label: 'C',  x: 70, y: 24, pupilId: null },
  ],
  '2-3': [
    { id: 'PG', label: 'PG', x: 38, y: 76, pupilId: null },
    { id: 'SG', label: 'SG', x: 62, y: 76, pupilId: null },
    { id: 'SF', label: 'SF', x: 20, y: 36, pupilId: null },
    { id: 'C',  label: 'C',  x: 50, y: 28, pupilId: null },
    { id: 'PF', label: 'PF', x: 80, y: 36, pupilId: null },
  ],
}

export const defaultPositions4 = {
  diamond: [
    { id: 'PG', label: 'PG', x: 50, y: 80, pupilId: null },
    { id: 'W1', label: 'W',  x: 25, y: 50, pupilId: null },
    { id: 'W2', label: 'W',  x: 75, y: 50, pupilId: null },
    { id: 'C',  label: 'C',  x: 50, y: 22, pupilId: null },
  ],
}

export const defaultPositionsByFormat = {
  5: defaultPositions5,
  4: defaultPositions4,
}

const basketball = {
  key: 'basketball',
  label: 'Basketball',
  pitchOrientation: 'portrait',
  hasGoalkeeper: false,
  formatSizes: [4, 5],
  formationsByFormat,
  defaultFormationByFormat,
  defaultPositionsByFormat,
  ageGroupFormatMap: {
    'U7': 4, 'U8': 4, 'U9': 4,
    'U10': 5, 'U11': 5, 'U12': 5, 'U13': 5, 'U14': 5,
    'U15': 5, 'U16': 5, 'U17': 5, 'U18': 5, 'Adult': 5,
  },
  setPieceRoles: [
    { key: 'free_throws', label: 'Free Throws' },
    { key: 'inbound_plays', label: 'Inbound Plays' },
  ],
  defaultSetPieceTakers: { free_throws: '', inbound_plays: '' },
  tacticalZones: null,
  viewModes: ['formation'],
  supportsPhases: false,
  defaultFormat: 5,
}

export default basketball
