/**
 * Seed safeguarding incidents for Greenfield Academy demo tenant.
 *
 * All incidents are deliberately benign / workflow-demonstration entries.
 * No real pupils are referenced — all names are from the fictional seed set.
 * The purpose is to show prospects how the safeguarding module works, not
 * to model real child protection scenarios.
 */

import pool from '../../config/database.js'

function pastDate(daysAgo) {
  const d = new Date()
  d.setDate(d.getDate() - daysAgo)
  return d.toISOString().split('T')[0]
}

export async function seedSafeguarding(schoolId, staff) {
  const { hodPe, directorOfSport, teacher1, teacher2 } = staff

  const incidents = [
    {
      reportedBy: teacher1.id,
      incidentDate: pastDate(45),
      incidentType: 'welfare_concern',
      category: 'pastoral',
      severity: 'low',
      description: 'Pupil appeared withdrawn during training and mentioned difficulties at home. No immediate risk identified. Teacher documented the conversation and advised pupil to speak with form tutor. Pastoral team informed.',
      location: 'Sports Hall',
      status: 'closed',
      immediateAction: 'Spoke with pupil privately. Signposted to form tutor and school counsellor.',
      resolutionNotes: 'Pupil met with counsellor twice. Situation resolved. No further concerns raised.',
      closedBy: hodPe.id,
    },
    {
      reportedBy: teacher2.id,
      incidentDate: pastDate(30),
      incidentType: 'injury',
      category: 'physical',
      severity: 'low',
      description: 'Pupil sustained a minor ankle sprain during netball training. First aid administered on site. Parents contacted and pupil collected. Return-to-play protocol initiated.',
      location: 'Netball Court',
      status: 'closed',
      immediateAction: 'First aid applied. Ice pack and elevation. Parents called and arrived within 20 minutes.',
      resolutionNotes: 'Pupil returned to full training after 10 days with GP clearance.',
      closedBy: directorOfSport.id,
    },
    {
      reportedBy: hodPe.id,
      incidentDate: pastDate(14),
      incidentType: 'bullying',
      category: 'peer_relationship',
      severity: 'medium',
      description: 'Report from pupil that they had been excluded from the warm-up group by peers during training sessions on two consecutive weeks. Allegation of verbal comments about their ability. Witnessed by assistant teacher on second occasion.',
      location: 'Football Pitch',
      status: 'under_review',
      immediateAction: 'Incident logged. All parties spoken to separately. No further exclusionary behaviour observed since initial log.',
      resolutionNotes: null,
      closedBy: null,
    },
    {
      reportedBy: teacher1.id,
      incidentDate: pastDate(7),
      incidentType: 'welfare_concern',
      category: 'pastoral',
      severity: 'low',
      description: 'Pupil disclosed during a 1:1 development conversation that they were feeling overwhelmed with exam pressure. Not PE-related but teacher used the opportunity to make a supportive referral.',
      location: 'PE Office',
      status: 'open',
      immediateAction: 'Referral to SENCO made. Parent informed via pastoral lead.',
      resolutionNotes: null,
      closedBy: null,
    },
  ]

  for (const inc of incidents) {
    const closedAt = inc.status === 'closed' ? `NOW() - INTERVAL '${Math.floor(Math.random() * 10 + 2)} days'` : 'NULL'

    await pool.query(`
      INSERT INTO safeguarding_incidents (
        school_id, reported_by, reported_at, incident_date,
        incident_type, category, severity, description,
        location, status, immediate_action_taken, resolution_notes,
        closed_by, closed_at, created_at, updated_at
      )
      VALUES (
        $1, $2, $3::date::timestamptz, $3::date,
        $4, $5, $6, $7,
        $8, $9, $10, $11,
        $12, ${inc.closedBy ? `NOW() - INTERVAL '5 days'` : 'NULL'}, NOW() - INTERVAL '2 days', NOW()
      )
    `, [
      schoolId,
      inc.reportedBy,
      inc.incidentDate,
      inc.incidentType,
      inc.category,
      inc.severity,
      inc.description,
      inc.location,
      inc.status,
      inc.immediateAction,
      inc.resolutionNotes,
      inc.closedBy,
    ])
  }
}
