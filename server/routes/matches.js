// Canonical column names: see server/routes/teams.js header comment.
// SELECT queries include legacy aliases (is_home, goals_for, etc.) for compat.

import { Router } from 'express'
import pool from '../config/database.js'
import { authenticateToken } from '../middleware/auth.js'
import { generateMatchPrep, generateMatchReport, generatePepTalk, generatePublicMatchReport } from '../services/claudeService.js'
import { sendPotmEmail, sendSquadAnnouncementEmail, sendAvailabilityRequestEmail, isEmailEnabled, sendBatchEmails } from '../services/emailService.js'
import { sendPushToUser } from '../services/pushService.js'
import { normalizePositions } from '../utils/pupilUtils.js'
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
    const result = await pool.query(
      `SELECT m.*,
        (m.home_away = 'home') AS is_home,
        m.score_for AS goals_for,
        m.score_against AS goals_against,
        m.team_notes AS notes,
        CASE WHEN m.score_for IS NOT NULL AND m.score_against IS NOT NULL
          THEN m.score_for || ' - ' || m.score_against ELSE NULL END AS result
       FROM matches m WHERE m.id = $1`, [id])
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
    const { opponent, date, location, isHome, formations, notes,
            veoLink, videoUrl, goalsFor, goalsAgainst, kitType, meetTime } = req.body

    const homeAway = isHome === undefined ? undefined : (isHome ? 'home' : 'away')
    const dbResult = await pool.query(
      `UPDATE matches SET
        opponent = COALESCE($1, opponent),
        match_date = COALESCE($2, match_date),
        date = COALESCE($2, date),
        location = COALESCE($3, location),
        home_away = COALESCE($4, home_away),
        team_notes = COALESCE($5, team_notes),
        veo_link = COALESCE($6, veo_link),
        video_url = COALESCE($7, video_url),
        formations = COALESCE($8::jsonb, formations),
        score_for = COALESCE($9, score_for),
        score_against = COALESCE($10, score_against),
        kit_type = COALESCE($11, kit_type),
        meet_time = $12,
        updated_at = NOW()
       WHERE id = $13
       RETURNING *,
        (home_away = 'home') AS is_home,
        score_for AS goals_for,
        score_against AS goals_against,
        team_notes AS notes,
        CASE WHEN score_for IS NOT NULL AND score_against IS NOT NULL
          THEN score_for || ' - ' || score_against ELSE NULL END AS result`,
      [opponent, date, location, homeAway, notes, veoLink, videoUrl,
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

// Share match prep with pupils (dedicated endpoint)
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
        `SELECT opponent, COALESCE(date, match_date) AS date, (home_away = 'home') AS is_home,
                score_for AS goals_for, score_against AS goals_against, competition
         FROM matches
         WHERE team_id = $1 AND score_for IS NOT NULL AND score_against IS NOT NULL AND id != $2
         ORDER BY COALESCE(date, match_date) DESC LIMIT 10`,
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
      // Squad pupils with recent observations
      pool.query(
        `SELECT p.id, p.name, p.positions,
                COALESCE(
                  json_agg(
                    json_build_object('type', o.type, 'content', o.content)
                    ORDER BY o.created_at DESC
                  ) FILTER (WHERE o.id IS NOT NULL),
                  '[]'
                ) as observations
         FROM pupils p
         LEFT JOIN observations o ON o.pupil_id = p.id AND o.created_at > NOW() - INTERVAL '60 days'
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
         JOIN pupils p ON ms.pupil_id = p.id
         WHERE ms.match_id = $1
         ORDER BY ms.is_starting DESC, ms.position`,
        [id]
      ),
    ])

    // Resolve tactics board pupil-position assignments to names
    let tacticsPositions = null
    const teamPositions = typeof team.positions === 'string' ? JSON.parse(team.positions) : team.positions
    const teamBenchPlayers = typeof team.bench_players === 'string' ? JSON.parse(team.bench_players) : (team.bench_players || [])

    // Collect all available pupil IDs (starting XI + bench) so we can filter observations
    let availablePlayerIds = []

    if (teamPositions && Array.isArray(teamPositions)) {
      const assignedPositions = teamPositions.filter(p => p.pupilId)
      if (assignedPositions.length > 0) {
        const pupilIds = assignedPositions.map(p => String(p.pupilId))
        availablePlayerIds.push(...pupilIds)
        const playerNamesRes = await pool.query(
          'SELECT id, name FROM pupils WHERE id::text = ANY($1)',
          [pupilIds]
        )
        const nameMap = Object.fromEntries(playerNamesRes.rows.map(p => [String(p.id), p.name]))
        tacticsPositions = assignedPositions.map(p => ({
          position: p.label,
          playerName: nameMap[String(p.pupilId)] || 'Unknown',
        }))
      }
    }

    // Add bench pupil IDs to available list and resolve their names
    let benchPlayerNames = []
    if (teamBenchPlayers.length > 0) {
      const benchIds = teamBenchPlayers.map(id => String(id))
      availablePlayerIds.push(...benchIds)
      const benchNamesRes = await pool.query(
        'SELECT id, name, positions FROM pupils WHERE id::text = ANY($1)',
        [benchIds]
      )
      benchPlayerNames = benchNamesRes.rows
    }

    // Also include match squad pupil IDs if present
    if (matchSquadRes.rows.length > 0) {
      // match_squads are definitive - override tactics-based available list
      availablePlayerIds = []
      const squadPlayerRes = await pool.query(
        'SELECT p.id FROM match_squads ms JOIN pupils p ON ms.pupil_id = p.id WHERE ms.match_id = $1',
        [id]
      )
      availablePlayerIds = squadPlayerRes.rows.map(r => String(r.id))
    }

    // Filter squad observations to only available pupils (starting XI + bench)
    let filteredObservations = squadObsRes.rows
    if (availablePlayerIds.length > 0) {
      filteredObservations = squadObsRes.rows.filter(p => availablePlayerIds.includes(String(p.id)))
    }

    // Resolve set piece taker IDs to pupil names (stored inside game_model)
    let setPieceTakers = null
    const teamGameModel = typeof team.game_model === 'string' ? JSON.parse(team.game_model) : team.game_model
    const rawTakers = teamGameModel?.setPieceTakers
    if (rawTakers && Object.values(rawTakers).some(v => v)) {
      // Separate pupil ID fields from metadata fields (like _foot preferences)
      const footFields = ['corners_left_foot', 'corners_right_foot']
      const playerEntries = Object.entries(rawTakers).filter(([key, val]) => val && !footFields.includes(key))
      const takerIds = [...new Set(playerEntries.map(([, val]) => String(val)))]
      if (takerIds.length > 0) {
        const takerNamesRes = await pool.query(
          'SELECT id, name FROM pupils WHERE id::text = ANY($1)',
          [takerIds]
        )
        const takerNameMap = Object.fromEntries(takerNamesRes.rows.map(p => [String(p.id), p.name]))
        setPieceTakers = {}
        for (const [role, pupilId] of playerEntries) {
          if (pupilId) setPieceTakers[role] = takerNameMap[String(pupilId)] || null
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

    // Wait for stream to complete - don't throw if we already have content
    try {
      await stream.finalMessage()
    } catch (streamErr) {
      console.error('Stream finalization warning:', streamErr.message)
      // If we got text, the generation succeeded - don't treat as error
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

// Generate AI match report for parents/pupils
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

    // Load pupil of the match
    let playerOfMatch = null
    if (match.player_of_match_id) {
      const pomResult = await pool.query(
        'SELECT name FROM pupils WHERE id = $1',
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
         LEFT JOIN pupils sp ON mg.scorer_pupil_id = sp.id
         LEFT JOIN pupils ap ON mg.assist_pupil_id = ap.id
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

// Publish/unpublish match report to Pupil Zone
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
      message: updatedReport.published ? 'Report shared to Pupil Zone' : 'Report hidden from Pupil Zone'
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

// Generate public match report (AI draft)
router.post('/:id/public-report/generate', authenticateToken, async (req, res, next) => {
  try {
    const { id } = req.params
    const match = await pool.query(
      `SELECT m.*, t.name AS team_name, t.sport, t.age_group, t.school_id,
              (SELECT name FROM pupils WHERE id = m.player_of_match_id) AS potm_name
       FROM matches m JOIN teams t ON t.id = m.team_id WHERE m.id = $1`, [id]
    )
    if (!match.rows.length) return res.status(404).json({ message: 'Match not found' })
    const m = match.rows[0]

    const school = await pool.query('SELECT public_name_format FROM schools WHERE id = $1', [m.school_id])
    const nameFormat = school.rows[0]?.public_name_format || 'first_initial'

    const goals = await pool.query(
      `SELECT mg.*, p.name AS scorer FROM match_goals mg LEFT JOIN pupils p ON p.id = mg.pupil_id WHERE mg.match_id = $1`,
      [id]
    ).catch(() => ({ rows: [] }))

    const text = await generatePublicMatchReport({
      teamName: m.team_name, opponent: m.opponent,
      scoreFor: m.score_for, scoreAgainst: m.score_against,
      sport: m.sport, ageGroup: m.age_group,
      date: m.date || m.match_date, venue: m.location,
      homeAway: m.home_away, coachNotes: m.team_notes,
      potmName: m.potm_name, goals: goals.rows, nameFormat,
    })

    await pool.query(
      `UPDATE matches SET match_report_text = $1, match_report_status = 'draft', updated_at = NOW() WHERE id = $2`,
      [text, id]
    )
    res.json({ text, status: 'draft' })
  } catch (error) {
    console.error('Public report generation failed:', error)
    res.status(500).json({ message: error.message || 'Failed to generate report' })
  }
})

// Update public match report text (coach edits)
router.put('/:id/public-report', authenticateToken, async (req, res, next) => {
  try {
    const { id } = req.params
    const { text } = req.body
    await pool.query(
      `UPDATE matches SET match_report_text = $1, match_report_status = 'draft', updated_at = NOW() WHERE id = $2`,
      [text, id]
    )
    res.json({ text, status: 'draft' })
  } catch (error) { next(error) }
})

// Approve and publish public match report
router.post('/:id/public-report/publish', authenticateToken, async (req, res, next) => {
  try {
    const { id } = req.params
    const { publish } = req.body
    const status = publish !== false ? 'published' : 'draft'
    await pool.query(
      `UPDATE matches SET match_report_status = $1, match_report_approved_by = $2,
        match_report_approved_at = NOW(), updated_at = NOW() WHERE id = $3`,
      [status, req.user.id, id]
    )
    res.json({ status })
  } catch (error) { next(error) }
})

// Generate pre-match pep talk for a pupil
router.post('/:id/pep-talk/:pupilId', authenticateToken, async (req, res, next) => {
  try {
    const { id, pupilId } = req.params

    // Get match details
    const matchResult = await pool.query('SELECT * FROM matches WHERE id = $1', [id])
    if (matchResult.rows.length === 0) {
      return res.status(404).json({ message: 'Match not found' })
    }
    const match = matchResult.rows[0]

    // Get pupil details
    const playerResult = await pool.query('SELECT * FROM pupils WHERE id = $1', [pupilId])
    if (playerResult.rows.length === 0) {
      return res.status(404).json({ message: 'Pupil not found' })
    }
    const pupil = playerResult.rows[0]

    // Get team details
    const teamResult = await pool.query('SELECT * FROM teams WHERE id = $1', [match.team_id])
    const team = teamResult.rows[0]

    // Get match-day position if pupil is in the match squad
    const squadResult = await pool.query(
      'SELECT position FROM match_squads WHERE match_id = $1 AND pupil_id = $2',
      [id, pupilId]
    )
    const matchPosition = squadResult.rows[0]?.position || null

    // Fetch recent video analysis insights for this pupil
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
            f.name?.toLowerCase() === pupil.name?.toLowerCase() ||
            (pupil.squad_number && f.squad_number === pupil.squad_number)
          )
          if (playerNotes.length > 0) {
            videoInsights.push(...playerNotes)
          }
        }
      }
    } catch (err) {
      // Non-critical - continue without video insights
      console.warn('Could not fetch video analysis for pep talk:', err.message)
    }

    // Generate pep talk
    const pepTalk = await generatePepTalk(match, pupil, team, matchPosition, videoInsights)

    res.json({ pepTalk })
  } catch (error) {
    next(error)
  }
})

// ============== MATCH GOALS & ASSISTS ==============

// GET /matches/:id/goals - list goals for a match
router.get('/:id/goals', authenticateToken, async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT mg.*,
              sp.name AS scorer_name, sp.squad_number AS scorer_number,
              ap.name AS assist_name, ap.squad_number AS assist_number
       FROM match_goals mg
       LEFT JOIN pupils sp ON mg.scorer_pupil_id = sp.id
       LEFT JOIN pupils ap ON mg.assist_pupil_id = ap.id
       WHERE mg.match_id = $1
       ORDER BY mg.minute ASC NULLS LAST, mg.created_at ASC`,
      [req.params.id]
    )
    res.json(result.rows)
  } catch (error) {
    // Table may not exist yet - return empty array
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
      scorer_pupil_id UUID REFERENCES pupils(id) ON DELETE SET NULL,
      assist_pupil_id UUID REFERENCES pupils(id) ON DELETE SET NULL,
      minute INTEGER,
      goal_type VARCHAR(20) DEFAULT 'open_play',
      notes TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `)
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_match_goals_match ON match_goals(match_id)`)
  matchGoalsTableReady = true
}

// POST /matches/:id/goals - add a goal
router.post('/:id/goals', authenticateToken, async (req, res, next) => {
  try {
    await ensureMatchGoalsTable()
    const { scorer_pupil_id, assist_pupil_id, minute, goal_type, notes } = req.body
    const result = await pool.query(
      `INSERT INTO match_goals (match_id, scorer_pupil_id, assist_pupil_id, minute, goal_type, notes)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [req.params.id, scorer_pupil_id || null, assist_pupil_id || null, minute || null, goal_type || 'open_play', notes || null]
    )
    // Join pupil names for the response
    const goal = result.rows[0]
    if (goal.scorer_pupil_id) {
      const sp = await pool.query('SELECT name, squad_number FROM pupils WHERE id = $1', [goal.scorer_pupil_id])
      if (sp.rows[0]) { goal.scorer_name = sp.rows[0].name; goal.scorer_number = sp.rows[0].squad_number }
    }
    if (goal.assist_pupil_id) {
      const ap = await pool.query('SELECT name, squad_number FROM pupils WHERE id = $1', [goal.assist_pupil_id])
      if (ap.rows[0]) { goal.assist_name = ap.rows[0].name; goal.assist_number = ap.rows[0].squad_number }
    }
    res.status(201).json(goal)
  } catch (error) {
    next(error)
  }
})

// DELETE /matches/:id/goals/:goalId - remove a goal
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
       LEFT JOIN pupils poff ON ms.pupil_off_id = poff.id
       LEFT JOIN pupils pon ON ms.pupil_on_id = pon.id
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

// POST /matches/:id/substitutions - add a substitution
router.post('/:id/substitutions', authenticateToken, async (req, res, next) => {
  try {
    const { pupil_off_id, pupil_on_id, minute, notes } = req.body
    if (!pupil_off_id && !pupil_on_id) {
      return res.status(400).json({ message: 'At least one pupil is required' })
    }
    const result = await pool.query(
      `INSERT INTO match_substitutions (match_id, pupil_off_id, pupil_on_id, minute, notes)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [req.params.id, pupil_off_id || null, pupil_on_id || null, minute || null, notes || null]
    )
    const sub = result.rows[0]
    if (sub.pupil_off_id) {
      const p = await pool.query('SELECT name, squad_number FROM pupils WHERE id = $1', [sub.pupil_off_id])
      if (p.rows[0]) { sub.player_off_name = p.rows[0].name; sub.player_off_number = p.rows[0].squad_number }
    }
    if (sub.pupil_on_id) {
      const p = await pool.query('SELECT name, squad_number FROM pupils WHERE id = $1', [sub.pupil_on_id])
      if (p.rows[0]) { sub.player_on_name = p.rows[0].name; sub.player_on_number = p.rows[0].squad_number }
    }
    res.status(201).json(sub)
  } catch (error) {
    next(error)
  }
})

// DELETE /matches/:id/substitutions/:subId - remove a substitution
router.delete('/:id/substitutions/:subId', authenticateToken, async (req, res, next) => {
  try {
    await pool.query('DELETE FROM match_substitutions WHERE id = $1 AND match_id = $2', [req.params.subId, req.params.id])
    res.json({ message: 'Substitution removed' })
  } catch (error) {
    next(error)
  }
})

// ============== MATCH EVENTS (Sport-Specific) ==============

// GET /matches/:id/events - list events for a match
router.get('/:id/events', authenticateToken, async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT me.*, p.name AS pupil_name, p.squad_number AS pupil_number,
              sp.name AS secondary_pupil_name, sp.squad_number AS secondary_pupil_number
       FROM match_events me
       LEFT JOIN pupils p ON me.pupil_id = p.id
       LEFT JOIN pupils sp ON me.secondary_pupil_id = sp.id
       WHERE me.match_id = $1
       ORDER BY me.minute ASC NULLS LAST, me.created_at ASC`,
      [req.params.id]
    )
    res.json(result.rows)
  } catch (error) {
    next(error)
  }
})

// POST /matches/:id/events - add a match event
router.post('/:id/events', authenticateToken, async (req, res, next) => {
  try {
    const { event_type, pupil_id, secondary_pupil_id, minute, value, details, notes } = req.body
    if (!event_type) return res.status(400).json({ error: 'event_type is required' })
    const result = await pool.query(
      `INSERT INTO match_events (match_id, event_type, pupil_id, secondary_pupil_id, minute, value, details, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [req.params.id, event_type, pupil_id || null, secondary_pupil_id || null, minute || null, value || 1, details ? JSON.stringify(details) : '{}', notes || null]
    )
    res.status(201).json(result.rows[0])
  } catch (error) {
    next(error)
  }
})

// DELETE /matches/:id/events/:eventId - remove a match event
router.delete('/:id/events/:eventId', authenticateToken, async (req, res, next) => {
  try {
    await pool.query('DELETE FROM match_events WHERE id = $1 AND match_id = $2', [req.params.eventId, req.params.id])
    res.json({ message: 'Event removed' })
  } catch (error) {
    next(error)
  }
})

// ============== PUPIL MATCH STATS ==============

// GET /matches/:id/pupil-stats - get all pupil stats for a match
router.get('/:id/pupil-stats', authenticateToken, async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT mps.*, p.name AS pupil_name, p.squad_number
       FROM match_pupil_stats mps
       JOIN pupils p ON mps.pupil_id = p.id
       WHERE mps.match_id = $1
       ORDER BY p.squad_number NULLS LAST, p.name`,
      [req.params.id]
    )
    res.json(result.rows)
  } catch (error) {
    next(error)
  }
})

// PUT /matches/:id/pupil-stats/:pupilId - upsert stats for a pupil in a match
router.put('/:id/pupil-stats/:pupilId', authenticateToken, async (req, res, next) => {
  try {
    const { stats, rating, notes } = req.body
    const result = await pool.query(
      `INSERT INTO match_pupil_stats (match_id, pupil_id, stats, rating, notes)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (match_id, pupil_id)
       DO UPDATE SET stats = $3, rating = $4, notes = $5, updated_at = NOW()
       RETURNING *`,
      [req.params.id, req.params.pupilId, JSON.stringify(stats || {}), rating || null, notes || null]
    )
    res.json(result.rows[0])
  } catch (error) {
    next(error)
  }
})

// PUT /matches/:id/pupil-stats - bulk upsert stats for all pupils in a match
router.put('/:id/pupil-stats', authenticateToken, async (req, res, next) => {
  try {
    const { entries } = req.body
    if (!Array.isArray(entries)) return res.status(400).json({ error: 'entries array required' })
    const results = []
    for (const entry of entries) {
      const { pupil_id, stats, rating, notes } = entry
      if (!pupil_id) continue
      const r = await pool.query(
        `INSERT INTO match_pupil_stats (match_id, pupil_id, stats, rating, notes)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (match_id, pupil_id)
         DO UPDATE SET stats = $3, rating = $4, notes = $5, updated_at = NOW()
         RETURNING *`,
        [req.params.id, pupil_id, JSON.stringify(stats || {}), rating || null, notes || null]
      )
      results.push(r.rows[0])
    }
    res.json(results)
  } catch (error) {
    next(error)
  }
})

// GET /matches/pupil/:pupilId/season-stats - aggregate stats across all matches
router.get('/pupil/:pupilId/season-stats', authenticateToken, async (req, res, next) => {
  try {
    const { pupilId } = req.params
    const { team_id } = req.query

    const teamFilter = team_id ? 'AND m.team_id = $2' : ''
    const params = team_id ? [pupilId, team_id] : [pupilId]

    const appearances = await pool.query(
      `SELECT COUNT(DISTINCT ms.match_id) AS total,
              COUNT(DISTINCT CASE WHEN ms.is_starting THEN ms.match_id END) AS starts,
              COUNT(DISTINCT CASE WHEN NOT ms.is_starting THEN ms.match_id END) AS sub_appearances
       FROM match_squads ms
       JOIN matches m ON ms.match_id = m.id
       WHERE ms.pupil_id = $1 ${teamFilter}`,
      params
    )

    const events = await pool.query(
      `SELECT me.event_type, COUNT(*) AS count, SUM(me.value) AS total_value
       FROM match_events me
       JOIN matches m ON me.match_id = m.id
       WHERE me.pupil_id = $1 ${teamFilter}
       GROUP BY me.event_type`,
      params
    )

    const secondaryEvents = await pool.query(
      `SELECT me.event_type, COUNT(*) AS count
       FROM match_events me
       JOIN matches m ON me.match_id = m.id
       WHERE me.secondary_pupil_id = $1 ${teamFilter}
       GROUP BY me.event_type`,
      params
    )

    const ratings = await pool.query(
      `SELECT AVG(mps.rating) AS avg_rating, COUNT(mps.rating) AS rated_matches
       FROM match_pupil_stats mps
       JOIN matches m ON mps.match_id = m.id
       WHERE mps.pupil_id = $1 AND mps.rating IS NOT NULL ${teamFilter}`,
      params
    )

    const legacyGoals = await pool.query(
      `SELECT COUNT(*) AS goals FROM match_goals WHERE scorer_pupil_id = $1`, [pupilId]
    )
    const legacyAssists = await pool.query(
      `SELECT COUNT(*) AS assists FROM match_goals WHERE assist_pupil_id = $1`, [pupilId]
    )

    res.json({
      appearances: appearances.rows[0],
      events: events.rows,
      secondaryEvents: secondaryEvents.rows,
      avgRating: ratings.rows[0]?.avg_rating ? parseFloat(ratings.rows[0].avg_rating).toFixed(1) : null,
      ratedMatches: parseInt(ratings.rows[0]?.rated_matches || 0),
      legacy: {
        goals: parseInt(legacyGoals.rows[0]?.goals || 0),
        assists: parseInt(legacyAssists.rows[0]?.assists || 0),
      },
    })
  } catch (error) {
    next(error)
  }
})

// ============== PLAYER OF THE MATCH ==============

// Set pupil of the match
router.post('/:id/pupil-of-match', authenticateToken, async (req, res, next) => {
  try {
    const { id } = req.params
    const { pupil_id, reason } = req.body

    // Check manager role
    if (!['manager', 'assistant'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Only managers can set pupil of the match' })
    }

    if (!pupil_id) {
      return res.status(400).json({ message: 'pupil_id is required' })
    }

    // Update match with pupil of the match
    const result = await pool.query(
      `UPDATE matches SET
        player_of_match_id = $1,
        player_of_match_reason = $2,
        updated_at = NOW()
       WHERE id = $3 RETURNING *`,
      [pupil_id, reason || null, id]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Match not found' })
    }

    const match = result.rows[0]

    // Get pupil info for response and notifications
    const playerResult = await pool.query(
      'SELECT p.*, t.name as team_name FROM pupils p JOIN teams t ON p.team_id = t.id WHERE p.id = $1',
      [pupil_id]
    )
    const pupil = playerResult.rows[0]

    // Create notification for pupil (if they have a user account)
    if (pupil?.user_id) {
      await pool.query(
        `INSERT INTO notifications (user_id, team_id, type, title, message, data)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          pupil.user_id,
          pupil.team_id,
          'potm',
          `⭐ Pupil of the Match!`,
          reason
            ? `You were named Pupil of the Match vs ${match.opponent}! "${reason}"`
            : `You were named Pupil of the Match vs ${match.opponent}!`,
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
    if (pupil?.parent_contact) {
      try {
        const contacts = typeof pupil.parent_contact === 'string'
          ? JSON.parse(pupil.parent_contact)
          : pupil.parent_contact
        if (Array.isArray(contacts)) {
          parentContacts.push(...contacts.filter(c => c.email))
        }
      } catch {}
    }

    const matchInfo = `${match.home_away === 'home' ? 'vs' : '@'} ${match.opponent}`

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
            pupil.team_id,
            'potm',
            `⭐ ${pupil.name} - Pupil of the Match!`,
            reason
              ? `${pupil.name} was named Pupil of the Match vs ${match.opponent}! "${reason}"`
              : `${pupil.name} was named Pupil of the Match vs ${match.opponent}!`,
            JSON.stringify({
              match_id: id,
              opponent: match.opponent,
              match_date: match.date,
              pupil_id,
              player_name: pupil.name,
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
          teamName: pupil.team_name,
          playerName: pupil.name,
          matchInfo,
          reason,
          awardedBy: req.user.name,
        })
      ))
    }

    res.json({
      match,
      player_name: pupil?.name
    })
  } catch (error) {
    next(error)
  }
})

// Get pupil of the match stats for a pupil
router.get('/potm-stats/:pupilId', authenticateToken, async (req, res, next) => {
  try {
    const { pupilId } = req.params

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
      [pupilId]
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

// Get match availability for all pupils
router.get('/:id/availability', authenticateToken, async (req, res, next) => {
  try {
    const { id } = req.params

    // Get match and team_id
    const matchResult = await pool.query('SELECT team_id FROM matches WHERE id = $1', [id])
    if (matchResult.rows.length === 0) {
      return res.status(404).json({ message: 'Match not found' })
    }
    const { team_id } = matchResult.rows[0]

    // Get all pupils with their availability status
    const result = await pool.query(
      `SELECT
        p.id as pupil_id,
        p.name as player_name,
        p.squad_number,
        p.positions,
        COALESCE(ma.status, 'pending') as status,
        ma.notes,
        ma.responded_at,
        ma.user_id
       FROM pupils p
       LEFT JOIN match_availability ma ON ma.pupil_id = p.id AND ma.match_id = $1
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

// Update availability for a pupil (can be called by parent/pupil or manager)
router.post('/:id/availability', authenticateToken, async (req, res, next) => {
  try {
    const { id } = req.params
    const { pupil_id, status, notes } = req.body

    if (!pupil_id || !status) {
      return res.status(400).json({ message: 'pupil_id and status are required' })
    }

    if (!['available', 'unavailable', 'maybe', 'pending'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status' })
    }

    // Upsert availability
    const result = await pool.query(
      `INSERT INTO match_availability (match_id, pupil_id, user_id, status, notes, responded_at)
       VALUES ($1, $2, $3, $4, $5, NOW())
       ON CONFLICT (match_id, pupil_id)
       DO UPDATE SET status = $4, notes = $5, user_id = $3, responded_at = NOW(), updated_at = NOW()
       RETURNING *`,
      [id, pupil_id, req.user.id, status, notes || null]
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
    const { availabilities } = req.body // Array of { pupil_id, status, notes }

    if (!Array.isArray(availabilities)) {
      return res.status(400).json({ message: 'availabilities must be an array' })
    }

    const results = []
    for (const avail of availabilities) {
      const { pupil_id, status, notes } = avail
      const result = await pool.query(
        `INSERT INTO match_availability (match_id, pupil_id, user_id, status, notes, responded_at)
         VALUES ($1, $2, $3, $4, $5, NOW())
         ON CONFLICT (match_id, pupil_id)
         DO UPDATE SET status = $4, notes = $5, user_id = $3, responded_at = NOW(), updated_at = NOW()
         RETURNING *`,
        [id, pupil_id, req.user.id, status, notes || null]
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
       JOIN pupils p ON ms.pupil_id = p.id
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
    const { squad } = req.body // Array of { pupil_id, position, is_starting }

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
    for (const pupil of squad) {
      const { pupil_id, position, is_starting, notes } = pupil
      const result = await pool.query(
        `INSERT INTO match_squads (match_id, pupil_id, position, is_starting, notes)
         VALUES ($1, $2, $3, $4, $5) RETURNING *`,
        [id, pupil_id, position || null, is_starting || false, notes || null]
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

    // Get squad with pupil details and linked Pupil Lounge accounts
    const squadResult = await client.query(
      `SELECT ms.*, p.name as player_name,
              COALESCE(p.user_id, u.id) as user_id,
              u.email as user_email
       FROM match_squads ms
       JOIN pupils p ON ms.pupil_id = p.id
       LEFT JOIN users u ON u.pupil_id = p.id
       WHERE ms.match_id = $1`,
      [id]
    )

    // Send emails BEFORE committing DB changes so a failure can be rolled back
    const matchInfo = `${match.home_away === 'home' ? 'vs' : '@'} ${match.opponent}`
    const matchDate = new Date(match.date).toLocaleDateString('en-GB', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      timeZone: teamTz,
    })

    const batchEmails = []
    for (const pupil of squadResult.rows) {
      if (!pupil.user_email) continue
      batchEmails.push({
        to: pupil.user_email,
        template: 'squadAnnouncement',
        data: {
          teamName,
          matchInfo,
          playerName: pupil.player_name,
          position: pupil.position || 'TBD',
          isStarting: pupil.is_starting,
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

    // Batch insert notifications for all squad pupils with accounts
    const squadWithAccounts = squadResult.rows.filter(p => p.user_id)
    if (squadWithAccounts.length > 0) {
      try {
        const notifValues = []
        const notifParams = []
        let paramIdx = 1
        const matchDateStr = new Date(match.date || match.match_date).toLocaleDateString('en-GB', { timeZone: teamTz })
        for (const pupil of squadWithAccounts) {
          const message = `You have been selected for the match against ${match.opponent} on ${matchDateStr}. ${pupil.is_starting ? 'You are in the starting lineup!' : 'You are on the bench.'}`
          notifValues.push(`($${paramIdx}, $${paramIdx+1}, 'squad_announcement', $${paramIdx+2}, $${paramIdx+3}, $${paramIdx+4})`)
          notifParams.push(
            pupil.user_id,
            match.team_id,
            `Squad Announcement: ${match.opponent}`,
            message,
            JSON.stringify({
              match_id: id,
              position: pupil.position,
              is_starting: pupil.is_starting,
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
      for (const pupil of squadWithAccounts) {
        sendPushToUser(pupil.user_id, {
          title: `Squad: ${match.opponent}`,
          body: pupil.is_starting
            ? `You're starting! Position: ${pupil.position || 'TBD'}`
            : `You're in the squad for ${match.opponent}`,
          tag: `squad-${id}`,
          url: `/matches/${id}`,
        })
      }
    }

    await client.query('COMMIT')

    console.log(`Squad announced for match ${id}: ${squadResult.rows.length} pupils, ${emailsSent}/${batchEmails.length} emails sent to linked accounts`)

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

// Request availability (send notifications to all pupils)
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

    // Get pupils - optionally filter to only those who haven't responded
    const playersResult = await pool.query(
      `SELECT p.*, u.id as user_id, u.email as user_email
       FROM pupils p
       LEFT JOIN users u ON u.pupil_id = p.id
       ${pendingOnly ? 'LEFT JOIN match_availability ma ON ma.pupil_id = p.id AND ma.match_id = $2' : ''}
       WHERE p.team_id = $1 AND (p.is_active IS NULL OR p.is_active = true)
       ${pendingOnly ? 'AND ma.id IS NULL' : ''}`,
      pendingOnly ? [match.team_id, id] : [match.team_id]
    )

    // Batch insert notifications for all pupils with linked accounts
    const playersWithAccounts = playersResult.rows.filter(p => p.user_id)
    let notified = playersWithAccounts.length
    if (playersWithAccounts.length > 0) {
      const notifValues = []
      const notifParams = []
      let paramIdx = 1
      const notifTitle = `Availability Needed: ${match.opponent}`
      const notifMessage = `Please confirm your availability for the match against ${match.opponent} on ${new Date(match.date).toLocaleDateString('en-GB', { timeZone: teamTz })}.${deadline ? ` Respond by ${new Date(deadline).toLocaleDateString('en-GB', { timeZone: teamTz })}.` : ''}`
      const notifData = JSON.stringify({ match_id: id, deadline })

      for (const pupil of playersWithAccounts) {
        notifValues.push(`($${paramIdx}, $${paramIdx+1}, 'availability_request', $${paramIdx+2}, $${paramIdx+3}, $${paramIdx+4})`)
        notifParams.push(pupil.user_id, match.team_id, notifTitle, notifMessage, notifData)
        paramIdx += 5
      }
      await pool.query(
        `INSERT INTO notifications (user_id, team_id, type, title, message, data)
         VALUES ${notifValues.join(', ')}`,
        notifParams
      )
    }

    // Build email context
    const matchInfo = `${match.home_away === 'home' ? 'vs' : '@'} ${match.opponent}`
    const matchDate = new Date(match.date).toLocaleDateString('en-GB', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      timeZone: teamTz,
    })
    const responseLink = `${getFrontendUrl()}/matches/${id}/availability`

    // 1. Collect all email recipients (pupil accounts + guardians), deduplicated
    const batchEmails = []
    const emailledAddresses = new Set()
    for (const pupil of playersWithAccounts) {
      if (!pupil.user_email) continue
      emailledAddresses.add(pupil.user_email.toLowerCase())
      batchEmails.push({
        to: pupil.user_email,
        template: 'availabilityRequest',
        data: { teamName, playerName: pupil.name, matchInfo, matchDate, responseLink }
      })
    }

    // 2. Add linked guardians/parents via the guardians table
    const teamResult2 = await pool.query('SELECT school_id FROM teams WHERE id = $1', [match.team_id])
    const schoolId = teamResult2.rows[0]?.school_id
    if (schoolId) {
      const guardiansResult = await pool.query(
        `SELECT DISTINCT g.email, g.first_name, g.notification_preferences, p.name as player_name
         FROM guardians g
         JOIN pupil_guardians pg ON pg.guardian_id = g.id
         JOIN pupils p ON pg.pupil_id = p.id
         ${pendingOnly ? 'LEFT JOIN match_availability ma ON ma.pupil_id = p.id AND ma.match_id = $3' : ''}
         WHERE g.school_id = $1 AND p.team_id = $2 AND (p.is_active IS NULL OR p.is_active = true)
         AND g.email IS NOT NULL
         ${pendingOnly ? 'AND ma.id IS NULL' : ''}`,
        pendingOnly ? [schoolId, match.team_id, id] : [schoolId, match.team_id]
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

    // 3. Send push notifications to linked pupil accounts
    for (const pupil of playersWithAccounts) {
      sendPushToUser(pupil.user_id, {
        title: `📋 Availability: ${match.opponent}`,
        body: `Please confirm availability for ${matchDate}`,
        tag: `availability-${id}`,
        url: `/matches/${id}/availability`,
      })
    }

    console.log(`Availability requested for match ${id}: ${notified} pupils notified, ${emailsSent}/${batchEmails.length} emails sent (incl. guardians)`)

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

// ============== MATCH MEDIA (Parent/Pupil uploads) ==============

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
       LEFT JOIN pupils p ON mm.pupil_id = p.id
       WHERE mm.match_id = $1
       ORDER BY mm.created_at DESC`,
      [id]
    )
    res.json(result.rows)
  } catch (error) {
    next(error)
  }
})

// Upload media for match (parents, pupils, and coaches can upload)
router.post('/:id/media', authenticateToken, mediaUpload.array('media', 10), async (req, res, next) => {
  try {
    const { id } = req.params
    const { caption, pupil_id } = req.body

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
          (match_id, uploaded_by, pupil_id, filename, original_name, file_type, file_size, file_path, media_type, caption)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         RETURNING *`,
        [
          id,
          req.user.id,
          pupil_id || req.user.pupil_id || null,
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
    const { pupil_id } = req.body
    const userId = req.user.id

    if (!pupil_id) {
      return res.status(400).json({ message: 'pupil_id is required' })
    }

    // Verify match exists and is a past match
    const matchResult = await pool.query(
      'SELECT id, team_id, date, opponent FROM matches WHERE id = $1',
      [id]
    )
    if (matchResult.rows.length === 0) {
      return res.status(404).json({ message: 'Match not found' })
    }

    // Verify pupil belongs to this team
    const playerResult = await pool.query(
      'SELECT id, name FROM pupils WHERE id = $1 AND team_id = $2',
      [pupil_id, matchResult.rows[0].team_id]
    )
    if (playerResult.rows.length === 0) {
      return res.status(400).json({ message: 'Pupil not found in this team' })
    }

    // Upsert vote (one vote per user per match)
    const result = await pool.query(
      `INSERT INTO parent_potm_votes (match_id, user_id, pupil_id)
       VALUES ($1, $2, $3)
       ON CONFLICT (match_id, user_id) DO UPDATE SET pupil_id = $3, created_at = NOW()
       RETURNING *`,
      [id, userId, pupil_id]
    )

    // Check if this pupil now has the most votes - auto-award badge
    const voteCountResult = await pool.query(
      `SELECT pupil_id, COUNT(*) as vote_count
       FROM parent_potm_votes WHERE match_id = $1
       GROUP BY pupil_id ORDER BY vote_count DESC LIMIT 1`,
      [id]
    )

    res.json({
      vote: result.rows[0],
      player_name: playerResult.rows[0].name,
      leading_pupil_id: voteCountResult.rows[0]?.pupil_id,
      leading_vote_count: parseInt(voteCountResult.rows[0]?.vote_count || 0),
    })
  } catch (error) {
    next(error)
  }
})

// GET /matches/:id/parent-potm-votes - Get voting results for a match
// Managers see full vote tallies; parents/pupils only see their own vote + total count
router.get('/:id/parent-potm-votes', authenticateToken, async (req, res, next) => {
  try {
    const { id } = req.params
    const userId = req.user.id
    const isManager = ['manager', 'assistant'].includes(req.user.role)

    // Get this user's vote
    const myVoteResult = await pool.query(
      'SELECT pupil_id FROM parent_potm_votes WHERE match_id = $1 AND user_id = $2',
      [id, userId]
    )

    // Get total votes
    const totalResult = await pool.query(
      'SELECT COUNT(*) as total FROM parent_potm_votes WHERE match_id = $1',
      [id]
    )

    const response = {
      my_vote: myVoteResult.rows[0]?.pupil_id || null,
      total_votes: parseInt(totalResult.rows[0]?.total || 0),
    }

    // Only managers/assistants see the full vote breakdown
    if (isManager) {
      const votesResult = await pool.query(
        `SELECT ppv.pupil_id, p.name as player_name, p.squad_number, COUNT(*) as vote_count
         FROM parent_potm_votes ppv
         JOIN pupils p ON ppv.pupil_id = p.id
         WHERE ppv.match_id = $1
         GROUP BY ppv.pupil_id, p.name, p.squad_number
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

    // Get the pupil with the most votes
    const winnerResult = await pool.query(
      `SELECT ppv.pupil_id, p.name as player_name, COUNT(*) as vote_count
       FROM parent_potm_votes ppv
       JOIN pupils p ON ppv.pupil_id = p.id
       WHERE ppv.match_id = $1
       GROUP BY ppv.pupil_id, p.name
       ORDER BY vote_count DESC LIMIT 1`,
      [id]
    )

    if (winnerResult.rows.length === 0) {
      return res.status(400).json({ message: 'No votes cast for this match' })
    }

    const winner = winnerResult.rows[0]

    // Award the Parents' Pick badge
    await pool.query(
      `INSERT INTO pupil_achievements (pupil_id, achievement_type, title, description, icon, match_id, awarded_by)
       VALUES ($1, 'parents_pick', $2, $3, '❤️', $4, $5)`,
      [
        winner.pupil_id,
        `Parents' Pick vs ${match.opponent}`,
        `Voted Parents' Pupil of the Match with ${winner.vote_count} vote${winner.vote_count > 1 ? 's' : ''}`,
        id,
        req.user.id,
      ]
    )

    res.json({
      winner_pupil_id: winner.pupil_id,
      winner_name: winner.player_name,
      vote_count: parseInt(winner.vote_count),
    })
  } catch (error) {
    next(error)
  }
})

export default router
