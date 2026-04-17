// Cricket sport configuration
// Cricket uses fielding positions rather than tactical formations

export const formationsByFormat = {
  11: ['standard-field'],
}

export const defaultFormationByFormat = {
  11: 'standard-field',
}

// Cricket fielding positions - coordinates on an oval pitch
// x: 0=left, 50=centre, 100=right
// y: 0=top(far boundary), 50=centre(pitch), 100=bottom(near boundary)
export const defaultPositions11 = {
  'standard-field': [
    { id: 'WK', label: 'WK', x: 50, y: 60, pupilId: null },   // Wicket Keeper
    { id: 'SL', label: 'SL', x: 32, y: 56, pupilId: null },   // Slip
    { id: 'GS', label: 'GS', x: 22, y: 52, pupilId: null },   // Gully
    { id: 'P', label: 'P', x: 42, y: 42, pupilId: null },     // Point
    { id: 'COV', label: 'COV', x: 30, y: 32, pupilId: null }, // Cover
    { id: 'MO', label: 'MO', x: 50, y: 25, pupilId: null },   // Mid Off
    { id: 'MON', label: 'MON', x: 50, y: 75, pupilId: null }, // Mid On
    { id: 'MW', label: 'MW', x: 68, y: 32, pupilId: null },   // Mid Wicket
    { id: 'SQ', label: 'SQ', x: 72, y: 52, pupilId: null },   // Square Leg
    { id: 'FO', label: 'FO', x: 25, y: 15, pupilId: null },   // Fine Off / Third Man
    { id: 'DL', label: 'DL', x: 75, y: 15, pupilId: null },   // Deep Mid Wicket / Deep Leg
  ],
}

export const defaultPositionsByFormat = {
  11: defaultPositions11,
}

export const setPieceRoles = [
  { key: 'opening_bowlers', label: 'Opening Bowlers' },
  { key: 'wicket_keeper', label: 'Wicket Keeper' },
  { key: 'captain', label: 'Captain' },
]

export const defaultSetPieceTakers = {
  opening_bowlers: '', wicket_keeper: '', captain: '',
}

const cricket = {
  key: 'cricket',
  label: 'Cricket',
  pitchOrientation: 'portrait',
  hasGoalkeeper: false,
  formatSizes: [11],
  formationsByFormat,
  defaultFormationByFormat,
  defaultPositionsByFormat,
  ageGroupFormatMap: {},
  setPieceRoles,
  defaultSetPieceTakers,
  tacticalZones: null,
  viewModes: ['formation'],
  supportsPhases: false,
  defaultFormat: 11,
}

export default cricket
