import { Router } from 'express'
import pool from '../config/database.js'
import { authenticateToken } from '../middleware/auth.js'
import mux from '../services/mux.js'
import { analyseVideoWithMux, savePlayerObservations } from '../services/videoAnalysisService.js'
import { checkAndIncrementUsage, getEntitlements } from '../services/billingService.js'
import { getTaxonomy, SPORTS } from '../constants/sportTaxonomy.js'

const router = Router()

// GET /api/videos/sport-taxonomy/:sport - return clip categories & capabilities for a sport
router.get('/sport-taxonomy/:sport', authenticateToken, (req, res) => {
  const sport = SPORTS.includes(req.params.sport) ? req.params.sport : 'football'
  res.json(getTaxonomy(sport))
})

// =============================================
// Mux Direct Upload
// =============================================

// POST /api/videos/upload - Create a Mux direct upload URL
router.post('/upload', authenticateToken, async (req, res, next) => {
  try {
    const { title, videoType, teamId, matchId, isClip, recordedAt } = req.body

    if (!title || !teamId) {
      return res.status(400).json({ message: 'Title and teamId are required' })
    }

    // Derive CORS origin from the actual browser request - this ensures the Mux
    // upload URL CORS policy matches the exact origin the browser will send,
    // regardless of trailing slashes, www subdomain, or env var mismatches.
    let corsOrigin = process.env.FRONTEND_URL || process.env.CORS_ORIGIN || 'https://app.moonbootssports.com'
    if (req.headers.origin) {
      corsOrigin = req.headers.origin
    } else if (req.headers.referer) {
      try { corsOrigin = new URL(req.headers.referer).origin } catch {}
    }
    // Strip trailing slashes - Mux needs a clean origin (protocol + host only)
    corsOrigin = corsOrigin.replace(/\/+$/, '')

    // Create direct upload in Mux
    const upload = await mux.video.uploads.create({
      cors_origin: corsOrigin,
      new_asset_settings: {
        playback_policy: ['public'],
        encoding_tier: 'baseline',
      },
      timeout: 3600,
    })

    // Save video record
    const subtype = isClip ? 'clip' : 'full_match'
    const result = await pool.query(
      `INSERT INTO videos (team_id, match_id, mux_upload_id, title, type, subtype, uploaded_by, recorded_at, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'waiting_upload')
       RETURNING id`,
      [teamId, matchId || null, upload.id, title, videoType || 'match', subtype, req.user.id, recordedAt || null]
    )

    const videoId = result.rows[0].id

    // Only link full match videos as the main match video
    if (matchId && subtype === 'full_match') {
      await pool.query(
        'UPDATE matches SET video_id = $1 WHERE id = $2',
        [videoId, matchId]
      )
    }

    res.json({
      videoId,
      uploadUrl: upload.url,
      uploadId: upload.id,
    })
  } catch (error) {
    next(error)
  }
})

// =============================================
// Mux Webhooks
// =============================================

// POST /api/videos/webhooks/mux
router.post('/webhooks/mux', async (req, res, next) => {
  try {
    const event = req.body

    switch (event.type) {
      case 'video.upload.asset_created': {
        const uploadId = event.data.id
        const assetId = event.data.asset_id
        // Update match videos table
        await pool.query(
          `UPDATE videos SET mux_asset_id = $1, status = 'processing' WHERE mux_upload_id = $2`,
          [assetId, uploadId]
        )
        // Also update library videos (Film Room) if the upload belongs there
        await pool.query(
          `UPDATE library_videos SET mux_asset_id = $1, mux_status = 'processing' WHERE mux_upload_id = $2`,
          [assetId, uploadId]
        )
        break
      }

      case 'video.asset.ready': {
        const assetId = event.data.id
        const playbackId = event.data.playback_ids?.[0]?.id
        const duration = event.data.duration
        await pool.query(
          `UPDATE videos SET
            mux_playback_id = $1,
            duration_seconds = $2,
            thumbnail_url = $3,
            status = 'ready',
            updated_at = NOW()
          WHERE mux_asset_id = $4`,
          [
            playbackId,
            duration,
            playbackId ? `https://image.mux.com/${playbackId}/thumbnail.jpg?time=10` : null,
            assetId,
          ]
        )
        // Also update library videos (Film Room)
        await pool.query(
          `UPDATE library_videos SET mux_playback_id = $1, mux_status = 'ready', updated_at = NOW()
           WHERE mux_asset_id = $2`,
          [playbackId, assetId]
        )
        break
      }

      case 'video.asset.errored': {
        const assetId = event.data.id
        const errorMsg = event.data.errors?.messages?.join(', ') || 'Unknown error'
        await pool.query(
          `UPDATE videos SET status = 'error', error_message = $1 WHERE mux_asset_id = $2`,
          [errorMsg, assetId]
        )
        // Also update library videos (Film Room)
        await pool.query(
          `UPDATE library_videos SET mux_status = 'errored' WHERE mux_asset_id = $1`,
          [assetId]
        )
        break
      }
    }

    res.sendStatus(200)
  } catch (error) {
    console.error('Mux webhook error:', error)
    res.sendStatus(200) // Always ack webhooks
  }
})

// =============================================
// Video CRUD
// =============================================

// GET /api/videos/:teamId - list videos for a team
router.get('/:teamId', authenticateToken, async (req, res, next) => {
  try {
    const { teamId } = req.params
    const { type, limit = 20 } = req.query

    let query = `SELECT v.*, m.opponent as match_opponent FROM videos v LEFT JOIN matches m ON v.match_id = m.id WHERE v.team_id = $1`
    const params = [teamId]

    if (type) {
      params.push(type)
      query += ` AND v.type = $${params.length}`
    }

    query += ` ORDER BY v.recorded_at DESC NULLS LAST, v.created_at DESC LIMIT $${params.length + 1}`
    params.push(limit)

    const result = await pool.query(query, params)
    const videos = result.rows

    // Check Mux for any stuck videos (waiting_upload or processing for > 60s)
    const stuckVideos = videos.filter(v =>
      (v.status === 'waiting_upload' || v.status === 'processing') && v.mux_upload_id
    )

    if (stuckVideos.length > 0) {
      // Await Mux checks so response includes updated statuses
      await Promise.allSettled(stuckVideos.map(async (video) => {
        try {
          const upload = await mux.video.uploads.retrieve(video.mux_upload_id)

          if (upload.asset_id && !video.mux_asset_id) {
            await pool.query(
              `UPDATE videos SET mux_asset_id = $1, status = 'processing' WHERE id = $2 AND status = 'waiting_upload'`,
              [upload.asset_id, video.id]
            )
            video.mux_asset_id = upload.asset_id
            video.status = 'processing'
          }

          const assetId = video.mux_asset_id || upload.asset_id
          if (assetId) {
            const asset = await mux.video.assets.retrieve(assetId)
            if (asset.status === 'ready') {
              const playbackId = asset.playback_ids?.[0]?.id
              const duration = asset.duration
              await pool.query(
                `UPDATE videos SET
                  mux_asset_id = $1,
                  mux_playback_id = $2,
                  duration_seconds = $3,
                  thumbnail_url = $4,
                  status = 'ready',
                  updated_at = NOW()
                WHERE id = $5`,
                [
                  assetId,
                  playbackId,
                  duration,
                  playbackId ? `https://image.mux.com/${playbackId}/thumbnail.jpg?time=10` : null,
                  video.id,
                ]
              )
              video.mux_asset_id = assetId
              video.mux_playback_id = playbackId
              video.duration_seconds = duration
              video.thumbnail_url = playbackId ? `https://image.mux.com/${playbackId}/thumbnail.jpg?time=10` : null
              video.status = 'ready'
            } else if (asset.status === 'errored') {
              const errorMsg = asset.errors?.messages?.join(', ') || 'Processing failed'
              await pool.query(
                `UPDATE videos SET status = 'error', error_message = $1 WHERE id = $2`,
                [errorMsg, video.id]
              )
              video.status = 'error'
              video.error_message = errorMsg
            }
          }
        } catch (e) {
          console.error(`Failed to check Mux status for video ${video.id}:`, e.message)
        }
      }))
    }

    res.json(videos)
  } catch (error) {
    next(error)
  }
})

// GET /api/videos/video/:id - single video with clips
router.get('/video/:id', authenticateToken, async (req, res, next) => {
  try {
    const { id } = req.params
    const videoResult = await pool.query('SELECT * FROM videos WHERE id = $1', [id])
    if (videoResult.rows.length === 0) {
      return res.status(404).json({ message: 'Video not found' })
    }

    const video = videoResult.rows[0]

    // If video is stuck in waiting_upload/processing, check Mux directly
    if ((video.status === 'waiting_upload' || video.status === 'processing') && video.mux_upload_id) {
      try {
        const upload = await mux.video.uploads.retrieve(video.mux_upload_id)

        if (upload.asset_id && !video.mux_asset_id) {
          await pool.query(
            `UPDATE videos SET mux_asset_id = $1, status = 'processing' WHERE id = $2 AND status = 'waiting_upload'`,
            [upload.asset_id, video.id]
          )
          video.mux_asset_id = upload.asset_id
          video.status = 'processing'
        }

        const assetId = video.mux_asset_id || upload.asset_id
        if (assetId) {
          const asset = await mux.video.assets.retrieve(assetId)
          if (asset.status === 'ready') {
            const playbackId = asset.playback_ids?.[0]?.id
            const duration = asset.duration
            await pool.query(
              `UPDATE videos SET
                mux_asset_id = $1,
                mux_playback_id = $2,
                duration_seconds = $3,
                thumbnail_url = $4,
                status = 'ready',
                updated_at = NOW()
              WHERE id = $5`,
              [
                assetId,
                playbackId,
                duration,
                playbackId ? `https://image.mux.com/${playbackId}/thumbnail.jpg?time=10` : null,
                video.id,
              ]
            )
            video.mux_asset_id = assetId
            video.mux_playback_id = playbackId
            video.duration_seconds = duration
            video.thumbnail_url = playbackId ? `https://image.mux.com/${playbackId}/thumbnail.jpg?time=10` : null
            video.status = 'ready'
          } else if (asset.status === 'errored') {
            const errorMsg = asset.errors?.messages?.join(', ') || 'Processing failed'
            await pool.query(
              `UPDATE videos SET status = 'error', error_message = $1 WHERE id = $2`,
              [errorMsg, video.id]
            )
            video.status = 'error'
            video.error_message = errorMsg
          }
        }
      } catch (e) {
        console.error(`Failed to check Mux status for video ${video.id}:`, e.message)
      }
    }

    // Get clips with pupil tags
    const clipsResult = await pool.query(`
      SELECT c.*,
        COALESCE(json_agg(
          json_build_object('pupilId', t.pupil_id, 'feedback', t.feedback, 'rating', t.rating)
        ) FILTER (WHERE t.id IS NOT NULL), '[]') as player_tags
      FROM video_clips c
      LEFT JOIN clip_player_tags t ON t.clip_id = c.id
      WHERE c.video_id = $1
      GROUP BY c.id
      ORDER BY c.start_time
    `, [id])

    res.json({ video, clips: clipsResult.rows })
  } catch (error) {
    next(error)
  }
})

// DELETE /api/videos/video/:id - delete video and Mux asset
router.delete('/video/:id', authenticateToken, async (req, res, next) => {
  try {
    const { id } = req.params
    const result = await pool.query('SELECT * FROM videos WHERE id = $1', [id])
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Video not found' })
    }

    const video = result.rows[0]

    // Delete from Mux
    if (video.mux_asset_id) {
      try {
        await mux.video.assets.delete(video.mux_asset_id)
      } catch (e) {
        console.error('Mux delete failed:', e.message)
      }
    }

    // Cascade deletes clips, tags, annotations
    await pool.query('DELETE FROM videos WHERE id = $1', [id])
    res.json({ deleted: true })
  } catch (error) {
    next(error)
  }
})

// PUT /api/videos/video/:id - update video title, type, match assignment
router.put('/video/:id', authenticateToken, async (req, res, next) => {
  try {
    const { id } = req.params
    const { title, type, matchId } = req.body

    const fields = []
    const values = []
    let idx = 1

    if (title !== undefined) { fields.push(`title = $${idx++}`); values.push(title) }
    if (type !== undefined) { fields.push(`type = $${idx++}`); values.push(type) }
    if (matchId !== undefined) { fields.push(`match_id = $${idx++}`); values.push(matchId || null) }

    if (fields.length === 0) {
      return res.status(400).json({ message: 'No fields to update' })
    }

    fields.push(`updated_at = NOW()`)
    values.push(id)

    await pool.query(
      `UPDATE videos SET ${fields.join(', ')} WHERE id = $${idx}`,
      values
    )

    // Update match.video_id if assigning/unassigning
    if (matchId !== undefined) {
      // Clear old match link
      await pool.query('UPDATE matches SET video_id = NULL WHERE video_id = $1', [id])
      if (matchId) {
        // Check if it's a full_match subtype before linking
        const vid = await pool.query('SELECT subtype FROM videos WHERE id = $1', [id])
        if (vid.rows[0]?.subtype === 'full_match') {
          await pool.query('UPDATE matches SET video_id = $1 WHERE id = $2', [id, matchId])
        }
      }
    }

    const result = await pool.query(
      `SELECT v.*, m.opponent as match_opponent FROM videos v LEFT JOIN matches m ON v.match_id = m.id WHERE v.id = $1`,
      [id]
    )
    res.json(result.rows[0])
  } catch (error) {
    next(error)
  }
})

// PUT /api/videos/video/:id/assign - assign video to a match
router.put('/video/:id/assign', authenticateToken, async (req, res, next) => {
  try {
    const { id } = req.params
    const { matchId } = req.body

    await pool.query('UPDATE videos SET match_id = $1 WHERE id = $2', [matchId || null, id])

    if (matchId) {
      await pool.query('UPDATE matches SET video_id = $1 WHERE id = $2', [id, matchId])
    }

    const result = await pool.query('SELECT * FROM videos WHERE id = $1', [id])
    res.json(result.rows[0])
  } catch (error) {
    next(error)
  }
})

// =============================================
// Clips
// =============================================

// POST /api/videos/video/:id/clips - create a clip
router.post('/video/:id/clips', authenticateToken, async (req, res, next) => {
  try {
    const { title, description, startTime, endTime, clipType, playerTags } = req.body
    const videoId = req.params.id

    if (!title || startTime == null || endTime == null) {
      return res.status(400).json({ message: 'Title, startTime, and endTime are required' })
    }

    const clipResult = await pool.query(
      `INSERT INTO video_clips (video_id, title, description, start_time, end_time, clip_type, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [videoId, title, description || null, startTime, endTime, clipType || 'general', req.user.id]
    )

    const clip = clipResult.rows[0]

    // Tag pupils
    if (playerTags && playerTags.length > 0) {
      for (const tag of playerTags) {
        await pool.query(
          `INSERT INTO clip_player_tags (clip_id, pupil_id, feedback, rating)
           VALUES ($1, $2, $3, $4)`,
          [clip.id, tag.pupilId, tag.feedback || null, tag.rating || null]
        )
      }
    }

    res.json(clip)
  } catch (error) {
    next(error)
  }
})

// GET /api/videos/video/:id/clips
router.get('/video/:id/clips', authenticateToken, async (req, res, next) => {
  try {
    const result = await pool.query(`
      SELECT c.*,
        COALESCE(json_agg(
          json_build_object('pupilId', t.pupil_id, 'feedback', t.feedback, 'rating', t.rating)
        ) FILTER (WHERE t.id IS NOT NULL), '[]') as player_tags
      FROM video_clips c
      LEFT JOIN clip_player_tags t ON t.clip_id = c.id
      WHERE c.video_id = $1
      GROUP BY c.id
      ORDER BY c.start_time
    `, [req.params.id])
    res.json(result.rows)
  } catch (error) {
    next(error)
  }
})

// DELETE /api/videos/clips/:clipId
router.delete('/clips/:clipId', authenticateToken, async (req, res, next) => {
  try {
    await pool.query('DELETE FROM video_clips WHERE id = $1', [req.params.clipId])
    res.json({ deleted: true })
  } catch (error) {
    next(error)
  }
})

// PUT /api/videos/clips/:clipId/tag - add/update pupil tag on clip
router.put('/clips/:clipId/tag', authenticateToken, async (req, res, next) => {
  try {
    const { pupilId, feedback, rating } = req.body
    const { clipId } = req.params

    await pool.query(
      `INSERT INTO clip_player_tags (clip_id, pupil_id, feedback, rating)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (clip_id, pupil_id)
       DO UPDATE SET feedback = $3, rating = $4`,
      [clipId, pupilId, feedback || null, rating || null]
    )

    res.json({ success: true })
  } catch (error) {
    next(error)
  }
})

// =============================================
// Pupil Clips (for Pupil Lounge)
// =============================================

// GET /api/videos/pupil/:pupilId/clips
router.get('/pupil/:pupilId/clips', authenticateToken, async (req, res, next) => {
  try {
    const result = await pool.query(`
      SELECT c.*, t.feedback, t.rating, v.title as video_title, v.mux_playback_id, v.thumbnail_url
      FROM clip_player_tags t
      JOIN video_clips c ON c.id = t.clip_id
      JOIN videos v ON v.id = c.video_id
      WHERE t.pupil_id = $1
      ORDER BY c.created_at DESC
    `, [req.params.pupilId])

    res.json({ clips: result.rows })
  } catch (error) {
    next(error)
  }
})

// =============================================
// AI Analysis
// =============================================

// POST /api/videos/video/:id/analyse
router.post('/video/:id/analyse', authenticateToken, async (req, res, next) => {
  try {
    const { analysisType = 'full_match', pupilId, clipId, teamColour, depth = 'standard' } = req.body
    const videoId = req.params.id

    const videoResult = await pool.query('SELECT * FROM videos WHERE id = $1', [videoId])
    if (videoResult.rows.length === 0) {
      return res.status(404).json({ message: 'Video not found' })
    }

    const video = videoResult.rows[0]

    if (!video.mux_playback_id) {
      return res.status(400).json({ message: 'Video is not yet ready for analysis' })
    }

    // Resolve entitlements with full user context (needed for billing exempt check)
    const entitlements = await getEntitlements({ userId: req.user.id, teamId: video.team_id, userEmail: req.user.email })

    // Check usage limits
    const usageCheck = await checkAndIncrementUsage(video.team_id, 'video', entitlements)
    if (!usageCheck.allowed) {
      return res.status(429).json({
        message: 'Video analysis limit reached for this billing period',
        usage: { current: usageCheck.current, limit: usageCheck.limit },
        canPurchase: usageCheck.canPurchase || false,
      })
    }

    // Deep analysis requires separate allowance
    if (depth === 'deep') {
      const deepCheck = await checkAndIncrementUsage(video.team_id, 'deep_video', entitlements)
      if (!deepCheck.allowed) {
        return res.status(429).json({
          message: 'Deep Analysis limit reached. Upgrade your plan or use Standard analysis.',
          usage: { current: deepCheck.current, limit: deepCheck.limit },
          upgradeRequired: true,
        })
      }
    }

    // Return immediately, run analysis in background
    res.json({ message: 'Analysis started', videoId, depth })

    // Get match context and squad pupils
    let context = {}
    if (video.match_id) {
      const matchResult = await pool.query(
        'SELECT m.*, t.age_group, t.formation AS team_formation, t.formations AS team_formations FROM matches m JOIN teams t ON m.team_id = t.id WHERE m.id = $1',
        [video.match_id]
      )
      if (matchResult.rows.length > 0) {
        const match = matchResult.rows[0]
        context = {
          opponent: match.opponent,
          ageGroup: match.age_group,
          matchDate: match.date,
          goalsFor: match.goals_for,
          goalsAgainst: match.goals_against,
          result: match.result,
          competition: match.competition,
          isHome: match.is_home,
          // Starting formation: prefer match-specific formation, then team default
          startingFormation: match.formation_used || match.team_formation || null,
          matchFormations: match.formations || null,
          teamFormations: match.team_formations || null,
        }

        // Load individual goalscorer and assist data
        try {
          const goalsRes = await pool.query(
            `SELECT mg.minute, mg.goal_type,
                    sp.name AS scorer_name, sp.squad_number AS scorer_number,
                    ap.name AS assist_name, ap.squad_number AS assist_number
             FROM match_goals mg
             LEFT JOIN pupils sp ON mg.scorer_pupil_id = sp.id
             LEFT JOIN pupils ap ON mg.assist_pupil_id = ap.id
             WHERE mg.match_id = $1
             ORDER BY mg.minute ASC NULLS LAST`,
            [video.match_id]
          )
          if (goalsRes.rows.length > 0) {
            context.goalscorers = goalsRes.rows
          }
        } catch { /* goals data is optional */ }

        // Load substitutions for context
        try {
          const subsRes = await pool.query(
            `SELECT ms.minute,
                    poff.name AS player_off_name, poff.squad_number AS player_off_number,
                    pon.name AS player_on_name, pon.squad_number AS player_on_number
             FROM match_substitutions ms
             LEFT JOIN pupils poff ON ms.pupil_off_id = poff.id
             LEFT JOIN pupils pon ON ms.pupil_on_id = pon.id
             WHERE ms.match_id = $1
             ORDER BY ms.minute ASC NULLS LAST`,
            [video.match_id]
          )
          if (subsRes.rows.length > 0) {
            context.substitutions = subsRes.rows
          }
        } catch { /* substitutions data is optional */ }

        // Try to get opponent's league position for context
        try {
          const leagueRes = await pool.query(
            `SELECT lt.position, lt.played, lt.won, lt.drawn, lt.lost, lt.goals_for, lt.goals_against, lt.points
             FROM league_table lt
             JOIN league_settings ls ON lt.league_id = ls.id
             WHERE ls.team_id = $1 AND LOWER(lt.team_name) LIKE $2
             LIMIT 1`,
            [video.team_id, `%${match.opponent.toLowerCase().split(' ')[0]}%`]
          )
          if (leagueRes.rows.length > 0) {
            context.opponentLeague = leagueRes.rows[0]
          }
          // Also get our own position
          const ownRes = await pool.query(
            `SELECT lt.position, lt.points
             FROM league_table lt
             JOIN league_settings ls ON lt.league_id = ls.id
             WHERE ls.team_id = $1 AND lt.is_own_team = true
             LIMIT 1`,
            [video.team_id]
          )
          if (ownRes.rows.length > 0) {
            context.ownLeague = ownRes.rows[0]
          }
        } catch { /* league data is optional */ }
      }
    }

    // Load match squad (starting + subs) if available, otherwise fall back to all team pupils
    let squadPlayers = []
    if (video.match_id) {
      const squadResult = await pool.query(
        `SELECT p.id, p.name, p.squad_number, p.positions, ms.position AS match_position, ms.is_starting
         FROM match_squads ms
         JOIN pupils p ON ms.pupil_id = p.id
         WHERE ms.match_id = $1
         ORDER BY ms.is_starting DESC, p.squad_number NULLS LAST, p.name`,
        [video.match_id]
      )
      if (squadResult.rows.length > 0) {
        squadPlayers = squadResult.rows
      }
    }
    if (squadPlayers.length === 0) {
      const playersResult = await pool.query(
        'SELECT id, name, squad_number, positions FROM pupils WHERE team_id = $1 ORDER BY squad_number NULLS LAST, name',
        [video.team_id]
      )
      squadPlayers = playersResult.rows
    }

    // Load team name and sport
    const teamResult = await pool.query('SELECT name, sport FROM teams WHERE id = $1', [video.team_id])
    const teamName = teamResult.rows[0]?.name || null
    const sport = teamResult.rows[0]?.sport || 'football'

    // Run in background
    analyseVideoWithMux(video, { analysisType, pupilId, clipId, context, teamColour, teamName, sport, squadPlayers, userId: req.user.id, depth }).catch(err => {
      console.error('Video analysis failed:', err)
    })
  } catch (error) {
    next(error)
  }
})

// GET /api/videos/video/:id/analysis
router.get('/video/:id/analysis', authenticateToken, async (req, res, next) => {
  try {
    // Mark stale processing records as failed (stuck for >60 minutes)
    // Deep analysis processes 480 frames in 24 batches and can take up to 50 minutes
    await pool.query(
      `UPDATE video_ai_analysis SET status = 'failed', error = 'Analysis timed out - please try again', progress = NULL
       WHERE video_id = $1 AND status = 'processing' AND created_at < NOW() - INTERVAL '60 minutes'`,
      [req.params.id]
    )

    const result = await pool.query(
      'SELECT * FROM video_ai_analysis WHERE video_id = $1 ORDER BY created_at DESC',
      [req.params.id]
    )
    res.json({ analyses: result.rows })
  } catch (error) {
    next(error)
  }
})

// POST /api/videos/analysis/:analysisId/cancel - cancel a running analysis
router.post('/analysis/:analysisId/cancel', authenticateToken, async (req, res, next) => {
  try {
    const { analysisId } = req.params
    const result = await pool.query(
      `UPDATE video_ai_analysis SET status = 'cancelled', progress = NULL, error = 'Cancelled by user'
       WHERE id = $1 AND status = 'processing' RETURNING id`,
      [analysisId]
    )
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'No running analysis found' })
    }
    res.json({ message: 'Analysis cancelled' })
  } catch (error) {
    next(error)
  }
})

// PUT /api/videos/analysis/:analysisId - edit analysis before approving
router.put('/analysis/:analysisId', authenticateToken, async (req, res, next) => {
  try {
    const { analysisId } = req.params
    const { summary, observations, recommendations, player_feedback } = req.body

    const analysisResult = await pool.query(
      'SELECT * FROM video_ai_analysis WHERE id = $1',
      [analysisId]
    )
    if (analysisResult.rows.length === 0) {
      return res.status(404).json({ message: 'Analysis not found' })
    }

    if (analysisResult.rows[0].approved) {
      return res.status(400).json({ message: 'Cannot edit an already-approved analysis' })
    }

    const updates = []
    const values = []
    let paramIndex = 1

    if (summary !== undefined) {
      updates.push(`summary = $${paramIndex++}`)
      values.push(summary)
    }
    if (observations !== undefined) {
      updates.push(`observations = $${paramIndex++}`)
      values.push(JSON.stringify(observations))
    }
    if (recommendations !== undefined) {
      updates.push(`recommendations = $${paramIndex++}`)
      values.push(JSON.stringify(recommendations))
    }
    if (player_feedback !== undefined) {
      updates.push(`player_feedback = $${paramIndex++}`)
      values.push(JSON.stringify(player_feedback))
    }

    if (updates.length === 0) {
      return res.status(400).json({ message: 'No fields to update' })
    }

    values.push(analysisId)
    await pool.query(
      `UPDATE video_ai_analysis SET ${updates.join(', ')} WHERE id = $${paramIndex}`,
      values
    )

    res.json({ message: 'Analysis updated' })
  } catch (error) {
    next(error)
  }
})

// POST /api/videos/analysis/:analysisId/approve - approve analysis and save pupil observations
router.post('/analysis/:analysisId/approve', authenticateToken, async (req, res, next) => {
  try {
    const { analysisId } = req.params
    const { includeRatings = false } = req.body || {}

    // Get the analysis record
    const analysisResult = await pool.query(
      'SELECT * FROM video_ai_analysis WHERE id = $1',
      [analysisId]
    )
    if (analysisResult.rows.length === 0) {
      return res.status(404).json({ message: 'Analysis not found' })
    }
    const analysis = analysisResult.rows[0]

    if (analysis.approved) {
      return res.json({ message: 'Already approved', analysis })
    }

    // Get the video to find match_id and team_id
    const videoResult = await pool.query('SELECT * FROM videos WHERE id = $1', [analysis.video_id])
    if (videoResult.rows.length === 0) {
      return res.status(404).json({ message: 'Video not found' })
    }
    const video = videoResult.rows[0]

    // Save pupil observations if there's pupil feedback and a linked match
    const playerFeedback = analysis.player_feedback
    if (video.match_id && playerFeedback?.length > 0) {
      // Load squad pupils for ID mapping
      const squadResult = await pool.query(
        `SELECT p.id, p.name, p.squad_number, p.positions, ms.is_starting
         FROM match_squads ms JOIN pupils p ON ms.pupil_id = p.id
         WHERE ms.match_id = $1`,
        [video.match_id]
      )
      let squadPlayers = squadResult.rows
      if (squadPlayers.length === 0) {
        const playersResult = await pool.query(
          'SELECT id, name, squad_number, positions FROM pupils WHERE team_id = $1',
          [video.team_id]
        )
        squadPlayers = playersResult.rows
      }

      // Delete any previous AI observations for this match to avoid duplicates
      await pool.query(
        `DELETE FROM observations WHERE match_id = $1 AND context = 'AI Video Analysis'`,
        [video.match_id]
      )

      await savePlayerObservations(video, playerFeedback, squadPlayers, { userId: req.user.id, includeRatings })
    }

    // Mark as approved
    await pool.query(
      'UPDATE video_ai_analysis SET approved = true WHERE id = $1',
      [analysisId]
    )

    res.json({ message: 'Analysis approved and pupil notes saved' })
  } catch (error) {
    next(error)
  }
})

// =============================================
// Legacy: Video link support (Veo / external URLs)
// =============================================

router.post('/:teamId/veo', authenticateToken, async (req, res, next) => {
  try {
    const { teamId } = req.params
    const { matchId, veoUrl } = req.body

    if (!veoUrl) {
      return res.status(400).json({ message: 'Veo URL is required' })
    }

    const result = await pool.query(
      `INSERT INTO videos (team_id, match_id, veo_link, type)
       VALUES ($1, $2, $3, 'match') RETURNING *`,
      [teamId, matchId || null, veoUrl]
    )

    if (matchId) {
      await pool.query('UPDATE matches SET veo_link = $1 WHERE id = $2', [veoUrl, matchId])
    }

    res.status(201).json(result.rows[0])
  } catch (error) {
    next(error)
  }
})

export default router
