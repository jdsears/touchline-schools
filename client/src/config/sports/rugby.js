// Rugby Union sport configuration

// Rugby uses "shapes" not formations - split into defensive and attacking shapes
export const defensiveShapes = ['Drift Defence', 'Blitz Defence', 'Up-and-In']
export const attackingShapes = ['Pod Structure (1-3-3-1)', 'Wide Attack', '10-12 Crash Channel']

// Combined as "formations" for the generic tactics board selector
export const formations15 = [...defensiveShapes, ...attackingShapes]
export const formations12 = ['Standard 12s', 'Wide 12s', 'Defensive 12s']
export const formations10 = ['Standard 10s', 'Wide 10s']
export const formations7 = ['Standard 7s Attack', 'Defensive 7s']

export const formationsByFormat = {
  15: formations15,
  12: formations12,
  10: formations10,
  7: formations7,
}

export const defaultFormationByFormat = {
  15: 'Drift Defence',
  12: 'Standard 12s',
  10: 'Standard 10s',
  7: 'Standard 7s Attack',
}

// 15-a-side default positions
// Forwards (1-8) in a scrum-ish cluster, backs (9-15) spread behind
// y=10 is try line (attacking), y=90 is try line (defending)
// Standard layout: GK deploys from defensive half, forwards pack together
export const defaultPositions15 = {
  'Drift Defence': [
    // Props + Hooker (front row) - form a horizontal row near own 22
    { id: 'P1', label: '1-LHP', x: 38, y: 82, pupilId: null },
    { id: 'H2', label: '2-H', x: 50, y: 84, pupilId: null },
    { id: 'P3', label: '3-THP', x: 62, y: 82, pupilId: null },
    // Locks (second row)
    { id: 'L4', label: '4-L', x: 42, y: 77, pupilId: null },
    { id: 'L5', label: '5-L', x: 58, y: 77, pupilId: null },
    // Back row
    { id: 'FL6', label: '6-BSF', x: 34, y: 72, pupilId: null },
    { id: 'FL7', label: '7-OSF', x: 66, y: 72, pupilId: null },
    { id: 'N8', label: '8-N8', x: 50, y: 74, pupilId: null },
    // Backs spread in a drift shape
    { id: 'SH9', label: '9-SH', x: 50, y: 64, pupilId: null },
    { id: 'FH10', label: '10-FH', x: 36, y: 57, pupilId: null },
    { id: 'IC12', label: '12-IC', x: 26, y: 50, pupilId: null },
    { id: 'OC13', label: '13-OC', x: 18, y: 44, pupilId: null },
    { id: 'LW11', label: '11-LW', x: 8, y: 38, pupilId: null },
    { id: 'RW14', label: '14-RW', x: 92, y: 38, pupilId: null },
    { id: 'FB15', label: '15-FB', x: 50, y: 25, pupilId: null },
  ],
  'Blitz Defence': [
    { id: 'P1', label: '1-LHP', x: 38, y: 82, pupilId: null },
    { id: 'H2', label: '2-H', x: 50, y: 84, pupilId: null },
    { id: 'P3', label: '3-THP', x: 62, y: 82, pupilId: null },
    { id: 'L4', label: '4-L', x: 42, y: 77, pupilId: null },
    { id: 'L5', label: '5-L', x: 58, y: 77, pupilId: null },
    { id: 'FL6', label: '6-BSF', x: 34, y: 72, pupilId: null },
    { id: 'FL7', label: '7-OSF', x: 66, y: 72, pupilId: null },
    { id: 'N8', label: '8-N8', x: 50, y: 74, pupilId: null },
    // Blitz: backs flatten and rush up aggressively
    { id: 'SH9', label: '9-SH', x: 50, y: 65, pupilId: null },
    { id: 'FH10', label: '10-FH', x: 38, y: 62, pupilId: null },
    { id: 'IC12', label: '12-IC', x: 28, y: 62, pupilId: null },
    { id: 'OC13', label: '13-OC', x: 18, y: 62, pupilId: null },
    { id: 'LW11', label: '11-LW', x: 8, y: 62, pupilId: null },
    { id: 'RW14', label: '14-RW', x: 92, y: 62, pupilId: null },
    { id: 'FB15', label: '15-FB', x: 50, y: 50, pupilId: null },
  ],
  'Up-and-In': [
    { id: 'P1', label: '1-LHP', x: 38, y: 82, pupilId: null },
    { id: 'H2', label: '2-H', x: 50, y: 84, pupilId: null },
    { id: 'P3', label: '3-THP', x: 62, y: 82, pupilId: null },
    { id: 'L4', label: '4-L', x: 42, y: 77, pupilId: null },
    { id: 'L5', label: '5-L', x: 58, y: 77, pupilId: null },
    { id: 'FL6', label: '6-BSF', x: 30, y: 72, pupilId: null },
    { id: 'FL7', label: '7-OSF', x: 70, y: 72, pupilId: null },
    { id: 'N8', label: '8-N8', x: 50, y: 74, pupilId: null },
    // Up-and-in: backs in staggered diagonal, pressing infield
    { id: 'SH9', label: '9-SH', x: 50, y: 65, pupilId: null },
    { id: 'FH10', label: '10-FH', x: 40, y: 60, pupilId: null },
    { id: 'IC12', label: '12-IC', x: 32, y: 55, pupilId: null },
    { id: 'OC13', label: '13-OC', x: 22, y: 50, pupilId: null },
    { id: 'LW11', label: '11-LW', x: 8, y: 40, pupilId: null },
    { id: 'RW14', label: '14-RW', x: 92, y: 40, pupilId: null },
    { id: 'FB15', label: '15-FB', x: 50, y: 30, pupilId: null },
  ],
  'Pod Structure (1-3-3-1)': [
    // Pods: 3 pods of 3 forwards with SH linking
    { id: 'P1', label: '1-LHP', x: 30, y: 72, pupilId: null },
    { id: 'H2', label: '2-H', x: 50, y: 70, pupilId: null },
    { id: 'P3', label: '3-THP', x: 70, y: 72, pupilId: null },
    { id: 'L4', label: '4-L', x: 35, y: 62, pupilId: null },
    { id: 'L5', label: '5-L', x: 65, y: 62, pupilId: null },
    { id: 'FL6', label: '6-BSF', x: 22, y: 60, pupilId: null },
    { id: 'FL7', label: '7-OSF', x: 78, y: 60, pupilId: null },
    { id: 'N8', label: '8-N8', x: 50, y: 58, pupilId: null },
    { id: 'SH9', label: '9-SH', x: 50, y: 52, pupilId: null },
    { id: 'FH10', label: '10-FH', x: 38, y: 45, pupilId: null },
    { id: 'IC12', label: '12-IC', x: 50, y: 40, pupilId: null },
    { id: 'OC13', label: '13-OC', x: 65, y: 38, pupilId: null },
    { id: 'LW11', label: '11-LW', x: 8, y: 32, pupilId: null },
    { id: 'RW14', label: '14-RW', x: 92, y: 32, pupilId: null },
    { id: 'FB15', label: '15-FB', x: 50, y: 22, pupilId: null },
  ],
  'Wide Attack': [
    { id: 'P1', label: '1-LHP', x: 40, y: 72, pupilId: null },
    { id: 'H2', label: '2-H', x: 50, y: 74, pupilId: null },
    { id: 'P3', label: '3-THP', x: 60, y: 72, pupilId: null },
    { id: 'L4', label: '4-L', x: 42, y: 65, pupilId: null },
    { id: 'L5', label: '5-L', x: 58, y: 65, pupilId: null },
    { id: 'FL6', label: '6-BSF', x: 34, y: 62, pupilId: null },
    { id: 'FL7', label: '7-OSF', x: 66, y: 62, pupilId: null },
    { id: 'N8', label: '8-N8', x: 50, y: 60, pupilId: null },
    { id: 'SH9', label: '9-SH', x: 50, y: 52, pupilId: null },
    // Backs spread very wide for wide attack
    { id: 'FH10', label: '10-FH', x: 38, y: 44, pupilId: null },
    { id: 'IC12', label: '12-IC', x: 28, y: 38, pupilId: null },
    { id: 'OC13', label: '13-OC', x: 16, y: 32, pupilId: null },
    { id: 'LW11', label: '11-LW', x: 5, y: 28, pupilId: null },
    { id: 'RW14', label: '14-RW', x: 95, y: 28, pupilId: null },
    { id: 'FB15', label: '15-FB', x: 62, y: 36, pupilId: null },
  ],
  '10-12 Crash Channel': [
    { id: 'P1', label: '1-LHP', x: 38, y: 72, pupilId: null },
    { id: 'H2', label: '2-H', x: 50, y: 74, pupilId: null },
    { id: 'P3', label: '3-THP', x: 62, y: 72, pupilId: null },
    { id: 'L4', label: '4-L', x: 42, y: 65, pupilId: null },
    { id: 'L5', label: '5-L', x: 58, y: 65, pupilId: null },
    { id: 'FL6', label: '6-BSF', x: 32, y: 62, pupilId: null },
    { id: 'FL7', label: '7-OSF', x: 68, y: 62, pupilId: null },
    { id: 'N8', label: '8-N8', x: 50, y: 60, pupilId: null },
    { id: 'SH9', label: '9-SH', x: 50, y: 52, pupilId: null },
    // 10 and 12 crash up through the middle
    { id: 'FH10', label: '10-FH', x: 44, y: 42, pupilId: null },
    { id: 'IC12', label: '12-IC', x: 56, y: 42, pupilId: null },
    { id: 'OC13', label: '13-OC', x: 72, y: 38, pupilId: null },
    { id: 'LW11', label: '11-LW', x: 8, y: 30, pupilId: null },
    { id: 'RW14', label: '14-RW', x: 92, y: 30, pupilId: null },
    { id: 'FB15', label: '15-FB', x: 50, y: 22, pupilId: null },
  ],
}

export const defaultPositions12 = {
  'Standard 12s': [
    { id: 'P1', label: '1', x: 38, y: 80, pupilId: null },
    { id: 'H2', label: '2', x: 50, y: 82, pupilId: null },
    { id: 'P3', label: '3', x: 62, y: 80, pupilId: null },
    { id: 'L4', label: '4', x: 42, y: 74, pupilId: null },
    { id: 'L5', label: '5', x: 58, y: 74, pupilId: null },
    { id: 'FL6', label: '6', x: 34, y: 70, pupilId: null },
    { id: 'FL7', label: '7', x: 66, y: 70, pupilId: null },
    { id: 'N8', label: '8', x: 50, y: 72, pupilId: null },
    { id: 'SH9', label: '9', x: 50, y: 60, pupilId: null },
    { id: 'FH10', label: '10', x: 38, y: 52, pupilId: null },
    { id: 'C12', label: '12', x: 26, y: 42, pupilId: null },
    { id: 'FB15', label: '15', x: 50, y: 25, pupilId: null },
  ],
  'Wide 12s': [
    { id: 'P1', label: '1', x: 38, y: 80, pupilId: null },
    { id: 'H2', label: '2', x: 50, y: 82, pupilId: null },
    { id: 'P3', label: '3', x: 62, y: 80, pupilId: null },
    { id: 'L4', label: '4', x: 42, y: 74, pupilId: null },
    { id: 'L5', label: '5', x: 58, y: 74, pupilId: null },
    { id: 'FL6', label: '6', x: 30, y: 70, pupilId: null },
    { id: 'FL7', label: '7', x: 70, y: 70, pupilId: null },
    { id: 'N8', label: '8', x: 50, y: 72, pupilId: null },
    { id: 'SH9', label: '9', x: 50, y: 60, pupilId: null },
    { id: 'FH10', label: '10', x: 36, y: 50, pupilId: null },
    { id: 'C12', label: '12', x: 20, y: 40, pupilId: null },
    { id: 'FB15', label: '15', x: 50, y: 22, pupilId: null },
  ],
  'Defensive 12s': [
    { id: 'P1', label: '1', x: 38, y: 80, pupilId: null },
    { id: 'H2', label: '2', x: 50, y: 82, pupilId: null },
    { id: 'P3', label: '3', x: 62, y: 80, pupilId: null },
    { id: 'L4', label: '4', x: 42, y: 75, pupilId: null },
    { id: 'L5', label: '5', x: 58, y: 75, pupilId: null },
    { id: 'FL6', label: '6', x: 34, y: 70, pupilId: null },
    { id: 'FL7', label: '7', x: 66, y: 70, pupilId: null },
    { id: 'N8', label: '8', x: 50, y: 73, pupilId: null },
    { id: 'SH9', label: '9', x: 50, y: 63, pupilId: null },
    { id: 'FH10', label: '10', x: 38, y: 58, pupilId: null },
    { id: 'C12', label: '12', x: 28, y: 58, pupilId: null },
    { id: 'FB15', label: '15', x: 50, y: 30, pupilId: null },
  ],
}

export const defaultPositions10 = {
  'Standard 10s': [
    { id: 'P1', label: '1', x: 38, y: 80, pupilId: null },
    { id: 'H2', label: '2', x: 50, y: 82, pupilId: null },
    { id: 'P3', label: '3', x: 62, y: 80, pupilId: null },
    { id: 'L4', label: '4', x: 42, y: 74, pupilId: null },
    { id: 'L5', label: '5', x: 58, y: 74, pupilId: null },
    { id: 'FL6', label: '6', x: 34, y: 68, pupilId: null },
    { id: 'SH9', label: '9', x: 50, y: 58, pupilId: null },
    { id: 'FH10', label: '10', x: 38, y: 48, pupilId: null },
    { id: 'C12', label: '12', x: 28, y: 40, pupilId: null },
    { id: 'FB15', label: '15', x: 50, y: 25, pupilId: null },
  ],
  'Wide 10s': [
    { id: 'P1', label: '1', x: 38, y: 80, pupilId: null },
    { id: 'H2', label: '2', x: 50, y: 82, pupilId: null },
    { id: 'P3', label: '3', x: 62, y: 80, pupilId: null },
    { id: 'L4', label: '4', x: 42, y: 74, pupilId: null },
    { id: 'L5', label: '5', x: 58, y: 74, pupilId: null },
    { id: 'FL6', label: '6', x: 30, y: 68, pupilId: null },
    { id: 'SH9', label: '9', x: 50, y: 58, pupilId: null },
    { id: 'FH10', label: '10', x: 36, y: 46, pupilId: null },
    { id: 'C12', label: '12', x: 20, y: 38, pupilId: null },
    { id: 'FB15', label: '15', x: 50, y: 22, pupilId: null },
  ],
}

export const defaultPositions7 = {
  'Standard 7s Attack': [
    { id: 'P1', label: '1', x: 38, y: 80, pupilId: null },
    { id: 'H2', label: '2', x: 50, y: 82, pupilId: null },
    { id: 'P3', label: '3', x: 62, y: 80, pupilId: null },
    { id: 'SH4', label: '9', x: 50, y: 65, pupilId: null },
    { id: 'FH5', label: '10', x: 38, y: 52, pupilId: null },
    { id: 'C6', label: '12', x: 26, y: 40, pupilId: null },
    { id: 'W7', label: '14', x: 8, y: 28, pupilId: null },
  ],
  'Defensive 7s': [
    { id: 'P1', label: '1', x: 38, y: 80, pupilId: null },
    { id: 'H2', label: '2', x: 50, y: 82, pupilId: null },
    { id: 'P3', label: '3', x: 62, y: 80, pupilId: null },
    { id: 'SH4', label: '9', x: 50, y: 68, pupilId: null },
    { id: 'FH5', label: '10', x: 36, y: 62, pupilId: null },
    { id: 'C6', label: '12', x: 24, y: 62, pupilId: null },
    { id: 'W7', label: '14', x: 12, y: 62, pupilId: null },
  ],
}

export const defaultPositionsByFormat = {
  15: defaultPositions15,
  12: defaultPositions12,
  10: defaultPositions10,
  7: defaultPositions7,
}

export const setPieceRoles = [
  { key: 'lineout_caller', label: 'Lineout Caller' },
  { key: 'lineout_jumper', label: 'Lineout Jumper' },
  { key: 'penalties_kick', label: 'Penalty Kicker' },
  { key: 'conversions', label: 'Conversion Kicker' },
  { key: 'restarts', label: 'Kick-off / Restart' },
  { key: 'dropouts', label: '22m Drop-out' },
]

export const defaultSetPieceTakers = {
  lineout_caller: '', lineout_jumper: '', penalties_kick: '',
  conversions: '', restarts: '', dropouts: '',
}

const rugby = {
  key: 'rugby',
  label: 'Rugby Union',
  pitchOrientation: 'portrait',
  pitchBackground: `linear-gradient(to bottom, #14532d 0%, #166534 20%, #15803d 45%, #166534 55%, #15803d 80%, #14532d 100%)`,
  hasGoalkeeper: false,
  formatSizes: [7, 10, 12, 15],
  formationsByFormat,
  defaultFormationByFormat,
  defaultPositionsByFormat,
  ageGroupFormatMap: {
    'U7': 7, 'U8': 7, 'U9': 7, 'U10': 10, 'U11': 10,
    'U12': 12, 'U13': 12, 'U14': 15, 'U15': 15, 'U16': 15, 'U18': 15, 'Adult': 15,
  },
  setPieceRoles,
  defaultSetPieceTakers,
  tacticalZones: null,
  viewModes: ['Base', 'Attack', 'Defence', 'Set Piece'],
  supportsPhases: false,
  defaultFormat: 15,
  pitchComponent: 'RugbyPitch',
  aspectRatio: '3/4',
}

export default rugby
