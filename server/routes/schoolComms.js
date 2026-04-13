import { Router } from 'express'
import crypto from 'crypto'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import pool from '../config/database.js'
import { authenticateToken } from '../middleware/auth.js'
import { loadSchool, requireSchoolRole } from '../middleware/schoolAuth.js'
import { sendNotificationEmail, isEmailEnabled, sendBatchEmails } from '../services/emailService.js'
import { getFrontendUrl } from '../utils/urlUtils.js'

const JWT_SECRET = process.env.JWT_SECRET
if (!JWT_SECRET) throw new Error('JWT_SECRET environment variable is required')
const JWT_EXPIRES_IN = '7d'

const router = Router()

// Auto-populate pupil parent_contact from guardian details when an invite is accepted
async function syncGuardianToPlayerContacts(guardianId) {
  try {
    // Get guardian details and linked pupils
    const result = await pool.query(
      `SELECT g.first_name, g.last_name, g.email, g.phone, g.relationship,
              pg.pupil_id, p.parent_contact
       FROM guardians g
       JOIN pupil_guardians pg ON pg.guardian_id = g.id
       JOIN pupils p ON pg.pupil_id = p.id
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
        'UPDATE pupils SET parent_contact = $1, updated_at = NOW() WHERE id = $2',
        [JSON.stringify(contacts), row.pupil_id]
      )
    }
  } catch (err) {
    console.error('Failed to sync guardian contacts to pupil:', err.message)
  }
}

// ==========================================
// CLUB ANNOUNCEMENTS
// ==========================================

// List school announcements
router.get('/:schoolId/announcements', authenticateToken, loadSchool, requireSchoolRole('owner', 'admin', 'treasurer', 'secretary', 'coach'), async (req, res, next) => {
  try {
    const { schoolId } = req.params
    const { limit = 30, include_expired } = req.query

    let query = `
      SELECT ca.*, u.name as created_by_name
      FROM school_announcements ca
      LEFT JOIN users u ON ca.created_by = u.id
      WHERE ca.school_id = $1
    `
    if (!include_expired) {
      query += ' AND (ca.expires_at IS NULL OR ca.expires_at > NOW())'
    }
    query += ' ORDER BY ca.is_pinned DESC, ca.created_at DESC LIMIT $2'

    const result = await pool.query(query, [schoolId, parseInt(limit)])
    res.json(result.rows)
  } catch (error) {
    next(error)
  }
})

// Create school announcement
router.post('/:schoolId/announcements', authenticateToken, loadSchool, requireSchoolRole('owner', 'admin', 'secretary'), async (req, res, next) => {
  try {
    const { schoolId } = req.params
    const school = req.school
    const {
      title, content, priority, is_pinned,
      target_type, target_team_ids, expires_at,
      send_email,
    } = req.body

    if (!title || !content) {
      return res.status(400).json({ error: 'Title and content are required' })
    }

    const result = await pool.query(
      `INSERT INTO school_announcements (
        school_id, created_by, title, content, priority, is_pinned,
        target_type, target_team_ids, expires_at
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
      RETURNING *`,
      [
        schoolId, req.user.id, title, content,
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
             JOIN pupil_guardians pg ON pg.guardian_id = g.id
             JOIN pupils p ON pg.pupil_id = p.id
             WHERE g.school_id = $1 AND p.team_id = ANY($2)`,
            [schoolId, target_team_ids]
          )
        } else {
          // All guardians in the school
          guardians = await pool.query(
            `SELECT DISTINCT g.email, g.first_name, g.notification_preferences
             FROM guardians g
             WHERE g.school_id = $1`,
            [schoolId]
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
              teamName: school.name,
              title,
              message: content.length > 500 ? content.substring(0, 500) + '...' : content,
              actionLink: `${getFrontendUrl()}/school/${school.slug}`,
              actionText: 'View Details',
            }
          })
        }
        const { sent: emailCount } = await sendBatchEmails(batchEmails)

        // Update announcement with email tracking
        await pool.query(
          'UPDATE school_announcements SET email_sent = true, email_count = $1, email_sent_at = NOW() WHERE id = $2',
          [emailCount, announcement.id]
        )

        // Log communication
        await pool.query(
          `INSERT INTO school_comms_log (school_id, sent_by, type, subject, message, recipient_count, target_type, target_team_ids, announcement_id)
           VALUES ($1,$2,'announcement',$3,$4,$5,$6,$7,$8)`,
          [schoolId, req.user.id, title, content, emailCount, target_type || 'all_parents', target_team_ids || '{}', announcement.id]
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

// Update school announcement
router.put('/:schoolId/announcements/:announcementId', authenticateToken, loadSchool, requireSchoolRole('owner', 'admin', 'secretary'), async (req, res, next) => {
  try {
    const { schoolId, announcementId } = req.params
    const { title, content, priority, is_pinned, expires_at } = req.body

    const result = await pool.query(
      `UPDATE school_announcements SET
        title = COALESCE($1, title),
        content = COALESCE($2, content),
        priority = COALESCE($3, priority),
        is_pinned = COALESCE($4, is_pinned),
        expires_at = $5,
        updated_at = NOW()
      WHERE id = $6 AND school_id = $7 RETURNING *`,
      [title, content, priority, is_pinned, expires_at, announcementId, schoolId]
    )

    if (result.rows.length === 0) return res.status(404).json({ error: 'Announcement not found' })
    res.json(result.rows[0])
  } catch (error) {
    next(error)
  }
})

// Delete school announcement
router.delete('/:schoolId/announcements/:announcementId', authenticateToken, loadSchool, requireSchoolRole('owner', 'admin', 'secretary'), async (req, res, next) => {
  try {
    const { schoolId, announcementId } = req.params
    await pool.query('DELETE FROM school_announcements WHERE id = $1 AND school_id = $2', [announcementId, schoolId])
    res.json({ message: 'Deleted' })
  } catch (error) {
    next(error)
  }
})

// ==========================================
// BULK COMMUNICATIONS
// ==========================================

// Send bulk email to parents/guardians
router.post('/:schoolId/send-to-parents', authenticateToken, loadSchool, requireSchoolRole('owner', 'admin', 'secretary'), async (req, res, next) => {
  try {
    const { schoolId } = req.params
    const school = req.school
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
         JOIN pupil_guardians pg ON pg.guardian_id = g.id
         JOIN pupils p ON pg.pupil_id = p.id
         WHERE g.school_id = $1 AND p.team_id = ANY($2)`,
        [schoolId, target_team_ids]
      )
    } else {
      guardians = await pool.query(
        'SELECT DISTINCT email, first_name, notification_preferences FROM guardians WHERE school_id = $1',
        [schoolId]
      )
    }

    const batchEmails = guardians.rows.map(guardian => ({
      to: guardian.email,
      template: 'notification',
      data: {
        teamName: school.name,
        title: subject,
        message,
        actionLink: `${getFrontendUrl()}/school/${school.slug}`,
        actionText: 'View Details',
      }
    }))
    const { sent: emailCount } = await sendBatchEmails(batchEmails)

    // Log communication
    await pool.query(
      `INSERT INTO school_comms_log (school_id, sent_by, type, subject, message, recipient_count, target_type, target_team_ids)
       VALUES ($1,$2,'bulk_email',$3,$4,$5,$6,$7)`,
      [schoolId, req.user.id, subject, message, emailCount, target_type || 'all_parents', target_team_ids || '{}']
    )

    res.json({ sent: emailCount, total: guardians.rows.length })
  } catch (error) {
    next(error)
  }
})

// Get communication history
router.get('/:schoolId/comms-log', authenticateToken, loadSchool, requireSchoolRole('owner', 'admin', 'secretary', 'treasurer'), async (req, res, next) => {
  try {
    const { schoolId } = req.params
    const { limit = 20 } = req.query

    const result = await pool.query(
      `SELECT cl.*, u.name as sent_by_name
       FROM school_comms_log cl
       LEFT JOIN users u ON cl.sent_by = u.id
       WHERE cl.school_id = $1
       ORDER BY cl.created_at DESC
       LIMIT $2`,
      [schoolId, parseInt(limit)]
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
router.post('/:schoolId/guardians/:guardianId/invite', authenticateToken, loadSchool, requireSchoolRole('owner', 'admin', 'secretary'), async (req, res, next) => {
  try {
    const { schoolId, guardianId } = req.params
    const school = req.school

    const guardian = await pool.query(
      'SELECT * FROM guardians WHERE id = $1 AND school_id = $2',
      [guardianId, schoolId]
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
      `INSERT INTO guardian_invites (school_id, guardian_id, email, token, expires_at)
       VALUES ($1,$2,$3,$4,$5)`,
      [schoolId, guardianId, g.email, token, expiresAt]
    )

    // Send invite email
    if (isEmailEnabled()) {
      const inviteUrl = `${getFrontendUrl()}/guardian-invite/${token}`
      await sendNotificationEmail(g.email, {
        teamName: school.name,
        title: `You're invited to join ${school.name}`,
        message: `${school.name} has invited you to create a parent account on Touchline. You'll be able to view your children's schedules, pay subscriptions, and receive school announcements.`,
        actionLink: inviteUrl,
        actionText: 'Create My Account',
      })
    }

    res.json({ message: 'Invite sent', token })
  } catch (error) {
    next(error)
  }
})

// Bulk invite all guardians in a school
router.post('/:schoolId/guardians/invite-all', authenticateToken, loadSchool, requireSchoolRole('owner', 'admin'), async (req, res, next) => {
  try {
    const { schoolId } = req.params
    const school = req.school

    // Get all unlinked guardians
    const guardians = await pool.query(
      'SELECT * FROM guardians WHERE school_id = $1 AND user_id IS NULL',
      [schoolId]
    )

    let sentCount = 0
    for (const g of guardians.rows) {
      const token = crypto.randomBytes(32).toString('hex')
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)

      try {
        await pool.query(
          `INSERT INTO guardian_invites (school_id, guardian_id, email, token, expires_at)
           VALUES ($1,$2,$3,$4,$5)`,
          [schoolId, g.id, g.email, token, expiresAt]
        )

        if (isEmailEnabled()) {
          const inviteUrl = `${getFrontendUrl()}/guardian-invite/${token}`
          await sendNotificationEmail(g.email, {
            teamName: school.name,
            title: `You're invited to join ${school.name}`,
            message: `${school.name} has invited you to create a parent account on Touchline. View schedules, manage payments, and stay in the loop.`,
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
      `INSERT INTO school_comms_log (school_id, sent_by, type, subject, recipient_count, target_type)
       VALUES ($1,$2,'guardian_invite','Parent Account Invitations',$3,'all_parents')`,
      [schoolId, req.user.id, sentCount]
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
       JOIN schools c ON gi.school_id = c.id
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
      `SELECT gi.*, g.school_id
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
    if (userRes.rows[0]?.role === 'parent' || userRes.rows[0]?.role === 'pupil') {
      // Already appropriate role
    } else {
      // Don't downgrade managers/coaches — they can also be parents
    }

    // Add user to school as parent member (if not already)
    const existingMember = await pool.query(
      'SELECT id FROM school_members WHERE school_id = $1 AND user_id = $2',
      [invite.school_id, userId]
    )
    if (existingMember.rows.length === 0) {
      await pool.query(
        `INSERT INTO school_members (school_id, user_id, role, is_parent)
         VALUES ($1, $2, 'parent', true)`,
        [invite.school_id, userId]
      )
    }

    // Auto-populate pupil's parent_contact from guardian details
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
      `SELECT gi.*, g.email, g.first_name, g.last_name, g.school_id, g.user_id as already_linked,
              c.name as club_name
       FROM guardian_invites gi
       JOIN guardians g ON gi.guardian_id = g.id
       JOIN schools c ON gi.school_id = c.id
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

    // Add user to school as parent member
    await pool.query(
      `INSERT INTO school_members (school_id, user_id, role, is_parent)
       VALUES ($1, $2, 'parent', true)
       ON CONFLICT (school_id, user_id) DO NOTHING`,
      [invite.school_id, user.id]
    )

    // Auto-populate pupil's parent_contact from guardian details
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
