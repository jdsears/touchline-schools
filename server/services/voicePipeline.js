// Voice Observations Processing Pipeline
// Handles the async flow: upload -> transcribe -> extract -> notify
// Uses in-process async execution for v1. Can be swapped to BullMQ later.

import pool from '../config/database.js'
import { transcribe, buildCustomVocabulary } from './transcriptionService.js'
import { extractObservations } from './voiceExtractionService.js'
import { v4 as uuidv4 } from 'uuid'

/**
 * Process a voice observation end-to-end.
 * Called after audio upload. Runs transcription and extraction,
 * then stores results for teacher review.
 *
 * @param {string} audioSourceId - The audio_sources record ID
 * @param {string} teacherId - The teacher's user ID
 * @param {string} schoolId - The school ID
 */
export async function processVoiceObservation(audioSourceId, teacherId, schoolId) {
  try {
    // 1. Get the audio source record
    const audioResult = await pool.query(
      'SELECT * FROM audio_sources WHERE id = $1',
      [audioSourceId]
    )

    if (audioResult.rows.length === 0) {
      console.error(`[VoicePipeline] Audio source ${audioSourceId} not found`)
      return
    }

    const audioSource = audioResult.rows[0]

    if (!audioSource.storage_url) {
      console.error(`[VoicePipeline] Audio source ${audioSourceId} has no storage URL`)
      return
    }

    // 2. Get the teacher's pupil roster for custom vocabulary
    const pupilsResult = await pool.query(
      `SELECT DISTINCT p.id, p.first_name, p.last_name, p.nicknames, p.year_group
       FROM pupils p
       LEFT JOIN teaching_group_pupils tgp ON tgp.pupil_id = p.id
       LEFT JOIN teaching_groups tg ON tgp.teaching_group_id = tg.id
       LEFT JOIN teams t ON p.team_id = t.id
       LEFT JOIN team_memberships tm ON tm.team_id = t.id AND tm.user_id = $1
       WHERE (tg.teacher_id = $1 OR t.owner_id = $1 OR tm.user_id = $1)
         AND p.is_active = true`,
      [teacherId]
    )

    const pupils = pupilsResult.rows
    const customVocabulary = buildCustomVocabulary(pupils)

    // 3. Transcribe
    console.log(`[VoicePipeline] Transcribing audio source ${audioSourceId}...`)
    let transcriptionResult
    try {
      transcriptionResult = await transcribe(audioSource.storage_url, {
        customVocabulary,
        languageCode: 'en_gb',
      })
    } catch (err) {
      console.error(`[VoicePipeline] Transcription failed for ${audioSourceId}:`, err.message)
      await pool.query(
        `UPDATE audio_sources SET updated_at = NOW() WHERE id = $1`,
        [audioSourceId]
      )
      await logAudit(schoolId, teacherId, 'voice_transcription_failed', 'audio_source', audioSourceId, { error: err.message })
      return
    }

    // 4. Store transcript
    await pool.query(
      `UPDATE audio_sources SET transcript = $1, transcript_generated_at = NOW(), duration_seconds = $2, updated_at = NOW()
       WHERE id = $3`,
      [transcriptionResult.text, transcriptionResult.durationSeconds, audioSourceId]
    )

    await logAudit(schoolId, teacherId, 'voice_transcription_completed', 'audio_source', audioSourceId, {
      duration_seconds: transcriptionResult.durationSeconds,
      confidence: transcriptionResult.confidence,
    })

    // 5. Extract observations
    if (!transcriptionResult.text || transcriptionResult.text.trim().length === 0) {
      console.log(`[VoicePipeline] Empty transcript for ${audioSourceId}, skipping extraction`)
      await pool.query(
        `UPDATE audio_sources SET extraction_completed_at = NOW(), updated_at = NOW() WHERE id = $1`,
        [audioSourceId]
      )
      return
    }

    // Get teacher name and context info
    const teacherResult = await pool.query('SELECT name FROM users WHERE id = $1', [teacherId])
    const teacherName = teacherResult.rows[0]?.name || 'Teacher'

    let contextLabel = null
    if (audioSource.context_id) {
      if (['match', 'half_time', 'post_fixture'].includes(audioSource.context_type)) {
        const matchResult = await pool.query(
          `SELECT m.opponent, t.name AS team_name, t.sport FROM matches m JOIN teams t ON m.team_id = t.id WHERE m.id = $1`,
          [audioSource.context_id]
        )
        if (matchResult.rows.length > 0) {
          const m = matchResult.rows[0]
          contextLabel = `${m.team_name} vs ${m.opponent} (${m.sport})`
        }
      }
    }

    // Determine sport from context
    let sport = null
    if (audioSource.context_id) {
      const sportResult = await pool.query(
        `SELECT t.sport FROM teams t
         LEFT JOIN matches m ON m.team_id = t.id AND m.id = $1
         LEFT JOIN training_sessions ts ON ts.team_id = t.id AND ts.id = $1
         WHERE m.id = $1 OR ts.id = $1
         LIMIT 1`,
        [audioSource.context_id]
      )
      if (sportResult.rows.length > 0) sport = sportResult.rows[0].sport
    }

    console.log(`[VoicePipeline] Extracting observations from ${audioSourceId}...`)
    let extraction
    try {
      extraction = await extractObservations({
        transcript: transcriptionResult.text,
        teacherName,
        sport,
        contextType: audioSource.context_type,
        contextLabel,
        pupils,
      })
    } catch (err) {
      console.error(`[VoicePipeline] Extraction failed for ${audioSourceId}:`, err.message)
      await logAudit(schoolId, teacherId, 'voice_extraction_failed', 'audio_source', audioSourceId, { error: err.message })
      return
    }

    // 6. Create pending-review observation records
    let hasSafeguardingFlags = false

    for (const obs of extraction.observations) {
      const obsId = uuidv4()
      await pool.query(
        `INSERT INTO observations (id, pupil_id, observer_id, type, content, context_type, source,
          audio_source_id, transcript_fragment, confidence, review_state, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, 'voice', $7, $8, $9, 'pending_review', NOW())`,
        [
          obsId,
          obs.pupil_id || null,
          teacherId,
          obs.observation_type || 'development',
          obs.content,
          audioSource.context_type,
          audioSourceId,
          obs.transcript_fragment || null,
          obs.confidence || null,
        ]
      )

      if (obs.safeguarding_flag) {
        hasSafeguardingFlags = true
        await logAudit(schoolId, teacherId, 'voice_safeguarding_flagged', 'observation', obsId, {
          reason: obs.safeguarding_reason,
          pupil_id: obs.pupil_id,
        })
      }
    }

    // 7. Mark extraction complete
    await pool.query(
      `UPDATE audio_sources SET extraction_completed_at = NOW(), updated_at = NOW() WHERE id = $1`,
      [audioSourceId]
    )

    await logAudit(schoolId, teacherId, 'voice_extraction_completed', 'audio_source', audioSourceId, {
      observation_count: extraction.observations.length,
      team_note_count: extraction.team_level_notes.length,
      action_item_count: extraction.action_items.length,
      safeguarding_flags: hasSafeguardingFlags,
      prompt_version: extraction.prompt_version,
    })

    console.log(`[VoicePipeline] Processing complete for ${audioSourceId}: ${extraction.observations.length} observations extracted`)
  } catch (error) {
    console.error(`[VoicePipeline] Unexpected error processing ${audioSourceId}:`, error)
  }
}

async function logAudit(schoolId, userId, action, entityType, entityId, details) {
  try {
    await pool.query(
      `INSERT INTO audit_log (school_id, user_id, action, entity_type, entity_id, details)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [schoolId, userId, action, entityType, entityId, JSON.stringify(details)]
    )
  } catch (err) {
    console.error('[VoicePipeline] Audit log error:', err.message)
  }
}
