/**
 * Demo richness: the surfaces a prospect opens that data-seeding previously
 * left empty — voice notes (the product's flagship field workflow), a
 * department-scope Coach conversation, and a believable notification tray.
 *
 * Everything is keyed to the demo login persona (the Head of PE) because
 * that is the account every prospect lands in.
 */

import pool from '../../config/database.js'
import { weekStartOf, isoDate, computeWeekStats, upsertWeekStats } from '../../services/weeklyStats.js'

// ── Voice notes ─────────────────────────────────────────────────────
// Two touchline recordings for the demo HoD: one fresh from this morning's
// session with observations awaiting review (lights the red badge on the mic
// button and demonstrates the review flow without recording anything), and
// one from yesterday's match already confirmed end-to-end. Audio bytes are
// never stored for these (storage_url NULL) — the review UI is
// transcript-first, and real recordings age out of audio retention anyway.
export async function seedVoiceNotes(schoolId, staff) {
  const hodPe = staff.hodPe
  if (!hodPe?.id) return 0

  const pupilsRes = await pool.query(
    `SELECT p.id, p.name, split_part(p.name, ' ', 1) AS first_name
     FROM pupils p
     JOIN teams t ON t.id = p.team_id
     WHERE t.owner_id = $1 AND t.sport = 'football' AND p.is_active = true
     ORDER BY p.name LIMIT 4`,
    [hodPe.id]
  )
  const pupils = pupilsRes.rows
  if (pupils.length < 4) return 0
  const [p1, p2, p3, p4] = pupils

  let count = 0

  // Recording 1: this morning's training session, awaiting review
  const sessionTranscript =
    `Right, quick notes from this morning's session before I lose them. ` +
    `${p1.first_name} — first touch under pressure is really coming on, ` +
    `receiving on the half-turn without being told now, want to get that ` +
    `into his next report. ${p2.first_name} was organising the back line ` +
    `during the small-sided game, talking constantly, really good to see — ` +
    `possible captain material for the B fixture. Need to remember cones ` +
    `for Thursday and chase the minibus booking.`

  const src1 = await pool.query(
    `INSERT INTO audio_sources (teacher_id, school_id, context_type, duration_seconds,
       storage_url, transcript, transcript_generated_at, extraction_completed_at, created_at)
     VALUES ($1, $2, 'session', 52, NULL, $3, NOW() - INTERVAL '2 hours',
       NOW() - INTERVAL '2 hours', NOW() - INTERVAL '2 hours')
     RETURNING id`,
    [hodPe.id, schoolId, sessionTranscript]
  )
  const src1Id = src1.rows[0].id

  const pending = [
    {
      pupil: p1,
      type: 'technical',
      content: `First touch under pressure improving markedly — now receiving on the half-turn unprompted.`,
      fragment: `${p1.first_name} — first touch under pressure is really coming on, receiving on the half-turn without being told now`,
      confidence: 0.93,
    },
    {
      pupil: p2,
      type: 'leadership',
      content: `Organised the defensive line throughout the small-sided game with constant communication. Candidate for captaincy in the next B fixture.`,
      fragment: `${p2.first_name} was organising the back line during the small-sided game, talking constantly`,
      confidence: 0.88,
    },
  ]
  for (const o of pending) {
    await pool.query(
      `INSERT INTO observations (pupil_id, observer_id, type, content, context_type,
         source, review_state, audio_source_id, transcript_fragment, confidence, sport, created_at)
       VALUES ($1, $2, $3, $4, 'training', 'voice', 'pending_review', $5, $6, $7, 'football',
         NOW() - INTERVAL '2 hours')`,
      [o.pupil.id, hodPe.id, o.type, o.content, src1Id, o.fragment, o.confidence]
    )
    count++
  }

  // Recording 2: half-time at yesterday's fixture, already reviewed & confirmed
  const matchTranscript =
    `Half-time, we're two nil up. ${p3.first_name} has won every header ` +
    `against their big number nine, absolutely dominant in the air. ` +
    `${p4.first_name} keeps drifting inside and leaving the flank open — ` +
    `told him to hold his width for the second half, watch whether it sticks.`

  const src2 = await pool.query(
    `INSERT INTO audio_sources (teacher_id, school_id, context_type, duration_seconds,
       storage_url, transcript, transcript_generated_at, extraction_completed_at, created_at)
     VALUES ($1, $2, 'half_time', 34, NULL, $3, NOW() - INTERVAL '1 day',
       NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day')
     RETURNING id`,
    [hodPe.id, schoolId, matchTranscript]
  )
  const src2Id = src2.rows[0].id

  const confirmed = [
    {
      pupil: p3,
      type: 'physical',
      content: `Dominant in the air against a physically bigger opponent — won every aerial duel in the first half.`,
      fragment: `${p3.first_name} has won every header against their big number nine`,
      confidence: 0.95,
    },
    {
      pupil: p4,
      type: 'tactical',
      content: `Drifts infield off the wing and leaves the flank exposed. Coached at half-time to hold width — monitor in upcoming sessions.`,
      fragment: `${p4.first_name} keeps drifting inside and leaving the flank open`,
      confidence: 0.9,
    },
  ]
  for (const o of confirmed) {
    await pool.query(
      `INSERT INTO observations (pupil_id, observer_id, type, content, context_type,
         source, review_state, audio_source_id, transcript_fragment, confidence, sport, created_at)
       VALUES ($1, $2, $3, $4, 'match', 'voice', 'confirmed', $5, $6, $7, 'football',
         NOW() - INTERVAL '1 day')`,
      [o.pupil.id, hodPe.id, o.type, o.content, src2Id, o.fragment, o.confidence]
    )
    count++
  }

  console.log(`[demo-seed] Voice notes seeded: 2 recordings, ${count} observations (2 pending review)`)
  return count
}

// ── Coach conversation ──────────────────────────────────────────────
// One department-scope exchange so the assistant page opens onto a worked
// example of what Coach produces, instead of an empty prompt box.
export async function seedCoachChat(staff) {
  const hodPe = staff.hodPe
  if (!hodPe?.id) return 0

  await pool.query(`DELETE FROM messages WHERE team_id IS NULL AND user_id = $1`, [hodPe.id])

  const question =
    'Plan a 60-minute rugby session for Year 8 beginners — RFU-aligned, 24 pupils, tag-to-contact transition.'
  const answer = `Here's a 60-minute RFU-aligned session for 24 Year 8 beginners moving from tag towards contact. It follows the RFU's gradual contact introduction: confidence and body position first, no full tackling yet.

**Warm-up — Rob the Nest (10 min)**
Four teams of six, central "nest" of balls. Pupils run to collect one ball at a time for their corner. Progress to stealing from other corners. High heart rate, evasion, and ball familiarity with zero queuing.

**Skill block — Body position & tracking (15 min)**
Pairs, one knee-height pad each between cones. Focus points: chin up, spine straight, "cheek to cheek" shoulder contact, leg drive on impact. Rotate roles every 90 seconds. Coach the shape, not the collision — this is the RFU's key safety gate before any tackle work.

**Game 1 — Tag with a twist (15 min)**
Standard tag rules, but a tagged carrier must present the ball on the floor and the next player scoops it. Builds the ruck habit without contact. Three pitches of 8 keeps everyone involved.

**Game 2 — Controlled contact channel (15 min)**
One-metre channels, walk-pace first: carrier vs tracker onto a pad. Progress to jog pace only for pairs showing safe shape. Anyone not ready stays at walk pace — differentiation by pace, not exclusion.

**Cool-down & reflect (5 min)**
Static stretch circle. Ask: "What did your shoulder contact feel like when your head was up vs down?" — reinforces the safety cue as their own discovery.

**Kit:** 12 balls, 12 tackle pads, 40 cones, bibs in 4 colours.

Want me to adapt this for a wet-weather indoor version, or generate the printable session card?`

  await pool.query(
    `INSERT INTO messages (team_id, user_id, role, content, context, created_at)
     VALUES (NULL, $1, 'user', $2, '{}', NOW() - INTERVAL '1 day')`,
    [hodPe.id, question]
  )
  await pool.query(
    `INSERT INTO messages (team_id, user_id, role, content, created_at)
     VALUES (NULL, $1, 'assistant', $2, NOW() - INTERVAL '1 day')`,
    [hodPe.id, answer]
  )

  console.log('[demo-seed] Coach conversation seeded (department scope)')
  return 2
}

// ── Notifications ───────────────────────────────────────────────────
// A believable tray: a couple of amber "flagged for you" items and a
// celebratory heads-up. Nothing here is class A (action required) — the red
// badge count comes from the two expiring consents, kept deliberately small.
export async function seedNotifications(staff) {
  const hodPe = staff.hodPe
  if (!hodPe?.id) return 0

  await pool.query(`DELETE FROM notifications WHERE user_id = $1`, [hodPe.id])

  const rows = [
    {
      type: 'announcement',
      title: 'Spring fixture list published',
      message: '14 fixtures confirmed across football, rugby, netball, hockey and cricket. Coach allocations are on the fixtures board.',
      hoursAgo: 3,
      read: false,
    },
    {
      type: 'brief_generated',
      title: 'Your weekly department brief is ready',
      message: 'Participation is up across Years 7-9, two reports are awaiting your sign-off, and Thursday\'s hockey fixture still needs a minibus.',
      hoursAgo: 6,
      read: false,
    },
    {
      type: 'potm',
      title: 'Player of the Match: Toby Marsh',
      message: 'Voted Player of the Match for the 34-7 win over Sprowston Academy — two tries and fourteen tackles.',
      hoursAgo: 30,
      read: true,
    },
  ]

  for (const n of rows) {
    await pool.query(
      `INSERT INTO notifications (user_id, team_id, type, title, message, is_read, created_at)
       VALUES ($1, NULL, $2, $3, $4, $5, NOW() - ($6 || ' hours')::interval)`,
      [hodPe.id, n.type, n.title, n.message, n.read, n.hoursAgo]
    )
  }

  console.log(`[demo-seed] Notifications seeded: ${rows.length} for the demo HoD`)
  return rows.length
}

// ── Weekly trend history ────────────────────────────────────────────
// Three weeks of activity snapshots slightly below this week's live numbers,
// so the HoD dashboard's week-over-week chips have real history to compare
// against from the first moment a prospect opens it.
export async function seedWeeklyHistory(schoolId) {
  const monday = weekStartOf()
  const sunday = new Date(monday)
  sunday.setDate(sunday.getDate() + 6)

  const current = await computeWeekStats(schoolId, isoDate(monday), isoDate(sunday))
  await upsertWeekStats(schoolId, isoDate(monday), current)

  const dip = (n, by) => Math.max(0, n - by)
  const priorWeeks = [
    { back: 7,  stats: { sports_active: dip(current.sports_active, 1), unique_pupils: dip(current.unique_pupils, 6), fixtures_count: dip(current.fixtures_count, 2), observations_logged: dip(current.observations_logged, 5), active_staff: dip(current.active_staff, 1) } },
    { back: 14, stats: { sports_active: dip(current.sports_active, 1), unique_pupils: dip(current.unique_pupils, 11), fixtures_count: dip(current.fixtures_count, 3), observations_logged: dip(current.observations_logged, 9), active_staff: dip(current.active_staff, 1) } },
    { back: 21, stats: { sports_active: dip(current.sports_active, 2), unique_pupils: dip(current.unique_pupils, 15), fixtures_count: dip(current.fixtures_count, 4), observations_logged: dip(current.observations_logged, 12), active_staff: dip(current.active_staff, 2) } },
  ]
  for (const w of priorWeeks) {
    const start = new Date(monday)
    start.setDate(start.getDate() - w.back)
    await upsertWeekStats(schoolId, isoDate(start), w.stats)
  }

  console.log('[demo-seed] Weekly trend history seeded: current week + 3 prior weeks')
  return priorWeeks.length + 1
}
