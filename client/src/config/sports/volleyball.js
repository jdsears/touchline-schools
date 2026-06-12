// Volleyball sport configuration
// Portrait court; own side at the bottom, net at the top

export const formationsByFormat = {
  6: ['w-receive'],
  4: ['square'],
}

export const defaultFormationByFormat = {
  6: 'w-receive',
  4: 'square',
}

export const defaultPositions6 = {
  'w-receive': [
    { id: 'P4', label: 'P4', x: 22, y: 35, pupilId: null },
    { id: 'P3', label: 'P3', x: 50, y: 28, pupilId: null },
    { id: 'P2', label: 'P2', x: 78, y: 35, pupilId: null },
    { id: 'P5', label: 'P5', x: 25, y: 74, pupilId: null },
    { id: 'P6', label: 'P6', x: 50, y: 80, pupilId: null },
    { id: 'P1', label: 'P1', x: 75, y: 74, pupilId: null },
  ],
}

export const defaultPositions4 = {
  square: [
    { id: 'FL', label: 'FL', x: 30, y: 35, pupilId: null },
    { id: 'FR', label: 'FR', x: 70, y: 35, pupilId: null },
    { id: 'BL', label: 'BL', x: 30, y: 75, pupilId: null },
    { id: 'BR', label: 'BR', x: 70, y: 75, pupilId: null },
  ],
}

export const defaultPositionsByFormat = {
  6: defaultPositions6,
  4: defaultPositions4,
}

const volleyball = {
  key: 'volleyball',
  label: 'Volleyball',
  pitchOrientation: 'portrait',
  hasGoalkeeper: false,
  formatSizes: [4, 6],
  formationsByFormat,
  defaultFormationByFormat,
  defaultPositionsByFormat,
  ageGroupFormatMap: {
    'U7': 4, 'U8': 4, 'U9': 4, 'U10': 4, 'U11': 4,
    'U12': 6, 'U13': 6, 'U14': 6, 'U15': 6, 'U16': 6, 'U17': 6, 'U18': 6, 'Adult': 6,
  },
  setPieceRoles: [
    { key: 'serve_order', label: 'Serve Order' },
  ],
  defaultSetPieceTakers: { serve_order: '' },
  tacticalZones: null,
  viewModes: ['formation'],
  supportsPhases: false,
  supportsGameModel: false,
  defaultFormat: 6,
}

export default volleyball
