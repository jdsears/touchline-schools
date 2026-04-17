import express from 'express'
import pool from '../config/database.js'
import { authenticateToken } from '../middleware/auth.js'

const router = express.Router()
router.use(authenticateToken)

// GET /today - Teacher's schedule for today (classes, training, fixtures)
router.get('/today', async (req, res) => {
  try {
    const userId = req.user.id
    const today = new Date().toISOString().slice(0, 10)

    const [classes, training, fixtures] = await Promise.all([
      pool.query(
        `SELECT su.id, su.sport, su.unit_name,
                tg.id AS group_id, tg.name AS class_name, tg.year_group,
                (SELECT COUNT(*) FROM teaching_group_pupils tgp WHERE tgp.teaching_group_id = tg.id) AS pupil_count
         FROM sport_units su
         JOIN teaching_groups tg ON tg.id = su.teaching_group_id
         WHERE tg.teacher_id = $1 AND su.start_date <= $2 AND su.end_date >= $2`,
        [userId, today]
      ),
      pool.query(
        `SELECT ts.id, ts.date, ts.time, ts.location, ts.session_type, ts.focus_areas,
                t.id AS team_id, t.name AS team_name, t.sport,
                (SELECT COUNT(*) FROM pupils p WHERE p.team_id = t.id AND p.is_active = true) AS pupil_count
         FROM training_sessions ts
         JOIN teams t ON t.id = ts.team_id
         WHERE t.manager_id = $1 AND ts.date = $2
         ORDER BY ts.time NULLS LAST`,
        [userId, today]
      ),
      pool.query(
        `SELECT m.id, m.match_date, m.match_time, m.opponent, m.location, m.home_away, m.kit_type,
                t.id AS team_id, t.name AS team_name, t.sport,
                (SELECT COUNT(*) FROM pupils p WHERE p.team_id = t.id AND p.is_active = true) AS pupil_count
         FROM matches m
         JOIN teams t ON t.id = m.team_id
         WHERE t.manager_id = $1 AND m.match_date = $2
         ORDER BY m.match_time NULLS LAST`,
        [userId, today]
      ),
    ])

    res.json({ date: today, classes: classes.rows, training: training.rows, fixtures: fixtures.rows })
  } catch (error) {
    console.error('Teacher dashboard today error:', error)
    res.status(500).json({ error: 'Failed to load today schedule' })
  }
})

// GET /my-classes - Teacher's classes with current unit and assessment progress
router.get('/my-classes', async (req, res) => {
  try {
    const userId = req.user.id

    const result = await pool.query(
      `SELECT tg.id, tg.name, tg.year_group, tg.key_stage,
              (SELECT COUNT(*) FROM teaching_group_pupils tgp WHERE tgp.teaching_group_id = tg.id) AS pupil_count,
              (SELECT json_agg(json_build_object(
                 'id', su.id, 'sport', su.sport, 'unit_name', su.unit_name,
                 'start_date', su.start_date, 'end_date', su.end_date
               )) FROM sport_units su WHERE su.teaching_group_id = tg.id
                 AND su.start_date <= CURRENT_DATE AND su.end_date >= CURRENT_DATE
              ) AS current_units,
              (SELECT COUNT(*) FROM pupil_assessments pa
               JOIN sport_units su2 ON su2.id = pa.unit_id
               WHERE su2.teaching_group_id = tg.id
                 AND pa.assessed_at > NOW() - INTERVAL '3 months'
              ) AS assessments_this_term
       FROM teaching_groups tg
       WHERE tg.teacher_id = $1
       ORDER BY tg.year_group, tg.name`,
      [userId]
    )

    res.json(result.rows)
  } catch (error) {
    console.error('Teacher dashboard my-classes error:', error)
    res.status(500).json({ error: 'Failed to load classes' })
  }
})

// GET /my-teams - Teacher's teams with last result and next fixture
router.get('/my-teams', async (req, res) => {
  try {
    const userId = req.user.id

    const result = await pool.query(
      `SELECT t.id, t.name, t.sport, t.age_group,
              (SELECT COUNT(*) FROM pupils p WHERE p.team_id = t.id AND p.is_active = true) AS pupil_count,
              (SELECT json_build_object('id', m.id, 'opponent', m.opponent, 'date', m.match_date,
                       'score_for', m.score_for, 'score_against', m.score_against)
               FROM matches m WHERE m.team_id = t.id AND m.score_for IS NOT NULL
               ORDER BY m.match_date DESC LIMIT 1
              ) AS last_result,
              (SELECT json_build_object('id', m2.id, 'opponent', m2.opponent, 'date', m2.match_date,
                       'time', m2.match_time, 'home_away', m2.home_away)
               FROM matches m2 WHERE m2.team_id = t.id AND m2.match_date >= CURRENT_DATE AND m2.score_for IS NULL
               ORDER BY m2.match_date ASC LIMIT 1
              ) AS next_fixture,
              (SELECT json_build_object('id', ts.id, 'date', ts.date, 'time', ts.time, 'location', ts.location)
               FROM training_sessions ts WHERE ts.team_id = t.id AND ts.date >= CURRENT_DATE
               ORDER BY ts.date ASC LIMIT 1
              ) AS next_training
       FROM teams t
       WHERE t.manager_id = $1
       ORDER BY t.sport, t.name`,
      [userId]
    )

    res.json(result.rows)
  } catch (error) {
    console.error('Teacher dashboard my-teams error:', error)
    res.status(500).json({ error: 'Failed to load teams' })
  }
})

// GET /attention - Pupils needing teacher attention
router.get('/attention', async (req, res) => {
  try {
    const userId = req.user.id

    const result = await pool.query(
      `SELECT DISTINCT ON (p.id) p.id AS pupil_id, p.name, p.year_group,
              t.name AS team_name, t.sport,
              o.type AS observation_type, o.content AS observation_excerpt, o.created_at
       FROM observations o
       JOIN pupils p ON p.id = o.player_id
       JOIN teams t ON t.id = p.team_id
       WHERE o.observer_id = $1
         AND o.type IN ('concern', 'welfare', 'behaviour', 'improvement')
         AND o.created_at > NOW() - INTERVAL '14 days'
       ORDER BY p.id, o.created_at DESC
       LIMIT 5`,
      [userId]
    )

    res.json(result.rows)
  } catch (error) {
    console.error('Teacher dashboard attention error:', error)
    res.status(500).json({ error: 'Failed to load attention items' })
  }
})

export default router
