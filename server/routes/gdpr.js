/**
 * GDPR Routes
 *
 * Endpoints for UK GDPR compliance:
 * - Data export (Subject Access Request)
 * - Data deletion (Right to Erasure)
 * - Consent management
 * - Deletion log (audit trail)
 *
 * All routes require authentication. Export/deletion require HoD-level access.
 */

import express from 'express'
import pool from '../config/database.js'
import { authenticateToken } from '../middleware/auth.js'
import { collectPupilData, deletePupilData } from '../services/gdprService.js'

const router = express.Router()

router.use(authenticateToken)

// ---------------------------------------------------------------------------
// Middleware: resolve the user's school context (HoD or admin)
// ---------------------------------------------------------------------------
async function requireSchoolAdmin(req, res, next) {
  try {
    if (req.user.is_admin) {
      const schoolResult = await pool.query('SELECT id FROM schools LIMIT 1')
      if (schoolResult.rows.length > 0) req.schoolId = schoolResult.rows[0].id
      return next()
    }

    const result = await pool.query(
      `SELECT sm.school_id FROM school_members sm
       WHERE sm.user_id = $1 AND sm.role IN ('owner', 'admin')
       LIMIT 1`,
      [req.user.id]
    )

    if (result.rows.length === 0) {
      return res.status(403).json({ error: 'School admin access required for GDPR operations' })
    }

    req.schoolId = result.rows[0].school_id
    next()
  } catch (error) {
    console.error('GDPR auth error:', error)
    res.status(500).json({ error: 'Authentication error' })
  }
}

// ---------------------------------------------------------------------------
// GET /overview - GDPR dashboard stats
// ---------------------------------------------------------------------------
router.get('/overview', requireSchoolAdmin, async (req, res) => {
  try {
    const schoolId = req.schoolId

    // Pending requests
    const pending = await pool.query(
      `SELECT request_type, COUNT(*) as count
       FROM data_export_requests
       WHERE school_id = $1 AND status IN ('pending', 'processing')
       GROUP BY request_type`,
      [schoolId]
    )

    // Recent completed
    const recent = await pool.query(
      `SELECT id, request_type, status, created_at, completed_at
       FROM data_export_requests
       WHERE school_id = $1
       ORDER BY created_at DESC LIMIT 10`,
      [schoolId]
    )

    // Deletion log
    const deletions = await pool.query(
      `SELECT id, pupil_reference, reason, created_at
       FROM data_deletion_log
       WHERE school_id = $1
       ORDER BY created_at DESC LIMIT 10`,
      [schoolId]
    )

    // Consent stats
    const consentStats = await pool.query(
      `SELECT consent_type,
              COUNT(*) FILTER (WHERE granted = true AND withdrawn_at IS NULL) as granted,
              COUNT(*) FILTER (WHERE granted = false OR withdrawn_at IS NOT NULL) as not_granted
       FROM gdpr_consent_records
       WHERE school_id = $1
       GROUP BY consent_type`,
      [schoolId]
    )

    // Total pupils
    const totalPupils = await pool.query(
      `SELECT COUNT(*) as count FROM pupils
       WHERE team_id IN (SELECT id FROM teams WHERE school_id = $1)`,
      [schoolId]
    )

    res.json({
      total_pupils: parseInt(totalPupils.rows[0]?.count || 0),
      pending_requests: pending.rows,
      recent_requests: recent.rows,
      recent_deletions: deletions.rows,
      consent_summary: consentStats.rows,
    })
  } catch (error) {
    console.error('GDPR overview error:', error)
    res.status(500).json({ error: 'Failed to load GDPR overview' })
  }
})

// ---------------------------------------------------------------------------
// POST /export - Request data export for a pupil
// ---------------------------------------------------------------------------
router.post('/export', requireSchoolAdmin, async (req, res) => {
  try {
    const { pupil_id, reason } = req.body
    if (!pupil_id) return res.status(400).json({ error: 'pupil_id is required' })

    // Verify pupil belongs to this school
    const pupil = await pool.query(
      `SELECT p.id, p.name FROM pupils p
       JOIN teams t ON p.team_id = t.id
       WHERE p.id = $1 AND t.school_id = $2`,
      [pupil_id, req.schoolId]
    )
    if (pupil.rows.length === 0) {
      return res.status(404).json({ error: 'Pupil not found in this school' })
    }

    // Create export request
    const request = await pool.query(
      `INSERT INTO data_export_requests (school_id, pupil_id, requested_by, request_type, reason, status)
       VALUES ($1, $2, $3, 'export', $4, 'processing')
       RETURNING *`,
      [req.schoolId, pupil_id, req.user.id, reason || 'Subject Access Request']
    )

    // Collect the data immediately (for small datasets this is fast enough)
    try {
      const data = await collectPupilData(pupil_id, req.schoolId)

      // Store the export as a JSON string in the file_path field
      // In production this would be written to S3 as a downloadable file
      await pool.query(
        `UPDATE data_export_requests
         SET status = 'ready',
             file_path = $1,
             download_expires_at = NOW() + INTERVAL '7 days',
             completed_at = NOW(),
             updated_at = NOW()
         WHERE id = $2`,
        [JSON.stringify(data), request.rows[0].id]
      )

      // Audit log
      await pool.query(
        `INSERT INTO audit_log (school_id, user_id, action, entity_type, entity_id, details)
         VALUES ($1, $2, 'gdpr_export_created', 'pupil', $3, $4)`,
        [req.schoolId, req.user.id, pupil_id,
         JSON.stringify({ pupil_name: pupil.rows[0].name, request_id: request.rows[0].id })]
      )

      res.json({
        id: request.rows[0].id,
        status: 'ready',
        download_token: request.rows[0].download_token,
        pupil_name: pupil.rows[0].name,
        message: 'Data export is ready for download',
      })
    } catch (exportError) {
      await pool.query(
        `UPDATE data_export_requests SET status = 'failed', updated_at = NOW() WHERE id = $1`,
        [request.rows[0].id]
      )
      throw exportError
    }
  } catch (error) {
    console.error('GDPR export error:', error)
    res.status(500).json({ error: 'Failed to create data export' })
  }
})

// ---------------------------------------------------------------------------
// GET /export/:token/download - Download a data export
// ---------------------------------------------------------------------------
router.get('/export/:token/download', requireSchoolAdmin, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM data_export_requests
       WHERE download_token = $1 AND school_id = $2 AND status IN ('ready', 'downloaded')
       AND (download_expires_at IS NULL OR download_expires_at > NOW())`,
      [req.params.token, req.schoolId]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Export not found or expired' })
    }

    const exportRequest = result.rows[0]

    // Mark as downloaded
    await pool.query(
      `UPDATE data_export_requests SET status = 'downloaded', updated_at = NOW() WHERE id = $1`,
      [exportRequest.id]
    )

    // Audit log
    await pool.query(
      `INSERT INTO audit_log (school_id, user_id, action, entity_type, entity_id, details)
       VALUES ($1, $2, 'gdpr_export_downloaded', 'data_export_request', $3, $4)`,
      [req.schoolId, req.user.id, exportRequest.id,
       JSON.stringify({ downloaded_by: req.user.name })]
    )

    const data = JSON.parse(exportRequest.file_path)
    const pupilName = data.personal_information?.name || 'pupil'
    const filename = `gdpr-export-${pupilName.replace(/\s+/g, '-').toLowerCase()}-${new Date().toISOString().split('T')[0]}.json`

    res.setHeader('Content-Type', 'application/json')
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)
    res.send(JSON.stringify(data, null, 2))
  } catch (error) {
    console.error('GDPR download error:', error)
    res.status(500).json({ error: 'Failed to download export' })
  }
})

// ---------------------------------------------------------------------------
// GET /requests - List all export/deletion requests
// ---------------------------------------------------------------------------
router.get('/requests', requireSchoolAdmin, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT der.id, der.request_type, der.status, der.reason,
              der.download_token, der.download_expires_at,
              der.completed_at, der.created_at,
              p.name as pupil_name, u.name as requested_by_name
       FROM data_export_requests der
       JOIN pupils p ON der.pupil_id = p.id
       JOIN users u ON der.requested_by = u.id
       WHERE der.school_id = $1
       ORDER BY der.created_at DESC`,
      [req.schoolId]
    )

    res.json(result.rows)
  } catch (error) {
    console.error('GDPR requests list error:', error)
    res.status(500).json({ error: 'Failed to load requests' })
  }
})

// ---------------------------------------------------------------------------
// POST /deletion - Request data deletion for a pupil (Right to Erasure)
// ---------------------------------------------------------------------------
router.post('/deletion', requireSchoolAdmin, async (req, res) => {
  try {
    const { pupil_id, reason, confirm } = req.body
    if (!pupil_id) return res.status(400).json({ error: 'pupil_id is required' })
    if (!reason) return res.status(400).json({ error: 'A reason for deletion is required for audit purposes' })
    if (confirm !== true) {
      return res.status(400).json({
        error: 'You must confirm deletion by setting confirm: true. This action is irreversible.',
      })
    }

    // Verify pupil belongs to this school
    const pupil = await pool.query(
      `SELECT p.id, p.name FROM pupils p
       JOIN teams t ON p.team_id = t.id
       WHERE p.id = $1 AND t.school_id = $2`,
      [pupil_id, req.schoolId]
    )
    if (pupil.rows.length === 0) {
      return res.status(404).json({ error: 'Pupil not found in this school' })
    }

    // Create the deletion request record
    const request = await pool.query(
      `INSERT INTO data_export_requests (school_id, pupil_id, requested_by, request_type, reason, status)
       VALUES ($1, $2, $3, 'deletion', $4, 'processing')
       RETURNING *`,
      [req.schoolId, pupil_id, req.user.id, reason]
    )

    // Perform the deletion
    try {
      const result = await deletePupilData(pupil_id, req.schoolId, req.user.id, reason)

      await pool.query(
        `UPDATE data_export_requests
         SET status = 'completed', completed_at = NOW(), updated_at = NOW()
         WHERE id = $1`,
        [request.rows[0].id]
      )

      res.json({
        success: true,
        pupil_reference: result.pupil_reference,
        tables_purged: result.tables_purged,
        files_deleted: result.files_deleted.length,
        message: 'All personal data for this pupil has been permanently deleted.',
      })
    } catch (deleteError) {
      await pool.query(
        `UPDATE data_export_requests SET status = 'failed', updated_at = NOW() WHERE id = $1`,
        [request.rows[0].id]
      )
      throw deleteError
    }
  } catch (error) {
    console.error('GDPR deletion error:', error)
    res.status(500).json({ error: 'Failed to process deletion request' })
  }
})

// ---------------------------------------------------------------------------
// GET /deletion-log - View the permanent deletion audit trail
// ---------------------------------------------------------------------------
router.get('/deletion-log', requireSchoolAdmin, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT dl.id, dl.pupil_reference, dl.reason, dl.tables_purged,
              dl.files_deleted, dl.summary, dl.created_at,
              u.name as deleted_by_name
       FROM data_deletion_log dl
       JOIN users u ON dl.deleted_by = u.id
       WHERE dl.school_id = $1
       ORDER BY dl.created_at DESC`,
      [req.schoolId]
    )

    res.json(result.rows)
  } catch (error) {
    console.error('GDPR deletion log error:', error)
    res.status(500).json({ error: 'Failed to load deletion log' })
  }
})

// ---------------------------------------------------------------------------
// CONSENT MANAGEMENT
// ---------------------------------------------------------------------------

// GET /consent/:pupilId - Get all consent records for a pupil
router.get('/consent/:pupilId', requireSchoolAdmin, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM gdpr_consent_records
       WHERE pupil_id = $1 AND school_id = $2
       ORDER BY consent_type, created_at DESC`,
      [req.params.pupilId, req.schoolId]
    )

    res.json(result.rows)
  } catch (error) {
    console.error('GDPR consent error:', error)
    res.status(500).json({ error: 'Failed to load consent records' })
  }
})

// POST /consent - Record a consent grant or withdrawal
router.post('/consent', requireSchoolAdmin, async (req, res) => {
  try {
    const { pupil_id, consent_type, granted, granted_by, notes } = req.body
    if (!pupil_id || !consent_type) {
      return res.status(400).json({ error: 'pupil_id and consent_type are required' })
    }

    const validTypes = ['data_processing', 'photo_video', 'medical', 'ai_analysis', 'voice_recording', 'third_party_sharing']
    if (!validTypes.includes(consent_type)) {
      return res.status(400).json({ error: `Invalid consent_type. Must be one of: ${validTypes.join(', ')}` })
    }

    // Upsert: if there's an existing record for this pupil + type, update it
    const existing = await pool.query(
      `SELECT id FROM gdpr_consent_records
       WHERE pupil_id = $1 AND school_id = $2 AND consent_type = $3
       ORDER BY created_at DESC LIMIT 1`,
      [pupil_id, req.schoolId, consent_type]
    )

    let result
    if (existing.rows.length > 0 && granted) {
      // Update existing record
      result = await pool.query(
        `UPDATE gdpr_consent_records
         SET granted = $1, granted_by = $2, granted_at = NOW(),
             withdrawn_at = NULL, notes = $3, updated_at = NOW()
         WHERE id = $4
         RETURNING *`,
        [granted, granted_by || req.user.name, notes, existing.rows[0].id]
      )
    } else if (existing.rows.length > 0 && !granted) {
      // Withdraw consent
      result = await pool.query(
        `UPDATE gdpr_consent_records
         SET granted = false, withdrawn_at = NOW(), notes = $1, updated_at = NOW()
         WHERE id = $2
         RETURNING *`,
        [notes, existing.rows[0].id]
      )
    } else {
      // Create new record
      result = await pool.query(
        `INSERT INTO gdpr_consent_records
         (school_id, pupil_id, consent_type, granted, granted_by, granted_at, notes)
         VALUES ($1, $2, $3, $4, $5, ${granted ? 'NOW()' : 'NULL'}, $6)
         RETURNING *`,
        [req.schoolId, pupil_id, consent_type, granted, granted_by || req.user.name, notes]
      )
    }

    // Audit log
    await pool.query(
      `INSERT INTO audit_log (school_id, user_id, action, entity_type, entity_id, details)
       VALUES ($1, $2, $3, 'pupil', $4, $5)`,
      [req.schoolId, req.user.id,
       granted ? 'gdpr_consent_granted' : 'gdpr_consent_withdrawn',
       pupil_id,
       JSON.stringify({ consent_type, granted_by: granted_by || req.user.name })]
    )

    res.json(result.rows[0])
  } catch (error) {
    console.error('GDPR consent update error:', error)
    res.status(500).json({ error: 'Failed to update consent record' })
  }
})

// POST /consent/batch - Record consent for multiple types at once
router.post('/consent/batch', requireSchoolAdmin, async (req, res) => {
  try {
    const { pupil_id, consents, granted_by } = req.body
    // consents is an array of { consent_type, granted }
    if (!pupil_id || !Array.isArray(consents)) {
      return res.status(400).json({ error: 'pupil_id and consents array are required' })
    }

    const results = []
    for (const { consent_type, granted } of consents) {
      const existing = await pool.query(
        `SELECT id FROM gdpr_consent_records
         WHERE pupil_id = $1 AND school_id = $2 AND consent_type = $3
         ORDER BY created_at DESC LIMIT 1`,
        [pupil_id, req.schoolId, consent_type]
      )

      let result
      if (existing.rows.length > 0) {
        result = await pool.query(
          `UPDATE gdpr_consent_records
           SET granted = $1, granted_by = $2,
               granted_at = ${granted ? 'NOW()' : 'granted_at'},
               withdrawn_at = ${granted ? 'NULL' : 'NOW()'},
               updated_at = NOW()
           WHERE id = $3
           RETURNING *`,
          [granted, granted_by || req.user.name, existing.rows[0].id]
        )
      } else {
        result = await pool.query(
          `INSERT INTO gdpr_consent_records
           (school_id, pupil_id, consent_type, granted, granted_by, granted_at)
           VALUES ($1, $2, $3, $4, $5, ${granted ? 'NOW()' : 'NULL'})
           RETURNING *`,
          [req.schoolId, pupil_id, consent_type, granted, granted_by || req.user.name]
        )
      }
      results.push(result.rows[0])
    }

    res.json(results)
  } catch (error) {
    console.error('GDPR batch consent error:', error)
    res.status(500).json({ error: 'Failed to update consent records' })
  }
})

// ---------------------------------------------------------------------------
// GET /pupils - List pupils with their consent status for GDPR overview
// ---------------------------------------------------------------------------
router.get('/pupils', requireSchoolAdmin, async (req, res) => {
  try {
    const { search, page = 1, limit = 50 } = req.query
    const offset = (page - 1) * limit

    let whereClause = `WHERE t.school_id = $1`
    const params = [req.schoolId]

    if (search) {
      params.push(`%${search}%`)
      whereClause += ` AND p.name ILIKE $${params.length}`
    }

    const pupils = await pool.query(
      `SELECT p.id, p.name, p.year_group, p.is_active, p.created_at,
              (SELECT json_agg(json_build_object(
                'consent_type', gc.consent_type,
                'granted', gc.granted,
                'withdrawn_at', gc.withdrawn_at
              ))
              FROM gdpr_consent_records gc
              WHERE gc.pupil_id = p.id AND gc.school_id = $1) as consent_status
       FROM pupils p
       JOIN teams t ON p.team_id = t.id
       ${whereClause}
       ORDER BY p.name ASC
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, limit, offset]
    )

    const total = await pool.query(
      `SELECT COUNT(*) as count FROM pupils p JOIN teams t ON p.team_id = t.id ${whereClause}`,
      params
    )

    res.json({
      pupils: pupils.rows,
      total: parseInt(total.rows[0]?.count || 0),
      page: parseInt(page),
      limit: parseInt(limit),
    })
  } catch (error) {
    console.error('GDPR pupils list error:', error)
    res.status(500).json({ error: 'Failed to load pupils' })
  }
})

export default router
