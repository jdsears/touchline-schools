/**
 * Seed audit log entries for Ashworth Park Academy demo tenant.
 * Demonstrates the audit trail feature to prospects.
 */

import pool from '../../config/database.js'

function pastTs(daysAgo, hoursAgo = 0) {
  const d = new Date()
  d.setDate(d.getDate() - daysAgo)
  d.setHours(d.getHours() - hoursAgo)
  return d.toISOString()
}

export async function seedAuditLog(schoolId, staff) {
  const { hodPe, directorOfSport, teacher1, teacher2 } = staff

  const entries = [
    {
      userId: hodPe.id,
      action: 'school.settings.updated',
      entityType: 'school',
      details: { changed: ['voice_observations_enabled'], oldValue: false, newValue: true },
      ts: pastTs(60),
    },
    {
      userId: hodPe.id,
      action: 'team.created',
      entityType: 'team',
      details: { teamName: 'Year 7 Boys Football', sport: 'football' },
      ts: pastTs(58),
    },
    {
      userId: directorOfSport.id,
      action: 'team.created',
      entityType: 'team',
      details: { teamName: 'Year 9 Girls Netball', sport: 'netball' },
      ts: pastTs(57),
    },
    {
      userId: teacher1.id,
      action: 'match.result.recorded',
      entityType: 'match',
      details: { opponent: 'Riverside Academy', scoreFor: 3, scoreAgainst: 1 },
      ts: pastTs(60),
    },
    {
      userId: hodPe.id,
      action: 'safeguarding.incident.created',
      entityType: 'safeguarding_incident',
      details: { severity: 'low', incidentType: 'welfare_concern' },
      ts: pastTs(45),
    },
    {
      userId: hodPe.id,
      action: 'safeguarding.incident.closed',
      entityType: 'safeguarding_incident',
      details: { resolution: 'Pupil supported via counselling pathway. Resolved.' },
      ts: pastTs(40),
    },
    {
      userId: teacher1.id,
      action: 'voice.observation.processed',
      entityType: 'audio_source',
      details: { pupilsExtracted: 3, durationSeconds: 142 },
      ts: pastTs(14),
    },
    {
      userId: directorOfSport.id,
      action: 'reporting.window.opened',
      entityType: 'reporting_window',
      details: { name: 'Spring Report 2026', yearGroups: [7, 9, 11] },
      ts: pastTs(10),
    },
    {
      userId: teacher2.id,
      action: 'pupil.assessment.submitted',
      entityType: 'pupil_assessment',
      details: { unit: 'GCSE Practical: Football', count: 14 },
      ts: pastTs(8),
    },
    {
      userId: hodPe.id,
      action: 'staff.member.invited',
      entityType: 'user',
      details: { invitedEmail: 't.ellis.demo@ashworthpark.norfolk.sch.uk', role: 'teacher' },
      ts: pastTs(55),
    },
    {
      userId: hodPe.id,
      action: 'curriculum.unit.created',
      entityType: 'sport_unit',
      details: { sport: 'football', unitName: 'Invasion Games: Football', term: 'autumn' },
      ts: pastTs(56),
    },
    {
      userId: teacher1.id,
      action: 'training.session.created',
      entityType: 'training_session',
      details: { focus: 'Possession and pressing triggers' },
      ts: pastTs(5),
    },
  ]

  for (const entry of entries) {
    await pool.query(`
      INSERT INTO audit_log (school_id, user_id, action, entity_type, details, created_at)
      VALUES ($1, $2, $3, $4, $5, $6)
    `, [schoolId, entry.userId, entry.action, entry.entityType, JSON.stringify(entry.details), entry.ts])
  }
}
