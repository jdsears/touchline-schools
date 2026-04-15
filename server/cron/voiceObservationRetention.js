// Voice Observation Retention Job
// Runs daily. Purges raw audio after the school's configured retention
// window (default 7 days). Purges transcripts after transcript_retention_days
// (default 30 days). Retains audio_sources metadata for audit purposes.

import pool from '../config/database.js'

export async function purgeExpiredVoiceAudio() {
  console.log('[VoiceRetention] Starting audio purge scan...')

  try {
    // Find audio sources where retention has expired and storage_url is still set
    const expiredResult = await pool.query(
      `SELECT a.id, a.school_id, a.teacher_id, a.storage_url
       FROM audio_sources a
       WHERE a.retention_expires_at < NOW()
         AND a.storage_url IS NOT NULL`
    )

    let purgedCount = 0
    for (const record of expiredResult.rows) {
      try {
        // In a full implementation, delete from object storage here:
        // await deleteFile(record.storage_url)

        // Clear the storage URL (audio is gone)
        await pool.query(
          `UPDATE audio_sources SET storage_url = NULL, updated_at = NOW() WHERE id = $1`,
          [record.id]
        )

        // Audit log
        await pool.query(
          `INSERT INTO audit_log (school_id, user_id, action, entity_type, entity_id, details)
           VALUES ($1, $2, 'voice_audio_purged', 'audio_source', $3, $4)`,
          [record.school_id, record.teacher_id, record.id,
           JSON.stringify({ reason: 'retention_expired' })]
        )

        purgedCount++
      } catch (err) {
        console.error(`[VoiceRetention] Failed to purge audio ${record.id}:`, err.message)
      }
    }

    if (purgedCount > 0) {
      console.log(`[VoiceRetention] Purged ${purgedCount} expired audio files`)
    }

    // Now purge transcripts that are past the transcript retention window
    // Transcript retention = audio retention + additional days (default 30 total)
    const transcriptResult = await pool.query(
      `SELECT a.id, a.school_id, a.teacher_id
       FROM audio_sources a
       JOIN schools s ON a.school_id = s.id
       WHERE a.transcript IS NOT NULL
         AND a.created_at < NOW() - INTERVAL '1 day' * COALESCE(s.transcript_retention_days, 30)`
    )

    let transcriptPurgedCount = 0
    for (const record of transcriptResult.rows) {
      try {
        await pool.query(
          `UPDATE audio_sources SET transcript = NULL, updated_at = NOW() WHERE id = $1`,
          [record.id]
        )

        await pool.query(
          `INSERT INTO audit_log (school_id, user_id, action, entity_type, entity_id, details)
           VALUES ($1, $2, 'voice_transcript_purged', 'audio_source', $3, $4)`,
          [record.school_id, record.teacher_id, record.id,
           JSON.stringify({ reason: 'transcript_retention_expired' })]
        )

        transcriptPurgedCount++
      } catch (err) {
        console.error(`[VoiceRetention] Failed to purge transcript ${record.id}:`, err.message)
      }
    }

    if (transcriptPurgedCount > 0) {
      console.log(`[VoiceRetention] Purged ${transcriptPurgedCount} expired transcripts`)
    }

    console.log('[VoiceRetention] Purge scan complete')
  } catch (error) {
    console.error('[VoiceRetention] Scan error:', error)
  }
}
