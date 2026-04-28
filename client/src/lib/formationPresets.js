export const FOOTBALL_PRESETS = {
  '11v11': {
    '4-3-3': {
      label: '4-3-3',
      slots: [
        { id: 'gk', role: 'GK', x: 0.50, y: 0.92 },
        { id: 'lb', role: 'LB', x: 0.16, y: 0.74 },
        { id: 'lcb', role: 'CB', x: 0.36, y: 0.78 },
        { id: 'rcb', role: 'CB', x: 0.64, y: 0.78 },
        { id: 'rb', role: 'RB', x: 0.84, y: 0.74 },
        { id: 'lcm', role: 'CM', x: 0.30, y: 0.55 },
        { id: 'cm', role: 'CM', x: 0.50, y: 0.50 },
        { id: 'rcm', role: 'CM', x: 0.70, y: 0.55 },
        { id: 'lw', role: 'LW', x: 0.18, y: 0.28 },
        { id: 'st', role: 'ST', x: 0.50, y: 0.18 },
        { id: 'rw', role: 'RW', x: 0.82, y: 0.28 },
      ],
    },
    '4-4-2': {
      label: '4-4-2',
      slots: [
        { id: 'gk', role: 'GK', x: 0.50, y: 0.92 },
        { id: 'lb', role: 'LB', x: 0.16, y: 0.74 },
        { id: 'lcb', role: 'CB', x: 0.36, y: 0.78 },
        { id: 'rcb', role: 'CB', x: 0.64, y: 0.78 },
        { id: 'rb', role: 'RB', x: 0.84, y: 0.74 },
        { id: 'lm', role: 'LM', x: 0.16, y: 0.50 },
        { id: 'lcm', role: 'CM', x: 0.38, y: 0.55 },
        { id: 'rcm', role: 'CM', x: 0.62, y: 0.55 },
        { id: 'rm', role: 'RM', x: 0.84, y: 0.50 },
        { id: 'lst', role: 'ST', x: 0.38, y: 0.22 },
        { id: 'rst', role: 'ST', x: 0.62, y: 0.22 },
      ],
    },
    '4-2-3-1': {
      label: '4-2-3-1',
      slots: [
        { id: 'gk', role: 'GK', x: 0.50, y: 0.92 },
        { id: 'lb', role: 'LB', x: 0.16, y: 0.74 },
        { id: 'lcb', role: 'CB', x: 0.36, y: 0.78 },
        { id: 'rcb', role: 'CB', x: 0.64, y: 0.78 },
        { id: 'rb', role: 'RB', x: 0.84, y: 0.74 },
        { id: 'ldm', role: 'DM', x: 0.38, y: 0.60 },
        { id: 'rdm', role: 'DM', x: 0.62, y: 0.60 },
        { id: 'lam', role: 'AM', x: 0.22, y: 0.38 },
        { id: 'cam', role: 'AM', x: 0.50, y: 0.36 },
        { id: 'ram', role: 'AM', x: 0.78, y: 0.38 },
        { id: 'st', role: 'ST', x: 0.50, y: 0.18 },
      ],
    },
    '3-5-2': {
      label: '3-5-2',
      slots: [
        { id: 'gk', role: 'GK', x: 0.50, y: 0.92 },
        { id: 'lcb', role: 'CB', x: 0.28, y: 0.78 },
        { id: 'ccb', role: 'CB', x: 0.50, y: 0.80 },
        { id: 'rcb', role: 'CB', x: 0.72, y: 0.78 },
        { id: 'lwb', role: 'WB', x: 0.12, y: 0.55 },
        { id: 'lcm', role: 'CM', x: 0.34, y: 0.58 },
        { id: 'cm', role: 'CM', x: 0.50, y: 0.52 },
        { id: 'rcm', role: 'CM', x: 0.66, y: 0.58 },
        { id: 'rwb', role: 'WB', x: 0.88, y: 0.55 },
        { id: 'lst', role: 'ST', x: 0.40, y: 0.22 },
        { id: 'rst', role: 'ST', x: 0.60, y: 0.22 },
      ],
    },
  },
  '9v9': {
    '3-2-3': {
      label: '3-2-3',
      slots: [
        { id: 'gk', role: 'GK', x: 0.50, y: 0.92 },
        { id: 'lb', role: 'DEF', x: 0.22, y: 0.72 },
        { id: 'cb', role: 'DEF', x: 0.50, y: 0.78 },
        { id: 'rb', role: 'DEF', x: 0.78, y: 0.72 },
        { id: 'ldm', role: 'MID', x: 0.36, y: 0.50 },
        { id: 'rdm', role: 'MID', x: 0.64, y: 0.50 },
        { id: 'lw', role: 'LW', x: 0.20, y: 0.24 },
        { id: 'st', role: 'ST', x: 0.50, y: 0.18 },
        { id: 'rw', role: 'RW', x: 0.80, y: 0.24 },
      ],
    },
    '3-3-2': {
      label: '3-3-2',
      slots: [
        { id: 'gk', role: 'GK', x: 0.50, y: 0.92 },
        { id: 'lb', role: 'DEF', x: 0.22, y: 0.72 },
        { id: 'cb', role: 'DEF', x: 0.50, y: 0.78 },
        { id: 'rb', role: 'DEF', x: 0.78, y: 0.72 },
        { id: 'lm', role: 'MID', x: 0.22, y: 0.50 },
        { id: 'cm', role: 'MID', x: 0.50, y: 0.46 },
        { id: 'rm', role: 'MID', x: 0.78, y: 0.50 },
        { id: 'lst', role: 'ST', x: 0.38, y: 0.20 },
        { id: 'rst', role: 'ST', x: 0.62, y: 0.20 },
      ],
    },
  },
  '7v7': {
    '3-2-1': {
      label: '3-2-1',
      slots: [
        { id: 'gk', role: 'GK', x: 0.50, y: 0.92 },
        { id: 'lb', role: 'DEF', x: 0.20, y: 0.72 },
        { id: 'cb', role: 'DEF', x: 0.50, y: 0.76 },
        { id: 'rb', role: 'DEF', x: 0.80, y: 0.72 },
        { id: 'lm', role: 'MID', x: 0.32, y: 0.46 },
        { id: 'rm', role: 'MID', x: 0.68, y: 0.46 },
        { id: 'st', role: 'ST', x: 0.50, y: 0.20 },
      ],
    },
    '2-3-1': {
      label: '2-3-1',
      slots: [
        { id: 'gk', role: 'GK', x: 0.50, y: 0.92 },
        { id: 'lb', role: 'DEF', x: 0.30, y: 0.74 },
        { id: 'rb', role: 'DEF', x: 0.70, y: 0.74 },
        { id: 'lm', role: 'MID', x: 0.20, y: 0.48 },
        { id: 'cm', role: 'MID', x: 0.50, y: 0.50 },
        { id: 'rm', role: 'MID', x: 0.80, y: 0.48 },
        { id: 'st', role: 'ST', x: 0.50, y: 0.20 },
      ],
    },
    '3-1-2': {
      label: '3-1-2',
      slots: [
        { id: 'gk', role: 'GK', x: 0.50, y: 0.92 },
        { id: 'lb', role: 'DEF', x: 0.20, y: 0.74 },
        { id: 'cb', role: 'DEF', x: 0.50, y: 0.78 },
        { id: 'rb', role: 'DEF', x: 0.80, y: 0.74 },
        { id: 'cm', role: 'MID', x: 0.50, y: 0.48 },
        { id: 'lst', role: 'ST', x: 0.34, y: 0.22 },
        { id: 'rst', role: 'ST', x: 0.66, y: 0.22 },
      ],
    },
  },
  '5v5': {
    '1-2-1': {
      label: '1-2-1',
      slots: [
        { id: 'gk', role: 'GK', x: 0.50, y: 0.92 },
        { id: 'cb', role: 'DEF', x: 0.50, y: 0.72 },
        { id: 'lm', role: 'MID', x: 0.28, y: 0.46 },
        { id: 'rm', role: 'MID', x: 0.72, y: 0.46 },
        { id: 'st', role: 'ST', x: 0.50, y: 0.20 },
      ],
    },
    '2-1-1': {
      label: '2-1-1',
      slots: [
        { id: 'gk', role: 'GK', x: 0.50, y: 0.92 },
        { id: 'lb', role: 'DEF', x: 0.30, y: 0.72 },
        { id: 'rb', role: 'DEF', x: 0.70, y: 0.72 },
        { id: 'cm', role: 'MID', x: 0.50, y: 0.46 },
        { id: 'st', role: 'ST', x: 0.50, y: 0.20 },
      ],
    },
    'Diamond': {
      label: 'Diamond',
      slots: [
        { id: 'gk', role: 'GK', x: 0.50, y: 0.92 },
        { id: 'cb', role: 'DEF', x: 0.50, y: 0.70 },
        { id: 'lm', role: 'MID', x: 0.25, y: 0.46 },
        { id: 'rm', role: 'MID', x: 0.75, y: 0.46 },
        { id: 'st', role: 'ST', x: 0.50, y: 0.20 },
      ],
    },
  },
}

export const FORMAT_SIZES = {
  '5v5': 5,
  '7v7': 7,
  '9v9': 9,
  '11v11': 11,
}

export const DEFAULT_PRESETS = {
  '5v5': '1-2-1',
  '7v7': '3-2-1',
  '9v9': '3-2-3',
  '11v11': '4-3-3',
}

export function getPreset(format, presetId) {
  return FOOTBALL_PRESETS[format]?.[presetId] || null
}

export function getPresetsForFormat(format) {
  return Object.entries(FOOTBALL_PRESETS[format] || {}).map(([id, p]) => ({ id, label: p.label }))
}

export function transferAssignment(oldPreset, newPreset, oldAssignment) {
  const newSlotIds = new Set(newPreset.slots.map(s => s.id))
  const kept = {}
  let keptCount = 0
  for (const [slotId, playerId] of Object.entries(oldAssignment)) {
    if (playerId && newSlotIds.has(slotId)) {
      kept[slotId] = playerId
      keptCount++
    }
  }
  return { assignment: kept, keptCount, totalSlots: newPreset.slots.length }
}

export function validateFormation(preset, assignment, squad, formatDef) {
  const issues = []
  const filledCount = Object.values(assignment).filter(Boolean).length
  const totalSlots = preset.slots.length

  if (filledCount < totalSlots) {
    const empty = preset.slots.filter(s => !assignment[s.id]).map(s => s.role)
    issues.push({ severity: 'error', message: `${totalSlots - filledCount} slots empty (${empty.join(', ')})`, slots: preset.slots.filter(s => !assignment[s.id]).map(s => s.id) })
  }

  const gkRule = formatDef?.goalkeeper
  if (gkRule === 'forbidden') {
    const gkSlot = preset.slots.find(s => s.role === 'GK')
    if (gkSlot && assignment[gkSlot.id]) {
      issues.push({ severity: 'error', message: 'This format does not use a goalkeeper', slots: [gkSlot.id] })
    }
  } else {
    const gkSlot = preset.slots.find(s => s.role === 'GK')
    if (gkSlot && !assignment[gkSlot.id]) {
      issues.push({ severity: 'error', message: 'No goalkeeper placed', slots: [gkSlot.id] })
    }
  }

  const squadMap = new Map(squad.map(p => [p.id, p]))
  for (const slot of preset.slots) {
    const pid = assignment[slot.id]
    if (!pid) continue
    const player = squadMap.get(pid)
    if (player?.status === 'queried') {
      issues.push({ severity: 'warning', message: `${player.name || player.last} has medical clearance pending`, slots: [slot.id] })
    }
    if (player?.preferred && !player.preferred.includes(slot.role)) {
      issues.push({ severity: 'info', message: `${player.name || player.last} out of preferred role (${slot.role})`, slots: [slot.id] })
    }
  }

  const benchCount = squad.length - filledCount
  if (benchCount < 3) {
    issues.push({ severity: 'warning', message: `Bench has only ${benchCount} player${benchCount !== 1 ? 's' : ''}` })
  }

  return issues
}

export function getReadinessState(issues) {
  const hasError = issues.some(i => i.severity === 'error')
  const hasFilled = true
  if (hasError) return 'attention'
  return 'ready'
}
