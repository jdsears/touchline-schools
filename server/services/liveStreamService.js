import mux from './mux.js'
import pool from '../config/database.js'
import crypto from 'crypto'

/**
 * Generate a random share code for guest access URLs
 */
function generateShareCode() {
  return crypto.randomBytes(6).toString('base64url').slice(0, 8)
}

/**
 * Create a new Mux live stream for a team
 * Returns RTMP credentials for Veo camera configuration
 */
export async function createLiveStream(teamId, streamName = null) {
  // Check if team already has stream credentials
  const existing = await pool.query(
    'SELECT * FROM team_stream_credentials WHERE team_id = $1',
    [teamId]
  )

  if (existing.rows.length > 0) {
    throw new Error('Team already has streaming credentials. Use regenerate to create new ones.')
  }

  // Get team name for default stream name
  if (!streamName) {
    const teamResult = await pool.query('SELECT name FROM teams WHERE id = $1', [teamId])
    streamName = teamResult.rows[0]?.name || 'Live Stream'
  }

  // Create Mux live stream
  let liveStream
  try {
    liveStream = await mux.video.liveStreams.create({
      playback_policy: ['public'],
      new_asset_settings: {
        playback_policy: ['public'],
      },
      // Reconnect window allows stream to reconnect within 60 seconds
      reconnect_window: 60,
      // Low latency mode for better viewer experience
      latency_mode: 'low',
    })
  } catch (muxError) {
    // Handle Mux API errors with user-friendly messages
    const errorMessages = muxError?.error?.messages || []
    const errorType = muxError?.error?.type

    if (errorMessages.some(msg => msg.toLowerCase().includes('free plan'))) {
      const err = new Error('Live streaming requires a Mux subscription. Please contact your administrator to upgrade the streaming service.')
      err.code = 'MUX_PLAN_REQUIRED'
      err.status = 403
      throw err
    }

    if (errorType === 'invalid_parameters') {
      const err = new Error('Unable to create live stream. Please try again later or contact support.')
      err.code = 'MUX_INVALID_PARAMS'
      err.status = 400
      throw err
    }

    // Re-throw other Mux errors with improved message
    console.error('Mux API error:', muxError)
    const err = new Error('Failed to create live stream. The streaming service may be temporarily unavailable.')
    err.code = 'MUX_ERROR'
    err.status = 503
    throw err
  }

  // Extract RTMP credentials
  const rtmpUrl = `rtmp://global-live.mux.com:5222/app`
  const streamKey = liveStream.stream_key
  const playbackId = liveStream.playback_ids?.[0]?.id

  // Generate a unique share code for guest access
  const shareCode = generateShareCode()

  // Save to database
  const result = await pool.query(
    `INSERT INTO team_stream_credentials
     (team_id, mux_live_stream_id, stream_key, rtmp_url, playback_id, stream_name, status, share_code)
     VALUES ($1, $2, $3, $4, $5, $6, 'idle', $7)
     RETURNING *`,
    [teamId, liveStream.id, streamKey, rtmpUrl, playbackId, streamName, shareCode]
  )

  return {
    credentials: result.rows[0],
    liveStream,
  }
}

/**
 * Get existing stream credentials for a team
 */
export async function getStreamCredentials(teamId) {
  const result = await pool.query(
    'SELECT * FROM team_stream_credentials WHERE team_id = $1',
    [teamId]
  )

  if (result.rows.length === 0) {
    return null
  }

  let credentials = result.rows[0]

  // Auto-generate share code if missing (for existing credentials)
  if (!credentials.share_code) {
    const shareCode = generateShareCode()
    await pool.query(
      `UPDATE team_stream_credentials
       SET share_code = $1, updated_at = NOW()
       WHERE id = $2`,
      [shareCode, credentials.id]
    )
    credentials.share_code = shareCode
  }

  // Optionally check Mux for current stream status
  try {
    const liveStream = await mux.video.liveStreams.retrieve(credentials.mux_live_stream_id)

    // Update status if changed
    if (liveStream.status !== credentials.status) {
      await pool.query(
        `UPDATE team_stream_credentials
         SET status = $1, updated_at = NOW()
         WHERE id = $2`,
        [liveStream.status, credentials.id]
      )
      credentials.status = liveStream.status
    }

    // Update last active time if streaming
    if (liveStream.status === 'active') {
      await pool.query(
        `UPDATE team_stream_credentials
         SET last_active_at = NOW(), updated_at = NOW()
         WHERE id = $1`,
        [credentials.id]
      )
    }

    credentials.mux_status = liveStream.status
    credentials.recent_asset_ids = liveStream.recent_asset_ids || []
  } catch (err) {
    console.error('Failed to fetch Mux live stream status:', err.message)
  }

  return credentials
}

/**
 * Regenerate stream key (for security if compromised)
 * This creates a new live stream and deletes the old one
 */
export async function regenerateStreamKey(teamId) {
  // Get existing credentials
  const existing = await pool.query(
    'SELECT * FROM team_stream_credentials WHERE team_id = $1',
    [teamId]
  )

  if (existing.rows.length === 0) {
    throw new Error('No existing stream credentials found. Use setup first.')
  }

  const old = existing.rows[0]

  // Delete old Mux live stream
  try {
    await mux.video.liveStreams.delete(old.mux_live_stream_id)
  } catch (err) {
    console.error('Failed to delete old Mux live stream:', err.message)
  }

  // Create new Mux live stream
  let liveStream
  try {
    liveStream = await mux.video.liveStreams.create({
      playback_policy: ['public'],
      new_asset_settings: {
        playback_policy: ['public'],
      },
      reconnect_window: 60,
      latency_mode: 'low',
    })
  } catch (muxError) {
    // Handle Mux API errors with user-friendly messages
    const errorMessages = muxError?.error?.messages || []
    const errorType = muxError?.error?.type

    if (errorMessages.some(msg => msg.toLowerCase().includes('free plan'))) {
      const err = new Error('Live streaming requires a Mux subscription. Please contact your administrator to upgrade the streaming service.')
      err.code = 'MUX_PLAN_REQUIRED'
      err.status = 403
      throw err
    }

    if (errorType === 'invalid_parameters') {
      const err = new Error('Unable to regenerate stream key. Please try again later or contact support.')
      err.code = 'MUX_INVALID_PARAMS'
      err.status = 400
      throw err
    }

    console.error('Mux API error:', muxError)
    const err = new Error('Failed to regenerate stream key. The streaming service may be temporarily unavailable.')
    err.code = 'MUX_ERROR'
    err.status = 503
    throw err
  }

  const rtmpUrl = `rtmp://global-live.mux.com:5222/app`
  const streamKey = liveStream.stream_key
  const playbackId = liveStream.playback_ids?.[0]?.id

  // Update database
  const result = await pool.query(
    `UPDATE team_stream_credentials
     SET mux_live_stream_id = $1, stream_key = $2, rtmp_url = $3,
         playback_id = $4, status = 'idle', updated_at = NOW()
     WHERE team_id = $5
     RETURNING *`,
    [liveStream.id, streamKey, rtmpUrl, playbackId, teamId]
  )

  return {
    credentials: result.rows[0],
    liveStream,
  }
}

/**
 * Disable/delete stream credentials for a team
 */
export async function deleteStreamCredentials(teamId) {
  const existing = await pool.query(
    'SELECT * FROM team_stream_credentials WHERE team_id = $1',
    [teamId]
  )

  if (existing.rows.length === 0) {
    return { deleted: false, message: 'No credentials found' }
  }

  const credentials = existing.rows[0]

  // Delete Mux live stream
  try {
    await mux.video.liveStreams.delete(credentials.mux_live_stream_id)
  } catch (err) {
    console.error('Failed to delete Mux live stream:', err.message)
  }

  // Delete from database
  await pool.query('DELETE FROM team_stream_credentials WHERE team_id = $1', [teamId])

  return { deleted: true }
}

/**
 * Get live stream playback URL for viewers
 */
export function getPlaybackUrl(playbackId) {
  if (!playbackId) return null
  return `https://stream.mux.com/${playbackId}.m3u8`
}

/**
 * Handle Mux live stream webhook events
 */
export async function handleLiveStreamWebhook(event) {
  const { type, data } = event

  switch (type) {
    case 'video.live_stream.active': {
      // Stream went live
      await pool.query(
        `UPDATE team_stream_credentials
         SET status = 'active', last_active_at = NOW(), updated_at = NOW()
         WHERE mux_live_stream_id = $1`,
        [data.id]
      )
      console.log(`Live stream ${data.id} is now active`)
      break
    }

    case 'video.live_stream.idle': {
      // Stream stopped
      await pool.query(
        `UPDATE team_stream_credentials
         SET status = 'idle', updated_at = NOW()
         WHERE mux_live_stream_id = $1`,
        [data.id]
      )
      console.log(`Live stream ${data.id} is now idle`)
      break
    }

    case 'video.live_stream.disconnected': {
      // Stream disconnected (may reconnect)
      await pool.query(
        `UPDATE team_stream_credentials
         SET status = 'disconnected', updated_at = NOW()
         WHERE mux_live_stream_id = $1`,
        [data.id]
      )
      console.log(`Live stream ${data.id} disconnected`)
      break
    }

    case 'video.asset.live_stream_completed': {
      // Recording from live stream is ready
      const assetId = data.id
      const liveStreamId = data.live_stream_id

      // Get the team from the live stream
      const streamResult = await pool.query(
        'SELECT team_id FROM team_stream_credentials WHERE mux_live_stream_id = $1',
        [liveStreamId]
      )

      if (streamResult.rows.length > 0) {
        const teamId = streamResult.rows[0].team_id
        const playbackId = data.playback_ids?.[0]?.id
        const duration = data.duration

        // Save as a video recording
        await pool.query(
          `INSERT INTO videos (team_id, mux_asset_id, mux_playback_id, title, type,
                              duration_seconds, thumbnail_url, status)
           VALUES ($1, $2, $3, $4, 'live_recording', $5, $6, 'ready')`,
          [
            teamId,
            assetId,
            playbackId,
            `Live Stream Recording - ${new Date().toLocaleDateString()}`,
            duration,
            playbackId ? `https://image.mux.com/${playbackId}/thumbnail.jpg?time=10` : null,
          ]
        )
        console.log(`Saved live stream recording for team ${teamId}`)
      }
      break
    }

    default:
      // Ignore other events
      break
  }
}

/**
 * Update the guest PIN for a team's stream
 */
export async function updateGuestPin(teamId, pin) {
  // Validate PIN format (4-6 digits)
  if (pin && !/^\d{4,6}$/.test(pin)) {
    throw new Error('PIN must be 4-6 digits')
  }

  const result = await pool.query(
    `UPDATE team_stream_credentials
     SET guest_pin = $1, updated_at = NOW()
     WHERE team_id = $2
     RETURNING *`,
    [pin || null, teamId]
  )

  if (result.rows.length === 0) {
    throw new Error('No streaming credentials found for this team')
  }

  return result.rows[0]
}

/**
 * Get public stream info by share code (with optional PIN verification)
 */
export async function getPublicStreamByShareCode(shareCode, pin = null) {
  const result = await pool.query(
    'SELECT * FROM team_stream_credentials WHERE share_code = $1',
    [shareCode]
  )

  if (result.rows.length === 0) {
    return { error: 'not_found' }
  }

  const credentials = result.rows[0]

  // Check PIN if one is set
  if (credentials.guest_pin) {
    if (!pin) {
      return { error: 'pin_required', hasPin: true }
    }
    if (pin !== credentials.guest_pin) {
      return { error: 'invalid_pin' }
    }
  }

  // Get team name for display
  const teamResult = await pool.query(
    'SELECT name FROM teams WHERE id = $1',
    [credentials.team_id]
  )
  const teamName = teamResult.rows[0]?.name || 'Live Stream'

  // Check current stream status from Mux
  let status = credentials.status
  try {
    const liveStream = await mux.video.liveStreams.retrieve(credentials.mux_live_stream_id)
    status = liveStream.status
  } catch (err) {
    console.error('Failed to check Mux stream status:', err)
  }

  return {
    success: true,
    stream: {
      playbackId: credentials.playback_id,
      playbackUrl: getPlaybackUrl(credentials.playback_id),
      status,
      streamName: credentials.stream_name || teamName,
      teamName,
    }
  }
}

/**
 * Regenerate share code for a team's stream
 */
export async function regenerateShareCode(teamId) {
  const newShareCode = generateShareCode()

  const result = await pool.query(
    `UPDATE team_stream_credentials
     SET share_code = $1, updated_at = NOW()
     WHERE team_id = $2
     RETURNING *`,
    [newShareCode, teamId]
  )

  if (result.rows.length === 0) {
    throw new Error('No streaming credentials found for this team')
  }

  return result.rows[0]
}
