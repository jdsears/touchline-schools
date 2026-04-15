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

    // Seed admin users (independent of migrations)
    seedAdminUsers().catch(err => console.error('[Admin] Seed error:', err))

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
