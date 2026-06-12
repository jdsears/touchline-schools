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
async function ensureDemoPrerequisites() {
  const stmts = [
    // Rename clubs -> schools if needed
    `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'schools') THEN IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'clubs') THEN ALTER TABLE clubs RENAME TO schools; END IF; END IF; END $$`,
    // Rename club_members -> school_members if needed
    `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'school_members') THEN IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'club_members') THEN ALTER TABLE club_members RENAME TO school_members; END IF; END IF; END $$`,
  ]
  // Rename club_id -> school_id in all tables that still have the old column name
  const clubIdTables = ['school_members', 'teams', 'school_announcements', 'school_comms_log', 'compliance_records', 'safeguarding_roles', 'safeguarding_incidents', 'compliance_alerts', 'school_events', 'event_registrations', 'session_schedule', 'match_reports', 'ai_insights', 'ai_usage', 'grant_drafts', 'teaching_groups', 'pupils']
  for (const t of clubIdTables) {
    stmts.push(`DO $$ BEGIN IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = '${t}' AND column_name = 'club_id') THEN ALTER TABLE ${t} RENAME COLUMN club_id TO school_id; END IF; END $$`)
  }
  // Add missing columns on schools (if table exists)
  const schoolCols = ['school_type TEXT', 'urn TEXT', 'voice_observations_enabled BOOLEAN DEFAULT false', 'audio_retention_days INTEGER DEFAULT 7', 'transcript_retention_days INTEGER DEFAULT 30', 'is_demo_tenant BOOLEAN DEFAULT false']
  for (const col of schoolCols) stmts.push(`ALTER TABLE schools ADD COLUMN IF NOT EXISTS ${col}`)
  // Add missing columns on school_members (if table exists)
  const smCols = ['school_role TEXT', 'can_view_all_classes BOOLEAN DEFAULT false', 'can_view_all_teams BOOLEAN DEFAULT false', 'can_manage_curriculum BOOLEAN DEFAULT false', 'can_view_reports BOOLEAN DEFAULT false', 'can_manage_safeguarding BOOLEAN DEFAULT false']
  for (const col of smCols) stmts.push(`ALTER TABLE school_members ADD COLUMN IF NOT EXISTS ${col}`)
  // Add missing columns on teams
  stmts.push(`ALTER TABLE teams ADD COLUMN IF NOT EXISTS school_id UUID`, `ALTER TABLE teams ADD COLUMN IF NOT EXISTS sport TEXT`, `ALTER TABLE teams ADD COLUMN IF NOT EXISTS gender TEXT`, `ALTER TABLE teams ADD COLUMN IF NOT EXISTS season_type TEXT`, `ALTER TABLE teams ADD COLUMN IF NOT EXISTS owner_id UUID`)
  // Ensure pupils has team_id column (needed by team queries)
  stmts.push(`ALTER TABLE pupils ADD COLUMN IF NOT EXISTS team_id UUID`)
  // Ensure team_memberships exists
  stmts.push(`CREATE TABLE IF NOT EXISTS team_memberships (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), team_id UUID REFERENCES teams(id) ON DELETE CASCADE, user_id UUID REFERENCES users(id) ON DELETE CASCADE, pupil_id UUID, role TEXT DEFAULT 'player', is_primary BOOLEAN DEFAULT false, created_at TIMESTAMPTZ DEFAULT NOW(), UNIQUE(user_id, team_id))`)
  // Ensure pupils table exists (may still be named players)
  stmts.push(`DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'pupils') THEN IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'players') THEN ALTER TABLE players RENAME TO pupils; ELSE CREATE TABLE pupils (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), name TEXT NOT NULL, school_id UUID, year_group INTEGER, house TEXT, date_of_birth DATE, is_active BOOLEAN DEFAULT true, user_id UUID, created_at TIMESTAMPTZ DEFAULT NOW()); END IF; END IF; END $$`)
  // Add missing columns on pupils
  stmts.push(`ALTER TABLE pupils ADD COLUMN IF NOT EXISTS year_group INTEGER`)
  stmts.push(`ALTER TABLE pupils ADD COLUMN IF NOT EXISTS house TEXT`)
  stmts.push(`ALTER TABLE pupils ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true`)
  stmts.push(`ALTER TABLE pupils ADD COLUMN IF NOT EXISTS user_id UUID`)
  stmts.push(`ALTER TABLE pupils ADD COLUMN IF NOT EXISTS school_id UUID`)
  stmts.push(`ALTER TABLE pupils ADD COLUMN IF NOT EXISTS first_name TEXT`)
  stmts.push(`ALTER TABLE pupils ADD COLUMN IF NOT EXISTS last_name TEXT`)
  stmts.push(`ALTER TABLE pupils ADD COLUMN IF NOT EXISTS nicknames TEXT`)
  stmts.push(`ALTER TABLE pupils ADD COLUMN IF NOT EXISTS protected_from_reset BOOLEAN DEFAULT false`)
  stmts.push(`ALTER TABLE pupils ADD COLUMN IF NOT EXISTS gcse_pe_candidate BOOLEAN NOT NULL DEFAULT FALSE`)
  // v1.7 test persona columns
  stmts.push(`ALTER TABLE users ADD COLUMN IF NOT EXISTS is_test_persona BOOLEAN DEFAULT false`)
  stmts.push(`ALTER TABLE users ADD COLUMN IF NOT EXISTS protected_from_reset BOOLEAN DEFAULT false`)
  // Add missing columns on teaching_groups
  stmts.push(`ALTER TABLE teaching_groups ADD COLUMN IF NOT EXISTS group_identifier TEXT`)
  stmts.push(`ALTER TABLE teaching_groups ADD COLUMN IF NOT EXISTS academic_year TEXT`)
  stmts.push(`ALTER TABLE teaching_groups ADD COLUMN IF NOT EXISTS key_stage TEXT DEFAULT 'KS3'`)
  // Add 'date' column to matches (many queries use m.date, table has match_date)
  stmts.push(`ALTER TABLE matches ADD COLUMN IF NOT EXISTS date DATE`)
  stmts.push(`UPDATE matches SET date = match_date WHERE date IS NULL AND match_date IS NOT NULL`)
  // v1.6 school profile columns
  const schoolProfileCols = ['school_type TEXT', 'urn TEXT', 'head_teacher_name TEXT', 'head_teacher_email TEXT', 'safeguarding_lead_name TEXT', 'safeguarding_lead_email TEXT', 'dpo_name TEXT', 'dpo_email TEXT', 'accent_color TEXT']
  for (const col of schoolProfileCols) stmts.push(`ALTER TABLE schools ADD COLUMN IF NOT EXISTS ${col}`)
  // Add missing columns on observations
  stmts.push(`ALTER TABLE observations ADD COLUMN IF NOT EXISTS source TEXT`)
  stmts.push(`ALTER TABLE observations ADD COLUMN IF NOT EXISTS review_state TEXT`)
  stmts.push(`ALTER TABLE observations ADD COLUMN IF NOT EXISTS sport TEXT`)
  stmts.push(`ALTER TABLE observations ADD COLUMN IF NOT EXISTS teaching_group_id UUID`)
  stmts.push(`ALTER TABLE observations ADD COLUMN IF NOT EXISTS visible_to_pupil BOOLEAN NOT NULL DEFAULT FALSE`)
  // Add missing columns on reporting_windows
  stmts.push(`ALTER TABLE reporting_windows ADD COLUMN IF NOT EXISTS year_groups TEXT`)
  // Add missing columns on pupil_assessments and pupil_reports
  stmts.push(`ALTER TABLE pupil_assessments ADD COLUMN IF NOT EXISTS assessed_by UUID`)
  stmts.push(`ALTER TABLE pupil_assessments ADD COLUMN IF NOT EXISTS unit_id UUID`)
  // Rename sport_unit_id to unit_id if it exists (schema fix)
  stmts.push(`DO $$ BEGIN IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'pupil_assessments' AND column_name = 'sport_unit_id') AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'pupil_assessments' AND column_name = 'unit_id') THEN ALTER TABLE pupil_assessments RENAME COLUMN sport_unit_id TO unit_id; END IF; END $$`)
  stmts.push(`ALTER TABLE pupil_reports ADD COLUMN IF NOT EXISTS unit_id UUID`)
  stmts.push(`ALTER TABLE pupil_reports ADD COLUMN IF NOT EXISTS sport TEXT`)
  stmts.push(`ALTER TABLE pupil_reports ADD COLUMN IF NOT EXISTS attainment_grade TEXT`)
  stmts.push(`ALTER TABLE pupil_reports ADD COLUMN IF NOT EXISTS teacher_comment TEXT`)
  stmts.push(`ALTER TABLE pupil_reports ADD COLUMN IF NOT EXISTS generated_by UUID`)
  stmts.push(`ALTER TABLE pupil_reports ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ`)
  stmts.push(`ALTER TABLE pupil_reports ADD COLUMN IF NOT EXISTS teaching_group_id UUID`)
  stmts.push(`ALTER TABLE pupil_reports ADD COLUMN IF NOT EXISTS teacher_id UUID`)
  // assessment_criteria: seed uses 'criterion' and 'key_stage' columns
  stmts.push(`ALTER TABLE assessment_criteria ADD COLUMN IF NOT EXISTS criterion TEXT`)
  stmts.push(`ALTER TABLE assessment_criteria ADD COLUMN IF NOT EXISTS key_stage TEXT`)
  // pupil_assessments: seed uses 'criteria_id' and 'assessment_type' and 'teacher_notes'
  stmts.push(`ALTER TABLE pupil_assessments ADD COLUMN IF NOT EXISTS criteria_id UUID`)
  stmts.push(`ALTER TABLE pupil_assessments ADD COLUMN IF NOT EXISTS assessment_type TEXT DEFAULT 'formative'`)
  stmts.push(`ALTER TABLE pupil_assessments ADD COLUMN IF NOT EXISTS teacher_notes TEXT`)
  // Create all tables the demo seed needs (Phases 8-12 of migration that may not have run)
  const createTables = [
    `CREATE TABLE IF NOT EXISTS teacher_sports (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), teacher_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE, sport TEXT NOT NULL, role TEXT DEFAULT 'coach', created_at TIMESTAMPTZ DEFAULT NOW(), UNIQUE(teacher_id, sport))`,
    `CREATE TABLE IF NOT EXISTS audit_log (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), school_id UUID, user_id UUID, action TEXT NOT NULL, entity_type TEXT, entity_id UUID, details JSONB, ip_address TEXT, created_at TIMESTAMPTZ DEFAULT NOW())`,
    `CREATE TABLE IF NOT EXISTS teaching_groups (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), school_id UUID, name TEXT NOT NULL, year_group INTEGER, group_identifier TEXT, teacher_id UUID, academic_year TEXT, key_stage TEXT DEFAULT 'KS3', created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW())`,
    `CREATE TABLE IF NOT EXISTS teaching_group_pupils (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), teaching_group_id UUID REFERENCES teaching_groups(id) ON DELETE CASCADE, pupil_id UUID, created_at TIMESTAMPTZ DEFAULT NOW(), UNIQUE(teaching_group_id, pupil_id))`,
    `CREATE TABLE IF NOT EXISTS sport_units (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), teaching_group_id UUID REFERENCES teaching_groups(id) ON DELETE CASCADE, sport TEXT NOT NULL, unit_name TEXT NOT NULL, curriculum_area TEXT, start_date DATE, end_date DATE, term TEXT, lesson_count INTEGER, display_order INTEGER DEFAULT 0, created_at TIMESTAMPTZ DEFAULT NOW())`,
    `CREATE TABLE IF NOT EXISTS assessment_scales (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), school_id UUID, name TEXT NOT NULL, key_stage TEXT, scale_type TEXT DEFAULT 'descriptive', grades JSONB, is_default BOOLEAN DEFAULT false, created_at TIMESTAMPTZ DEFAULT NOW())`,
    `CREATE TABLE IF NOT EXISTS curriculum_strands (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), school_id UUID, key_stage TEXT, strand_name TEXT NOT NULL, description TEXT, display_order INTEGER DEFAULT 0, is_system_default BOOLEAN DEFAULT false, created_at TIMESTAMPTZ DEFAULT NOW())`,
    `CREATE TABLE IF NOT EXISTS assessment_criteria (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), strand_id UUID, sport TEXT, criterion_name TEXT NOT NULL, description TEXT, display_order INTEGER DEFAULT 0, created_at TIMESTAMPTZ DEFAULT NOW())`,
    `CREATE TABLE IF NOT EXISTS pupil_assessments (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), pupil_id UUID, unit_id UUID, strand_id UUID, criterion_id UUID, grade TEXT, teacher_id UUID, assessed_at TIMESTAMPTZ DEFAULT NOW(), created_at TIMESTAMPTZ DEFAULT NOW())`,
    `CREATE TABLE IF NOT EXISTS reporting_windows (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), school_id UUID, name TEXT NOT NULL, academic_year TEXT, term TEXT, opens_at TIMESTAMPTZ, closes_at TIMESTAMPTZ, status TEXT DEFAULT 'draft', created_at TIMESTAMPTZ DEFAULT NOW())`,
    `CREATE TABLE IF NOT EXISTS pupil_reports (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), pupil_id UUID NOT NULL, reporting_window_id UUID, teaching_group_id UUID, teacher_id UUID, unit_id UUID, overall_grade TEXT, effort_grade TEXT, comment TEXT, ai_draft TEXT, status TEXT DEFAULT 'draft', created_at TIMESTAMPTZ DEFAULT NOW())`,
    `CREATE TABLE IF NOT EXISTS lesson_plans (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), teaching_group_id UUID REFERENCES teaching_groups(id) ON DELETE CASCADE, sport_unit_id UUID REFERENCES sport_units(id) ON DELETE SET NULL, teacher_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE, title TEXT NOT NULL, lesson_date DATE, duration INTEGER DEFAULT 60, learning_objectives TEXT, activities TEXT, equipment TEXT, differentiation TEXT, homework TEXT, status TEXT DEFAULT 'draft', created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW())`,
    `CREATE TABLE IF NOT EXISTS data_export_requests (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), school_id UUID, pupil_id UUID, request_type TEXT NOT NULL, status TEXT DEFAULT 'pending', created_at TIMESTAMPTZ DEFAULT NOW(), completed_at TIMESTAMPTZ)`,
    `CREATE TABLE IF NOT EXISTS data_deletion_log (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), school_id UUID, pupil_reference TEXT, reason TEXT, created_at TIMESTAMPTZ DEFAULT NOW())`,
    `CREATE TABLE IF NOT EXISTS gdpr_consent_records (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), school_id UUID, pupil_id UUID, consent_type TEXT NOT NULL, granted BOOLEAN DEFAULT false, withdrawn_at TIMESTAMPTZ, created_at TIMESTAMPTZ DEFAULT NOW())`,
    // v1.6 Settings restructure tables
    `CREATE TABLE IF NOT EXISTS school_sports_configuration (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), school_id UUID NOT NULL, sport_key TEXT NOT NULL, active BOOLEAN DEFAULT true, ngb_framework_key TEXT, grading_scale_override_id UUID, created_at TIMESTAMPTZ DEFAULT NOW(), UNIQUE(school_id, sport_key))`,
    `CREATE TABLE IF NOT EXISTS school_academic_structure (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), school_id UUID NOT NULL UNIQUE, year_groups_offered JSONB DEFAULT '[]', house_system JSONB, term_dates JSONB DEFAULT '[]', assessment_windows JSONB DEFAULT '[]', reporting_windows_config JSONB DEFAULT '[]', created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW())`,
    `CREATE TABLE IF NOT EXISTS school_licence (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), school_id UUID NOT NULL UNIQUE, term_start DATE, term_end DATE, seat_count INTEGER DEFAULT 0, sport_count INTEGER DEFAULT 0, commercial_contact_name TEXT, commercial_contact_email TEXT, notes TEXT, created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW())`,
    `CREATE TABLE IF NOT EXISTS staff_qualifications (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), user_id UUID NOT NULL, school_id UUID, qualification_type TEXT NOT NULL, qualification_name TEXT NOT NULL, issue_date DATE, expiry_date DATE, reference_number TEXT, document_url TEXT, created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW())`,
    `CREATE TABLE IF NOT EXISTS knowledge_base_resources (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), school_id UUID NOT NULL, uploader_id UUID, title TEXT NOT NULL, file_url TEXT, file_type TEXT, file_size INTEGER, sports JSONB DEFAULT '[]', year_groups JSONB DEFAULT '[]', description TEXT, visibility TEXT DEFAULT 'all', created_at TIMESTAMPTZ DEFAULT NOW(), archived_at TIMESTAMPTZ)`,
    `CREATE TABLE IF NOT EXISTS reporting_templates (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), school_id UUID NOT NULL, template_type TEXT NOT NULL, name TEXT NOT NULL, structure JSONB DEFAULT '{}', tone_guidance TEXT, is_default BOOLEAN DEFAULT false, created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW())`,
    `CREATE TABLE IF NOT EXISTS fixture_defaults (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), school_id UUID NOT NULL, sport_key TEXT, age_group TEXT, match_duration_minutes INTEGER, default_home_ground_address TEXT, default_travel_arrangement TEXT, default_kit_config JSONB DEFAULT '{}', created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW(), UNIQUE(school_id, sport_key, age_group))`,
    `CREATE TABLE IF NOT EXISTS notification_preferences (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), user_id UUID NOT NULL UNIQUE, fixture_reminders BOOLEAN DEFAULT true, assessment_deadlines BOOLEAN DEFAULT true, report_due_dates BOOLEAN DEFAULT true, pupil_observations BOOLEAN DEFAULT true, safeguarding_concerns BOOLEAN DEFAULT true, weekly_digest BOOLEAN DEFAULT false, monthly_summary BOOLEAN DEFAULT false, product_updates BOOLEAN DEFAULT false, email_enabled BOOLEAN DEFAULT true, push_enabled BOOLEAN DEFAULT false, created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW())`,
    `CREATE TABLE IF NOT EXISTS user_accessibility (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), user_id UUID NOT NULL UNIQUE, font_size TEXT DEFAULT 'medium', reduced_motion BOOLEAN DEFAULT false, high_contrast BOOLEAN DEFAULT false, screen_reader_optimised BOOLEAN DEFAULT false, created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW())`,
    `CREATE TABLE IF NOT EXISTS venues (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), school_id UUID NOT NULL, name TEXT NOT NULL, address TEXT, postcode TEXT, latitude DOUBLE PRECISION, longitude DOUBLE PRECISION, parking_notes TEXT, changing_room_notes TEXT, pitch_layout_notes TEXT, contact_name TEXT, contact_phone TEXT, accessibility_notes TEXT, is_school_venue BOOLEAN DEFAULT false, last_visited_date DATE, archived_at TIMESTAMPTZ, created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW())`,
    `CREATE TABLE IF NOT EXISTS fixture_travel (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), match_id UUID NOT NULL UNIQUE, transport_mode TEXT NOT NULL DEFAULT 'school_coach', departure_location TEXT, departure_time TIME, return_time TIME, contact_phone TEXT, special_instructions TEXT, coordinator_notes TEXT, parent_lifts_requested BOOLEAN DEFAULT false, created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW())`,
    `CREATE TABLE IF NOT EXISTS travel_assignments (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), match_id UUID NOT NULL, pupil_id UUID NOT NULL, transport_mode TEXT NOT NULL DEFAULT 'team', driver_name TEXT, driver_capacity INTEGER, notes TEXT, created_at TIMESTAMPTZ DEFAULT NOW(), UNIQUE(match_id, pupil_id))`,
    `CREATE TABLE IF NOT EXISTS mis_integrations (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), school_id UUID NOT NULL UNIQUE, provider TEXT NOT NULL DEFAULT 'isams', api_endpoint TEXT, api_key_encrypted TEXT, sync_frequency TEXT DEFAULT 'nightly', sync_scope TEXT DEFAULT 'pupils_staff', last_sync_at TIMESTAMPTZ, last_sync_status TEXT, last_sync_summary JSONB, consecutive_failures INTEGER DEFAULT 0, is_test_mode BOOLEAN DEFAULT true, created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW())`,
    `CREATE TABLE IF NOT EXISTS mis_sync_log (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), school_id UUID NOT NULL, status TEXT NOT NULL, summary JSONB, is_dry_run BOOLEAN DEFAULT false, error_message TEXT, started_at TIMESTAMPTZ DEFAULT NOW(), completed_at TIMESTAMPTZ)`,
    `CREATE TABLE IF NOT EXISTS concussion_incidents (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), pupil_id UUID NOT NULL, match_id UUID, school_id UUID NOT NULL, occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), reported_by_user_id UUID NOT NULL, severity TEXT DEFAULT 'awaiting_assessment', symptoms_observed JSONB DEFAULT '[]', immediate_action_taken TEXT, doctor_assessment_required BOOLEAN DEFAULT true, parent_notified_at TIMESTAMPTZ, return_to_play_status TEXT DEFAULT 'excluded', return_to_play_protocol_started_at TIMESTAMPTZ, fully_cleared_at TIMESTAMPTZ, notes TEXT, external_platform_id TEXT, created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW())`,
    `CREATE TABLE IF NOT EXISTS concussion_followups (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), incident_id UUID NOT NULL REFERENCES concussion_incidents(id) ON DELETE CASCADE, stage INTEGER NOT NULL DEFAULT 1, followup_date DATE NOT NULL, completed_at TIMESTAMPTZ, notes TEXT, completed_by_user_id UUID, created_at TIMESTAMPTZ DEFAULT NOW())`,
    `CREATE TABLE IF NOT EXISTS consent_types (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), school_id UUID NOT NULL, name TEXT NOT NULL, description TEXT, is_per_term BOOLEAN DEFAULT false, is_per_fixture BOOLEAN DEFAULT false, expiry_period_months INTEGER, requires_text_acknowledgement BOOLEAN DEFAULT true, default_response TEXT DEFAULT 'no_default', display_order INTEGER DEFAULT 0, created_at TIMESTAMPTZ DEFAULT NOW())`,
    `CREATE TABLE IF NOT EXISTS pupil_consents (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), pupil_id UUID NOT NULL, consent_type_id UUID NOT NULL REFERENCES consent_types(id) ON DELETE CASCADE, status TEXT NOT NULL DEFAULT 'pending', granted_at TIMESTAMPTZ, granted_by_parent_email TEXT, expires_at TIMESTAMPTZ, parent_signature_text TEXT, consent_text_version TEXT, ip_address TEXT, notes TEXT, created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW(), UNIQUE(pupil_id, consent_type_id))`,
  ]
  for (const sql of createTables) stmts.push(sql)
  stmts.push(`ALTER TABLE matches ADD COLUMN IF NOT EXISTS venue_id UUID REFERENCES venues(id) ON DELETE SET NULL`)
  stmts.push(`CREATE INDEX IF NOT EXISTS idx_venues_school ON venues(school_id)`)
  stmts.push(`ALTER TABLE schools ADD COLUMN IF NOT EXISTS public_fixtures_enabled BOOLEAN DEFAULT false`)
  stmts.push(`ALTER TABLE schools ADD COLUMN IF NOT EXISTS public_name_format TEXT DEFAULT 'first_initial'`)
  stmts.push(`ALTER TABLE teams ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT false`)
  stmts.push(`ALTER TABLE matches ADD COLUMN IF NOT EXISTS match_report_text TEXT`)
  stmts.push(`ALTER TABLE matches ADD COLUMN IF NOT EXISTS match_report_status TEXT DEFAULT 'none'`)
  stmts.push(`ALTER TABLE matches ADD COLUMN IF NOT EXISTS match_report_approved_by UUID`)
  stmts.push(`ALTER TABLE matches ADD COLUMN IF NOT EXISTS match_report_approved_at TIMESTAMPTZ`)

  for (const sql of stmts) {
    try { await pool.query(sql) } catch (e) { console.warn('[DemoPrereq]', e.message.slice(0, 80)) }
  }
}

// Seed demo school if it doesn't exist
async function ensureDemoSchool() {
  try {
    await ensureDemoPrerequisites()
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
