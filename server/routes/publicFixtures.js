import { Router } from 'express'
import pool from '../config/database.js'

const router = Router()

function safeName(fullName, format) {
  if (!fullName) return ''
  if (format === 'full') return fullName
  const parts = fullName.trim().split(' ')
  if (parts.length < 2) return parts[0]
  return `${parts[0]} ${parts[parts.length - 1][0]}.`
}

router.get('/:slug', async (req, res, next) => {
  try {
    const school = await pool.query(
      `SELECT id, name, slug, logo_url, primary_color, secondary_color, public_fixtures_enabled, public_name_format
       FROM schools WHERE slug = $1`, [req.params.slug]
    )
    if (!school.rows.length) return res.status(404).json({ error: 'School not found' })
    const s = school.rows[0]
    if (!s.public_fixtures_enabled) return res.status(403).json({ error: 'Public fixtures not enabled for this school' })

    const teams = await pool.query(
      `SELECT id, name, sport, age_group, gender FROM teams
       WHERE school_id = $1 AND is_public = true ORDER BY sport, name`,
      [s.id]
    )

    res.json({
      school: { name: s.name, slug: s.slug, logoUrl: s.logo_url, primaryColor: s.primary_color, secondaryColor: s.secondary_color },
      teams: teams.rows,
    })
  } catch (error) { next(error) }
})

router.get('/:slug/fixtures', async (req, res, next) => {
  try {
    const school = await pool.query(
      'SELECT id, public_fixtures_enabled, public_name_format FROM schools WHERE slug = $1',
      [req.params.slug]
    )
    if (!school.rows.length) return res.status(404).json({ error: 'School not found' })
    const s = school.rows[0]
    if (!s.public_fixtures_enabled) return res.status(403).json({ error: 'Public fixtures not enabled' })

    const { teamId, type } = req.query
    const params = [s.id]
    let teamFilter = ''
    if (teamId) {
      params.push(teamId)
      teamFilter = `AND t.id = $${params.length}`
    }

    let dateFilter = ''
    if (type === 'upcoming') dateFilter = 'AND COALESCE(m.date, m.match_date) >= CURRENT_DATE'
    else if (type === 'results') dateFilter = 'AND COALESCE(m.date, m.match_date) < CURRENT_DATE AND m.score_for IS NOT NULL'

    const result = await pool.query(
      `SELECT m.id, m.opponent, COALESCE(m.date, m.match_date) AS date, m.match_time,
              m.home_away, m.score_for, m.score_against, m.location, m.kit_type,
              m.match_report_text, m.match_report_status,
              t.name AS team_name, t.sport, t.age_group, t.gender,
              (SELECT name FROM pupils WHERE id = m.player_of_match_id) AS potm_name
       FROM matches m
       JOIN teams t ON t.id = m.team_id
       WHERE t.school_id = $1 AND t.is_public = true ${teamFilter} ${dateFilter}
       ORDER BY COALESCE(m.date, m.match_date) DESC
       LIMIT 100`,
      params
    )

    const nameFormat = s.public_name_format || 'first_initial'
    const fixtures = result.rows.map(f => ({
      ...f,
      potm_name: f.potm_name ? safeName(f.potm_name, nameFormat) : null,
      match_report_text: f.match_report_status === 'published' ? f.match_report_text : null,
    }))

    res.json(fixtures)
  } catch (error) { next(error) }
})

router.get('/:slug/fixture/:matchId', async (req, res, next) => {
  try {
    const school = await pool.query(
      'SELECT id, public_fixtures_enabled, public_name_format FROM schools WHERE slug = $1',
      [req.params.slug]
    )
    if (!school.rows.length) return res.status(404).json({ error: 'School not found' })
    const s = school.rows[0]
    if (!s.public_fixtures_enabled) return res.status(403).json({ error: 'Public fixtures not enabled' })

    const result = await pool.query(
      `SELECT m.id, m.opponent, COALESCE(m.date, m.match_date) AS date, m.match_time,
              m.home_away, m.score_for, m.score_against, m.location, m.kit_type,
              m.match_report_text, m.match_report_status,
              t.name AS team_name, t.sport, t.age_group, t.gender,
              (SELECT name FROM pupils WHERE id = m.player_of_match_id) AS potm_name
       FROM matches m
       JOIN teams t ON t.id = m.team_id
       WHERE m.id = $1 AND t.school_id = $2 AND t.is_public = true`,
      [req.params.matchId, s.id]
    )
    if (!result.rows.length) return res.status(404).json({ error: 'Fixture not found' })

    const nameFormat = s.public_name_format || 'first_initial'
    const f = result.rows[0]
    f.potm_name = f.potm_name ? safeName(f.potm_name, nameFormat) : null
    if (f.match_report_status !== 'published') f.match_report_text = null

    res.json(f)
  } catch (error) { next(error) }
})

// RSS feed of recent results
router.get('/:slug/rss', async (req, res, next) => {
  try {
    const school = await pool.query(
      'SELECT id, name, slug, public_fixtures_enabled, public_name_format FROM schools WHERE slug = $1',
      [req.params.slug]
    )
    if (!school.rows.length || !school.rows[0].public_fixtures_enabled) {
      return res.status(404).send('Not found')
    }
    const s = school.rows[0]
    const baseUrl = `${req.protocol}://${req.get('host')}`

    const results = await pool.query(
      `SELECT m.id, m.opponent, COALESCE(m.date, m.match_date) AS date,
              m.score_for, m.score_against, m.home_away, m.match_report_text, m.match_report_status,
              t.name AS team_name, t.sport
       FROM matches m JOIN teams t ON t.id = m.team_id
       WHERE t.school_id = $1 AND t.is_public = true AND m.score_for IS NOT NULL
       ORDER BY COALESCE(m.date, m.match_date) DESC LIMIT 20`,
      [s.id]
    )

    const items = results.rows.map(r => {
      const title = `${r.team_name} ${r.score_for}-${r.score_against} ${r.opponent}`
      const desc = r.match_report_status === 'published' && r.match_report_text
        ? r.match_report_text.slice(0, 300) : `${r.home_away === 'home' ? 'Home' : 'Away'} match.`
      const link = `${baseUrl}/sport/${s.slug}?fixture=${r.id}`
      const pubDate = new Date(r.date).toUTCString()
      return `<item><title>${esc(title)}</title><link>${link}</link><description>${esc(desc)}</description><pubDate>${pubDate}</pubDate><guid>${r.id}</guid></item>`
    }).join('\n')

    res.type('application/rss+xml').send(`<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"><channel>
<title>${esc(s.name)} - Sport Results</title>
<link>${baseUrl}/sport/${s.slug}</link>
<description>Latest sport fixtures and results from ${esc(s.name)}</description>
${items}
</channel></rss>`)
  } catch (error) { next(error) }
})

function esc(s) { return (s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;') }

export default router
