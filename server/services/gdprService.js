/**
 * GDPR Data Export & Deletion Service
 *
 * Handles:
 * 1. Full data export for a pupil (SAR – Subject Access Request)
 * 2. Complete data deletion (Right to Erasure / Right to be Forgotten)
 * 3. Consent record management
 *
 * All operations are audit-logged and scoped to a single school.
 */

import pool from '../config/database.js'
import { deleteFile } from './storageService.js'

// ---------------------------------------------------------------------------
// DATA EXPORT – collects every piece of data held on a pupil
// ---------------------------------------------------------------------------

export async function collectPupilData(pupilId, schoolId) {
  const data = {}

  // 1. Core pupil record
  const pupil = await pool.query(
    `SELECT id, name, position, positions, jersey_number, date_of_birth, notes,
            photo_url, is_active, parent_contact, parent_email, parent_name,
            emergency_contact_name, emergency_contact_phone, emergency_contact_relationship,
            id_document_url, id_document_type, year_group, house, nicknames,
            created_at
     FROM pupils WHERE id = $1 AND team_id IN (SELECT id FROM teams WHERE school_id = $2)`,
    [pupilId, schoolId]
  )
  data.personal_information = pupil.rows[0] || null

  // 2. Linked user account (if pupil has a login)
  const user = await pool.query(
    `SELECT id, name, email, role, created_at FROM users WHERE pupil_id = $1`,
    [pupilId]
  )
  data.user_account = user.rows[0] || null

  // 3. Guardian / parent records
  const guardians = await pool.query(
    `SELECT g.first_name, g.last_name, g.email, g.phone, g.relationship,
            g.address_line1, g.address_line2, g.city, g.county, g.postcode,
            g.photo_consent, g.data_consent, g.medical_consent
     FROM guardians g
     JOIN player_guardians pg ON pg.guardian_id = g.id
     WHERE pg.pupil_id = $1`,
    [pupilId]
  )
  data.guardians = guardians.rows

  // 4. Medical information (from JSONB fields)
  const medical = await pool.query(
    `SELECT medical_info, allergies, medications, doctor_name, doctor_phone
     FROM pupils WHERE id = $1`,
    [pupilId]
  )
  data.medical_information = medical.rows[0] || null

  // 5. Team memberships
  const teams = await pool.query(
    `SELECT t.name as team_name, t.sport, tm.role, tm.created_at as joined_at
     FROM team_memberships tm
     JOIN teams t ON tm.team_id = t.id
     WHERE tm.pupil_id = $1`,
    [pupilId]
  )
  data.team_memberships = teams.rows

  // 6. Teaching group enrolments
  const classes = await pool.query(
    `SELECT tg.name as class_name, tg.year_group, su.name as sport_unit_name
     FROM teaching_group_pupils tgp
     JOIN teaching_groups tg ON tgp.teaching_group_id = tg.id
     LEFT JOIN sport_units su ON tgp.teaching_group_id = su.teaching_group_id
     WHERE tgp.pupil_id = $1`,
    [pupilId]
  )
  data.class_enrolments = classes.rows

  // 7. Assessment records
  const assessments = await pool.query(
    `SELECT pa.grade, pa.score, pa.teacher_notes, pa.assessment_type,
            pa.assessed_at, cs.name as strand_name, cs.key_stage
     FROM pupil_assessments pa
     LEFT JOIN curriculum_strands cs ON pa.strand_id = cs.id
     WHERE pa.pupil_id = $1
     ORDER BY pa.assessed_at DESC`,
    [pupilId]
  )
  data.assessments = assessments.rows

  // 8. Reports
  const reports = await pool.query(
    `SELECT pr.attainment_grade, pr.effort_grade, pr.comment, pr.status,
            pr.submitted_at, rw.name as reporting_window
     FROM pupil_reports pr
     LEFT JOIN reporting_windows rw ON pr.reporting_window_id = rw.id
     WHERE pr.pupil_id = $1
     ORDER BY pr.submitted_at DESC`,
    [pupilId]
  )
  data.reports = reports.rows

  // 9. Observations (teacher observations about the pupil)
  const observations = await pool.query(
    `SELECT o.content, o.type, o.source, o.confidence, o.review_state,
            o.created_at, u.name as observer_name
     FROM observations o
     LEFT JOIN users u ON o.user_id = u.id
     WHERE o.pupil_id = $1
     ORDER BY o.created_at DESC`,
    [pupilId]
  )
  data.observations = observations.rows

  // 10. Match participation
  const matchParticipation = await pool.query(
    `SELECT m.opponent, m.date, m.venue, m.home_score, m.away_score,
            ms.is_starting, ms.position, ms.minutes_played
     FROM match_squads ms
     JOIN matches m ON ms.match_id = m.id
     WHERE ms.pupil_id = $1
     ORDER BY m.date DESC`,
    [pupilId]
  )
  data.match_participation = matchParticipation.rows

  // 11. Match goals/events
  const goals = await pool.query(
    `SELECT mg.minute, mg.goal_type, m.opponent, m.date
     FROM match_goals mg
     JOIN matches m ON mg.match_id = m.id
     WHERE mg.pupil_id = $1
     ORDER BY m.date DESC`,
    [pupilId]
  )
  data.match_goals = goals.rows

  // 12. Training attendance
  const trainingAttendance = await pool.query(
    `SELECT ts.date, ts.title, ta.status, ta.notes
     FROM training_attendance ta
     JOIN training_sessions ts ON ta.session_id = ts.id
     WHERE ta.pupil_id = $1
     ORDER BY ts.date DESC`,
    [pupilId]
  )
  data.training_attendance = trainingAttendance.rows

  // 13. Achievements
  const achievements = await pool.query(
    `SELECT title, description, badge_type, awarded_at, awarded_by
     FROM player_achievements
     WHERE pupil_id = $1
     ORDER BY awarded_at DESC`,
    [pupilId]
  )
  data.achievements = achievements.rows

  // 14. Video clips tagged to this pupil
  const clips = await pool.query(
    `SELECT mc.title, mc.description, mc.timestamp_start, mc.timestamp_end,
            mc.created_at, m.opponent, m.date as match_date
     FROM clip_player_tags cpt
     JOIN match_clips mc ON cpt.clip_id = mc.id
     LEFT JOIN matches m ON mc.match_id = m.id
     WHERE cpt.pupil_id = $1
     ORDER BY mc.created_at DESC`,
    [pupilId]
  )
  data.video_clips = clips.rows

  // 15. AI chat messages (pupil portal messages)
  const messages = await pool.query(
    `SELECT role, content, created_at
     FROM player_messages
     WHERE pupil_id = $1
     ORDER BY created_at DESC`,
    [pupilId]
  )
  data.ai_chat_messages = messages.rows

  // 16. Event registrations
  const events = await pool.query(
    `SELECT ce.name as event_name, ce.event_date, er.status, er.payment_status,
            er.attended, er.photo_consent
     FROM event_registrations er
     JOIN club_events ce ON er.event_id = ce.id
     WHERE er.pupil_id = $1
     ORDER BY ce.event_date DESC`,
    [pupilId]
  )
  data.event_registrations = events.rows

  // 17. Subscription/payment records
  const subscriptions = await pool.query(
    `SELECT ps.status, ps.start_date, ps.end_date, pp.name as plan_name, pp.amount
     FROM player_subscriptions ps
     LEFT JOIN payment_plans pp ON ps.payment_plan_id = pp.id
     WHERE ps.pupil_id = $1`,
    [pupilId]
  )
  data.subscriptions = subscriptions.rows

  // 18. Consent records
  const consent = await pool.query(
    `SELECT consent_type, granted, granted_by, granted_at, withdrawn_at, notes
     FROM gdpr_consent_records
     WHERE pupil_id = $1
     ORDER BY created_at DESC`,
    [pupilId]
  )
  data.consent_records = consent.rows

  // 19. Attribute snapshots (skill progression)
  const attributes = await pool.query(
    `SELECT category, attribute_name, value, snapshot_date
     FROM attribute_snapshots
     WHERE pupil_id = $1
     ORDER BY snapshot_date DESC`,
    [pupilId]
  )
  data.skill_progression = attributes.rows

  // 20. Safeguarding incidents (only if the pupil is the subject)
  const incidents = await pool.query(
    `SELECT si.incident_type, si.severity, si.description, si.status,
            si.reported_at, si.resolved_at
     FROM safeguarding_incidents si
     WHERE si.pupil_id = $1
     ORDER BY si.reported_at DESC`,
    [pupilId]
  )
  data.safeguarding_incidents = incidents.rows

  // 21. Match availability
  const availability = await pool.query(
    `SELECT m.opponent, m.date, ma.status, ma.reason
     FROM match_availability ma
     JOIN matches m ON ma.match_id = m.id
     WHERE ma.pupil_id = $1
     ORDER BY m.date DESC`,
    [pupilId]
  )
  data.match_availability = availability.rows

  // 22. Sport enrolments
  const sports = await pool.query(
    `SELECT sport, position, is_active, created_at
     FROM pupil_sports
     WHERE pupil_id = $1`,
    [pupilId]
  )
  data.sport_enrolments = sports.rows

  // 23. Video watch history
  const watches = await pool.query(
    `SELECT lv.title, lvw.watched_at, lvw.progress_seconds
     FROM library_video_watches lvw
     JOIN library_videos lv ON lvw.video_id = lv.id
     WHERE lvw.user_id = (SELECT user_id FROM users WHERE pupil_id = $1 LIMIT 1)`,
    [pupilId]
  )
  data.video_watch_history = watches.rows

  // Metadata
  data._export_metadata = {
    exported_at: new Date().toISOString(),
    school_id: schoolId,
    pupil_id: pupilId,
    data_categories: Object.keys(data).filter(k => !k.startsWith('_')),
    format_version: '1.0',
    note: 'This export contains all personal data held by Touchline for Schools for the named pupil. Data is provided in compliance with UK GDPR Article 15 (Right of Access).',
  }

  return data
}

// ---------------------------------------------------------------------------
// DATA DELETION – removes all pupil data across the database and file storage
// ---------------------------------------------------------------------------

export async function deletePupilData(pupilId, schoolId, deletedByUserId, reason) {
  const client = await pool.connect()
  const tablesPurged = []
  const filesDeleted = []

  try {
    await client.query('BEGIN')

    // Get pupil record before deletion for the permanent log
    const pupilRecord = await client.query(
      `SELECT name, date_of_birth, year_group FROM pupils WHERE id = $1`,
      [pupilId]
    )
    const pupilRef = pupilRecord.rows[0]
      ? `${pupilRecord.rows[0].name} (YG${pupilRecord.rows[0].year_group || '?'}, DOB ${pupilRecord.rows[0].date_of_birth || 'unknown'})`
      : `Pupil ${pupilId}`

    // Collect file URLs before deleting records
    const filesToDelete = []

    // Pupil photo
    const photoResult = await client.query(
      `SELECT photo_url, id_document_url FROM pupils WHERE id = $1`,
      [pupilId]
    )
    if (photoResult.rows[0]?.photo_url) filesToDelete.push(photoResult.rows[0].photo_url)
    if (photoResult.rows[0]?.id_document_url) filesToDelete.push(photoResult.rows[0].id_document_url)

    // Audio files from voice observations
    const audioResult = await client.query(
      `SELECT DISTINCT a.storage_url FROM audio_sources a
       JOIN observations o ON o.audio_source_id = a.id
       WHERE o.pupil_id = $1 AND a.storage_url IS NOT NULL`,
      [pupilId]
    )
    audioResult.rows.forEach(r => filesToDelete.push(r.storage_url))

    // Match media
    const mediaResult = await client.query(
      `SELECT file_url FROM match_media WHERE pupil_id = $1 AND file_url IS NOT NULL`,
      [pupilId]
    )
    mediaResult.rows.forEach(r => filesToDelete.push(r.file_url))

    // --- Delete from all related tables (order matters for FK constraints) ---

    // Assessment data
    const a1 = await client.query(`DELETE FROM pupil_assessments WHERE pupil_id = $1`, [pupilId])
    if (a1.rowCount > 0) tablesPurged.push(`pupil_assessments (${a1.rowCount})`)

    // Reports
    const a2 = await client.query(`DELETE FROM pupil_reports WHERE pupil_id = $1`, [pupilId])
    if (a2.rowCount > 0) tablesPurged.push(`pupil_reports (${a2.rowCount})`)

    // Teaching group memberships
    const a3 = await client.query(`DELETE FROM teaching_group_pupils WHERE pupil_id = $1`, [pupilId])
    if (a3.rowCount > 0) tablesPurged.push(`teaching_group_pupils (${a3.rowCount})`)

    // Observations
    const a4 = await client.query(`DELETE FROM observations WHERE pupil_id = $1`, [pupilId])
    if (a4.rowCount > 0) tablesPurged.push(`observations (${a4.rowCount})`)

    // Match squads
    const a5 = await client.query(`DELETE FROM match_squads WHERE pupil_id = $1`, [pupilId])
    if (a5.rowCount > 0) tablesPurged.push(`match_squads (${a5.rowCount})`)

    // Match goals
    const a6 = await client.query(`DELETE FROM match_goals WHERE pupil_id = $1`, [pupilId])
    if (a6.rowCount > 0) tablesPurged.push(`match_goals (${a6.rowCount})`)

    // Match substitutions
    const a7 = await client.query(`DELETE FROM match_substitutions WHERE pupil_id = $1`, [pupilId])
    if (a7.rowCount > 0) tablesPurged.push(`match_substitutions (${a7.rowCount})`)

    // Match availability
    const a8 = await client.query(`DELETE FROM match_availability WHERE pupil_id = $1`, [pupilId])
    if (a8.rowCount > 0) tablesPurged.push(`match_availability (${a8.rowCount})`)

    // Training attendance
    const a9 = await client.query(`DELETE FROM training_attendance WHERE pupil_id = $1`, [pupilId])
    if (a9.rowCount > 0) tablesPurged.push(`training_attendance (${a9.rowCount})`)

    // Achievements
    const a10 = await client.query(`DELETE FROM player_achievements WHERE pupil_id = $1`, [pupilId])
    if (a10.rowCount > 0) tablesPurged.push(`player_achievements (${a10.rowCount})`)

    // Clip tags
    const a11 = await client.query(`DELETE FROM clip_player_tags WHERE pupil_id = $1`, [pupilId])
    if (a11.rowCount > 0) tablesPurged.push(`clip_player_tags (${a11.rowCount})`)

    // AI chat messages
    const a12 = await client.query(`DELETE FROM player_messages WHERE pupil_id = $1`, [pupilId])
    if (a12.rowCount > 0) tablesPurged.push(`player_messages (${a12.rowCount})`)

    // Event registrations
    const a13 = await client.query(`DELETE FROM event_registrations WHERE pupil_id = $1`, [pupilId])
    if (a13.rowCount > 0) tablesPurged.push(`event_registrations (${a13.rowCount})`)

    // Subscriptions
    const a14 = await client.query(`DELETE FROM player_subscriptions WHERE pupil_id = $1`, [pupilId])
    if (a14.rowCount > 0) tablesPurged.push(`player_subscriptions (${a14.rowCount})`)

    // Consent records
    const a15 = await client.query(`DELETE FROM gdpr_consent_records WHERE pupil_id = $1`, [pupilId])
    if (a15.rowCount > 0) tablesPurged.push(`gdpr_consent_records (${a15.rowCount})`)

    // Attribute snapshots
    const a16 = await client.query(`DELETE FROM attribute_snapshots WHERE pupil_id = $1`, [pupilId])
    if (a16.rowCount > 0) tablesPurged.push(`attribute_snapshots (${a16.rowCount})`)

    // Sport enrolments
    const a17 = await client.query(`DELETE FROM pupil_sports WHERE pupil_id = $1`, [pupilId])
    if (a17.rowCount > 0) tablesPurged.push(`pupil_sports (${a17.rowCount})`)

    // Match media
    const a18 = await client.query(`DELETE FROM match_media WHERE pupil_id = $1`, [pupilId])
    if (a18.rowCount > 0) tablesPurged.push(`match_media (${a18.rowCount})`)

    // Guardian links (not the guardian record itself — may be shared with siblings)
    const a19 = await client.query(`DELETE FROM player_guardians WHERE pupil_id = $1`, [pupilId])
    if (a19.rowCount > 0) tablesPurged.push(`player_guardians (${a19.rowCount})`)

    // POTM votes
    const a20 = await client.query(`DELETE FROM parent_potm_votes WHERE pupil_id = $1`, [pupilId])
    if (a20.rowCount > 0) tablesPurged.push(`parent_potm_votes (${a20.rowCount})`)

    // Safeguarding incidents (pupil as subject)
    const a21 = await client.query(`DELETE FROM safeguarding_incidents WHERE pupil_id = $1`, [pupilId])
    if (a21.rowCount > 0) tablesPurged.push(`safeguarding_incidents (${a21.rowCount})`)

    // Team memberships
    const a22 = await client.query(`DELETE FROM team_memberships WHERE pupil_id = $1`, [pupilId])
    if (a22.rowCount > 0) tablesPurged.push(`team_memberships (${a22.rowCount})`)

    // Unlink user account (don't delete the user row — they may have staff roles too)
    await client.query(`UPDATE users SET pupil_id = NULL WHERE pupil_id = $1`, [pupilId])

    // Finally, delete the pupil record itself
    await client.query(`DELETE FROM pupils WHERE id = $1`, [pupilId])
    tablesPurged.push('pupils (1)')

    // Write permanent deletion log (this is NOT deleted — it's the audit record)
    await client.query(
      `INSERT INTO data_deletion_log (school_id, pupil_reference, deleted_by, reason, tables_purged, files_deleted, summary)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        schoolId,
        pupilRef,
        deletedByUserId,
        reason,
        tablesPurged,
        filesDeleted,
        JSON.stringify({
          tables_purged_count: tablesPurged.length,
          files_deleted_count: filesToDelete.length,
          deleted_at: new Date().toISOString(),
        }),
      ]
    )

    // Audit log entry
    await client.query(
      `INSERT INTO audit_log (school_id, user_id, action, entity_type, entity_id, details)
       VALUES ($1, $2, 'gdpr_pupil_deleted', 'pupil', $3, $4)`,
      [schoolId, deletedByUserId, pupilId,
       JSON.stringify({ reason, tables_purged: tablesPurged.length, files: filesToDelete.length })]
    )

    await client.query('COMMIT')

    // Delete files from storage AFTER commit (best-effort, non-transactional)
    for (const fileUrl of filesToDelete) {
      try {
        await deleteFile(fileUrl)
        filesDeleted.push(fileUrl)
      } catch (err) {
        console.error(`[GDPR] Failed to delete file ${fileUrl}:`, err.message)
        // Log but don't fail — the DB data is already gone
      }
    }

    return {
      success: true,
      pupil_reference: pupilRef,
      tables_purged: tablesPurged,
      files_deleted: filesDeleted,
    }
  } catch (error) {
    await client.query('ROLLBACK')
    console.error('[GDPR] Deletion failed:', error)
    throw error
  } finally {
    client.release()
  }
}
