import { FOOTBALL_DEF } from './football'
import { RUGBY_DEF } from './rugby'
import { HOCKEY_DEF } from './hockey'
import { NETBALL_DEF } from './netball'
import { CRICKET_DEF } from './cricket'

const SPORT_REGISTRY = {
  football: FOOTBALL_DEF,
  rugby: RUGBY_DEF,
  hockey: HOCKEY_DEF,
  netball: NETBALL_DEF,
  cricket: CRICKET_DEF,
}

export function getSportDef(sportId) {
  return SPORT_REGISTRY[sportId] || FOOTBALL_DEF
}

export function getAllSports() {
  return Object.values(SPORT_REGISTRY)
}

export function getFormatsForTeam(sportId, teamContext) {
  const sport = getSportDef(sportId)
  const validIds = sport.validFormatsFor(teamContext)
  return Object.entries(sport.formats).map(([id, fmt]) => ({
    ...fmt,
    enabled: validIds.includes(id),
    disabledNote: !validIds.includes(id) ? fmt.ageGradeRule?.notes || 'Not available for this year group' : null,
  }))
}

export function getPreset(sportId, formatId, presetId) {
  const sport = getSportDef(sportId)
  return sport.formats[formatId]?.presets?.[presetId] || null
}

export function getPresetsForFormat(sportId, formatId) {
  const sport = getSportDef(sportId)
  const fmt = sport.formats[formatId]
  if (!fmt?.presets) return []
  return Object.entries(fmt.presets).map(([id, p]) => ({ id, label: p.label }))
}

export function getDefaultPreset(sportId, formatId) {
  const sport = getSportDef(sportId)
  return sport.formats[formatId]?.defaultPresetId || null
}
