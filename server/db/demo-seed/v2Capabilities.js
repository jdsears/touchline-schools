import pool from '../../config/database.js'

export async function seedV2Capabilities(schoolId) {
  // 1. Venues
  const venues = [
    { name: 'Ashworth Park Academy - Main Pitches', address: 'Ashworth Park Road, Norwich', postcode: 'NR4 7TJ', isSchool: true },
    { name: 'Riverside Academy Playing Fields', address: 'River Lane, Norwich', postcode: 'NR1 1RN', isSchool: false },
    { name: 'St. Peter\'s School Sports Ground', address: 'Church Road, Wymondham', postcode: 'NR18 0PH', isSchool: false },
    { name: 'Northgate High School', address: 'Sidestrand Road, Dereham', postcode: 'NR19 1BG', isSchool: false },
    { name: 'Langley School', address: 'Langley Park, Loddon', postcode: 'NR14 6BJ', isSchool: false },
  ]
  for (const v of venues) {
    await pool.query(
      `INSERT INTO venues (school_id, name, address, postcode, is_school_venue, created_at)
       VALUES ($1,$2,$3,$4,$5,NOW()) ON CONFLICT DO NOTHING`,
      [schoolId, v.name, v.address, v.postcode, v.isSchool]
    )
  }

  // 2. Consent types (seed defaults)
  const consentTypes = [
    { name: 'Photo and video usage in school marketing', months: 12 },
    { name: 'Photo and video usage in match reports', months: 12 },
    { name: 'Match attendance (away fixtures)', months: 4, perTerm: true },
    { name: 'Travel by minibus', months: 12 },
    { name: 'Travel by parent lifts', months: 12 },
    { name: 'Off-site activities', months: 12 },
    { name: 'Medical treatment in emergency', months: 12 },
    { name: 'Tour participation (general)', months: 12 },
  ]
  const ctIds = []
  for (let i = 0; i < consentTypes.length; i++) {
    const ct = consentTypes[i]
    const res = await pool.query(
      `INSERT INTO consent_types (school_id, name, is_per_term, expiry_period_months, display_order)
       VALUES ($1,$2,$3,$4,$5) ON CONFLICT DO NOTHING RETURNING id`,
      [schoolId, ct.name, ct.perTerm || false, ct.months, i]
    )
    if (res.rows.length) ctIds.push(res.rows[0].id)
  }

  // 3. Consent records for demo pupils
  if (ctIds.length > 0) {
    const pupils = await pool.query(
      `SELECT p.id FROM pupils p JOIN school_members sm ON sm.user_id = p.user_id
       WHERE sm.school_id = $1 AND p.is_active = true LIMIT 30`,
      [schoolId]
    )
    for (const pupil of pupils.rows) {
      for (let i = 0; i < ctIds.length; i++) {
        const skipConsent = Math.random() < 0.05
        if (skipConsent) continue
        const expiresAt = new Date()
        const expiringSoon = Math.random() < 0.04
        expiresAt.setMonth(expiresAt.getMonth() + (expiringSoon ? 0 : consentTypes[i]?.months || 12))
        await pool.query(
          `INSERT INTO pupil_consents (pupil_id, consent_type_id, status, granted_at, expires_at, parent_signature_text, granted_by_parent_email)
           VALUES ($1,$2,'granted',NOW(),$3,'Parent/Guardian',$4) ON CONFLICT (pupil_id, consent_type_id) DO NOTHING`,
          [pupil.id, ctIds[i], expiresAt, 'parent@demo.ashworthpark.sch.uk']
        )
      }
    }
  }

  // 4. Published match reports for past fixtures
  const pastMatches = await pool.query(
    `SELECT m.id, m.opponent, m.score_for, m.score_against, m.home_away, t.name AS team_name
     FROM matches m JOIN teams t ON t.id = m.team_id
     WHERE t.school_id = $1 AND m.score_for IS NOT NULL
     ORDER BY COALESCE(m.date, m.match_date) DESC LIMIT 8`,
    [schoolId]
  )
  for (const m of pastMatches.rows) {
    const outcome = m.score_for > m.score_against ? 'victory' : m.score_for < m.score_against ? 'tough contest' : 'draw'
    const report = `${m.team_name} played ${m.home_away === 'home' ? 'at home against' : 'away to'} ${m.opponent} in a ${outcome}. ` +
      `The final score was ${m.score_for}-${m.score_against}. ` +
      `The team showed excellent effort throughout and demonstrated real progress in their tactical understanding. ` +
      `Several pupils made notable contributions, with strong performances across all areas of the pitch. ` +
      `The coaching staff were pleased with the commitment shown by every member of the squad. ` +
      `Training this week will focus on building on the positives from this performance ahead of the next fixture.`
    await pool.query(
      `UPDATE matches SET match_report_text = $1, match_report_status = 'published', updated_at = NOW() WHERE id = $2`,
      [report, m.id]
    )
  }

  // 5. Enable public fixtures for demo
  await pool.query(
    `UPDATE schools SET public_fixtures_enabled = true, public_name_format = 'first_initial' WHERE id = $1`,
    [schoolId]
  )
  await pool.query(`UPDATE teams SET is_public = true WHERE school_id = $1`, [schoolId])

  // 6. MIS integration in test mode
  await pool.query(
    `INSERT INTO mis_integrations (school_id, provider, api_endpoint, sync_frequency, is_test_mode)
     VALUES ($1, 'isams', 'https://ashworthpark.isams.cloud', 'nightly', true)
     ON CONFLICT (school_id) DO NOTHING`,
    [schoolId]
  )

  // 7. Historical concussion incident (resolved)
  const rugbyPupil = await pool.query(
    `SELECT p.id FROM pupils p JOIN school_members sm ON sm.user_id = p.user_id
     WHERE sm.school_id = $1 AND p.year_group = 11 AND p.is_active = true LIMIT 1`,
    [schoolId]
  )
  if (rugbyPupil.rows.length) {
    const staff = await pool.query(
      `SELECT user_id FROM school_members WHERE school_id = $1 AND COALESCE(school_role, role) IN ('head_of_pe', 'owner', 'teacher') LIMIT 1`,
      [schoolId]
    )
    const reporterId = staff.rows[0]?.user_id
    if (reporterId) {
      const incRes = await pool.query(
        `INSERT INTO concussion_incidents (pupil_id, school_id, reported_by_user_id, severity, symptoms_observed,
          immediate_action_taken, doctor_assessment_required, return_to_play_status, fully_cleared_at,
          occurred_at, parent_notified_at, created_at)
         VALUES ($1,$2,$3,'mild',$4,'Removed from play immediately. Ice applied. Parent called.',true,
           'fully_cleared', NOW() - INTERVAL '14 days', NOW() - INTERVAL '28 days', NOW() - INTERVAL '28 days', NOW() - INTERVAL '28 days')
         RETURNING id`,
        [rugbyPupil.rows[0].id, schoolId, reporterId, JSON.stringify(['Headache', 'Dizziness', 'Confusion'])]
      )
      if (incRes.rows.length) {
        for (let s = 1; s <= 6; s++) {
          const d = new Date(); d.setDate(d.getDate() - 28 + s * 3)
          await pool.query(
            `INSERT INTO concussion_followups (incident_id, stage, followup_date, completed_at, completed_by_user_id)
             VALUES ($1,$2,$3,$4,$5)`,
            [incRes.rows[0].id, s, d.toISOString().split('T')[0], d, reporterId]
          )
        }
      }
    }
  }
}
