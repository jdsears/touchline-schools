import express from 'express'
import multer from 'multer'
import path from 'path'
import pool from '../config/database.js'
import { authenticateToken, requireAdmin } from '../middleware/auth.js'
import { PLANS, createSubscription } from '../services/billingService.js'
import { runDemoSeed } from '../db/demo-seed/index.js'
import crypto from 'crypto'

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['.png', '.jpg', '.jpeg', '.gif', '.webp']
    const ext = path.extname(file.originalname).toLowerCase()
    cb(null, allowed.includes(ext))
  }
})

const router = express.Router()

// All admin routes require authentication and admin role
router.use(authenticateToken)
router.use(requireAdmin)

// ============================================
// Dashboard Stats
// ============================================

// GET /api/admin/stats - Get dashboard statistics
router.get('/stats', async (req, res) => {
  try {
    // Get user counts
    const userStats = await pool.query(`
      SELECT
        COUNT(*) as total_users,
        COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '7 days') as new_users_7d,
        COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '30 days') as new_users_30d,
        COUNT(*) FILTER (WHERE role = 'manager') as coaches,
        COUNT(*) FILTER (WHERE role = 'pupil') as pupils,
        COUNT(*) FILTER (WHERE role = 'parent') as parents
      FROM users
    `)

    // Get team counts
    const teamStats = await pool.query(`
      SELECT
        COUNT(*) as total_teams,
        COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '7 days') as new_teams_7d,
        COUNT(*) FILTER (WHERE team_format = 11) as teams_11,
        COUNT(*) FILTER (WHERE team_format = 9) as teams_9
      FROM teams
    `)

    // Get subscription stats - count from teams table (source of truth for tier)
    // free_trial is legacy default - treat as free
    const subscriptionStats = await pool.query(`
      SELECT
        COUNT(*) as total_teams,
        COUNT(*) FILTER (WHERE subscription_tier NOT IN ('free', 'free_trial', 'trial_14d', '') AND subscription_tier IS NOT NULL) as paid,
        COUNT(*) FILTER (WHERE subscription_tier IN ('free', 'free_trial') OR subscription_tier IS NULL OR subscription_tier = '') as free,
        COUNT(*) FILTER (WHERE subscription_tier = 'trial_14d' AND trial_ends_at IS NOT NULL AND trial_ends_at > NOW()) as legacy_trials,
        COUNT(*) FILTER (WHERE subscription_tier LIKE 'team_core%') as core,
        COUNT(*) FILTER (WHERE subscription_tier LIKE 'team_pro%') as pro,
        COUNT(*) FILTER (WHERE subscription_tier LIKE 'academy%') as academy
      FROM teams
    `)

    // Get promo code stats
    const promoStats = await pool.query(`
      SELECT
        COUNT(*) as total_codes,
        COUNT(*) FILTER (WHERE is_active = true) as active_codes,
        COALESCE(SUM(current_uses), 0) as total_redemptions
      FROM promo_codes
    `)

    // Get school stats
    const clubStats = await pool.query(`
      SELECT
        COUNT(*) as total_clubs,
        COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '7 days') as new_clubs_7d,
        COUNT(*) FILTER (WHERE subscription_tier = 'club_starter') as starter,
        COUNT(*) FILTER (WHERE subscription_tier = 'club_growth') as growth,
        COUNT(*) FILTER (WHERE subscription_tier = 'club_scale') as scale
      FROM schools
    `)

    // Get pupil stats
    const playerStats = await pool.query(`
      SELECT
        COUNT(*) as total_players,
        COUNT(*) FILTER (WHERE is_active = true) as active_players,
        COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '7 days') as new_players_7d
      FROM pupils
    `)

    // Recent activity
    const recentUsers = await pool.query(`
      SELECT id, email, name, role, created_at
      FROM users
      ORDER BY created_at DESC
      LIMIT 10
    `)

    // Recent schools
    const recentClubs = await pool.query(`
      SELECT c.id, c.name, c.subscription_tier, c.created_at,
             (SELECT COUNT(*) FROM teams t WHERE t.school_id = c.id) as team_count
      FROM schools c
      ORDER BY c.created_at DESC
      LIMIT 5
    `)

    // Top managers by team count (shows accounts with multiple teams)
    const topManagers = await pool.query(`
      SELECT u.id, u.name, u.email, u.created_at,
             COUNT(DISTINCT tm.team_id) as team_count,
             ARRAY_AGG(DISTINCT t.name) as team_names,
             ARRAY_AGG(DISTINCT t.subscription_tier) as tiers
      FROM users u
      JOIN team_memberships tm ON tm.user_id = u.id AND tm.role IN ('owner', 'manager')
      JOIN teams t ON t.id = tm.team_id
      GROUP BY u.id, u.name, u.email, u.created_at
      ORDER BY team_count DESC, u.created_at DESC
      LIMIT 10
    `)

    res.json({
      users: userStats.rows[0],
      teams: teamStats.rows[0],
      subscriptions: subscriptionStats.rows[0],
      promoCodes: promoStats.rows[0],
      schools: clubStats.rows[0],
      pupils: playerStats.rows[0],
      recentUsers: recentUsers.rows,
      recentClubs: recentClubs.rows,
      topManagers: topManagers.rows
    })
  } catch (error) {
    console.error('Admin stats error:', error)
    res.status(500).json({ message: 'Failed to fetch admin stats' })
  }
})

// ============================================
// User Management
// ============================================

// GET /api/admin/users - List all users with pagination
router.get('/users', async (req, res) => {
  try {
    const { page = 1, limit = 50, search = '', role = '' } = req.query
    const offset = (page - 1) * limit

    let whereClause = 'WHERE 1=1'
    const params = []

    if (search) {
      params.push(`%${search}%`)
      whereClause += ` AND (email ILIKE $${params.length} OR name ILIKE $${params.length})`
    }

    if (role) {
      params.push(role)
      whereClause += ` AND role = $${params.length}`
    }

    const countResult = await pool.query(
      `SELECT COUNT(*) FROM users ${whereClause}`,
      params
    )

    params.push(limit, offset)
    const users = await pool.query(
      `SELECT u.id, u.email, u.name, u.role, u.is_admin, u.billing_exempt, u.created_at, u.team_id,
              t.name as team_name, t.trial_ends_at, t.subscription_tier
       FROM users u
       LEFT JOIN teams t ON u.team_id = t.id
       ${whereClause}
       ORDER BY u.created_at DESC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    )

    res.json({
      users: users.rows,
      total: parseInt(countResult.rows[0].count),
      page: parseInt(page),
      limit: parseInt(limit)
    })
  } catch (error) {
    console.error('Admin users error:', error)
    res.status(500).json({ message: 'Failed to fetch users' })
  }
})

// GET /api/admin/users/:userId - Get user detail with team/subscription info
router.get('/users/:userId', async (req, res) => {
  try {
    const { userId } = req.params

    const userResult = await pool.query(
      `SELECT u.id, u.email, u.name, u.role, u.is_admin, u.billing_exempt, u.created_at, u.team_id, u.pupil_id,
              t.name as team_name, t.trial_ends_at, t.subscription_tier,
              p.name as player_name
       FROM users u
       LEFT JOIN teams t ON u.team_id = t.id
       LEFT JOIN pupils p ON u.pupil_id = p.id
       WHERE u.id = $1`,
      [userId]
    )

    if (userResult.rows.length === 0) {
      return res.status(404).json({ message: 'User not found' })
    }

    const user = userResult.rows[0]

    // Get subscription info if they have a team
    let subscription = null
    if (user.team_id) {
      const subResult = await pool.query(
        `SELECT * FROM subscriptions
         WHERE team_id = $1
         ORDER BY created_at DESC
         LIMIT 1`,
        [user.team_id]
      )
      subscription = subResult.rows[0] || null
    }

    res.json({ ...user, subscription })
  } catch (error) {
    console.error('Admin user detail error:', error)
    res.status(500).json({ message: 'Failed to fetch user details' })
  }
})

// PUT /api/admin/users/:userId/billing-exempt - Toggle billing_exempt flag
router.put('/users/:userId/billing-exempt', async (req, res) => {
  try {
    const { userId } = req.params
    const { billing_exempt } = req.body

    const result = await pool.query(
      'UPDATE users SET billing_exempt = $1 WHERE id = $2 RETURNING id, email, name, billing_exempt',
      [!!billing_exempt, userId]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'User not found' })
    }

    res.json(result.rows[0])
  } catch (error) {
    console.error('Admin billing exempt error:', error)
    res.status(500).json({ message: 'Failed to update billing exempt status' })
  }
})

// PUT /api/admin/users/:userId/role - Change user role
router.put('/users/:userId/role', async (req, res) => {
  try {
    const { userId } = req.params
    const { role } = req.body

    const validRoles = ['manager', 'assistant', 'parent', 'pupil']
    if (!role || !validRoles.includes(role)) {
      return res.status(400).json({ message: `Role must be one of: ${validRoles.join(', ')}` })
    }

    const result = await pool.query(
      'UPDATE users SET role = $1 WHERE id = $2 RETURNING id, email, name, role',
      [role, userId]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'User not found' })
    }

    res.json(result.rows[0])
  } catch (error) {
    console.error('Admin role change error:', error)
    res.status(500).json({ message: 'Failed to update user role' })
  }
})

// POST /api/admin/users/:userId/extend-trial - Extend trial for user's team
router.post('/users/:userId/extend-trial', async (req, res) => {
  try {
    const { userId } = req.params
    const { days } = req.body

    if (!days || days < 1 || days > 365) {
      return res.status(400).json({ message: 'Days must be between 1 and 365' })
    }

    // Get user's team
    const userResult = await pool.query('SELECT team_id FROM users WHERE id = $1', [userId])
    if (userResult.rows.length === 0) {
      return res.status(404).json({ message: 'User not found' })
    }

    const teamId = userResult.rows[0].team_id
    if (!teamId) {
      return res.status(400).json({ message: 'User has no team' })
    }

    // Get current trial end or use now as base
    const teamResult = await pool.query('SELECT trial_ends_at FROM teams WHERE id = $1', [teamId])
    const currentEnd = teamResult.rows[0]?.trial_ends_at
    const baseDate = currentEnd && new Date(currentEnd) > new Date() ? new Date(currentEnd) : new Date()
    const newEnd = new Date(baseDate)
    newEnd.setDate(newEnd.getDate() + parseInt(days))

    await pool.query(
      'UPDATE teams SET trial_ends_at = $1, subscription_tier = $2 WHERE id = $3',
      [newEnd, 'trial_14d', teamId]
    )

    res.json({ trial_ends_at: newEnd, days_added: parseInt(days) })
  } catch (error) {
    console.error('Admin extend trial error:', error)
    res.status(500).json({ message: 'Failed to extend trial' })
  }
})

// POST /api/admin/users/:userId/grant-subscription - Grant a subscription plan
router.post('/users/:userId/grant-subscription', async (req, res) => {
  try {
    const { userId } = req.params
    const { plan_id } = req.body

    if (!plan_id || !PLANS[plan_id]) {
      return res.status(400).json({ message: 'Invalid plan ID' })
    }

    // Get user's team
    const userResult = await pool.query('SELECT team_id FROM users WHERE id = $1', [userId])
    if (userResult.rows.length === 0) {
      return res.status(404).json({ message: 'User not found' })
    }

    const teamId = userResult.rows[0].team_id
    if (!teamId) {
      return res.status(400).json({ message: 'User has no team' })
    }

    // Cancel any existing active subscriptions
    await pool.query(
      `UPDATE subscriptions SET status = 'canceled' WHERE team_id = $1 AND status IN ('active', 'trialing')`,
      [teamId]
    )

    // Create the new subscription
    const subscription = await createSubscription(teamId, plan_id, { provider: 'admin_grant' })

    res.json(subscription)
  } catch (error) {
    console.error('Admin grant subscription error:', error)
    res.status(500).json({ message: 'Failed to grant subscription' })
  }
})

// PUT /api/admin/users/:userId/team - Reassign user to a different team
router.put('/users/:userId/team', async (req, res) => {
  try {
    const { userId } = req.params
    const { team_id } = req.body

    // Verify user exists
    const userResult = await pool.query('SELECT id, team_id, role FROM users WHERE id = $1', [userId])
    if (userResult.rows.length === 0) {
      return res.status(404).json({ message: 'User not found' })
    }

    // If team_id provided, verify it exists
    if (team_id) {
      const teamResult = await pool.query('SELECT id, name FROM teams WHERE id = $1', [team_id])
      if (teamResult.rows.length === 0) {
        return res.status(404).json({ message: 'Team not found' })
      }
    }

    // Update the user's team
    const result = await pool.query(
      'UPDATE users SET team_id = $1 WHERE id = $2 RETURNING id, name, email, role, team_id',
      [team_id || null, userId]
    )

    res.json(result.rows[0])
  } catch (error) {
    console.error('Admin reassign team error:', error)
    res.status(500).json({ message: 'Failed to reassign team' })
  }
})

// DELETE /api/admin/users/:userId - Delete a user account
router.delete('/users/:userId', async (req, res) => {
  try {
    const { userId } = req.params

    // Verify user exists and isn't an admin
    const userResult = await pool.query('SELECT id, name, email, is_admin, team_id FROM users WHERE id = $1', [userId])
    if (userResult.rows.length === 0) {
      return res.status(404).json({ message: 'User not found' })
    }

    const user = userResult.rows[0]
    if (user.is_admin) {
      return res.status(403).json({ message: 'Cannot delete admin users' })
    }

    // Helper to safely run a query (ignores errors from missing tables)
    const safeQuery = async (sql, params) => {
      try { await pool.query(sql, params) } catch (_) {}
    }

    // Remove team ownership
    await safeQuery('UPDATE teams SET owner_id = NULL WHERE owner_id = $1', [userId])

    // Delete rows in tables that would block delete
    await safeQuery('DELETE FROM team_memberships WHERE user_id = $1', [userId])
    await safeQuery('DELETE FROM promo_code_redemptions WHERE user_id = $1', [userId])
    await safeQuery('DELETE FROM compliance_records WHERE user_id = $1', [userId])
    await safeQuery('DELETE FROM school_members WHERE user_id = $1', [userId])
    await safeQuery('DELETE FROM guardians WHERE user_id = $1', [userId])
    await safeQuery('DELETE FROM messages WHERE user_id = $1', [userId])
    await safeQuery('DELETE FROM match_availability WHERE user_id = $1', [userId])
    await safeQuery('DELETE FROM availability_responses WHERE responded_by = $1', [userId])

    // Null out foreign keys in tables that reference this user
    await safeQuery('UPDATE pupil_messages SET user_id = NULL WHERE user_id = $1', [userId])
    await safeQuery('UPDATE team_documents SET uploaded_by = NULL WHERE uploaded_by = $1', [userId])
    await safeQuery('UPDATE match_clips SET uploaded_by = NULL WHERE uploaded_by = $1', [userId])
    await safeQuery('UPDATE team_announcements SET created_by = NULL WHERE created_by = $1', [userId])
    await safeQuery('UPDATE pupil_achievements SET awarded_by = NULL WHERE awarded_by = $1', [userId])
    await safeQuery('UPDATE team_suggestions SET submitted_by = NULL WHERE submitted_by = $1', [userId])
    await safeQuery('UPDATE team_suggestions SET responded_by = NULL WHERE responded_by = $1', [userId])
    await safeQuery('UPDATE promo_codes SET created_by = NULL WHERE created_by = $1', [userId])
    await safeQuery('UPDATE match_media SET uploaded_by = NULL WHERE uploaded_by = $1', [userId])
    await safeQuery('UPDATE videos SET uploaded_by = NULL WHERE uploaded_by = $1', [userId])
    await safeQuery('UPDATE video_clips SET created_by = NULL WHERE created_by = $1', [userId])
    await safeQuery('UPDATE observations SET observer_id = NULL WHERE observer_id = $1', [userId])
    await safeQuery('UPDATE consent_records SET user_id = NULL WHERE user_id = $1', [userId])
    await safeQuery('UPDATE safeguarding_roles SET user_id = NULL WHERE user_id = $1', [userId])
    await safeQuery('UPDATE safeguarding_roles SET assigned_by = NULL WHERE assigned_by = $1', [userId])
    await safeQuery('UPDATE safeguarding_incidents SET reported_by = NULL WHERE reported_by = $1', [userId])
    await safeQuery('UPDATE safeguarding_incidents SET closed_by = NULL WHERE closed_by = $1', [userId])
    await safeQuery('UPDATE safeguarding_incidents SET resolved_by = NULL WHERE resolved_by = $1', [userId])
    await safeQuery('UPDATE compliance_alerts SET target_user_id = NULL WHERE target_user_id = $1', [userId])
    await safeQuery('UPDATE compliance_alerts SET acknowledged_by = NULL WHERE acknowledged_by = $1', [userId])
    await safeQuery('UPDATE school_announcements SET created_by = NULL WHERE created_by = $1', [userId])
    await safeQuery('UPDATE guardian_invites SET claimed_by = NULL WHERE claimed_by = $1', [userId])
    await safeQuery('UPDATE school_comms_log SET sent_by = NULL WHERE sent_by = $1', [userId])
    await safeQuery('UPDATE school_events SET created_by = NULL WHERE created_by = $1', [userId])
    await safeQuery('UPDATE session_schedule SET created_by = NULL WHERE created_by = $1', [userId])
    await safeQuery('UPDATE match_reports SET approved_by = NULL WHERE approved_by = $1', [userId])
    await safeQuery('UPDATE payment_plans SET created_by = NULL WHERE created_by = $1', [userId])
    await safeQuery('UPDATE grant_drafts SET created_by = NULL WHERE created_by = $1', [userId])

    // Delete the user
    await pool.query('DELETE FROM users WHERE id = $1', [userId])

    res.json({ message: 'User deleted successfully', user: { id: user.id, name: user.name, email: user.email } })
  } catch (error) {
    console.error('Admin delete user error:', error)
    res.status(500).json({ message: 'Failed to delete user' })
  }
})

// GET /api/admin/teams - List all teams (for reassignment dropdown)
router.get('/teams', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT t.id, t.name, t.age_group, u.name as owner_name
       FROM teams t
       LEFT JOIN users u ON t.owner_id = u.id
       ORDER BY t.name ASC`
    )
    res.json(result.rows)
  } catch (error) {
    console.error('Admin list teams error:', error)
    res.status(500).json({ message: 'Failed to load teams' })
  }
})

// GET /api/admin/teams/:teamId/pupils - List pupils in a team (for linking)
router.get('/teams/:teamId/pupils', async (req, res) => {
  try {
    const { teamId } = req.params
    const result = await pool.query(
      `SELECT p.id, p.name, p.squad_number
       FROM pupils p
       WHERE p.team_id = $1
       ORDER BY p.name ASC`,
      [teamId]
    )
    res.json(result.rows)
  } catch (error) {
    console.error('Admin list team pupils error:', error)
    res.status(500).json({ message: 'Failed to load pupils' })
  }
})

// PUT /api/admin/users/:userId/pupil - Link user to a pupil profile
router.put('/users/:userId/pupil', async (req, res) => {
  try {
    const { userId } = req.params
    const { pupil_id } = req.body

    // Verify user exists
    const userResult = await pool.query('SELECT id, team_id FROM users WHERE id = $1', [userId])
    if (userResult.rows.length === 0) {
      return res.status(404).json({ message: 'User not found' })
    }

    // If pupil_id provided, verify the pupil exists
    if (pupil_id) {
      const playerResult = await pool.query('SELECT id, name, team_id FROM pupils WHERE id = $1', [pupil_id])
      if (playerResult.rows.length === 0) {
        return res.status(404).json({ message: 'Pupil not found' })
      }
    }

    // Update user's pupil_id
    const result = await pool.query(
      'UPDATE users SET pupil_id = $1 WHERE id = $2 RETURNING id, name, email, pupil_id',
      [pupil_id || null, userId]
    )

    // Also update or create team_membership with the pupil link
    const user = userResult.rows[0]
    if (user.team_id) {
      const membershipExists = await pool.query(
        'SELECT id FROM team_memberships WHERE user_id = $1 AND team_id = $2',
        [userId, user.team_id]
      )
      if (membershipExists.rows.length > 0) {
        await pool.query(
          'UPDATE team_memberships SET pupil_id = $1 WHERE user_id = $2 AND team_id = $3',
          [pupil_id || null, userId, user.team_id]
        )
      } else {
        await pool.query(
          'INSERT INTO team_memberships (user_id, team_id, role, pupil_id, is_primary) VALUES ($1, $2, (SELECT role FROM users WHERE id = $1), $3, true)',
          [userId, user.team_id, pupil_id || null]
        )
      }
    }

    res.json(result.rows[0])
  } catch (error) {
    console.error('Admin link pupil error:', error)
    res.status(500).json({ message: 'Failed to link pupil profile' })
  }
})

// ============================================
// Promo Code Management
// ============================================

// Generate a random promo code
function generatePromoCode(length = 8) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // Exclude confusing chars
  let code = ''
  for (let i = 0; i < length; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return code
}

// GET /api/admin/promo-codes - List all promo codes
router.get('/promo-codes', async (req, res) => {
  try {
    const { active_only = 'false' } = req.query

    let query = `
      SELECT pc.*, u.email as created_by_email,
             (SELECT COUNT(*) FROM promo_code_redemptions WHERE promo_code_id = pc.id) as redemption_count
      FROM promo_codes pc
      LEFT JOIN users u ON pc.created_by = u.id
    `

    if (active_only === 'true') {
      query += ` WHERE pc.is_active = true AND (pc.valid_until IS NULL OR pc.valid_until > NOW())`
    }

    query += ` ORDER BY pc.created_at DESC`

    const result = await pool.query(query)
    res.json(result.rows)
  } catch (error) {
    console.error('Promo codes error:', error)
    res.status(500).json({ message: 'Failed to fetch promo codes' })
  }
})

// POST /api/admin/promo-codes - Create a new promo code
router.post('/promo-codes', async (req, res) => {
  try {
    const {
      code,
      description,
      discount_type, // 'percentage', 'fixed', 'free'
      discount_value = 0,
      applicable_plans = [],
      max_uses,
      valid_from,
      valid_until
    } = req.body

    // Validate discount_type
    if (!['percentage', 'fixed', 'free'].includes(discount_type)) {
      return res.status(400).json({ message: 'Invalid discount type' })
    }

    // Generate code if not provided
    const promoCode = code || generatePromoCode()

    // Check for duplicate code
    const existing = await pool.query(
      'SELECT id FROM promo_codes WHERE UPPER(code) = UPPER($1)',
      [promoCode]
    )

    if (existing.rows.length > 0) {
      return res.status(400).json({ message: 'Promo code already exists' })
    }

    const result = await pool.query(
      `INSERT INTO promo_codes
       (code, description, discount_type, discount_value, applicable_plans, max_uses, valid_from, valid_until, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [
        promoCode.toUpperCase(),
        description,
        discount_type,
        discount_type === 'free' ? 100 : discount_value,
        applicable_plans,
        max_uses || null,
        valid_from || new Date(),
        valid_until || null,
        req.user.id
      ]
    )

    res.status(201).json(result.rows[0])
  } catch (error) {
    console.error('Create promo code error:', error)
    res.status(500).json({ message: 'Failed to create promo code' })
  }
})

// PUT /api/admin/promo-codes/:id - Update a promo code
router.put('/promo-codes/:id', async (req, res) => {
  try {
    const { id } = req.params
    const {
      description,
      discount_type,
      discount_value,
      applicable_plans,
      max_uses,
      valid_from,
      valid_until,
      is_active
    } = req.body

    const result = await pool.query(
      `UPDATE promo_codes
       SET description = COALESCE($1, description),
           discount_type = COALESCE($2, discount_type),
           discount_value = COALESCE($3, discount_value),
           applicable_plans = COALESCE($4, applicable_plans),
           max_uses = $5,
           valid_from = COALESCE($6, valid_from),
           valid_until = $7,
           is_active = COALESCE($8, is_active),
           updated_at = NOW()
       WHERE id = $9
       RETURNING *`,
      [description, discount_type, discount_value, applicable_plans, max_uses, valid_from, valid_until, is_active, id]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Promo code not found' })
    }

    res.json(result.rows[0])
  } catch (error) {
    console.error('Update promo code error:', error)
    res.status(500).json({ message: 'Failed to update promo code' })
  }
})

// DELETE /api/admin/promo-codes/:id - Delete a promo code
router.delete('/promo-codes/:id', async (req, res) => {
  try {
    const { id } = req.params

    const result = await pool.query(
      'DELETE FROM promo_codes WHERE id = $1 RETURNING *',
      [id]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Promo code not found' })
    }

    res.json({ message: 'Promo code deleted', code: result.rows[0] })
  } catch (error) {
    console.error('Delete promo code error:', error)
    res.status(500).json({ message: 'Failed to delete promo code' })
  }
})

// GET /api/admin/promo-codes/:id/redemptions - Get redemption history
router.get('/promo-codes/:id/redemptions', async (req, res) => {
  try {
    const { id } = req.params

    const result = await pool.query(
      `SELECT pcr.*, u.email, u.name, t.name as team_name
       FROM promo_code_redemptions pcr
       LEFT JOIN users u ON pcr.user_id = u.id
       LEFT JOIN teams t ON pcr.team_id = t.id
       WHERE pcr.promo_code_id = $1
       ORDER BY pcr.redeemed_at DESC`,
      [id]
    )

    res.json(result.rows)
  } catch (error) {
    console.error('Redemptions error:', error)
    res.status(500).json({ message: 'Failed to fetch redemptions' })
  }
})

// ============================================
// Promo Code Validation (Public endpoint moved here for admin access)
// ============================================

// POST /api/admin/promo-codes/validate - Validate a promo code
router.post('/promo-codes/validate', async (req, res) => {
  try {
    const { code, plan_id } = req.body

    const result = await pool.query(
      `SELECT * FROM promo_codes
       WHERE UPPER(code) = UPPER($1)
       AND is_active = true
       AND (valid_from IS NULL OR valid_from <= NOW())
       AND (valid_until IS NULL OR valid_until > NOW())
       AND (max_uses IS NULL OR current_uses < max_uses)`,
      [code]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ valid: false, message: 'Invalid or expired promo code' })
    }

    const promo = result.rows[0]

    // Check if applicable to plan
    if (promo.applicable_plans.length > 0 && !promo.applicable_plans.includes(plan_id)) {
      return res.status(400).json({ valid: false, message: 'Code not valid for this plan' })
    }

    res.json({
      valid: true,
      code: promo.code,
      discount_type: promo.discount_type,
      discount_value: promo.discount_value,
      description: promo.description
    })
  } catch (error) {
    console.error('Validate promo error:', error)
    res.status(500).json({ message: 'Failed to validate promo code' })
  }
})

// =============================================
// Feature Page Screenshots (Base64 Data URL approach)
// =============================================

// Helper to convert buffer to base64 data URL
function bufferToDataUrl(buffer, mimeType) {
  if (!buffer) return null
  let base64
  if (Buffer.isBuffer(buffer)) {
    base64 = buffer.toString('base64')
  } else if (typeof buffer === 'string' && buffer.startsWith('\\x')) {
    base64 = Buffer.from(buffer.slice(2), 'hex').toString('base64')
  } else if (typeof buffer === 'string') {
    base64 = Buffer.from(buffer, 'binary').toString('base64')
  } else {
    return null
  }
  return `data:${mimeType};base64,${base64}`
}

// List all screenshots with base64 data URLs
router.get('/feature-screenshots', async (req, res, next) => {
  try {
    const result = await pool.query(
      'SELECT id, feature_slug, slot, filename, mime_type, data, created_at FROM feature_screenshots ORDER BY feature_slug, slot'
    )
    // Convert binary data to base64 data URLs
    const screenshots = result.rows.map(row => ({
      id: row.id,
      feature_slug: row.feature_slug,
      slot: row.slot,
      filename: row.filename,
      created_at: row.created_at,
      dataUrl: bufferToDataUrl(row.data, row.mime_type)
    }))
    res.json(screenshots)
  } catch (error) { next(error) }
})

// Upload / replace a screenshot for a feature slot
router.post('/feature-screenshots/:slug/:slot', upload.single('image'), async (req, res, next) => {
  try {
    const { slug, slot } = req.params
    if (!req.file) return res.status(400).json({ error: 'No image file provided' })

    const validSlots = ['hero', 'step_1', 'step_2', 'step_3']
    if (!validSlots.includes(slot)) return res.status(400).json({ error: 'Invalid slot' })

    // Check file size (max 2MB for base64 storage)
    if (req.file.size > 2 * 1024 * 1024) {
      return res.status(400).json({ error: 'Image too large. Maximum 2MB allowed.' })
    }

    // Upsert - replace existing screenshot for this slug+slot
    await pool.query(
      `INSERT INTO feature_screenshots (feature_slug, slot, filename, mime_type, data)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (feature_slug, slot) DO UPDATE SET filename = $3, mime_type = $4, data = $5, created_at = CURRENT_TIMESTAMP`,
      [slug, slot, req.file.originalname, req.file.mimetype, req.file.buffer]
    )

    // Return the data URL for immediate display
    const dataUrl = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`
    res.json({ message: 'Screenshot uploaded', slug, slot, dataUrl })
  } catch (error) { next(error) }
})

// Delete a screenshot
router.delete('/feature-screenshots/:slug/:slot', async (req, res, next) => {
  try {
    const { slug, slot } = req.params
    await pool.query('DELETE FROM feature_screenshots WHERE feature_slug = $1 AND slot = $2', [slug, slot])
    res.json({ message: 'Screenshot deleted' })
  } catch (error) { next(error) }
})

// ============================================
// Finance Dashboard
// ============================================

// GET /api/admin/finance - Platform revenue & financial metrics
router.get('/finance', async (req, res, next) => {
  // Helper to run a query safely - returns fallback on error (e.g. missing table/column)
  async function safeQuery(sql, fallbackRows = []) {
    try { return (await pool.query(sql)).rows } catch (e) { console.error('[Finance]', e.message); return fallbackRows }
  }

  try {
    // 1. MRR calculation from active subscriptions
    const mrrRows = await safeQuery(`
      SELECT t.subscription_tier, COUNT(*) as count
      FROM teams t
      WHERE t.subscription_tier IS NOT NULL
        AND t.subscription_tier NOT IN ('free', 'free_trial', 'trial_14d', '')
      GROUP BY t.subscription_tier
    `)

    // 2. Subscription breakdown by tier
    const tierBreakdown = await safeQuery(`
      SELECT
        CASE
          WHEN subscription_tier LIKE 'team_core%' THEN 'Core'
          WHEN subscription_tier LIKE 'team_pro%' THEN 'Pro'
          WHEN subscription_tier LIKE 'academy%' THEN 'Academy'
          WHEN subscription_tier LIKE 'club_starter%' THEN 'School Starter'
          WHEN subscription_tier LIKE 'club_growth%' THEN 'School Growth'
          WHEN subscription_tier LIKE 'club_scale%' THEN 'School Scale'
          ELSE 'Other'
        END as tier_group,
        subscription_tier,
        COUNT(*) as count
      FROM teams
      WHERE subscription_tier IS NOT NULL
        AND subscription_tier NOT IN ('free', 'free_trial', 'trial_14d', '')
      GROUP BY subscription_tier
      ORDER BY count DESC
    `)

    // 3. Subscription activity from subscriptions table
    const subActivityRows = await safeQuery(`
      SELECT
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status = 'active') as active,
        COUNT(*) FILTER (WHERE status = 'cancelled' OR status = 'canceled') as cancelled,
        COUNT(*) FILTER (WHERE status = 'past_due') as past_due,
        COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '30 days') as new_30d,
        COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '7 days') as new_7d,
        COUNT(*) FILTER (WHERE (status = 'cancelled' OR status = 'canceled') AND updated_at > NOW() - INTERVAL '30 days') as churned_30d
      FROM subscriptions
    `, [{}])

    // 4. Credit purchase revenue
    const creditRows = await safeQuery(`
      SELECT COUNT(*) as total_purchases, COALESCE(SUM(credits), 0) as total_credits_sold
      FROM credit_transactions WHERE processed = true
    `, [{}])

    // 5. Monthly subscription growth (last 6 months)
    const monthlyGrowth = await safeQuery(`
      SELECT TO_CHAR(created_at, 'YYYY-MM') as month, COUNT(*) as new_subscriptions
      FROM subscriptions
      WHERE created_at > NOW() - INTERVAL '6 months' AND status != 'trialing'
      GROUP BY TO_CHAR(created_at, 'YYYY-MM')
      ORDER BY month ASC
    `)

    // 6. Monthly team signups (last 6 months)
    const monthlyTeams = await safeQuery(`
      SELECT
        TO_CHAR(created_at, 'YYYY-MM') as month,
        COUNT(*) as new_teams,
        COUNT(*) FILTER (WHERE subscription_tier NOT IN ('free', 'free_trial', 'trial_14d', '') AND subscription_tier IS NOT NULL) as paid_teams
      FROM teams
      WHERE created_at > NOW() - INTERVAL '6 months'
      GROUP BY TO_CHAR(created_at, 'YYYY-MM')
      ORDER BY month ASC
    `)

    // 7. Recent subscription events
    const recentSubscriptions = await safeQuery(`
      SELECT s.id, s.plan_id, s.status, s.provider, s.created_at, s.updated_at,
             t.name as team_name, t.age_group
      FROM subscriptions s LEFT JOIN teams t ON s.team_id = t.id
      ORDER BY s.updated_at DESC LIMIT 20
    `)

    // 8. Video credits purchased (team-level)
    const videoCreditsRows = await safeQuery(`
      SELECT COALESCE(SUM(video_credits), 0) as total_remaining
      FROM teams WHERE video_credits > 0
    `, [{ total_remaining: 0 }])

    // 9. Deep video credits (user-level)
    const deepCreditsRows = await safeQuery(`
      SELECT COALESCE(SUM(deep_video_credits), 0) as total_remaining,
             COUNT(*) FILTER (WHERE deep_video_credits > 0) as users_with_credits
      FROM users
    `, [{ total_remaining: 0, users_with_credits: 0 }])

    // Calculate MRR from plan prices
    const planPrices = {
      team_core_monthly: 999,   team_core_annual: 799,
      team_pro_monthly: 1999,   team_pro_annual: 1599,
      academy_monthly: 2999,    academy_annual: 2499,
      club_starter_monthly: 9900,  club_starter_annual: 8900,
      club_growth_monthly: 19900,  club_growth_annual: 17900,
      club_scale_monthly: 34900,   club_scale_annual: 31900,
    }

    let mrr = 0
    for (const row of mrrRows) {
      mrr += (planPrices[row.subscription_tier] || 0) * parseInt(row.count)
    }

    res.json({
      mrr,
      arr: mrr * 12,
      tierBreakdown,
      subscriptionActivity: subActivityRows[0] || {},
      creditRevenue: creditRows[0] || {},
      monthlyGrowth,
      monthlyTeams,
      recentSubscriptions,
      videoCredits: { totalRemaining: parseInt(videoCreditsRows[0]?.total_remaining || 0) },
      deepVideoCredits: {
        totalRemaining: parseInt(deepCreditsRows[0]?.total_remaining || 0),
        usersWithCredits: parseInt(deepCreditsRows[0]?.users_with_credits || 0),
      },
    })
  } catch (error) {
    next(error)
  }
})

// ============================================
// Demo Reseed (browser-triggerable via /admin/reseed-demo client page)
// ============================================

// Guard against concurrent runs — seeding is expensive.
let reseedInProgress = false

// POST /api/admin/reseed-demo — run the seed. Optional ?wipeOnly=1.
router.post('/reseed-demo', async (req, res) => {
  if (reseedInProgress) {
    return res.status(409).json({ ok: false, error: 'Reseed already in progress' })
  }
  reseedInProgress = true
  const log = []
  const wipeOnly = req.query.wipeOnly === '1' || req.query.wipeOnly === 'true'
  try {
    const result = await runDemoSeed({ wipeOnly, onLog: (msg) => log.push(msg) })
    res.json({ ok: true, log, result })
  } catch (err) {
    console.error('[admin] reseed-demo failed:', err)
    log.push(`[demo-seed] ERROR: ${err.message}`)
    res.status(500).json({ ok: false, log, error: err.message })
  } finally {
    reseedInProgress = false
  }
})

export default router
