/**
 * Normalize player positions from JSONB format to simple string array.
 *
 * The database stores positions as JSONB: [{position: 'GK', priority: 'primary'}, ...]
 * The client expects a simple array: ['GK', 'CB', ...]
 *
 * This function handles both formats for backwards compatibility.
 */
export function normalizePositions(positions) {
  if (!positions) return []

  // If it's already an array of strings, return as-is
  if (Array.isArray(positions) && (positions.length === 0 || typeof positions[0] === 'string')) {
    return positions
  }

  // If it's an array of objects with position property, extract position strings
  // Sort by priority: primary first, then secondary, then tertiary
  if (Array.isArray(positions) && positions.length > 0 && typeof positions[0] === 'object') {
    const priorityOrder = { primary: 0, secondary: 1, tertiary: 2 }
    return positions
      .filter(p => p && p.position)
      .sort((a, b) => (priorityOrder[a.priority] ?? 99) - (priorityOrder[b.priority] ?? 99))
      .map(p => p.position)
  }

  return []
}

/**
 * Normalize a single player object's positions field.
 * Falls back to legacy `position` VARCHAR field if JSONB `positions` is empty.
 */
export function normalizePlayerPositions(player) {
  if (!player) return player
  let positions = normalizePositions(player.positions)

  // Fallback: if JSONB positions is empty but legacy position field has data, use it
  if (positions.length === 0 && player.position) {
    positions = [player.position.toUpperCase()]
  }

  return {
    ...player,
    positions,
  }
}

/**
 * Normalize an array of player objects
 */
export function normalizePlayersPositions(players) {
  if (!Array.isArray(players)) return players
  return players.map(normalizePlayerPositions)
}
