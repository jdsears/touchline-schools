import { Router } from 'express'
import pool from '../config/database.js'
import { authenticateToken } from '../middleware/auth.js'
import { loadSchool, requireSchoolRole, requireSchoolFeature } from '../middleware/schoolAuth.js'
import { sendEmail, isEmailEnabled } from '../services/emailService.js'

const router = Router()

// Conditionally load Stripe
let stripe = null
if (process.env.STRIPE_SECRET_KEY) {
  const Stripe = (await import('stripe')).default
  stripe = new Stripe(process.env.STRIPE_SECRET_KEY)
}

// ==========================================
// CLUB EVENTS CRUD
// ==========================================

// List all events for a school
router.get('/:schoolId/events', authenticateToken, loadSchool, requireSchoolFeature('events'), requireSchoolRole('owner', 'admin', 'secretary', 'coach', 'treasurer'), async (req, res, next) => {
  try {
    const { schoolId } = req.params
    const { status, upcoming } = req.query

    let query = `
      SELECT ce.*,
        (SELECT COUNT(*) FROM event_registrations er WHERE er.event_id = ce.id AND er.status != 'cancelled') AS registration_count
      FROM school_events ce
      WHERE ce.school_id = $1
    `
    const params = [schoolId]
    let paramIdx = 2

    if (status) {
      query += ` AND ce.status = $${paramIdx}`
      params.push(status)
      paramIdx++
    }

    if (upcoming === 'true') {
      query += ` AND ce.start_date >= NOW()`
    }

    query += ' ORDER BY ce.start_date ASC'

    const result = await pool.query(query, params)
    res.json(result.rows)
  } catch (error) {
    next(error)
  }
})

// Create a new event
router.post('/:schoolId/events', authenticateToken, loadSchool, requireSchoolFeature('events'), requireSchoolRole('owner', 'admin'), async (req, res, next) => {
  try {
    const { schoolId } = req.params
    const {
      title, description, event_type, start_date, end_date,
      venue_name, venue_address, venue_postcode,
      target_audience, target_team_ids, target_age_groups,
      allow_external, max_participants, waitlist_enabled,
      price, early_bird_price, early_bird_deadline, sibling_discount_percent,
      custom_fields, collect_medical_info, confirmation_email_text,
      status, registration_opens, registration_closes,
    } = req.body

    if (!title || !event_type || !start_date) {
      return res.status(400).json({ error: 'title, event_type, and start_date are required' })
    }

    // Create Stripe product if this is a paid event and Stripe is configured
    let stripeProductId = null
    if (price && price > 0 && stripe && req.school.stripe_account_id) {
      try {
        const product = await stripe.products.create({
          name: title,
          description: description || `Event: ${title}`,
          metadata: { school_id: schoolId, event_type },
        }, {
          stripeAccount: req.school.stripe_account_id,
        })
        stripeProductId = product.id
      } catch (stripeErr) {
        console.error('Failed to create Stripe product for event:', stripeErr.message)
        // Continue without Stripe product - not a blocking error
      }
    }

    const result = await pool.query(
      `INSERT INTO school_events (
        school_id, title, description, event_type, start_date, end_date,
        venue_name, venue_address, venue_postcode,
        target_audience, target_team_ids, target_age_groups,
        allow_external, max_participants, waitlist_enabled,
        price, early_bird_price, early_bird_deadline, sibling_discount_percent,
        stripe_product_id, custom_fields, collect_medical_info, confirmation_email_text,
        status, registration_opens, registration_closes, created_by
      ) VALUES (
        $1, $2, $3, $4, $5, $6,
        $7, $8, $9,
        $10, $11, $12,
        $13, $14, $15,
        $16, $17, $18, $19,
        $20, $21, $22, $23,
        $24, $25, $26, $27
      ) RETURNING *`,
      [
        schoolId, title, description || null, event_type, start_date, end_date || null,
        venue_name || null, venue_address || null, venue_postcode || null,
        target_audience || 'all', target_team_ids || '{}', target_age_groups || '{}',
        allow_external || false, max_participants || null, waitlist_enabled || false,
        price || null, early_bird_price || null, early_bird_deadline || null, sibling_discount_percent || null,
        stripeProductId, custom_fields ? JSON.stringify(custom_fields) : '[]', collect_medical_info !== false, confirmation_email_text || null,
        status || 'draft', registration_opens || null, registration_closes || null, req.user.id,
      ]
    )

    res.status(201).json(result.rows[0])
  } catch (error) {
    next(error)
  }
})

// Get event detail with registration count
router.get('/:schoolId/events/:id', authenticateToken, loadSchool, requireSchoolFeature('events'), requireSchoolRole('owner', 'admin', 'secretary', 'coach', 'treasurer'), async (req, res, next) => {
  try {
    const { schoolId, id } = req.params

    const result = await pool.query(
      `SELECT ce.*,
        (SELECT COUNT(*) FROM event_registrations er WHERE er.event_id = ce.id AND er.status != 'cancelled') AS registration_count,
        (SELECT COUNT(*) FROM event_registrations er WHERE er.event_id = ce.id AND er.status = 'waitlisted') AS waitlist_count,
        (SELECT COALESCE(SUM(er.amount_paid), 0) FROM event_registrations er WHERE er.event_id = ce.id AND er.payment_status = 'paid') AS total_revenue
      FROM school_events ce
      WHERE ce.id = $1 AND ce.school_id = $2`,
      [id, schoolId]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Event not found' })
    }

    res.json(result.rows[0])
  } catch (error) {
    next(error)
  }
})

// Update event
router.put('/:schoolId/events/:id', authenticateToken, loadSchool, requireSchoolFeature('events'), requireSchoolRole('owner', 'admin'), async (req, res, next) => {
  try {
    const { schoolId, id } = req.params
    const {
      title, description, event_type, start_date, end_date,
      venue_name, venue_address, venue_postcode,
      target_audience, target_team_ids, target_age_groups,
      allow_external, max_participants, waitlist_enabled,
      price, early_bird_price, early_bird_deadline, sibling_discount_percent,
      custom_fields, collect_medical_info, confirmation_email_text,
      status, registration_opens, registration_closes,
    } = req.body

    const result = await pool.query(
      `UPDATE school_events SET
        title = COALESCE($1, title),
        description = COALESCE($2, description),
        event_type = COALESCE($3, event_type),
        start_date = COALESCE($4, start_date),
        end_date = COALESCE($5, end_date),
        venue_name = COALESCE($6, venue_name),
        venue_address = COALESCE($7, venue_address),
        venue_postcode = COALESCE($8, venue_postcode),
        target_audience = COALESCE($9, target_audience),
        target_team_ids = COALESCE($10, target_team_ids),
        target_age_groups = COALESCE($11, target_age_groups),
        allow_external = COALESCE($12, allow_external),
        max_participants = COALESCE($13, max_participants),
        waitlist_enabled = COALESCE($14, waitlist_enabled),
        price = COALESCE($15, price),
        early_bird_price = COALESCE($16, early_bird_price),
        early_bird_deadline = COALESCE($17, early_bird_deadline),
        sibling_discount_percent = COALESCE($18, sibling_discount_percent),
        custom_fields = COALESCE($19, custom_fields),
        collect_medical_info = COALESCE($20, collect_medical_info),
        confirmation_email_text = COALESCE($21, confirmation_email_text),
        status = COALESCE($22, status),
        registration_opens = COALESCE($23, registration_opens),
        registration_closes = COALESCE($24, registration_closes),
        updated_at = NOW()
      WHERE id = $25 AND school_id = $26
      RETURNING *`,
      [
        title, description, event_type, start_date, end_date,
        venue_name, venue_address, venue_postcode,
        target_audience, target_team_ids, target_age_groups,
        allow_external, max_participants, waitlist_enabled,
        price, early_bird_price, early_bird_deadline, sibling_discount_percent,
        custom_fields ? JSON.stringify(custom_fields) : null, collect_medical_info, confirmation_email_text,
        status, registration_opens, registration_closes,
        id, schoolId,
      ]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Event not found' })
    }

    res.json(result.rows[0])
  } catch (error) {
    next(error)
  }
})

// Cancel event (soft delete - set status to cancelled)
router.delete('/:schoolId/events/:id', authenticateToken, loadSchool, requireSchoolFeature('events'), requireSchoolRole('owner', 'admin'), async (req, res, next) => {
  try {
    const { schoolId, id } = req.params

    const result = await pool.query(
      `UPDATE school_events SET status = 'cancelled', updated_at = NOW()
       WHERE id = $1 AND school_id = $2
       RETURNING *`,
      [id, schoolId]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Event not found' })
    }

    const event = result.rows[0]

    // Notify registered participants that the event is cancelled
    if (isEmailEnabled()) {
      try {
        const registrations = await pool.query(
          `SELECT er.*, g.email AS guardian_email, g.first_name AS guardian_name
           FROM event_registrations er
           LEFT JOIN guardians g ON er.guardian_id = g.id
           WHERE er.event_id = $1 AND er.status != 'cancelled'`,
          [id]
        )

        for (const reg of registrations.rows) {
          const email = reg.guardian_email || reg.external_email
          if (email) {
            await sendEmail(email, 'eventCancelled', {
              clubName: req.school.name,
              eventTitle: event.title,
              eventDate: new Date(event.start_date).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }),
              recipientName: reg.guardian_name || reg.external_name || 'there',
            })
          }
        }
      } catch (emailErr) {
        console.error('Failed to send event cancellation emails:', emailErr.message)
      }
    }

    // Mark all registrations as cancelled too
    await pool.query(
      `UPDATE event_registrations SET status = 'cancelled' WHERE event_id = $1`,
      [id]
    )

    res.json({ message: 'Event cancelled', event })
  } catch (error) {
    next(error)
  }
})

// Get all registrations for an event
router.get('/:schoolId/events/:id/registrations', authenticateToken, loadSchool, requireSchoolFeature('events'), requireSchoolRole('owner', 'admin', 'secretary'), async (req, res, next) => {
  try {
    const { schoolId, id } = req.params

    const result = await pool.query(
      `SELECT er.*,
        p.name AS player_name, p.dob AS player_dob,
        g.first_name AS guardian_first_name, g.last_name AS guardian_last_name,
        g.email AS guardian_email, g.phone AS guardian_phone
      FROM event_registrations er
      LEFT JOIN pupils p ON er.pupil_id = p.id
      LEFT JOIN guardians g ON er.guardian_id = g.id
      WHERE er.event_id = $1 AND er.school_id = $2
      ORDER BY er.created_at ASC`,
      [id, schoolId]
    )

    res.json(result.rows)
  } catch (error) {
    next(error)
  }
})

// CSV export of registrations
router.get('/:schoolId/events/:id/export', authenticateToken, loadSchool, requireSchoolFeature('events'), requireSchoolRole('owner', 'admin', 'secretary'), async (req, res, next) => {
  try {
    const { schoolId, id } = req.params

    // Verify event belongs to school
    const eventResult = await pool.query(
      'SELECT title FROM school_events WHERE id = $1 AND school_id = $2',
      [id, schoolId]
    )
    if (eventResult.rows.length === 0) {
      return res.status(404).json({ error: 'Event not found' })
    }

    const result = await pool.query(
      `SELECT
        COALESCE(p.name, er.external_name) AS participant_name,
        COALESCE(g.email, er.external_email) AS email,
        COALESCE(g.phone, er.external_phone) AS phone,
        COALESCE(g.first_name || ' ' || g.last_name, '') AS guardian_name,
        er.status,
        er.payment_status,
        er.amount_paid,
        er.attended,
        er.photo_consent,
        er.custom_field_responses,
        er.created_at AS registered_at
      FROM event_registrations er
      LEFT JOIN pupils p ON er.pupil_id = p.id
      LEFT JOIN guardians g ON er.guardian_id = g.id
      WHERE er.event_id = $1 AND er.school_id = $2
      ORDER BY er.created_at ASC`,
      [id, schoolId]
    )

    // Build CSV
    const headers = [
      'Participant Name', 'Email', 'Phone', 'Guardian Name',
      'Status', 'Payment Status', 'Amount Paid (pence)', 'Attended',
      'Photo Consent', 'Registered At',
    ]

    const csvRows = [headers.join(',')]
    for (const row of result.rows) {
      csvRows.push([
        `"${(row.participant_name || '').replace(/"/g, '""')}"`,
        `"${(row.email || '').replace(/"/g, '""')}"`,
        `"${(row.phone || '').replace(/"/g, '""')}"`,
        `"${(row.guardian_name || '').replace(/"/g, '""')}"`,
        row.status,
        row.payment_status,
        row.amount_paid || 0,
        row.attended === true ? 'Yes' : row.attended === false ? 'No' : '',
        row.photo_consent ? 'Yes' : 'No',
        row.registered_at ? new Date(row.registered_at).toISOString() : '',
      ].join(','))
    }

    const eventTitle = eventResult.rows[0].title.replace(/[^a-zA-Z0-9]/g, '_')
    res.setHeader('Content-Type', 'text/csv')
    res.setHeader('Content-Disposition', `attachment; filename="${eventTitle}_registrations.csv"`)
    res.send(csvRows.join('\n'))
  } catch (error) {
    next(error)
  }
})

// Bulk update attendance for an event
router.put('/:schoolId/events/:id/attendance', authenticateToken, loadSchool, requireSchoolFeature('events'), requireSchoolRole('owner', 'admin', 'coach'), async (req, res, next) => {
  try {
    const { schoolId, id } = req.params
    const { attendance } = req.body

    // attendance should be an array of { registration_id, attended }
    if (!Array.isArray(attendance)) {
      return res.status(400).json({ error: 'attendance must be an array of { registration_id, attended }' })
    }

    // Verify event belongs to school
    const eventCheck = await pool.query(
      'SELECT id FROM school_events WHERE id = $1 AND school_id = $2',
      [id, schoolId]
    )
    if (eventCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Event not found' })
    }

    const updated = []
    for (const entry of attendance) {
      const result = await pool.query(
        `UPDATE event_registrations SET attended = $1
         WHERE id = $2 AND event_id = $3 AND school_id = $4
         RETURNING id, attended`,
        [entry.attended, entry.registration_id, id, schoolId]
      )
      if (result.rows.length > 0) {
        updated.push(result.rows[0])
      }
    }

    res.json({ message: 'Attendance updated', updated_count: updated.length, updated })
  } catch (error) {
    next(error)
  }
})

// ==========================================
// PUBLIC EVENT ENDPOINTS (no auth)
// ==========================================

// Public event details (no authentication required)
router.get('/public/:eventId', async (req, res, next) => {
  try {
    const { eventId } = req.params

    const result = await pool.query(
      `SELECT ce.id, ce.title, ce.description, ce.event_type,
        ce.start_date, ce.end_date, ce.venue_name, ce.venue_address, ce.venue_postcode,
        ce.allow_external, ce.max_participants, ce.current_participants,
        ce.waitlist_enabled, ce.price, ce.early_bird_price, ce.early_bird_deadline,
        ce.sibling_discount_percent, ce.custom_fields, ce.collect_medical_info,
        ce.status, ce.registration_opens, ce.registration_closes,
        c.name AS club_name, c.logo_url AS club_logo, c.primary_color AS club_color,
        c.id AS school_id
      FROM school_events ce
      JOIN schools c ON ce.school_id = c.id
      WHERE ce.id = $1 AND ce.status = 'published'`,
      [eventId]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Event not found or not published' })
    }

    const event = result.rows[0]

    // Check registration window
    const now = new Date()
    const registrationOpen = (!event.registration_opens || new Date(event.registration_opens) <= now) &&
      (!event.registration_closes || new Date(event.registration_closes) >= now)

    const spotsRemaining = event.max_participants
      ? event.max_participants - event.current_participants
      : null

    // Calculate current price (early bird vs standard)
    let currentPrice = event.price
    if (event.early_bird_price && event.early_bird_deadline && new Date(event.early_bird_deadline) >= now) {
      currentPrice = event.early_bird_price
    }

    res.json({
      ...event,
      registration_open: registrationOpen,
      spots_remaining: spotsRemaining,
      current_price: currentPrice,
    })
  } catch (error) {
    next(error)
  }
})

// Public event registration (no authentication required)
router.post('/public/:eventId/register', async (req, res, next) => {
  try {
    const { eventId } = req.params
    const {
      pupil_id, guardian_id,
      external_name, external_email, external_phone, external_dob, external_medical,
      custom_field_responses, photo_consent,
    } = req.body

    // Load the event
    const eventResult = await pool.query(
      `SELECT ce.*, c.stripe_account_id, c.name AS club_name
       FROM school_events ce
       JOIN schools c ON ce.school_id = c.id
       WHERE ce.id = $1 AND ce.status = 'published'`,
      [eventId]
    )

    if (eventResult.rows.length === 0) {
      return res.status(404).json({ error: 'Event not found or not published' })
    }

    const event = eventResult.rows[0]

    // Check registration window
    const now = new Date()
    if (event.registration_opens && new Date(event.registration_opens) > now) {
      return res.status(400).json({ error: 'Registration has not opened yet' })
    }
    if (event.registration_closes && new Date(event.registration_closes) < now) {
      return res.status(400).json({ error: 'Registration has closed' })
    }

    // Check capacity
    if (event.max_participants && event.current_participants >= event.max_participants) {
      if (event.waitlist_enabled) {
        // Register on waitlist
        const waitlistResult = await pool.query(
          `INSERT INTO event_registrations (
            event_id, school_id, pupil_id, guardian_id,
            external_name, external_email, external_phone, external_dob, external_medical,
            custom_field_responses, photo_consent, status, payment_status
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'waitlisted', 'pending')
          RETURNING *`,
          [
            eventId, event.school_id, pupil_id || null, guardian_id || null,
            external_name || null, external_email || null, external_phone || null,
            external_dob || null, external_medical || null,
            custom_field_responses ? JSON.stringify(custom_field_responses) : '{}',
            photo_consent || false,
          ]
        )
        return res.status(201).json({ registration: waitlistResult.rows[0], waitlisted: true })
      }
      return res.status(400).json({ error: 'Event is full' })
    }

    // Validate required fields for external registrations
    if (!pupil_id && !external_name) {
      return res.status(400).json({ error: 'Either pupil_id or external_name is required' })
    }

    if (!pupil_id && !external_email) {
      return res.status(400).json({ error: 'external_email is required for external registrations' })
    }

    // Determine current price
    let currentPrice = event.price || 0
    if (event.early_bird_price && event.early_bird_deadline && new Date(event.early_bird_deadline) >= now) {
      currentPrice = event.early_bird_price
    }

    // If free event, register directly
    if (!currentPrice || currentPrice <= 0) {
      const regResult = await pool.query(
        `INSERT INTO event_registrations (
          event_id, school_id, pupil_id, guardian_id,
          external_name, external_email, external_phone, external_dob, external_medical,
          custom_field_responses, amount_paid, payment_status, photo_consent, status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 0, 'free', $11, 'registered')
        RETURNING *`,
        [
          eventId, event.school_id, pupil_id || null, guardian_id || null,
          external_name || null, external_email || null, external_phone || null,
          external_dob || null, external_medical || null,
          custom_field_responses ? JSON.stringify(custom_field_responses) : '{}',
          photo_consent || false,
        ]
      )

      // Update participant count
      await pool.query(
        'UPDATE school_events SET current_participants = current_participants + 1 WHERE id = $1',
        [eventId]
      )

      // Send confirmation email
      const recipientEmail = external_email || null
      if (recipientEmail && isEmailEnabled()) {
        try {
          await sendEmail(recipientEmail, 'eventRegistrationConfirmation', {
            clubName: event.club_name,
            eventTitle: event.title,
            eventDate: new Date(event.start_date).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }),
            eventTime: new Date(event.start_date).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
            venueName: event.venue_name || 'TBC',
            venueAddress: event.venue_address || '',
            recipientName: external_name || 'there',
            isPaid: false,
            amountPaid: 0,
            confirmationText: event.confirmation_email_text || null,
          })
        } catch (emailErr) {
          console.error('Failed to send event registration confirmation:', emailErr.message)
        }
      }

      return res.status(201).json({ registration: regResult.rows[0], waitlisted: false })
    }

    // Paid event - create a registration record first, then create Stripe checkout
    const regResult = await pool.query(
      `INSERT INTO event_registrations (
        event_id, school_id, pupil_id, guardian_id,
        external_name, external_email, external_phone, external_dob, external_medical,
        custom_field_responses, amount_paid, payment_status, photo_consent, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'pending', $12, 'pending_payment')
      RETURNING *`,
      [
        eventId, event.school_id, pupil_id || null, guardian_id || null,
        external_name || null, external_email || null, external_phone || null,
        external_dob || null, external_medical || null,
        custom_field_responses ? JSON.stringify(custom_field_responses) : '{}',
        currentPrice,
        photo_consent || false,
      ]
    )

    const registration = regResult.rows[0]

    // Create Stripe Checkout Session if Stripe is configured and school has connected account
    if (stripe && event.stripe_account_id) {
      try {
        const checkoutParams = {
          payment_method_types: ['card'],
          mode: 'payment',
          line_items: [{
            price_data: {
              currency: 'gbp',
              product_data: { name: event.title },
              unit_amount: currentPrice,
            },
            quantity: 1,
          }],
          success_url: `${process.env.FRONTEND_URL}/event/${event.id}/confirmed?session_id={CHECKOUT_SESSION_ID}`,
          cancel_url: `${process.env.FRONTEND_URL}/event/${event.id}`,
          metadata: {
            event_id: event.id,
            registration_id: registration.id,
            pupil_id: pupil_id || '',
            school_id: event.school_id,
          },
        }

        // Direct charge on the connected account with application fee
        checkoutParams.payment_intent_data = {
          application_fee_amount: Math.round(currentPrice * 0.005),
        }

        const session = await stripe.checkout.sessions.create(checkoutParams, {
          stripeAccount: event.stripe_account_id,
        })

        // Store the checkout session ID on the registration
        await pool.query(
          'UPDATE event_registrations SET stripe_payment_intent_id = $1 WHERE id = $2',
          [session.id, registration.id]
        )

        return res.status(201).json({
          registration,
          checkout_url: session.url,
          waitlisted: false,
        })
      } catch (stripeErr) {
        console.error('Failed to create Stripe checkout session:', stripeErr.message)
        // If Stripe fails, still return the registration so they can pay later
        return res.status(201).json({
          registration,
          checkout_url: null,
          stripe_error: 'Payment processing unavailable. Please contact the school.',
          waitlisted: false,
        })
      }
    }

    // No Stripe configured - return registration without payment link
    res.status(201).json({
      registration,
      checkout_url: null,
      waitlisted: false,
    })
  } catch (error) {
    next(error)
  }
})

export default router
