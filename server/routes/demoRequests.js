import express from 'express'
import rateLimit from 'express-rate-limit'
import pool from '../config/database.js'
import { sendEmail, isEmailEnabled } from '../services/emailService.js'
import { authenticateToken } from '../middleware/auth.js'
import { Resend } from 'resend'

const router = express.Router()

// Rate limiter for demo request submissions: max 3 per IP per hour
const demoRequestLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3,
  standardHeaders: true,
  legacyHeaders: false,
  message: { errors: ['Too many demo requests from this IP, please try again later'] },
})

const FREE_MAIL_DOMAINS = ['gmail.com', 'hotmail.com', 'yahoo.com', 'outlook.com']

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const NOTIFICATION_EMAIL = process.env.DEMO_REQUEST_NOTIFICATION_EMAIL || 'john@moonbootssports.com'

const FROM_ADDRESS = process.env.EMAIL_FROM || 'MoonBoots Sports <noreply@moonbootssports.com>'

// Helper to get Resend client for direct sends (notification and confirmation emails)
function getResendClient() {
  if (!process.env.RESEND_API_KEY) return null
  return new Resend(process.env.RESEND_API_KEY)
}

// POST / - Submit a demo access request (public, rate limited)
router.post('/', demoRequestLimiter, async (req, res) => {
  try {
    const {
      name,
      role_at_school,
      role_at_school_other,
      school_name,
      school_type,
      email,
      pupil_roll_band,
      hopes_to_help_with,
      referral_source,
    } = req.body

    // Validate required fields
    const errors = []
    if (!name || !name.trim()) errors.push('Name is required')
    if (!role_at_school || !role_at_school.trim()) errors.push('Role at school is required')
    if (!school_name || !school_name.trim()) errors.push('School name is required')
    if (!school_type || !school_type.trim()) errors.push('School type is required')
    if (!email || !email.trim()) errors.push('Email is required')
    if (!pupil_roll_band || !pupil_roll_band.trim()) errors.push('Pupil roll band is required')

    // Validate email format
    if (email && !EMAIL_REGEX.test(email.trim())) {
      errors.push('Invalid email format')
    }

    if (errors.length > 0) {
      return res.status(400).json({ errors })
    }

    const trimmedEmail = email.trim().toLowerCase()

    // Warn (but do not reject) if email is a free-mail provider
    const warnings = []
    const emailDomain = trimmedEmail.split('@')[1]
    if (FREE_MAIL_DOMAINS.includes(emailDomain)) {
      warnings.push('Please consider using your school email address for faster verification')
    }

    const ipAddress = req.ip
    const userAgent = req.headers['user-agent'] || null

    // Insert into demo_requests
    const result = await pool.query(
      `INSERT INTO demo_requests (
        name, role_at_school, role_at_school_other, school_name, school_type,
        email, pupil_roll_band, hopes_to_help_with, referral_source,
        ip_address, user_agent
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING id, created_at`,
      [
        name.trim(),
        role_at_school.trim(),
        role_at_school_other ? role_at_school_other.trim() : null,
        school_name.trim(),
        school_type.trim(),
        trimmedEmail,
        pupil_roll_band.trim(),
        hopes_to_help_with ? hopes_to_help_with.trim() : null,
        referral_source ? referral_source.trim() : null,
        ipAddress,
        userAgent,
      ]
    )

    const demoRequest = result.rows[0]

    // Send emails (best-effort, do not fail the request if email sending fails)
    if (isEmailEnabled()) {
      const client = getResendClient()
      if (client) {
        // Send notification email to admin
        try {
          await client.emails.send({
            from: FROM_ADDRESS,
            to: NOTIFICATION_EMAIL,
            replyTo: trimmedEmail,
            subject: `Demo request: ${school_name.trim()} - ${name.trim()}`,
            html: buildNotificationEmailHtml({
              name: name.trim(),
              role_at_school: role_at_school.trim(),
              school_name: school_name.trim(),
              school_type: school_type.trim(),
              email: trimmedEmail,
              pupil_roll_band: pupil_roll_band.trim(),
              referral_source: referral_source ? referral_source.trim() : null,
              hopes_to_help_with: hopes_to_help_with ? hopes_to_help_with.trim() : null,
              created_at: demoRequest.created_at,
              ip_address: ipAddress,
            }),
          })
          console.log(`[DemoRequest] Notification email sent to ${NOTIFICATION_EMAIL}`)
        } catch (emailErr) {
          console.error('[DemoRequest] Failed to send notification email:', emailErr.message)
        }

        // Send confirmation email to the prospect
        try {
          await client.emails.send({
            from: FROM_ADDRESS,
            to: trimmedEmail,
            replyTo: 'hello@moonbootssports.com',
            subject: 'Your MoonBoots Sports demo request',
            html: buildConfirmationEmailHtml({
              name: name.trim(),
              school_name: school_name.trim(),
            }),
          })
          console.log(`[DemoRequest] Confirmation email sent to ${trimmedEmail}`)
        } catch (emailErr) {
          console.error('[DemoRequest] Failed to send confirmation email:', emailErr.message)
        }
      }
    }

    const response = { success: true }
    if (warnings.length > 0) {
      response.warnings = warnings
    }
    return res.status(201).json(response)
  } catch (error) {
    console.error('[DemoRequest] POST error:', error)
    return res.status(500).json({ errors: ['An unexpected error occurred. Please try again.'] })
  }
})

// GET / - List all demo requests (admin only)
router.get('/', authenticateToken, async (req, res) => {
  try {
    if (!req.user.is_admin) {
      return res.status(403).json({ error: 'Admin access required' })
    }

    const { status } = req.query
    let query = 'SELECT * FROM demo_requests'
    const params = []

    if (status) {
      query += ' WHERE status = $1'
      params.push(status)
    }

    query += ' ORDER BY created_at DESC'

    const result = await pool.query(query, params)
    return res.json(result.rows)
  } catch (error) {
    console.error('[DemoRequest] GET error:', error)
    return res.status(500).json({ error: 'Failed to fetch demo requests' })
  }
})

// PATCH /:id - Update a demo request (admin only)
router.patch('/:id', authenticateToken, async (req, res) => {
  try {
    if (!req.user.is_admin) {
      return res.status(403).json({ error: 'Admin access required' })
    }

    const { id } = req.params
    const { status, internal_notes, contacted_at, demo_prospect_id } = req.body

    // Build dynamic update
    const setClauses = []
    const values = []
    let paramIndex = 1

    if (status !== undefined) {
      setClauses.push(`status = $${paramIndex++}`)
      values.push(status)
    }
    if (internal_notes !== undefined) {
      setClauses.push(`internal_notes = $${paramIndex++}`)
      values.push(internal_notes)
    }
    if (contacted_at !== undefined) {
      setClauses.push(`contacted_at = $${paramIndex++}`)
      values.push(contacted_at)
    }
    if (demo_prospect_id !== undefined) {
      setClauses.push(`demo_prospect_id = $${paramIndex++}`)
      values.push(demo_prospect_id)
    }

    if (setClauses.length === 0) {
      return res.status(400).json({ error: 'No fields to update' })
    }

    values.push(id)
    const query = `UPDATE demo_requests SET ${setClauses.join(', ')} WHERE id = $${paramIndex} RETURNING *`

    const result = await pool.query(query, values)

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Demo request not found' })
    }

    return res.json(result.rows[0])
  } catch (error) {
    console.error('[DemoRequest] PATCH error:', error)
    return res.status(500).json({ error: 'Failed to update demo request' })
  }
})

// Build notification email HTML (plain-text style, formatted for mobile)
function buildNotificationEmailHtml({ name, role_at_school, school_name, school_type, email, pupil_roll_band, referral_source, hopes_to_help_with, created_at, ip_address }) {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; margin: 0; padding: 20px; background-color: #f4f4f5; color: #1a1a1a;">
  <div style="max-width: 560px; margin: 0 auto; background: white; border-radius: 8px; padding: 24px;">
    <p style="font-size: 16px; margin: 0 0 20px 0;"><strong>New demo access request received.</strong></p>

    <p style="font-size: 15px; line-height: 1.8; margin: 0 0 16px 0;">
      <strong>Name:</strong> ${escapeHtml(name)}<br>
      <strong>Role:</strong> ${escapeHtml(role_at_school)}<br>
      <strong>School:</strong> ${escapeHtml(school_name)}<br>
      <strong>School type:</strong> ${escapeHtml(school_type)}<br>
      <strong>Email:</strong> ${escapeHtml(email)}<br>
      <strong>Pupil roll:</strong> ${escapeHtml(pupil_roll_band)}<br>
      <strong>Heard about us via:</strong> ${referral_source ? escapeHtml(referral_source) : 'not provided'}
    </p>

    <p style="font-size: 15px; line-height: 1.6; margin: 0 0 8px 0;"><strong>What they want help with:</strong></p>
    <p style="font-size: 15px; line-height: 1.6; margin: 0 0 16px 0;">${hopes_to_help_with ? escapeHtml(hopes_to_help_with) : 'not provided'}</p>

    <p style="font-size: 13px; color: #666; line-height: 1.6; margin: 16px 0 0 0;">
      <strong>Submitted at:</strong> ${new Date(created_at).toISOString()}<br>
      <strong>IP address:</strong> ${escapeHtml(ip_address || 'unknown')}
    </p>

    <hr style="border: none; border-top: 1px solid #e5e5e5; margin: 20px 0;">

    <p style="font-size: 14px; color: #666; line-height: 1.6; margin: 0;">
      Reply directly to this email to start a conversation, or issue demo access via the admin panel at
      <a href="https://app.moonbootssports.com/admin/prospects" style="color: #2ED573;">app.moonbootssports.com/admin/prospects</a>.
    </p>
  </div>
</body>
</html>`
}

// Build confirmation email HTML
function buildConfirmationEmailHtml({ name, school_name }) {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; margin: 0; padding: 20px; background-color: #f4f4f5; color: #1a1a1a;">
  <div style="max-width: 560px; margin: 0 auto; background: white; border-radius: 8px; padding: 24px;">
    <p style="font-size: 16px; line-height: 1.6; margin: 0 0 16px 0;">Hello ${escapeHtml(name)},</p>

    <p style="font-size: 16px; line-height: 1.6; margin: 0 0 16px 0;">
      Thank you for requesting demo access to MoonBoots Sports for ${escapeHtml(school_name)}.
    </p>

    <p style="font-size: 16px; line-height: 1.6; margin: 0 0 16px 0;">
      We review every request personally and respond within one working day.
      You will hear from John Sears, founder of MoonBoots Consultancy, by reply
      email to arrange a brief discovery call. Demo access will be issued to you
      alongside the call.
    </p>

    <p style="font-size: 16px; line-height: 1.6; margin: 0 0 16px 0;">
      In the meantime, if you have any urgent questions, reply to this email.
    </p>

    <p style="font-size: 16px; line-height: 1.6; margin: 0;">
      Best wishes,<br>
      The MoonBoots Sports team
    </p>
  </div>
</body>
</html>`
}

// Escape HTML special characters to prevent XSS
function escapeHtml(str) {
  if (!str) return ''
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

export default router
