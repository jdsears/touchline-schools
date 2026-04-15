import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import dotenv from 'dotenv'
import path from 'path'
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
import assessmentRoutes from './routes/assessments.js'
import sportKnowledgeBaseRoutes from './routes/sportKnowledgeBase.js'
import hodRoutes from './routes/headOfDepartment.js'
import onboardingRoutes from './routes/onboarding.js'
import pupilManagementRoutes from './routes/pupilManagement.js'
import reportingRoutes from './routes/reporting.js'
import enterpriseBillingRoutes from './routes/enterpriseBilling.js'
import voiceObservationRoutes from './routes/voiceObservations.js'
import voiceSafeguardingRoutes from './routes/voiceSafeguarding.js'
import gdprRoutes from './routes/gdpr.js'
import ssoRoutes from './routes/sso.js'
import demoRequestRoutes from './routes/demoRequests.js'

import { seedSchool } from './db/demo-seed/school.js'
import { seedStaff } from './db/demo-seed/staff.js'
import { seedPupils } from './db/demo-seed/pupils.js'
import { seedTeams } from './db/demo-seed/teams.js'
import { seedCurriculum } from './db/demo-seed/curriculum.js'
import { seedFixtures } from './db/demo-seed/fixtures.js'
import { seedSafeguarding } from './db/demo-seed/safeguarding.js'
import { seedAuditLog } from './db/demo-seed/auditLog.js'

// Cron jobs
import { scanTrialLifecycle } from './cron/trialLifecycle.js'
import { purgeExpiredVoiceAudio } from './cron/voiceObservationRetention.js'
import { scheduleDemoReset } from './cron/demoReset.js'

import bcrypt from 'bcryptjs'

// Middleware
import { errorHandler } from './middleware/errorHandler.js'

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
app.use(helmet({
  contentSecurityPolicy: false, // CSP can break inline scripts; enable and configure when ready
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
app.use('/api/assessments', assessmentRoutes)
app.use('/api/sport-knowledge', sportKnowledgeBaseRoutes)
app.use('/api/hod', hodRoutes)
app.use('/api/onboarding', onboardingRoutes)
app.use('/api/pupil-management', pupilManagementRoutes)
app.use('/api/reporting', reportingRoutes)
app.use('/api/enterprise-billing', enterpriseBillingRoutes)
app.use('/api/voice-observations', voiceObservationRoutes)
app.use('/api/voice-safeguarding', voiceSafeguardingRoutes)
app.use('/api/gdpr', gdprRoutes)
app.use('/api/sso', ssoRoutes)
app.use('/api/demo-requests', demoRequestRoutes)

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

// Debug endpoint - shows DB state to diagnose demo seed issues
app.get('/api/debug-db', async (req, res) => {
  try {
    const tables = await pool.query(`SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name`)
    const tableNames = tables.rows.map(r => r.table_name)

    const checks = {}

    // Check schools
    if (tableNames.includes('schools')) {
      const cols = await pool.query(`SELECT column_name FROM information_schema.columns WHERE table_name = 'schools' ORDER BY ordinal_position`)
      checks.schools_columns = cols.rows.map(r => r.column_name)
      const count = await pool.query('SELECT COUNT(*) FROM schools')
      checks.schools_count = parseInt(count.rows[0].count)
      const demo = await pool.query(`SELECT id, name, slug FROM schools WHERE slug = 'ashworth-park-demo' LIMIT 1`)
      checks.demo_school = demo.rows[0] || null
    }

    // Check users
    if (tableNames.includes('users')) {
      const cols = await pool.query(`SELECT column_name FROM information_schema.columns WHERE table_name = 'users' ORDER BY ordinal_position`)
      checks.users_columns = cols.rows.map(r => r.column_name)
      const count = await pool.query('SELECT COUNT(*) FROM users')
      checks.users_count = parseInt(count.rows[0].count)
      const admins = await pool.query(`SELECT id, name, email, is_admin, team_id FROM users WHERE is_admin = true`)
      checks.admin_users = admins.rows
    }

    // Check school_members
    if (tableNames.includes('school_members')) {
      const count = await pool.query('SELECT COUNT(*) FROM school_members')
      checks.school_members_count = parseInt(count.rows[0].count)
    }

    // Check teams
    if (tableNames.includes('teams')) {
      const count = await pool.query('SELECT COUNT(*) FROM teams')
      checks.teams_count = parseInt(count.rows[0].count)
      const cols = await pool.query(`SELECT column_name FROM information_schema.columns WHERE table_name = 'teams' AND column_name IN ('school_id', 'sport', 'gender')`)
      checks.teams_has_columns = cols.rows.map(r => r.column_name)
    }

    // Check pupils
    if (tableNames.includes('pupils')) {
      const count = await pool.query('SELECT COUNT(*) FROM pupils')
      checks.pupils_count = parseInt(count.rows[0].count)
    } else if (tableNames.includes('players')) {
      checks.pupils_table = 'MISSING (still named players)'
      const count = await pool.query('SELECT COUNT(*) FROM players')
      checks.players_count = parseInt(count.rows[0].count)
    }

    // Check team_memberships
    checks.has_team_memberships = tableNames.includes('team_memberships')

    // Try the seed and capture error
    checks.seed_test = 'not attempted'
    if (!checks.demo_school) {
      try {
        await ensureDemoPrerequisites()
        checks.prerequisites = 'OK'
      } catch (e) {
        checks.prerequisites = e.message
      }
    }

    res.json({ tables: tableNames, checks, timestamp: new Date().toISOString() })
  } catch (err) {
    res.status(500).json({ error: err.message, stack: err.stack?.split('\n').slice(0, 5) })
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

// Serve static files in production
if (process.env.NODE_ENV === 'production') {
  // Hashed assets (JS/CSS with content hash in filename) are safe to cache forever
  app.use('/assets', express.static(path.join(__dirname, '../client/dist/assets'), {
    maxAge: '1y',
    immutable: true,
  }))

  // Other static files (favicon, manifest, images) get moderate cache
  app.use(express.static(path.join(__dirname, '../client/dist'), {
    maxAge: '1h',
  }))

  app.get('*', (req, res) => {
    // HTML should not be cached long, so browsers always get the latest version
    res.set('Cache-Control', 'public, max-age=0, must-revalidate')
    res.sendFile(path.join(__dirname, '../client/dist/index.html'))
  })
}

// Error handler
app.use(errorHandler)

// Ensure critical tables and columns exist before seeding (migration may have failed partway)
async function ensureDemoPrerequisites() {
  const stmts = [
    // Ensure schools table exists (may still be named 'clubs' from partial migration)
    `DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'schools') THEN
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'clubs') THEN
          ALTER TABLE clubs RENAME TO schools;
        ELSE
          CREATE TABLE schools (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            name TEXT NOT NULL, slug TEXT UNIQUE NOT NULL, logo_url TEXT,
            primary_color TEXT DEFAULT '#1a365d', secondary_color TEXT DEFAULT '#38a169',
            contact_email TEXT, contact_phone TEXT, website TEXT,
            address_line1 TEXT, address_line2 TEXT, city TEXT, county TEXT, postcode TEXT,
            subscription_tier TEXT DEFAULT 'club_starter', subscription_status TEXT DEFAULT 'trial',
            season_start_month INTEGER DEFAULT 9, season_end_month INTEGER DEFAULT 6,
            settings JSONB DEFAULT '{}',
            created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW()
          );
        END IF;
      END IF;
    END $$`,
    // Add columns the demo seed needs on schools
    `ALTER TABLE schools ADD COLUMN IF NOT EXISTS school_type TEXT`,
    `ALTER TABLE schools ADD COLUMN IF NOT EXISTS urn TEXT`,
    `ALTER TABLE schools ADD COLUMN IF NOT EXISTS voice_observations_enabled BOOLEAN DEFAULT false`,
    `ALTER TABLE schools ADD COLUMN IF NOT EXISTS audio_retention_days INTEGER DEFAULT 7`,
    `ALTER TABLE schools ADD COLUMN IF NOT EXISTS transcript_retention_days INTEGER DEFAULT 30`,
    `ALTER TABLE schools ADD COLUMN IF NOT EXISTS is_demo_tenant BOOLEAN DEFAULT false`,
    // Ensure school_members table exists
    `DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'school_members') THEN
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'club_members') THEN
          ALTER TABLE club_members RENAME TO school_members;
        ELSE
          CREATE TABLE school_members (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
            user_id UUID REFERENCES users(id) ON DELETE CASCADE,
            role TEXT DEFAULT 'teacher',
            joined_at TIMESTAMPTZ DEFAULT NOW(),
            UNIQUE(school_id, user_id)
          );
        END IF;
      END IF;
    END $$`,
    // Add columns needed by demo seed on school_members
    `ALTER TABLE school_members ADD COLUMN IF NOT EXISTS school_role TEXT`,
    `ALTER TABLE school_members ADD COLUMN IF NOT EXISTS can_view_all_classes BOOLEAN DEFAULT false`,
    `ALTER TABLE school_members ADD COLUMN IF NOT EXISTS can_view_all_teams BOOLEAN DEFAULT false`,
    `ALTER TABLE school_members ADD COLUMN IF NOT EXISTS can_manage_curriculum BOOLEAN DEFAULT false`,
    `ALTER TABLE school_members ADD COLUMN IF NOT EXISTS can_view_reports BOOLEAN DEFAULT false`,
    `ALTER TABLE school_members ADD COLUMN IF NOT EXISTS can_manage_safeguarding BOOLEAN DEFAULT false`,
    // Ensure teams has school_id column
    `ALTER TABLE teams ADD COLUMN IF NOT EXISTS school_id UUID REFERENCES schools(id) ON DELETE CASCADE`,
    `ALTER TABLE teams ADD COLUMN IF NOT EXISTS sport TEXT`,
    `ALTER TABLE teams ADD COLUMN IF NOT EXISTS gender TEXT`,
    `ALTER TABLE teams ADD COLUMN IF NOT EXISTS season_type TEXT`,
    // Ensure team_memberships table exists
    `CREATE TABLE IF NOT EXISTS team_memberships (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
      user_id UUID REFERENCES users(id) ON DELETE CASCADE,
      pupil_id UUID,
      role TEXT DEFAULT 'player',
      is_primary BOOLEAN DEFAULT false,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(user_id, team_id)
    )`,
  ]

  for (const sql of stmts) {
    try {
      await pool.query(sql)
    } catch (e) {
      console.warn('[DemoPrereq]', e.message)
    }
  }
}

// Seed demo school if it doesn't exist (runs independently of migrations)
async function ensureDemoSchool() {
  try {
    await ensureDemoPrerequisites()

    const exists = await pool.query(`SELECT id FROM schools WHERE slug = 'ashworth-park-demo' LIMIT 1`)
    if (exists.rows.length > 0) {
      console.log('[DemoSeed] Demo school already exists.')
      return
    }

    console.log('[DemoSeed] Seeding Ashworth Park Academy demo school...')
    const school = await seedSchool()
    console.log('[DemoSeed] School created:', school.id)
    const staff = await seedStaff(school.id)
    console.log('[DemoSeed] Staff created')
    const pupils = await seedPupils(school.id)
    console.log('[DemoSeed] Pupils created:', pupils.length)
    const teams = await seedTeams(school.id, staff, pupils)
    console.log('[DemoSeed] Teams created:', teams.length)
    await seedCurriculum(school.id, staff, pupils)
    console.log('[DemoSeed] Curriculum seeded')
    await seedFixtures(school.id, teams, staff, pupils)
    console.log('[DemoSeed] Fixtures seeded')
    await seedSafeguarding(school.id, staff)
    console.log('[DemoSeed] Safeguarding seeded')
    await seedAuditLog(school.id, staff)
    console.log('[DemoSeed] Ashworth Park Academy is ready.')
  } catch (err) {
    console.error('[DemoSeed] Failed to seed demo school:', err.message)
    console.error('[DemoSeed] Stack:', err.stack?.split('\n').slice(0, 3).join('\n'))
  }
}

// Ensure admin users exist and are linked to demo school (runs independently of migrations)
async function seedAdminUsers() {
  const admins = [
    { name: 'John Sears', email: 'js@moonbootsconsultancy.net' },
    { name: 'Peter Taylor', email: 'petertaylor1983@gmail.com' },
  ]
  const defaultPassword = 'MoonBoots2026!'

  for (const admin of admins) {
    try {
      const exists = await pool.query('SELECT id, is_admin FROM users WHERE LOWER(email) = $1', [admin.email.toLowerCase()])
      let userId
      if (exists.rows.length > 0) {
        userId = exists.rows[0].id
        if (!exists.rows[0].is_admin) {
          await pool.query('UPDATE users SET is_admin = true WHERE id = $1', [userId])
          console.log(`[Admin] Promoted ${admin.email} to admin`)
        }
      } else {
        const hash = await bcrypt.hash(defaultPassword, 10)
        const result = await pool.query(
          `INSERT INTO users (name, email, password_hash, role, is_admin) VALUES ($1, $2, $3, 'manager', true) RETURNING id`,
          [admin.name, admin.email.toLowerCase(), hash]
        )
        userId = result.rows[0].id
        console.log(`[Admin] Created admin: ${admin.email}`)
      }

      // Link admin to the demo school and a team if they exist
      if (userId) {
        try {
          const school = await pool.query(`SELECT id FROM schools WHERE slug = 'ashworth-park-demo' LIMIT 1`)
          if (school.rows.length > 0) {
            const schoolId = school.rows[0].id

            // Add to school_members
            await pool.query(
              `INSERT INTO school_members (
                school_id, user_id, role, school_role,
                can_view_all_classes, can_view_all_teams,
                can_manage_curriculum, can_view_reports,
                can_manage_safeguarding, joined_at
              ) VALUES ($1, $2, 'teacher', 'head_of_pe', true, true, true, true, true, NOW())
              ON CONFLICT (school_id, user_id) DO NOTHING`,
              [schoolId, userId]
            )

            // Link to the first team in the school so the app dashboard works
            const teamResult = await pool.query(
              `SELECT id FROM teams WHERE school_id = $1 ORDER BY created_at LIMIT 1`,
              [schoolId]
            )
            if (teamResult.rows.length > 0) {
              const teamId = teamResult.rows[0].id
              await pool.query(`UPDATE users SET team_id = $1, has_completed_onboarding = true WHERE id = $2 AND team_id IS NULL`, [teamId, userId])
              await pool.query(
                `INSERT INTO team_memberships (team_id, user_id, role, is_primary, created_at)
                 VALUES ($1, $2, 'manager', true, NOW())
                 ON CONFLICT (user_id, team_id) DO NOTHING`,
                [teamId, userId]
              )
            }

            console.log(`[Admin] Linked ${admin.email} to demo school`)
          }
        } catch (linkErr) {
          console.error(`[Admin] Failed to link ${admin.email} to demo school:`, linkErr.message)
        }
      }
    } catch (err) {
      console.error(`[Admin] Failed to seed ${admin.email}:`, err.message)
    }
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

    // Seed demo school and admin users (sequential: school first, then admins link to it)
    ensureDemoSchool()
      .then(() => seedAdminUsers())
      .catch(err => console.error('[Startup] Seed error:', err))

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
