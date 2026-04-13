import { Router } from 'express'
import multer from 'multer'
import path from 'path'
import fs from 'fs'
import { v4 as uuidv4 } from 'uuid'
import pool from '../config/database.js'
import { authenticateToken } from '../middleware/auth.js'
import { extractLeagueTableFromImage, extractDetailedLeagueTableFromImage } from '../services/claudeService.js'

const router = Router()

// Configure multer for image uploads
const uploadDir = './uploads/temp'
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true })
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname)
    cb(null, `${uuidv4()}${ext}`)
  }
})

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
  fileFilter: (req, file, cb) => {
    const allowed = ['.png', '.jpg', '.jpeg', '.gif', '.webp']
    const ext = path.extname(file.originalname).toLowerCase()
    if (allowed.includes(ext)) {
      cb(null, true)
    } else {
      cb(new Error('Only image files are allowed'))
    }
  }
})

// Get league settings for team
router.get('/settings/:teamId', authenticateToken, async (req, res, next) => {
  try {
    const { teamId } = req.params

    const result = await pool.query(
      'SELECT * FROM league_settings WHERE team_id = $1',
      [teamId]
    )

    if (result.rows.length === 0) {
      return res.json(null)
    }

    res.json(result.rows[0])
  } catch (error) {
    next(error)
  }
})

// Create or update league settings
router.post('/settings/:teamId', authenticateToken, async (req, res, next) => {
  try {
    const { teamId } = req.params
    const {
      league_name,
      season,
      division,
      fa_fulltime_table_url,
      fa_fulltime_fixtures_url,
      fa_fulltime_results_url,
      use_fa_embed
    } = req.body

    // Check if settings exist
    const existing = await pool.query(
      'SELECT id FROM league_settings WHERE team_id = $1',
      [teamId]
    )

    let result
    if (existing.rows.length > 0) {
      // Update
      result = await pool.query(
        `UPDATE league_settings SET
          league_name = COALESCE($1, league_name),
          season = COALESCE($2, season),
          division = COALESCE($3, division),
          fa_fulltime_table_url = $4,
          fa_fulltime_fixtures_url = $5,
          fa_fulltime_results_url = $6,
          use_fa_embed = COALESCE($7, use_fa_embed),
          updated_at = NOW()
         WHERE team_id = $8 RETURNING *`,
        [
          league_name, season, division,
          fa_fulltime_table_url, fa_fulltime_fixtures_url, fa_fulltime_results_url,
          use_fa_embed, teamId
        ]
      )
    } else {
      // Create
      result = await pool.query(
        `INSERT INTO league_settings (team_id, league_name, season, division,
          fa_fulltime_table_url, fa_fulltime_fixtures_url, fa_fulltime_results_url, use_fa_embed)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
        [
          teamId, league_name || 'League', season || '2024/25', division,
          fa_fulltime_table_url, fa_fulltime_fixtures_url, fa_fulltime_results_url,
          use_fa_embed || false
        ]
      )
    }

    res.json(result.rows[0])
  } catch (error) {
    next(error)
  }
})

// Get league table
router.get('/table/:teamId', authenticateToken, async (req, res, next) => {
  try {
    const { teamId } = req.params

    // Get league settings first
    const settingsResult = await pool.query(
      'SELECT id FROM league_settings WHERE team_id = $1',
      [teamId]
    )

    if (settingsResult.rows.length === 0) {
      return res.json([])
    }

    const leagueId = settingsResult.rows[0].id

    const result = await pool.query(
      `SELECT * FROM league_table WHERE league_id = $1 ORDER BY points DESC, goal_difference DESC, goals_for DESC`,
      [leagueId]
    )

    res.json(result.rows)
  } catch (error) {
    next(error)
  }
})

// Update league table (manual entry)
router.post('/table/:teamId', authenticateToken, async (req, res, next) => {
  try {
    const { teamId } = req.params
    const { table } = req.body // Array of team standings

    if (!Array.isArray(table)) {
      return res.status(400).json({ message: 'table must be an array' })
    }

    // Get or create league settings
    let settingsResult = await pool.query(
      'SELECT id FROM league_settings WHERE team_id = $1',
      [teamId]
    )

    if (settingsResult.rows.length === 0) {
      settingsResult = await pool.query(
        `INSERT INTO league_settings (team_id, league_name, season) VALUES ($1, 'League', '2024/25') RETURNING id`,
        [teamId]
      )
    }

    const leagueId = settingsResult.rows[0].id

    // Clear existing table
    await pool.query('DELETE FROM league_table WHERE league_id = $1', [leagueId])

    // Insert new table
    const results = []
    for (let i = 0; i < table.length; i++) {
      const team = table[i]
      const result = await pool.query(
        `INSERT INTO league_table (league_id, team_name, is_own_team, played, won, drawn, lost, goals_for, goals_against, points, position)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *`,
        [
          leagueId, team.team_name, team.is_own_team || false,
          team.played || 0, team.won || 0, team.drawn || 0, team.lost || 0,
          team.goals_for || 0, team.goals_against || 0, team.points || 0,
          i + 1
        ]
      )
      results.push(result.rows[0])
    }

    res.json(results)
  } catch (error) {
    next(error)
  }
})

// Update single team in table
router.put('/table/:teamId/team/:teamRecordId', authenticateToken, async (req, res, next) => {
  try {
    const { teamRecordId } = req.params
    const { played, won, drawn, lost, goals_for, goals_against } = req.body

    const points = (won * 3) + drawn

    const result = await pool.query(
      `UPDATE league_table SET
        played = COALESCE($1, played),
        won = COALESCE($2, won),
        drawn = COALESCE($3, drawn),
        lost = COALESCE($4, lost),
        goals_for = COALESCE($5, goals_for),
        goals_against = COALESCE($6, goals_against),
        points = $7,
        last_updated = NOW()
       WHERE id = $8 RETURNING *`,
      [played, won, drawn, lost, goals_for, goals_against, points, teamRecordId]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Team record not found' })
    }

    res.json(result.rows[0])
  } catch (error) {
    next(error)
  }
})

// Add team to table
router.post('/table/:teamId/team', authenticateToken, async (req, res, next) => {
  try {
    const { teamId } = req.params
    const { team_name, is_own_team } = req.body

    if (!team_name) {
      return res.status(400).json({ message: 'team_name is required' })
    }

    // Get league settings
    const settingsResult = await pool.query(
      'SELECT id FROM league_settings WHERE team_id = $1',
      [teamId]
    )

    if (settingsResult.rows.length === 0) {
      return res.status(400).json({ message: 'League settings not found. Create settings first.' })
    }

    const leagueId = settingsResult.rows[0].id

    // Get current position count
    const countResult = await pool.query(
      'SELECT COUNT(*) as count FROM league_table WHERE league_id = $1',
      [leagueId]
    )
    const position = parseInt(countResult.rows[0].count) + 1

    const result = await pool.query(
      `INSERT INTO league_table (league_id, team_name, is_own_team, position)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [leagueId, team_name, is_own_team || false, position]
    )

    res.status(201).json(result.rows[0])
  } catch (error) {
    next(error)
  }
})

// Delete team from table
router.delete('/table/:teamId/team/:teamRecordId', authenticateToken, async (req, res, next) => {
  try {
    const { teamRecordId } = req.params

    const result = await pool.query(
      'DELETE FROM league_table WHERE id = $1 RETURNING id',
      [teamRecordId]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Team record not found' })
    }

    res.json({ message: 'Team removed from table' })
  } catch (error) {
    next(error)
  }
})

// Extract league table from image using AI (summary table)
router.post('/table/:teamId/extract-from-image', authenticateToken, upload.single('image'), async (req, res, next) => {
  try {
    const { teamId } = req.params

    if (!req.file) {
      return res.status(400).json({ message: 'No image uploaded' })
    }

    // Get team name
    const teamResult = await pool.query('SELECT name FROM teams WHERE id = $1', [teamId])
    if (teamResult.rows.length === 0) {
      return res.status(404).json({ message: 'Team not found' })
    }
    const teamName = teamResult.rows[0].name

    // Read the image and convert to base64
    const imageBuffer = fs.readFileSync(req.file.path)
    const imageBase64 = imageBuffer.toString('base64')

    // Determine media type
    const ext = path.extname(req.file.originalname).toLowerCase()
    const mediaTypeMap = {
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.gif': 'image/gif',
      '.webp': 'image/webp',
    }
    const mediaType = mediaTypeMap[ext] || 'image/png'

    // Extract league table using AI
    const table = await extractLeagueTableFromImage(imageBase64, teamName, mediaType)

    // Clean up uploaded file
    fs.unlinkSync(req.file.path)

    res.json({
      teamName,
      table,
      count: table.length,
      type: 'summary',
    })
  } catch (error) {
    // Clean up uploaded file on error
    if (req.file?.path) {
      try { fs.unlinkSync(req.file.path) } catch (e) {}
    }
    next(error)
  }
})

// Extract DETAILED league table from image using AI (with home/away breakdown)
router.post('/table/:teamId/extract-detailed-from-image', authenticateToken, upload.single('image'), async (req, res, next) => {
  try {
    const { teamId } = req.params

    if (!req.file) {
      return res.status(400).json({ message: 'No image uploaded' })
    }

    // Get team name
    const teamResult = await pool.query('SELECT name FROM teams WHERE id = $1', [teamId])
    if (teamResult.rows.length === 0) {
      return res.status(404).json({ message: 'Team not found' })
    }
    const teamName = teamResult.rows[0].name

    // Read the image and convert to base64
    const imageBuffer = fs.readFileSync(req.file.path)
    const imageBase64 = imageBuffer.toString('base64')

    // Determine media type
    const ext = path.extname(req.file.originalname).toLowerCase()
    const mediaTypeMap = {
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.gif': 'image/gif',
      '.webp': 'image/webp',
    }
    const mediaType = mediaTypeMap[ext] || 'image/png'

    // Extract detailed league table using AI
    const table = await extractDetailedLeagueTableFromImage(imageBase64, teamName, mediaType)

    // Clean up uploaded file
    fs.unlinkSync(req.file.path)

    res.json({
      teamName,
      table,
      count: table.length,
      type: 'detailed',
    })
  } catch (error) {
    // Clean up uploaded file on error
    if (req.file?.path) {
      try { fs.unlinkSync(req.file.path) } catch (e) {}
    }
    next(error)
  }
})

// Update league table (with support for detailed stats)
router.post('/table/:teamId/detailed', authenticateToken, async (req, res, next) => {
  try {
    const { teamId } = req.params
    const { table } = req.body // Array of team standings with detailed stats

    if (!Array.isArray(table)) {
      return res.status(400).json({ message: 'table must be an array' })
    }

    // Get or create league settings
    let settingsResult = await pool.query(
      'SELECT id FROM league_settings WHERE team_id = $1',
      [teamId]
    )

    if (settingsResult.rows.length === 0) {
      settingsResult = await pool.query(
        `INSERT INTO league_settings (team_id, league_name, season, has_detailed_stats) VALUES ($1, 'League', '2024/25', true) RETURNING id`,
        [teamId]
      )
    } else {
      // Update to indicate we have detailed stats
      await pool.query(
        'UPDATE league_settings SET has_detailed_stats = true WHERE team_id = $1',
        [teamId]
      )
    }

    const leagueId = settingsResult.rows[0].id

    // Clear existing table
    await pool.query('DELETE FROM league_table WHERE league_id = $1', [leagueId])

    // Insert new table with detailed stats
    const results = []
    for (let i = 0; i < table.length; i++) {
      const team = table[i]
      const result = await pool.query(
        `INSERT INTO league_table (
          league_id, team_name, is_own_team, played, won, drawn, lost,
          goals_for, goals_against, points, position,
          home_played, home_won, home_drawn, home_lost, home_goals_for, home_goals_against,
          away_played, away_won, away_drawn, away_lost, away_goals_for, away_goals_against
        )
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23) RETURNING *`,
        [
          leagueId, team.team_name, team.is_own_team || false,
          team.played || 0, team.won || 0, team.drawn || 0, team.lost || 0,
          team.goals_for || 0, team.goals_against || 0, team.points || 0,
          i + 1,
          team.home_played || 0, team.home_won || 0, team.home_drawn || 0, team.home_lost || 0,
          team.home_goals_for || 0, team.home_goals_against || 0,
          team.away_played || 0, team.away_won || 0, team.away_drawn || 0, team.away_lost || 0,
          team.away_goals_for || 0, team.away_goals_against || 0
        ]
      )
      results.push(result.rows[0])
    }

    res.json(results)
  } catch (error) {
    next(error)
  }
})

export default router
