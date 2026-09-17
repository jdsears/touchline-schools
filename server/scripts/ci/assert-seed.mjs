// CI seed assertions: after `node db/demo-seed/index.js` runs against a
// migrated database, every surface the demo shows must actually contain data.
// A silent zero here is exactly how "seeded but page is empty" bugs shipped.
//
// Usage: DATABASE_URL=... node scripts/ci/assert-seed.mjs
import pool from '../../config/database.js'

const results = []

async function expect(label, sql, min) {
  try {
    const r = await pool.query(sql)
    const n = parseInt(r.rows[0].n, 10)
    results.push({ label, value: n, min, ok: n >= min })
  } catch (e) {
    results.push({ label, value: `ERROR: ${e.message}`, min, ok: false })
  }
}

async function expectExactly(label, sql, want) {
  try {
    const r = await pool.query(sql)
    const n = parseInt(r.rows[0].n, 10)
    results.push({ label, value: n, min: `= ${want}`, ok: n === want })
  } catch (e) {
    results.push({ label, value: `ERROR: ${e.message}`, min: `= ${want}`, ok: false })
  }
}

// Core roster
await expectExactly('demo school (by slug)', `SELECT COUNT(*) n FROM schools WHERE slug = 'ashworth-park-demo'`, 1)
await expect('teams', `SELECT COUNT(*) n FROM teams t JOIN schools s ON s.id = t.school_id WHERE s.slug = 'ashworth-park-demo'`, 10)
await expect('pupils', `SELECT COUNT(*) n FROM pupils WHERE is_active = true`, 50)
await expect('demo staff users', `SELECT COUNT(*) n FROM users WHERE is_demo_user = true`, 5)
await expectExactly('demo login account', `SELECT COUNT(*) n FROM users WHERE LOWER(email) = 'j.okonkwo.demo@ashworthpark.norfolk.sch.uk'`, 1)

// Activity data - each of these has shipped as a silent zero at least once
await expect('observations', `SELECT COUNT(*) n FROM observations`, 50)
await expect('pupil_assessments', `SELECT COUNT(*) n FROM pupil_assessments`, 100)
await expect('pupil_reports', `SELECT COUNT(*) n FROM pupil_reports`, 40)
await expect('pupil_idp_goals', `SELECT COUNT(*) n FROM pupil_idp_goals`, 20)
await expect('pupil_achievements', `SELECT COUNT(*) n FROM pupil_achievements`, 10)
await expect('matches', `SELECT COUNT(*) n FROM matches`, 20)
await expect('training_sessions', `SELECT COUNT(*) n FROM training_sessions`, 1)
await expect('teaching_groups', `SELECT COUNT(*) n FROM teaching_groups`, 6)
await expect('sport_units', `SELECT COUNT(*) n FROM sport_units`, 8)
await expect('lesson_plans', `SELECT COUNT(*) n FROM lesson_plans`, 10)
await expect('system curriculum strands', `SELECT COUNT(*) n FROM curriculum_strands WHERE is_system_default = true`, 4)

// Phase 21 / v2.0 surfaces - stranded for months by the migration abort
await expect('pupil_medical_notes', `SELECT COUNT(*) n FROM pupil_medical_notes`, 1)
await expect('pupil_send_notes', `SELECT COUNT(*) n FROM pupil_send_notes`, 1)
await expect('pupil_safeguarding_notes', `SELECT COUNT(*) n FROM pupil_safeguarding_notes`, 1)
await expect('venues', `SELECT COUNT(*) n FROM venues`, 1)
await expect('pupil_consents', `SELECT COUNT(*) n FROM pupil_consents`, 1)

// Demo richness: voice notes, Coach chat, notifications for the login persona
await expect('voice recordings (audio_sources)', `SELECT COUNT(*) n FROM audio_sources`, 2)
await expect('voice observations pending review', `SELECT COUNT(*) n FROM observations WHERE source = 'voice' AND review_state = 'pending_review'`, 1)
await expect('department Coach messages', `SELECT COUNT(*) n FROM messages WHERE team_id IS NULL`, 2)
await expect('notifications for demo HoD', `
  SELECT COUNT(*) n FROM notifications no
  JOIN users u ON u.id = no.user_id
  WHERE LOWER(u.email) = 'j.okonkwo.demo@ashworthpark.norfolk.sch.uk'`, 3)
// Regression: the bell must not open on an alarming pile of action items
await (async () => {
  try {
    const r = await pool.query(`SELECT COUNT(*) n FROM pupil_consents WHERE status = 'granted' AND expires_at < NOW() + INTERVAL '30 days'`)
    const n = parseInt(r.rows[0].n, 10)
    results.push({ label: 'consents expiring within 30 days', value: n, min: '<= 3', ok: n <= 3 })
  } catch (e) {
    results.push({ label: 'consents expiring within 30 days', value: `ERROR: ${e.message}`, min: '<= 3', ok: false })
  }
})()

// Regression: orphaned teaching groups (the duplicate "11 GCSE PE" bug)
await expectExactly('orphan teaching_groups', `SELECT COUNT(*) n FROM teaching_groups tg WHERE tg.school_id NOT IN (SELECT id FROM schools)`, 0)
// Regression: protected persona accumulating duplicate class enrolments
await expectExactly("Toby Marsh '11 GCSE PE' enrolments", `
  SELECT COUNT(*) n FROM teaching_group_pupils tgp
  JOIN teaching_groups tg ON tg.id = tgp.teaching_group_id
  JOIN pupils p ON p.id = tgp.pupil_id
  WHERE p.name = 'Toby Marsh' AND tg.name = '11 GCSE PE'`, 1)

const pad = (s, w) => String(s).padEnd(w)
let failed = 0
for (const r of results) {
  if (!r.ok) failed++
  console.log(`${r.ok ? 'PASS' : 'FAIL'}  ${pad(r.label, 42)} ${pad(r.value, 12)} (want >= ${r.min})`)
}
await pool.end()
if (failed > 0) {
  console.error(`\n${failed} seed assertion(s) failed`)
  process.exit(1)
}
console.log(`\nAll ${results.length} seed assertions passed`)
