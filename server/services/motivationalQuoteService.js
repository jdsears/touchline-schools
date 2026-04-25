import { createHash } from 'crypto'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import path from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Load quotes once at startup
const quotesPath = path.join(__dirname, '../data/motivational-quotes.json')
const quotes = JSON.parse(readFileSync(quotesPath, 'utf-8'))

/**
 * Map a year group to an age band.
 *  Y2-Y6  -> young
 *  Y7-Y10 -> standard
 *  Y11-Y13 -> mature
 */
function ageBandFromYearGroup(yearGroup) {
  const y = parseInt(yearGroup, 10)
  if (isNaN(y)) return 'standard'
  if (y <= 6) return 'young'
  if (y <= 10) return 'standard'
  return 'mature'
}

/**
 * Get a deterministic quote for a pupil on a given date.
 *
 * Same pupil + same date = same quote all day.
 * Different pupil on the same date = (usually) different quote.
 * Same pupil on a different date = different quote.
 *
 * @param {string} pupilId - UUID
 * @param {string} date - ISO date string (YYYY-MM-DD)
 * @param {string|number} yearGroupOrBand - year group number or age band string
 * @returns {{ text: string, attribution: string }}
 */
export function getQuoteForPupil(pupilId, date, yearGroupOrBand) {
  const band = typeof yearGroupOrBand === 'string' && ['young', 'standard', 'mature'].includes(yearGroupOrBand)
    ? yearGroupOrBand
    : ageBandFromYearGroup(yearGroupOrBand)

  const pool = quotes[band] || quotes.standard
  if (pool.length === 0) return { text: '', attribution: '' }

  // Deterministic hash: SHA-256 of pupilId + date, take first 8 hex chars as integer
  const hash = createHash('sha256')
    .update(`${pupilId}:${date}`)
    .digest('hex')
  const index = parseInt(hash.substring(0, 8), 16) % pool.length

  const quote = pool[index]
  return { id: quote.id, text: quote.text, attribution: quote.attribution }
}

export { ageBandFromYearGroup }
