/**
 * Dates for the demo seed, anchored on the day the seed runs.
 *
 * The demo has to look live whenever it is (re)seeded: the previous term
 * fully reported and assessed, an open reporting window with its deadline
 * still ahead, lessons on the timetable this week, and next term's units
 * already planned. Everything here derives from today's date in the
 * school's timezone rather than from hard-coded calendar dates.
 *
 * Term boundaries are an approximation of the English state-school
 * pattern (September to December, January to Easter, April to July); the
 * demo does not need the real Norfolk term dates, just plausible ones.
 */

import { londonToday } from '../../services/schoolTime.js'

const TERM_ORDER = ['autumn', 'spring', 'summer']
const LABEL = { autumn: 'Autumn', spring: 'Spring', summer: 'Summer' }

function pad(n) { return String(n).padStart(2, '0') }

// All arithmetic is done on UTC dates so the result never shifts with the
// server's local timezone. `iso()` renders back to YYYY-MM-DD.
function utc(year, month, day) { return new Date(Date.UTC(year, month - 1, day)) }
function parse(isoDate) {
  const [y, m, d] = isoDate.split('-').map(Number)
  return utc(y, m, d)
}
export function iso(date) {
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`
}
export function addDays(isoDate, days) {
  const d = parse(isoDate)
  d.setUTCDate(d.getUTCDate() + days)
  return iso(d)
}

function mondayOnOrAfter(year, month, day) {
  const d = utc(year, month, day)
  const shift = (8 - d.getUTCDay()) % 7 // 0 when already a Monday
  d.setUTCDate(d.getUTCDate() + shift)
  return iso(d)
}
function fridayOnOrBefore(year, month, day) {
  const d = utc(year, month, day)
  const shift = (d.getUTCDay() - 5 + 7) % 7 // 0 when already a Friday
  d.setUTCDate(d.getUTCDate() - shift)
  return iso(d)
}

// Academic year label in the format the app uses everywhere ('2026-27').
export function academicYearLabel(startYear) {
  return `${startYear}-${String(startYear + 1).slice(2)}`
}

// The three terms of the academic year that starts in September of `startYear`.
// `start`/`end` are teaching dates; `seasonStart`/`seasonEnd` partition the
// calendar so every day (holidays included) belongs to exactly one term.
function termsFor(startYear) {
  const next = startYear + 1
  return {
    autumn: {
      key: 'autumn', label: LABEL.autumn, year: startYear, academicYearStart: startYear,
      start: mondayOnOrAfter(startYear, 9, 2), end: fridayOnOrBefore(startYear, 12, 19),
      seasonStart: iso(utc(startYear, 9, 1)), seasonEnd: iso(utc(startYear, 12, 31)),
    },
    spring: {
      key: 'spring', label: LABEL.spring, year: next, academicYearStart: startYear,
      start: mondayOnOrAfter(next, 1, 4), end: fridayOnOrBefore(next, 3, 31),
      seasonStart: iso(utc(next, 1, 1)), seasonEnd: iso(utc(next, 4, 14)),
    },
    summer: {
      key: 'summer', label: LABEL.summer, year: next, academicYearStart: startYear,
      start: mondayOnOrAfter(next, 4, 15), end: fridayOnOrBefore(next, 7, 22),
      seasonStart: iso(utc(next, 4, 15)), seasonEnd: iso(utc(next, 8, 31)),
    },
  }
}

function decorate(term) {
  return {
    ...term,
    academicYear: academicYearLabel(term.academicYearStart),
    windowName: `${term.label} Report ${term.year}`,
  }
}

/**
 * Build the calendar the seed modules share.
 *
 * @param {string} [today] YYYY-MM-DD; defaults to today in Europe/London.
 * @returns {{
 *   today: string, academicYear: string, weekMonday: string,
 *   current: object, previous: object, next: object,
 * }}
 * Each term carries: key ('autumn' | 'spring' | 'summer'), label, year (the
 * calendar year the term starts in), academicYear ('2026-27'), start/end
 * (teaching dates) and windowName ('Autumn Report 2026').
 */
export function demoCalendar(today = londonToday()) {
  const [y, m] = today.split('-').map(Number)
  const startYear = m >= 9 ? y : y - 1
  const terms = termsFor(startYear)

  const currentKey = TERM_ORDER.find((k) => today >= terms[k].seasonStart && today <= terms[k].seasonEnd) || 'autumn'
  const idx = TERM_ORDER.indexOf(currentKey)
  const previous = idx === 0 ? termsFor(startYear - 1).summer : terms[TERM_ORDER[idx - 1]]
  const next = idx === 2 ? termsFor(startYear + 1).autumn : terms[TERM_ORDER[idx + 1]]

  // Monday of the current week: the anchor for this week's timetable.
  const d = parse(today)
  d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7))

  return {
    today,
    academicYear: academicYearLabel(startYear),
    weekMonday: iso(d),
    current: decorate(terms[currentKey]),
    previous: decorate(previous),
    next: decorate(next),
  }
}

// A plausible date of birth for a pupil in `yearGroup` this academic year.
// Year 7 pupils turn 12 during the year, so they were born between
// September (start year − 12) and August (start year − 11). Pass a
// month/day for a fixed birthday; otherwise one is picked at random.
export function dobForYearGroup(yearGroup, { month, day, today = londonToday() } = {}) {
  const [y, m] = today.split('-').map(Number)
  const startYear = m >= 9 ? y : y - 1
  const birthMonth = month || Math.floor(Math.random() * 12) + 1
  const birthDay = day || Math.floor(Math.random() * 28) + 1
  const birthYear = startYear - yearGroup - (birthMonth >= 9 ? 5 : 4)
  return `${birthYear}-${pad(birthMonth)}-${pad(birthDay)}`
}

// Weekday slot for a teaching group's weekly lesson, 0 = Monday. Spread so
// the department has a lesson every school day and the Head of PE (7A and
// 11 GCSE) teaches on two different days.
export const LESSON_WEEKDAY = {
  '7A PE': 0,
  '7B PE': 1,
  '9A PE': 2,
  '9B PE': 3,
  '11 GCSE PE': 4,
  'Y11 Core PE': 2,
}
