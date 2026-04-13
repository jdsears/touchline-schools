import { Router } from 'express'
import pool from '../config/database.js'
import { authenticateToken } from '../middleware/auth.js'
import { sendNotificationEmail, isEmailEnabled, sendBatchEmails } from '../services/emailService.js'
import { getFrontendUrl } from '../utils/urlUtils.js'
import { sendPushToTeam } from '../services/pushService.js'
import { checkAndIncrementUsage, getEntitlements } from '../services/billingService.js'

const router = Router()

// Get all announcements for a team
router.get('/:teamId', authenticateToken, async (req, res, next) => {
  try {
    const { teamId } = req.params
    const { limit = 20 } = req.query

    // Get active announcements (not expired, or no expiry)
    const result = await pool.query(
      `SELECT a.*, u.name as created_by_name
       FROM team_announcements a
       LEFT JOIN users u ON a.created_by = u.id
       WHERE a.team_id = $1
         AND (a.expires_at IS NULL OR a.expires_at > NOW())
       ORDER BY a.is_pinned DESC, a.created_at DESC
       LIMIT $2`,
      [teamId, parseInt(limit)]
    )

    res.json(result.rows)
  } catch (error) {
    next(error)
  }
})

// Create announcement (managers only)
router.post('/:teamId', authenticateToken, async (req, res, next) => {
  try {
    const { teamId } = req.params
    const { title, content, priority, is_pinned, expires_at, send_email, email_recipients, selected_pupil_ids } = req.body

    // Check manager role
    if (!['manager', 'assistant'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Only managers can create announcements' })
    }

    if (!title || !content) {
      return res.status(400).json({ message: 'Title and content are required' })
    }

    // Get team name
    const teamResult = await pool.query('SELECT name FROM teams WHERE id = $1', [teamId])
    const teamName = teamResult.rows[0]?.name || 'Your Team'

    const result = await pool.query(
      `INSERT INTO team_announcements (team_id, created_by, title, content, priority, is_pinned, expires_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        teamId,
        req.user.id,
        title,
        content,
        priority || 'normal',
        is_pinned || false,
        expires_at || null
      ]
    )

    // Get creator name
    const announcement = result.rows[0]
    announcement.created_by_name = req.user.name

    // Create notifications for all team members (pupils and parents)
    const usersResult = await pool.query(
      'SELECT id FROM users WHERE team_id = $1 AND id != $2',
      [teamId, req.user.id]
    )

    for (const user of usersResult.rows) {
      await pool.query(
        `INSERT INTO notifications (user_id, team_id, type, title, message, data)
         VALUES ($1, $2, 'announcement', $3, $4, $5)`,
        [
          user.id,
          teamId,
          title,
          content.substring(0, 200) + (content.length > 200 ? '...' : ''),
          JSON.stringify({ announcement_id: announcement.id, priority })
        ]
      )
    }

    // Send push notifications to team members
    sendPushToTeam(teamId, {
      title: `📢 ${teamName}`,
      body: title,
      tag: `announcement-${announcement.id}`,
      url: '/dashboard',
    }, req.user.id)

    // Send emails to parents if requested
    let emailsSent = 0
    let emailsAttempted = 0
    if (send_email) {
      // Check email usage limit before sending
      const entitlements = await getEntitlements({ userId: req.user.id, teamId, userEmail: req.user.email })
      const emailUsageCheck = await checkAndIncrementUsage(teamId, 'email', entitlements)
      if (!emailUsageCheck.allowed) {
        // Announcement was still created, but emails won't be sent
        return res.status(201).json({
          ...announcement,
          emails_sent: 0,
          emails_attempted: 0,
          email_blocked: true,
          email_block_reason: emailUsageCheck.limit === 0
            ? 'Email notifications are not available on your current plan. Upgrade to Core to send emails to parents.'
            : `Monthly email limit reached (${emailUsageCheck.limit}). Upgrade your plan to send more emails.`,
          upgradeRequired: true,
        })
      }
      // Determine which pupils to send emails to based on email_recipients
      let playersToEmail = []
      const recipientType = email_recipients || 'all'

      if (recipientType === 'matchday_squad') {
        // Get the next upcoming match
        const nextMatchResult = await pool.query(
          `SELECT id FROM matches
           WHERE team_id = $1 AND date >= CURRENT_DATE
           ORDER BY date ASC LIMIT 1`,
          [teamId]
        )

        if (nextMatchResult.rows.length > 0) {
          const matchId = nextMatchResult.rows[0].id
          // Get squad pupils with linked accounts
          const squadResult = await pool.query(
            `SELECT ms.pupil_id, p.name, u.email as user_email
             FROM match_squad ms
             JOIN pupils p ON ms.pupil_id = p.id
             LEFT JOIN users u ON u.pupil_id = p.id
             WHERE ms.match_id = $1`,
            [matchId]
          )
          playersToEmail = squadResult.rows
        } else {
          // No upcoming match, fall back to all pupils
          const playersResult = await pool.query(
            `SELECT p.id, p.name, u.email as user_email
             FROM pupils p
             LEFT JOIN users u ON u.pupil_id = p.id
             WHERE p.team_id = $1 AND (p.is_active IS NULL OR p.is_active = true)`,
            [teamId]
          )
          playersToEmail = playersResult.rows
        }
      } else if (recipientType === 'selected' && selected_pupil_ids?.length > 0) {
        // Get only the selected pupils with linked accounts
        const playersResult = await pool.query(
          `SELECT p.id, p.name, u.email as user_email
           FROM pupils p
           LEFT JOIN users u ON u.pupil_id = p.id
           WHERE p.id = ANY($1) AND p.team_id = $2 AND (p.is_active IS NULL OR p.is_active = true)`,
          [selected_pupil_ids, teamId]
        )
        playersToEmail = playersResult.rows
      } else {
        // Default: all active pupils with linked accounts
        const playersResult = await pool.query(
          `SELECT p.id, p.name, u.email as user_email
           FROM pupils p
           LEFT JOIN users u ON u.pupil_id = p.id
           WHERE p.team_id = $1 AND (p.is_active IS NULL OR p.is_active = true)`,
          [teamId]
        )
        playersToEmail = playersResult.rows
      }

      // Collect unique emails from linked Pupil Lounge accounts
      const allParentEmails = new Set()
      for (const pupil of playersToEmail) {
        if (pupil.user_email) {
          allParentEmails.add(pupil.user_email)
        }
      }

      // Send emails via batch API
      const frontendUrl = getFrontendUrl()
      emailsAttempted = allParentEmails.size

      if (!isEmailEnabled()) {
        console.log(`[Announcement] Email not configured - skipping ${emailsAttempted} emails`)
      } else {
        const batchEmails = [...allParentEmails].map(email => ({
          to: email,
          template: 'notification',
          data: {
            teamName,
            title,
            message: content,
            actionLink: `${frontendUrl}/pupil`,
            actionText: 'View in Touchline'
          }
        }))
        const { sent } = await sendBatchEmails(batchEmails)
        emailsSent = sent
      }

      console.log(`[Announcement] Team ${teamId}: ${emailsSent}/${emailsAttempted} emails sent to ${recipientType} recipients`)
    }

    res.status(201).json({
      ...announcement,
      emails_sent: emailsSent,
      emails_attempted: emailsAttempted,
      email_enabled: isEmailEnabled()
    })
  } catch (error) {
    next(error)
  }
})

// Update announcement
router.put('/:teamId/announcements/:id', authenticateToken, async (req, res, next) => {
  try {
    const { id } = req.params
    const { title, content, priority, is_pinned, expires_at } = req.body

    // Check manager role
    if (!['manager', 'assistant'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Only managers can update announcements' })
    }

    const result = await pool.query(
      `UPDATE team_announcements SET
        title = COALESCE($1, title),
        content = COALESCE($2, content),
        priority = COALESCE($3, priority),
        is_pinned = COALESCE($4, is_pinned),
        expires_at = COALESCE($5, expires_at)
       WHERE id = $6 RETURNING *`,
      [title, content, priority, is_pinned, expires_at, id]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Announcement not found' })
    }

    res.json(result.rows[0])
  } catch (error) {
    next(error)
  }
})

// Delete announcement
router.delete('/:teamId/announcements/:id', authenticateToken, async (req, res, next) => {
  try {
    const { id } = req.params

    // Check manager role
    if (!['manager', 'assistant'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Only managers can delete announcements' })
    }

    const result = await pool.query(
      'DELETE FROM team_announcements WHERE id = $1 RETURNING id',
      [id]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Announcement not found' })
    }

    res.json({ message: 'Announcement deleted' })
  } catch (error) {
    next(error)
  }
})

export default router
