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

// Sport-specific result detail schemas. null = plain score is enough.
// types: 'innings' (per-side fields), 'event-list' / 'score-list' /
// 'rubber-list' / 'set-list' (row-based with columns)
export const RESULT_SCHEMAS = {
  cricket: {
    type: 'innings',
    fields: [
      { key: 'runs', label: 'Runs', type: 'number' },
      { key: 'wickets', label: 'Wickets', type: 'number' },
      { key: 'overs', label: 'Overs', type: 'text', placeholder: 'e.g. 20' },
    ],
    summarise: (side) => side?.runs != null ? `${side.runs}${side.wickets != null ? `/${side.wickets}` : ''}${side.overs ? ` (${side.overs} ov)` : ''}` : null,
  },
  rounders: {
    type: 'innings',
    fields: [
      { key: 'rounders', label: 'Rounders', type: 'number', step: '0.5' },
    ],
    summarise: (side) => side?.rounders != null ? `${side.rounders} rounders` : null,
  },
  athletics: {
    type: 'event-list',
    rowsLabel: 'Event results',
    columns: [
      { key: 'event', label: 'Event', type: 'text', placeholder: '100m / Long jump' },
      { key: 'pupil', label: 'Athlete', type: 'text' },
      { key: 'result', label: 'Result', type: 'text', placeholder: '13.2s / 4.10m' },
      { key: 'position', label: 'Pos', type: 'text', placeholder: '1st' },
    ],
  },
  swimming: {
    type: 'event-list',
    rowsLabel: 'Race results',
    columns: [
      { key: 'event', label: 'Event', type: 'text', placeholder: '50m Freestyle' },
      { key: 'pupil', label: 'Swimmer', type: 'text' },
      { key: 'result', label: 'Time', type: 'text', placeholder: '34.5s' },
      { key: 'position', label: 'Pos', type: 'text', placeholder: '2nd' },
    ],
  },
  'cross-country': {
    type: 'event-list',
    rowsLabel: 'Finishers',
    columns: [
      { key: 'pupil', label: 'Runner', type: 'text' },
      { key: 'result', label: 'Time', type: 'text', placeholder: '14:02' },
      { key: 'position', label: 'Pos', type: 'text', placeholder: '5th' },
    ],
  },
  gymnastics: {
    type: 'score-list',
    rowsLabel: 'Scores',
    columns: [
      { key: 'item', label: 'Apparatus / Routine', type: 'text', placeholder: 'Floor' },
      { key: 'pupil', label: 'Gymnast', type: 'text' },
      { key: 'score', label: 'Score', type: 'text', placeholder: '8.4' },
    ],
  },
  dance: {
    type: 'score-list',
    rowsLabel: 'Pieces',
    columns: [
      { key: 'item', label: 'Piece', type: 'text' },
      { key: 'score', label: 'Score / Award', type: 'text' },
    ],
  },
  tennis: {
    type: 'rubber-list',
    rowsLabel: 'Rubbers',
    columns: [
      { key: 'pairing', label: 'Rubber', type: 'text', placeholder: '1st singles' },
      { key: 'score', label: 'Score', type: 'text', placeholder: '6-3 6-4' },
    ],
  },
  badminton: {
    type: 'rubber-list',
    rowsLabel: 'Rubbers',
    columns: [
      { key: 'pairing', label: 'Rubber', type: 'text', placeholder: '1st singles' },
      { key: 'score', label: 'Score', type: 'text', placeholder: '21-15 21-18' },
    ],
  },
  volleyball: {
    type: 'set-list',
    rowsLabel: 'Sets',
    columns: [
      { key: 'set', label: 'Set', type: 'text', placeholder: 'Set 1' },
      { key: 'score', label: 'Score', type: 'text', placeholder: '25-21' },
    ],
  },
}

export function getResultSchema(sport) {
  return RESULT_SCHEMAS[sport] || null
}
