import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Target, Save, RotateCcw, Users, Loader2, X, UserMinus, ArrowRightLeft, Plus, Trash2, Clock, BookmarkPlus, Bookmark, Shield, Swords, Zap, Circle, ChevronUp, ChevronDown, Move, Eye, EyeOff, Grid3x3, Layers, Printer } from 'lucide-react'
import PlayingTimeCalculator from '../components/PlayingTimeCalculator'
import TacticsPrintView from '../components/TacticsPrintView'
import { useTeam } from '../context/TeamContext'
import toast from 'react-hot-toast'
import { useBeforeUnload } from 'react-router-dom'
import { getSportConfig } from '../config/sports/index'
import { PITCH_BACKGROUNDS, PITCH_ASPECT_RATIOS } from '../components/tactics/pitches/PitchRenderer'
import FootballPitch from '../components/tactics/pitches/FootballPitch'
import RugbyPitch from '../components/tactics/pitches/RugbyPitch'
import HockeyPitch from '../components/tactics/pitches/HockeyPitch'
import NetballCourt from '../components/tactics/pitches/NetballCourt'
import CricketField from '../components/tactics/pitches/CricketField'

const PITCH_COMPONENTS = {
  football: FootballPitch,
  rugby: RugbyPitch,
  hockey: HockeyPitch,
  netball: NetballCourt,
  cricket: CricketField,
}

// Tactical phases
const PHASES = {
  IN_POSSESSION: 'inPossession',
  OUT_OF_POSSESSION: 'outOfPossession',
  TRANSITION: 'transition'
}

// Default tactical settings
const defaultTacticalSettings = {
  defensiveLine: 50, // 0-100, lower = deeper
  compactness: 50, // 0-100, higher = tighter between lines
  attackingWidth: 70, // 0-100, how wide in attack
  defensiveWidth: 50, // 0-100, how narrow in defense
  pressingIntensity: 50, // 0-100
  pressingTriggerZone: 'high', // 'high', 'mid', 'low'
  showMovements: false,
  showPressingZones: false,
  showZones: false, // Show half-spaces and channels
  showThirds: false, // Show attacking/middle/defensive thirds
}

// Tactical zone definitions for pro-level positioning
// Pitch divided into 5 vertical channels: left wing, left half-space, central, right half-space, right wing
// Half-spaces (between wide channel and central) are key areas for creating overloads
const TACTICAL_ZONES = {
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

const phaseOffsets = {
  '4-3-3': {
    inPossession: {
      // ATTACKING 4-3-3 SHAPE (becomes 2-3-5 with fullbacks high)
      'GK': { x: 0, y: -8 },      // GK sweeper position
      'LB': { x: -3, y: -32 },    // LB overlaps very high and wide (72-32=40, 15-3=12)
      'CB1': { x: 5, y: -10 },    // CBs split wide and push up (78-10=68, 35+5=40)
      'CB2': { x: -5, y: -10 },   // (78-10=68, 65-5=60)
      'RB': { x: 3, y: -32 },     // RB overlaps very high and wide (72-32=40, 85+3=88)
      'CM1': { x: -5, y: -12 },   // CM drops as pivot (52-12=40, 30-5=25)
      'CM2': { x: 0, y: -16 },    // CAM pushes high (46-16=30)
      'CM3': { x: 5, y: -12 },    // CM holds position (52-12=40, 70+5=75)
      'LW': { x: 10, y: -8 },     // LW cuts inside (25-8=17, 20+10=30)
      'ST': { x: 0, y: -7 },      // ST stretches line (15-7=8)
      'RW': { x: -10, y: -8 },    // RW cuts inside (25-8=17, 80-10=70)
    },
    outOfPossession: {
      // COMPACT 4-3-3 DEFENSIVE BLOCK
      // Back 4 in a flat line at y ~85
      'GK': { x: 0, y: 0 },
      'LB': { x: 7, y: 13 },      // LB drops into line and tucks in (72+13=85, 15+7=22)
      'CB1': { x: 0, y: 7 },      // CB1 drops to line (78+7=85)
      'CB2': { x: 0, y: 7 },      // CB2 drops to line (78+7=85)
      'RB': { x: -7, y: 13 },     // RB drops into line and tucks in (72+13=85, 85-7=78)
      // Midfield 3 in compact line at y ~62
      'CM1': { x: 5, y: 10 },     // CM1 drops and tucks in (52+10=62, 30+5=35)
      'CM2': { x: 0, y: 16 },     // CM2 drops to line (46+16=62)
      'CM3': { x: -5, y: 10 },    // CM3 drops and tucks in (52+10=62, 70-5=65)
      // Front 3 tracking back to press at y ~42
      'LW': { x: 5, y: 17 },      // LW tracks back and tucks in (25+17=42, 20+5=25)
      'ST': { x: 0, y: 27 },      // ST drops to press (15+27=42)
      'RW': { x: -5, y: 17 },     // RW tracks back and tucks in (25+17=42, 80-5=75)
    },
    transition: {
      // COUNTER-ATTACK SHAPE - defense stays, attackers sprint
      'GK': { x: 0, y: -3 },      // GK ready to distribute
      'LB': { x: -5, y: -8 },     // LB pushes but stays balanced
      'CB1': { x: 3, y: 0 },      // CBs hold position, slightly split
      'CB2': { x: -3, y: 0 },
      'RB': { x: 5, y: -8 },      // RB pushes but stays balanced
      'CM1': { x: -8, y: -8 },    // CM1 drives forward left
      'CM2': { x: 0, y: -10 },    // CM2 carries ball centrally
      'CM3': { x: 8, y: -8 },     // CM3 drives forward right
      'LW': { x: -15, y: -12 },   // LW sprints wide for outlet (20-15=5)
      'ST': { x: 0, y: -10 },     // ST runs in behind
      'RW': { x: 15, y: -12 },    // RW sprints wide for outlet (80+15=95)
    }
  },
  '4-4-2': {
    inPossession: {
      // ATTACKING 4-4-2 - wide midfield, fullbacks overlap
      'GK': { x: 0, y: -8 },
      'LB': { x: -5, y: -28 },    // LB overlaps high
      'CB1': { x: 5, y: -8 },     // CBs split and push
      'CB2': { x: -5, y: -8 },
      'RB': { x: 5, y: -28 },     // RB overlaps high
      'LM': { x: -5, y: -15 },    // LM stays wide and high
      'CM1': { x: 5, y: -10 },    // CM box-to-box
      'CM2': { x: -5, y: -10 },   // CM box-to-box
      'RM': { x: 5, y: -15 },     // RM stays wide and high
      'ST1': { x: -8, y: -5 },    // Strike partnership
      'ST2': { x: 8, y: -5 },
    },
    outOfPossession: {
      // COMPACT 4-4-2 FLAT BLOCK
      'GK': { x: 0, y: 0 },
      // Back 4 flat line at y ~84
      'LB': { x: 8, y: 12 },      // LB tucks in (72+12=84, 15+8=23)
      'CB1': { x: 3, y: 6 },      // CB1 at 84 (78+6=84, 35+3=38)
      'CB2': { x: -3, y: 6 },     // CB2 at 84 (78+6=84, 65-3=62)
      'RB': { x: -8, y: 12 },     // RB tucks in (72+12=84, 85-8=77)
      // Midfield 4 flat line at y ~60
      'LM': { x: 8, y: 12 },      // LM tucks in (48+12=60, 15+8=23)
      'CM1': { x: 5, y: 8 },      // CM1 at 60 (52+8=60, 35+5=40)
      'CM2': { x: -5, y: 8 },     // CM2 at 60 (52+8=60, 65-5=60)
      'RM': { x: -8, y: 12 },     // RM tucks in (48+12=60, 85-8=77)
      // Front 2 pressing line at y ~38
      'ST1': { x: 8, y: 20 },     // ST1 drops and covers (18+20=38, 35+8=43)
      'ST2': { x: -8, y: 20 },    // ST2 drops and covers (18+20=38, 65-8=57)
    },
    transition: {
      // COUNTER - hold shape, strikers go
      'GK': { x: 0, y: -3 },
      'LB': { x: -5, y: -5 },
      'CB1': { x: 3, y: 0 },
      'CB2': { x: -3, y: 0 },
      'RB': { x: 5, y: -5 },
      'LM': { x: -10, y: -12 },   // LM sprints wide
      'CM1': { x: 0, y: -8 },
      'CM2': { x: 0, y: -8 },
      'RM': { x: 10, y: -12 },    // RM sprints wide
      'ST1': { x: -5, y: -10 },   // Strikers run channels
      'ST2': { x: 5, y: -10 },
    }
  }
}

// Generate default offsets for formations not explicitly defined
// actualPositions: pass the real positions array for custom formations
function getPhaseOffsets(formation, actualPositions) {
  if (phaseOffsets[formation]) {
    return phaseOffsets[formation]
  }
  // Generate generic offsets based on position type
  // Goal: Create compact defensive lines and realistic attacking shapes
  // Use actualPositions for custom formations instead of falling back to 4-3-3
  const basePositions = actualPositions || []
  const offsets = { inPossession: {}, outOfPossession: {}, transition: {} }

  basePositions.forEach(pos => {
    const posType = pos.label
    const isLeft = pos.x < 50
    const distFromCenter = Math.abs(pos.x - 50)

    if (posType === 'GK') {
      offsets.inPossession[pos.id] = { x: 0, y: -8 }
      offsets.outOfPossession[pos.id] = { x: 0, y: 0 }
      offsets.transition[pos.id] = { x: 0, y: -3 }
    } else if (posType === 'CB') {
      // CBs: Push up in possession, drop to flat line in defense
      offsets.inPossession[pos.id] = { x: isLeft ? 5 : -5, y: -10 }
      offsets.outOfPossession[pos.id] = { x: isLeft ? 3 : -3, y: 7 }
      offsets.transition[pos.id] = { x: isLeft ? 3 : -3, y: 0 }
    } else if (['LB', 'RB', 'LWB', 'RWB'].includes(posType)) {
      // Fullbacks: Overlap high in possession, tuck in for flat back line in defense
      offsets.inPossession[pos.id] = { x: isLeft ? -3 : 3, y: -30 }
      offsets.outOfPossession[pos.id] = { x: isLeft ? 7 : -7, y: 13 }
      offsets.transition[pos.id] = { x: isLeft ? -5 : 5, y: -8 }
    } else if (['CDM', 'CDM1', 'CDM2'].includes(posType) || pos.id.includes('CDM')) {
      // CDMs: Sit in possession, form shield in defense
      offsets.inPossession[pos.id] = { x: 0, y: -5 }
      offsets.outOfPossession[pos.id] = { x: isLeft ? 5 : pos.x > 50 ? -5 : 0, y: 10 }
      offsets.transition[pos.id] = { x: 0, y: -5 }
    } else if (['CM', 'CM1', 'CM2', 'CM3'].includes(posType) || pos.id.includes('CM')) {
      // CMs: Push up in possession, form compact line in defense
      offsets.inPossession[pos.id] = { x: 0, y: -12 }
      offsets.outOfPossession[pos.id] = { x: isLeft ? 5 : pos.x > 50 ? -5 : 0, y: 10 }
      offsets.transition[pos.id] = { x: isLeft ? -5 : 5, y: -8 }
    } else if (['CAM', 'LAM', 'RAM'].includes(posType)) {
      // Attacking mids: Push very high in possession, track back in defense
      offsets.inPossession[pos.id] = { x: 0, y: -15 }
      offsets.outOfPossession[pos.id] = { x: isLeft ? 8 : pos.x > 50 ? -8 : 0, y: 15 }
      offsets.transition[pos.id] = { x: 0, y: -10 }
    } else if (['LM', 'RM'].includes(posType)) {
      // Wide mids: Width in possession, tuck in for defense
      offsets.inPossession[pos.id] = { x: isLeft ? -5 : 5, y: -12 }
      offsets.outOfPossession[pos.id] = { x: isLeft ? 8 : -8, y: 12 }
      offsets.transition[pos.id] = { x: isLeft ? -10 : 10, y: -10 }
    } else if (['LW', 'RW'].includes(posType)) {
      // Wingers: Cut inside in possession, track back into midfield line in defense
      offsets.inPossession[pos.id] = { x: isLeft ? 10 : -10, y: -8 }
      offsets.outOfPossession[pos.id] = { x: isLeft ? 5 : -5, y: 17 }
      offsets.transition[pos.id] = { x: isLeft ? -15 : 15, y: -12 }
    } else if (['ST', 'CF'].includes(posType) || posType.includes('ST') || pos.id.includes('ST')) {
      // Strikers: Stretch line in possession, drop to press in defense
      const offsetX = pos.x < 40 ? 5 : pos.x > 60 ? -5 : 0
      offsets.inPossession[pos.id] = { x: offsetX, y: -7 }
      offsets.outOfPossession[pos.id] = { x: offsetX * 1.5, y: 25 }
      offsets.transition[pos.id] = { x: offsetX, y: -10 }
    } else {
      offsets.inPossession[pos.id] = { x: 0, y: -8 }
      offsets.outOfPossession[pos.id] = { x: 0, y: 10 }
      offsets.transition[pos.id] = { x: 0, y: -5 }
    }
  })

  return offsets
}

// Generate movement arrows for any formation based on position types
function generatePhaseMovements(positionsArray) {
  if (!positionsArray || positionsArray.length === 0) return {}

  const movements = {
    inPossession: [],
    outOfPossession: [],
    transition: []
  }

  positionsArray.forEach(pos => {
    const label = pos.label
    const isLeft = pos.x < 40
    const isRight = pos.x > 60

    // Full-backs / wing-backs
    if (['LB', 'RB', 'LWB', 'RWB'].includes(label)) {
      movements.inPossession.push({ from: pos.id, direction: 'forward-diagonal', label: 'Overlap' })
      movements.transition.push({ from: pos.id, direction: 'forward-diagonal', label: 'Push up' })
    }

    // Wingers
    if (['LW', 'RW'].includes(label)) {
      movements.inPossession.push({ from: pos.id, direction: 'inside', label: 'Cut inside' })
      movements.outOfPossession.push({ from: pos.id, direction: 'back', label: 'Track back' })
      movements.transition.push({ from: pos.id, direction: 'forward-wide', label: 'Sprint wide' })
    }

    // Wide midfielders
    if (['LM', 'RM'].includes(label)) {
      movements.inPossession.push({ from: pos.id, direction: 'forward-wide', label: 'Get wide' })
      movements.outOfPossession.push({ from: pos.id, direction: 'back', label: 'Drop in' })
      movements.transition.push({ from: pos.id, direction: 'forward-wide', label: 'Sprint wide' })
    }

    // Attacking central midfielders (highest CM or CAM)
    if (['CAM', 'AM', 'LAM', 'RAM'].includes(label)) {
      movements.inPossession.push({ from: pos.id, direction: 'forward', label: 'Support attack' })
      movements.outOfPossession.push({ from: pos.id, direction: 'back', label: 'Track back' })
    }

    // Box-to-box CMs (push forward in possession)
    if (label === 'CM' && pos.y < 55) {
      movements.inPossession.push({ from: pos.id, direction: 'forward', label: 'Drive forward' })
    }

    // CDMs screen in defense
    if (label === 'CDM') {
      movements.outOfPossession.push({ from: pos.id, direction: 'back', label: 'Screen' })
    }

    // Strikers
    if (label === 'ST' || label === 'CF' || (pos.id.includes('ST') && label !== 'GK')) {
      movements.transition.push({ from: pos.id, direction: 'forward', label: 'Run in behind' })
      movements.outOfPossession.push({
        from: pos.id,
        direction: isLeft ? 'back-left' : isRight ? 'back-right' : 'back',
        label: 'Press angle'
      })
    }
  })

  return movements
}

const gameModelOptions = {
  style: ['Possession-based', 'Counter-attacking', 'Direct play', 'High pressing', 'Balanced'],
  buildUp: ['Short passing', 'Long balls', 'Play out from back', 'Mixed approach'],
  pressing: ['High press', 'Mid-block', 'Low block', 'Pressing triggers'],
  inPossession: ['Width and depth', 'Central overloads', 'Wing play', 'Fluid movement'],
  outOfPossession: ['Compact shape', 'Man marking', 'Zonal marking', 'Hybrid system'],
}

function formatPlayerName(name) {
  if (!name) return ''
  const parts = name.trim().split(' ')
  if (parts.length === 1) return parts[0]
  const firstName = parts[0]
  const lastInitial = parts[parts.length - 1].charAt(0).toUpperCase()
  return `${firstName} ${lastInitial}.`
}

// Validate that a position object has all required properties
function isValidPosition(pos) {
  return pos &&
    typeof pos.id === 'string' &&
    typeof pos.x === 'number' &&
    typeof pos.y === 'number' &&
    pos.x >= 0 && pos.x <= 100 &&
    pos.y >= 0 && pos.y <= 100
}

// Validate and sanitize positions array
// Returns valid positions merged with defaults for the formation
function validatePositions(savedPositions, formationName, teamFormat = 11, sportConfig = null) {
  const cfg = sportConfig || getSportConfig('football')
  const positionsMap = cfg.defaultPositionsByFormat?.[teamFormat] || {}
  const fallbackFormation = cfg.defaultFormationByFormat?.[teamFormat] || Object.keys(positionsMap)[0] || '4-3-3'

  // Helper to safely get coordinate with fallback to default
  const safeCoord = (value, fallback) => {
    if (typeof value === 'number' && !isNaN(value) && value >= 0 && value <= 100) {
      return value
    }
    return fallback
  }

  const isStandardFormation = !!positionsMap[formationName]

  // For custom formations (not in standard positions map), use saved positions directly
  // Do NOT fall back to 4-3-3 template - custom formations define their own structure
  if (!isStandardFormation) {
    if (savedPositions && Array.isArray(savedPositions) && savedPositions.length > 0) {
      const valid = savedPositions.filter(pos => isValidPosition(pos))
      if (valid.length > 0) {
        return valid.map(pos => ({
          ...pos,
          x: safeCoord(pos.x, 50),
          y: safeCoord(pos.y, 50),
          pupilId: pos.pupilId ?? null,
        }))
      }
    }
    // If no valid saved positions, fall back to default formation for this sport+format.
    // Guard against positionsMap being empty (e.g. sport config missing that format).
    const fallbackPositions = positionsMap[fallbackFormation] || Object.values(positionsMap)[0] || []
    return fallbackPositions.map(p => ({ ...p }))
  }

  // Standard formation validation
  const defaults = positionsMap[formationName] || []

  // If no saved positions or not an array, return defaults
  if (!savedPositions || !Array.isArray(savedPositions) || savedPositions.length === 0) {
    return defaults.map(p => ({ ...p }))
  }

  // Create a map of saved positions by ID for quick lookup
  const savedMap = new Map()
  savedPositions.forEach(pos => {
    if (isValidPosition(pos)) {
      savedMap.set(pos.id, pos)
    }
  })

  // If we have valid saved positions that match the expected count, use them
  if (savedMap.size === defaults.length) {
    // All positions are accounted for - check if all IDs match
    const allIdsMatch = defaults.every(d => savedMap.has(d.id))
    if (allIdsMatch) {
      // Use saved positions with their x, y, pupilId, and label values
      return defaults.map(d => {
        const saved = savedMap.get(d.id)
        return {
          ...d,
          // Preserve custom labels if saved (e.g. user renamed LW to AM)
          label: saved.label || d.label,
          // Use saved coordinates with fallback to defaults for extra safety
          x: safeCoord(saved.x, d.x),
          y: safeCoord(saved.y, d.y),
          pupilId: saved.pupilId ?? null,
        }
      })
    }
  }

  // Positions don't match formation structure - merge what we can
  // This handles formation changes where some position IDs are the same
  return defaults.map(d => {
    const saved = savedMap.get(d.id)
    if (saved) {
      return {
        ...d,
        label: saved.label || d.label,
        x: safeCoord(saved.x, d.x),
        y: safeCoord(saved.y, d.y),
        pupilId: saved.pupilId ?? null,
      }
    }
    return { ...d }
  })
}

export default function Tactics({ teamOverride, pupilsOverride, updateTeamOverride } = {}) {
  const ctx = useTeam()
  // Allow caller to inject team data directly (team-aware routing) or fall back to TeamContext
  const team = teamOverride ?? ctx.team
  const pupils = pupilsOverride ?? ctx.pupils
  const updateTeam = updateTeamOverride ?? ctx.updateTeam

  // Derive sport config from team's sport (defaults to football)
  const sportConfig = getSportConfig(team?.sport || 'football')
  const sportKey = team?.sport || 'football'
  const supportsPhases = sportConfig.supportsPhases ?? true
  const PitchMarkings = PITCH_COMPONENTS[sportKey] || FootballPitch
  const pitchBg = PITCH_BACKGROUNDS[sportKey] || PITCH_BACKGROUNDS.football
  const pitchAspect = PITCH_ASPECT_RATIOS[sportKey] || '3/4'

  // Determine available formations based on sport config and team format
  const teamFormat = team?.team_format || sportConfig.defaultFormat
  const formatSizes = sportConfig.formatSizes || [teamFormat]
  const [viewFormat, setViewFormat] = useState(teamFormat)
  // viewFormat follows the team's actual format; only override if team format changes
  const activeFormat = viewFormat || teamFormat
  const availableFormations = sportConfig.formationsByFormat[activeFormat] || []
  const defaultFormationPositions = sportConfig.defaultPositionsByFormat[activeFormat] || {}
  const defaultFormation = sportConfig.defaultFormationByFormat[activeFormat] || availableFormations[0] || '4-3-3'

  // Normalise formation: if the stored formation isn't valid for this sport+format
  // (e.g. legacy seed stored '2-3-2' for netball where only 'standard' is valid),
  // fall back to the default so the picker and downstream lookups don't break.
  const savedCustomFormations = team?.custom_formations || []
  const isValidFormation = (name) => (
    !!defaultFormationPositions[name]
    || availableFormations.includes(name)
    || savedCustomFormations.some(cf => cf.name === name)
  )
  const initialFormation = isValidFormation(team?.formation) ? team.formation : defaultFormation

  const [formation, setFormation] = useState(initialFormation)
  const [positions, setPositions] = useState(() => {
    return validatePositions(team?.positions, initialFormation, activeFormat, sportConfig)
  })
  const [saving, setSaving] = useState(false)
  const [selectedPosition, setSelectedPosition] = useState(null)
  const [swapMode, setSwapMode] = useState(false) // For click-to-swap feature
  const [draggingPositionId, setDraggingPositionId] = useState(null) // Track which position is being dragged
  const justFinishedDragRef = useRef(false) // Prevent click after drag
  const pitchRef = useRef(null)
  // Pointer Events drag state ref (avoids re-renders during drag)
  const dragRef = useRef({
    active: false,
    pointerId: null,
    targetId: null,       // position id or 'ball'
    startX: 0, startY: 0,
    origPctX: 0, origPctY: 0,
    el: null,             // DOM element being dragged
  })
  const [showGameModel, setShowGameModel] = useState(false)
  const [showSubPlanner, setShowSubPlanner] = useState(false)
  const [gameModel, setGameModel] = useState(team?.game_model || {
    style: '',
    buildUp: '',
    pressing: '',
    inPossession: '',
    outOfPossession: '',
    notes: '',
  })
  const [plannedSubs, setPlannedSubs] = useState(team?.planned_subs || [])
  const [newSub, setNewSub] = useState({ minute: '', playerOffId: '', playerOnId: '', notes: '' })
  const [benchPlayerIds, setBenchPlayerIds] = useState(team?.bench_players || [])
  const [setPieceTakers, setSetPieceTakers] = useState(team?.game_model?.setPieceTakers || sportConfig.defaultSetPieceTakers || {
    corners_left: '', corners_right: '', free_kicks: '', penalties: '', throw_ins_long: '',
  })
  const [customFormations, setCustomFormations] = useState(team?.custom_formations || [])
  const [showPrintView, setShowPrintView] = useState(false)
  const [showSaveFormation, setShowSaveFormation] = useState(false)
  const [newFormationName, setNewFormationName] = useState('')
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const saveInProgressRef = useRef(false)
  const initialLoadRef = useRef(true)
  const lastSaveTimestampRef = useRef(0) // Track when last save completed to avoid race conditions
  const localChangesRef = useRef(false) // Track if we have local changes that shouldn't be overwritten
  const lastTeamPositionsRef = useRef(null) // Track the last positions we received from team to detect actual changes

  // New tactical state
  const [tacticalPhase, setTacticalPhase] = useState(null) // null = base, or PHASES.IN_POSSESSION, etc.
  const [tacticalSettings, setTacticalSettings] = useState(
    team?.game_model?.tacticalSettings || defaultTacticalSettings
  )
  const [ballPosition, setBallPosition] = useState({ x: 50, y: 50 }) // Center of pitch
  const [showTacticalControls, setShowTacticalControls] = useState(false)

  // Calculate displayed positions based on tactical phase and ball position
  const displayedPositions = useMemo(() => {
    if (!tacticalPhase) return positions // Base formation

    const offsets = getPhaseOffsets(formation, positions)
    const phaseOffset = offsets[tacticalPhase] || {}

    // Smart ball-reactive positioning - pupils shift realistically based on ball position
    // Uses role-specific intelligence: near-side FB overlaps, far-side tucks in, etc.
    const getBallInfluence = (posId, posLabel, baseX, baseY) => {
      // Ball position normalized: -1 (far left) to 1 (far right), -1 (attacking end) to 1 (defensive end)
      const ballLateral = (ballPosition.x - 50) / 50
      const ballVertical = (ballPosition.y - 50) / 50
      const ballSideStrength = Math.abs(ballLateral) // 0-1, how far ball is to one side

      // Is this position on the same side as the ball?
      const posLateral = baseX - 50
      const sameSide = (ballLateral > 0 && posLateral > 0) || (ballLateral < 0 && posLateral < 0)

      // Position classification
      const isGK = posId === 'GK'
      const isCB = posLabel === 'CB' || /^CB\d?$/.test(posId)
      const isFB = ['LB', 'RB', 'LWB', 'RWB'].includes(posLabel) || ['LB', 'RB', 'LWB', 'RWB'].includes(posId)
      const isCDM = posLabel === 'CDM' || posId.includes('CDM')
      const isCM = (posLabel === 'CM' || /^CM\d?$/.test(posId)) && !isCDM
      const isWM = ['LM', 'RM'].includes(posLabel) || ['LM', 'RM'].includes(posId)
      const isAM = ['CAM', 'LAM', 'RAM', 'AM'].includes(posLabel) || ['CAM', 'LAM', 'RAM'].includes(posId)
      const isWinger = ['LW', 'RW'].includes(posLabel) || ['LW', 'RW'].includes(posId)
      const isST = posLabel === 'ST' || posLabel === 'CF' || posId.includes('ST')

      let xInfluence = 0
      let yInfluence = 0

      if (tacticalPhase === PHASES.IN_POSSESSION) {
        // IN POSSESSION: subtle overloads on ball side
        // Phase offsets already define the attacking shape - ball influence adds reactive shift
        if (isGK) {
          xInfluence = ballLateral * 2
          yInfluence = ballVertical * 3
        } else if (isCB) {
          // CBs shift toward ball side to cover space left by overlapping FB
          xInfluence = sameSide ? ballLateral * 6 : ballLateral * 3
          yInfluence = ballVertical * 5
        } else if (isFB) {
          if (sameSide) {
            // Near-side FB: push wider for overlap
            xInfluence = ballLateral * 4
            yInfluence = -6 * ballSideStrength + ballVertical * 5
          } else {
            // Far-side FB: tuck in slightly toward center
            xInfluence = ballLateral * 8
            yInfluence = ballVertical * 3
          }
        } else if (isCDM) {
          // CDM shifts toward ball to provide passing angle
          xInfluence = ballLateral * 7
          yInfluence = ballVertical * 4
        } else if (isCM) {
          // CMs form triangles around ball - near-side shifts more
          xInfluence = sameSide ? ballLateral * 9 : ballLateral * 5
          yInfluence = ballVertical * 5 - 2 * ballSideStrength
        } else if (isWM) {
          if (sameSide) {
            // Near-side WM: hold width, push high
            xInfluence = ballLateral * 3
            yInfluence = -5 * ballSideStrength + ballVertical * 5
          } else {
            // Far-side WM: come narrow but maintain structure
            xInfluence = ballLateral * 8
            yInfluence = ballVertical * 4
          }
        } else if (isAM) {
          // AMs drift toward ball side
          xInfluence = ballLateral * 7
          yInfluence = ballVertical * 4 - 3 * ballSideStrength
        } else if (isWinger) {
          if (sameSide) {
            // Near-side winger: hold width when ball is deep, cut inside when advanced
            const ballAdvanced = ballPosition.y < 35
            xInfluence = ballAdvanced ? -ballLateral * 4 : ballLateral * 4
            yInfluence = ballVertical * 5 - 3 * ballSideStrength
          } else {
            // Far-side winger: come narrow but stay in own half of pitch
            xInfluence = ballLateral * 8
            yInfluence = -3 * ballSideStrength + ballVertical * 3
          }
        } else if (isST) {
          // ST drifts toward near post, pins defenders
          xInfluence = ballLateral * 5
          yInfluence = ballVertical * 4 - 2 * ballSideStrength
        }
      } else if (tacticalPhase === PHASES.OUT_OF_POSSESSION) {
        // OUT OF POSSESSION: compact block shifts toward ball as a unit
        const blockShift = 0.6
        if (isGK) {
          xInfluence = ballLateral * 2
        } else if (isCB || isFB) {
          // Defensive line shifts together
          xInfluence = ballLateral * 8 * blockShift
          yInfluence = ballVertical * 3
        } else if (isCDM || isCM || isWM) {
          // Midfield line shifts more
          xInfluence = ballLateral * 10 * blockShift
          yInfluence = ballVertical * 4
        } else {
          // Pressing line follows ball most
          xInfluence = ballLateral * 12 * blockShift
          yInfluence = ballVertical * 5
        }
      } else if (tacticalPhase === PHASES.TRANSITION) {
        // TRANSITION: quick movements based on where ball is won
        if (isGK) {
          xInfluence = ballLateral * 2
          yInfluence = ballVertical * 2
        } else if (isCB) {
          xInfluence = ballLateral * 4
          yInfluence = ballVertical * 2
        } else if (isFB) {
          xInfluence = ballLateral * 6
          yInfluence = ballVertical * 3 - 3 * ballSideStrength
        } else if (isCDM || isCM) {
          xInfluence = ballLateral * 7
          yInfluence = ballVertical * 4 - 3
        } else if (isWM || isWinger) {
          // Sprint into channels
          xInfluence = sameSide ? ballLateral * 3 : ballLateral * 5
          yInfluence = -5 + ballVertical * 4
        } else if (isAM || isST) {
          xInfluence = ballLateral * 5
          yInfluence = -6 + ballVertical * 4
        }
      }

      return { x: xInfluence, y: yInfluence }
    }

    return positions.map(pos => {
      const offset = phaseOffset[pos.id] || { x: 0, y: 0 }

      // Get ball influence for this position
      const ballInfluence = getBallInfluence(pos.id, pos.label, pos.x, pos.y)

      // Apply tactical settings modifiers
      let settingsModifier = { x: 0, y: 0 }

      if (tacticalPhase === PHASES.OUT_OF_POSSESSION) {
        // Defensive line affects CBs and FBs
        if (['CB', 'CB1', 'CB2', 'CB3', 'LB', 'RB', 'LWB', 'RWB'].some(p => pos.id.includes(p) || pos.label === p)) {
          settingsModifier.y = (tacticalSettings.defensiveLine - 50) * 0.3
        }
        // Compactness affects distance between lines
        if (['CM', 'CM1', 'CM2', 'CM3', 'CDM', 'CDM1', 'CDM2'].some(p => pos.id.includes(p) || pos.label === p)) {
          settingsModifier.y = (tacticalSettings.compactness - 50) * 0.2
        }
        // Defensive width
        const widthFactor = (tacticalSettings.defensiveWidth - 50) * 0.3
        if (pos.x < 40) settingsModifier.x = -widthFactor
        else if (pos.x > 60) settingsModifier.x = widthFactor
      } else if (tacticalPhase === PHASES.IN_POSSESSION) {
        // Attacking width
        const widthFactor = (tacticalSettings.attackingWidth - 50) * 0.3
        if (pos.x < 40) settingsModifier.x = -widthFactor
        else if (pos.x > 60) settingsModifier.x = widthFactor
      }

      return {
        ...pos,
        displayX: Math.max(5, Math.min(95, pos.x + offset.x + ballInfluence.x + settingsModifier.x)),
        displayY: Math.max(5, Math.min(95, pos.y + offset.y + ballInfluence.y + settingsModifier.y)),
      }
    })
  }, [positions, tacticalPhase, formation, ballPosition, tacticalSettings])

  // Generate movement arrows for current formation
  const currentMovements = useMemo(() => {
    return generatePhaseMovements(positions)
  }, [positions])

  // Track changes after initial load
  useEffect(() => {
    if (initialLoadRef.current) {
      initialLoadRef.current = false
      return
    }
    setHasUnsavedChanges(true)
  }, [formation, positions, gameModel, plannedSubs, tacticalSettings, setPieceTakers])

  // Helper to sanitize positions for saving
  const sanitizePositions = (posArray) => posArray.map(pos => ({
    id: pos.id,
    label: pos.label,
    x: typeof pos.x === 'number' && !isNaN(pos.x) ? Math.max(0, Math.min(100, pos.x)) : 50,
    y: typeof pos.y === 'number' && !isNaN(pos.y) ? Math.max(0, Math.min(100, pos.y)) : 50,
    pupilId: pos.pupilId ?? null,
  }))

  // Auto-save on unmount (tab change/navigation)
  useEffect(() => {
    return () => {
      if (hasUnsavedChanges && !saveInProgressRef.current) {
        // Fire and forget save when component unmounts - sanitize positions
        updateTeam({
          formation,
          positions: sanitizePositions(positions),
          game_model: { ...gameModel, tacticalSettings, setPieceTakers },
          planned_subs: plannedSubs,
        })
      }
    }
  }, [hasUnsavedChanges, formation, positions, gameModel, plannedSubs, tacticalSettings, setPieceTakers, updateTeam])

  // Warn before browser close/refresh if there are unsaved changes
  useBeforeUnload(
    useCallback(
      (e) => {
        if (hasUnsavedChanges) {
          e.preventDefault()
          return 'You have unsaved changes. Are you sure you want to leave?'
        }
      },
      [hasUnsavedChanges]
    )
  )

  useEffect(() => {
    // Skip if no team data yet
    if (!team) return

    // Skip update if this is triggered by our own save operation (prevents race condition)
    const timeSinceLastSave = Date.now() - lastSaveTimestampRef.current
    const isFromOurSave = timeSinceLastSave < 2000 // Extended to 2 seconds for slower connections

    // Check if team positions actually changed (not just a re-render)
    const teamPositionsJson = JSON.stringify(team?.positions || [])
    const positionsActuallyChanged = teamPositionsJson !== lastTeamPositionsRef.current
    const isFirstLoad = lastTeamPositionsRef.current === null

    // Temporarily disable change tracking while loading team data
    initialLoadRef.current = true

    // Only update positions/formation from team if:
    // 1. NOT from our own save operation
    // 2. We don't have local unsaved changes (localChangesRef) - OR this is the first load
    // 3. The positions actually changed from what we last received
    if (!isFromOurSave && (!localChangesRef.current || isFirstLoad) && positionsActuallyChanged) {
      const currentTeamFormat = team?.team_format || sportConfig.defaultFormat || 11
      const sportFallback = sportConfig.defaultFormationByFormat?.[currentTeamFormat]
        || sportConfig.formationsByFormat?.[currentTeamFormat]?.[0]
        || '4-3-3'
      const formatPositionsMap = sportConfig.defaultPositionsByFormat?.[currentTeamFormat] || {}
      const storedFormation = team?.formation
      const formationValidForFormat = storedFormation && !!formatPositionsMap[storedFormation]
      const formationToUse = formationValidForFormat ? storedFormation : sportFallback
      if (team?.positions && Array.isArray(team.positions) && team.positions.length > 0) {
        // Validate and sanitize incoming positions
        const validatedPositions = validatePositions(team.positions, formationToUse, currentTeamFormat, sportConfig)
        setPositions(validatedPositions)
        lastTeamPositionsRef.current = teamPositionsJson
        // Clear local changes on first load since we're syncing with server
        if (isFirstLoad) {
          localChangesRef.current = false
        }
      } else {
        // Mark that we've checked team positions even if empty
        lastTeamPositionsRef.current = teamPositionsJson
      }
      if (team?.formation) {
        setFormation(formationToUse)
      }
      // Reset view format to team's actual format when team changes
      if (isFirstLoad) {
        setViewFormat(currentTeamFormat)
      }
    } else if (isFromOurSave) {
      // Update the ref so we know what the server has
      lastTeamPositionsRef.current = teamPositionsJson
      // Clear local changes flag since server now has our changes
      localChangesRef.current = false
    }

    // Always update these as they're less likely to have race conditions
    if (team?.game_model) {
      setGameModel(team.game_model)
      if (team.game_model.tacticalSettings) {
        // Only sync server-persisted settings, preserve local UI-only overlay toggles
        setTacticalSettings(prev => ({
          ...prev,
          defensiveLine: team.game_model.tacticalSettings.defensiveLine ?? prev.defensiveLine,
          compactness: team.game_model.tacticalSettings.compactness ?? prev.compactness,
          attackingWidth: team.game_model.tacticalSettings.attackingWidth ?? prev.attackingWidth,
          defensiveWidth: team.game_model.tacticalSettings.defensiveWidth ?? prev.defensiveWidth,
          pressingIntensity: team.game_model.tacticalSettings.pressingIntensity ?? prev.pressingIntensity,
          pressingTriggerZone: team.game_model.tacticalSettings.pressingTriggerZone ?? prev.pressingTriggerZone,
          // Preserve local UI-only overlay settings (not persisted to server)
          // showMovements, showZones, showThirds, showPressingZones stay unchanged
        }))
      }
      if (team.game_model.setPieceTakers) {
        setSetPieceTakers(team.game_model.setPieceTakers)
      }
    }
    if (team?.planned_subs) {
      setPlannedSubs(team.planned_subs)
    }
    if (team?.bench_players) {
      setBenchPlayerIds(team.bench_players)
    }
    if (team?.custom_formations) {
      setCustomFormations(team.custom_formations)
    }
    // Reset the flag after a tick to allow state updates to settle
    setTimeout(() => {
      initialLoadRef.current = false
      setHasUnsavedChanges(false)
    }, 0)
  }, [team])

  function handleFormationChange(newFormation) {
    setFormation(newFormation)
    localChangesRef.current = true
    // Check if it's a custom formation
    const custom = customFormations.find(cf => cf.name === newFormation)
    if (custom && custom.positions) {
      // Validate custom formation positions
      setPositions(validatePositions(custom.positions, newFormation, activeFormat, sportConfig))
    } else {
      // Use defaults for standard formations (based on team format)
      const defaults = defaultFormationPositions[newFormation]
        || defaultFormationPositions[defaultFormation]
        || []
      setPositions(defaults.map(p => ({ ...p })))
    }
    setSelectedPosition(null)
  }

  async function handleSaveCustomFormation() {
    if (!newFormationName.trim()) {
      toast.error('Please enter a formation name')
      return
    }
    // Check if name already exists
    if (customFormations.some(cf => cf.name === newFormationName.trim()) || availableFormations.includes(newFormationName.trim())) {
      toast.error('A formation with this name already exists')
      return
    }
    const newCustom = {
      id: Date.now(),
      name: newFormationName.trim(),
      positions: sanitizePositions(positions), // Deep copy and sanitize positions
    }
    const updatedCustomFormations = [...customFormations, newCustom]
    setCustomFormations(updatedCustomFormations)

    // Save to database
    const result = await updateTeam({ custom_formations: updatedCustomFormations })
    if (result.success) {
      setFormation(newFormationName.trim())
      toast.success(`Formation "${newFormationName.trim()}" saved!`)
      setShowSaveFormation(false)
      setNewFormationName('')
    } else {
      toast.error('Failed to save custom formation')
      setCustomFormations(customFormations) // Revert
    }
  }

  async function handleDeleteCustomFormation(formationName, e) {
    e.stopPropagation()
    const updatedCustomFormations = customFormations.filter(cf => cf.name !== formationName)
    setCustomFormations(updatedCustomFormations)

    // If currently using this formation, switch to the default for this sport/format
    if (formation === formationName) {
      const fallbackFm = defaultFormation
      const fallbackPositions = defaultFormationPositions[fallbackFm] || []
      setFormation(fallbackFm)
      setPositions(fallbackPositions.map(p => ({ ...p })))
    }

    const result = await updateTeam({ custom_formations: updatedCustomFormations })
    if (result.success) {
      toast.success('Custom formation deleted')
    } else {
      toast.error('Failed to delete formation')
      setCustomFormations(customFormations) // Revert
    }
  }

  function assignPlayerToPosition(pupilId) {
    if (!selectedPosition) return

    localChangesRef.current = true

    const newPositions = positions.map(pos => ({
      ...pos,
      pupilId: pos.pupilId === pupilId ? null : pos.pupilId,
    }))

    const posIndex = newPositions.findIndex(p => p.id === selectedPosition)
    if (posIndex !== -1) {
      newPositions[posIndex] = { ...newPositions[posIndex], pupilId }
    }

    setPositions(newPositions)
    setSelectedPosition(null)
    // Remove from bench if they were a sub - they're now starting
    setBenchPlayerIds(prev => prev.filter(id => id !== pupilId))
  }

  function removePlayerFromPosition(positionId) {
    localChangesRef.current = true
    setPositions(prevPositions => prevPositions.map(pos =>
      pos.id === positionId ? { ...pos, pupilId: null } : pos
    ))
  }

  // Handle position click - either select for assignment, start swap, or complete swap
  function handlePositionClick(positionId) {
    // If same position clicked, deselect
    if (selectedPosition === positionId) {
      setSelectedPosition(null)
      setSwapMode(false)
      return
    }

    // If we're in swap mode (first position with pupil was selected)
    if (swapMode && selectedPosition) {
      const fromPositionId = selectedPosition
      localChangesRef.current = true
      // Use functional update to get current state and avoid race conditions
      setPositions(prevPositions => {
        const clickedPos = prevPositions.find(p => p.id === positionId)
        const selectedPos = prevPositions.find(p => p.id === fromPositionId)
        const clickedHasPlayer = clickedPos?.pupilId != null

        if (clickedHasPlayer) {
          // Swap pupils between positions
          if (!selectedPos) return prevPositions
          // Show toast after state update
          setTimeout(() => toast.success('Players swapped!'), 0)
          return prevPositions.map(pos => {
            if (pos.id === fromPositionId) {
              return { ...pos, pupilId: clickedPos.pupilId }
            }
            if (pos.id === positionId) {
              return { ...pos, pupilId: selectedPos.pupilId }
            }
            return pos
          })
        } else {
          // Move pupil to empty position
          if (!selectedPos) return prevPositions
          // Show toast after state update
          setTimeout(() => toast.success('Pupil moved!'), 0)
          return prevPositions.map(pos => {
            if (pos.id === positionId) {
              return { ...pos, pupilId: selectedPos.pupilId }
            }
            if (pos.id === fromPositionId) {
              return { ...pos, pupilId: null }
            }
            return pos
          })
        }
      })
      setSelectedPosition(null)
      setSwapMode(false)
      return
    }

    // Start new selection
    const clickedPos = positions.find(p => p.id === positionId)
    const clickedHasPlayer = clickedPos?.pupilId != null
    setSelectedPosition(positionId)
    // Enable swap mode if clicked position has a pupil
    setSwapMode(clickedHasPlayer)
  }

  function getPlayerForPosition(positionId) {
    const pos = positions.find(p => p.id === positionId)
    if (!pos?.pupilId) return null
    return pupils.find(p => p.id === pos.pupilId)
  }

  function getAssignedPlayerIds() {
    return positions.filter(p => p.pupilId).map(p => p.pupilId)
  }

  function getPlayerById(id) {
    return pupils.find(p => p.id === id)
  }

  // Get pupils on the bench (explicitly selected as subs)
  function getBenchPlayers() {
    return pupils.filter(p => benchPlayerIds.includes(p.id))
  }

  function toggleBenchPlayer(pupilId) {
    setBenchPlayerIds(prev => {
      const updated = prev.includes(pupilId)
        ? prev.filter(id => id !== pupilId)
        : [...prev, pupilId]
      setHasUnsavedChanges(true)
      return updated
    })
  }

  // Get pupils currently on pitch (starting XI)
  function getStartingPlayers() {
    const assignedIds = getAssignedPlayerIds()
    return pupils.filter(p => assignedIds.includes(p.id))
  }

  function addPlannedSub() {
    if (!newSub.minute || !newSub.playerOffId || !newSub.playerOnId) {
      toast.error('Please fill in minute, pupil off, and pupil on')
      return
    }
    const sub = {
      id: Date.now(),
      minute: parseInt(newSub.minute),
      playerOffId: parseInt(newSub.playerOffId),
      playerOnId: parseInt(newSub.playerOnId),
      notes: newSub.notes,
    }
    setPlannedSubs([...plannedSubs, sub].sort((a, b) => a.minute - b.minute))
    setNewSub({ minute: '', playerOffId: '', playerOnId: '', notes: '' })
  }

  function removePlannedSub(subId) {
    setPlannedSubs(plannedSubs.filter(s => s.id !== subId))
  }

  async function handleSave() {
    setSaving(true)
    saveInProgressRef.current = true
    // Sanitize positions before saving to ensure valid coordinates
    const sanitized = sanitizePositions(positions)
    const result = await updateTeam({
      formation,
      positions: sanitized,
      game_model: { ...gameModel, tacticalSettings, setPieceTakers },
      planned_subs: plannedSubs,
      bench_players: benchPlayerIds,
    })
    if (result.success) {
      setHasUnsavedChanges(false)
      // Mark when save completed to prevent race condition with team useEffect
      lastSaveTimestampRef.current = Date.now()
      // Update what we expect from the server - use sanitized since that's what we saved
      lastTeamPositionsRef.current = JSON.stringify(sanitized)
      // Clear local changes flag
      localChangesRef.current = false
      toast.success('Tactics saved!')
    } else {
      toast.error('Failed to save tactics')
    }
    setSaving(false)
    saveInProgressRef.current = false
  }

  async function handleSaveGameModel() {
    setSaving(true)
    saveInProgressRef.current = true
    const result = await updateTeam({ game_model: { ...gameModel, tacticalSettings, setPieceTakers } })
    if (result.success) {
      setHasUnsavedChanges(false)
      toast.success('Game model saved!')
      setShowGameModel(false)
    } else {
      toast.error('Failed to save game model')
    }
    setSaving(false)
    saveInProgressRef.current = false
  }

  async function handleSaveSubs() {
    setSaving(true)
    saveInProgressRef.current = true
    const result = await updateTeam({ planned_subs: plannedSubs, bench_players: benchPlayerIds })
    if (result.success) {
      setHasUnsavedChanges(false)
      toast.success('Substitution plan saved!')
      setShowSubPlanner(false)
    } else {
      toast.error('Failed to save substitution plan')
    }
    setSaving(false)
    saveInProgressRef.current = false
  }

  const assignedPlayerIds = getAssignedPlayerIds()

  // --- Pointer Events drag handlers (replaces Framer Motion drag) ---
  const handlePointerDown = useCallback((e, targetId, origPctX, origPctY) => {
    // Only primary button
    if (e.button !== 0) return
    // Don't preventDefault or setPointerCapture here - doing so suppresses
    // the subsequent click event on the inner button, breaking swap/assign.
    // We capture the pointer later in handlePointerMove once drag threshold is met.
    const el = e.currentTarget
    dragRef.current = {
      active: false,        // becomes true after threshold
      pointerId: e.pointerId,
      targetId,
      startX: e.clientX,
      startY: e.clientY,
      origPctX,
      origPctY,
      el,
    }
  }, [])

  const handlePointerMove = useCallback((e) => {
    const d = dragRef.current
    if (d.pointerId == null) return
    if (e.pointerId !== d.pointerId) return

    const pitchRect = pitchRef.current?.getBoundingClientRect()
    if (!pitchRect) return

    const dx = e.clientX - d.startX
    const dy = e.clientY - d.startY

    // Activation threshold (5px)
    if (!d.active) {
      if (Math.sqrt(dx * dx + dy * dy) < 5) return
      d.active = true
      e.preventDefault()
      // Now that drag is confirmed, capture pointer so we track it even outside the element
      if (d.el) {
        try { d.el.setPointerCapture(d.pointerId) } catch {}
      }
      if (d.targetId === 'ball') {
        // no extra state for ball
      } else {
        setDraggingPositionId(d.targetId)
        setSelectedPosition(null)
        setSwapMode(false)
      }
    }

    e.preventDefault()
    // Convert pixel offset to percentage
    const newX = d.origPctX + (dx / pitchRect.width) * 100
    const newY = d.origPctY + (dy / pitchRect.height) * 100
    const clampedX = Math.max(5, Math.min(95, newX))
    const clampedY = Math.max(5, Math.min(95, newY))

    // Direct DOM update for performance (no React re-render)
    if (d.el) {
      d.el.style.left = `${clampedX}%`
      d.el.style.top = `${clampedY}%`
    }
  }, [])

  const handlePointerUp = useCallback((e) => {
    const d = dragRef.current
    if (d.pointerId == null) return
    if (e.pointerId !== d.pointerId) return

    if (d.active) {
      // Release capture only if we captured it during drag
      if (d.el) {
        try { d.el.releasePointerCapture(d.pointerId) } catch {}
      }
      justFinishedDragRef.current = true
      setTimeout(() => { justFinishedDragRef.current = false }, 300)

      const pitchRect = pitchRef.current?.getBoundingClientRect()
      if (pitchRect) {
        const dx = e.clientX - d.startX
        const dy = e.clientY - d.startY
        const newX = d.origPctX + (dx / pitchRect.width) * 100
        const newY = d.origPctY + (dy / pitchRect.height) * 100
        const clampedX = Math.round(Math.max(5, Math.min(95, newX)) * 100) / 100
        const clampedY = Math.round(Math.max(5, Math.min(95, newY)) * 100) / 100

        if (d.targetId === 'ball') {
          setBallPosition({ x: clampedX, y: clampedY })
        } else {
          localChangesRef.current = true
          setPositions(prev => prev.map(p =>
            p.id === d.targetId ? { ...p, x: clampedX, y: clampedY } : p
          ))
        }
      }

      setDraggingPositionId(null)
    }

    // Reset drag ref
    dragRef.current = { active: false, pointerId: null, targetId: null, startX: 0, startY: 0, origPctX: 0, origPctY: 0, el: null }
  }, [])

  return (
    <div className="p-6 lg:p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="font-display text-2xl lg:text-3xl font-bold text-white mb-1">
              {team?.name ? `${team.name} — Tactics` : 'Tactics'}
            </h1>
            <p className="text-navy-400 capitalize">
              {sportKey !== 'football' ? `${sportConfig.label || sportKey} · ` : ''}Build your formation and game model
            </p>
          </div>

          <div className="flex gap-2">
            <button onClick={() => setShowPrintView(true)} className="btn-secondary" title="Print tactics board">
              <Printer className="w-4 h-4" />
              Print
            </button>
            <button onClick={() => handleFormationChange(formation)} className="btn-secondary">
              <RotateCcw className="w-4 h-4" />
              Reset
            </button>
            <button onClick={handleSave} disabled={saving} className={`btn-primary ${hasUnsavedChanges ? 'ring-2 ring-energy-400 ring-offset-2 ring-offset-navy-900' : ''}`}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {hasUnsavedChanges ? 'Save*' : 'Save'}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Pitch View */}
          <div className="lg:col-span-2">
            <div className="card p-4">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <h2 className="font-display font-semibold text-white">Formation</h2>
                  {formatSizes.length > 1 && (
                    <div className="flex items-center gap-1">
                      {formatSizes.map(size => (
                        <button
                          key={size}
                          onClick={() => {
                            setViewFormat(size)
                            const newDefault = sportConfig.defaultFormationByFormat[size] || sportConfig.formationsByFormat[size]?.[0] || formation
                            setFormation(newDefault)
                            setPositions(validatePositions(null, newDefault, size, sportConfig))
                          }}
                          className={`px-2 py-0.5 rounded text-xs font-medium transition-all ${
                            activeFormat === size
                              ? 'bg-pitch-500 text-white'
                              : 'bg-navy-700 text-navy-400 hover:bg-navy-600'
                          }`}
                        >
                          {size}v{size}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <select
                    value={formation}
                    onChange={(e) => handleFormationChange(e.target.value)}
                    className="input w-40"
                  >
                    <optgroup label={`${activeFormat}-a-side`}>
                      {availableFormations.map(f => (
                        <option key={f} value={f}>{f}</option>
                      ))}
                    </optgroup>
                    {customFormations.length > 0 && (
                      <optgroup label="Custom">
                        {customFormations.map(cf => (
                          <option key={cf.id} value={cf.name}>{cf.name}</option>
                        ))}
                      </optgroup>
                    )}
                  </select>
                  <button
                    onClick={() => setShowSaveFormation(true)}
                    className="btn-ghost p-2"
                    title="Save as custom formation"
                  >
                    <BookmarkPlus className="w-5 h-5" />
                  </button>
                  {customFormations.some(cf => cf.name === formation) && (
                    <button
                      onClick={(e) => handleDeleteCustomFormation(formation, e)}
                      className="btn-ghost p-2 text-alert-400 hover:bg-alert-500/10"
                      title="Delete this custom formation"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              {/* Tactical Phase Toggle - only for sports that support phases */}
              {supportsPhases && <div className="flex flex-wrap items-center gap-2 mb-4">
                <span className="text-sm text-navy-400 mr-2">View:</span>
                <button
                  onClick={() => setTacticalPhase(null)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all flex items-center gap-1.5 ${
                    tacticalPhase === null
                      ? 'bg-navy-600 text-white'
                      : 'bg-navy-800/50 text-navy-400 hover:bg-navy-700/50'
                  }`}
                >
                  <Circle className="w-3.5 h-3.5" />
                  Base
                </button>
                <button
                  onClick={() => setTacticalPhase(PHASES.IN_POSSESSION)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all flex items-center gap-1.5 ${
                    tacticalPhase === PHASES.IN_POSSESSION
                      ? 'bg-pitch-500 text-white'
                      : 'bg-navy-800/50 text-navy-400 hover:bg-pitch-500/20'
                  }`}
                >
                  <Swords className="w-3.5 h-3.5" />
                  In Possession
                </button>
                <button
                  onClick={() => setTacticalPhase(PHASES.OUT_OF_POSSESSION)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all flex items-center gap-1.5 ${
                    tacticalPhase === PHASES.OUT_OF_POSSESSION
                      ? 'bg-alert-500 text-white'
                      : 'bg-navy-800/50 text-navy-400 hover:bg-alert-500/20'
                  }`}
                >
                  <Shield className="w-3.5 h-3.5" />
                  Out of Possession
                </button>
                <button
                  onClick={() => setTacticalPhase(PHASES.TRANSITION)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all flex items-center gap-1.5 ${
                    tacticalPhase === PHASES.TRANSITION
                      ? 'bg-energy-500 text-white'
                      : 'bg-navy-800/50 text-navy-400 hover:bg-energy-500/20'
                  }`}
                >
                  <Zap className="w-3.5 h-3.5" />
                  Transition
                </button>

                <div className="ml-auto flex items-center gap-2">
                  {/* Movement arrows toggle */}
                  <div className="relative group">
                    <button
                      onClick={() => setTacticalSettings(s => ({ ...s, showMovements: !s.showMovements }))}
                      className={`p-2 rounded-lg transition-all ${
                        tacticalSettings.showMovements
                          ? 'bg-energy-500/20 text-energy-400'
                          : 'bg-navy-800/50 text-navy-500 hover:text-navy-300'
                      }`}
                    >
                      <Move className="w-4 h-4" />
                    </button>
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-navy-800 rounded-lg shadow-xl opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50 border border-navy-700">
                      <div className="text-xs font-semibold text-white">Movement Arrows</div>
                      <div className="text-[10px] text-navy-400 mt-0.5">Show pupil movement patterns for the current phase</div>
                      <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-px border-4 border-transparent border-t-navy-800" />
                    </div>
                  </div>
                  {/* Half-spaces & channels toggle */}
                  <div className="relative group">
                    <button
                      onClick={() => setTacticalSettings(s => ({ ...s, showZones: !s.showZones }))}
                      className={`p-2 rounded-lg transition-all ${
                        tacticalSettings.showZones
                          ? 'bg-purple-500/20 text-purple-400'
                          : 'bg-navy-800/50 text-navy-500 hover:text-navy-300'
                      }`}
                    >
                      <Grid3x3 className="w-4 h-4" />
                    </button>
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-navy-800 rounded-lg shadow-xl opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50 border border-navy-700">
                      <div className="text-xs font-semibold text-white">Half-Spaces & Channels</div>
                      <div className="text-[10px] text-navy-400 mt-0.5">Display vertical pitch zones: wings, half-spaces, central</div>
                      <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-px border-4 border-transparent border-t-navy-800" />
                    </div>
                  </div>
                  {/* Pitch thirds toggle */}
                  <div className="relative group">
                    <button
                      onClick={() => setTacticalSettings(s => ({ ...s, showThirds: !s.showThirds }))}
                      className={`p-2 rounded-lg transition-all ${
                        tacticalSettings.showThirds
                          ? 'bg-pitch-500/20 text-pitch-400'
                          : 'bg-navy-800/50 text-navy-500 hover:text-navy-300'
                      }`}
                    >
                      <Layers className="w-4 h-4" />
                    </button>
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-navy-800 rounded-lg shadow-xl opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50 border border-navy-700">
                      <div className="text-xs font-semibold text-white">Pitch Thirds</div>
                      <div className="text-[10px] text-navy-400 mt-0.5">Show attacking, middle, and defensive thirds</div>
                      <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-px border-4 border-transparent border-t-navy-800" />
                    </div>
                  </div>
                  {/* Pressing zones toggle */}
                  <div className="relative group">
                    <button
                      onClick={() => setTacticalSettings(s => ({ ...s, showPressingZones: !s.showPressingZones }))}
                      className={`p-2 rounded-lg transition-all ${
                        tacticalSettings.showPressingZones
                          ? 'bg-alert-500/20 text-alert-400'
                          : 'bg-navy-800/50 text-navy-500 hover:text-navy-300'
                      }`}
                    >
                      {tacticalSettings.showPressingZones ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                    </button>
                    <div className="absolute bottom-full right-0 mb-2 px-3 py-2 bg-navy-800 rounded-lg shadow-xl opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50 border border-navy-700">
                      <div className="text-xs font-semibold text-white">Pressing Zones</div>
                      <div className="text-[10px] text-navy-400 mt-0.5">Show high, mid, and low pressing trigger areas</div>
                      <div className="absolute top-full right-4 -mt-px border-4 border-transparent border-t-navy-800" />
                    </div>
                  </div>
                </div>
              </div>}

              {/* Pitch */}
              <div
                ref={pitchRef}
                data-pitch
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerCancel={handlePointerUp}
                className="relative rounded-xl overflow-hidden select-none shadow-2xl ring-1 ring-white/10"
                style={{ touchAction: 'none', background: pitchBg, aspectRatio: pitchAspect }}
              >
                {/* Subtle stripe texture for grass surfaces */}
                {(sportKey === 'football' || sportKey === 'rugby' || sportKey === 'hockey') && (
                <div
                  className="absolute inset-0 pointer-events-none"
                  style={{
                    backgroundImage: `repeating-linear-gradient(0deg, rgba(255,255,255,0.03) 0px, rgba(255,255,255,0.03) 24px, transparent 24px, transparent 48px)`,
                    backgroundSize: '100% 48px'
                  }}
                />
                )}

                {/* Half-Spaces & Channels Overlay */}
                <AnimatePresence mode="sync">
                  {tacticalSettings.showZones && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="absolute inset-[4%] pointer-events-none"
                    >
                      {TACTICAL_ZONES.channels.map((zone, i) => (
                        <motion.div
                          key={zone.id}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: i * 0.05 }}
                          className={`absolute top-0 bottom-0 border-x ${
                            zone.color === 'purple'
                              ? 'bg-purple-500/10 border-purple-400/30'
                              : zone.color === 'green'
                              ? 'bg-pitch-500/8 border-pitch-400/20'
                              : 'bg-blue-500/8 border-blue-400/20'
                          }`}
                          style={{
                            left: `${zone.x}%`,
                            width: `${zone.width}%`,
                          }}
                        >
                          <span className={`absolute top-2 left-1/2 -translate-x-1/2 text-[9px] font-bold uppercase tracking-wider ${
                            zone.color === 'purple'
                              ? 'text-purple-300/70'
                              : zone.color === 'green'
                              ? 'text-pitch-300/60'
                              : 'text-blue-300/60'
                          }`}>
                            {zone.label}
                          </span>
                        </motion.div>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Pitch Thirds Overlay */}
                <AnimatePresence mode="sync">
                  {tacticalSettings.showThirds && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="absolute inset-[4%] pointer-events-none"
                    >
                      {TACTICAL_ZONES.thirds.map((zone, i) => (
                        <motion.div
                          key={zone.id}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: i * 0.05 }}
                          className={`absolute left-0 right-0 border-y ${
                            zone.id === 'attacking'
                              ? 'bg-alert-500/8 border-alert-400/20'
                              : zone.id === 'defensive'
                              ? 'bg-pitch-500/8 border-pitch-400/20'
                              : 'bg-energy-500/5 border-energy-400/15'
                          }`}
                          style={{
                            top: `${zone.y}%`,
                            height: `${zone.height}%`,
                          }}
                        >
                          <span className={`absolute left-2 top-1/2 -translate-y-1/2 text-[9px] font-semibold uppercase tracking-wider ${
                            zone.id === 'attacking'
                              ? 'text-alert-300/60'
                              : zone.id === 'defensive'
                              ? 'text-pitch-300/60'
                              : 'text-energy-300/50'
                          }`}>
                            {zone.label}
                          </span>
                        </motion.div>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Sport-specific pitch markings */}
                <PitchMarkings teamFormat={activeFormat} />

                {/* Pressing Trigger Zones */}
                <AnimatePresence mode="sync">
                  {tacticalSettings.showPressingZones && tacticalPhase === PHASES.OUT_OF_POSSESSION && (
                    <>
                      {/* High pressing zone */}
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className={`absolute left-[4%] right-[4%] border-2 border-dashed rounded pointer-events-none ${
                          tacticalSettings.pressingTriggerZone === 'high'
                            ? 'bg-alert-500/15 border-alert-400/80'
                            : 'bg-transparent border-white/15'
                        }`}
                        style={{ top: '4%', height: '28%' }}
                      >
                        {tacticalSettings.pressingTriggerZone === 'high' && (
                          <motion.span
                            initial={{ opacity: 0, y: -5 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="absolute top-2 left-3 text-[10px] font-semibold text-alert-300 uppercase tracking-wider"
                          >
                            Press Zone
                          </motion.span>
                        )}
                      </motion.div>
                      {/* Mid-block zone */}
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2, delay: 0.05 }}
                        className={`absolute left-[4%] right-[4%] border-2 border-dashed rounded pointer-events-none ${
                          tacticalSettings.pressingTriggerZone === 'mid'
                            ? 'bg-energy-500/15 border-energy-400/80'
                            : 'bg-transparent border-white/10'
                        }`}
                        style={{ top: '32%', height: '32%' }}
                      >
                        {tacticalSettings.pressingTriggerZone === 'mid' && (
                          <motion.span
                            initial={{ opacity: 0, y: -5 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="absolute top-2 left-3 text-[10px] font-semibold text-energy-300 uppercase tracking-wider"
                          >
                            Press Zone
                          </motion.span>
                        )}
                      </motion.div>
                      {/* Low block zone */}
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2, delay: 0.1 }}
                        className={`absolute left-[4%] right-[4%] border-2 border-dashed rounded pointer-events-none ${
                          tacticalSettings.pressingTriggerZone === 'low'
                            ? 'bg-pitch-500/15 border-pitch-400/80'
                            : 'bg-transparent border-white/10'
                        }`}
                        style={{ top: '64%', height: '32%' }}
                      >
                        {tacticalSettings.pressingTriggerZone === 'low' && (
                          <motion.span
                            initial={{ opacity: 0, y: -5 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="absolute top-2 left-3 text-[10px] font-semibold text-pitch-300 uppercase tracking-wider"
                          >
                            Press Zone
                          </motion.span>
                        )}
                      </motion.div>
                    </>
                  )}
                </AnimatePresence>

                {/* Defensive Line Indicator */}
                <AnimatePresence mode="sync">
                  {tacticalPhase && (
                    <motion.div
                      initial={{ opacity: 0, scaleX: 0 }}
                      animate={{ opacity: 1, scaleX: 1 }}
                      exit={{ opacity: 0, scaleX: 0 }}
                      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                      className={`absolute left-[4%] right-[4%] h-[3px] bg-gradient-to-r from-transparent ${
                        tacticalPhase === PHASES.OUT_OF_POSSESSION
                          ? 'via-alert-400/70'
                          : tacticalPhase === PHASES.IN_POSSESSION
                            ? 'via-pitch-400/50'
                            : 'via-energy-400/50'
                      } to-transparent pointer-events-none`}
                      style={{ top: `${50 + (tacticalSettings.defensiveLine - 50) * 0.4}%` }}
                    >
                      <motion.span
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`absolute -top-6 left-1/2 -translate-x-1/2 text-[9px] font-semibold bg-black/50 backdrop-blur-sm px-2 py-1 rounded whitespace-nowrap ${
                          tacticalPhase === PHASES.OUT_OF_POSSESSION ? 'text-alert-300' : 'text-white/60'
                        }`}
                      >
                        Defensive Line
                      </motion.span>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Draggable Ball (only shown in tactical phases) */}
                {tacticalPhase && (
                  <div
                    className="absolute z-30 cursor-grab active:cursor-grabbing touch-none"
                    style={{
                      left: `${ballPosition.x}%`,
                      top: `${ballPosition.y}%`,
                      transform: 'translate(-50%, -50%)',
                      touchAction: 'none',
                    }}
                    onPointerDown={(e) => handlePointerDown(e, 'ball', ballPosition.x, ballPosition.y)}
                  >
                    {/* Football ball with realistic pattern */}
                    <div className="w-7 h-7 rounded-full bg-white shadow-xl relative overflow-hidden">
                      {/* Pentagon pattern */}
                      <svg viewBox="0 0 28 28" className="w-full h-full">
                        <circle cx="14" cy="14" r="13" fill="white" stroke="#e5e7eb" strokeWidth="1"/>
                        {/* Black pentagons */}
                        <polygon points="14,5 17,9 15.5,13 12.5,13 11,9" fill="#1f2937"/>
                        <polygon points="6,11 9,8 12,10 11,14 7,14" fill="#1f2937"/>
                        <polygon points="22,11 19,8 16,10 17,14 21,14" fill="#1f2937"/>
                        <polygon points="8,20 11,17 14,19 13,23 9,22" fill="#1f2937"/>
                        <polygon points="20,20 17,17 14,19 15,23 19,22" fill="#1f2937"/>
                        {/* Highlight */}
                        <ellipse cx="10" cy="8" rx="3" ry="2" fill="rgba(255,255,255,0.6)"/>
                      </svg>
                    </div>
                    <span
                      className="absolute -bottom-5 left-1/2 -translate-x-1/2 text-[9px] font-medium text-white/70 whitespace-nowrap bg-black/30 px-1.5 py-0.5 rounded select-none"
                    >
                      Drag ball
                    </span>
                  </div>
                )}

                {/* Movement Arrows */}
                <AnimatePresence mode="sync">
                  {tacticalSettings.showMovements && tacticalPhase && currentMovements[tacticalPhase]?.length > 0 && (
                    <motion.svg
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.3 }}
                      className="absolute inset-0 w-full h-full pointer-events-none z-10"
                    >
                      <defs>
                        <marker id="arrowhead" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
                          <polygon points="0 0, 8 3, 0 6" fill="rgba(251, 191, 36, 0.9)" />
                        </marker>
                        <filter id="glow">
                          <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
                          <feMerge>
                            <feMergeNode in="coloredBlur"/>
                            <feMergeNode in="SourceGraphic"/>
                          </feMerge>
                        </filter>
                      </defs>
                      {currentMovements[tacticalPhase].map((movement, idx) => {
                        const fromPos = displayedPositions.find(p => p.id === movement.from)
                        if (!fromPos) return null

                        let dx = 0, dy = 0
                        const arrowLength = 8
                        switch (movement.direction) {
                          case 'forward': dy = -arrowLength; break
                          case 'back': dy = arrowLength; break
                          case 'forward-diagonal': dx = fromPos.x < 50 ? arrowLength : -arrowLength; dy = -arrowLength; break
                          case 'forward-wide': dx = fromPos.x < 50 ? -arrowLength : arrowLength; dy = -arrowLength * 0.5; break
                          case 'inside': dx = fromPos.x < 50 ? arrowLength : -arrowLength; dy = -arrowLength * 0.3; break
                          case 'back-left': dx = -arrowLength * 0.5; dy = arrowLength * 0.5; break
                          case 'back-right': dx = arrowLength * 0.5; dy = arrowLength * 0.5; break
                          default: break
                        }

                        const x1 = (fromPos.displayX || fromPos.x)
                        const y1 = (fromPos.displayY || fromPos.y)
                        const x2 = x1 + dx
                        const y2 = y1 + dy

                        return (
                          <motion.g
                            key={idx}
                            initial={{ opacity: 0, pathLength: 0 }}
                            animate={{ opacity: 1, pathLength: 1 }}
                            transition={{ delay: idx * 0.1, duration: 0.4 }}
                          >
                            <line
                              x1={`${x1}%`}
                              y1={`${y1}%`}
                              x2={`${x2}%`}
                              y2={`${y2}%`}
                              stroke="rgba(251, 191, 36, 0.9)"
                              strokeWidth="2.5"
                              strokeLinecap="round"
                              markerEnd="url(#arrowhead)"
                              filter="url(#glow)"
                            />
                          </motion.g>
                        )
                      })}
                    </motion.svg>
                  )}
                </AnimatePresence>

                {/* Pupil positions */}
                {displayedPositions.map((pos, index) => {
                  const assignedPlayer = getPlayerForPosition(pos.id)
                  const isSelected = selectedPosition === pos.id
                  const isSwapTarget = swapMode && selectedPosition && selectedPosition !== pos.id
                  // Use displayed positions when in tactical phase, otherwise use base
                  const displayX = tacticalPhase ? (pos.displayX || pos.x) : pos.x
                  const displayY = tacticalPhase ? (pos.displayY || pos.y) : pos.y

                  const isDragging = draggingPositionId === pos.id

                  return (
                    <div
                      key={pos.id}
                      data-pos-id={pos.id}
                      className={`absolute flex flex-col items-center ${!tacticalPhase ? 'cursor-grab active:cursor-grabbing' : ''}`}
                      style={{
                        left: `${displayX}%`,
                        top: `${displayY}%`,
                        transform: `translate(-50%, -50%) scale(${isSelected ? 1.1 : isDragging ? 1.15 : 1})`,
                        zIndex: isDragging ? 50 : isSelected ? 20 : 1,
                        touchAction: 'none',
                        transition: isDragging ? 'none' : 'left 0.5s cubic-bezier(0.4, 0, 0.2, 1), top 0.5s cubic-bezier(0.4, 0, 0.2, 1), transform 0.2s ease',
                      }}
                      onPointerDown={!tacticalPhase ? (e) => handlePointerDown(e, pos.id, pos.x, pos.y) : undefined}
                    >
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          if (justFinishedDragRef.current || draggingPositionId) return
                          handlePositionClick(pos.id)
                        }}
                        className={`
                          w-11 h-11 rounded-full
                          flex items-center justify-center text-sm font-bold
                          shadow-lg select-none pointer-events-auto
                          transition-transform hover:scale-105 active:scale-95
                          ${isSelected
                            ? 'ring-4 ring-yellow-400'
                            : isSwapTarget && assignedPlayer
                              ? 'ring-2 ring-energy-400/60 hover:ring-energy-400'
                              : ''
                          }
                          ${assignedPlayer
                            ? 'bg-white text-navy-900'
                            : 'bg-white/90 text-navy-600 border-2 border-dashed border-navy-400'
                          }
                        `}
                        title={
                          swapMode && isSwapTarget && assignedPlayer
                            ? `Click to swap with ${assignedPlayer.name}`
                            : assignedPlayer
                              ? `${assignedPlayer.name} - Click to swap/move`
                              : `Assign pupil to ${pos.label}`
                        }
                      >
                        {assignedPlayer?.squad_number || ''}
                      </button>

                      {/* Pupil name below circle */}
                      <span
                        className="mt-1 text-[10px] font-medium text-white text-center px-1.5 py-0.5 rounded bg-black/50 backdrop-blur-sm whitespace-nowrap max-w-[70px] truncate select-none"
                      >
                        {assignedPlayer ? formatPlayerName(assignedPlayer.name) : pos.label}
                      </span>
                    </div>
                  )
                })}

              </div>

              <p className="text-sm text-navy-500 mt-4 text-center">
                {tacticalPhase
                  ? `Viewing ${tacticalPhase === PHASES.IN_POSSESSION ? 'attacking' : tacticalPhase === PHASES.OUT_OF_POSSESSION ? 'defensive' : 'transition'} shape. Drag ball to see position shifts.`
                  : swapMode && selectedPosition
                    ? 'Click another pupil to swap positions, or an empty position to move them'
                    : selectedPosition
                      ? 'Select a pupil from the list to assign them'
                      : 'Click a position to assign/swap pupils, drag to reposition'
                }
              </p>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Squad */}
            <div className="card p-4">
              <h2 className="font-display font-semibold text-white mb-4 flex items-center gap-2">
                <Users className="w-5 h-5 text-pitch-400" />
                Available Players
              </h2>

              <div className="space-y-1 max-h-72 overflow-y-auto">
                {pupils.length > 0 ? pupils.map(pupil => {
                  const isAssigned = assignedPlayerIds.includes(pupil.id)
                  const isBench = benchPlayerIds.includes(pupil.id)
                  const assignedPosition = positions.find(p => p.pupilId === pupil.id)

                  return (
                    <div
                      key={pupil.id}
                      onClick={() => !isAssigned && selectedPosition && assignPlayerToPosition(pupil.id)}
                      className={`
                        flex items-center gap-3 p-2 rounded-lg text-sm transition-all
                        ${isAssigned
                          ? 'bg-pitch-500/20 border border-pitch-500/30'
                          : isBench
                            ? 'bg-energy-500/10 border border-energy-500/30'
                            : selectedPosition
                              ? 'bg-navy-800/50 cursor-pointer hover:bg-navy-700/50 border border-transparent hover:border-pitch-500/50'
                              : 'bg-navy-800/50 border border-transparent'
                        }
                      `}
                    >
                      <div className={`
                        w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold
                        ${isAssigned ? 'bg-pitch-500 text-white' : isBench ? 'bg-energy-500 text-white' : 'bg-navy-700 text-navy-300'}
                      `}>
                        {pupil.squad_number || '-'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className={isAssigned ? 'text-white' : isBench ? 'text-white' : 'text-navy-300'}>
                          {pupil.name}
                        </span>
                        {isAssigned && assignedPosition && (
                          <span className="ml-2 text-xs text-pitch-400">
                            ({assignedPosition.label})
                          </span>
                        )}
                        {isBench && !isAssigned && (
                          <span className="ml-2 text-xs text-energy-400">
                            (Sub)
                          </span>
                        )}
                      </div>
                      {isAssigned ? (
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            removePlayerFromPosition(assignedPosition.id)
                          }}
                          className="p-1 text-navy-400 hover:text-alert-400 transition-colors"
                          title="Remove from position"
                        >
                          <UserMinus className="w-4 h-4" />
                        </button>
                      ) : (
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            toggleBenchPlayer(pupil.id)
                          }}
                          className={`p-1 transition-colors ${isBench ? 'text-energy-400 hover:text-energy-300' : 'text-navy-500 hover:text-energy-400'}`}
                          title={isBench ? 'Remove from bench' : 'Add to bench'}
                        >
                          <ArrowRightLeft className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  )
                }) : (
                  <p className="text-navy-500 text-sm">No pupils added yet</p>
                )}
              </div>

              {pupils.length > 0 && (
                <div className="mt-3 space-y-1">
                  <p className="text-xs text-navy-500">
                    {assignedPlayerIds.length} of {positions.length} starting &middot; {benchPlayerIds.filter(id => !assignedPlayerIds.includes(id)).length} on bench
                  </p>
                  <p className="text-xs text-navy-600">
                    Click <ArrowRightLeft className="w-3 h-3 inline" /> to toggle bench
                  </p>
                </div>
              )}
            </div>

            {/* Substitution Planner */}
            <div className="card p-4">
              <h2 className="font-display font-semibold text-white mb-4 flex items-center gap-2">
                <ArrowRightLeft className="w-5 h-5 text-energy-400" />
                Substitutions
              </h2>

              {plannedSubs.length > 0 ? (
                <div className="space-y-2 mb-4">
                  {plannedSubs.map(sub => {
                    const playerOff = getPlayerById(sub.playerOffId)
                    const playerOn = getPlayerById(sub.playerOnId)
                    return (
                      <div key={sub.id} className="flex items-center gap-2 p-2 bg-navy-800/50 rounded-lg text-sm">
                        <span className="text-energy-400 font-medium w-10">{sub.minute}'</span>
                        <div className="flex-1 flex items-center gap-1">
                          <span className="text-alert-400">{playerOff?.squad_number || '?'}</span>
                          <ArrowRightLeft className="w-3 h-3 text-navy-500" />
                          <span className="text-pitch-400">{playerOn?.squad_number || '?'}</span>
                          <span className="text-navy-400 text-xs ml-1 truncate">
                            {formatPlayerName(playerOff?.name)} / {formatPlayerName(playerOn?.name)}
                          </span>
                        </div>
                        <button
                          onClick={() => removePlannedSub(sub.id)}
                          className="p-1 text-navy-500 hover:text-alert-400"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <p className="text-navy-500 text-sm mb-4">No substitutions planned</p>
              )}

              <button
                onClick={() => setShowSubPlanner(true)}
                className="btn-secondary btn-sm w-full"
              >
                <Plus className="w-4 h-4" />
                Plan Substitutions
              </button>
            </div>

            {/* Set Piece Takers */}
            <div className="card p-4">
              <h2 className="font-display font-semibold text-white mb-4 flex items-center gap-2">
                <Swords className="w-5 h-5 text-energy-400" />
                Set Piece Takers
              </h2>
              <div className="space-y-3">
                {(sportConfig.setPieceRoles || [
                  { key: 'corners_left', label: 'Corners (Left Side)', hasFoot: true },
                  { key: 'corners_right', label: 'Corners (Right Side)', hasFoot: true },
                  { key: 'free_kicks', label: 'Free Kicks' },
                  { key: 'penalties', label: 'Penalties' },
                  { key: 'throw_ins_long', label: 'Long Throw-ins' },
                ]).map(({ key, label, hasFoot }) => (
                  <div key={key}>
                    <label className="text-xs text-navy-400 block mb-1">{label}</label>
                    <div className={hasFoot ? 'flex gap-2' : ''}>
                      <select
                        value={setPieceTakers[key] || ''}
                        onChange={(e) => setSetPieceTakers(prev => ({ ...prev, [key]: e.target.value }))}
                        className={`input input-sm ${hasFoot ? 'flex-1' : 'w-full'}`}
                      >
                        <option value="">Not assigned</option>
                        {pupils.map(p => (
                          <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                      </select>
                      {hasFoot && (
                        <select
                          value={setPieceTakers[`${key}_foot`] || ''}
                          onChange={(e) => setSetPieceTakers(prev => ({ ...prev, [`${key}_foot`]: e.target.value }))}
                          className="input input-sm w-24"
                        >
                          <option value="">Foot</option>
                          <option value="left">Left</option>
                          <option value="right">Right</option>
                        </select>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Tactical Shape Controls - only for sports that support phases */}
            {supportsPhases && <div className="card p-4">
              <h2 className="font-display font-semibold text-white mb-4 flex items-center gap-2">
                <Shield className="w-5 h-5 text-alert-400" />
                Tactical Shape
              </h2>

              <div className="space-y-4">
                {/* Defensive Line */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm text-navy-400">Defensive Line</label>
                    <span className="text-xs text-navy-500">
                      {tacticalSettings.defensiveLine < 35 ? 'Deep' : tacticalSettings.defensiveLine > 65 ? 'High' : 'Medium'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <ChevronDown className="w-4 h-4 text-navy-500" />
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={tacticalSettings.defensiveLine}
                      onChange={(e) => setTacticalSettings(s => ({ ...s, defensiveLine: parseInt(e.target.value) }))}
                      className="flex-1 h-2 bg-navy-700 rounded-lg appearance-none cursor-pointer accent-alert-500"
                    />
                    <ChevronUp className="w-4 h-4 text-navy-500" />
                  </div>
                </div>

                {/* Compactness */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm text-navy-400">Compactness</label>
                    <span className="text-xs text-navy-500">
                      {tacticalSettings.compactness < 35 ? 'Spread' : tacticalSettings.compactness > 65 ? 'Compact' : 'Balanced'}
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={tacticalSettings.compactness}
                    onChange={(e) => setTacticalSettings(s => ({ ...s, compactness: parseInt(e.target.value) }))}
                    className="w-full h-2 bg-navy-700 rounded-lg appearance-none cursor-pointer accent-energy-500"
                  />
                </div>

                {/* Attacking Width */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm text-navy-400">Width (Attack)</label>
                    <span className="text-xs text-navy-500">
                      {tacticalSettings.attackingWidth < 35 ? 'Narrow' : tacticalSettings.attackingWidth > 65 ? 'Wide' : 'Normal'}
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={tacticalSettings.attackingWidth}
                    onChange={(e) => setTacticalSettings(s => ({ ...s, attackingWidth: parseInt(e.target.value) }))}
                    className="w-full h-2 bg-navy-700 rounded-lg appearance-none cursor-pointer accent-pitch-500"
                  />
                </div>

                {/* Defensive Width */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm text-navy-400">Width (Defense)</label>
                    <span className="text-xs text-navy-500">
                      {tacticalSettings.defensiveWidth < 35 ? 'Narrow' : tacticalSettings.defensiveWidth > 65 ? 'Wide' : 'Normal'}
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={tacticalSettings.defensiveWidth}
                    onChange={(e) => setTacticalSettings(s => ({ ...s, defensiveWidth: parseInt(e.target.value) }))}
                    className="w-full h-2 bg-navy-700 rounded-lg appearance-none cursor-pointer accent-alert-500"
                  />
                </div>

                {/* Pressing Trigger Zone */}
                <div>
                  <label className="text-sm text-navy-400 block mb-2">Pressing Trigger</label>
                  <div className="flex gap-2">
                    {['high', 'mid', 'low'].map((zone) => (
                      <button
                        key={zone}
                        onClick={() => setTacticalSettings(s => ({ ...s, pressingTriggerZone: zone }))}
                        className={`flex-1 px-2 py-1.5 rounded-lg text-xs font-medium transition-all capitalize ${
                          tacticalSettings.pressingTriggerZone === zone
                            ? zone === 'high' ? 'bg-alert-500 text-white' :
                              zone === 'mid' ? 'bg-energy-500 text-white' :
                              'bg-pitch-500 text-white'
                            : 'bg-navy-800/50 text-navy-400 hover:bg-navy-700/50'
                        }`}
                      >
                        {zone}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <p className="text-xs text-navy-500 mt-4">
                Select a tactical phase to see these settings applied on the pitch
              </p>
            </div>}

            {/* Game Model Summary */}
            <div className="card p-4">
              <h2 className="font-display font-semibold text-white mb-4 flex items-center gap-2">
                <Target className="w-5 h-5 text-energy-400" />
                Game Model
              </h2>

              <div className="space-y-3 text-sm">
                <div>
                  <span className="text-navy-400">Style:</span>
                  <span className="ml-2 text-white">{gameModel.style || 'Not set'}</span>
                </div>
                <div>
                  <span className="text-navy-400">Build-up:</span>
                  <span className="ml-2 text-white">{gameModel.buildUp || 'Not set'}</span>
                </div>
                <div>
                  <span className="text-navy-400">Pressing:</span>
                  <span className="ml-2 text-white">{gameModel.pressing || 'Not set'}</span>
                </div>
                <div>
                  <span className="text-navy-400">In possession:</span>
                  <span className="ml-2 text-white">{gameModel.inPossession || 'Not set'}</span>
                </div>
                <div>
                  <span className="text-navy-400">Out of possession:</span>
                  <span className="ml-2 text-white">{gameModel.outOfPossession || 'Not set'}</span>
                </div>
              </div>

              <button
                onClick={() => setShowGameModel(true)}
                className="btn-secondary btn-sm w-full mt-4"
              >
                Edit Game Model
              </button>
            </div>

            {/* Playing Time Calculator */}
            {pupils.length > 0 && (
              <PlayingTimeCalculator
                squad={pupils.map(p => ({ ...p, selected: true }))}
                teamFormat={teamFormat}
                formation={formation}
                formationPositions={positions}
                teamName={team?.name}
              />
            )}
          </div>
        </div>
      </div>

      {/* Game Model Modal */}
      <AnimatePresence>
        {showGameModel && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="modal-overlay"
            onClick={() => setShowGameModel(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="modal-content max-w-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6 border-b border-navy-800 flex items-center justify-between">
                <h2 className="font-display text-xl font-semibold text-white">Edit Game Model</h2>
                <button
                  onClick={() => setShowGameModel(false)}
                  className="p-2 text-navy-400 hover:text-white transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 space-y-5 max-h-[60vh] overflow-y-auto">
                <div>
                  <label className="label">Playing Style</label>
                  <select
                    value={gameModel.style}
                    onChange={(e) => setGameModel({ ...gameModel, style: e.target.value })}
                    className="input"
                  >
                    <option value="">Select style...</option>
                    {gameModelOptions.style.map(opt => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="label">Build-up Play</label>
                  <select
                    value={gameModel.buildUp}
                    onChange={(e) => setGameModel({ ...gameModel, buildUp: e.target.value })}
                    className="input"
                  >
                    <option value="">Select build-up...</option>
                    {gameModelOptions.buildUp.map(opt => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="label">Pressing Strategy</label>
                  <select
                    value={gameModel.pressing}
                    onChange={(e) => setGameModel({ ...gameModel, pressing: e.target.value })}
                    className="input"
                  >
                    <option value="">Select pressing...</option>
                    {gameModelOptions.pressing.map(opt => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="label">In Possession</label>
                  <select
                    value={gameModel.inPossession}
                    onChange={(e) => setGameModel({ ...gameModel, inPossession: e.target.value })}
                    className="input"
                  >
                    <option value="">Select approach...</option>
                    {gameModelOptions.inPossession.map(opt => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="label">Out of Possession</label>
                  <select
                    value={gameModel.outOfPossession}
                    onChange={(e) => setGameModel({ ...gameModel, outOfPossession: e.target.value })}
                    className="input"
                  >
                    <option value="">Select approach...</option>
                    {gameModelOptions.outOfPossession.map(opt => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="label">Additional Notes</label>
                  <textarea
                    value={gameModel.notes || ''}
                    onChange={(e) => setGameModel({ ...gameModel, notes: e.target.value })}
                    className="input min-h-[100px] resize-none"
                    placeholder="Key principles, set pieces, specific instructions..."
                  />
                </div>
              </div>

              <div className="p-6 border-t border-navy-800 flex justify-end gap-3">
                <button
                  onClick={() => setShowGameModel(false)}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveGameModel}
                  disabled={saving}
                  className="btn-primary"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Save Game Model
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Substitution Planner Modal */}
      <AnimatePresence>
        {showSubPlanner && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="modal-overlay"
            onClick={() => setShowSubPlanner(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="modal-content max-w-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6 border-b border-navy-800 flex items-center justify-between">
                <h2 className="font-display text-xl font-semibold text-white">Plan Substitutions</h2>
                <button
                  onClick={() => setShowSubPlanner(false)}
                  className="p-2 text-navy-400 hover:text-white transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 space-y-6 max-h-[60vh] overflow-y-auto">
                {/* Add new substitution */}
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-white">Add Substitution</h3>

                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="label">Minute</label>
                      <div className="relative">
                        <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-navy-500" />
                        <input
                          type="number"
                          min="1"
                          max="120"
                          value={newSub.minute}
                          onChange={(e) => setNewSub({ ...newSub, minute: e.target.value })}
                          className="input pl-9"
                          placeholder="45"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="label">Pupil Off</label>
                      <select
                        value={newSub.playerOffId}
                        onChange={(e) => setNewSub({ ...newSub, playerOffId: e.target.value })}
                        className="input"
                      >
                        <option value="">Select...</option>
                        {getStartingPlayers().map(pupil => (
                          <option key={pupil.id} value={pupil.id}>
                            {pupil.squad_number} - {formatPlayerName(pupil.name)}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="label">Pupil On</label>
                      <select
                        value={newSub.playerOnId}
                        onChange={(e) => setNewSub({ ...newSub, playerOnId: e.target.value })}
                        className="input"
                      >
                        <option value="">Select...</option>
                        {getBenchPlayers().map(pupil => (
                          <option key={pupil.id} value={pupil.id}>
                            {pupil.squad_number} - {formatPlayerName(pupil.name)}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="label">Notes (optional)</label>
                    <input
                      type="text"
                      value={newSub.notes}
                      onChange={(e) => setNewSub({ ...newSub, notes: e.target.value })}
                      className="input"
                      placeholder="e.g., Fresh legs for final 30 mins"
                    />
                  </div>

                  <button
                    onClick={addPlannedSub}
                    className="btn-secondary btn-sm"
                  >
                    <Plus className="w-4 h-4" />
                    Add to Plan
                  </button>
                </div>

                {/* Planned substitutions list */}
                {plannedSubs.length > 0 && (
                  <div className="space-y-3">
                    <h3 className="text-sm font-semibold text-white">Planned Substitutions</h3>

                    <div className="space-y-2">
                      {plannedSubs.map(sub => {
                        const playerOff = getPlayerById(sub.playerOffId)
                        const playerOn = getPlayerById(sub.playerOnId)
                        return (
                          <div key={sub.id} className="flex items-center gap-3 p-3 bg-navy-800/50 rounded-lg">
                            <div className="w-12 h-12 bg-energy-500/20 rounded-lg flex items-center justify-center">
                              <span className="text-energy-400 font-bold text-lg">{sub.minute}'</span>
                            </div>

                            <div className="flex-1">
                              <div className="flex items-center gap-2 text-sm">
                                <span className="text-alert-400 font-medium">
                                  {playerOff?.squad_number} {playerOff?.name}
                                </span>
                                <ArrowRightLeft className="w-4 h-4 text-navy-500" />
                                <span className="text-pitch-400 font-medium">
                                  {playerOn?.squad_number} {playerOn?.name}
                                </span>
                              </div>
                              {sub.notes && (
                                <p className="text-xs text-navy-400 mt-1">{sub.notes}</p>
                              )}
                            </div>

                            <button
                              onClick={() => removePlannedSub(sub.id)}
                              className="p-2 text-navy-500 hover:text-alert-400 transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}

                {/* Bench pupils info */}
                <div className="space-y-2">
                  <h3 className="text-sm font-semibold text-white">Bench</h3>
                  <div className="flex flex-wrap gap-2">
                    {getBenchPlayers().length > 0 ? getBenchPlayers().map(pupil => (
                      <span key={pupil.id} className="px-2 py-1 bg-energy-500/20 text-energy-400 rounded text-xs">
                        {pupil.squad_number} {formatPlayerName(pupil.name)}
                      </span>
                    )) : (
                      <span className="text-navy-500 text-sm">No subs selected. Use the <ArrowRightLeft className="w-3 h-3 inline" /> button in Available Players to add subs.</span>
                    )}
                  </div>
                </div>
              </div>

              <div className="p-6 border-t border-navy-800 flex justify-end gap-3">
                <button
                  onClick={() => setShowSubPlanner(false)}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveSubs}
                  disabled={saving}
                  className="btn-primary"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Save Plan
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Save Custom Formation Modal */}
      <AnimatePresence>
        {showSaveFormation && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="modal-overlay"
            onClick={() => setShowSaveFormation(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="modal-content max-w-md"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6 border-b border-navy-800 flex items-center justify-between">
                <h2 className="font-display text-xl font-semibold text-white flex items-center gap-2">
                  <Bookmark className="w-5 h-5 text-energy-400" />
                  Save Custom Formation
                </h2>
                <button
                  onClick={() => setShowSaveFormation(false)}
                  className="p-2 text-navy-400 hover:text-white transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 space-y-4">
                <p className="text-sm text-navy-400">
                  Save the current pupil positions as a custom formation you can reuse later.
                </p>

                <div>
                  <label className="label">Formation Name</label>
                  <input
                    type="text"
                    value={newFormationName}
                    onChange={(e) => setNewFormationName(e.target.value)}
                    className="input"
                    placeholder="e.g., Attack Mode, vs Strong Teams"
                    maxLength={30}
                    onKeyDown={(e) => e.key === 'Enter' && handleSaveCustomFormation()}
                  />
                </div>

                {customFormations.length > 0 && (
                  <div>
                    <p className="text-xs text-navy-500 mb-2">Your saved formations:</p>
                    <div className="flex flex-wrap gap-2">
                      {customFormations.map(cf => (
                        <span key={cf.id} className="px-2 py-1 bg-navy-700 rounded text-xs text-navy-300">
                          {cf.name}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="p-6 border-t border-navy-800 flex justify-end gap-3">
                <button
                  onClick={() => {
                    setShowSaveFormation(false)
                    setNewFormationName('')
                  }}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveCustomFormation}
                  disabled={!newFormationName.trim()}
                  className="btn-primary"
                >
                  <BookmarkPlus className="w-4 h-4" />
                  Save Formation
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {showPrintView && (
        <TacticsPrintView
          onClose={() => setShowPrintView(false)}
          positions={positions}
          pupils={pupils}
          formation={formation}
          teamFormat={activeFormat}
          sport={sportKey}
          teamName={team?.name}
          ageGroup={team?.age_group}
          logoUrl={team?.logo_url}
          gameModel={gameModel}
          benchPlayers={benchPlayerIds}
          setPieceTakers={setPieceTakers}
        />
      )}
    </div>
  )
}
