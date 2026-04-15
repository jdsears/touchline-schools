import FormationPitch from '../FormationPitch'
import RugbyPitch from './RugbyPitch'
import HockeyPitch from './HockeyPitch'
import NetballCourt from './NetballCourt'
import CricketField from './CricketField'

/**
 * Sport-aware pitch/field/court component.
 * Renders the correct playing area based on the sport prop.
 *
 * For football, delegates to the existing FormationPitch with all its
 * formation support. For other sports, renders the appropriate pitch
 * component with optional children for player position overlays.
 */
export default function SportPitch({ sport = 'football', size = 'medium', className = '', children, ...footballProps }) {
  switch (sport) {
    case 'rugby':
      return <RugbyPitch size={size} className={className}>{children}</RugbyPitch>
    case 'hockey':
      return <HockeyPitch size={size} className={className}>{children}</HockeyPitch>
    case 'netball':
      return <NetballCourt size={size} className={className}>{children}</NetballCourt>
    case 'cricket':
      return <CricketField size={size} className={className}>{children}</CricketField>
    case 'football':
    default:
      return <FormationPitch size={size} className={className} {...footballProps} />
  }
}

/**
 * Returns the sport-appropriate term for the playing area.
 */
export function getPlayingAreaName(sport) {
  const names = {
    football: 'Pitch',
    rugby: 'Pitch',
    hockey: 'Pitch',
    netball: 'Court',
    cricket: 'Field',
  }
  return names[sport] || 'Playing Area'
}

/**
 * Returns the sport-appropriate term for a game/match.
 */
export function getMatchName(sport) {
  const names = {
    football: 'Match',
    rugby: 'Match',
    hockey: 'Match',
    netball: 'Match',
    cricket: 'Match',
  }
  return names[sport] || 'Match'
}
