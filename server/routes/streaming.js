import { Router } from 'express'
import pool from '../config/database.js'
import { authenticateToken } from '../middleware/auth.js'
import {
  createLiveStream,
  getStreamCredentials,
  regenerateStreamKey,
  deleteStreamCredentials,
  getPlaybackUrl,
  handleLiveStreamWebhook,
  updateGuestPin,
  getPublicStreamByShareCode,
  regenerateShareCode,
} from '../services/liveStreamService.js'

const router = Router()

/**
 * GET /api/streaming/:teamId/credentials
 * Get streaming credentials for a team
 */
router.get('/:teamId/credentials', authenticateToken, async (req, res, next) => {
  try {
    const { teamId } = req.params

    // Verify user has access to this team
    if (req.user.team_id !== teamId && !req.user.is_admin) {
      return res.status(403).json({ message: 'Access denied' })
    }

    const credentials = await getStreamCredentials(teamId)

    if (!credentials) {
      return res.json({
        hasCredentials: false,
        credentials: null,
      })
    }

    res.json({
      hasCredentials: true,
      credentials: {
        id: credentials.id,
        rtmpUrl: credentials.rtmp_url,
        streamKey: credentials.stream_key,
        playbackId: credentials.playback_id,
        playbackUrl: getPlaybackUrl(credentials.playback_id),
        status: credentials.status,
        streamName: credentials.stream_name,
        lastActiveAt: credentials.last_active_at,
        createdAt: credentials.created_at,
        shareCode: credentials.share_code,
        hasGuestPin: !!credentials.guest_pin,
        guestPin: credentials.guest_pin, // Include PIN for team members to share
      },
    })
  } catch (error) {
    next(error)
  }
})

/**
 * POST /api/streaming/:teamId/setup
 * Create new streaming credentials for a team
 */
router.post('/:teamId/setup', authenticateToken, async (req, res, next) => {
  try {
    const { teamId } = req.params
    const { streamName } = req.body

    // Verify user is a manager
    if (req.user.team_id !== teamId || req.user.role !== 'manager') {
      return res.status(403).json({ message: 'Only team managers can set up streaming' })
    }

    const result = await createLiveStream(teamId, streamName)

    res.json({
      message: 'Streaming credentials created successfully',
      credentials: {
        id: result.credentials.id,
        rtmpUrl: result.credentials.rtmp_url,
        streamKey: result.credentials.stream_key,
        playbackId: result.credentials.playback_id,
        playbackUrl: getPlaybackUrl(result.credentials.playback_id),
        status: result.credentials.status,
        streamName: result.credentials.stream_name,
      },
    })
  } catch (error) {
    if (error.message.includes('already has streaming credentials')) {
      return res.status(400).json({ message: error.message })
    }
    // Handle Mux-specific errors
    if (error.code?.startsWith('MUX_')) {
      return res.status(error.status || 500).json({ message: error.message })
    }
    next(error)
  }
})

/**
 * POST /api/streaming/:teamId/regenerate
 * Regenerate stream key (if compromised)
 */
router.post('/:teamId/regenerate', authenticateToken, async (req, res, next) => {
  try {
    const { teamId } = req.params

    // Verify user is a manager
    if (req.user.team_id !== teamId || req.user.role !== 'manager') {
      return res.status(403).json({ message: 'Only team managers can regenerate stream keys' })
    }

    const result = await regenerateStreamKey(teamId)

    res.json({
      message: 'Stream key regenerated successfully',
      credentials: {
        id: result.credentials.id,
        rtmpUrl: result.credentials.rtmp_url,
        streamKey: result.credentials.stream_key,
        playbackId: result.credentials.playback_id,
        playbackUrl: getPlaybackUrl(result.credentials.playback_id),
        status: result.credentials.status,
        streamName: result.credentials.stream_name,
      },
    })
  } catch (error) {
    if (error.message.includes('No existing stream credentials')) {
      return res.status(404).json({ message: error.message })
    }
    // Handle Mux-specific errors
    if (error.code?.startsWith('MUX_')) {
      return res.status(error.status || 500).json({ message: error.message })
    }
    next(error)
  }
})

/**
 * DELETE /api/streaming/:teamId/credentials
 * Delete streaming credentials
 */
router.delete('/:teamId/credentials', authenticateToken, async (req, res, next) => {
  try {
    const { teamId } = req.params

    // Verify user is a manager
    if (req.user.team_id !== teamId || req.user.role !== 'manager') {
      return res.status(403).json({ message: 'Only team managers can delete streaming credentials' })
    }

    const result = await deleteStreamCredentials(teamId)

    res.json(result)
  } catch (error) {
    next(error)
  }
})

/**
 * POST /api/streaming/:teamId/pin
 * Update guest PIN for the stream
 */
router.post('/:teamId/pin', authenticateToken, async (req, res, next) => {
  try {
    const { teamId } = req.params
    const { pin } = req.body

    // Verify user is a manager
    if (req.user.team_id !== teamId || req.user.role !== 'manager') {
      return res.status(403).json({ message: 'Only team managers can update the guest PIN' })
    }

    await updateGuestPin(teamId, pin)

    res.json({
      message: pin ? 'Guest PIN updated successfully' : 'Guest PIN removed',
      hasGuestPin: !!pin,
    })
  } catch (error) {
    if (error.message.includes('PIN must be')) {
      return res.status(400).json({ message: error.message })
    }
    next(error)
  }
})

/**
 * POST /api/streaming/:teamId/regenerate-share-code
 * Regenerate the share code for guest access
 */
router.post('/:teamId/regenerate-share-code', authenticateToken, async (req, res, next) => {
  try {
    const { teamId } = req.params

    // Verify user is a manager
    if (req.user.team_id !== teamId || req.user.role !== 'manager') {
      return res.status(403).json({ message: 'Only team managers can regenerate share codes' })
    }

    const result = await regenerateShareCode(teamId)

    res.json({
      message: 'Share code regenerated successfully',
      shareCode: result.share_code,
    })
  } catch (error) {
    next(error)
  }
})

/**
 * GET /api/streaming/watch/:shareCode/meta
 * Public metadata for OG/link previews - no PIN check, no playback info
 */
router.get('/watch/:shareCode/meta', async (req, res, next) => {
  try {
    const { shareCode } = req.params
    const result = await pool.query(
      `SELECT tsc.stream_name, tsc.status, tsc.guest_pin, t.name as team_name
       FROM team_stream_credentials tsc
       JOIN teams t ON t.id = tsc.team_id
       WHERE tsc.share_code = $1`,
      [shareCode]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Stream not found' })
    }

    const row = result.rows[0]
    res.json({
      teamName: row.team_name,
      streamName: row.stream_name || row.team_name,
      status: row.status,
      hasPin: !!row.guest_pin,
    })
  } catch (error) {
    next(error)
  }
})

/**
 * GET /api/streaming/watch/:shareCode
 * Public endpoint to check stream status (no auth required)
 */
router.get('/watch/:shareCode', async (req, res, next) => {
  try {
    const { shareCode } = req.params

    const result = await getPublicStreamByShareCode(shareCode)

    if (result.error === 'not_found') {
      return res.status(404).json({ message: 'Stream not found' })
    }

    if (result.error === 'pin_required') {
      return res.json({ pinRequired: true })
    }

    res.json(result)
  } catch (error) {
    next(error)
  }
})

/**
 * POST /api/streaming/watch/:shareCode
 * Public endpoint to verify PIN and get stream access (no auth required)
 */
router.post('/watch/:shareCode', async (req, res, next) => {
  try {
    const { shareCode } = req.params
    const { pin } = req.body

    const result = await getPublicStreamByShareCode(shareCode, pin)

    if (result.error === 'not_found') {
      return res.status(404).json({ message: 'Stream not found' })
    }

    if (result.error === 'pin_required') {
      return res.json({ pinRequired: true })
    }

    if (result.error === 'invalid_pin') {
      return res.status(401).json({ message: 'Invalid PIN' })
    }

    res.json(result)
  } catch (error) {
    next(error)
  }
})

/**
 * POST /api/streaming/webhooks/mux
 * Handle Mux live stream webhooks
 */
router.post('/webhooks/mux', async (req, res, next) => {
  try {
    const event = req.body

    // Handle live stream events
    if (event.type?.startsWith('video.live_stream') || event.type === 'video.asset.live_stream_completed') {
      await handleLiveStreamWebhook(event)
    }

    res.sendStatus(200)
  } catch (error) {
    console.error('Live stream webhook error:', error)
    res.sendStatus(200) // Always ack webhooks
  }
})

export default router
