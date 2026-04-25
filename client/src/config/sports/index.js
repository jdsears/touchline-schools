import football from './football'
import rugby from './rugby'
import hockey from './hockey'
import netball from './netball'
import cricket from './cricket'

const sportConfigs = {
  football,
  rugby,
  hockey,
  netball,
  cricket,
}

export default sportConfigs

export { football, rugby, hockey, netball, cricket }

/**
 * Get sport config by key, falling back to football if unknown.
 */
export function getSportConfig(sport) {
  return sportConfigs[sport] || football
}

/**
 * Get available formations for a sport + format combination.
 */
export function getFormations(sport, format) {
  const config = getSportConfig(sport)
  return config.formationsByFormat[format] || []
}

/**
 * Get default formation for a sport + format.
 */
export function getDefaultFormation(sport, format) {
  const config = getSportConfig(sport)
  return config.defaultFormationByFormat[format] || null
}

/**
 * Get default positions for a sport + format + formation.
 */
export function getDefaultPositions(sport, format, formation) {
  const config = getSportConfig(sport)
  const byFormat = config.defaultPositionsByFormat[format] || {}
  return byFormat[formation] || []
}
