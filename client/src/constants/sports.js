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

// Emoji icons used in team/fixture lists
export const SPORT_ICONS = {
  football: '\u26BD',
  rugby: '\uD83C\uDFC9',
  cricket: '\uD83C\uDFCF',
  hockey: '\uD83C\uDFD1',
  netball: '\uD83E\uDD3E',
  athletics: '\uD83C\uDFC3',
  basketball: '\uD83C\uDFC0',
  swimming: '\uD83C\uDFCA',
  gymnastics: '\uD83E\uDD38',
  tennis: '\uD83C\uDFBE',
  badminton: '\uD83C\uDFF8',
  rounders: '\uD83E\uDD4E',
  dance: '\uD83D\uDC83',
  volleyball: '\uD83C\uDFD0',
  'cross-country': '\uD83C\uDFDE\uFE0F',
}

// Badge colour classes (literal Tailwind classes - do not construct dynamically)
export const SPORT_BADGE_CLASSES = {
  football: 'bg-brand-primary-tint text-brand-primary',
  rugby: 'bg-brand-accent-tint text-brand-accent',
  cricket: 'bg-status-info-tint text-status-info',
  hockey: 'bg-purple-500/20 text-purple-400',
  netball: 'bg-pink-500/20 text-pink-400',
  athletics: 'bg-status-warning-tint text-status-warning',
  basketball: 'bg-orange-500/20 text-orange-500',
  swimming: 'bg-status-info-tint text-status-info',
  gymnastics: 'bg-purple-500/20 text-purple-400',
  tennis: 'bg-status-success-tint text-status-success',
  badminton: 'bg-teal-500/20 text-teal-600',
  rounders: 'bg-pink-500/20 text-pink-400',
  dance: 'bg-purple-500/20 text-purple-400',
  volleyball: 'bg-brand-accent-tint text-brand-accent',
  'cross-country': 'bg-status-success-tint text-status-success',
}

export const DEFAULT_SPORT_BADGE = 'bg-subtle text-secondary'
