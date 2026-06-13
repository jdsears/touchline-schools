/**
 * Development observations for the demo roster.
 *
 * Gives each team's pupils a believable observation history (technical,
 * tactical, physical, mental) authored by the team's coach and spread
 * over recent weeks, so Pupil Development and pupil profiles read as a
 * lived-in school rather than an empty shell.
 */

import pool from '../../config/database.js'

const TEMPLATES = {
  football: {
    technical: [
      'First touch improving under pressure — receiving on the half-turn more often.',
      'Striking the ball cleanly with both feet in finishing practice.',
      'Needs to keep working on weaker-foot passing over 15+ yards.',
    ],
    tactical: [
      'Starting to scan before receiving — picked the forward pass twice today.',
      'Holding the line well in the back four; communication growing.',
      'Drifts out of position when chasing the ball — work on shape discipline.',
    ],
    physical: ['Sharp over the first five yards; endurance dips late in sessions.', 'Coping well with the step-up in intensity this term.'],
    mental: ['Responded brilliantly to going behind — lifted the heads around them.', 'Confidence growing; volunteered to take the penalty.'],
  },
  rugby: {
    technical: [
      'Tackle technique much safer — cheek-to-cheek, driving with the legs.',
      'Passing off both hands improving; spiral developing on the left.',
      'Handling under high ball pressure needs more reps.',
    ],
    tactical: ['Reading when to commit to the ruck versus holding width.', 'Good support lines off the ball-carrier today.'],
    physical: ['Strong leg drive in contact; body height in the tackle improving.'],
    mental: ['Talked the defensive line through two phases — real leadership.'],
  },
  netball: {
    technical: ['Shooting technique consistent — balanced base, high release.', 'Footwork clean on landing; rarely called for travelling now.'],
    tactical: ['Timing of the drive onto the centre pass is excellent.', 'Learning to re-offer after the first lead is cut off.'],
    physical: ['Quick change of direction; getting free consistently.'],
    mental: ['Stayed composed when the shooter was double-marked.'],
  },
  hockey: {
    technical: ['Close control through traffic is a real strength.', 'Push pass accuracy improving over distance; work on the slap next.'],
    tactical: ['Understanding when to engage versus channel in defence.', 'Good width and timing arriving in the circle.'],
    physical: ['Sustains work-rate across both halves now.'],
    mental: ['Encouraging younger players in mixed sessions — great example.'],
  },
  cricket: {
    technical: ['Playing straighter; leaving well outside off stump.', 'Bowling action repeating nicely — line settling on off.'],
    tactical: ['Rotating the strike instead of forcing boundaries.', 'Field awareness improving when batting in pairs.'],
    physical: ['Throwing arm stronger; flat returns from the deep.'],
    mental: ['Kept concentration through a long spell in the field.'],
  },
}
const GENERIC = {
  technical: ['Core technique developing well this term.', 'Consistent improvement in the fundamental skills.'],
  tactical: ['Decision-making under pressure is maturing.', 'Understanding of team roles growing each week.'],
  physical: ['Movement quality and conditioning trending up.'],
  mental: ['Great attitude in training — responds well to feedback.'],
}

const TYPES = ['technical', 'tactical', 'physical', 'mental']

function pick(arr, n) {
  return arr[n % arr.length]
}

export async function seedDevelopmentObservations(teams) {
  let count = 0
  let skipped = 0
  for (const team of teams) {
    // Resolve the observing staff member. team.owner_id may be absent on the
    // in-memory object (createTeam returns the row before owner_id is set), so
    // fall back to the persisted value before giving up — otherwise every team
    // is skipped and the roster gets zero observations.
    let observerId = team.owner_id
    if (!observerId) {
      const r = await pool.query('SELECT owner_id FROM teams WHERE id = $1', [team.id])
      observerId = r.rows[0]?.owner_id || null
    }
    if (!observerId) { skipped++; continue }

    const pupils = await pool.query(
      'SELECT id, name FROM pupils WHERE team_id = $1 ORDER BY name LIMIT 8',
      [team.id]
    )
    const templates = TEMPLATES[team.sport] || GENERIC
    let i = 0
    for (const pupil of pupils.rows) {
      // 2-3 observations per pupil, different types, spread over ~6 weeks
      const howMany = 2 + (i % 2)
      for (let j = 0; j < howMany; j++) {
        const type = TYPES[(i + j) % TYPES.length]
        const pool_ = templates[type] || GENERIC[type]
        const daysAgo = 3 + ((i * 7 + j * 11) % 42)
        await pool.query(
          `INSERT INTO observations (pupil_id, observer_id, type, content, context_type, source, review_state, created_at)
           VALUES ($1, $2, $3, $4, 'pe_lesson', 'typed', 'confirmed', NOW() - INTERVAL '${daysAgo} days')`,
          [pupil.id, observerId, type, pick(pool_, i + j)]
        )
        count++
      }
      i++
    }
  }
  console.log(`[demo-seed] Development observations seeded: ${count} across ${teams.length} teams${skipped ? ` (${skipped} skipped: no owner)` : ''}`)
  return count
}
