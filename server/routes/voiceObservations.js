import express from 'express'
import multer from 'multer'
import pool from '../config/database.js'
import { authenticateToken } from '../middleware/auth.js'
import { uploadFile } from '../services/storageService.js'
import { processVoiceObservation } from '../services/voicePipeline.js'
import { v4 as uuidv4 } from 'uuid'
import rateLimit from 'express-rate-limit'
import path from 'path'
import fs from 'fs'
import os from 'os'

const router = express.Router()
router.use(authenticateToken)

// Self-heal the voice schema if the Phase 11 migration was skipped
// (runMigrations swallows errors from earlier phases, which can prevent
// Phase 11 from running on affected deployments). Runs once per process.
let schemaEnsured = null
function ensureVoiceSchema() {
  if (schemaEnsured) return schemaEnsured
  schemaEnsured = (async () => {
    try {
      await pool.query(`CREATE TABLE IF NOT EXISTS audio_sources (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        teacher_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
        context_type TEXT NOT NULL DEFAULT 'general'
          CHECK (context_type IN ('session', 'match', 'half_time', 'post_fixture', 'lesson', 'general')),
        context_id UUID,
        duration_seconds INTEGER,
        storage_url TEXT,
        transcript TEXT,
        transcript_generated_at TIMESTAMPTZ,
        extraction_completed_at TIMESTAMPTZ,
        retention_expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 days'),
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )`)
      await pool.query(`CREATE INDEX IF NOT EXISTS idx_audio_sources_teacher ON audio_sources(teacher_id)`)
      await pool.query(`CREATE INDEX IF NOT EXISTS idx_audio_sources_school ON audio_sources(school_id)`)
      await pool.query(`CREATE INDEX IF NOT EXISTS idx_audio_sources_retention ON audio_sources(retention_expires_at)`)

      // Observations table voice fields (from Phase 11a)
      await pool.query(`DO $$ BEGIN
        ALTER TABLE observations ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'typed';
        ALTER TABLE observations ADD COLUMN IF NOT EXISTS audio_source_id UUID;
        ALTER TABLE observations ADD COLUMN IF NOT EXISTS transcript_fragment TEXT;
        ALTER TABLE observations ADD COLUMN IF NOT EXISTS confidence REAL;
        ALTER TABLE observations ADD COLUMN IF NOT EXISTS review_state TEXT DEFAULT 'confirmed';
      EXCEPTION WHEN others THEN NULL;
      END $$`)

      // Schools voice config (from Phase 11d)
      await pool.query(`DO $$ BEGIN
        ALTER TABLE schools ADD COLUMN IF NOT EXISTS voice_observations_enabled BOOLEAN DEFAULT false;
        ALTER TABLE schools ADD COLUMN IF NOT EXISTS audio_retention_days INTEGER DEFAULT 7;
        ALTER TABLE schools ADD COLUMN IF NOT EXISTS transcript_retention_days INTEGER DEFAULT 30;
      EXCEPTION WHEN others THEN NULL;
      END $$`)

      // Pupil nicknames (from Phase 11c)
      await pool.query(`DO $$ BEGIN
        ALTER TABLE pupils ADD COLUMN IF NOT EXISTS nicknames TEXT[];
      EXCEPTION WHEN others THEN NULL;
      END $$`)

      console.log('[VoiceObservations] Schema ensured')
    } catch (err) {
      console.error('[VoiceObservations] ensureVoiceSchema failed:', err.message)
      schemaEnsured = null // allow retry on next request
      throw err
    }
  })()
  return schemaEnsured
}

// Run once on module load (fire-and-forget; requests will await it if needed)
ensureVoiceSchema().catch(() => {})

// Rate limit: max 20 uploads per teacher per hour
const voiceUploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 20,
  keyGenerator: (req) => req.user?.id || req.ip,
  message: { error: 'Too many voice observations. Maximum 20 per hour.' },
})

// Multer for audio upload (temp file, 10MB limit)
const audioUpload = multer({
  dest: os.tmpdir(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['audio/webm', 'audio/mp4', 'audio/m4a', 'audio/mpeg', 'audio/ogg', 'audio/wav']
    if (allowedTypes.includes(file.mimetype) || file.originalname.match(/\.(webm|m4a|mp4|mp3|ogg|wav)$/i)) {
      cb(null, true)
    } else {
      cb(new Error('Only audio files are accepted'))
    }
  },
})

// Helper to get user's school ID.
// Teachers reach a school via school_members (staff roster) OR via teaching_groups
// (class assignment). Site admins may not be in either table, so fall back to the
// first school in the DB so they can still use features while demoing.
async function getUserSchoolId(userId) {
  const direct = await pool.query(
    `SELECT school_id FROM school_members WHERE user_id = $1 ORDER BY joined_at ASC NULLS LAST LIMIT 1`,
    [userId]
  )
  if (direct.rows[0]?.school_id) return direct.rows[0].school_id
  const via = await pool.query(
    `SELECT school_id FROM teaching_groups WHERE teacher_id = $1 LIMIT 1`,
    [userId]
  )
  if (via.rows[0]?.school_id) return via.rows[0].school_id
  // Admin fallback: if user is a site admin not on any school roster,
  // use the first school so they can demo all features.
  const admin = await pool.query(`SELECT is_admin FROM users WHERE id = $1`, [userId])
  if (admin.rows[0]?.is_admin) {
    const fallback = await pool.query(`SELECT id FROM schools ORDER BY created_at ASC LIMIT 1`)
    return fallback.rows[0]?.id || null
  }
  return null
}

// Middleware: check voice observations feature flag
async function requireVoiceEnabled(req, res, next) {
  try {
    const schoolId = await getUserSchoolId(req.user.id)
    if (!schoolId) {
      return res.status(403).json({ error: 'No school access' })
    }
    const schoolResult = await pool.query(
      `SELECT voice_observations_enabled FROM schools WHERE id = $1`,
      [schoolId]
    )
    if (schoolResult.rows.length === 0 || !schoolResult.rows[0].voice_observations_enabled) {
      return res.status(403).json({ error: 'Voice observations are not enabled for your school' })
    }

    next()
  } catch (error) {
    next(error)
  }
}

// POST /upload - Upload audio and start processing pipeline
router.post('/upload', voiceUploadLimiter, requireVoiceEnabled, audioUpload.single('audio'), async (req, res) => {
  let stage = 'init'
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Audio file is required' })
    }

    const { context_type, context_id } = req.body
    if (!context_type) {
      return res.status(400).json({ error: 'context_type is required' })
    }

    const validContextTypes = ['session', 'match', 'half_time', 'post_fixture', 'lesson', 'general']
    if (!validContextTypes.includes(context_type)) {
      return res.status(400).json({ error: `context_type must be one of: ${validContextTypes.join(', ')}` })
    }

    stage = 'ensure_schema'
    await ensureVoiceSchema()

    stage = 'resolve_school'
    const schoolId = await getUserSchoolId(req.user.id)
    if (!schoolId) {
      return res.status(403).json({ error: 'No school access' })
    }

    // Get school retention settings
    stage = 'read_retention'
    const retentionResult = await pool.query(
      'SELECT audio_retention_days FROM schools WHERE id = $1',
      [schoolId]
    )
    const retentionDays = retentionResult.rows[0]?.audio_retention_days || 7

    const audioSourceId = uuidv4()
    const storageKey = `audio_sources/${schoolId}/${req.user.id}/${audioSourceId}${path.extname(req.file.originalname) || '.webm'}`

    // Read the bytes BEFORE handing off to storage. We pass this buffer to the
    // transcription pipeline so it never has to re-fetch the audio — works
    // regardless of whether cloud storage is configured or the returned URL
    // is publicly fetchable.
    stage = 'read_audio_bytes'
    const audioBuffer = fs.readFileSync(req.file.path)

    // Upload to object storage (for retention / audit trail)
    stage = 'upload_to_storage'
    let storageUrl
    try {
      storageUrl = await uploadFile(req.file.path, storageKey, {
        contentType: req.file.mimetype,
      })
    } catch (err) {
      console.error('[VoiceObservations] Storage upload failed:', err)
      // Fall back to local file path if storage fails
      storageUrl = req.file.path
    }

    // Clean up temp file if uploaded to cloud
    if (storageUrl !== req.file.path && fs.existsSync(req.file.path)) {
      try { fs.unlinkSync(req.file.path) } catch { /* ignore */ }
    }

    // Create audio_sources record
    stage = 'insert_audio_source'
    await pool.query(
      `INSERT INTO audio_sources (id, teacher_id, school_id, context_type, context_id, storage_url, retention_expires_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW() + INTERVAL '1 day' * $7)`,
      [audioSourceId, req.user.id, schoolId, context_type, context_id || null, storageUrl, retentionDays]
    )

    // Audit log (best-effort — don't 500 the upload if audit insert fails)
    stage = 'audit_log'
    try {
      await pool.query(
        `INSERT INTO audit_log (school_id, user_id, action, entity_type, entity_id, details)
         VALUES ($1, $2, 'voice_recording_completed', 'audio_source', $3, $4)`,
        [schoolId, req.user.id, audioSourceId, JSON.stringify({ context_type, context_id, file_size: req.file.size })]
      )
    } catch (err) {
      console.error('[VoiceObservations] Audit log insert failed (non-fatal):', err.message)
    }

    // Kick off async processing (non-blocking). Pass the in-memory audio
    // buffer so the pipeline doesn't have to re-fetch storage_url — some
    // storage backends (local disk mode) return a URL that isn't publicly
    // fetchable by external transcription providers.
    stage = 'enqueue_pipeline'
    processVoiceObservation(audioSourceId, req.user.id, schoolId, audioBuffer)
      .catch(err => console.error(`[VoiceObservations] Pipeline error for ${audioSourceId}:`, err))

    res.status(201).json({
      audio_source_id: audioSourceId,
      status: 'processing',
      message: 'Audio uploaded. Transcription and extraction are in progress.',
    })
  } catch (error) {
    // Clean up temp file on error
    if (req.file && fs.existsSync(req.file.path)) {
      try { fs.unlinkSync(req.file.path) } catch { /* ignore */ }
    }
    console.error(`[VoiceObservations] Upload failed at stage "${stage}":`, error)
    res.status(500).json({
      error: `Failed to process voice observation (${stage}): ${error.message || 'unknown error'}`,
      stage,
    })
  }
})

// GET /status/:audioSourceId - Check processing status
router.get('/status/:audioSourceId', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, context_type, context_id, duration_seconds,
              transcript IS NOT NULL AS has_transcript,
              transcript_generated_at,
              extraction_completed_at,
              created_at
       FROM audio_sources
       WHERE id = $1 AND teacher_id = $2`,
      [req.params.audioSourceId, req.user.id]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Voice observation not found' })
    }

    const source = result.rows[0]
    let status = 'processing'
    if (source.extraction_completed_at) status = 'ready_for_review'
    else if (source.has_transcript) status = 'extracting'

    res.json({ ...source, status })
  } catch (error) {
    console.error('Voice status error:', error)
    res.status(500).json({ error: 'Failed to check status' })
  }
})

// GET /:audioSourceId - Get full review data (transcript + pending observations)
router.get('/:audioSourceId', requireVoiceEnabled, async (req, res) => {
  try {
    // Get audio source (only the teacher who created it)
    const sourceResult = await pool.query(
      `SELECT * FROM audio_sources WHERE id = $1 AND teacher_id = $2`,
      [req.params.audioSourceId, req.user.id]
    )

    if (sourceResult.rows.length === 0) {
      return res.status(404).json({ error: 'Voice observation not found' })
    }

    const source = sourceResult.rows[0]

    // Get pending observations
    const obsResult = await pool.query(
      `SELECT o.*, p.first_name, p.last_name, p.year_group, p.nicknames
       FROM observations o
       LEFT JOIN pupils p ON o.pupil_id = p.id
       WHERE o.audio_source_id = $1
       ORDER BY o.created_at ASC`,
      [req.params.audioSourceId]
    )

    // Log review access
    await pool.query(
      `INSERT INTO audit_log (school_id, user_id, action, entity_type, entity_id)
       VALUES ($1, $2, 'voice_observation_reviewed', 'audio_source', $3)`,
      [source.school_id, req.user.id, req.params.audioSourceId]
    )

    res.json({
      audio_source: {
        id: source.id,
        context_type: source.context_type,
        context_id: source.context_id,
        duration_seconds: source.duration_seconds,
        transcript: source.transcript,
        transcript_generated_at: source.transcript_generated_at,
        extraction_completed_at: source.extraction_completed_at,
        created_at: source.created_at,
      },
      observations: obsResult.rows,
    })
  } catch (error) {
    console.error('Voice review error:', error)
    res.status(500).json({ error: 'Failed to load review' })
  }
})

// PATCH /:audioSourceId/observations/:observationId - Edit a pending observation
router.patch('/:audioSourceId/observations/:observationId', requireVoiceEnabled, async (req, res) => {
  try {
    const { content, pupil_id, type } = req.body

    // Verify the observation belongs to this audio source and teacher
    const obsResult = await pool.query(
      `SELECT o.id FROM observations o
       JOIN audio_sources a ON o.audio_source_id = a.id
       WHERE o.id = $1 AND o.audio_source_id = $2 AND a.teacher_id = $3
         AND o.review_state = 'pending_review'`,
      [req.params.observationId, req.params.audioSourceId, req.user.id]
    )

    if (obsResult.rows.length === 0) {
      return res.status(404).json({ error: 'Observation not found or already reviewed' })
    }

    const result = await pool.query(
      `UPDATE observations SET
        content = COALESCE($1, content),
        pupil_id = COALESCE($2, pupil_id),
        type = COALESCE($3, type),
        review_state = 'edited'
       WHERE id = $4
       RETURNING *`,
      [content, pupil_id, type, req.params.observationId]
    )

    // Audit log
    const schoolId = await getUserSchoolId(req.user.id)
    await pool.query(
      `INSERT INTO audit_log (school_id, user_id, action, entity_type, entity_id, details)
       VALUES ($1, $2, 'voice_observation_edited', 'observation', $3, $4)`,
      [schoolId, req.user.id, req.params.observationId, JSON.stringify({ content, pupil_id, type })]
    )

    res.json(result.rows[0])
  } catch (error) {
    console.error('Voice edit error:', error)
    res.status(500).json({ error: 'Failed to edit observation' })
  }
})

// POST /:audioSourceId/confirm - Confirm all pending observations
router.post('/:audioSourceId/confirm', requireVoiceEnabled, async (req, res) => {
  try {
    // Verify ownership
    const sourceResult = await pool.query(
      `SELECT school_id FROM audio_sources WHERE id = $1 AND teacher_id = $2`,
      [req.params.audioSourceId, req.user.id]
    )

    if (sourceResult.rows.length === 0) {
      return res.status(404).json({ error: 'Voice observation not found' })
    }

    // Confirm all pending_review and edited observations
    const result = await pool.query(
      `UPDATE observations SET review_state = 'confirmed'
       WHERE audio_source_id = $1 AND review_state IN ('pending_review', 'edited')
       RETURNING id, pupil_id`,
      [req.params.audioSourceId]
    )

    // Audit log for each confirmed observation
    for (const obs of result.rows) {
      await pool.query(
        `INSERT INTO audit_log (school_id, user_id, action, entity_type, entity_id, details)
         VALUES ($1, $2, 'voice_observation_confirmed', 'observation', $3, $4)`,
        [sourceResult.rows[0].school_id, req.user.id, obs.id, JSON.stringify({ pupil_id: obs.pupil_id })]
      )
    }

    res.json({ confirmed: result.rows.length })
  } catch (error) {
    console.error('Voice confirm error:', error)
    res.status(500).json({ error: 'Failed to confirm observations' })
  }
})

// POST /:audioSourceId/observations/:observationId/reject - Reject a single observation
router.post('/:audioSourceId/observations/:observationId/reject', requireVoiceEnabled, async (req, res) => {
  try {
    const result = await pool.query(
      `UPDATE observations SET review_state = 'rejected'
       WHERE id = $1 AND audio_source_id = $2 AND review_state IN ('pending_review', 'edited')
       RETURNING id`,
      [req.params.observationId, req.params.audioSourceId]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Observation not found or already reviewed' })
    }

    const schoolId = await getUserSchoolId(req.user.id)
    await pool.query(
      `INSERT INTO audit_log (school_id, user_id, action, entity_type, entity_id)
       VALUES ($1, $2, 'voice_observation_rejected', 'observation', $3)`,
      [schoolId, req.user.id, req.params.observationId]
    )

    res.json({ message: 'Observation rejected' })
  } catch (error) {
    console.error('Voice reject error:', error)
    res.status(500).json({ error: 'Failed to reject observation' })
  }
})

// DELETE /:audioSourceId - Discard everything (audio + all pending observations)
router.delete('/:audioSourceId', requireVoiceEnabled, async (req, res) => {
  try {
    // Verify ownership
    const sourceResult = await pool.query(
      `SELECT school_id FROM audio_sources WHERE id = $1 AND teacher_id = $2`,
      [req.params.audioSourceId, req.user.id]
    )

    if (sourceResult.rows.length === 0) {
      return res.status(404).json({ error: 'Voice observation not found' })
    }

    // Reject all pending observations
    await pool.query(
      `UPDATE observations SET review_state = 'rejected'
       WHERE audio_source_id = $1 AND review_state IN ('pending_review', 'edited')`,
      [req.params.audioSourceId]
    )

    // Mark audio source for immediate purge
    await pool.query(
      `UPDATE audio_sources SET retention_expires_at = NOW(), transcript = NULL, updated_at = NOW()
       WHERE id = $1`,
      [req.params.audioSourceId]
    )

    const schoolId = sourceResult.rows[0].school_id
    await pool.query(
      `INSERT INTO audit_log (school_id, user_id, action, entity_type, entity_id)
       VALUES ($1, $2, 'voice_audio_purged', 'audio_source', $3)`,
      [schoolId, req.user.id, req.params.audioSourceId]
    )

    res.json({ message: 'Voice observation discarded' })
  } catch (error) {
    console.error('Voice discard error:', error)
    res.status(500).json({ error: 'Failed to discard observation' })
  }
})

// GET /pending - List all pending voice observations for the teacher
router.get('/', requireVoiceEnabled, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT a.id, a.context_type, a.context_id, a.duration_seconds,
              a.transcript IS NOT NULL AS has_transcript,
              a.extraction_completed_at,
              a.created_at,
              (SELECT COUNT(*) FROM observations o WHERE o.audio_source_id = a.id AND o.review_state = 'pending_review') AS pending_count
       FROM audio_sources a
       WHERE a.teacher_id = $1
         AND a.retention_expires_at > NOW()
       ORDER BY a.created_at DESC
       LIMIT 20`,
      [req.user.id]
    )

    res.json(result.rows)
  } catch (error) {
    console.error('Voice list error:', error)
    res.status(500).json({ error: 'Failed to list voice observations' })
  }
})

export default router
