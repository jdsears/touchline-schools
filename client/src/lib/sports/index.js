import { FOOTBALL_DEF } from './football'
import { RUGBY_DEF } from './rugby'
import { HOCKEY_DEF } from './hockey'
import { NETBALL_DEF } from './netball'
import { CRICKET_DEF } from './cricket'
import { BASKETBALL_DEF } from './basketball'
import { VOLLEYBALL_DEF } from './volleyball'
import { ROUNDERS_DEF } from './rounders'
import { TENNIS_DEF } from './tennis'
import { BADMINTON_DEF } from './badminton'
import { ATHLETICS_DEF } from './athletics'
import { SWIMMING_DEF } from './swimming'
import { CROSS_COUNTRY_DEF } from './crossCountry'
import { GYMNASTICS_DEF } from './gymnastics'
import { DANCE_DEF } from './dance'
import { GENERIC_DEF } from './generic'

const SPORT_REGISTRY = {
  football: FOOTBALL_DEF,
  rugby: RUGBY_DEF,
  hockey: HOCKEY_DEF,
  netball: NETBALL_DEF,
  cricket: CRICKET_DEF,
  basketball: BASKETBALL_DEF,
  volleyball: VOLLEYBALL_DEF,
  rounders: ROUNDERS_DEF,
  tennis: TENNIS_DEF,
  badminton: BADMINTON_DEF,
  athletics: ATHLETICS_DEF,
  swimming: SWIMMING_DEF,
  'cross-country': CROSS_COUNTRY_DEF,
  'cross country': CROSS_COUNTRY_DEF,
  gymnastics: GYMNASTICS_DEF,
  dance: DANCE_DEF,
}

export function getSportDef(sportId) {
  // Unknown sports get a neutral squad-based definition, NOT football
  return SPORT_REGISTRY[sportId] || GENERIC_DEF
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
