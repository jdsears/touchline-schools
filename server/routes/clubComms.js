import { Router } from 'express'
import crypto from 'crypto'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import pool from '../config/database.js'
import { authenticateToken } from '../middleware/auth.js'
import { loadClub, requireClubRole } from '../middleware/clubAuth.js'
import { sendNotificationEmail, isEmailEnabled, sendBatchEmails } from '../services/emailService.js'
import { getFrontendUrl } from '../utils/urlUtils.js'

const JWT_SECRET = process.env.JWT_SECRET
if (!JWT_SECRET) throw new Error('JWT_SECRET environment variable is required')
const JWT_EXPIRES_IN = '7d'

const router = Router()

// Auto-populate player parent_contact from guardian details when an invite is accepted
async function syncGuardianToPlayerContacts(guardianId) {
  try {
    // Get guardian details and linked players
    const result = await pool.query(
      `SELECT g.first_name, g.last_name, g.email, g.phone, g.relationship,
              pg.player_id, p.parent_contact
       FROM guardians g
       JOIN player_guardians pg ON pg.guardian_id = g.id
       JOIN players p ON pg.player_id = p.id
       WHERE g.id = $1`,
      [guardianId]
    )
    if (result.rows.length === 0) return

    const guardian = result.rows[0]
    const contactName = `${guardian.first_name} ${guardian.last_name}`.trim()
    const contactEmail = guardian.email?.toLowerCase()

    for (const row of result.rows) {
      // Parse existing contacts
      let contacts = []
      if (row.parent_contact) {
        try {
          contacts = typeof row.parent_contact === 'string'
            ? JSON.parse(row.parent_contact)
            : Array.isArray(row.parent_contact) ? row.parent_contact : [row.parent_contact]
        } catch { contacts = [] }
      }

      // Skip if guardian email already exists in contacts
      const alreadyExists = contacts.some(c =>
        c.email && c.email.toLowerCase() === contactEmail
      )
      if (alreadyExists) continue

      contacts.push({
        name: contactName,
        email: guardian.email || '',
        phone: guardian.phone || '',
      })

      await pool.query(
        'UPDATE players SET parent_contact = $1, updated_at = NOW() WHERE id = $2',
        [JSON.stringify(contacts), row.player_id]
      )
    }
  } catch (err) {
    console.error('Failed to sync guardian contacts to player:', err.message)
  }
}

// ==========================================
// CLUB ANNOUNCEMENTS
// ==========================================

// List club announcements
router.get('/:clubId/announcements', authenticateToken, loadClub, requireClubRole('owner', 'admin', 'treasurer', 'secretary', 'coach'), async (req, res, next) => {
  try {
    const { clubId } = req.params
    const { limit = 30, include_expired } = req.query

    let query = `
      SELECT ca.*, u.name as created_by_name
      FROM club_announcements ca
      LEFT JOIN users u ON ca.created_by = u.id
      WHERE ca.club_id = $1
    `
    if (!include_expired) {
      query += ' AND (ca.expires_at IS NULL OR ca.expires_at > NOW())'
    }
    query += ' ORDER BY ca.is_pinned DESC, ca.created_at DESC LIMIT $2'

    const result = await pool.query(query, [clubId, parseInt(limit)])
    res.json(result.rows)
  } catch (error) {
    next(error)
  }
})

// Create club announcement
router.post('/:clubId/announcements', authenticateToken, loadClub, requireClubRole('owner', 'admin', 'secretary'), async (req, res, next) => {
  try {
    const { clubId } = req.params
    const club = req.club
    const {
      title, content, priority, is_pinned,
      target_type, target_team_ids, expires_at,
      send_email,
    } = req.body

    if (!title || !content) {
      return res.status(400).json({ error: 'Title and content are required' })
    }

    const result = await pool.query(
      `INSERT INTO club_announcements (
        club_id, created_by, title, content, priority, is_pinned,
        target_type, target_team_ids, expires_at
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
      RETURNING *`,
      [
        clubId, req.user.id, title, content,
        priority || 'normal', is_pinned || false,
        target_type || 'all_parents',
        target_team_ids || '{}',
        expires_at || null,
      ]
    )

    const announcement = result.rows[0]

    // Send emails to targeted guardians
    if (send_email && isEmailEnabled()) {
      try {
        let guardians
        if (target_type === 'specific_teams' && target_team_ids?.length > 0) {
          // Get guardians for specific teams
          guardians = await pool.query(
            `SELECT DISTINCT g.email, g.first_name, g.notification_preferences
             FROM guardians g
             JOIN player_guardians pg ON pg.guardian_id = g.id
             JOIN players p ON pg.player_id = p.id
             WHERE g.club_id = $1 AND p.team_id = ANY($2)`,
            [clubId, target_team_ids]
          )
        } else {
          // All guardians in the club
          guardians = await pool.query(
            `SELECT DISTINCT g.email, g.first_name, g.notification_preferences
             FROM guardians g
             WHERE g.club_id = $1`,
            [clubId]
          )
        }

        const batchEmails = []
        for (const guardian of guardians.rows) {
          const prefs = guardian.notification_preferences || { announcements: true }
          if (prefs.announcements === false) continue
          batchEmails.push({
            to: guardian.email,
            template: 'notification',
            data: {
              teamName: club.name,
              title,
              message: content.length > 500 ? content.substring(0, 500) + '...' : content,
              actionLink: `${getFrontendUrl()}/club/${club.slug}`,
              actionText: 'View Details',
            }
          })
        }
        const { sent: emailCount } = await sendBatchEmails(batchEmails)

        // Update announcement with email tracking
        await pool.query(
          'UPDATE club_announcements SET email_sent = true, email_count = $1, email_sent_at = NOW() WHERE id = $2',
          [emailCount, announcement.id]
        )

        // Log communication
        await pool.query(
          `INSERT INTO club_comms_log (club_id, sent_by, type, subject, message, recipient_count, target_type, target_team_ids, announcement_id)
           VALUES ($1,$2,'announcement',$3,$4,$5,$6,$7,$8)`,
          [clubId, req.user.id, title, content, emailCount, target_type || 'all_parents', target_team_ids || '{}', announcement.id]
        )

        announcement.email_sent = true
        announcement.email_count = emailCount
      } catch (emailErr) {
        console.error('Bulk email error:', emailErr)
      }
    }

    announcement.created_by_name = req.user.name
    res.status(201).json(announcement)
  } catch (error) {
    next(error)
  }
})

// Update club announcement
router.put('/:clubId/announcements/:announcementId', authenticateToken, loadClub, requireClubRole('owner', 'admin', 'secretary'), async (req, res, next) => {
  try {
    const { clubId, announcementId } = req.params
    const { title, content, priority, is_pinned, expires_at } = req.body

    const result = await pool.query(
      `UPDATE club_announcements SET
        title = COALESCE($1, title),
        content = COALESCE($2, content),
        priority = COALESCE($3, priority),
        is_pinned = COALESCE($4, is_pinned),
        expires_at = $5,
        updated_at = NOW()
      WHERE id = $6 AND club_id = $7 RETURNING *`,
      [title, content, priority, is_pinned, expires_at, announcementId, clubId]
    )

    if (result.rows.length === 0) return res.status(404).json({ error: 'Announcement not found' })
    res.json(result.rows[0])
  } catch (error) {
    next(error)
  }
})

// Delete club announcement
router.delete('/:clubId/announcements/:announcementId', authenticateToken, loadClub, requireClubRole('owner', 'admin', 'secretary'), async (req, res, next) => {
  try {
    const { clubId, announcementId } = req.params
    await pool.query('DELETE FROM club_announcements WHERE id = $1 AND club_id = $2', [announcementId, clubId])
    res.json({ message: 'Deleted' })
  } catch (error) {
    next(error)
  }
})

// ==========================================
// BULK COMMUNICATIONS
// ==========================================

// Send bulk email to parents/guardians
router.post('/:clubId/send-to-parents', authenticateToken, loadClub, requireClubRole('owner', 'admin', 'secretary'), async (req, res, next) => {
  try {
    const { clubId } = req.params
    const club = req.club
    const { subject, message, target_type, target_team_ids } = req.body

    if (!subject || !message) {
      return res.status(400).json({ error: 'Subject and message are required' })
    }

    if (!isEmailEnabled()) {
      return res.status(503).json({ error: 'Email service not configured' })
    }

    let guardians
    if (target_type === 'specific_teams' && target_team_ids?.length > 0) {
      guardians = await pool.query(
        `SELECT DISTINCT g.email, g.first_name, g.notification_preferences
         FROM guardians g
         JOIN player_guardians pg ON pg.guardian_id = g.id
         JOIN players p ON pg.player_id = p.id
         WHERE g.club_id = $1 AND p.team_id = ANY($2)`,
        [clubId, target_team_ids]
      )
    } else {
      guardians = await pool.query(
        'SELECT DISTINCT email, first_name, notification_preferences FROM guardians WHERE club_id = $1',
        [clubId]
      )
    }

    const batchEmails = guardians.rows.map(guardian => ({
      to: guardian.email,
      template: 'notification',
      data: {
        teamName: club.name,
        title: subject,
        message,
        actionLink: `${getFrontendUrl()}/club/${club.slug}`,
        actionText: 'View Details',
      }
    }))
    const { sent: emailCount } = await sendBatchEmails(batchEmails)

    // Log communication
    await pool.query(
      `INSERT INTO club_comms_log (club_id, sent_by, type, subject, message, recipient_count, target_type, target_team_ids)
       VALUES ($1,$2,'bulk_email',$3,$4,$5,$6,$7)`,
      [clubId, req.user.id, subject, message, emailCount, target_type || 'all_parents', target_team_ids || '{}']
    )

    res.json({ sent: emailCount, total: guardians.rows.length })
  } catch (error) {
    next(error)
  }
})

// Get communication history
router.get('/:clubId/comms-log', authenticateToken, loadClub, requireClubRole('owner', 'admin', 'secretary', 'treasurer'), async (req, res, next) => {
  try {
    const { clubId } = req.params
    const { limit = 20 } = req.query

    const result = await pool.query(
      `SELECT cl.*, u.name as sent_by_name
       FROM club_comms_log cl
       LEFT JOIN users u ON cl.sent_by = u.id
       WHERE cl.club_id = $1
       ORDER BY cl.created_at DESC
       LIMIT $2`,
      [clubId, parseInt(limit)]
    )

    res.json(result.rows)
  } catch (error) {
    next(error)
  }
})

// ==========================================
// GUARDIAN ACCOUNT LINKING
// ==========================================

// Send invite link to guardian to claim their account
router.post('/:clubId/guardians/:guardianId/invite', authenticateToken, loadClub, requireClubRole('owner', 'admin', 'secretary'), async (req, res, next) => {
  try {
    const { clubId, guardianId } = req.params
    const club = req.club

    const guardian = await pool.query(
      'SELECT * FROM guardians WHERE id = $1 AND club_id = $2',
      [guardianId, clubId]
    )
    if (guardian.rows.length === 0) return res.status(404).json({ error: 'Guardian not found' })

    const g = guardian.rows[0]

    // Check if already linked
    if (g.user_id) {
      return res.status(400).json({ error: 'Guardian already has a linked account' })
    }

    // Generate invite token
    const token = crypto.randomBytes(32).toString('hex')
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days

    // Expire any existing pending invites for this guardian
    await pool.query(
      "UPDATE guardian_invites SET status = 'expired' WHERE guardian_id = $1 AND status = 'pending'",
      [guardianId]
    )

    await pool.query(
      `INSERT INTO guardian_invites (club_id, guardian_id, email, token, expires_at)
       VALUES ($1,$2,$3,$4,$5)`,
      [clubId, guardianId, g.email, token, expiresAt]
    )

    // Send invite email
    if (isEmailEnabled()) {
      const inviteUrl = `${getFrontendUrl()}/guardian-invite/${token}`
      await sendNotificationEmail(g.email, {
        teamName: club.name,
        title: `You're invited to join ${club.name}`,
        message: `${club.name} has invited you to create a parent account on Touchline. You'll be able to view your children's schedules, pay subscriptions, and receive club announcements.`,
        actionLink: inviteUrl,
        actionText: 'Create My Account',
      })
    }

    res.json({ message: 'Invite sent', token })
  } catch (error) {
    next(error)
  }
})

// Bulk invite all guardians in a club
router.post('/:clubId/guardians/invite-all', authenticateToken, loadClub, requireClubRole('owner', 'admin'), async (req, res, next) => {
  try {
    const { clubId } = req.params
    const club = req.club

    // Get all unlinked guardians
    const guardians = await pool.query(
      'SELECT * FROM guardians WHERE club_id = $1 AND user_id IS NULL',
      [clubId]
    )

    let sentCount = 0
    for (const g of guardians.rows) {
      const token = crypto.randomBytes(32).toString('hex')
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)

      try {
        await pool.query(
          `INSERT INTO guardian_invites (club_id, guardian_id, email, token, expires_at)
           VALUES ($1,$2,$3,$4,$5)`,
          [clubId, g.id, g.email, token, expiresAt]
        )

        if (isEmailEnabled()) {
          const inviteUrl = `${getFrontendUrl()}/guardian-invite/${token}`
          await sendNotificationEmail(g.email, {
            teamName: club.name,
            title: `You're invited to join ${club.name}`,
            message: `${club.name} has invited you to create a parent account on Touchline. View schedules, manage payments, and stay in the loop.`,
            actionLink: inviteUrl,
            actionText: 'Create My Account',
          })
          sentCount++
        }
      } catch (err) {
        console.error(`Failed to invite guardian ${g.email}:`, err.message)
      }
    }

    // Log communication
    await pool.query(
      `INSERT INTO club_comms_log (club_id, sent_by, type, subject, recipient_count, target_type)
       VALUES ($1,$2,'guardian_invite','Parent Account Invitations',$3,'all_parents')`,
      [clubId, req.user.id, sentCount]
    )

    res.json({ sent: sentCount, total: guardians.rows.length })
  } catch (error) {
    next(error)
  }
})

// Claim guardian invite (public, no auth — or with auth to link)
router.get('/guardian-invite/:token', async (req, res, next) => {
  try {
    const { token } = req.params

    const result = await pool.query(
      `SELECT gi.*, g.first_name, g.last_name, g.email, g.user_id as already_linked,
              c.name as club_name, c.slug as club_slug, c.primary_color
       FROM guardian_invites gi
       JOIN guardians g ON gi.guardian_id = g.id
       JOIN clubs c ON gi.club_id = c.id
       WHERE gi.token = $1`,
      [token]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Invite not found or expired' })
    }

    const invite = result.rows[0]

    if (invite.status === 'claimed') {
      return res.json({ status: 'already_claimed', club_name: invite.club_name })
    }

    if (new Date(invite.expires_at) < new Date()) {
      return res.json({ status: 'expired', club_name: invite.club_name })
    }

    if (invite.already_linked) {
      return res.json({ status: 'already_linked', club_name: invite.club_name })
    }

    res.json({
      status: 'valid',
      guardian_name: `${invite.first_name} ${invite.last_name}`,
      email: invite.email,
      club_name: invite.club_name,
      club_slug: invite.club_slug,
      club_color: invite.primary_color,
    })
  } catch (error) {
    next(error)
  }
})

// Claim guardian invite — link user to guardian
router.post('/guardian-invite/:token/claim', authenticateToken, async (req, res, next) => {
  try {
    const { token } = req.params
    const userId = req.user.id

    const result = await pool.query(
      `SELECT gi.*, g.club_id
       FROM guardian_invites gi
       JOIN guardians g ON gi.guardian_id = g.id
       WHERE gi.token = $1 AND gi.status = 'pending' AND gi.expires_at > NOW()`,
      [token]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Invite not found, expired, or already claimed' })
    }

    const invite = result.rows[0]

    // Link guardian to user
    await pool.query('UPDATE guardians SET user_id = $1 WHERE id = $2', [userId, invite.guardian_id])

    // Mark invite as claimed
    await pool.query(
      "UPDATE guardian_invites SET status = 'claimed', claimed_by = $1, claimed_at = NOW() WHERE id = $2",
      [userId, invite.id]
    )

    // Ensure user has 'parent' role if they don't already
    const userRes = await pool.query('SELECT role FROM users WHERE id = $1', [userId])
    if (userRes.rows[0]?.role === 'parent' || userRes.rows[0]?.role === 'player') {
      // Already appropriate role
    } else {
      // Don't downgrade managers/coaches — they can also be parents
    }

    // Add user to club as parent member (if not already)
    const existingMember = await pool.query(
      'SELECT id FROM club_members WHERE club_id = $1 AND user_id = $2',
      [invite.club_id, userId]
    )
    if (existingMember.rows.length === 0) {
      await pool.query(
        `INSERT INTO club_members (club_id, user_id, role, is_parent)
         VALUES ($1, $2, 'parent', true)`,
        [invite.club_id, userId]
      )
    }

    // Auto-populate player's parent_contact from guardian details
    await syncGuardianToPlayerContacts(invite.guardian_id)

    res.json({ message: 'Account linked successfully' })
  } catch (error) {
    next(error)
  }
})

// Register new parent account via guardian invite (no auth required)
router.post('/guardian-invite/:token/register', async (req, res, next) => {
  try {
    const { token } = req.params
    const { name, password } = req.body

    if (!name || !password || password.length < 8) {
      return res.status(400).json({ error: 'Name and password (min 8 chars) are required' })
    }

    // Look up the invite
    const inviteResult = await pool.query(
      `SELECT gi.*, g.email, g.first_name, g.last_name, g.club_id, g.user_id as already_linked,
              c.name as club_name
       FROM guardian_invites gi
       JOIN guardians g ON gi.guardian_id = g.id
       JOIN clubs c ON gi.club_id = c.id
       WHERE gi.token = $1 AND gi.status = 'pending' AND gi.expires_at > NOW()`,
      [token]
    )

    if (inviteResult.rows.length === 0) {
      return res.status(404).json({ error: 'Invite not found, expired, or already claimed' })
    }

    const invite = inviteResult.rows[0]

    if (invite.already_linked) {
      return res.status(400).json({ error: 'This invite has already been linked to an account' })
    }

    // Check if a user with this email already exists
    const existingUser = await pool.query(
      'SELECT id FROM users WHERE LOWER(email) = $1',
      [invite.email.toLowerCase().trim()]
    )
    if (existingUser.rows.length > 0) {
      return res.status(400).json({ error: 'An account with this email already exists. Please log in instead.' })
    }

    // Create parent user (no team creation — parents don't own teams)
    const passwordHash = await bcrypt.hash(password, 10)
    const userResult = await pool.query(
      `INSERT INTO users (name, email, password_hash, role)
       VALUES ($1, $2, $3, 'parent') RETURNING id, email, name, role, is_admin`,
      [name, invite.email.toLowerCase().trim(), passwordHash]
    )
    const user = userResult.rows[0]

    // Link guardian to user
    await pool.query('UPDATE guardians SET user_id = $1 WHERE id = $2', [user.id, invite.guardian_id])

    // Mark invite as claimed
    await pool.query(
      "UPDATE guardian_invites SET status = 'claimed', claimed_by = $1, claimed_at = NOW() WHERE id = $2",
      [user.id, invite.id]
    )

    // Add user to club as parent member
    await pool.query(
      `INSERT INTO club_members (club_id, user_id, role, is_parent)
       VALUES ($1, $2, 'parent', true)
       ON CONFLICT (club_id, user_id) DO NOTHING`,
      [invite.club_id, user.id]
    )

    // Auto-populate player's parent_contact from guardian details
    await syncGuardianToPlayerContacts(invite.guardian_id)

    // Generate JWT
    const jwtToken = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN })

    res.status(201).json({
      token: jwtToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: 'parent',
        is_admin: false,
        hasFullAccess: true,
      },
      club_name: invite.club_name,
    })
  } catch (error) {
    next(error)
  }
})

export default router
