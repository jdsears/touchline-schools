import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import dotenv from 'dotenv'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'
import http from 'http'
import jwt from 'jsonwebtoken'
import rateLimit from 'express-rate-limit'

// Migrations
import { runMigrations } from './db/migrations.js'

// Database
import pool from './config/database.js'

// Routes
import authRoutes from './routes/auth.js'
import teamRoutes from './routes/teams.js'
import pupilRoutes from './routes/pupils.js'
import matchRoutes from './routes/matches.js'
import chatRoutes from './routes/chat.js'
import trainingRoutes from './routes/training.js'
import tacticsRoutes from './routes/tactics.js'
import videoRoutes from './routes/videos.js'
import notificationRoutes from './routes/notifications.js'
import leagueRoutes from './routes/league.js'
import documentRoutes from './routes/documents.js'
import announcementRoutes from './routes/announcements.js'
import suggestionRoutes from './routes/suggestions.js'
import tusUploadRoutes from './routes/tusUpload.js'
import adminRoutes from './routes/admin.js'

import supportRoutes from './routes/support.js'
import streamingRoutes from './routes/streaming.js'
import schoolRoutes from './routes/schools.js'
import schoolCommsRoutes from './routes/schoolComms.js'
import schoolSafeguardingRoutes from './routes/schoolSafeguarding.js'
import schoolEventsRoutes from './routes/schoolEvents.js'
import schoolScheduleRoutes from './routes/schoolSchedule.js'
import schoolIntelligenceRoutes from './routes/schoolIntelligence.js'
import knowledgeBaseRoutes from './routes/knowledgeBase.js'
import seasonDevelopmentRoutes from './routes/seasonDevelopment.js'
import videoLibraryRoutes from './routes/videoLibrary.js'
import teachingGroupRoutes from './routes/teachingGroups.js'
import lessonRoutes from './routes/lessons.js'
import assessmentRoutes from './routes/assessments.js'
import sportKnowledgeBaseRoutes from './routes/sportKnowledgeBase.js'
import hodRoutes from './routes/headOfDepartment.js'
import teacherDashboardRoutes from './routes/teacherDashboard.js'
import calendarExportRoutes from './routes/calendarExport.js'
import onboardingRoutes from './routes/onboarding.js'
import pupilManagementRoutes from './routes/pupilManagement.js'
import pupilProfileRoutes from './routes/pupilProfile.js'
import reportingRoutes from './routes/reporting.js'
import enterpriseBillingRoutes from './routes/enterpriseBilling.js'
import voiceObservationRoutes from './routes/voiceObservations.js'
import voiceSafeguardingRoutes from './routes/voiceSafeguarding.js'
import gdprRoutes from './routes/gdpr.js'
import ssoRoutes from './routes/sso.js'
import demoRequestRoutes from './routes/demoRequests.js'
import schoolSettingsRoutes from './routes/schoolSettings.js'
import venueRoutes from './routes/venues.js'
import fixtureTravelRoutes from './routes/fixtureTravel.js'
import consentRoutes from './routes/consent.js'
import publicFixtureRoutes from './routes/publicFixtures.js'
import misRoutes from './routes/misIntegration.js'
import concussionRoutes from './routes/concussion.js'

// Demo seed
import { seedSchool } from './db/demo-seed/school.js'
import { seedStaff } from './db/demo-seed/staff.js'
import { seedPupils } from './db/demo-seed/pupils.js'
import { seedTeams } from './db/demo-seed/teams.js'
import { seedCurriculum } from './db/demo-seed/curriculum.js'
import { seedLessons } from './db/demo-seed/lessons.js'
import { seedAssessments } from './db/demo-seed/assessments.js'
import { seedReports } from './db/demo-seed/reports.js'
import { seedFixtures } from './db/demo-seed/fixtures.js'
import { seedFixturesExtra } from './db/demo-seed/fixturesExtra.js'
import { seedSafeguarding } from './db/demo-seed/safeguarding.js'
import { seedAuditLog } from './db/demo-seed/auditLog.js'
import { seedTestPersonas } from './db/demo-seed/test-personas.js'

// Cron jobs
import { scanTrialLifecycle } from './cron/trialLifecycle.js'
import { purgeExpiredVoiceAudio } from './cron/voiceObservationRetention.js'
import { scheduleDemoReset } from './cron/demoReset.js'

import bcrypt from 'bcryptjs'

// Middleware
import { errorHandler } from './middleware/errorHandler.js'

// Surface missing optional service credentials loudly at boot (the
// features degrade to clear 503s rather than crashing, but operators
// should know what is switched off)
if (!process.env.ANTHROPIC_API_KEY) console.warn('[BOOT] ANTHROPIC_API_KEY is not set - all AI features will return 503')
if (!process.env.RESEND_API_KEY) console.warn('[BOOT] RESEND_API_KEY is not set - emails (invites, demo confirmations, trial reminders) will not send')
if (!process.env.MUX_TOKEN_ID || !process.env.MUX_TOKEN_SECRET) console.warn('[BOOT] MUX credentials are not set - video upload/streaming will return 503')
if ((process.env.TRANSCRIPTION_PROVIDER || 'assemblyai') === 'assemblyai' && !process.env.ASSEMBLYAI_API_KEY) console.warn('[BOOT] ASSEMBLYAI_API_KEY is not set - voice observation transcription will fail')

dotenv.config()

// Fail fast if critical environment variables are missing
if (!process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is required')
}

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()
const PORT = process.env.PORT || 3001

// Canonical domain redirect: non-canonical hosts -> app.moonbootssports.com
// Handles: railway.app preview domain, www subdomain, any other alias.
// HTTP -> HTTPS is handled by Railway's edge proxy, but if a request
// somehow arrives as HTTP, the redirect below covers it too.
const CANONICAL_HOST = process.env.CANONICAL_HOST || 'app.moonbootssports.com'
app.use((req, res, next) => {
  const host = (req.headers['x-forwarded-host'] || req.headers.host || '').replace(/:\d+$/, '')
  if (host && host !== CANONICAL_HOST) {
    if (host.endsWith('.up.railway.app') || host === `www.${CANONICAL_HOST}`) {
      return res.redirect(301, `https://${CANONICAL_HOST}${req.originalUrl}`)
    }
  }
  next()
})

// Security headers
// Content-Security-Policy ships in report-only mode by default so it cannot break
// the app; set CSP_ENFORCE=true to switch it to enforcing once reports look clean.
// Directives cover the app's known third parties (Stripe, Mux, OpenStreetMap).
const cspDirectives = {
  defaultSrc: ["'self'"],
  baseUri: ["'self'"],
  objectSrc: ["'none'"],
  frameAncestors: ["'self'"],
  fontSrc: ["'self'", 'data:'],
  // Images/media come from R2, Mux thumbnails and OSM tiles; allow https + data/blob.
  imgSrc: ["'self'", 'data:', 'blob:', 'https:'],
  mediaSrc: ["'self'", 'blob:', 'https://*.mux.com'],
  // Bundled scripts are same-origin; Stripe and Mux load their own SDKs.
  scriptSrc: ["'self'", 'https://js.stripe.com', 'https://*.mux.com'],
  // Tailwind / charting libraries inject inline styles.
  styleSrc: ["'self'", "'unsafe-inline'"],
  connectSrc: ["'self'", 'https:'],
  frameSrc: ["'self'", 'https://js.stripe.com', 'https://*.mux.com'],
  workerSrc: ["'self'", 'blob:'],
}
app.use(helmet({
  contentSecurityPolicy: {
    useDefaults: true,
    directives: cspDirectives,
    reportOnly: process.env.CSP_ENFORCE !== 'true',
  },
  crossOriginEmbedderPolicy: false, // Required for Mux video embeds
  crossOriginResourcePolicy: { policy: 'cross-origin' }, // Allow frontend (moonbootssports.com) to load images/assets from Railway
}))

// CORS configuration
const getAllowedOrigins = () => {
  if (process.env.FRONTEND_URL) {
    return process.env.FRONTEND_URL
  }
  if (process.env.NODE_ENV === 'production') {
    // In production without FRONTEND_URL, only allow same-origin (no cross-origin)
    return false
  }
  return 'http://localhost:5173'
}

app.use(cors({
  origin: getAllowedOrigins(),
  credentials: true,
}))

// Skip JSON parsing for TUS uploads (they send raw binary chunks), JSON for everything else
app.use((req, res, next) => {
  if (req.originalUrl.startsWith('/api/uploads/video')) {
    // TUS upload routes handle their own body parsing - skip JSON middleware
    // TUS PATCH requests send raw binary chunks, not JSON
    next()
  } else {
    express.json({ limit: '1mb' })(req, res, next)
  }
})
app.use(express.urlencoded({ extended: true }))

// Serve uploaded files - public assets (logos, team assets) are open,
// but club documents (registrations, compliance) require authentication
app.use('/uploads/logos', express.static(path.join(__dirname, 'uploads/logos')))
app.use('/uploads/videos', express.static(path.join(__dirname, 'uploads/videos')))

// Protected: school documents (compliance, etc.) require valid JWT
app.use('/uploads/schools', (req, res, next) => {
  const authHeader = req.headers['authorization']
  const token = authHeader && authHeader.split(' ')[1]
  if (!token) {
    return res.status(401).json({ error: 'Authentication required to access this file' })
  }
  try {
    jwt.verify(token, process.env.JWT_SECRET)
    next()
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' })
  }
}, express.static(path.join(__dirname, 'uploads/schools')))

// Fallback for any other uploads (match media, documents, etc.)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')))

// ==========================================
// RATE LIMITING
// ==========================================

// Strict limiter for auth endpoints (login, register, password reset)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // 20 attempts per 15 minutes
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many attempts, please try again in 15 minutes' },
})

// Moderate limiter for public registration forms
const publicFormLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many submissions, please try again later' },
})

// General API limiter (generous but prevents abuse)
const apiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 120, // 120 requests per minute
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please slow down' },
})

app.use('/api/', apiLimiter)

// API Routes
app.use('/api/auth', authLimiter, authRoutes)
app.use('/api/teams', teamRoutes)
app.use('/api/pupils', pupilRoutes)
app.use('/api/matches', matchRoutes)
app.use('/api/chat', chatRoutes)
app.use('/api/training', trainingRoutes)
app.use('/api/tactics', tacticsRoutes)
app.use('/api/videos', videoRoutes)
app.use('/api/notifications', notificationRoutes)
app.use('/api/league', leagueRoutes)
app.use('/api/documents', documentRoutes)
app.use('/api/announcements', announcementRoutes)
app.use('/api/suggestions', suggestionRoutes)
app.use('/api/uploads/video', tusUploadRoutes)
app.use('/api/admin', adminRoutes)
// Blog routes removed in v1.5
app.use('/api/support', supportRoutes)
app.use('/api/streaming', streamingRoutes)
app.use('/api/schools', schoolRoutes)
app.use('/api/school-comms', schoolCommsRoutes)
app.use('/api/school-safeguarding', schoolSafeguardingRoutes)
app.use('/api/school-events', schoolEventsRoutes)
app.use('/api/teams', schoolScheduleRoutes)
app.use('/api/school-intelligence', schoolIntelligenceRoutes)
app.use('/api/knowledge-base', knowledgeBaseRoutes)
app.use('/api/teams', seasonDevelopmentRoutes)
app.use('/api/video-library', videoLibraryRoutes)
app.use('/api/teaching-groups', teachingGroupRoutes)
app.use('/api/lessons', lessonRoutes)
app.use('/api/assessments', assessmentRoutes)
app.use('/api/sport-knowledge', sportKnowledgeBaseRoutes)
app.use('/api/hod', hodRoutes)
app.use('/api/teacher-dashboard', teacherDashboardRoutes)
app.use('/api/calendar', calendarExportRoutes)
app.use('/api/onboarding', onboardingRoutes)
app.use('/api/pupil-management', pupilManagementRoutes)
app.use('/api/pupil-profile', pupilProfileRoutes)
app.use('/api/reporting', reportingRoutes)
app.use('/api/enterprise-billing', enterpriseBillingRoutes)
app.use('/api/voice-observations', voiceObservationRoutes)
app.use('/api/voice-safeguarding', voiceSafeguardingRoutes)
app.use('/api/gdpr', gdprRoutes)
app.use('/api/sso', ssoRoutes)
app.use('/api/demo-requests', demoRequestRoutes)
app.use('/api/settings', schoolSettingsRoutes)
app.use('/api/venues', venueRoutes)
app.use('/api/fixture-travel', fixtureTravelRoutes)
app.use('/api/consent', consentRoutes)
app.use('/api/public/sport', publicFixtureRoutes)
app.use('/api/mis', misRoutes)
app.use('/api/concussion', concussionRoutes)

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

// Public: Get all screenshots for a feature as data URLs (no auth)
app.get('/api/feature-screenshots/:slug', async (req, res) => {
  try {
    const { slug } = req.params
    const result = await pool.query(
      'SELECT slot, mime_type, data FROM feature_screenshots WHERE feature_slug = $1',
      [slug]
    )
    // Return as { hero: 'data:...', step_1: 'data:...', ... }
    const screenshots = {}
    for (const row of result.rows) {
      screenshots[row.slot] = bufferToDataUrl(row.data, row.mime_type)
    }
    res.set('Cache-Control', 'public, max-age=3600')
    res.json(screenshots)
  } catch (error) {
    console.error('Feature screenshots error:', error)
    res.status(500).json({ error: 'Failed to load screenshots' })
  }
})

// Public: Get ALL feature screenshots grouped by slug (for SSR/preload)
app.get('/api/feature-screenshots', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT feature_slug, slot, mime_type, data FROM feature_screenshots'
    )
    // Return as { 'session-planner': { hero: 'data:...', step_1: '...' }, ... }
    const grouped = {}
    for (const row of result.rows) {
      if (!grouped[row.feature_slug]) grouped[row.feature_slug] = {}
      grouped[row.feature_slug][row.slot] = bufferToDataUrl(row.data, row.mime_type)
    }
    res.set('Cache-Control', 'public, max-age=3600')
    res.json(grouped)
  } catch (error) {
    console.error('All feature screenshots error:', error)
    res.status(500).json({ error: 'Failed to load screenshots' })
  }
})

// Health check (verifies DB connectivity)
app.get('/api/health', async (req, res) => {
  try {
    await pool.query('SELECT 1')
    res.json({ status: 'ok', db: 'connected', timestamp: new Date().toISOString() })
  } catch {
    res.status(503).json({ status: 'unhealthy', db: 'disconnected', timestamp: new Date().toISOString() })
  }
})

// Sitemap
app.get('/sitemap.xml', async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0]
    const SITE_URL = process.env.FRONTEND_URL || 'https://app.moonbootssports.com'

    const pages = [
      { loc: '/', changefreq: 'weekly', priority: '1.0' },
      { loc: '/about', changefreq: 'monthly', priority: '0.8' },
      { loc: '/request-demo', changefreq: 'monthly', priority: '0.8' },
      { loc: '/terms', changefreq: 'monthly', priority: '0.5' },
      { loc: '/login', changefreq: 'monthly', priority: '0.5' },
    ]

    const urls = pages.map(p => `  <url>
    <loc>${SITE_URL}${p.loc}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${p.changefreq}</changefreq>
    <priority>${p.priority}</priority>
  </url>`).join('\n')

    const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>`

    res.set('Content-Type', 'text/xml; charset=utf-8')
    res.set('Cache-Control', 'public, max-age=3600')
    res.send(sitemap)
  } catch (err) {
    console.error('Sitemap generation error:', err.message)
    const fallback = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>https://app.moonbootssports.com/</loc></url>
  <url><loc>https://app.moonbootssports.com/about</loc></url>
</urlset>`
    res.set('Content-Type', 'text/xml; charset=utf-8')
    res.status(200).send(fallback)
  }
})

// Robots.txt - dynamic
app.get('/robots.txt', (req, res) => {
  const robotsTxt = `# MoonBoots Sports - Robots.txt
# https://app.moonbootssports.com

User-agent: *
Allow: /
Allow: /about
Allow: /request-demo
Allow: /terms
Allow: /login

# Disallow authenticated app routes
Disallow: /admin
Disallow: /dashboard
Disallow: /chat
Disallow: /tactics
Disallow: /training
Disallow: /players
Disallow: /matches
Disallow: /fixtures
Disallow: /league
Disallow: /lounge
Disallow: /player-lounge
Disallow: /settings
Disallow: /invite
Disallow: /club/

# Disallow API routes
Disallow: /api/

# Sitemap
Sitemap: https://app.moonbootssports.com/sitemap.xml
`

  res.set('Content-Type', 'text/plain; charset=utf-8')
  res.set('Cache-Control', 'public, max-age=86400')
  res.send(robotsTxt)
})

// Serve static files (SPA catch-all)
const distPath = path.join(__dirname, '../client/dist')
if (fs.existsSync(distPath)) {
  app.use('/assets', express.static(path.join(distPath, 'assets'), {
    maxAge: '1y',
    immutable: true,
  }))

  app.use(express.static(distPath, {
    maxAge: '1h',
  }))

  app.get('*', (req, res) => {
    res.set('Cache-Control', 'public, max-age=0, must-revalidate')
    res.sendFile(path.join(distPath, 'index.html'))
  })
}

// Error handler
app.use(errorHandler)

// Ensure critical tables/columns exist for demo seed (migration may have failed partway)

// Seed demo school if it doesn't exist
async function ensureDemoSchool() {
  try {
    // Schema ensure now runs inside runMigrations() (see db/legacyEnsure.js)
    const exists = await pool.query(`SELECT id FROM schools WHERE slug = 'ashworth-park-demo' LIMIT 1`)
    if (exists.rows.length > 0) {
      // Check if school was fully seeded (has demo users)
      const demoUsers = await pool.query(`SELECT COUNT(*) FROM users WHERE is_demo_user = true`)
      if (parseInt(demoUsers.rows[0].count) > 0) {
        return console.log('[DemoSeed] Demo school fully seeded.')
      }
      // School exists but has no demo data - wipe everything and re-seed
      console.log('[DemoSeed] Demo school exists but is empty, wiping and re-seeding...')
      const dui = `(SELECT id FROM users WHERE is_demo_user = true)`
      await pool.query(`DELETE FROM schools WHERE slug = 'ashworth-park-demo'`)
      for (const sql of [
        `DELETE FROM pupils WHERE user_id IN ${dui}`,
        `DELETE FROM team_memberships WHERE user_id IN ${dui}`,
        `DELETE FROM school_members WHERE user_id IN ${dui}`,
        `DELETE FROM safeguarding_incidents WHERE reported_by IN ${dui}`,
        `DELETE FROM audit_log WHERE user_id IN ${dui}`,
        `DELETE FROM observations WHERE observer_id IN ${dui}`,
        `DELETE FROM notifications WHERE user_id IN ${dui}`,
      ]) { try { await pool.query(sql) } catch (e) { /* ok */ } }
      await pool.query(`DELETE FROM users WHERE is_demo_user = true`)
    }

    console.log('[DemoSeed] Seeding Ashworth Park Academy...')
    const school = await seedSchool()
    console.log('[DemoSeed] School:', school.id)
    const staff = await seedStaff(school.id)
    console.log('[DemoSeed] Staff done')
    const pupils = await seedPupils(school.id)
    console.log('[DemoSeed] Pupils:', pupils.length)
    const teams = await seedTeams(school.id, staff, pupils)
    console.log('[DemoSeed] Teams:', teams.length)
    await seedCurriculum(school.id, staff, pupils).catch(e => console.error('[DemoSeed] Curriculum:', e.message))
    await seedLessons(school.id, staff).catch(e => console.error('[DemoSeed] Lessons:', e.message))
    await seedAssessments(school.id).catch(e => console.error('[DemoSeed] Assessments:', e.message))
    await seedReports(school.id).catch(e => console.error('[DemoSeed] Reports:', e.message))
    await seedFixtures(school.id, teams, staff, pupils).catch(e => console.error('[DemoSeed] Fixtures:', e.message))
    await seedFixturesExtra(school.id).catch(e => console.error('[DemoSeed] Extra fixtures:', e.message))
    await seedSafeguarding(school.id, staff).catch(e => console.error('[DemoSeed] Safeguarding:', e.message))
    await seedAuditLog(school.id, staff).catch(e => console.error('[DemoSeed] AuditLog:', e.message))
    console.log('[DemoSeed] Done.')
  } catch (err) {
    console.error('[DemoSeed] FAILED:', err.message)
  }
}

// Ensure admin users exist and link to demo school
// Retroactively fix pupils data gaps for existing records
async function fixPupilTeamIds() {
  try {
    // Fix team_id from team_memberships
    const teamFix = await pool.query(`
      UPDATE pupils p
      SET team_id = tm.team_id
      FROM team_memberships tm
      WHERE tm.pupil_id = p.id
        AND p.team_id IS NULL
        AND tm.is_primary = true
    `)
    if (teamFix.rowCount > 0) {
      console.log(`[DataFix] Set team_id on ${teamFix.rowCount} pupils from team_memberships`)
    }

    // Fix first_name / last_name from name (for records created before split was added)
    const nameFix = await pool.query(`
      UPDATE pupils
      SET first_name = split_part(name, ' ', 1),
          last_name = CASE
            WHEN position(' ' in name) > 0
            THEN substring(name from position(' ' in name) + 1)
            ELSE ''
          END
      WHERE name IS NOT NULL
        AND (first_name IS NULL OR first_name = '')
    `)
    if (nameFix.rowCount > 0) {
      console.log(`[DataFix] Split name into first/last for ${nameFix.rowCount} pupils`)
    }
  } catch (err) {
    console.warn('[DataFix] fixPupilTeamIds:', err.message)
  }
}

// Ensure configured admin users exist and (in demo mode) are linked to the demo school.
// Admin identities come from ADMIN_EMAILS (same list used by the auth middleware to
// auto-grant admin on login). New accounts are only created when SEED_ADMIN_PASSWORD is
// set — there is no hardcoded fallback password.
async function seedAdminUsersAndLink() {
  const adminEmails = (process.env.ADMIN_EMAILS || '')
    .split(',').map(e => e.trim()).filter(Boolean)
  if (adminEmails.length === 0) {
    console.log('[Admin] ADMIN_EMAILS not set — skipping admin seeding')
    return
  }
  const seedPassword = process.env.SEED_ADMIN_PASSWORD || null
  for (const email of adminEmails) {
    try {
      let userId
      const exists = await pool.query('SELECT id, is_admin FROM users WHERE LOWER(email) = $1', [email.toLowerCase()])
      if (exists.rows.length > 0) {
        userId = exists.rows[0].id
        if (!exists.rows[0].is_admin) await pool.query('UPDATE users SET is_admin = true WHERE id = $1', [userId])
      } else {
        if (!seedPassword) {
          console.warn(`[Admin] ${email} not found and SEED_ADMIN_PASSWORD not set — skipping account creation`)
          continue
        }
        const hash = await bcrypt.hash(seedPassword, 10)
        const r = await pool.query(`INSERT INTO users (name, email, password_hash, role, is_admin) VALUES ($1, $2, $3, 'manager', true) RETURNING id`, [email.split('@')[0], email.toLowerCase(), hash])
        userId = r.rows[0].id
        console.log(`[Admin] Created: ${email}`)
      }
      // Link to demo school (demo environments only — the demo school may not exist elsewhere)
      try {
        const school = await pool.query(`SELECT id FROM schools WHERE slug = 'ashworth-park-demo' LIMIT 1`)
        if (school.rows.length > 0) {
          const sid = school.rows[0].id
          await pool.query(`INSERT INTO school_members (school_id, user_id, role, school_role, can_view_all_classes, can_view_all_teams, can_manage_curriculum, can_view_reports, can_manage_safeguarding, joined_at) VALUES ($1, $2, 'teacher', 'head_of_pe', true, true, true, true, true, NOW()) ON CONFLICT (school_id, user_id) DO NOTHING`, [sid, userId])
          const allTeams = await pool.query(`SELECT id FROM teams WHERE school_id = $1`, [sid])
          if (allTeams.rows.length > 0) {
            // Set primary team_id to first team
            await pool.query(`UPDATE users SET team_id = $1, has_completed_onboarding = true WHERE id = $2`, [allTeams.rows[0].id, userId])
            // Add as manager of ALL teams in the school
            for (const t of allTeams.rows) {
              await pool.query(`INSERT INTO team_memberships (team_id, user_id, role, is_primary, created_at) VALUES ($1, $2, 'manager', $3, NOW()) ON CONFLICT (user_id, team_id) DO NOTHING`, [t.id, userId, t.id === allTeams.rows[0].id])
            }
          }
        }
      } catch (linkErr) { console.warn(`[Admin] Link failed for ${email}:`, linkErr.message) }
    } catch (err) { console.error(`[Admin] Failed ${email}:`, err.message) }
  }
}

// Run migrations and start server
runMigrations().then(() => {
  // Create HTTP server with custom timeouts for large video uploads
  const server = http.createServer(app)

  // Set timeouts for large file uploads (30 minutes for multi-GB files)
  server.timeout = 30 * 60 * 1000 // 30 minutes
  server.headersTimeout = 31 * 60 * 1000 // Slightly longer than timeout
  server.keepAliveTimeout = 30 * 60 * 1000 // Keep connections alive during uploads
  server.requestTimeout = 30 * 60 * 1000 // Request timeout

  server.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`)
    console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`)
    console.log(`⏱️  Upload timeout: 30 minutes`)

    // Demo data seeding + admin linking run only in demo environments (SEED_DEMO_DATA=true).
    // The pupil data-repair pass is idempotent and only fills NULLs, so it runs everywhere.
    const seedDemo = process.env.SEED_DEMO_DATA === 'true'
      ? ensureDemoSchool().then(() => seedAdminUsersAndLink())
      : Promise.resolve()
    seedDemo
      .then(() => fixPupilTeamIds())
      .catch(err => console.error('[Startup] Seed/data-fix error:', err))

    // Run lifecycle scanners on startup (delayed 30s to let DB settle),
    // then every 24 hours
    const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000
    setTimeout(() => {
      scanTrialLifecycle().catch(err => console.error('[TrialLifecycle] Startup scan error:', err))
      purgeExpiredVoiceAudio().catch(err => console.error('[VoiceRetention] Startup scan error:', err))
      setInterval(() => {
        scanTrialLifecycle().catch(err => console.error('[TrialLifecycle] Scheduled scan error:', err))
        purgeExpiredVoiceAudio().catch(err => console.error('[VoiceRetention] Scheduled scan error:', err))
      }, TWENTY_FOUR_HOURS)
    }, 30_000)

    // Demo tenant nightly reset (03:00 UK time) - only when DEMO_RESET_ENABLED=true
    scheduleDemoReset()
  })
})

export default app
