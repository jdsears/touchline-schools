import { Router } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { v4 as uuidv4 } from 'uuid'
import pool from '../config/database.js'
import { authenticateToken, isAdminEmail, requireAdmin } from '../middleware/auth.js'
import { sendMagicLinkEmail, sendPasswordResetEmail } from '../services/emailService.js'
import { getFrontendUrl } from '../utils/urlUtils.js'
import { seedFAGuidelines } from '../services/knowledgeBaseService.js'

const router = Router()

// Seed predefined Film Room sections for a new team
async function seedLibrarySections(teamId) {
  const sections = [
    ['Attacking Play',         'attacking-play',       1],
    ['Defending',              'defending',             2],
    ['Set Pieces',             'set-pieces',            3],
    ['Pressing & Intensity',   'pressing-intensity',    4],
    ['Transitions',            'transitions',           5],
    ['Goalkeeper Training',    'goalkeeper-training',   6],
    ['Fitness & Conditioning', 'fitness-conditioning',  7],
    ['Tactics & Formation',    'tactics-formation',     8],
    ['Individual Skills',      'individual-skills',     9],
    ['Team Talks & Mindset',   'team-talks-mindset',   10],
  ]
  for (const [name, slug, order] of sections) {
    const exists = await pool.query(
      'SELECT id FROM library_sections WHERE team_id = $1 AND slug = $2',
      [teamId, slug]
    )
    if (exists.rows.length === 0) {
      await pool.query(
        `INSERT INTO library_sections (team_id, name, slug, is_predefined, display_order)
         VALUES ($1, $2, $3, TRUE, $4)`,
        [teamId, name, slug, order]
      )
    }
  }
}

const JWT_SECRET = process.env.JWT_SECRET
if (!JWT_SECRET) throw new Error('JWT_SECRET environment variable is required')
const JWT_EXPIRES_IN = '30d'

// Helper: generate URL-safe slug
function slugify(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

// Register new user with team (and optionally a school)
router.post('/register', async (req, res, next) => {
  try {
    const {
      name,
      email,
      password,
      teamName,
      ageGroup,
      teamFormat,
      // White-label branding
      hubName,
      primaryColor,
      secondaryColor,
      accentColor,
      faFulltimeUrl,
      logoUrl,
      // Promo code (optional)
      promoCode,
      // School registration (optional)
      accountType,
      clubName,
      dpaAccepted,
      // Timezone
      timezone,
    } = req.body

    // Validate
    if (!name || !email || !password || !teamName) {
      return res.status(400).json({ message: 'All fields are required' })
    }

    // Validate school-specific fields
    if (accountType === 'school') {
      if (!clubName) {
        return res.status(400).json({ message: 'School name is required' })
      }
      if (!dpaAccepted) {
        return res.status(400).json({ message: 'You must accept the Data Processing Agreement to create a school' })
      }
    }

    // Normalize email to lowercase for consistent lookups
    const normalizedEmail = email.toLowerCase().trim()

    // Check if user exists
    const existing = await pool.query('SELECT id FROM users WHERE LOWER(email) = $1', [normalizedEmail])
    if (existing.rows.length > 0) {
      return res.status(400).json({ message: 'Email already registered' })
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10)

    // Create team with branding
    const validFormats = [5, 7, 9, 11]
    const format = validFormats.includes(Number(teamFormat)) ? Number(teamFormat) : 11

    const teamResult = await pool.query(
      `INSERT INTO teams (
        name,
        age_group,
        hub_name,
        primary_color,
        secondary_color,
        accent_color,
        fa_fulltime_url,
        logo_url,
        team_format,
        timezone
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
      [
        teamName,
        ageGroup || 'U13',
        hubName || `${teamName} ${ageGroup || 'U13'} Hub`,
        primaryColor || '#22C55E',
        secondaryColor || '#0F172A',
        accentColor || '#F97316',
        faFulltimeUrl || null,
        logoUrl || null,
        format,
        timezone || 'Europe/London'
      ]
    )
    const team = teamResult.rows[0]

    // Check if email should be auto-granted admin
    const shouldBeAdmin = isAdminEmail(email)

    // Create user (defaults to free plan - no payment required to start)
    const userResult = await pool.query(
      `INSERT INTO users (name, email, password_hash, role, team_id, is_admin)
       VALUES ($1, $2, $3, 'manager', $4, $5) RETURNING id, email, name, role, team_id, is_admin`,
      [name, normalizedEmail, passwordHash, team.id, shouldBeAdmin]
    )
    const user = userResult.rows[0]

    // If school registration, create the school and link the team
    let school = null
    if (accountType === 'school') {
      try {
        // Generate unique slug
        let slug = slugify(clubName)
        const existingSlug = await pool.query('SELECT id FROM schools WHERE slug = $1', [slug])
        if (existingSlug.rows.length > 0) {
          slug = `${slug}-${Date.now().toString(36)}`
        }

        const clubResult = await pool.query(
          `INSERT INTO schools (
            name, slug, contact_email,
            primary_color, secondary_color
          ) VALUES ($1, $2, $3, $4, $5) RETURNING *`,
          [
            clubName,
            slug,
            normalizedEmail,
            primaryColor || '#1a365d',
            secondaryColor || '#38a169',
          ]
        )
        school = clubResult.rows[0]

        // Add creator as school owner with full permissions
        await pool.query(
          `INSERT INTO school_members (school_id, user_id, role, can_manage_payments, can_manage_players, can_view_financials, can_invite_members, joined_at)
           VALUES ($1, $2, 'owner', true, true, true, true, NOW())`,
          [school.id, user.id]
        )

        // Link the team to the school
        await pool.query(
          'UPDATE teams SET school_id = $1 WHERE id = $2',
          [school.id, team.id]
        )

        // Record DPA acceptance
        await pool.query(
          `UPDATE schools SET dpa_accepted_at = NOW(), dpa_accepted_by = $1, dpa_version = '1.0' WHERE id = $2`,
          [user.id, school.id]
        )
        try {
          const ipAddress = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.ip
          await pool.query(
            `INSERT INTO consent_records (user_id, email, consent_type, consent_version, consented, ip_address, user_agent, source)
             VALUES ($1, $2, 'data_processing_agreement', '1.0', true, $3, $4, 'club_registration')`,
            [user.id, normalizedEmail, ipAddress, req.headers['user-agent'] || null]
          )
        } catch { /* consent tables may not exist yet */ }
      } catch (clubError) {
        console.error('School creation during registration failed:', clubError)
        // Don't fail the whole registration - user and team are created
      }
    }

    // Handle promo code redemption if provided
    let promoApplied = null
    if (promoCode) {
      try {
        const promoResult = await pool.query(
          `SELECT * FROM promo_codes
           WHERE UPPER(code) = UPPER($1)
           AND is_active = true
           AND (valid_from IS NULL OR valid_from <= NOW())
           AND (valid_until IS NULL OR valid_until > NOW())
           AND (max_uses IS NULL OR current_uses < max_uses)`,
          [promoCode]
        )
        if (promoResult.rows.length > 0) {
          const promo = promoResult.rows[0]
          // Record the redemption
          await pool.query(
            `INSERT INTO promo_code_redemptions (promo_code_id, user_id, team_id, discount_applied)
             VALUES ($1, $2, $3, $4)
             ON CONFLICT (promo_code_id, user_id) DO NOTHING`,
            [promo.id, user.id, team.id, promo.discount_value]
          )
          // Increment usage count
          await pool.query(
            'UPDATE promo_codes SET current_uses = current_uses + 1 WHERE id = $1',
            [promo.id]
          )
          promoApplied = {
            code: promo.code,
            discount_type: promo.discount_type,
            discount_value: promo.discount_value,
          }
        }
      } catch (promoError) {
        // Don't fail registration if promo redemption fails
        console.error('Promo code redemption error:', promoError)
      }
    }

    // Generate token
    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN })

    // Auto-seed FA development guidelines into the team's knowledge base (non-blocking)
    seedFAGuidelines(team.id, team.age_group).catch(err =>
      console.error('FA guidelines seeding failed (non-critical):', err.message)
    )

    // Seed predefined Film Room sections for the new team (non-blocking)
    seedLibrarySections(team.id).catch(err =>
      console.error('Library sections seeding failed (non-critical):', err.message)
    )

    res.status(201).json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        team_id: user.team_id,
        is_admin: user.is_admin,
        hasFullAccess: true, // Free app - everyone has full access
        subscriptionStatus: user.is_admin ? 'admin' : 'free',
      },
      team: {
        id: team.id,
        name: team.name,
        hub_name: team.hub_name,
        age_group: team.age_group,
        team_format: team.team_format,
        primary_color: team.primary_color,
        secondary_color: team.secondary_color,
        accent_color: team.accent_color,
        logo_url: team.logo_url,
      },
      ...(school ? { school: { id: school.id, slug: school.slug, name: school.name } } : {}),
      ...(promoApplied ? { promoApplied } : {}),
    })
  } catch (error) {
    next(error)
  }
})

// Login
router.post('/login', async (req, res, next) => {
  try {
    const { email, password, teamId } = req.body

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password required' })
    }

    // Normalize email to lowercase for case-insensitive lookup
    const normalizedEmail = email.toLowerCase().trim()

    // Find user
    const result = await pool.query(
      `SELECT u.id, u.email, u.name, u.role, u.team_id, u.pupil_id, u.password_hash, u.is_admin
       FROM users u
       WHERE LOWER(u.email) = $1`,
      [normalizedEmail]
    )

    if (result.rows.length === 0) {
      return res.status(401).json({ message: 'Invalid email or password' })
    }

    const user = result.rows[0]

    // Check password (handle accounts created without password, e.g. magic-link only)
    if (!user.password_hash) {
      return res.status(401).json({ message: 'Invalid email or password. Try using a magic link instead.' })
    }

    const valid = await bcrypt.compare(password, user.password_hash)
    if (!valid) {
      return res.status(401).json({ message: 'Invalid email or password' })
    }

    // Check if email should be admin (sync admin status on login)
    const shouldBeAdmin = isAdminEmail(normalizedEmail)
    if (shouldBeAdmin && !user.is_admin) {
      await pool.query('UPDATE users SET is_admin = true WHERE id = $1', [user.id])
      user.is_admin = true
    }

    // Get all team memberships for this user
    const membershipsResult = await pool.query(
      `SELECT tm.team_id, tm.role, tm.pupil_id, tm.is_primary, t.name as team_name, t.hub_name, t.logo_url
       FROM team_memberships tm
       JOIN teams t ON tm.team_id = t.id
       WHERE tm.user_id = $1
       ORDER BY tm.is_primary DESC, tm.created_at ASC`,
      [user.id]
    )

    const memberships = membershipsResult.rows

    // If user has no memberships in the new table, fall back to users.team_id (legacy support)
    let activeTeamId = teamId
    let activeRole = user.role
    let activePlayerId = user.pupil_id

    if (memberships.length > 0) {
      // If a specific team was requested, use it; otherwise use primary or first membership
      const requestedMembership = teamId
        ? memberships.find(m => m.team_id === teamId)
        : memberships.find(m => m.is_primary) || memberships[0]

      if (requestedMembership) {
        activeTeamId = requestedMembership.team_id
        activeRole = requestedMembership.role
        activePlayerId = requestedMembership.pupil_id
      }
    } else if (user.team_id) {
      // Legacy: use team_id from users table
      activeTeamId = user.team_id
    }

    // Generate token with active team context
    const token = jwt.sign(
      { userId: user.id, teamId: activeTeamId },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    )

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: activeRole,
        team_id: activeTeamId,
        pupil_id: activePlayerId,
        is_admin: user.is_admin,
        hasFullAccess: true, // Free app - everyone has full access
        subscriptionStatus: user.is_admin ? 'admin' : 'free',
      },
      // Include all team memberships so the UI can show team switcher
      teams: memberships.length > 0 ? memberships.map(m => ({
        team_id: m.team_id,
        team_name: m.team_name,
        hub_name: m.hub_name,
        logo_url: m.logo_url,
        role: m.role,
        pupil_id: m.pupil_id,
        is_primary: m.is_primary
      })) : user.team_id ? [{
        team_id: user.team_id,
        role: user.role,
        pupil_id: user.pupil_id,
        is_primary: true
      }] : []
    })
  } catch (error) {
    next(error)
  }
})

// Get current user with all team memberships
router.get('/me', authenticateToken, async (req, res, next) => {
  try {
    // Get all team memberships for this user
    const membershipsResult = await pool.query(
      `SELECT tm.team_id, tm.role, tm.pupil_id, tm.is_primary, t.name as team_name, t.hub_name, t.logo_url
       FROM team_memberships tm
       JOIN teams t ON tm.team_id = t.id
       WHERE tm.user_id = $1
       ORDER BY tm.is_primary DESC, tm.created_at ASC`,
      [req.user.id]
    )

    const memberships = membershipsResult.rows

    // Silent token refresh: if the token is past the halfway mark (>15 days old),
    // issue a fresh 30-day token so PWA sessions stay alive indefinitely
    let refreshedToken = null
    try {
      const authHeader = req.headers['authorization']
      const token = authHeader && authHeader.split(' ')[1]
      if (token) {
        const decoded = jwt.decode(token)
        if (decoded?.iat && decoded?.exp) {
          const totalLifespan = decoded.exp - decoded.iat
          const elapsed = Math.floor(Date.now() / 1000) - decoded.iat
          // Refresh if past halfway point of token lifetime
          if (elapsed > totalLifespan / 2) {
            refreshedToken = jwt.sign(
              { userId: req.user.id, teamId: req.user.team_id },
              JWT_SECRET,
              { expiresIn: JWT_EXPIRES_IN }
            )
          }
        }
      }
    } catch (refreshErr) {
      // Non-critical - just skip the refresh
      console.error('Token refresh failed:', refreshErr.message)
    }

    const response = {
      user: {
        id: req.user.id,
        email: req.user.email,
        name: req.user.name,
        role: req.user.role,
        team_id: req.user.team_id,
        pupil_id: req.user.pupil_id,
        is_admin: req.user.is_admin,
        hasFullAccess: req.user.hasFullAccess,
        subscriptionStatus: req.user.subscriptionStatus,
        has_completed_onboarding: req.user.has_completed_onboarding || false,
      },
      // Include all team memberships so the UI can show team switcher
      teams: memberships.length > 0 ? memberships.map(m => ({
        team_id: m.team_id,
        team_name: m.team_name,
        hub_name: m.hub_name,
        logo_url: m.logo_url,
        role: m.role,
        pupil_id: m.pupil_id,
        is_primary: m.is_primary
      })) : req.user.team_id ? [{
        team_id: req.user.team_id,
        role: req.user.role,
        pupil_id: req.user.pupil_id,
        is_primary: true
      }] : []
    }

    // Include refreshed token if issued
    if (refreshedToken) {
      response.token = refreshedToken
    }

    res.json(response)
  } catch (error) {
    next(error)
  }
})

// Mark onboarding as complete
router.patch('/me/onboarding', authenticateToken, async (req, res, next) => {
  try {
    await pool.query(
      'UPDATE users SET has_completed_onboarding = true WHERE id = $1',
      [req.user.id]
    )
    res.json({ success: true })
  } catch (error) {
    next(error)
  }
})

// Update coaching qualifications on user profile
router.put('/me/qualifications', authenticateToken, async (req, res, next) => {
  try {
    const { qualifications } = req.body

    if (!Array.isArray(qualifications)) {
      return res.status(400).json({ message: 'qualifications must be an array' })
    }

    const result = await pool.query(
      'UPDATE users SET coaching_qualifications = $1, updated_at = NOW() WHERE id = $2 RETURNING id, coaching_qualifications',
      [JSON.stringify(qualifications), req.user.id]
    )

    res.json(result.rows[0])
  } catch (error) {
    next(error)
  }
})

// Get coaching qualifications for current user
router.get('/me/qualifications', authenticateToken, async (req, res, next) => {
  try {
    const result = await pool.query(
      'SELECT coaching_qualifications FROM users WHERE id = $1',
      [req.user.id]
    )

    res.json({ qualifications: result.rows[0]?.coaching_qualifications || [] })
  } catch (error) {
    next(error)
  }
})

// Switch active team context
router.post('/switch-team', authenticateToken, async (req, res, next) => {
  try {
    const { teamId } = req.body

    if (!teamId) {
      return res.status(400).json({ message: 'Team ID is required' })
    }

    // Verify user is a member of this team
    const membershipResult = await pool.query(
      `SELECT tm.team_id, tm.role, tm.pupil_id, t.name as team_name, t.hub_name, t.logo_url
       FROM team_memberships tm
       JOIN teams t ON tm.team_id = t.id
       WHERE tm.user_id = $1 AND tm.team_id = $2`,
      [req.user.id, teamId]
    )

    if (membershipResult.rows.length === 0) {
      // Fallback: check if user.team_id matches (legacy support)
      if (req.user.team_id !== teamId) {
        return res.status(403).json({ message: 'You are not a member of this team' })
      }
    }

    const membership = membershipResult.rows[0]

    // Generate new token with the new team context
    const token = jwt.sign(
      { userId: req.user.id, teamId },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    )

    res.json({
      token,
      user: {
        id: req.user.id,
        email: req.user.email,
        name: req.user.name,
        role: membership ? membership.role : req.user.role,
        team_id: teamId,
        pupil_id: membership ? membership.pupil_id : req.user.pupil_id,
        is_admin: req.user.is_admin,
        hasFullAccess: true,
        subscriptionStatus: req.user.is_admin ? 'admin' : 'free',
      },
      team: membership ? {
        team_id: membership.team_id,
        team_name: membership.team_name,
        hub_name: membership.hub_name,
        logo_url: membership.logo_url,
        role: membership.role
      } : null
    })
  } catch (error) {
    next(error)
  }
})

// Grant admin access (admin only)
router.post('/admin/grant', authenticateToken, requireAdmin, async (req, res, next) => {
  try {
    const { email } = req.body

    if (!email) {
      return res.status(400).json({ message: 'Email is required' })
    }

    const result = await pool.query(
      'UPDATE users SET is_admin = true WHERE email = $1 RETURNING id, email, name',
      [email]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'User not found' })
    }

    res.json({ message: 'Admin access granted', user: result.rows[0] })
  } catch (error) {
    next(error)
  }
})

// Revoke admin access (admin only)
router.post('/admin/revoke', authenticateToken, requireAdmin, async (req, res, next) => {
  try {
    const { email } = req.body

    if (!email) {
      return res.status(400).json({ message: 'Email is required' })
    }

    // Prevent revoking your own admin
    if (email.toLowerCase() === req.user.email.toLowerCase()) {
      return res.status(400).json({ message: 'Cannot revoke your own admin access' })
    }

    const result = await pool.query(
      'UPDATE users SET is_admin = false WHERE email = $1 RETURNING id, email, name',
      [email]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'User not found' })
    }

    res.json({ message: 'Admin access revoked', user: result.rows[0] })
  } catch (error) {
    next(error)
  }
})

// Send magic link
router.post('/magic-link', async (req, res, next) => {
  try {
    const { email } = req.body
    const normalizedEmail = email.toLowerCase().trim()

    const result = await pool.query('SELECT id FROM users WHERE LOWER(email) = $1', [normalizedEmail])

    if (result.rows.length === 0) {
      // Don't reveal if user exists - still return success
      return res.json({ message: 'If this email exists, a magic link will be sent' })
    }

    const token = uuidv4()
    const expires = new Date(Date.now() + 15 * 60 * 1000) // 15 minutes

    await pool.query(
      'UPDATE users SET magic_link_token = $1, magic_link_expires = $2 WHERE LOWER(email) = $3',
      [token, expires, normalizedEmail]
    )

    const frontendUrl = getFrontendUrl()
    const magicLinkUrl = `${frontendUrl}/magic/${token}`

    // Send magic link email
    const emailResult = await sendMagicLinkEmail(email, { magicLinkUrl })

    if (!emailResult.success) {
      console.error(`Failed to send magic link to ${email}:`, emailResult.error || emailResult.reason)
      // Still log for debugging in case email service is down
      console.log(`Magic link for ${email}: ${magicLinkUrl}`)

      if (emailResult.reason === 'Email not configured') {
        return res.status(500).json({ message: 'Email service not configured. Please contact support.' })
      }
      return res.status(500).json({ message: 'Failed to send magic link. Please try again.' })
    }

    console.log(`Magic link sent to ${email}`)
    res.json({ message: 'If this email exists, a magic link will be sent' })
  } catch (error) {
    next(error)
  }
})

// Verify magic link
router.post('/magic-link/verify', async (req, res, next) => {
  try {
    const { token } = req.body

    const result = await pool.query(
      `SELECT id, email, name, role, team_id, pupil_id, is_admin FROM users
       WHERE magic_link_token = $1 AND magic_link_expires > NOW()`,
      [token]
    )

    if (result.rows.length === 0) {
      return res.status(400).json({ message: 'Invalid or expired link' })
    }

    const user = result.rows[0]

    // Clear magic link
    await pool.query(
      'UPDATE users SET magic_link_token = NULL, magic_link_expires = NULL WHERE id = $1',
      [user.id]
    )

    // Get team memberships (same as login endpoint)
    const membershipsResult = await pool.query(
      `SELECT tm.team_id, tm.role, tm.pupil_id, tm.is_primary, t.name as team_name, t.hub_name, t.logo_url
       FROM team_memberships tm
       JOIN teams t ON tm.team_id = t.id
       WHERE tm.user_id = $1
       ORDER BY tm.is_primary DESC, tm.created_at ASC`,
      [user.id]
    )
    const memberships = membershipsResult.rows

    // Determine active team context
    let activeTeamId = user.team_id
    let activeRole = user.role
    let activePlayerId = user.pupil_id

    if (memberships.length > 0) {
      const primaryMembership = memberships.find(m => m.is_primary) || memberships[0]
      activeTeamId = primaryMembership.team_id
      activeRole = primaryMembership.role
      activePlayerId = primaryMembership.pupil_id
    }

    // Generate token with team context
    const jwtToken = jwt.sign(
      { userId: user.id, teamId: activeTeamId },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    )

    res.json({
      token: jwtToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: activeRole,
        team_id: activeTeamId,
        pupil_id: activePlayerId,
        is_admin: user.is_admin,
        hasFullAccess: true,
        subscriptionStatus: user.is_admin ? 'admin' : 'free',
      },
      teams: memberships.length > 0 ? memberships.map(m => ({
        team_id: m.team_id,
        team_name: m.team_name,
        hub_name: m.hub_name,
        logo_url: m.logo_url,
        role: m.role,
        pupil_id: m.pupil_id,
        is_primary: m.is_primary
      })) : user.team_id ? [{
        team_id: user.team_id,
        role: user.role,
        pupil_id: user.pupil_id,
        is_primary: true
      }] : []
    })
  } catch (error) {
    next(error)
  }
})

// Request password reset
router.post('/forgot-password', async (req, res, next) => {
  try {
    const { email } = req.body
    if (!email) return res.status(400).json({ message: 'Email is required' })

    const normalizedEmail = email.toLowerCase().trim()

    const result = await pool.query('SELECT id FROM users WHERE LOWER(email) = $1', [normalizedEmail])

    if (result.rows.length === 0) {
      // Don't reveal if user exists
      return res.json({ message: 'If this email exists, a password reset link will be sent' })
    }

    const token = uuidv4()
    const expires = new Date(Date.now() + 60 * 60 * 1000) // 1 hour

    // Reuse magic_link columns for password reset
    await pool.query(
      'UPDATE users SET magic_link_token = $1, magic_link_expires = $2 WHERE LOWER(email) = $3',
      [token, expires, normalizedEmail]
    )

    const frontendUrl = getFrontendUrl()
    const resetUrl = `${frontendUrl}/reset-password/${token}`

    const emailResult = await sendPasswordResetEmail(email, { resetUrl })

    if (!emailResult.success) {
      console.error(`Failed to send password reset to ${email}:`, emailResult.error || emailResult.reason)
      console.log(`Password reset link for ${email}: ${resetUrl}`)

      if (emailResult.reason === 'Email not configured') {
        return res.status(500).json({ message: 'Email service not configured. Please contact support.' })
      }
      return res.status(500).json({ message: 'Failed to send reset email. Please try again.' })
    }

    console.log(`Password reset sent to ${email}`)
    res.json({ message: 'If this email exists, a password reset link will be sent' })
  } catch (error) {
    next(error)
  }
})

// Reset password with token
router.post('/reset-password', async (req, res, next) => {
  try {
    const { token, password } = req.body
    if (!token || !password) return res.status(400).json({ message: 'Token and password are required' })
    if (password.length < 8) return res.status(400).json({ message: 'Password must be at least 8 characters' })

    const result = await pool.query(
      `SELECT id, email FROM users
       WHERE magic_link_token = $1 AND magic_link_expires > NOW()`,
      [token]
    )

    if (result.rows.length === 0) {
      return res.status(400).json({ message: 'Invalid or expired reset link. Please request a new one.' })
    }

    const user = result.rows[0]
    const passwordHash = await bcrypt.hash(password, 10)

    await pool.query(
      'UPDATE users SET password_hash = $1, magic_link_token = NULL, magic_link_expires = NULL WHERE id = $2',
      [passwordHash, user.id]
    )

    res.json({ message: 'Password has been reset. You can now sign in.' })
  } catch (error) {
    next(error)
  }
})

// Get invite details
router.get('/invite/:token', async (req, res, next) => {
  try {
    const { token } = req.params

    const result = await pool.query(
      `SELECT i.*, t.name as team_name, p.name as player_name
       FROM invites i
       JOIN teams t ON i.team_id = t.id
       LEFT JOIN pupils p ON i.pupil_id = p.id
       WHERE i.token = $1 AND i.expires_at > NOW() AND i.accepted_at IS NULL`,
      [token]
    )

    if (result.rows.length === 0) {
      return res.status(400).json({ message: 'Invalid or expired invite' })
    }

    const invite = result.rows[0]

    res.json({
      email: invite.email,
      role: invite.role,
      team_name: invite.team_name,
      player_name: invite.player_name,
      pupil_id: invite.pupil_id,
    })
  } catch (error) {
    next(error)
  }
})

// Accept invite
router.post('/invite/accept', async (req, res, next) => {
  try {
    const { token, password, name } = req.body

    const inviteResult = await pool.query(
      `SELECT i.*, t.name as team_name
       FROM invites i
       JOIN teams t ON i.team_id = t.id
       WHERE i.token = $1 AND i.expires_at > NOW() AND i.accepted_at IS NULL`,
      [token]
    )

    if (inviteResult.rows.length === 0) {
      return res.status(400).json({ message: 'Invalid or expired invite' })
    }

    const invite = inviteResult.rows[0]

    // Check if user already exists with this email
    const existingUserResult = await pool.query(
      'SELECT id, email, name, role, team_id, pupil_id, is_admin FROM users WHERE LOWER(email) = $1',
      [invite.email.toLowerCase().trim()]
    )

    let user

    if (existingUserResult.rows.length > 0) {
      // User already exists - check if they're already a member of this team
      const existingUser = existingUserResult.rows[0]

      const existingMembershipResult = await pool.query(
        'SELECT id FROM team_memberships WHERE user_id = $1 AND team_id = $2',
        [existingUser.id, invite.team_id]
      )

      if (existingMembershipResult.rows.length > 0) {
        return res.status(400).json({ message: 'You are already a member of this team' })
      }

      // Add team membership for existing user
      await pool.query(
        `INSERT INTO team_memberships (user_id, team_id, role, pupil_id, is_primary)
         VALUES ($1, $2, $3, $4, false)`,
        [existingUser.id, invite.team_id, invite.role, invite.pupil_id || null]
      )

      // Return user with the new team context
      user = {
        id: existingUser.id,
        email: existingUser.email,
        name: existingUser.name,
        role: invite.role,
        team_id: invite.team_id,
        pupil_id: invite.pupil_id || null,
        is_admin: existingUser.is_admin
      }
    } else {
      // New user - create account
      const passwordHash = await bcrypt.hash(password, 10)

      const userResult = await pool.query(
        `INSERT INTO users (name, email, password_hash, role, team_id, pupil_id)
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, email, name, role, team_id, pupil_id, is_admin`,
        [
          name || invite.email.split('@')[0],
          invite.email,
          passwordHash,
          invite.role,
          invite.team_id,
          invite.pupil_id || null
        ]
      )
      user = userResult.rows[0]

      // Create primary team membership for new user
      await pool.query(
        `INSERT INTO team_memberships (user_id, team_id, role, pupil_id, is_primary)
         VALUES ($1, $2, $3, $4, true)`,
        [user.id, invite.team_id, invite.role, invite.pupil_id || null]
      )
    }

    // Mark invite as accepted
    await pool.query(
      'UPDATE invites SET accepted_at = NOW() WHERE id = $1',
      [invite.id]
    )

    // Generate token with team context
    const jwtToken = jwt.sign(
      { userId: user.id, teamId: invite.team_id },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    )

    res.json({
      token: jwtToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: invite.role,
        team_id: invite.team_id,
        pupil_id: invite.pupil_id || null,
        is_admin: user.is_admin || false,
        hasFullAccess: true,
        subscriptionStatus: user.is_admin ? 'admin' : 'free',
      },
      teams: [{
        team_id: invite.team_id,
        team_name: invite.team_name,
        role: invite.role,
        pupil_id: invite.pupil_id || null,
        is_primary: true
      }]
    })
  } catch (error) {
    next(error)
  }
})

export default router
