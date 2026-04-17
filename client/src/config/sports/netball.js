// Netball sport configuration
// Netball court is portrait (longer than wide), 7 players, fixed positions

// Netball has fixed positions - no "formations" as such
export const formationsByFormat = {
  7: ['standard'],
  5: ['modified-5'],
}

export const defaultFormationByFormat = {
  7: 'standard',
  5: 'modified-5',
}

// Court divided into thirds: defensive, centre, attacking
// GS and GA restricted to attacking third + shooting circle
// WA restricted to attacking 2/3
// C can go anywhere except shooting circles
// WD restricted to defensive 2/3
// GD and GK restricted to defensive third + shooting circle
export const defaultPositions7 = {
  'standard': [
    { id: 'GS', label: 'GS', x: 50, y: 12, pupilId: null },   // Goal Shooter - attacking circle
    { id: 'GA', label: 'GA', x: 35, y: 22, pupilId: null },   // Goal Attack - attacking third
    { id: 'WA', label: 'WA', x: 65, y: 35, pupilId: null },   // Wing Attack - attacking 2/3
    { id: 'C', label: 'C', x: 50, y: 50, pupilId: null },     // Centre - full court
    { id: 'WD', label: 'WD', x: 35, y: 62, pupilId: null },   // Wing Defence - defensive 2/3
    { id: 'GD', label: 'GD', x: 65, y: 75, pupilId: null },   // Goal Defence - defensive third
    { id: 'GK', label: 'GK', x: 50, y: 88, pupilId: null },   // Goal Keeper - defensive circle
  ],
}

export const defaultPositions5 = {
  'modified-5': [
    { id: 'GS', label: 'GS', x: 50, y: 12, pupilId: null },
    { id: 'GA', label: 'GA', x: 38, y: 30, pupilId: null },
    { id: 'C', label: 'C', x: 50, y: 50, pupilId: null },
    { id: 'GD', label: 'GD', x: 62, y: 70, pupilId: null },
    { id: 'GK', label: 'GK', x: 50, y: 88, pupilId: null },
  ],
}

export const defaultPositionsByFormat = {
  7: defaultPositions7,
  5: defaultPositions5,
}

export const setPieceRoles = [
  { key: 'centre_pass', label: 'Centre Pass' },
  { key: 'throw_ins', label: 'Throw-ins' },
]

export const defaultSetPieceTakers = {
  centre_pass: '', throw_ins: '',
}

// Netball court zones (thirds)
export const courtZones = {
  thirds: [
    { id: 'attacking', y: 0, height: 33, label: 'Attacking Third' },
    { id: 'centre', y: 33, height: 34, label: 'Centre Third' },
    { id: 'defensive', y: 67, height: 33, label: 'Defensive Third' },
  ],
}

const netball = {
  key: 'netball',
  label: 'Netball',
  pitchOrientation: 'portrait',
  hasGoalkeeper: true,
  formatSizes: [5, 7],
  formationsByFormat,
  defaultFormationByFormat,
  defaultPositionsByFormat,
  ageGroupFormatMap: {},
  setPieceRoles,
  defaultSetPieceTakers,
  tacticalZones: courtZones,
  viewModes: ['formation'],
  supportsPhases: false,
  defaultFormat: 7,
}

export default netball
