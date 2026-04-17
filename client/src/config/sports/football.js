// Football sport configuration

export const formations11 = [
  '4-3-3', '4-4-2', '4-2-3-1', '3-5-2', '3-4-3', '4-1-4-1', '4-5-1', '5-3-2', '5-4-1',
]

export const formations9 = [
  '3-3-2', '3-2-3', '2-4-2', '3-1-3-1', '2-3-2-1', '2-3-3',
]

export const formations7 = [
  '2-3-1', '3-2-1', '2-1-2-1', '1-2-1-2', '3-1-2',
]

export const formations5 = [
  '2-1-1', '1-2-1', '2-2', '1-1-2', '3-1',
]

export const formationsByFormat = {
  11: formations11,
  9: formations9,
  7: formations7,
  5: formations5,
}

export const defaultFormationByFormat = {
  11: '4-3-3',
  9: '3-3-2',
  7: '2-3-1',
  5: '2-1-1',
}

export const ageGroupFormatMap = {
  'U7': 5, 'U8': 5,
  'U9': 7, 'U10': 7,
  'U11': 9, 'U12': 9,
  'U13': 11, 'U14': 11, 'U15': 11, 'U16': 11, 'U17': 11, 'U18': 11,
  'Adult': 11,
}

// Default positions for 11-a-side formations
export const defaultPositions11 = {
  '4-3-3': [
    { id: 'GK', label: 'GK', x: 50, y: 92, pupilId: null },
    { id: 'LB', label: 'LB', x: 15, y: 72, pupilId: null },
    { id: 'CB1', label: 'CB', x: 35, y: 78, pupilId: null },
    { id: 'CB2', label: 'CB', x: 65, y: 78, pupilId: null },
    { id: 'RB', label: 'RB', x: 85, y: 72, pupilId: null },
    { id: 'CM1', label: 'CM', x: 30, y: 52, pupilId: null },
    { id: 'CM2', label: 'CM', x: 50, y: 46, pupilId: null },
    { id: 'CM3', label: 'CM', x: 70, y: 52, pupilId: null },
    { id: 'LW', label: 'LW', x: 20, y: 25, pupilId: null },
    { id: 'ST', label: 'ST', x: 50, y: 15, pupilId: null },
    { id: 'RW', label: 'RW', x: 80, y: 25, pupilId: null },
  ],
  '4-4-2': [
    { id: 'GK', label: 'GK', x: 50, y: 92, pupilId: null },
    { id: 'LB', label: 'LB', x: 15, y: 72, pupilId: null },
    { id: 'CB1', label: 'CB', x: 35, y: 78, pupilId: null },
    { id: 'CB2', label: 'CB', x: 65, y: 78, pupilId: null },
    { id: 'RB', label: 'RB', x: 85, y: 72, pupilId: null },
    { id: 'LM', label: 'LM', x: 15, y: 48, pupilId: null },
    { id: 'CM1', label: 'CM', x: 35, y: 52, pupilId: null },
    { id: 'CM2', label: 'CM', x: 65, y: 52, pupilId: null },
    { id: 'RM', label: 'RM', x: 85, y: 48, pupilId: null },
    { id: 'ST1', label: 'ST', x: 35, y: 18, pupilId: null },
    { id: 'ST2', label: 'ST', x: 65, y: 18, pupilId: null },
  ],
  '4-2-3-1': [
    { id: 'GK', label: 'GK', x: 50, y: 92, pupilId: null },
    { id: 'LB', label: 'LB', x: 15, y: 72, pupilId: null },
    { id: 'CB1', label: 'CB', x: 35, y: 78, pupilId: null },
    { id: 'CB2', label: 'CB', x: 65, y: 78, pupilId: null },
    { id: 'RB', label: 'RB', x: 85, y: 72, pupilId: null },
    { id: 'CDM1', label: 'CDM', x: 35, y: 58, pupilId: null },
    { id: 'CDM2', label: 'CDM', x: 65, y: 58, pupilId: null },
    { id: 'LAM', label: 'LAM', x: 20, y: 38, pupilId: null },
    { id: 'CAM', label: 'CAM', x: 50, y: 35, pupilId: null },
    { id: 'RAM', label: 'RAM', x: 80, y: 38, pupilId: null },
    { id: 'ST', label: 'ST', x: 50, y: 15, pupilId: null },
  ],
  '3-5-2': [
    { id: 'GK', label: 'GK', x: 50, y: 92, pupilId: null },
    { id: 'CB1', label: 'CB', x: 25, y: 78, pupilId: null },
    { id: 'CB2', label: 'CB', x: 50, y: 82, pupilId: null },
    { id: 'CB3', label: 'CB', x: 75, y: 78, pupilId: null },
    { id: 'LWB', label: 'LWB', x: 10, y: 52, pupilId: null },
    { id: 'CM1', label: 'CM', x: 30, y: 55, pupilId: null },
    { id: 'CM2', label: 'CM', x: 50, y: 50, pupilId: null },
    { id: 'CM3', label: 'CM', x: 70, y: 55, pupilId: null },
    { id: 'RWB', label: 'RWB', x: 90, y: 52, pupilId: null },
    { id: 'ST1', label: 'ST', x: 35, y: 18, pupilId: null },
    { id: 'ST2', label: 'ST', x: 65, y: 18, pupilId: null },
  ],
  '3-4-3': [
    { id: 'GK', label: 'GK', x: 50, y: 92, pupilId: null },
    { id: 'CB1', label: 'CB', x: 25, y: 78, pupilId: null },
    { id: 'CB2', label: 'CB', x: 50, y: 82, pupilId: null },
    { id: 'CB3', label: 'CB', x: 75, y: 78, pupilId: null },
    { id: 'LM', label: 'LM', x: 15, y: 52, pupilId: null },
    { id: 'CM1', label: 'CM', x: 35, y: 55, pupilId: null },
    { id: 'CM2', label: 'CM', x: 65, y: 55, pupilId: null },
    { id: 'RM', label: 'RM', x: 85, y: 52, pupilId: null },
    { id: 'LW', label: 'LW', x: 20, y: 22, pupilId: null },
    { id: 'ST', label: 'ST', x: 50, y: 15, pupilId: null },
    { id: 'RW', label: 'RW', x: 80, y: 22, pupilId: null },
  ],
  '4-1-4-1': [
    { id: 'GK', label: 'GK', x: 50, y: 92, pupilId: null },
    { id: 'LB', label: 'LB', x: 15, y: 72, pupilId: null },
    { id: 'CB1', label: 'CB', x: 35, y: 78, pupilId: null },
    { id: 'CB2', label: 'CB', x: 65, y: 78, pupilId: null },
    { id: 'RB', label: 'RB', x: 85, y: 72, pupilId: null },
    { id: 'CDM', label: 'CDM', x: 50, y: 60, pupilId: null },
    { id: 'LM', label: 'LM', x: 15, y: 42, pupilId: null },
    { id: 'CM1', label: 'CM', x: 35, y: 45, pupilId: null },
    { id: 'CM2', label: 'CM', x: 65, y: 45, pupilId: null },
    { id: 'RM', label: 'RM', x: 85, y: 42, pupilId: null },
    { id: 'ST', label: 'ST', x: 50, y: 15, pupilId: null },
  ],
  '4-5-1': [
    { id: 'GK', label: 'GK', x: 50, y: 92, pupilId: null },
    { id: 'LB', label: 'LB', x: 15, y: 72, pupilId: null },
    { id: 'CB1', label: 'CB', x: 35, y: 78, pupilId: null },
    { id: 'CB2', label: 'CB', x: 65, y: 78, pupilId: null },
    { id: 'RB', label: 'RB', x: 85, y: 72, pupilId: null },
    { id: 'LM', label: 'LM', x: 15, y: 48, pupilId: null },
    { id: 'CM1', label: 'CM', x: 30, y: 52, pupilId: null },
    { id: 'CM2', label: 'CM', x: 50, y: 48, pupilId: null },
    { id: 'CM3', label: 'CM', x: 70, y: 52, pupilId: null },
    { id: 'RM', label: 'RM', x: 85, y: 48, pupilId: null },
    { id: 'ST', label: 'ST', x: 50, y: 15, pupilId: null },
  ],
  '5-3-2': [
    { id: 'GK', label: 'GK', x: 50, y: 92, pupilId: null },
    { id: 'LWB', label: 'LWB', x: 10, y: 65, pupilId: null },
    { id: 'CB1', label: 'CB', x: 28, y: 78, pupilId: null },
    { id: 'CB2', label: 'CB', x: 50, y: 82, pupilId: null },
    { id: 'CB3', label: 'CB', x: 72, y: 78, pupilId: null },
    { id: 'RWB', label: 'RWB', x: 90, y: 65, pupilId: null },
    { id: 'CM1', label: 'CM', x: 30, y: 50, pupilId: null },
    { id: 'CM2', label: 'CM', x: 50, y: 45, pupilId: null },
    { id: 'CM3', label: 'CM', x: 70, y: 50, pupilId: null },
    { id: 'ST1', label: 'ST', x: 35, y: 18, pupilId: null },
    { id: 'ST2', label: 'ST', x: 65, y: 18, pupilId: null },
  ],
  '5-4-1': [
    { id: 'GK', label: 'GK', x: 50, y: 92, pupilId: null },
    { id: 'LWB', label: 'LWB', x: 10, y: 65, pupilId: null },
    { id: 'CB1', label: 'CB', x: 28, y: 78, pupilId: null },
    { id: 'CB2', label: 'CB', x: 50, y: 82, pupilId: null },
    { id: 'CB3', label: 'CB', x: 72, y: 78, pupilId: null },
    { id: 'RWB', label: 'RWB', x: 90, y: 65, pupilId: null },
    { id: 'LM', label: 'LM', x: 20, y: 45, pupilId: null },
    { id: 'CM1', label: 'CM', x: 40, y: 48, pupilId: null },
    { id: 'CM2', label: 'CM', x: 60, y: 48, pupilId: null },
    { id: 'RM', label: 'RM', x: 80, y: 45, pupilId: null },
    { id: 'ST', label: 'ST', x: 50, y: 15, pupilId: null },
  ],
}

// Default positions for 9-a-side formations
export const defaultPositions9 = {
  '3-3-2': [
    { id: 'GK', label: 'GK', x: 50, y: 92, pupilId: null },
    { id: 'LB', label: 'LB', x: 20, y: 72, pupilId: null },
    { id: 'CB', label: 'CB', x: 50, y: 78, pupilId: null },
    { id: 'RB', label: 'RB', x: 80, y: 72, pupilId: null },
    { id: 'LM', label: 'LM', x: 20, y: 48, pupilId: null },
    { id: 'CM', label: 'CM', x: 50, y: 45, pupilId: null },
    { id: 'RM', label: 'RM', x: 80, y: 48, pupilId: null },
    { id: 'ST1', label: 'ST', x: 35, y: 18, pupilId: null },
    { id: 'ST2', label: 'ST', x: 65, y: 18, pupilId: null },
  ],
  '3-2-3': [
    { id: 'GK', label: 'GK', x: 50, y: 92, pupilId: null },
    { id: 'LB', label: 'LB', x: 20, y: 72, pupilId: null },
    { id: 'CB', label: 'CB', x: 50, y: 78, pupilId: null },
    { id: 'RB', label: 'RB', x: 80, y: 72, pupilId: null },
    { id: 'CM1', label: 'CM', x: 35, y: 50, pupilId: null },
    { id: 'CM2', label: 'CM', x: 65, y: 50, pupilId: null },
    { id: 'LW', label: 'LW', x: 20, y: 22, pupilId: null },
    { id: 'ST', label: 'ST', x: 50, y: 15, pupilId: null },
    { id: 'RW', label: 'RW', x: 80, y: 22, pupilId: null },
  ],
  '2-4-2': [
    { id: 'GK', label: 'GK', x: 50, y: 92, pupilId: null },
    { id: 'CB1', label: 'CB', x: 35, y: 78, pupilId: null },
    { id: 'CB2', label: 'CB', x: 65, y: 78, pupilId: null },
    { id: 'LM', label: 'LM', x: 15, y: 48, pupilId: null },
    { id: 'CM1', label: 'CM', x: 38, y: 52, pupilId: null },
    { id: 'CM2', label: 'CM', x: 62, y: 52, pupilId: null },
    { id: 'RM', label: 'RM', x: 85, y: 48, pupilId: null },
    { id: 'ST1', label: 'ST', x: 35, y: 18, pupilId: null },
    { id: 'ST2', label: 'ST', x: 65, y: 18, pupilId: null },
  ],
  '3-1-3-1': [
    { id: 'GK', label: 'GK', x: 50, y: 92, pupilId: null },
    { id: 'LB', label: 'LB', x: 20, y: 72, pupilId: null },
    { id: 'CB', label: 'CB', x: 50, y: 78, pupilId: null },
    { id: 'RB', label: 'RB', x: 80, y: 72, pupilId: null },
    { id: 'CDM', label: 'CDM', x: 50, y: 58, pupilId: null },
    { id: 'LM', label: 'LM', x: 20, y: 38, pupilId: null },
    { id: 'CAM', label: 'CAM', x: 50, y: 35, pupilId: null },
    { id: 'RM', label: 'RM', x: 80, y: 38, pupilId: null },
    { id: 'ST', label: 'ST', x: 50, y: 15, pupilId: null },
  ],
  '2-3-2-1': [
    { id: 'GK', label: 'GK', x: 50, y: 92, pupilId: null },
    { id: 'CB1', label: 'CB', x: 35, y: 78, pupilId: null },
    { id: 'CB2', label: 'CB', x: 65, y: 78, pupilId: null },
    { id: 'LM', label: 'LM', x: 20, y: 52, pupilId: null },
    { id: 'CM', label: 'CM', x: 50, y: 55, pupilId: null },
    { id: 'RM', label: 'RM', x: 80, y: 52, pupilId: null },
    { id: 'LAM', label: 'AM', x: 35, y: 32, pupilId: null },
    { id: 'RAM', label: 'AM', x: 65, y: 32, pupilId: null },
    { id: 'ST', label: 'ST', x: 50, y: 15, pupilId: null },
  ],
  '2-3-3': [
    { id: 'GK', label: 'GK', x: 50, y: 92, pupilId: null },
    { id: 'CB1', label: 'CB', x: 35, y: 78, pupilId: null },
    { id: 'CB2', label: 'CB', x: 65, y: 78, pupilId: null },
    { id: 'LM', label: 'LM', x: 20, y: 50, pupilId: null },
    { id: 'CM', label: 'CM', x: 50, y: 48, pupilId: null },
    { id: 'RM', label: 'RM', x: 80, y: 50, pupilId: null },
    { id: 'LW', label: 'LW', x: 20, y: 22, pupilId: null },
    { id: 'ST', label: 'ST', x: 50, y: 15, pupilId: null },
    { id: 'RW', label: 'RW', x: 80, y: 22, pupilId: null },
  ],
}

// Default positions for 7-a-side formations
export const defaultPositions7 = {
  '2-3-1': [
    { id: 'GK', label: 'GK', x: 50, y: 92, pupilId: null },
    { id: 'LB', label: 'LB', x: 25, y: 72, pupilId: null },
    { id: 'RB', label: 'RB', x: 75, y: 72, pupilId: null },
    { id: 'LM', label: 'LM', x: 20, y: 45, pupilId: null },
    { id: 'CM', label: 'CM', x: 50, y: 48, pupilId: null },
    { id: 'RM', label: 'RM', x: 80, y: 45, pupilId: null },
    { id: 'ST', label: 'ST', x: 50, y: 18, pupilId: null },
  ],
  '3-2-1': [
    { id: 'GK', label: 'GK', x: 50, y: 92, pupilId: null },
    { id: 'LB', label: 'LB', x: 22, y: 72, pupilId: null },
    { id: 'CB', label: 'CB', x: 50, y: 75, pupilId: null },
    { id: 'RB', label: 'RB', x: 78, y: 72, pupilId: null },
    { id: 'CM1', label: 'CM', x: 35, y: 45, pupilId: null },
    { id: 'CM2', label: 'CM', x: 65, y: 45, pupilId: null },
    { id: 'ST', label: 'ST', x: 50, y: 18, pupilId: null },
  ],
  '2-1-2-1': [
    { id: 'GK', label: 'GK', x: 50, y: 92, pupilId: null },
    { id: 'LB', label: 'LB', x: 25, y: 72, pupilId: null },
    { id: 'RB', label: 'RB', x: 75, y: 72, pupilId: null },
    { id: 'CDM', label: 'CDM', x: 50, y: 55, pupilId: null },
    { id: 'LM', label: 'LM', x: 25, y: 35, pupilId: null },
    { id: 'RM', label: 'RM', x: 75, y: 35, pupilId: null },
    { id: 'ST', label: 'ST', x: 50, y: 18, pupilId: null },
  ],
  '1-2-1-2': [
    { id: 'GK', label: 'GK', x: 50, y: 92, pupilId: null },
    { id: 'CB', label: 'CB', x: 50, y: 75, pupilId: null },
    { id: 'LM', label: 'LM', x: 22, y: 52, pupilId: null },
    { id: 'RM', label: 'RM', x: 78, y: 52, pupilId: null },
    { id: 'CAM', label: 'CAM', x: 50, y: 35, pupilId: null },
    { id: 'ST1', label: 'ST', x: 35, y: 18, pupilId: null },
    { id: 'ST2', label: 'ST', x: 65, y: 18, pupilId: null },
  ],
  '3-1-2': [
    { id: 'GK', label: 'GK', x: 50, y: 92, pupilId: null },
    { id: 'LB', label: 'LB', x: 22, y: 72, pupilId: null },
    { id: 'CB', label: 'CB', x: 50, y: 75, pupilId: null },
    { id: 'RB', label: 'RB', x: 78, y: 72, pupilId: null },
    { id: 'CM', label: 'CM', x: 50, y: 45, pupilId: null },
    { id: 'ST1', label: 'ST', x: 35, y: 18, pupilId: null },
    { id: 'ST2', label: 'ST', x: 65, y: 18, pupilId: null },
  ],
}

// Default positions for 5-a-side formations
export const defaultPositions5 = {
  '2-1-1': [
    { id: 'GK', label: 'GK', x: 50, y: 90, pupilId: null },
    { id: 'LB', label: 'LB', x: 25, y: 65, pupilId: null },
    { id: 'RB', label: 'RB', x: 75, y: 65, pupilId: null },
    { id: 'CM', label: 'CM', x: 50, y: 42, pupilId: null },
    { id: 'ST', label: 'ST', x: 50, y: 18, pupilId: null },
  ],
  '1-2-1': [
    { id: 'GK', label: 'GK', x: 50, y: 90, pupilId: null },
    { id: 'CB', label: 'CB', x: 50, y: 68, pupilId: null },
    { id: 'LM', label: 'LM', x: 25, y: 42, pupilId: null },
    { id: 'RM', label: 'RM', x: 75, y: 42, pupilId: null },
    { id: 'ST', label: 'ST', x: 50, y: 18, pupilId: null },
  ],
  '2-2': [
    { id: 'GK', label: 'GK', x: 50, y: 90, pupilId: null },
    { id: 'LB', label: 'LB', x: 28, y: 65, pupilId: null },
    { id: 'RB', label: 'RB', x: 72, y: 65, pupilId: null },
    { id: 'ST1', label: 'ST', x: 28, y: 28, pupilId: null },
    { id: 'ST2', label: 'ST', x: 72, y: 28, pupilId: null },
  ],
  '1-1-2': [
    { id: 'GK', label: 'GK', x: 50, y: 90, pupilId: null },
    { id: 'CB', label: 'CB', x: 50, y: 68, pupilId: null },
    { id: 'CM', label: 'CM', x: 50, y: 45, pupilId: null },
    { id: 'ST1', label: 'ST', x: 30, y: 22, pupilId: null },
    { id: 'ST2', label: 'ST', x: 70, y: 22, pupilId: null },
  ],
  '3-1': [
    { id: 'GK', label: 'GK', x: 50, y: 90, pupilId: null },
    { id: 'LB', label: 'LB', x: 22, y: 62, pupilId: null },
    { id: 'CB', label: 'CB', x: 50, y: 68, pupilId: null },
    { id: 'RB', label: 'RB', x: 78, y: 62, pupilId: null },
    { id: 'ST', label: 'ST', x: 50, y: 22, pupilId: null },
  ],
}

export const defaultPositionsByFormat = {
  11: defaultPositions11,
  9: defaultPositions9,
  7: defaultPositions7,
  5: defaultPositions5,
}

// Set piece taker roles
export const setPieceRoles = [
  { key: 'corners_left', label: 'Corners (Left Side)', hasFoot: true },
  { key: 'corners_right', label: 'Corners (Right Side)', hasFoot: true },
  { key: 'free_kicks', label: 'Free Kicks' },
  { key: 'penalties', label: 'Penalties' },
  { key: 'throw_ins_long', label: 'Long Throw-ins' },
]

export const defaultSetPieceTakers = {
  corners_left: '', corners_right: '', free_kicks: '', penalties: '', throw_ins_long: '',
}

// Tactical zones for football (vertical channels + thirds)
export const tacticalZones = {
  channels: [
    { id: 'left-wing', x: 0, width: 18, color: 'blue', label: 'LW' },
    { id: 'left-halfspace', x: 18, width: 16, color: 'purple', label: 'LHS' },
    { id: 'central', x: 34, width: 32, color: 'green', label: 'C' },
    { id: 'right-halfspace', x: 66, width: 16, color: 'purple', label: 'RHS' },
    { id: 'right-wing', x: 82, width: 18, color: 'blue', label: 'RW' },
  ],
  thirds: [
    { id: 'attacking', y: 0, height: 33, label: 'Attacking Third' },
    { id: 'middle', y: 33, height: 34, label: 'Middle Third' },
    { id: 'defensive', y: 67, height: 33, label: 'Defensive Third' },
  ],
}

const football = {
  key: 'football',
  label: 'Football',
  pitchOrientation: 'portrait', // portrait = play up/down, landscape = play left/right
  hasGoalkeeper: true,
  formatSizes: [5, 7, 9, 11],
  formationsByFormat,
  defaultFormationByFormat,
  defaultPositionsByFormat,
  ageGroupFormatMap,
  setPieceRoles,
  defaultSetPieceTakers,
  tacticalZones,
  viewModes: ['formation', 'tactical', 'setpiece'],
  supportsPhases: true,
  defaultFormat: 11,
}

export default football
