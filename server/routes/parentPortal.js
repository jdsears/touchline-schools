import { Router } from 'express'
import pool from '../config/database.js'
import { authenticateToken } from '../middleware/auth.js'
import { getFrontendUrl } from '../utils/urlUtils.js'

const router = Router()

// ==========================================
// PARENT DASHBOARD
// ==========================================

// Get parent dashboard data (all linked children, clubs, payments, announcements)
router.get('/dashboard', authenticateToken, async (req, res, next) => {
  try {
    const userId = req.user.id

    // Get all guardian records linked to this user
    const guardiansResult = await pool.query(
      `SELECT g.*, c.name as club_name, c.slug as club_slug, c.primary_color as club_color
       FROM guardians g
       JOIN clubs c ON g.club_id = c.id
       WHERE g.user_id = $1`,
      [userId]
    )

    const guardians = guardiansResult.rows

    if (guardians.length === 0) {
      // Check if user has player_id (old-style parent link)
      return res.json({
        guardians: [],
        children: [],
        clubs: [],
        upcoming_matches: [],
        payments: [],
        announcements: [],
      })
    }

    const guardianIds = guardians.map(g => g.id)
    const clubIds = [...new Set(guardians.map(g => g.club_id))]

    // Get linked children (players)
    const childrenResult = await pool.query(
      `SELECT p.id, p.name, p.date_of_birth, p.position, p.squad_number,
              t.name as team_name, t.id as team_id,
              c.name as club_name, c.slug as club_slug,
              pg.relationship, pg.is_primary
       FROM player_guardians pg
       JOIN players p ON pg.player_id = p.id
       LEFT JOIN teams t ON p.team_id = t.id
       LEFT JOIN clubs c ON t.club_id = c.id
       WHERE pg.guardian_id = ANY($1)
       ORDER BY p.name`,
      [guardianIds]
    )

    // Get upcoming matches for children's teams
    const teamIds = [...new Set(childrenResult.rows.map(c => c.team_id).filter(Boolean))]
    let upcomingMatches = []
    if (teamIds.length > 0) {
      const matchesResult = await pool.query(
        `SELECT m.*, t.name as team_name
         FROM matches m
         JOIN teams t ON m.team_id = t.id
         WHERE m.team_id = ANY($1)
           AND m.date >= CURRENT_DATE
         ORDER BY m.date ASC`,
        [teamIds]
      )
      upcomingMatches = matchesResult.rows
    }

    // Get active payment subscriptions
    const paymentsResult = await pool.query(
      `SELECT ps.*, pp.name as plan_name, pp.amount as plan_amount, pp.interval as plan_interval,
              pp.plan_type, p.name as player_name, c.name as club_name
       FROM player_subscriptions ps
       JOIN payment_plans pp ON ps.payment_plan_id = pp.id
       JOIN players p ON ps.player_id = p.id
       JOIN clubs c ON ps.club_id = c.id
       WHERE ps.guardian_id = ANY($1)
       ORDER BY ps.created_at DESC`,
      [guardianIds]
    )

    // Get recent club announcements
    const announcementsResult = await pool.query(
      `SELECT ca.*, c.name as club_name, c.slug as club_slug, u.name as created_by_name
       FROM club_announcements ca
       JOIN clubs c ON ca.club_id = c.id
       LEFT JOIN users u ON ca.created_by = u.id
       WHERE ca.club_id = ANY($1)
         AND (ca.expires_at IS NULL OR ca.expires_at > NOW())
       ORDER BY ca.is_pinned DESC, ca.created_at DESC
       LIMIT 15`,
      [clubIds]
    )

    // Get clubs
    const clubs = guardians.map(g => ({
      id: g.club_id,
      name: g.club_name,
      slug: g.club_slug,
      color: g.club_color,
    }))

    res.json({
      guardians,
      children: childrenResult.rows,
      clubs: [...new Map(clubs.map(c => [c.id, c])).values()],
      upcoming_matches: upcomingMatches,
      payments: paymentsResult.rows,
      announcements: announcementsResult.rows,
    })
  } catch (error) {
    next(error)
  }
})

// Get children details
router.get('/children', authenticateToken, async (req, res, next) => {
  try {
    const userId = req.user.id

    const result = await pool.query(
      `SELECT p.id, p.name, p.date_of_birth, p.position, p.squad_number,
              p.photo_url, p.registration_status,
              t.name as team_name, t.id as team_id,
              c.name as club_name, c.slug as club_slug, c.primary_color as club_color,
              pg.relationship, pg.is_primary
       FROM guardians g
       JOIN player_guardians pg ON pg.guardian_id = g.id
       JOIN players p ON pg.player_id = p.id
       LEFT JOIN teams t ON p.team_id = t.id
       LEFT JOIN clubs c ON t.club_id = c.id
       WHERE g.user_id = $1
       ORDER BY p.name`,
      [userId]
    )

    res.json(result.rows)
  } catch (error) {
    next(error)
  }
})

// Get payment summary for parent
router.get('/payments', authenticateToken, async (req, res, next) => {
  try {
    const userId = req.user.id

    // Get all subscriptions through linked guardians
    const subsResult = await pool.query(
      `SELECT ps.*, pp.name as plan_name, pp.amount as plan_amount, pp.interval as plan_interval,
              pp.plan_type, pp.description as plan_description,
              p.name as player_name, t.name as team_name,
              c.name as club_name, c.slug as club_slug
       FROM guardians g
       JOIN player_subscriptions ps ON ps.guardian_id = g.id
       JOIN payment_plans pp ON ps.payment_plan_id = pp.id
       JOIN players p ON ps.player_id = p.id
       LEFT JOIN teams t ON p.team_id = t.id
       JOIN clubs c ON ps.club_id = c.id
       WHERE g.user_id = $1
       ORDER BY ps.status = 'pending' DESC, ps.status = 'past_due' DESC, ps.created_at DESC`,
      [userId]
    )

    // Get recent transactions
    const txnsResult = await pool.query(
      `SELECT ct.*, p.name as player_name, c.name as club_name
       FROM guardians g
       JOIN club_transactions ct ON ct.guardian_id = g.id
       JOIN players p ON ct.player_id = p.id
       JOIN clubs c ON ct.club_id = c.id
       WHERE g.user_id = $1
       ORDER BY ct.created_at DESC
       LIMIT 20`,
      [userId]
    )

    // Calculate totals
    const totalDue = subsResult.rows
      .filter(s => ['pending', 'past_due', 'overdue'].includes(s.status))
      .reduce((sum, s) => sum + (s.amount_due || s.plan_amount || 0), 0)

    const totalPaid = txnsResult.rows
      .filter(t => t.status === 'succeeded')
      .reduce((sum, t) => sum + t.amount, 0)

    res.json({
      subscriptions: subsResult.rows,
      transactions: txnsResult.rows,
      total_due: totalDue,
      total_paid: totalPaid,
    })
  } catch (error) {
    next(error)
  }
})

// Get announcements for parent (from all linked clubs)
router.get('/announcements', authenticateToken, async (req, res, next) => {
  try {
    const userId = req.user.id

    const result = await pool.query(
      `SELECT ca.*, c.name as club_name, c.slug as club_slug, c.primary_color as club_color,
              u.name as created_by_name
       FROM guardians g
       JOIN club_announcements ca ON ca.club_id = g.club_id
       JOIN clubs c ON ca.club_id = c.id
       LEFT JOIN users u ON ca.created_by = u.id
       WHERE g.user_id = $1
         AND (ca.expires_at IS NULL OR ca.expires_at > NOW())
       ORDER BY ca.is_pinned DESC, ca.created_at DESC
       LIMIT 30`,
      [userId]
    )

    res.json(result.rows)
  } catch (error) {
    next(error)
  }
})

// Get child's schedule (upcoming matches and training for a specific child)
router.get('/children/:playerId/schedule', authenticateToken, async (req, res, next) => {
  try {
    const userId = req.user.id
    const { playerId } = req.params

    // Verify this is the parent's child
    const check = await pool.query(
      `SELECT p.team_id FROM guardians g
       JOIN player_guardians pg ON pg.guardian_id = g.id
       JOIN players p ON pg.player_id = p.id
       WHERE g.user_id = $1 AND p.id = $2`,
      [userId, playerId]
    )

    if (check.rows.length === 0) {
      return res.status(403).json({ error: 'Not authorized to view this player' })
    }

    const teamId = check.rows[0].team_id

    // Get upcoming matches
    const matches = await pool.query(
      `SELECT id, opponent, date, time, location, home_away, status
       FROM matches
       WHERE team_id = $1 AND date >= CURRENT_DATE
       ORDER BY date ASC`,
      [teamId]
    )

    // Get upcoming training sessions
    const training = await pool.query(
      `SELECT id, title, date, location, focus_areas
       FROM training_sessions
       WHERE team_id = $1 AND date >= NOW()
       ORDER BY date ASC
       LIMIT 10`,
      [teamId]
    )

    res.json({
      matches: matches.rows,
      training: training.rows,
    })
  } catch (error) {
    next(error)
  }
})

// Update notification preferences
router.put('/notification-preferences', authenticateToken, async (req, res, next) => {
  try {
    const userId = req.user.id
    const { preferences } = req.body

    await pool.query(
      'UPDATE guardians SET notification_preferences = $1 WHERE user_id = $2',
      [JSON.stringify(preferences), userId]
    )

    res.json({ message: 'Preferences updated' })
  } catch (error) {
    next(error)
  }
})

export default router
