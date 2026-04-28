const FRONT_ROW_SLOTS = ['1-lh-prop', '2-hooker', '3-th-prop']
const FRONT_ROW_ROLES = ['LH Prop', 'Hooker', 'TH Prop', 'Prop']
const FORWARD_ROLES = ['LH Prop', 'Hooker', 'TH Prop', 'Prop', 'Lock', 'Blindside', 'Openside', 'No.8', 'Flanker', 'Loose Forward', 'FORWARD']
const BACK_ROLES = ['SH', 'FH', 'IC', 'OC', 'LW', 'RW', 'FB', 'Centre', 'Wing', 'BACK']

export function checkFrontRowSafety(slotId, player) {
  if (!FRONT_ROW_SLOTS.includes(slotId)) return null
  if (!player?.preferred) return { severity: 'severe', message: `${player.name} is not a trained front-row player. Front-row positions carry specific safety requirements.` }
  const hasFrontRow = player.preferred.some(r => FRONT_ROW_ROLES.includes(r))
  if (hasFrontRow) return null
  return { severity: 'severe', message: `${player.name} is not a trained front-row player. Front-row positions carry specific safety requirements.` }
}

export function checkPositionClass(slotRole, player) {
  if (!player?.preferred?.length) return null
  const slotIsForward = FORWARD_ROLES.includes(slotRole)
  const slotIsBack = BACK_ROLES.includes(slotRole)
  const playerIsForward = player.preferred.some(r => FORWARD_ROLES.includes(r))
  const playerIsBack = player.preferred.some(r => BACK_ROLES.includes(r))
  if (slotIsForward && playerIsBack && !playerIsForward) {
    return { severity: 'soft', message: `${player.name} usually plays ${player.preferred[0]}. Place at ${slotRole}?` }
  }
  if (slotIsBack && playerIsForward && !playerIsBack) {
    return { severity: 'soft', message: `${player.name} usually plays ${player.preferred[0]}. Place at ${slotRole}?` }
  }
  return null
}

function RugbyPitchLines() {
  return (
    <svg viewBox="0 0 100 150" preserveAspectRatio="none" className="absolute inset-0 w-full h-full pointer-events-none">
      {/* Touch lines */}
      <rect x="2" y="2" width="96" height="146" fill="none" stroke="rgba(255,255,255,0.55)" strokeWidth="0.4" />
      {/* Try lines (thicker) */}
      <line x1="2" y1="6" x2="98" y2="6" stroke="rgba(255,255,255,0.7)" strokeWidth="0.6" />
      <line x1="2" y1="144" x2="98" y2="144" stroke="rgba(255,255,255,0.7)" strokeWidth="0.6" />
      {/* In-goal areas */}
      <rect x="2" y="2" width="96" height="4" fill="rgba(0,0,0,0.08)" />
      <rect x="2" y="144" width="96" height="4" fill="rgba(0,0,0,0.08)" />
      {/* Halfway */}
      <line x1="2" y1="75" x2="98" y2="75" stroke="rgba(255,255,255,0.55)" strokeWidth="0.4" />
      {/* 10m lines (dashed) */}
      <line x1="2" y1="60" x2="98" y2="60" stroke="rgba(255,255,255,0.35)" strokeWidth="0.3" strokeDasharray="2 2" />
      <line x1="2" y1="90" x2="98" y2="90" stroke="rgba(255,255,255,0.35)" strokeWidth="0.3" strokeDasharray="2 2" />
      {/* 22m lines */}
      <line x1="2" y1="27" x2="98" y2="27" stroke="rgba(255,255,255,0.50)" strokeWidth="0.4" />
      <line x1="2" y1="123" x2="98" y2="123" stroke="rgba(255,255,255,0.50)" strokeWidth="0.4" />
      {/* Goal posts (H shape) */}
      <line x1="46" y1="2" x2="46" y2="6" stroke="rgba(255,255,255,0.6)" strokeWidth="0.5" />
      <line x1="54" y1="2" x2="54" y2="6" stroke="rgba(255,255,255,0.6)" strokeWidth="0.5" />
      <line x1="46" y1="3" x2="54" y2="3" stroke="rgba(255,255,255,0.6)" strokeWidth="0.5" />
      <line x1="46" y1="144" x2="46" y2="148" stroke="rgba(255,255,255,0.6)" strokeWidth="0.5" />
      <line x1="54" y1="144" x2="54" y2="148" stroke="rgba(255,255,255,0.6)" strokeWidth="0.5" />
      <line x1="46" y1="147" x2="54" y2="147" stroke="rgba(255,255,255,0.6)" strokeWidth="0.5" />
    </svg>
  )
}

export const RUGBY_DEF = {
  id: 'rugby',
  label: 'Rugby',
  assignmentModel: 'starting-xi',

  validFormatsFor({ yearGroup, gender }) {
    return Object.keys(this.formats).filter(fid => {
      const r = this.formats[fid].ageGradeRule
      if (r.yearGroupMin && yearGroup < r.yearGroupMin) return false
      if (r.yearGroupMax && yearGroup > r.yearGroupMax) return false
      if (r.gender && r.gender !== 'any' && r.gender !== gender) return false
      return true
    })
  },

  formats: {
    'rugby-15s': {
      id: 'rugby-15s', label: '15-a-side (Union)', playerCount: 15, squadMin: 18, squadMax: 23,
      contact: true, goalkeeper: undefined,
      roleVocab: ['LH Prop', 'Hooker', 'TH Prop', 'Lock', 'Blindside', 'Openside', 'No.8', 'SH', 'FH', 'IC', 'OC', 'LW', 'RW', 'FB'],
      ageGradeRule: { yearGroupMin: 9, notes: 'RFU Regulation 15: 15-a-side requires Year 9 or above' },
      presets: {
        '15s': { label: '15s', slots: [
          { id: '1-lh-prop', role: 'LH Prop', x: 0.40, y: 0.78 },
          { id: '2-hooker', role: 'Hooker', x: 0.50, y: 0.80 },
          { id: '3-th-prop', role: 'TH Prop', x: 0.60, y: 0.78 },
          { id: '4-lock', role: 'Lock', x: 0.42, y: 0.70 },
          { id: '5-lock', role: 'Lock', x: 0.58, y: 0.70 },
          { id: '6-blindside', role: 'Blindside', x: 0.30, y: 0.66 },
          { id: '7-openside', role: 'Openside', x: 0.70, y: 0.66 },
          { id: '8-no8', role: 'No.8', x: 0.50, y: 0.62 },
          { id: '9-scrumhalf', role: 'SH', x: 0.50, y: 0.52 },
          { id: '10-flyhalf', role: 'FH', x: 0.42, y: 0.44 },
          { id: '11-leftwing', role: 'LW', x: 0.10, y: 0.32 },
          { id: '12-inside-c', role: 'IC', x: 0.40, y: 0.36 },
          { id: '13-outside-c', role: 'OC', x: 0.60, y: 0.36 },
          { id: '14-rightwing', role: 'RW', x: 0.90, y: 0.32 },
          { id: '15-fullback', role: 'FB', x: 0.50, y: 0.20 },
        ]},
      },
      defaultPresetId: '15s',
    },
    'rugby-13s': {
      id: 'rugby-13s', label: '13-a-side (League)', playerCount: 13, squadMin: 16, squadMax: 20,
      contact: true,
      roleVocab: ['Prop', 'Hooker', 'Lock', 'Loose Forward', 'SH', 'FH', 'Centre', 'Wing', 'FB'],
      ageGradeRule: { yearGroupMin: 8 },
      presets: {
        '13s': { label: '13s', slots: [
          { id: '1-lh-prop', role: 'Prop', x: 0.40, y: 0.78 },
          { id: '2-hooker', role: 'Hooker', x: 0.50, y: 0.80 },
          { id: '3-th-prop', role: 'Prop', x: 0.60, y: 0.78 },
          { id: '4-lock', role: 'Lock', x: 0.42, y: 0.70 },
          { id: '5-lock', role: 'Lock', x: 0.58, y: 0.70 },
          { id: '6-loose', role: 'Loose Forward', x: 0.30, y: 0.66 },
          { id: '7-loose', role: 'Loose Forward', x: 0.70, y: 0.66 },
          { id: '9-scrumhalf', role: 'SH', x: 0.50, y: 0.52 },
          { id: '10-flyhalf', role: 'FH', x: 0.42, y: 0.44 },
          { id: '11-leftwing', role: 'Wing', x: 0.12, y: 0.32 },
          { id: '12-centre', role: 'Centre', x: 0.50, y: 0.38 },
          { id: '14-rightwing', role: 'Wing', x: 0.88, y: 0.32 },
          { id: '15-fullback', role: 'FB', x: 0.50, y: 0.20 },
        ]},
      },
      defaultPresetId: '13s',
    },
    'rugby-7s': {
      id: 'rugby-7s', label: '7s', playerCount: 7, squadMin: 10, squadMax: 12,
      contact: true,
      roleVocab: ['Prop', 'Hooker', 'SH', 'FH', 'Centre', 'Wing'],
      ageGradeRule: { yearGroupMin: 9 },
      presets: {
        '7s': { label: '7s', slots: [
          { id: '1-prop', role: 'Prop', x: 0.40, y: 0.78 },
          { id: '2-hooker', role: 'Hooker', x: 0.50, y: 0.80 },
          { id: '3-prop', role: 'Prop', x: 0.60, y: 0.78 },
          { id: '9-scrumhalf', role: 'SH', x: 0.50, y: 0.56 },
          { id: '10-flyhalf', role: 'FH', x: 0.40, y: 0.42 },
          { id: '11-wing', role: 'Wing', x: 0.15, y: 0.30 },
          { id: '14-wing', role: 'Wing', x: 0.85, y: 0.30 },
        ]},
      },
      defaultPresetId: '7s',
    },
    'rugby-10s': {
      id: 'rugby-10s', label: '10-a-side', playerCount: 10, squadMin: 14, squadMax: 18,
      contact: true,
      roleVocab: ['Prop', 'Hooker', 'Lock', 'Flanker', 'SH', 'FH', 'Centre', 'Wing', 'FB'],
      ageGradeRule: { yearGroupMin: 7, yearGroupMax: 8, notes: 'RFU age-grade: 10s for Year 7-8' },
      presets: {
        '10s': { label: '10s', slots: [
          { id: '1-prop', role: 'Prop', x: 0.38, y: 0.78 },
          { id: '2-hooker', role: 'Hooker', x: 0.50, y: 0.80 },
          { id: '3-prop', role: 'Prop', x: 0.62, y: 0.78 },
          { id: '4-lock', role: 'Lock', x: 0.44, y: 0.70 },
          { id: '5-lock', role: 'Lock', x: 0.56, y: 0.70 },
          { id: '9-sh', role: 'SH', x: 0.50, y: 0.54 },
          { id: '10-fh', role: 'FH', x: 0.42, y: 0.44 },
          { id: '11-wing', role: 'Wing', x: 0.14, y: 0.32 },
          { id: '12-centre', role: 'Centre', x: 0.50, y: 0.36 },
          { id: '14-wing', role: 'Wing', x: 0.86, y: 0.32 },
        ]},
      },
      defaultPresetId: '10s',
    },
    'rugby-12s': {
      id: 'rugby-12s', label: '12-a-side', playerCount: 12, squadMin: 16, squadMax: 20,
      contact: true,
      roleVocab: ['Prop', 'Hooker', 'Lock', 'Flanker', 'SH', 'FH', 'Centre', 'Wing', 'FB'],
      ageGradeRule: { yearGroupMin: 8, yearGroupMax: 8, notes: 'RFU transitional format for Year 8 (U13)' },
      presets: {
        '12s': { label: '12s', slots: [
          { id: '1-prop', role: 'Prop', x: 0.38, y: 0.78 },
          { id: '2-hooker', role: 'Hooker', x: 0.50, y: 0.80 },
          { id: '3-prop', role: 'Prop', x: 0.62, y: 0.78 },
          { id: '4-lock', role: 'Lock', x: 0.42, y: 0.70 },
          { id: '5-lock', role: 'Lock', x: 0.58, y: 0.70 },
          { id: '6-flanker', role: 'Flanker', x: 0.30, y: 0.66 },
          { id: '7-flanker', role: 'Flanker', x: 0.70, y: 0.66 },
          { id: '9-sh', role: 'SH', x: 0.50, y: 0.52 },
          { id: '10-fh', role: 'FH', x: 0.42, y: 0.44 },
          { id: '11-wing', role: 'Wing', x: 0.12, y: 0.32 },
          { id: '12-centre', role: 'Centre', x: 0.50, y: 0.38 },
          { id: '14-wing', role: 'Wing', x: 0.88, y: 0.32 },
        ]},
      },
      defaultPresetId: '12s',
    },
    'rugby-tag-7s': {
      id: 'rugby-tag-7s', label: 'Tag Rugby', playerCount: 7, squadMin: 9, squadMax: 12,
      contact: false,
      roleVocab: ['BACK', 'FORWARD'],
      ageGradeRule: { yearGroupMin: 3, yearGroupMax: 7, gender: 'any', notes: 'Non-contact tag rugby for primary and Year 7' },
      presets: {
        'tag': { label: 'Tag 7s', slots: [
          { id: 'f1', role: 'FORWARD', x: 0.30, y: 0.76 },
          { id: 'f2', role: 'FORWARD', x: 0.50, y: 0.78 },
          { id: 'f3', role: 'FORWARD', x: 0.70, y: 0.76 },
          { id: 'b1', role: 'BACK', x: 0.50, y: 0.52 },
          { id: 'b2', role: 'BACK', x: 0.25, y: 0.34 },
          { id: 'b3', role: 'BACK', x: 0.50, y: 0.28 },
          { id: 'b4', role: 'BACK', x: 0.75, y: 0.34 },
        ]},
      },
      defaultPresetId: 'tag',
    },
    't1-5s': {
      id: 't1-5s', label: 'T1 Rugby 5s', playerCount: 5, squadMin: 7, squadMax: 10,
      contact: false,
      roleVocab: ['FORWARD', 'BACK'],
      ageGradeRule: { gender: 'any', notes: 'T1 non-contact rugby: any year group, mixed gender' },
      presets: {
        't1-5': { label: 'T1 5s', slots: [
          { id: 'f1', role: 'FORWARD', x: 0.35, y: 0.74 },
          { id: 'f2', role: 'FORWARD', x: 0.65, y: 0.74 },
          { id: 'b1', role: 'BACK', x: 0.30, y: 0.44 },
          { id: 'b2', role: 'BACK', x: 0.50, y: 0.38 },
          { id: 'b3', role: 'BACK', x: 0.70, y: 0.44 },
        ]},
      },
      defaultPresetId: 't1-5',
    },
    't1-7s': {
      id: 't1-7s', label: 'T1 Rugby 7s', playerCount: 7, squadMin: 9, squadMax: 12,
      contact: false,
      roleVocab: ['FORWARD', 'BACK'],
      ageGradeRule: { gender: 'any' },
      presets: {
        't1-7': { label: 'T1 7s', slots: [
          { id: 'f1', role: 'FORWARD', x: 0.30, y: 0.76 },
          { id: 'f2', role: 'FORWARD', x: 0.50, y: 0.78 },
          { id: 'f3', role: 'FORWARD', x: 0.70, y: 0.76 },
          { id: 'b1', role: 'BACK', x: 0.50, y: 0.52 },
          { id: 'b2', role: 'BACK', x: 0.25, y: 0.34 },
          { id: 'b3', role: 'BACK', x: 0.50, y: 0.28 },
          { id: 'b4', role: 'BACK', x: 0.75, y: 0.34 },
        ]},
      },
      defaultPresetId: 't1-7',
    },
    't1-10s': {
      id: 't1-10s', label: 'T1 Rugby 10s', playerCount: 10, squadMin: 12, squadMax: 16,
      contact: false,
      roleVocab: ['FORWARD', 'BACK'],
      ageGradeRule: { gender: 'any' },
      presets: {
        't1-10': { label: 'T1 10s', slots: [
          { id: 'f1', role: 'FORWARD', x: 0.30, y: 0.78 },
          { id: 'f2', role: 'FORWARD', x: 0.42, y: 0.76 },
          { id: 'f3', role: 'FORWARD', x: 0.58, y: 0.76 },
          { id: 'f4', role: 'FORWARD', x: 0.70, y: 0.78 },
          { id: 'f5', role: 'FORWARD', x: 0.50, y: 0.66 },
          { id: 'b1', role: 'BACK', x: 0.50, y: 0.50 },
          { id: 'b2', role: 'BACK', x: 0.30, y: 0.40 },
          { id: 'b3', role: 'BACK', x: 0.50, y: 0.34 },
          { id: 'b4', role: 'BACK', x: 0.70, y: 0.40 },
          { id: 'b5', role: 'BACK', x: 0.50, y: 0.22 },
        ]},
      },
      defaultPresetId: 't1-10',
    },
  },

  PitchLines: RugbyPitchLines,
  pitchGradient: 'linear-gradient(180deg, #1d5e34 0%, #266c3d 30%, #1e5a32 70%, #163e22 100%)',

  pickerNumberFirst: true,
}
