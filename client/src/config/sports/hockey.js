// Field Hockey sport configuration

export const formationsByFormat = {
  11: ['4-3-3', '4-4-2', '3-4-3', '3-3-4', '5-3-2'],
  7: ['3-3', '2-3-1', '3-2-1'],
}

export const defaultFormationByFormat = {
  11: '4-3-3',
  7: '3-3',
}

export const defaultPositions11 = {
  '4-3-3': [
    { id: 'GK', label: 'GK', x: 50, y: 92, pupilId: null },
    { id: 'LB', label: 'LB', x: 15, y: 72, pupilId: null },
    { id: 'CB1', label: 'CB', x: 35, y: 78, pupilId: null },
    { id: 'CB2', label: 'CB', x: 65, y: 78, pupilId: null },
    { id: 'RB', label: 'RB', x: 85, y: 72, pupilId: null },
    { id: 'LMF', label: 'LMF', x: 25, y: 52, pupilId: null },
    { id: 'CMF', label: 'CMF', x: 50, y: 48, pupilId: null },
    { id: 'RMF', label: 'RMF', x: 75, y: 52, pupilId: null },
    { id: 'LF', label: 'LF', x: 18, y: 22, pupilId: null },
    { id: 'CF', label: 'CF', x: 50, y: 15, pupilId: null },
    { id: 'RF', label: 'RF', x: 82, y: 22, pupilId: null },
  ],
  '4-4-2': [
    { id: 'GK', label: 'GK', x: 50, y: 92, pupilId: null },
    { id: 'LB', label: 'LB', x: 15, y: 72, pupilId: null },
    { id: 'CB1', label: 'CB', x: 35, y: 78, pupilId: null },
    { id: 'CB2', label: 'CB', x: 65, y: 78, pupilId: null },
    { id: 'RB', label: 'RB', x: 85, y: 72, pupilId: null },
    { id: 'LMF', label: 'LMF', x: 15, y: 50, pupilId: null },
    { id: 'CMF1', label: 'CMF', x: 37, y: 52, pupilId: null },
    { id: 'CMF2', label: 'CMF', x: 63, y: 52, pupilId: null },
    { id: 'RMF', label: 'RMF', x: 85, y: 50, pupilId: null },
    { id: 'LF', label: 'LF', x: 30, y: 18, pupilId: null },
    { id: 'RF', label: 'RF', x: 70, y: 18, pupilId: null },
  ],
  '3-4-3': [
    { id: 'GK', label: 'GK', x: 50, y: 92, pupilId: null },
    { id: 'LB', label: 'LB', x: 22, y: 75, pupilId: null },
    { id: 'CB', label: 'CB', x: 50, y: 80, pupilId: null },
    { id: 'RB', label: 'RB', x: 78, y: 75, pupilId: null },
    { id: 'LMF', label: 'LMF', x: 15, y: 52, pupilId: null },
    { id: 'CMF1', label: 'CMF', x: 38, y: 55, pupilId: null },
    { id: 'CMF2', label: 'CMF', x: 62, y: 55, pupilId: null },
    { id: 'RMF', label: 'RMF', x: 85, y: 52, pupilId: null },
    { id: 'LF', label: 'LF', x: 18, y: 22, pupilId: null },
    { id: 'CF', label: 'CF', x: 50, y: 15, pupilId: null },
    { id: 'RF', label: 'RF', x: 82, y: 22, pupilId: null },
  ],
  '3-3-4': [
    { id: 'GK', label: 'GK', x: 50, y: 92, pupilId: null },
    { id: 'LB', label: 'LB', x: 22, y: 75, pupilId: null },
    { id: 'CB', label: 'CB', x: 50, y: 80, pupilId: null },
    { id: 'RB', label: 'RB', x: 78, y: 75, pupilId: null },
    { id: 'LMF', label: 'LMF', x: 20, y: 52, pupilId: null },
    { id: 'CMF', label: 'CMF', x: 50, y: 50, pupilId: null },
    { id: 'RMF', label: 'RMF', x: 80, y: 52, pupilId: null },
    { id: 'LF', label: 'LF', x: 15, y: 22, pupilId: null },
    { id: 'ILF', label: 'IL', x: 38, y: 18, pupilId: null },
    { id: 'IRF', label: 'IR', x: 62, y: 18, pupilId: null },
    { id: 'RF', label: 'RF', x: 85, y: 22, pupilId: null },
  ],
  '5-3-2': [
    { id: 'GK', label: 'GK', x: 50, y: 92, pupilId: null },
    { id: 'LWB', label: 'LWB', x: 10, y: 68, pupilId: null },
    { id: 'LB', label: 'LB', x: 28, y: 75, pupilId: null },
    { id: 'CB', label: 'CB', x: 50, y: 80, pupilId: null },
    { id: 'RB', label: 'RB', x: 72, y: 75, pupilId: null },
    { id: 'RWB', label: 'RWB', x: 90, y: 68, pupilId: null },
    { id: 'LMF', label: 'LMF', x: 25, y: 50, pupilId: null },
    { id: 'CMF', label: 'CMF', x: 50, y: 46, pupilId: null },
    { id: 'RMF', label: 'RMF', x: 75, y: 50, pupilId: null },
    { id: 'LF', label: 'LF', x: 30, y: 18, pupilId: null },
    { id: 'RF', label: 'RF', x: 70, y: 18, pupilId: null },
  ],
}

export const defaultPositions7 = {
  '3-3': [
    { id: 'GK', label: 'GK', x: 50, y: 92, pupilId: null },
    { id: 'LB', label: 'LB', x: 22, y: 72, pupilId: null },
    { id: 'CB', label: 'CB', x: 50, y: 78, pupilId: null },
    { id: 'RB', label: 'RB', x: 78, y: 72, pupilId: null },
    { id: 'LMF', label: 'LMF', x: 20, y: 45, pupilId: null },
    { id: 'CMF', label: 'CMF', x: 50, y: 42, pupilId: null },
    { id: 'RMF', label: 'RMF', x: 80, y: 45, pupilId: null },
  ],
  '2-3-1': [
    { id: 'GK', label: 'GK', x: 50, y: 92, pupilId: null },
    { id: 'LB', label: 'LB', x: 28, y: 72, pupilId: null },
    { id: 'RB', label: 'RB', x: 72, y: 72, pupilId: null },
    { id: 'LMF', label: 'LMF', x: 20, y: 48, pupilId: null },
    { id: 'CMF', label: 'CMF', x: 50, y: 48, pupilId: null },
    { id: 'RMF', label: 'RMF', x: 80, y: 48, pupilId: null },
    { id: 'CF', label: 'CF', x: 50, y: 18, pupilId: null },
  ],
  '3-2-1': [
    { id: 'GK', label: 'GK', x: 50, y: 92, pupilId: null },
    { id: 'LB', label: 'LB', x: 22, y: 72, pupilId: null },
    { id: 'CB', label: 'CB', x: 50, y: 78, pupilId: null },
    { id: 'RB', label: 'RB', x: 78, y: 72, pupilId: null },
    { id: 'LMF', label: 'LMF', x: 32, y: 45, pupilId: null },
    { id: 'RMF', label: 'RMF', x: 68, y: 45, pupilId: null },
    { id: 'CF', label: 'CF', x: 50, y: 18, pupilId: null },
  ],
}

export const defaultPositionsByFormat = {
  11: defaultPositions11,
  7: defaultPositions7,
}

export const setPieceRoles = [
  { key: 'penalty_corners', label: 'Penalty Corner Injector' },
  { key: 'penalty_corner_hit', label: 'Penalty Corner Hit' },
  { key: 'short_corners', label: 'Short Corners' },
  { key: 'free_hits', label: 'Free Hits' },
]

export const defaultSetPieceTakers = {
  penalty_corners: '', penalty_corner_hit: '', short_corners: '', free_hits: '',
}

const hockey = {
  key: 'hockey',
  label: 'Hockey',
  pitchOrientation: 'portrait',
  hasGoalkeeper: true,
  formatSizes: [7, 11],
  formationsByFormat,
  defaultFormationByFormat,
  defaultPositionsByFormat,
  ageGroupFormatMap: {
    'U7': 7, 'U8': 7, 'U9': 7, 'U10': 7, 'U11': 7,
    'U12': 11, 'U13': 11, 'U14': 11, 'U15': 11, 'U16': 11, 'U17': 11, 'U18': 11,
    'Adult': 11,
  },
  setPieceRoles,
  defaultSetPieceTakers,
  tacticalZones: null,
  viewModes: ['formation'],
  supportsPhases: false,
  defaultFormat: 11,
}

export default hockey
