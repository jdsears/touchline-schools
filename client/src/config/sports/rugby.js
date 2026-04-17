// Rugby Union sport configuration

export const formationsByFormat = {
  15: ['15-a-side'],
  13: ['13-a-side'], // League
  7: ['7-a-side'],
}

export const defaultFormationByFormat = {
  15: '15-a-side',
  13: '13-a-side',
  7: '7-a-side',
}

// 15-a-side default positions (forwards 1-8, backs 9-15)
export const defaultPositions15 = {
  '15-a-side': [
    // Front row
    { id: 'P1', label: '1', x: 38, y: 85, pupilId: null },   // Loosehead Prop
    { id: 'H2', label: '2', x: 50, y: 88, pupilId: null },   // Hooker
    { id: 'P3', label: '3', x: 62, y: 85, pupilId: null },   // Tighthead Prop
    // Second row
    { id: 'L4', label: '4', x: 40, y: 80, pupilId: null },   // Lock
    { id: 'L5', label: '5', x: 60, y: 80, pupilId: null },   // Lock
    // Back row
    { id: 'FL6', label: '6', x: 30, y: 75, pupilId: null },  // Blindside Flanker
    { id: 'FL7', label: '7', x: 70, y: 75, pupilId: null },  // Openside Flanker
    { id: 'N8', label: '8', x: 50, y: 78, pupilId: null },   // Number 8
    // Backs
    { id: 'SH9', label: '9', x: 50, y: 65, pupilId: null },  // Scrum-half
    { id: 'FH10', label: '10', x: 35, y: 58, pupilId: null }, // Fly-half
    { id: 'LW11', label: '11', x: 10, y: 42, pupilId: null }, // Left Wing
    { id: 'IC12', label: '12', x: 42, y: 50, pupilId: null }, // Inside Centre
    { id: 'OC13', label: '13', x: 58, y: 50, pupilId: null }, // Outside Centre
    { id: 'RW14', label: '14', x: 90, y: 42, pupilId: null }, // Right Wing
    { id: 'FB15', label: '15', x: 50, y: 15, pupilId: null }, // Fullback
  ],
}

export const defaultPositions7 = {
  '7-a-side': [
    { id: 'P1', label: '1', x: 38, y: 85, pupilId: null },
    { id: 'H2', label: '2', x: 50, y: 85, pupilId: null },
    { id: 'P3', label: '3', x: 62, y: 85, pupilId: null },
    { id: 'SH4', label: '4', x: 50, y: 68, pupilId: null },
    { id: 'FH5', label: '5', x: 35, y: 55, pupilId: null },
    { id: 'C6', label: '6', x: 62, y: 50, pupilId: null },
    { id: 'FB7', label: '7', x: 50, y: 18, pupilId: null },
  ],
}

export const defaultPositionsByFormat = {
  15: defaultPositions15,
  7: defaultPositions7,
}

export const setPieceRoles = [
  { key: 'lineouts', label: 'Lineout Caller' },
  { key: 'scrums', label: 'Scrum Leader' },
  { key: 'penalties_kick', label: 'Penalty Kicker' },
  { key: 'conversions', label: 'Conversion Kicker' },
  { key: 'restarts', label: 'Kick-offs / Restarts' },
]

export const defaultSetPieceTakers = {
  lineouts: '', scrums: '', penalties_kick: '', conversions: '', restarts: '',
}

const rugby = {
  key: 'rugby',
  label: 'Rugby Union',
  pitchOrientation: 'portrait',
  hasGoalkeeper: false,
  formatSizes: [7, 15],
  formationsByFormat,
  defaultFormationByFormat,
  defaultPositionsByFormat,
  ageGroupFormatMap: {},
  setPieceRoles,
  defaultSetPieceTakers,
  tacticalZones: null,
  viewModes: ['formation'],
  supportsPhases: false,
  defaultFormat: 15,
}

export default rugby
