// Sport-aware reading of a match result. score_for / score_against stay
// the generic headline numbers (goals, points, runs, rubbers, sets…); the
// vocabulary and the richer breakdown in matches.result_data come from
// here so no page has to assume football.
import { getResultSchema } from '../constants/sports'

export const SCORE_VOCAB = {
  football: { unit: 'goals', singular: 'goal' },
  hockey: { unit: 'goals', singular: 'goal' },
  netball: { unit: 'goals', singular: 'goal' },
  rugby: { unit: 'points', singular: 'point' },
  basketball: { unit: 'points', singular: 'point' },
  cricket: { unit: 'runs', singular: 'run', innings: true, inningsKey: 'runs' },
  rounders: { unit: 'rounders', singular: 'rounder', innings: true, inningsKey: 'rounders', step: 0.5 },
  tennis: { unit: 'rubbers', singular: 'rubber', headline: 'Rubbers won' },
  badminton: { unit: 'rubbers', singular: 'rubber', headline: 'Rubbers won' },
  volleyball: { unit: 'sets', singular: 'set', headline: 'Sets won' },
  athletics: { unit: 'points', singular: 'point', teamPoints: true },
  swimming: { unit: 'points', singular: 'point', teamPoints: true },
  'cross-country': { unit: 'points', singular: 'point', teamPoints: true, lowerIsBetter: true },
  gymnastics: { unit: 'points', singular: 'point', teamPoints: true },
  dance: { unit: 'points', singular: 'point', teamPoints: true },
}

const DEFAULT_VOCAB = { unit: 'goals', singular: 'goal' }

export const OUTCOME_LABEL = { W: 'Win', L: 'Loss', D: 'Draw' }

export function scoreVocab(sport) {
  return SCORE_VOCAB[String(sport || '').toLowerCase()] || DEFAULT_VOCAB
}

export function unitLabel(sport, n) {
  const v = scoreVocab(sport)
  return Number(n) === 1 ? v.singular : v.unit
}

// Label for the headline number the teacher types in.
export function headlineLabel(sport) {
  const v = scoreVocab(sport)
  if (v.headline) return v.headline
  if (v.teamPoints) return 'Team points (optional)'
  return v.unit.charAt(0).toUpperCase() + v.unit.slice(1)
}

export function hasRecordedResult(match) {
  return match != null && match.score_for != null && match.score_against != null
}

// W / L / D from our perspective, or null without a result. Cross-country
// style team points count low as good.
export function resultOutcome(match, sport) {
  if (!hasRecordedResult(match)) return null
  const us = Number(match.score_for), them = Number(match.score_against)
  if (!Number.isFinite(us) || !Number.isFinite(them)) return null
  if (us === them) return 'D'
  const usWins = scoreVocab(sport).lowerIsBetter ? us < them : us > them
  return usWins ? 'W' : 'L'
}

function inningsSide(side, vocab) {
  if (!side) return null
  const main = side[vocab.inningsKey]
  if (main == null || main === '') return null
  if (vocab.inningsKey === 'runs') return `${main}${side.wickets != null && side.wickets !== '' ? `/${side.wickets}` : ''}`
  return String(main)
}

// "2–1" from our perspective by default; `order: 'home-first'` flips it for
// scoreboard layouts. Innings sports show runs/wickets when recorded.
export function scoreline(match, sport, { order = 'us-first', separator = '–' } = {}) {
  if (!hasRecordedResult(match)) return null
  const vocab = scoreVocab(sport)
  let us = String(match.score_for)
  let them = String(match.score_against)
  if (vocab.innings && match.result_data) {
    us = inningsSide(match.result_data.for, vocab) || us
    them = inningsSide(match.result_data.against, vocab) || them
  }
  const homeFirst = order === 'home-first' && match.home_away !== 'home'
  return homeFirst ? `${them} ${separator} ${us}` : `${us} ${separator} ${them}`
}

// Short badge text such as "W 27–17" or "D 2–2".
export function resultBadgeText(match, sport) {
  const outcome = resultOutcome(match, sport)
  if (!outcome) return null
  return `${outcome} ${scoreline(match, sport)}`
}

// One-line sentence for summaries: "Won 27–17 (points)", "Lost 98/9 – 120/4 (runs)".
export function resultSentence(match, sport) {
  const outcome = resultOutcome(match, sport)
  if (!outcome) return null
  const verb = { W: 'Won', L: 'Lost', D: 'Drew' }[outcome]
  const v = scoreVocab(sport)
  return `${verb} ${scoreline(match, sport)}${v.unit === 'goals' ? '' : ` (${v.unit})`}`
}

// Whether the sport carries a structured breakdown (innings, events, rubbers…)
export function hasDetailSchema(sport) {
  return !!getResultSchema(String(sport || '').toLowerCase())
}

// For innings sports the headline number is derived from the innings block
// when the teacher fills that in instead of the plain score.
export function headlineFromDetails(sport, resultData) {
  const vocab = scoreVocab(sport)
  if (!vocab.innings || !resultData) return null
  const us = resultData.for?.[vocab.inningsKey]
  const them = resultData.against?.[vocab.inningsKey]
  if (us == null || them == null || us === '' || them === '') return null
  return { score_for: Number(us), score_against: Number(them) }
}
