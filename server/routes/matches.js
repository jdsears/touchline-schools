import { Router } from 'express'
import pool from '../config/database.js'
import { authenticateToken } from '../middleware/auth.js'
import { generateMatchPrep, generateMatchReport, generatePepTalk } from '../services/claudeService.js'
import { sendPotmEmail, sendSquadAnnouncementEmail, sendAvailabilityRequestEmail, isEmailEnabled, sendBatchEmails } from '../services/emailService.js'
import { sendPushToUser } from '../services/pushService.js'
import { normalizePositions } from '../utils/playerUtils.js'
import { getFrontendUrl } from '../utils/urlUtils.js'
import { uploadFile, deleteFile } from '../services/storageService.js'
import multer from 'multer'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const router = Router()

// Configure multer for video uploads
const videoStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../uploads/videos')
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true })
    }
    cb(null, uploadDir)
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
    cb(null, `match-${req.params.id}-${uniqueSuffix}${path.extname(file.originalname)}`)
  }
})

const videoUpload = multer({
  storage: videoStorage,
  limits: { fileSize: 200 * 1024 * 1024 }, // 200MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /mp4|mov|avi|mkv|webm/
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase())
    const mimetype = file.mimetype.startsWith('video/')
    if (extname && mimetype) {
      return cb(null, true)
    }
    cb(new Error('Only video files are allowed'))
  }
})

// Get match
router.get('/:id', authenticateToken, async (req, res, next) => {
  try {
    const { id } = req.params
    const result = await pool.query('SELECT * FROM matches WHERE id = $1', [id])
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Match not found' })
    }
    res.json(result.rows[0])
  } catch (error) {
    next(error)
  }
})

// Update match
router.put('/:id', authenticateToken, async (req, res, next) => {
  try {
    const { id } = req.params
    const { opponent, date, location, isHome, result: matchResult,
            formationUsed, formations, notes, veoLink, videoUrl,
            goalsFor, goalsAgainst, kitType, meetTime } = req.body

    const dbResult = await pool.query(
      `UPDATE matches SET
        opponent = COALESCE($1, opponent),
        date = COALESCE($2, date),
        location = COALESCE($3, location),
        is_home = COALESCE($4, is_home),
        result = COALESCE($5, result),
        formation_used = COALESCE($6, formation_used),
        notes = COALESCE($7, notes),
        veo_link = COALESCE($8, veo_link),
        video_url = COALESCE($9, video_url),
        formations = COALESCE($10::jsonb, formations),
        goals_for = COALESCE($11, goals_for),
        goals_against = COALESCE($12, goals_against),
        kit_type = COALESCE($13, kit_type),
        meet_time = $14,
        updated_at = NOW()
       WHERE id = $15 RETURNING *`,
      [opponent, date, location, isHome, matchResult, formationUsed, notes, veoLink, videoUrl,
       formations ? JSON.stringify(formations) : null, goalsFor, goalsAgainst, kitType || null, meetTime || null, id]
    )

    if (dbResult.rows.length === 0) {
      return res.status(404).json({ message: 'Match not found' })
    }

    res.json(dbResult.rows[0])
  } catch (error) {
    next(error)
  }
})

// Partial update match (for team notes, prep_notes, formations etc)
router.patch('/:id', authenticateToken, async (req, res, next) => {
  try {
    const { id } = req.params
    const { team_notes, prep_notes, formations } = req.body

    console.log('PATCH /matches/:id - Received:', { id, userId: req.user.id, role: req.user.role, prep_notes: !!prep_notes })

    // Build dynamic update - prep_notes and formations can be set to null explicitly
    const updates = ['updated_at = NOW()']
    const values = []
    let paramCount = 1

    if (team_notes !== undefined) {
      updates.push(`team_notes = $${paramCount}`)
      values.push(team_notes)
      paramCount++
    }

    if (prep_notes !== undefined) {
      updates.push(`prep_notes = $${paramCount}`)
      values.push(prep_notes)
      paramCount++
    }

    if (formations !== undefined) {
      updates.push(`formations = $${paramCount}::jsonb`)
      values.push(formations ? JSON.stringify(formations) : null)
      paramCount++
    }

    values.push(id)

    const query = `UPDATE matches SET ${updates.join(', ')} WHERE id = $${paramCount} RETURNING *`
    console.log('PATCH /matches/:id - Query:', query)
    console.log('PATCH /matches/:id - Values count:', values.length)

    const result = await pool.query(query, values)

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Match not found' })
    }

    console.log('PATCH /matches/:id - Success')
    res.json(result.rows[0])
  } catch (error) {
    console.error('PATCH /matches/:id - Error:', error.message)
    console.error('PATCH /matches/:id - Stack:', error.stack)
    next(error)
  }
})

// Share match prep with players (dedicated endpoint)
router.post('/:id/prep/share', authenticateToken, async (req, res, next) => {
  try {
    const { id } = req.params
    const { content } = req.body

    if (!content) {
      return res.status(400).json({ message: 'No content to share' })
    }

    console.log('POST /matches/:id/prep/share - Sharing prep for match:', id)

    const result = await pool.query(
      'UPDATE matches SET prep_notes = $1, updated_at = NOW() WHERE id = $2 RETURNING id',
      [content, id]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Match not found' })
    }

    console.log('POST /matches/:id/prep/share - Success')
    res.json({ success: true })
  } catch (error) {
    console.error('POST /matches/:id/prep/share - Error:', error.message)
    next(error)
  }
})

// Upload video for match
router.post('/:id/video', authenticateToken, videoUpload.single('video'), async (req, res, next) => {
  try {
    const { id } = req.params

    if (!req.file) {
      return res.status(400).json({ message: 'No video file provided' })
    }

    // Check manager role
    if (req.user.role !== 'manager' && req.user.role !== 'assistant') {
      // Delete the uploaded file
      fs.unlinkSync(req.file.path)
      return res.status(403).json({ message: 'Only managers can upload videos' })
    }

    // Delete old video if exists
    const oldMatch = await pool.query('SELECT video_url FROM matches WHERE id = $1', [id])
    if (oldMatch.rows.length > 0 && oldMatch.rows[0].video_url) {
      await deleteFile(oldMatch.rows[0].video_url)
    }

    const storageKey = `videos/${req.file.filename}`
    const videoUrl = await uploadFile(req.file.path, storageKey, { contentType: req.file.mimetype })

    const result = await pool.query(
      `UPDATE matches SET video_url = $1, updated_at = NOW() WHERE id = $2 RETURNING *`,
      [videoUrl, id]
    )

    if (result.rows.length === 0) {
      await deleteFile(videoUrl)
      return res.status(404).json({ message: 'Match not found' })
    }

    res.json({
      message: 'Video uploaded successfully',
      video_url: videoUrl,
      match: result.rows[0]
    })
  } catch (error) {
    if (req.file) {
      try { if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path) } catch { /* ignore */ }
    }
    next(error)
  }
})

// Delete video for match
router.delete('/:id/video', authenticateToken, async (req, res, next) => {
  try {
    const { id } = req.params

    // Check manager role
    if (req.user.role !== 'manager' && req.user.role !== 'assistant') {
      return res.status(403).json({ message: 'Only managers can delete videos' })
    }

    // Get video path
    const match = await pool.query('SELECT video_url FROM matches WHERE id = $1', [id])
    if (match.rows.length === 0) {
      return res.status(404).json({ message: 'Match not found' })
    }

    if (match.rows[0].video_url) {
      await deleteFile(match.rows[0].video_url)
    }

    await pool.query(
      `UPDATE matches SET video_url = NULL, updated_at = NOW() WHERE id = $1`,
      [id]
    )

    res.json({ message: 'Video deleted successfully' })
  } catch (error) {
    next(error)
  }
})

// ============== MATCH CLIPS ==============

// Configure multer for clip uploads
const clipStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../uploads/clips')
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true })
    }
    cb(null, uploadDir)
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
    cb(null, `clip-${req.params.id}-${uniqueSuffix}${path.extname(file.originalname)}`)
  }
})

const clipUpload = multer({
  storage: clipStorage,
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB limit per clip
  fileFilter: (req, file, cb) => {
    const allowedTypes = /mp4|mov|avi|mkv|webm/
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase())
    const mimetype = file.mimetype.startsWith('video/')
    if (extname && mimetype) {
      return cb(null, true)
    }
    cb(new Error('Only video files are allowed'))
  }
})

// Get clips for a match
router.get('/:id/clips', authenticateToken, async (req, res, next) => {
  try {
    const { id } = req.params
    const result = await pool.query(
      'SELECT * FROM match_clips WHERE match_id = $1 ORDER BY minute ASC NULLS LAST, created_at DESC',
      [id]
    )
    res.json(result.rows)
  } catch (error) {
    next(error)
  }
})

// Upload clips for match (multiple files)
router.post('/:id/clips', authenticateToken, clipUpload.array('clips', 20), async (req, res, next) => {
  try {
    const { id } = req.params

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: 'No clip files provided' })
    }

    // Check manager role
    if (req.user.role !== 'manager' && req.user.role !== 'assistant') {
      // Delete uploaded files
      req.files.forEach(file => fs.unlinkSync(file.path))
      return res.status(403).json({ message: 'Only managers can upload clips' })
    }

    const clips = []
    for (const file of req.files) {
      const storageKey = `clips/${file.filename}`
      const clipUrl = await uploadFile(file.path, storageKey, { contentType: file.mimetype })
      const result = await pool.query(
        `INSERT INTO match_clips (match_id, uploaded_by, filename, original_name, file_path, file_size, title)
         VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
        [
          id,
          req.user.id,
          file.filename,
          file.originalname,
          clipUrl,
          file.size,
          file.originalname.replace(/\.[^/.]+$/, '')
        ]
      )
      clips.push(result.rows[0])
    }

    res.json({
      message: `${clips.length} clip(s) uploaded successfully`,
      clips
    })
  } catch (error) {
    if (req.files) {
      req.files.forEach(file => {
        try { if (fs.existsSync(file.path)) fs.unlinkSync(file.path) } catch { /* ignore */ }
      })
    }
    next(error)
  }
})

// Update clip metadata
router.patch('/:id/clips/:clipId', authenticateToken, async (req, res, next) => {
  try {
    const { clipId } = req.params
    const { title, description, clip_type, minute } = req.body

    const result = await pool.query(
      `UPDATE match_clips SET
        title = COALESCE($1, title),
        description = COALESCE($2, description),
        clip_type = COALESCE($3, clip_type),
        minute = COALESCE($4, minute)
       WHERE id = $5 RETURNING *`,
      [title, description, clip_type, minute, clipId]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Clip not found' })
    }

    res.json(result.rows[0])
  } catch (error) {
    next(error)
  }
})

// Delete a clip
router.delete('/:id/clips/:clipId', authenticateToken, async (req, res, next) => {
  try {
    const { clipId } = req.params

    // Check manager role
    if (req.user.role !== 'manager' && req.user.role !== 'assistant') {
      return res.status(403).json({ message: 'Only managers can delete clips' })
    }

    // Get clip path
    const clip = await pool.query('SELECT file_path FROM match_clips WHERE id = $1', [clipId])
    if (clip.rows.length === 0) {
      return res.status(404).json({ message: 'Clip not found' })
    }

    // Delete file (cloud or local)
    await deleteFile(clip.rows[0].file_path)

    // Delete from database
    await pool.query('DELETE FROM match_clips WHERE id = $1', [clipId])

    res.json({ message: 'Clip deleted successfully' })
  } catch (error) {
    next(error)
  }
})

// Get match prep
router.get('/:id/prep', authenticateToken, async (req, res, next) => {
  try {
    const { id } = req.params
    const result = await pool.query('SELECT prep_notes FROM matches WHERE id = $1', [id])
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Match not found' })
    }
    res.json(result.rows[0].prep_notes || {})
  } catch (error) {
    next(error)
  }
})

// Generate match prep using AI
router.post('/:id/prep/generate', authenticateToken, async (req, res, next) => {
  try {
    const { id } = req.params

    // Get match
    const matchResult = await pool.query('SELECT * FROM matches WHERE id = $1', [id])
    if (matchResult.rows.length === 0) {
      return res.status(404).json({ message: 'Match not found' })
    }
    const match = matchResult.rows[0]

    // Validate match has opponent
    if (!match.opponent) {
      return res.status(400).json({ message: 'Match must have an opponent set before generating prep' })
    }

    // Get team
    const teamResult = await pool.query('SELECT * FROM teams WHERE id = $1', [match.team_id])
    if (teamResult.rows.length === 0) {
      return res.status(404).json({ message: 'Team not found' })
    }
    const team = teamResult.rows[0]

    // Fetch additional context in parallel
    const [recentResultsRes, leagueTableRes, squadObsRes, matchSquadRes] = await Promise.all([
      // Last 10 completed matches with scores
      pool.query(
        `SELECT opponent, date, is_home, goals_for, goals_against, competition
         FROM matches
         WHERE team_id = $1 AND goals_for IS NOT NULL AND goals_against IS NOT NULL AND id != $2
         ORDER BY date DESC LIMIT 10`,
        [match.team_id, id]
      ),
      // League table (if exists)
      pool.query(
        `SELECT lt.team_name, lt.is_own_team, lt.position, lt.played, lt.won, lt.drawn, lt.lost,
                lt.goals_for, lt.goals_against, lt.points
         FROM league_table lt
         JOIN league_settings ls ON lt.league_id = ls.id
         WHERE ls.team_id = $1
         ORDER BY lt.points DESC, (lt.goals_for - lt.goals_against) DESC`,
        [match.team_id]
      ),
      // Squad players with recent observations
      pool.query(
        `SELECT p.id, p.name, p.positions,
                COALESCE(
                  json_agg(
                    json_build_object('type', o.type, 'content', o.content)
                    ORDER BY o.created_at DESC
                  ) FILTER (WHERE o.id IS NOT NULL),
                  '[]'
                ) as observations
         FROM players p
         LEFT JOIN observations o ON o.player_id = p.id AND o.created_at > NOW() - INTERVAL '60 days'
         WHERE p.team_id = $1 AND p.is_active = true
         GROUP BY p.id, p.name, p.positions
         HAVING COUNT(o.id) > 0
         LIMIT 15`,
        [match.team_id]
      ),
      // Match squad selection
      pool.query(
        `SELECT p.name, p.positions as registered_positions, ms.position as match_position,
                ms.is_starting, ms.notes
         FROM match_squads ms
         JOIN players p ON ms.player_id = p.id
         WHERE ms.match_id = $1
         ORDER BY ms.is_starting DESC, ms.position`,
        [id]
      ),
    ])

    // Resolve tactics board player-position assignments to names
    let tacticsPositions = null
    const teamPositions = typeof team.positions === 'string' ? JSON.parse(team.positions) : team.positions
    const teamBenchPlayers = typeof team.bench_players === 'string' ? JSON.parse(team.bench_players) : (team.bench_players || [])

    // Collect all available player IDs (starting XI + bench) so we can filter observations
    let availablePlayerIds = []

    if (teamPositions && Array.isArray(teamPositions)) {
      const assignedPositions = teamPositions.filter(p => p.playerId)
      if (assignedPositions.length > 0) {
        const playerIds = assignedPositions.map(p => String(p.playerId))
        availablePlayerIds.push(...playerIds)
        const playerNamesRes = await pool.query(
          'SELECT id, name FROM players WHERE id::text = ANY($1)',
          [playerIds]
        )
        const nameMap = Object.fromEntries(playerNamesRes.rows.map(p => [String(p.id), p.name]))
        tacticsPositions = assignedPositions.map(p => ({
          position: p.label,
          playerName: nameMap[String(p.playerId)] || 'Unknown',
        }))
      }
    }

    // Add bench player IDs to available list and resolve their names
    let benchPlayerNames = []
    if (teamBenchPlayers.length > 0) {
      const benchIds = teamBenchPlayers.map(id => String(id))
      availablePlayerIds.push(...benchIds)
      const benchNamesRes = await pool.query(
        'SELECT id, name, positions FROM players WHERE id::text = ANY($1)',
        [benchIds]
      )
      benchPlayerNames = benchNamesRes.rows
    }

    // Also include match squad player IDs if present
    if (matchSquadRes.rows.length > 0) {
      // match_squads are definitive — override tactics-based available list
      availablePlayerIds = []
      const squadPlayerRes = await pool.query(
        'SELECT p.id FROM match_squads ms JOIN players p ON ms.player_id = p.id WHERE ms.match_id = $1',
        [id]
      )
      availablePlayerIds = squadPlayerRes.rows.map(r => String(r.id))
    }

    // Filter squad observations to only available players (starting XI + bench)
    let filteredObservations = squadObsRes.rows
    if (availablePlayerIds.length > 0) {
      filteredObservations = squadObsRes.rows.filter(p => availablePlayerIds.includes(String(p.id)))
    }

    // Resolve set piece taker IDs to player names (stored inside game_model)
    let setPieceTakers = null
    const teamGameModel = typeof team.game_model === 'string' ? JSON.parse(team.game_model) : team.game_model
    const rawTakers = teamGameModel?.setPieceTakers
    if (rawTakers && Object.values(rawTakers).some(v => v)) {
      // Separate player ID fields from metadata fields (like _foot preferences)
      const footFields = ['corners_left_foot', 'corners_right_foot']
      const playerEntries = Object.entries(rawTakers).filter(([key, val]) => val && !footFields.includes(key))
      const takerIds = [...new Set(playerEntries.map(([, val]) => String(val)))]
      if (takerIds.length > 0) {
        const takerNamesRes = await pool.query(
          'SELECT id, name FROM players WHERE id::text = ANY($1)',
          [takerIds]
        )
        const takerNameMap = Object.fromEntries(takerNamesRes.rows.map(p => [String(p.id), p.name]))
        setPieceTakers = {}
        for (const [role, playerId] of playerEntries) {
          if (playerId) setPieceTakers[role] = takerNameMap[String(playerId)] || null
        }
        // Pass through foot preferences directly
        for (const field of footFields) {
          if (rawTakers[field]) setPieceTakers[field] = rawTakers[field]
        }
      }
    }

    // Stream prep generation via SSE to avoid Railway 30s timeout
    res.setHeader('Content-Type', 'text/event-stream')
    res.setHeader('Cache-Control', 'no-cache')
    res.setHeader('Connection', 'keep-alive')
    res.flushHeaders()

    const stream = await generateMatchPrep(match, team, {
      recentResults: recentResultsRes.rows,
      leagueTable: leagueTableRes.rows,
      squadObservations: filteredObservations,
      matchSquad: matchSquadRes.rows,
      tacticsPositions,
      setPieceTakers,
      benchPlayerNames,
    })

    let fullText = ''

    stream.on('text', (text) => {
      fullText += text
      res.write(`data: ${JSON.stringify({ type: 'text', text })}\n\n`)
    })

    // Wait for stream to complete — don't throw if we already have content
    try {
      await stream.finalMessage()
    } catch (streamErr) {
      console.error('Stream finalization warning:', streamErr.message)
      // If we got text, the generation succeeded — don't treat as error
    }

    if (fullText) {
      res.write(`data: ${JSON.stringify({ type: 'done' })}\n\n`)
    } else {
      res.write(`data: ${JSON.stringify({ type: 'error', message: 'No content generated' })}\n\n`)
    }
    res.end()
  } catch (error) {
    console.error('Match prep generation error:', error)
    if (res.headersSent) {
      res.write(`data: ${JSON.stringify({ type: 'error', message: 'Generation failed' })}\n\n`)
      res.end()
    } else {
      next(error)
    }
  }
})

// Get match report
router.get('/:id/report', authenticateToken, async (req, res, next) => {
  try {
    const { id } = req.params
    const result = await pool.query('SELECT report FROM matches WHERE id = $1', [id])
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Match not found' })
    }
    res.json(result.rows[0].report || {})
  } catch (error) {
    next(error)
  }
})

// Generate AI match report for parents/players
router.post('/:id/report/generate', authenticateToken, async (req, res, next) => {
  try {
    const { id } = req.params

    // Get match details
    const matchResult = await pool.query('SELECT * FROM matches WHERE id = $1', [id])
    if (matchResult.rows.length === 0) {
      return res.status(404).json({ message: 'Match not found' })
    }
    const match = matchResult.rows[0]

    // Get team details
    const teamResult = await pool.query('SELECT * FROM teams WHERE id = $1', [match.team_id])
    if (teamResult.rows.length === 0) {
      return res.status(404).json({ message: 'Team not found' })
    }
    const team = teamResult.rows[0]

    // Load AI video analysis if available for richer report
    let videoAnalysis = null
    if (match.video_id) {
      const analysisResult = await pool.query(
        `SELECT summary, observations, recommendations, player_feedback
         FROM video_ai_analysis
         WHERE video_id = $1 AND status = 'complete'
         ORDER BY created_at DESC LIMIT 1`,
        [match.video_id]
      )
      if (analysisResult.rows.length > 0) {
        videoAnalysis = analysisResult.rows[0]
      }
    }

    // Load player of the match
    let playerOfMatch = null
    if (match.player_of_match_id) {
      const pomResult = await pool.query(
        'SELECT name FROM players WHERE id = $1',
        [match.player_of_match_id]
      )
      if (pomResult.rows.length > 0) {
        playerOfMatch = {
          name: pomResult.rows[0].name,
          reason: match.player_of_match_reason || null,
        }
      }
    }

    // Load goal scorers and assists
    let matchGoals = []
    try {
      const goalsResult = await pool.query(
        `SELECT mg.minute, mg.goal_type, mg.notes,
                sp.name as scorer_name, ap.name as assist_name
         FROM match_goals mg
         LEFT JOIN players sp ON mg.scorer_player_id = sp.id
         LEFT JOIN players ap ON mg.assist_player_id = ap.id
         WHERE mg.match_id = $1
         ORDER BY mg.minute ASC NULLS LAST`,
        [id]
      )
      matchGoals = goalsResult.rows
    } catch (e) {
      // match_goals table may not exist yet
    }

    // Generate report
    const report = await generateMatchReport(match, team, match.team_notes, videoAnalysis, playerOfMatch, matchGoals)

    // Save the generated report (unpublished by default)
    await pool.query(
      `UPDATE matches SET report = $1, updated_at = NOW() WHERE id = $2`,
      [JSON.stringify({ generated: report, generatedAt: new Date(), published: false }), id]
    )

    res.json({ report })
  } catch (error) {
    next(error)
  }
})

// Publish/unpublish match report to Player Zone
router.post('/:id/report/publish', authenticateToken, async (req, res, next) => {
  try {
    const { id } = req.params
    const { published } = req.body

    // Get current report
    const result = await pool.query('SELECT report FROM matches WHERE id = $1', [id])
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Match not found' })
    }

    const currentReport = result.rows[0].report
    if (!currentReport?.generated) {
      return res.status(400).json({ message: 'No report to publish. Generate a report first.' })
    }

    // Update published status
    const updatedReport = {
      ...currentReport,
      published: published !== false,
      publishedAt: published !== false ? new Date() : null
    }

    await pool.query(
      `UPDATE matches SET report = $1, updated_at = NOW() WHERE id = $2`,
      [JSON.stringify(updatedReport), id]
    )

    res.json({
      success: true,
      published: updatedReport.published,
      message: updatedReport.published ? 'Report shared to Player Zone' : 'Report hidden from Player Zone'
    })
  } catch (error) {
    next(error)
  }
})

// Update/edit match report content
router.put('/:id/report', authenticateToken, async (req, res, next) => {
  try {
    const { id } = req.params
    const { content } = req.body

    if (!content || typeof content !== 'string') {
      return res.status(400).json({ message: 'Report content is required' })
    }

    const result = await pool.query('SELECT report FROM matches WHERE id = $1', [id])
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Match not found' })
    }

    const currentReport = result.rows[0].report || {}
    const updatedReport = {
      ...currentReport,
      generated: content,
      editedAt: new Date(),
    }

    await pool.query(
      'UPDATE matches SET report = $1, updated_at = NOW() WHERE id = $2',
      [JSON.stringify(updatedReport), id]
    )

    res.json({ success: true, report: updatedReport })
  } catch (error) {
    next(error)
  }
})

// Generate pre-match pep talk for a player
router.post('/:id/pep-talk/:playerId', authenticateToken, async (req, res, next) => {
  try {
    const { id, playerId } = req.params

    // Get match details
    const matchResult = await pool.query('SELECT * FROM matches WHERE id = $1', [id])
    if (matchResult.rows.length === 0) {
      return res.status(404).json({ message: 'Match not found' })
    }
    const match = matchResult.rows[0]

    // Get player details
    const playerResult = await pool.query('SELECT * FROM players WHERE id = $1', [playerId])
    if (playerResult.rows.length === 0) {
      return res.status(404).json({ message: 'Player not found' })
    }
    const player = playerResult.rows[0]

    // Get team details
    const teamResult = await pool.query('SELECT * FROM teams WHERE id = $1', [match.team_id])
    const team = teamResult.rows[0]

    // Get match-day position if player is in the match squad
    const squadResult = await pool.query(
      'SELECT position FROM match_squads WHERE match_id = $1 AND player_id = $2',
      [id, playerId]
    )
    const matchPosition = squadResult.rows[0]?.position || null

    // Fetch recent video analysis insights for this player
    let videoInsights = []
    try {
      const videoAnalysisResult = await pool.query(
        `SELECT va.player_feedback, va.summary, va.created_at
         FROM video_ai_analysis va
         JOIN videos v ON v.id = va.video_id
         WHERE v.team_id = $1 AND va.approved = true AND va.player_feedback IS NOT NULL
         ORDER BY va.created_at DESC LIMIT 3`,
        [match.team_id]
      )
      for (const analysis of videoAnalysisResult.rows) {
        const feedback = analysis.player_feedback
        if (Array.isArray(feedback)) {
          const playerNotes = feedback.filter(f =>
            f.name?.toLowerCase() === player.name?.toLowerCase() ||
            (player.squad_number && f.squad_number === player.squad_number)
          )
          if (playerNotes.length > 0) {
            videoInsights.push(...playerNotes)
          }
        }
      }
    } catch (err) {
      // Non-critical — continue without video insights
      console.warn('Could not fetch video analysis for pep talk:', err.message)
    }

    // Generate pep talk
    const pepTalk = await generatePepTalk(match, player, team, matchPosition, videoInsights)

    res.json({ pepTalk })
  } catch (error) {
    next(error)
  }
})

// ============== MATCH GOALS & ASSISTS ==============

// GET /matches/:id/goals — list goals for a match
router.get('/:id/goals', authenticateToken, async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT mg.*,
              sp.name AS scorer_name, sp.squad_number AS scorer_number,
              ap.name AS assist_name, ap.squad_number AS assist_number
       FROM match_goals mg
       LEFT JOIN players sp ON mg.scorer_player_id = sp.id
       LEFT JOIN players ap ON mg.assist_player_id = ap.id
       WHERE mg.match_id = $1
       ORDER BY mg.minute ASC NULLS LAST, mg.created_at ASC`,
      [req.params.id]
    )
    res.json(result.rows)
  } catch (error) {
    // Table may not exist yet — return empty array
    if (error.code === '42P01') return res.json([])
    next(error)
  }
})

// Ensure match_goals table exists (runs once on first use)
let matchGoalsTableReady = false
async function ensureMatchGoalsTable() {
  if (matchGoalsTableReady) return
  await pool.query(`
    CREATE TABLE IF NOT EXISTS match_goals (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      match_id UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
      scorer_player_id UUID REFERENCES players(id) ON DELETE SET NULL,
      assist_player_id UUID REFERENCES players(id) ON DELETE SET NULL,
      minute INTEGER,
      goal_type VARCHAR(20) DEFAULT 'open_play',
      notes TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `)
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_match_goals_match ON match_goals(match_id)`)
  matchGoalsTableReady = true
}

// POST /matches/:id/goals — add a goal
router.post('/:id/goals', authenticateToken, async (req, res, next) => {
  try {
    await ensureMatchGoalsTable()
    const { scorer_player_id, assist_player_id, minute, goal_type, notes } = req.body
    const result = await pool.query(
      `INSERT INTO match_goals (match_id, scorer_player_id, assist_player_id, minute, goal_type, notes)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [req.params.id, scorer_player_id || null, assist_player_id || null, minute || null, goal_type || 'open_play', notes || null]
    )
    // Join player names for the response
    const goal = result.rows[0]
    if (goal.scorer_player_id) {
      const sp = await pool.query('SELECT name, squad_number FROM players WHERE id = $1', [goal.scorer_player_id])
      if (sp.rows[0]) { goal.scorer_name = sp.rows[0].name; goal.scorer_number = sp.rows[0].squad_number }
    }
    if (goal.assist_player_id) {
      const ap = await pool.query('SELECT name, squad_number FROM players WHERE id = $1', [goal.assist_player_id])
      if (ap.rows[0]) { goal.assist_name = ap.rows[0].name; goal.assist_number = ap.rows[0].squad_number }
    }
    res.status(201).json(goal)
  } catch (error) {
    next(error)
  }
})

// DELETE /matches/:id/goals/:goalId — remove a goal
router.delete('/:id/goals/:goalId', authenticateToken, async (req, res, next) => {
  try {
    await pool.query('DELETE FROM match_goals WHERE id = $1 AND match_id = $2', [req.params.goalId, req.params.id])
    res.json({ message: 'Goal removed' })
  } catch (error) {
    next(error)
  }
})

// ============== SUBSTITUTIONS ==============

// GET /matches/:id/substitutions
router.get('/:id/substitutions', authenticateToken, async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT ms.*,
              poff.name AS player_off_name, poff.squad_number AS player_off_number,
              pon.name AS player_on_name, pon.squad_number AS player_on_number
       FROM match_substitutions ms
       LEFT JOIN players poff ON ms.player_off_id = poff.id
       LEFT JOIN players pon ON ms.player_on_id = pon.id
       WHERE ms.match_id = $1
       ORDER BY ms.minute ASC NULLS LAST, ms.created_at ASC`,
      [req.params.id]
    )
    res.json(result.rows)
  } catch (error) {
    if (error.code === '42P01') return res.json([])
    next(error)
  }
})

// POST /matches/:id/substitutions — add a substitution
router.post('/:id/substitutions', authenticateToken, async (req, res, next) => {
  try {
    const { player_off_id, player_on_id, minute, notes } = req.body
    if (!player_off_id && !player_on_id) {
      return res.status(400).json({ message: 'At least one player is required' })
    }
    const result = await pool.query(
      `INSERT INTO match_substitutions (match_id, player_off_id, player_on_id, minute, notes)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [req.params.id, player_off_id || null, player_on_id || null, minute || null, notes || null]
    )
    const sub = result.rows[0]
    if (sub.player_off_id) {
      const p = await pool.query('SELECT name, squad_number FROM players WHERE id = $1', [sub.player_off_id])
      if (p.rows[0]) { sub.player_off_name = p.rows[0].name; sub.player_off_number = p.rows[0].squad_number }
    }
    if (sub.player_on_id) {
      const p = await pool.query('SELECT name, squad_number FROM players WHERE id = $1', [sub.player_on_id])
      if (p.rows[0]) { sub.player_on_name = p.rows[0].name; sub.player_on_number = p.rows[0].squad_number }
    }
    res.status(201).json(sub)
  } catch (error) {
    next(error)
  }
})

// DELETE /matches/:id/substitutions/:subId — remove a substitution
router.delete('/:id/substitutions/:subId', authenticateToken, async (req, res, next) => {
  try {
    await pool.query('DELETE FROM match_substitutions WHERE id = $1 AND match_id = $2', [req.params.subId, req.params.id])
    res.json({ message: 'Substitution removed' })
  } catch (error) {
    next(error)
  }
})

// ============== PLAYER OF THE MATCH ==============

// Set player of the match
router.post('/:id/player-of-match', authenticateToken, async (req, res, next) => {
  try {
    const { id } = req.params
    const { player_id, reason } = req.body

    // Check manager role
    if (!['manager', 'assistant'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Only managers can set player of the match' })
    }

    if (!player_id) {
      return res.status(400).json({ message: 'player_id is required' })
    }

    // Update match with player of the match
    const result = await pool.query(
      `UPDATE matches SET
        player_of_match_id = $1,
        player_of_match_reason = $2,
        updated_at = NOW()
       WHERE id = $3 RETURNING *`,
      [player_id, reason || null, id]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Match not found' })
    }

    const match = result.rows[0]

    // Get player info for response and notifications
    const playerResult = await pool.query(
      'SELECT p.*, t.name as team_name FROM players p JOIN teams t ON p.team_id = t.id WHERE p.id = $1',
      [player_id]
    )
    const player = playerResult.rows[0]

    // Create notification for player (if they have a user account)
    if (player?.user_id) {
      await pool.query(
        `INSERT INTO notifications (user_id, team_id, type, title, message, data)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          player.user_id,
          player.team_id,
          'potm',
          `⭐ Player of the Match!`,
          reason
            ? `You were named Player of the Match vs ${match.opponent}! "${reason}"`
            : `You were named Player of the Match vs ${match.opponent}!`,
          JSON.stringify({
            match_id: id,
            opponent: match.opponent,
            match_date: match.date,
            reason
          })
        ]
      )
    }

    // Also notify parent if they have a linked account
    const parentContacts = []
    if (player?.parent_contact) {
      try {
        const contacts = typeof player.parent_contact === 'string'
          ? JSON.parse(player.parent_contact)
          : player.parent_contact
        if (Array.isArray(contacts)) {
          parentContacts.push(...contacts.filter(c => c.email))
        }
      } catch {}
    }

    const matchInfo = `${match.is_home ? 'vs' : '@'} ${match.opponent}`

    // Batch lookup all parent users in one query instead of N+1
    if (parentContacts.length > 0) {
      const parentEmails = parentContacts.map(c => c.email)
      const parentUsersResult = await pool.query(
        'SELECT id, email FROM users WHERE email = ANY($1) AND role = $2',
        [parentEmails, 'parent']
      )
      const parentUserMap = new Map(parentUsersResult.rows.map(r => [r.email, r.id]))

      // Batch insert notifications for all found parents
      const notifValues = []
      const notifParams = []
      let paramIdx = 1
      for (const contact of parentContacts) {
        const userId = parentUserMap.get(contact.email)
        if (userId) {
          notifValues.push(`($${paramIdx}, $${paramIdx+1}, $${paramIdx+2}, $${paramIdx+3}, $${paramIdx+4}, $${paramIdx+5})`)
          notifParams.push(
            userId,
            player.team_id,
            'potm',
            `⭐ ${player.name} - Player of the Match!`,
            reason
              ? `${player.name} was named Player of the Match vs ${match.opponent}! "${reason}"`
              : `${player.name} was named Player of the Match vs ${match.opponent}!`,
            JSON.stringify({
              match_id: id,
              opponent: match.opponent,
              match_date: match.date,
              player_id,
              player_name: player.name,
              reason
            })
          )
          paramIdx += 6
        }
      }
      if (notifValues.length > 0) {
        await pool.query(
          `INSERT INTO notifications (user_id, team_id, type, title, message, data)
           VALUES ${notifValues.join(', ')}`,
          notifParams
        )
      }

      // Send POTM emails in parallel
      await Promise.allSettled(parentContacts.map(contact =>
        sendPotmEmail(contact.email, {
          teamName: player.team_name,
          playerName: player.name,
          matchInfo,
          reason,
          awardedBy: req.user.name,
        })
      ))
    }

    res.json({
      match,
      player_name: player?.name
    })
  } catch (error) {
    next(error)
  }
})

// Get player of the match stats for a player
router.get('/potm-stats/:playerId', authenticateToken, async (req, res, next) => {
  try {
    const { playerId } = req.params

    const result = await pool.query(
      `SELECT
        COUNT(*) as total_awards,
        MAX(m.date) as last_award_date,
        json_agg(json_build_object(
          'match_id', m.id,
          'opponent', m.opponent,
          'date', m.date,
          'reason', m.player_of_match_reason
        ) ORDER BY m.date DESC) as awards
       FROM matches m
       WHERE m.player_of_match_id = $1`,
      [playerId]
    )

    res.json(result.rows[0])
  } catch (error) {
    next(error)
  }
})

// Delete match
router.delete('/:id', authenticateToken, async (req, res, next) => {
  try {
    const { id } = req.params
    const result = await pool.query('DELETE FROM matches WHERE id = $1 RETURNING id', [id])
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Match not found' })
    }
    res.json({ message: 'Match deleted' })
  } catch (error) {
    next(error)
  }
})

// ============== AVAILABILITY ENDPOINTS ==============

// Get match availability for all players
router.get('/:id/availability', authenticateToken, async (req, res, next) => {
  try {
    const { id } = req.params

    // Get match and team_id
    const matchResult = await pool.query('SELECT team_id FROM matches WHERE id = $1', [id])
    if (matchResult.rows.length === 0) {
      return res.status(404).json({ message: 'Match not found' })
    }
    const { team_id } = matchResult.rows[0]

    // Get all players with their availability status
    const result = await pool.query(
      `SELECT
        p.id as player_id,
        p.name as player_name,
        p.squad_number,
        p.positions,
        COALESCE(ma.status, 'pending') as status,
        ma.notes,
        ma.responded_at,
        ma.user_id
       FROM players p
       LEFT JOIN match_availability ma ON ma.player_id = p.id AND ma.match_id = $1
       WHERE p.team_id = $2 AND p.is_active = true
       ORDER BY p.name`,
      [id, team_id]
    )

    // Normalize positions from JSONB format to simple string array
    const availabilityWithNormalizedPositions = result.rows.map(row => ({
      ...row,
      positions: normalizePositions(row.positions)
    }))

    res.json(availabilityWithNormalizedPositions)
  } catch (error) {
    next(error)
  }
})

// Update availability for a player (can be called by parent/player or manager)
router.post('/:id/availability', authenticateToken, async (req, res, next) => {
  try {
    const { id } = req.params
    const { player_id, status, notes } = req.body

    if (!player_id || !status) {
      return res.status(400).json({ message: 'player_id and status are required' })
    }

    if (!['available', 'unavailable', 'maybe', 'pending'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status' })
    }

    // Upsert availability
    const result = await pool.query(
      `INSERT INTO match_availability (match_id, player_id, user_id, status, notes, responded_at)
       VALUES ($1, $2, $3, $4, $5, NOW())
       ON CONFLICT (match_id, player_id)
       DO UPDATE SET status = $4, notes = $5, user_id = $3, responded_at = NOW(), updated_at = NOW()
       RETURNING *`,
      [id, player_id, req.user.id, status, notes || null]
    )

    res.json(result.rows[0])
  } catch (error) {
    next(error)
  }
})

// Bulk update availability (for parents with multiple children)
router.post('/:id/availability/bulk', authenticateToken, async (req, res, next) => {
  try {
    const { id } = req.params
    const { availabilities } = req.body // Array of { player_id, status, notes }

    if (!Array.isArray(availabilities)) {
      return res.status(400).json({ message: 'availabilities must be an array' })
    }

    const results = []
    for (const avail of availabilities) {
      const { player_id, status, notes } = avail
      const result = await pool.query(
        `INSERT INTO match_availability (match_id, player_id, user_id, status, notes, responded_at)
         VALUES ($1, $2, $3, $4, $5, NOW())
         ON CONFLICT (match_id, player_id)
         DO UPDATE SET status = $4, notes = $5, user_id = $3, responded_at = NOW(), updated_at = NOW()
         RETURNING *`,
        [id, player_id, req.user.id, status, notes || null]
      )
      results.push(result.rows[0])
    }

    res.json(results)
  } catch (error) {
    next(error)
  }
})

// ============== SQUAD SELECTION ENDPOINTS ==============

// Get match squad
router.get('/:id/squad', authenticateToken, async (req, res, next) => {
  try {
    const { id } = req.params

    const result = await pool.query(
      `SELECT
        ms.*,
        p.name as player_name,
        p.squad_number,
        p.positions as player_positions
       FROM match_squads ms
       JOIN players p ON ms.player_id = p.id
       WHERE ms.match_id = $1
       ORDER BY ms.is_starting DESC, p.name`,
      [id]
    )

    // Normalize player_positions from JSONB format to simple string array
    const squadWithNormalizedPositions = result.rows.map(row => ({
      ...row,
      player_positions: normalizePositions(row.player_positions)
    }))

    res.json(squadWithNormalizedPositions)
  } catch (error) {
    next(error)
  }
})

// Update match squad (manager only)
router.post('/:id/squad', authenticateToken, async (req, res, next) => {
  try {
    const { id } = req.params
    const { squad } = req.body // Array of { player_id, position, is_starting }

    if (!Array.isArray(squad)) {
      return res.status(400).json({ message: 'squad must be an array' })
    }

    // Check manager role
    if (req.user.role !== 'manager' && req.user.role !== 'assistant') {
      return res.status(403).json({ message: 'Only managers can set the squad' })
    }

    // Clear existing squad
    await pool.query('DELETE FROM match_squads WHERE match_id = $1', [id])

    // Insert new squad
    const results = []
    for (const player of squad) {
      const { player_id, position, is_starting, notes } = player
      const result = await pool.query(
        `INSERT INTO match_squads (match_id, player_id, position, is_starting, notes)
         VALUES ($1, $2, $3, $4, $5) RETURNING *`,
        [id, player_id, position || null, is_starting || false, notes || null]
      )
      results.push(result.rows[0])
    }

    res.json(results)
  } catch (error) {
    next(error)
  }
})

// Announce squad (triggers notifications)
router.post('/:id/squad/announce', authenticateToken, async (req, res, next) => {
  const client = await pool.connect()
  try {
    const { id } = req.params
    const { meetup_time, meetup_location, force } = req.body

    // Check manager role
    if (req.user.role !== 'manager' && req.user.role !== 'assistant') {
      return res.status(403).json({ message: 'Only managers can announce the squad' })
    }

    await client.query('BEGIN')

    // Lock the match row and get details in one query to prevent concurrent announces
    const matchResult = await client.query('SELECT * FROM matches WHERE id = $1 FOR UPDATE', [id])
    if (matchResult.rows.length === 0) {
      await client.query('ROLLBACK')
      return res.status(404).json({ message: 'Match not found' })
    }
    const match = matchResult.rows[0]

    // Idempotency guard: if squad was announced in the last 2 minutes and this isn't
    // an explicit re-announce (force=true), treat it as a duplicate/retry and return
    // success without re-sending emails
    if (match.squad_announced && match.squad_announced_at && !force) {
      const secondsSinceAnnounce = (Date.now() - new Date(match.squad_announced_at).getTime()) / 1000
      if (secondsSinceAnnounce < 120) {
        await client.query('ROLLBACK')
        console.log(`Squad announce for match ${id}: duplicate request within ${Math.round(secondsSinceAnnounce)}s, skipping emails`)
        return res.json({
          message: 'Squad already announced',
          duplicate: true,
          players_notified: 0,
          emails_sent: 0,
          emails_attempted: 0,
          email_enabled: isEmailEnabled()
        })
      }
    }

    // Get team details for emails
    const teamResult = await client.query('SELECT * FROM teams WHERE id = $1', [match.team_id])
    const teamName = teamResult.rows[0]?.name || 'Your Team'
    const teamTz = teamResult.rows[0]?.timezone || 'Europe/London'

    // Get squad with player details and linked Player Lounge accounts
    const squadResult = await client.query(
      `SELECT ms.*, p.name as player_name,
              COALESCE(p.user_id, u.id) as user_id,
              u.email as user_email
       FROM match_squads ms
       JOIN players p ON ms.player_id = p.id
       LEFT JOIN users u ON u.player_id = p.id
       WHERE ms.match_id = $1`,
      [id]
    )

    // Send emails BEFORE committing DB changes so a failure can be rolled back
    const matchInfo = `${match.is_home ? 'vs' : '@'} ${match.opponent}`
    const matchDate = new Date(match.date).toLocaleDateString('en-GB', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      timeZone: teamTz,
    })

    const batchEmails = []
    for (const player of squadResult.rows) {
      if (!player.user_email) continue
      batchEmails.push({
        to: player.user_email,
        template: 'squadAnnouncement',
        data: {
          teamName,
          matchInfo,
          playerName: player.player_name,
          position: player.position || 'TBD',
          isStarting: player.is_starting,
          matchDate,
          meetupTime: meetup_time ? new Date(meetup_time).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: teamTz }) : null,
          meetupLocation: meetup_location || null,
        }
      })
    }
    const { sent: emailsSent } = await sendBatchEmails(batchEmails)

    // Now commit DB changes only after emails have been sent
    await client.query(
      `UPDATE matches SET
        squad_announced = true,
        squad_announced_at = NOW(),
        meetup_time = $2,
        meetup_location = $3,
        updated_at = NOW()
       WHERE id = $1`,
      [id, meetup_time || null, meetup_location || null]
    )

    // Batch insert notifications for all squad players with accounts
    const squadWithAccounts = squadResult.rows.filter(p => p.user_id)
    if (squadWithAccounts.length > 0) {
      try {
        const notifValues = []
        const notifParams = []
        let paramIdx = 1
        const matchDateStr = new Date(match.date || match.match_date).toLocaleDateString('en-GB', { timeZone: teamTz })
        for (const player of squadWithAccounts) {
          const message = `You have been selected for the match against ${match.opponent} on ${matchDateStr}. ${player.is_starting ? 'You are in the starting lineup!' : 'You are on the bench.'}`
          notifValues.push(`($${paramIdx}, $${paramIdx+1}, 'squad_announcement', $${paramIdx+2}, $${paramIdx+3}, $${paramIdx+4})`)
          notifParams.push(
            player.user_id,
            match.team_id,
            `Squad Announcement: ${match.opponent}`,
            message,
            JSON.stringify({
              match_id: id,
              position: player.position,
              is_starting: player.is_starting,
              meetup_time,
              meetup_location
            })
          )
          paramIdx += 5
        }
        await client.query(
          `INSERT INTO notifications (user_id, team_id, type, title, message, data)
           VALUES ${notifValues.join(', ')}`,
          notifParams
        )
      } catch (notifError) {
        console.error('Non-fatal: failed to insert notifications:', notifError.message)
      }

      // Send push notifications (fire-and-forget)
      for (const player of squadWithAccounts) {
        sendPushToUser(player.user_id, {
          title: `Squad: ${match.opponent}`,
          body: player.is_starting
            ? `You're starting! Position: ${player.position || 'TBD'}`
            : `You're in the squad for ${match.opponent}`,
          tag: `squad-${id}`,
          url: `/matches/${id}`,
        })
      }
    }

    await client.query('COMMIT')

    console.log(`Squad announced for match ${id}: ${squadResult.rows.length} players, ${emailsSent}/${batchEmails.length} emails sent to linked accounts`)

    res.json({
      message: 'Squad announced',
      players_notified: squadResult.rows.length,
      emails_sent: emailsSent,
      emails_attempted: batchEmails.length,
      email_enabled: isEmailEnabled()
    })
  } catch (error) {
    try { await client.query('ROLLBACK') } catch (rbErr) { console.error('Rollback failed:', rbErr.message) }
    console.error('Squad announce error:', error.message, error.stack)
    next(error)
  } finally {
    client.release()
  }
})

// Request availability (send notifications to all players)
router.post('/:id/availability/request', authenticateToken, async (req, res, next) => {
  try {
    const { id } = req.params
    const { deadline, pendingOnly } = req.body

    // Check manager role
    if (req.user.role !== 'manager' && req.user.role !== 'assistant') {
      return res.status(403).json({ message: 'Only managers can request availability' })
    }

    // Get match details
    const matchResult = await pool.query('SELECT * FROM matches WHERE id = $1', [id])
    if (matchResult.rows.length === 0) {
      return res.status(404).json({ message: 'Match not found' })
    }
    const match = matchResult.rows[0]

    // Update deadline
    if (deadline) {
      await pool.query(
        'UPDATE matches SET availability_deadline = $1, updated_at = NOW() WHERE id = $2',
        [deadline, id]
      )
    }

    // Get team details for emails
    const teamResult = await pool.query('SELECT * FROM teams WHERE id = $1', [match.team_id])
    const teamName = teamResult.rows[0]?.name || 'Your Team'
    const teamTz = teamResult.rows[0]?.timezone || 'Europe/London'

    // Get players — optionally filter to only those who haven't responded
    const playersResult = await pool.query(
      `SELECT p.*, u.id as user_id, u.email as user_email
       FROM players p
       LEFT JOIN users u ON u.player_id = p.id
       ${pendingOnly ? 'LEFT JOIN match_availability ma ON ma.player_id = p.id AND ma.match_id = $2' : ''}
       WHERE p.team_id = $1 AND (p.is_active IS NULL OR p.is_active = true)
       ${pendingOnly ? 'AND ma.id IS NULL' : ''}`,
      pendingOnly ? [match.team_id, id] : [match.team_id]
    )

    // Batch insert notifications for all players with linked accounts
    const playersWithAccounts = playersResult.rows.filter(p => p.user_id)
    let notified = playersWithAccounts.length
    if (playersWithAccounts.length > 0) {
      const notifValues = []
      const notifParams = []
      let paramIdx = 1
      const notifTitle = `Availability Needed: ${match.opponent}`
      const notifMessage = `Please confirm your availability for the match against ${match.opponent} on ${new Date(match.date).toLocaleDateString('en-GB', { timeZone: teamTz })}.${deadline ? ` Respond by ${new Date(deadline).toLocaleDateString('en-GB', { timeZone: teamTz })}.` : ''}`
      const notifData = JSON.stringify({ match_id: id, deadline })

      for (const player of playersWithAccounts) {
        notifValues.push(`($${paramIdx}, $${paramIdx+1}, 'availability_request', $${paramIdx+2}, $${paramIdx+3}, $${paramIdx+4})`)
        notifParams.push(player.user_id, match.team_id, notifTitle, notifMessage, notifData)
        paramIdx += 5
      }
      await pool.query(
        `INSERT INTO notifications (user_id, team_id, type, title, message, data)
         VALUES ${notifValues.join(', ')}`,
        notifParams
      )
    }

    // Build email context
    const matchInfo = `${match.is_home ? 'vs' : '@'} ${match.opponent}`
    const matchDate = new Date(match.date).toLocaleDateString('en-GB', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      timeZone: teamTz,
    })
    const responseLink = `${getFrontendUrl()}/matches/${id}/availability`

    // 1. Collect all email recipients (player accounts + guardians), deduplicated
    const batchEmails = []
    const emailledAddresses = new Set()
    for (const player of playersWithAccounts) {
      if (!player.user_email) continue
      emailledAddresses.add(player.user_email.toLowerCase())
      batchEmails.push({
        to: player.user_email,
        template: 'availabilityRequest',
        data: { teamName, playerName: player.name, matchInfo, matchDate, responseLink }
      })
    }

    // 2. Add linked guardians/parents via the guardians table
    const teamResult2 = await pool.query('SELECT club_id FROM teams WHERE id = $1', [match.team_id])
    const clubId = teamResult2.rows[0]?.club_id
    if (clubId) {
      const guardiansResult = await pool.query(
        `SELECT DISTINCT g.email, g.first_name, g.notification_preferences, p.name as player_name
         FROM guardians g
         JOIN player_guardians pg ON pg.guardian_id = g.id
         JOIN players p ON pg.player_id = p.id
         ${pendingOnly ? 'LEFT JOIN match_availability ma ON ma.player_id = p.id AND ma.match_id = $3' : ''}
         WHERE g.club_id = $1 AND p.team_id = $2 AND (p.is_active IS NULL OR p.is_active = true)
         AND g.email IS NOT NULL
         ${pendingOnly ? 'AND ma.id IS NULL' : ''}`,
        pendingOnly ? [clubId, match.team_id, id] : [clubId, match.team_id]
      )
      for (const guardian of guardiansResult.rows) {
        const prefs = guardian.notification_preferences || {}
        if (prefs.availability === false) continue
        if (emailledAddresses.has(guardian.email.toLowerCase())) continue
        emailledAddresses.add(guardian.email.toLowerCase())
        batchEmails.push({
          to: guardian.email,
          template: 'availabilityRequest',
          data: { teamName, playerName: guardian.player_name, matchInfo, matchDate, responseLink }
        })
      }
    }

    // Send all emails in a single batch API call (avoids Resend rate limits)
    const { sent: emailsSent } = await sendBatchEmails(batchEmails)

    // 3. Send push notifications to linked player accounts
    for (const player of playersWithAccounts) {
      sendPushToUser(player.user_id, {
        title: `📋 Availability: ${match.opponent}`,
        body: `Please confirm availability for ${matchDate}`,
        tag: `availability-${id}`,
        url: `/matches/${id}/availability`,
      })
    }

    console.log(`Availability requested for match ${id}: ${notified} players notified, ${emailsSent}/${batchEmails.length} emails sent (incl. guardians)`)

    res.json({
      message: 'Availability request sent',
      players_notified: notified,
      total_players: playersResult.rows.length,
      emails_sent: emailsSent,
      email_enabled: isEmailEnabled()
    })
  } catch (error) {
    next(error)
  }
})

// ============== MATCH MEDIA (Parent/Player uploads) ==============

// Configure multer for media uploads (photos and videos)
const mediaStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../uploads/match-media')
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true })
    }
    cb(null, uploadDir)
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
    cb(null, `media-${req.params.id}-${uniqueSuffix}${path.extname(file.originalname)}`)
  }
})

const mediaUpload = multer({
  storage: mediaStorage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB limit
  fileFilter: (req, file, cb) => {
    const isImage = file.mimetype.startsWith('image/')
    const isVideo = file.mimetype.startsWith('video/')
    if (isImage || isVideo) {
      return cb(null, true)
    }
    cb(new Error('Only image and video files are allowed'))
  }
})

// Get all media for a match
router.get('/:id/media', authenticateToken, async (req, res, next) => {
  try {
    const { id } = req.params
    const result = await pool.query(
      `SELECT mm.*, u.name as uploaded_by_name, p.name as player_name
       FROM match_media mm
       LEFT JOIN users u ON mm.uploaded_by = u.id
       LEFT JOIN players p ON mm.player_id = p.id
       WHERE mm.match_id = $1
       ORDER BY mm.created_at DESC`,
      [id]
    )
    res.json(result.rows)
  } catch (error) {
    next(error)
  }
})

// Upload media for match (parents, players, and coaches can upload)
router.post('/:id/media', authenticateToken, mediaUpload.array('media', 10), async (req, res, next) => {
  try {
    const { id } = req.params
    const { caption, player_id } = req.body

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: 'No media files provided' })
    }

    // Verify the match exists and user has access
    const matchResult = await pool.query('SELECT team_id FROM matches WHERE id = $1', [id])
    if (matchResult.rows.length === 0) {
      req.files.forEach(file => fs.unlinkSync(file.path))
      return res.status(404).json({ message: 'Match not found' })
    }

    // Verify user is part of this team
    if (req.user.team_id !== matchResult.rows[0].team_id) {
      req.files.forEach(file => fs.unlinkSync(file.path))
      return res.status(403).json({ message: 'Not authorized to upload media for this match' })
    }

    const uploadedMedia = []
    for (const file of req.files) {
      const storageKey = `match-media/${file.filename}`
      const mediaType = file.mimetype.startsWith('video/') ? 'video' : 'photo'
      const mediaUrl = await uploadFile(file.path, storageKey, { contentType: file.mimetype })

      const result = await pool.query(
        `INSERT INTO match_media
          (match_id, uploaded_by, player_id, filename, original_name, file_type, file_size, file_path, media_type, caption)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         RETURNING *`,
        [
          id,
          req.user.id,
          player_id || req.user.player_id || null,
          file.filename,
          file.originalname,
          file.mimetype,
          file.size,
          mediaUrl,
          mediaType,
          caption || null
        ]
      )
      uploadedMedia.push(result.rows[0])
    }

    res.json({
      message: `${uploadedMedia.length} file(s) uploaded successfully`,
      media: uploadedMedia
    })
  } catch (error) {
    if (req.files) {
      req.files.forEach(file => {
        try { if (fs.existsSync(file.path)) fs.unlinkSync(file.path) } catch { /* ignore */ }
      })
    }
    next(error)
  }
})

// Update media caption
router.patch('/:id/media/:mediaId', authenticateToken, async (req, res, next) => {
  try {
    const { mediaId } = req.params
    const { caption } = req.body

    // Check if user owns this media or is a manager
    const mediaResult = await pool.query('SELECT * FROM match_media WHERE id = $1', [mediaId])
    if (mediaResult.rows.length === 0) {
      return res.status(404).json({ message: 'Media not found' })
    }

    const media = mediaResult.rows[0]
    if (media.uploaded_by !== req.user.id && !['manager', 'assistant'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Not authorized to update this media' })
    }

    const result = await pool.query(
      'UPDATE match_media SET caption = $1 WHERE id = $2 RETURNING *',
      [caption, mediaId]
    )

    res.json(result.rows[0])
  } catch (error) {
    next(error)
  }
})

// Delete media
router.delete('/:id/media/:mediaId', authenticateToken, async (req, res, next) => {
  try {
    const { mediaId } = req.params

    // Check if user owns this media or is a manager
    const mediaResult = await pool.query('SELECT * FROM match_media WHERE id = $1', [mediaId])
    if (mediaResult.rows.length === 0) {
      return res.status(404).json({ message: 'Media not found' })
    }

    const media = mediaResult.rows[0]
    if (media.uploaded_by !== req.user.id && !['manager', 'assistant'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Not authorized to delete this media' })
    }

    // Delete file (cloud or local)
    await deleteFile(media.file_path)

    // Delete from database
    await pool.query('DELETE FROM match_media WHERE id = $1', [mediaId])

    res.json({ message: 'Media deleted successfully' })
  } catch (error) {
    next(error)
  }
})

// ============================================
// Parent POTM Voting
// ============================================

// POST /matches/:id/parent-potm-vote - Cast a parent POTM vote
router.post('/:id/parent-potm-vote', authenticateToken, async (req, res, next) => {
  try {
    const { id } = req.params
    const { player_id } = req.body
    const userId = req.user.id

    if (!player_id) {
      return res.status(400).json({ message: 'player_id is required' })
    }

    // Verify match exists and is a past match
    const matchResult = await pool.query(
      'SELECT id, team_id, date, opponent FROM matches WHERE id = $1',
      [id]
    )
    if (matchResult.rows.length === 0) {
      return res.status(404).json({ message: 'Match not found' })
    }

    // Verify player belongs to this team
    const playerResult = await pool.query(
      'SELECT id, name FROM players WHERE id = $1 AND team_id = $2',
      [player_id, matchResult.rows[0].team_id]
    )
    if (playerResult.rows.length === 0) {
      return res.status(400).json({ message: 'Player not found in this team' })
    }

    // Upsert vote (one vote per user per match)
    const result = await pool.query(
      `INSERT INTO parent_potm_votes (match_id, user_id, player_id)
       VALUES ($1, $2, $3)
       ON CONFLICT (match_id, user_id) DO UPDATE SET player_id = $3, created_at = NOW()
       RETURNING *`,
      [id, userId, player_id]
    )

    // Check if this player now has the most votes - auto-award badge
    const voteCountResult = await pool.query(
      `SELECT player_id, COUNT(*) as vote_count
       FROM parent_potm_votes WHERE match_id = $1
       GROUP BY player_id ORDER BY vote_count DESC LIMIT 1`,
      [id]
    )

    res.json({
      vote: result.rows[0],
      player_name: playerResult.rows[0].name,
      leading_player_id: voteCountResult.rows[0]?.player_id,
      leading_vote_count: parseInt(voteCountResult.rows[0]?.vote_count || 0),
    })
  } catch (error) {
    next(error)
  }
})

// GET /matches/:id/parent-potm-votes - Get voting results for a match
// Managers see full vote tallies; parents/players only see their own vote + total count
router.get('/:id/parent-potm-votes', authenticateToken, async (req, res, next) => {
  try {
    const { id } = req.params
    const userId = req.user.id
    const isManager = ['manager', 'assistant'].includes(req.user.role)

    // Get this user's vote
    const myVoteResult = await pool.query(
      'SELECT player_id FROM parent_potm_votes WHERE match_id = $1 AND user_id = $2',
      [id, userId]
    )

    // Get total votes
    const totalResult = await pool.query(
      'SELECT COUNT(*) as total FROM parent_potm_votes WHERE match_id = $1',
      [id]
    )

    const response = {
      my_vote: myVoteResult.rows[0]?.player_id || null,
      total_votes: parseInt(totalResult.rows[0]?.total || 0),
    }

    // Only managers/assistants see the full vote breakdown
    if (isManager) {
      const votesResult = await pool.query(
        `SELECT ppv.player_id, p.name as player_name, p.squad_number, COUNT(*) as vote_count
         FROM parent_potm_votes ppv
         JOIN players p ON ppv.player_id = p.id
         WHERE ppv.match_id = $1
         GROUP BY ppv.player_id, p.name, p.squad_number
         ORDER BY vote_count DESC`,
        [id]
      )
      response.votes = votesResult.rows
    } else {
      response.votes = []
    }

    res.json(response)
  } catch (error) {
    next(error)
  }
})

// POST /matches/:id/parent-potm-award - Award Parents' Pick badge to the winner (manager only)
router.post('/:id/parent-potm-award', authenticateToken, async (req, res, next) => {
  try {
    const { id } = req.params

    if (!['manager', 'assistant'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Only managers can award badges' })
    }

    // Get match info
    const matchResult = await pool.query('SELECT id, team_id, opponent, date FROM matches WHERE id = $1', [id])
    if (matchResult.rows.length === 0) {
      return res.status(404).json({ message: 'Match not found' })
    }
    const match = matchResult.rows[0]

    // Get the player with the most votes
    const winnerResult = await pool.query(
      `SELECT ppv.player_id, p.name as player_name, COUNT(*) as vote_count
       FROM parent_potm_votes ppv
       JOIN players p ON ppv.player_id = p.id
       WHERE ppv.match_id = $1
       GROUP BY ppv.player_id, p.name
       ORDER BY vote_count DESC LIMIT 1`,
      [id]
    )

    if (winnerResult.rows.length === 0) {
      return res.status(400).json({ message: 'No votes cast for this match' })
    }

    const winner = winnerResult.rows[0]

    // Award the Parents' Pick badge
    await pool.query(
      `INSERT INTO player_achievements (player_id, achievement_type, title, description, icon, match_id, awarded_by)
       VALUES ($1, 'parents_pick', $2, $3, '❤️', $4, $5)`,
      [
        winner.player_id,
        `Parents' Pick vs ${match.opponent}`,
        `Voted Parents' Player of the Match with ${winner.vote_count} vote${winner.vote_count > 1 ? 's' : ''}`,
        id,
        req.user.id,
      ]
    )

    res.json({
      winner_player_id: winner.player_id,
      winner_name: winner.player_name,
      vote_count: parseInt(winner.vote_count),
    })
  } catch (error) {
    next(error)
  }
})

export default router
