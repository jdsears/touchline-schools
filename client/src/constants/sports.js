// Canonical list of sports the platform supports.
// Mirrors SUPPORTED_SPORTS in server/services/sportKnowledge.js — keep in sync.
export const SUPPORTED_SPORTS = [
  'football', 'rugby', 'cricket', 'hockey', 'netball',
  'athletics', 'basketball', 'swimming', 'gymnastics', 'tennis',
  'badminton', 'rounders', 'dance', 'volleyball', 'cross-country',
]

export const SPORT_LABELS = {
  football: 'Football',
  rugby: 'Rugby',
  cricket: 'Cricket',
  hockey: 'Hockey',
  netball: 'Netball',
  athletics: 'Athletics',
  basketball: 'Basketball',
  swimming: 'Swimming',
  gymnastics: 'Gymnastics',
  tennis: 'Tennis',
  badminton: 'Badminton',
  rounders: 'Rounders',
  dance: 'Dance',
  volleyball: 'Volleyball',
  'cross-country': 'Cross Country',
}

export function sportLabel(sport) {
  if (!sport) return ''
  return SPORT_LABELS[sport] || sport.charAt(0).toUpperCase() + sport.slice(1)
}
