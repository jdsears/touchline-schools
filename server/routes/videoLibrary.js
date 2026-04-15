import { Router } from 'express'
import pool from '../config/database.js'
import { authenticateToken } from '../middleware/auth.js'
import mux from '../services/mux.js'

const router = Router()

// Helper: check if user is manager/assistant (can manage library)
function canManage(user) {
  return ['manager', 'assistant', 'scout'].includes(user.role) || user.is_admin
}

// Helper: extract YouTube video ID from various URL formats
function extractYouTubeId(url) {
  if (!url) return null
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    /^([a-zA-Z0-9_-]{11})$/, // bare ID
  ]
  for (const pattern of patterns) {
    const match = url.match(pattern)
    if (match) return match[1]
  }
  return null
}

// Predefined sections — used for lazy seeding and team creation
const PREDEFINED_SECTIONS = [
  ['Attacking Play',         'attacking-play',       1],
  ['Defending',              'defending',             2],
  ['Set Pieces',             'set-pieces',            3],
  ['Pressing & Intensity',   'pressing-intensity',    4],
  ['Transitions',            'transitions',           5],
  ['Goalkeeper Training',    'goalkeeper-training',   6],
  ['Fitness & Conditioning', 'fitness-conditioning',  7],
  ['Tactics & Formation',    'tactics-formation',     8],
  ['Individual Skills',      'individual-skills',     9],
  ['Team Talks & Mindset',   'team-talks-mindset',   10],
]

// Self-healing: ensure tables exist even if the main migration didn't reach this point.
// Runs once on first request, then sets a flag to skip on subsequent requests.
let tablesVerified = false
async function ensureTables() {
  if (tablesVerified) return
  await pool.query(`
    CREATE TABLE IF NOT EXISTS library_sections (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
      name VARCHAR(100) NOT NULL,
      slug VARCHAR(100) NOT NULL,
      is_predefined BOOLEAN DEFAULT FALSE,
      display_order INTEGER DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `)
  await pool.query(`
    CREATE TABLE IF NOT EXISTS library_videos (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
      section_id UUID NOT NULL REFERENCES library_sections(id) ON DELETE CASCADE,
      added_by UUID NOT NULL REFERENCES users(id),
      source_type VARCHAR(10) NOT NULL CHECK (source_type IN ('youtube', 'mux')),
      youtube_url TEXT,
      youtube_video_id VARCHAR(20),
      mux_asset_id TEXT,
      mux_playback_id TEXT,
      mux_upload_id TEXT,
      mux_status VARCHAR(20) DEFAULT 'preparing',
      title VARCHAR(200) NOT NULL,
      notes TEXT,
      is_visible BOOLEAN DEFAULT TRUE,
      is_highlighted BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `)
  await pool.query(`
    CREATE TABLE IF NOT EXISTS library_video_watches (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      video_id UUID NOT NULL REFERENCES library_videos(id) ON DELETE CASCADE,
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      watched_at TIMESTAMPTZ DEFAULT NOW()
    )
  `)
  // Add unique constraints if missing (safe to retry — throws if exists, caught silently)
  try { await pool.query(`ALTER TABLE library_sections ADD CONSTRAINT library_sections_team_slug_uq UNIQUE (team_id, slug)`) } catch {}
  try { await pool.query(`ALTER TABLE library_video_watches ADD CONSTRAINT library_video_watches_video_user_uq UNIQUE (video_id, user_id)`) } catch {}

  tablesVerified = true
}

// Seed predefined sections for a team if none exist yet
async function ensureSections(teamId) {
  if (!teamId) return

  await ensureTables()

  const check = await pool.query('SELECT id FROM library_sections WHERE team_id = $1 LIMIT 1', [teamId])
  if (check.rows.length > 0) return // already seeded

  for (const [name, slug, order] of PREDEFINED_SECTIONS) {
    const exists = await pool.query(
      'SELECT id FROM library_sections WHERE team_id = $1 AND slug = $2',
      [teamId, slug]
    )
    if (exists.rows.length === 0) {
      await pool.query(
        `INSERT INTO library_sections (team_id, name, slug, is_predefined, display_order)
         VALUES ($1, $2, $3, TRUE, $4)`,
        [teamId, name, slug, order]
      )
    }
  }
}

// =============================================
// Sections
// =============================================

// GET /api/video-library/sections
router.get('/sections', authenticateToken, async (req, res, next) => {
  try {
    const teamId = req.user.team_id
    if (!teamId) {
      return res.status(400).json({ message: 'No team associated with this user' })
    }
    // Lazy-seed predefined sections if the team has none yet
    await ensureSections(teamId)
    const result = await pool.query(
      'SELECT * FROM library_sections WHERE team_id = $1 ORDER BY display_order, created_at',
      [teamId]
    )
    res.json(result.rows)
  } catch (error) {
    next(error)
  }
})

// POST /api/video-library/sections
router.post('/sections', authenticateToken, async (req, res, next) => {
  try {
    if (!canManage(req.user)) return res.status(403).json({ message: 'Not authorised' })

    const { name } = req.body
    if (!name?.trim()) return res.status(400).json({ message: 'Section name is required' })

    const teamId = req.user.team_id
    const slug = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

    // Get max display_order
    const maxOrder = await pool.query(
      'SELECT COALESCE(MAX(display_order), 0) + 1 as next_order FROM library_sections WHERE team_id = $1',
      [teamId]
    )

    const result = await pool.query(
      `INSERT INTO library_sections (team_id, name, slug, is_predefined, display_order)
       VALUES ($1, $2, $3, FALSE, $4)
       RETURNING *`,
      [teamId, name.trim(), slug, maxOrder.rows[0].next_order]
    )
    res.status(201).json(result.rows[0])
  } catch (error) {
    if (error.code === '23505') {
      return res.status(409).json({ message: 'A section with that name already exists' })
    }
    next(error)
  }
})

// PATCH /api/video-library/sections/:sectionId
router.patch('/sections/:sectionId', authenticateToken, async (req, res, next) => {
  try {
    if (!canManage(req.user)) return res.status(403).json({ message: 'Not authorised' })

    const { sectionId } = req.params
    const { name, display_order } = req.body

    const fields = []
    const values = []
    let idx = 1

    if (name !== undefined) {
      fields.push(`name = $${idx++}`)
      values.push(name.trim())
    }
    if (display_order !== undefined) {
      fields.push(`display_order = $${idx++}`)
      values.push(display_order)
    }

    if (fields.length === 0) return res.status(400).json({ message: 'No fields to update' })

    values.push(sectionId, req.user.team_id)
    const result = await pool.query(
      `UPDATE library_sections SET ${fields.join(', ')} WHERE id = $${idx++} AND team_id = $${idx} RETURNING *`,
      values
    )

    if (result.rows.length === 0) return res.status(404).json({ message: 'Section not found' })
    res.json(result.rows[0])
  } catch (error) {
    next(error)
  }
})

// DELETE /api/video-library/sections/:sectionId
router.delete('/sections/:sectionId', authenticateToken, async (req, res, next) => {
  try {
    if (!canManage(req.user)) return res.status(403).json({ message: 'Not authorised' })

    const { sectionId } = req.params
    const teamId = req.user.team_id

    // Check if predefined
    const section = await pool.query(
      'SELECT * FROM library_sections WHERE id = $1 AND team_id = $2',
      [sectionId, teamId]
    )
    if (section.rows.length === 0) return res.status(404).json({ message: 'Section not found' })
    if (section.rows[0].is_predefined) {
      return res.status(403).json({ message: 'Predefined sections cannot be deleted' })
    }

    await pool.query('DELETE FROM library_sections WHERE id = $1 AND team_id = $2', [sectionId, teamId])
    res.json({ deleted: true })
  } catch (error) {
    next(error)
  }
})

// =============================================
// Videos
// =============================================

// GET /api/video-library/videos
router.get('/videos', authenticateToken, async (req, res, next) => {
  try {
    const teamId = req.user.team_id
    const isManager = canManage(req.user)

    let query = `
      SELECT v.*, s.name as section_name, s.slug as section_slug,
        u.name as added_by_name
      FROM library_videos v
      JOIN library_sections s ON v.section_id = s.id
      LEFT JOIN users u ON v.added_by = u.id
      WHERE v.team_id = $1
    `
    if (!isManager) {
      query += ` AND v.is_visible = TRUE`
    }
    query += ` ORDER BY v.is_highlighted DESC, v.created_at DESC`

    const result = await pool.query(query, [teamId])

    // If manager, attach watch counts
    if (isManager) {
      const watchCounts = await pool.query(
        `SELECT video_id, COUNT(*) as watch_count
         FROM library_video_watches
         WHERE video_id = ANY($1)
         GROUP BY video_id`,
        [result.rows.map(v => v.id)]
      )
      const countMap = Object.fromEntries(watchCounts.rows.map(r => [r.video_id, parseInt(r.watch_count)]))
      result.rows.forEach(v => { v.watch_count = countMap[v.id] || 0 })
    }

    // If pupil, attach watch status
    if (!isManager) {
      const watches = await pool.query(
        `SELECT video_id FROM library_video_watches
         WHERE user_id = $1 AND video_id = ANY($2)`,
        [req.user.id, result.rows.map(v => v.id)]
      )
      const watchedSet = new Set(watches.rows.map(r => r.video_id))
      result.rows.forEach(v => { v.watched = watchedSet.has(v.id) })
    }

    res.json(result.rows)
  } catch (error) {
    next(error)
  }
})

// GET /api/video-library/videos/:videoId
router.get('/videos/:videoId', authenticateToken, async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT v.*, s.name as section_name FROM library_videos v
       JOIN library_sections s ON v.section_id = s.id
       WHERE v.id = $1 AND v.team_id = $2`,
      [req.params.videoId, req.user.team_id]
    )
    if (result.rows.length === 0) return res.status(404).json({ message: 'Video not found' })
    res.json(result.rows[0])
  } catch (error) {
    next(error)
  }
})

// POST /api/video-library/videos — Add a YouTube video
router.post('/videos', authenticateToken, async (req, res, next) => {
  try {
    if (!canManage(req.user)) return res.status(403).json({ message: 'Not authorised' })

    const { title, sectionId, notes, youtubeUrl } = req.body
    const teamId = req.user.team_id

    if (!title?.trim()) return res.status(400).json({ message: 'Title is required' })
    if (!sectionId) return res.status(400).json({ message: 'Section is required' })
    if (!youtubeUrl) return res.status(400).json({ message: 'YouTube URL is required' })

    const youtubeVideoId = extractYouTubeId(youtubeUrl)
    if (!youtubeVideoId) return res.status(400).json({ message: 'Invalid YouTube URL' })

    const result = await pool.query(
      `INSERT INTO library_videos (team_id, section_id, added_by, source_type, youtube_url, youtube_video_id, title, notes)
       VALUES ($1, $2, $3, 'youtube', $4, $5, $6, $7) RETURNING *`,
      [teamId, sectionId, req.user.id, youtubeUrl, youtubeVideoId, title.trim(), notes || null]
    )
    res.status(201).json(result.rows[0])
  } catch (error) {
    next(error)
  }
})

// POST /api/video-library/videos/upload — Create Mux direct upload + library_videos row
router.post('/videos/upload', authenticateToken, async (req, res, next) => {
  try {
    if (!canManage(req.user)) return res.status(403).json({ message: 'Not authorised' })

    const { title, sectionId, notes } = req.body
    const teamId = req.user.team_id

    if (!title?.trim()) return res.status(400).json({ message: 'Title is required' })
    if (!sectionId) return res.status(400).json({ message: 'Section is required' })

    // Derive CORS origin (same pattern as match video upload)
    let corsOrigin = process.env.FRONTEND_URL || process.env.CORS_ORIGIN || 'https://touchline.xyz'
    if (req.headers.origin) {
      corsOrigin = req.headers.origin
    } else if (req.headers.referer) {
      try { corsOrigin = new URL(req.headers.referer).origin } catch {}
    }
    corsOrigin = corsOrigin.replace(/\/+$/, '')

    const upload = await mux.video.uploads.create({
      cors_origin: corsOrigin,
      new_asset_settings: {
        playback_policy: ['public'],
        encoding_tier: 'baseline',
      },
      timeout: 3600,
    })

    const result = await pool.query(
      `INSERT INTO library_videos (team_id, section_id, added_by, source_type, mux_upload_id, mux_status, title, notes)
       VALUES ($1, $2, $3, 'mux', $4, 'preparing', $5, $6) RETURNING id`,
      [teamId, sectionId, req.user.id, upload.id, title.trim(), notes || null]
    )

    res.json({
      videoId: result.rows[0].id,
      uploadUrl: upload.url,
      uploadId: upload.id,
    })
  } catch (error) {
    next(error)
  }
})

// PATCH /api/video-library/videos/:videoId
router.patch('/videos/:videoId', authenticateToken, async (req, res, next) => {
  try {
    if (!canManage(req.user)) return res.status(403).json({ message: 'Not authorised' })

    const { videoId } = req.params
    const { title, notes, sectionId, is_visible, is_highlighted } = req.body

    const fields = []
    const values = []
    let idx = 1

    if (title !== undefined) { fields.push(`title = $${idx++}`); values.push(title.trim()) }
    if (notes !== undefined) { fields.push(`notes = $${idx++}`); values.push(notes || null) }
    if (sectionId !== undefined) { fields.push(`section_id = $${idx++}`); values.push(sectionId) }
    if (is_visible !== undefined) { fields.push(`is_visible = $${idx++}`); values.push(is_visible) }
    if (is_highlighted !== undefined) { fields.push(`is_highlighted = $${idx++}`); values.push(is_highlighted) }

    if (fields.length === 0) return res.status(400).json({ message: 'No fields to update' })

    fields.push(`updated_at = NOW()`)
    values.push(videoId, req.user.team_id)

    const result = await pool.query(
      `UPDATE library_videos SET ${fields.join(', ')} WHERE id = $${idx++} AND team_id = $${idx} RETURNING *`,
      values
    )
    if (result.rows.length === 0) return res.status(404).json({ message: 'Video not found' })
    res.json(result.rows[0])
  } catch (error) {
    next(error)
  }
})

// DELETE /api/video-library/videos/:videoId
router.delete('/videos/:videoId', authenticateToken, async (req, res, next) => {
  try {
    if (!canManage(req.user)) return res.status(403).json({ message: 'Not authorised' })

    const { videoId } = req.params
    const result = await pool.query(
      'SELECT * FROM library_videos WHERE id = $1 AND team_id = $2',
      [videoId, req.user.team_id]
    )
    if (result.rows.length === 0) return res.status(404).json({ message: 'Video not found' })

    const video = result.rows[0]
    if (video.mux_asset_id) {
      try { await mux.video.assets.delete(video.mux_asset_id) } catch (e) {
        console.error('Mux delete failed:', e.message)
      }
    }

    await pool.query('DELETE FROM library_videos WHERE id = $1', [videoId])
    res.json({ deleted: true })
  } catch (error) {
    next(error)
  }
})

// =============================================
// Watch Tracking
// =============================================

// POST /api/video-library/videos/:videoId/watched
router.post('/videos/:videoId/watched', authenticateToken, async (req, res, next) => {
  try {
    await pool.query(
      `INSERT INTO library_video_watches (video_id, user_id)
       VALUES ($1, $2)
       ON CONFLICT (video_id, user_id) DO UPDATE SET watched_at = NOW()`,
      [req.params.videoId, req.user.id]
    )
    res.json({ watched: true })
  } catch (error) {
    next(error)
  }
})

// GET /api/video-library/videos/:videoId/watchers
router.get('/videos/:videoId/watchers', authenticateToken, async (req, res, next) => {
  try {
    if (!canManage(req.user)) return res.status(403).json({ message: 'Not authorised' })

    const teamId = req.user.team_id

    // Get all squad pupils
    const pupils = await pool.query(
      `SELECT p.id as pupil_id, p.name, p.squad_number, u.id as user_id
       FROM pupils p
       LEFT JOIN users u ON u.pupil_id = p.id
       WHERE p.team_id = $1
       ORDER BY p.squad_number NULLS LAST, p.name`,
      [teamId]
    )

    // Get watches for this video
    const watches = await pool.query(
      'SELECT user_id, watched_at FROM library_video_watches WHERE video_id = $1',
      [req.params.videoId]
    )
    const watchMap = Object.fromEntries(watches.rows.map(w => [w.user_id, w.watched_at]))

    const watchers = pupils.rows.map(p => ({
      ...p,
      watched: !!watchMap[p.user_id],
      watched_at: watchMap[p.user_id] || null,
    }))

    res.json({ watchers, total: pupils.rows.length, watched_count: watches.rows.length })
  } catch (error) {
    next(error)
  }
})

// GET /api/video-library/watch-summary
router.get('/watch-summary', authenticateToken, async (req, res, next) => {
  try {
    if (!canManage(req.user)) return res.status(403).json({ message: 'Not authorised' })

    const teamId = req.user.team_id

    const squadCount = await pool.query(
      'SELECT COUNT(*) FROM pupils WHERE team_id = $1',
      [teamId]
    )
    const total = parseInt(squadCount.rows[0].count)

    const videos = await pool.query(
      `SELECT v.id, v.title, v.section_id, COUNT(w.id) as watch_count
       FROM library_videos v
       LEFT JOIN library_video_watches w ON w.video_id = v.id
       WHERE v.team_id = $1
       GROUP BY v.id
       ORDER BY v.created_at DESC`,
      [teamId]
    )

    res.json({
      videos: videos.rows.map(v => ({ ...v, watch_count: parseInt(v.watch_count), squad_size: total })),
      squad_size: total,
    })
  } catch (error) {
    next(error)
  }
})

export default router
