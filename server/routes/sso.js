/**
 * SSO Routes – Microsoft 365 & Google Workspace for Education
 *
 * GET  /api/sso/:provider/initiate  – start OAuth flow (returns redirect URL)
 * GET  /api/sso/:provider/callback  – OAuth callback from provider
 * GET  /api/sso/config              – get school's SSO config (HoD only)
 * PUT  /api/sso/config              – update school SSO config (HoD only)
 * GET  /api/sso/domains             – list allowed SSO domains
 * POST /api/sso/domains             – add domain to allowlist
 * DELETE /api/sso/domains/:domain   – remove domain from allowlist
 * GET  /api/sso/providers           – list available providers (public)
 */

import express from 'express'
import jwt from 'jsonwebtoken'
import pool from '../config/database.js'
import { authenticateToken } from '../middleware/auth.js'
import { HOD_ROLES } from '../middleware/schoolAuth.js'
import {
  initiateSso,
  handleCallback,
  getSchoolSsoConfig,
  updateSchoolSsoConfig,
  getDomainAllowlist,
  addDomainToAllowlist,
  removeDomainFromAllowlist,
  purgeExpiredSsoStates,
} from '../services/ssoService.js'
import { getFrontendUrl } from '../utils/urlUtils.js'

const router = express.Router()

const JWT_SECRET = process.env.JWT_SECRET
const JWT_EXPIRES_IN = '30d'

// Middleware: require HoD-level access with school context
async function requireSsoAdmin(req, res, next) {
  try {
    if (!req.user) return res.status(401).json({ error: 'Authentication required' })
    if (req.user.is_admin) {
      const s = await pool.query('SELECT id FROM schools LIMIT 1')
      req.schoolId = s.rows[0]?.id
      return next()
    }
    const result = await pool.query(
      `SELECT sm.school_id FROM school_members sm
       WHERE sm.user_id = $1 AND (sm.school_role = ANY($2) OR sm.role = ANY($2))
       LIMIT 1`,
      [req.user.id, HOD_ROLES]
    )
    if (result.rows.length === 0) {
      return res.status(403).json({ error: 'School admin access required' })
    }
    req.schoolId = result.rows[0].school_id
    next()
  } catch (e) {
    next(e)
  }
}

// ---------------------------------------------------------------------------
// Public: list available SSO providers (so login page knows what to show)
// ---------------------------------------------------------------------------
router.get('/providers', async (req, res) => {
  const providers = []

  if (process.env.MICROSOFT_CLIENT_ID) {
    providers.push({ id: 'microsoft', label: 'Microsoft 365', icon: 'microsoft' })
  }
  if (process.env.GOOGLE_CLIENT_ID) {
    providers.push({ id: 'google', label: 'Google Workspace', icon: 'google' })
  }

  // Also check if the request's email domain maps to a school with SSO
  const { school_slug } = req.query
  if (school_slug) {
    const school = await pool.query(
      'SELECT sso_provider FROM schools WHERE slug = $1',
      [school_slug]
    )
    if (school.rows[0]?.sso_provider) {
      // Return school-specific provider first if not already in list
      const p = school.rows[0].sso_provider
      if (!providers.find(x => x.id === p)) {
        providers.unshift({ id: p, label: p === 'microsoft' ? 'Microsoft 365' : 'Google Workspace', icon: p, school_only: true })
      }
    }
  }

  res.json({ providers })
})

// ---------------------------------------------------------------------------
// Initiate SSO: generate auth URL and redirect
// ---------------------------------------------------------------------------
router.get('/:provider/initiate', async (req, res) => {
  const { provider } = req.params
  const { school_id, redirect_to = '/teacher' } = req.query

  if (!['microsoft', 'google'].includes(provider)) {
    return res.status(400).json({ error: 'Unsupported SSO provider' })
  }

  // Check if this provider is enabled
  if (provider === 'microsoft' && !process.env.MICROSOFT_CLIENT_ID) {
    return res.status(503).json({ error: 'Microsoft SSO is not configured' })
  }
  if (provider === 'google' && !process.env.GOOGLE_CLIENT_ID) {
    return res.status(503).json({ error: 'Google SSO is not configured' })
  }

  try {
    const { authUrl } = await initiateSso(provider, {
      schoolId: school_id || null,
      redirectTo: redirect_to,
    })

    // Redirect directly to provider
    res.redirect(authUrl)
  } catch (error) {
    console.error('[SSO] Initiate error:', error)
    const frontendUrl = getFrontendUrl()
    res.redirect(`${frontendUrl}/login?error=sso_init_failed`)
  }
})

// ---------------------------------------------------------------------------
// Callback: handle OAuth response, issue JWT, redirect to frontend
// ---------------------------------------------------------------------------
router.get('/:provider/callback', async (req, res) => {
  const { provider } = req.params
  const { code, state, error: oauthError, error_description } = req.query
  const frontendUrl = getFrontendUrl()

  if (oauthError) {
    console.error('[SSO] Provider error:', oauthError, error_description)
    return res.redirect(`${frontendUrl}/login?error=sso_denied&detail=${encodeURIComponent(error_description || oauthError)}`)
  }

  if (!code || !state) {
    return res.redirect(`${frontendUrl}/login?error=sso_missing_params`)
  }

  try {
    const { user, redirectTo } = await handleCallback(provider, { code, state })

    // Issue our JWT
    const token = jwt.sign(
      { userId: user.id },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    )

    // Audit log
    try {
      await pool.query(
        `INSERT INTO audit_log (user_id, action, entity_type, details)
         VALUES ($1, 'sso_login', 'user', $2)`,
        [user.id, JSON.stringify({ provider, email: user.email })]
      )
    } catch (_) {
      // Non-fatal
    }

    // Redirect to frontend SSO callback page with token
    const destination = redirectTo || '/teacher'
    res.redirect(`${frontendUrl}/sso-callback?token=${encodeURIComponent(token)}&redirect=${encodeURIComponent(destination)}`)
  } catch (error) {
    console.error('[SSO] Callback error:', error)
    const message = error.message || 'SSO authentication failed'
    res.redirect(`${frontendUrl}/login?error=sso_failed&detail=${encodeURIComponent(message)}`)
  }
})

// ---------------------------------------------------------------------------
// School SSO Configuration (HoD/admin only)
// ---------------------------------------------------------------------------

// GET /api/sso/config
router.get('/config', authenticateToken, requireSsoAdmin, async (req, res) => {
  try {
    const config = await getSchoolSsoConfig(req.schoolId)
    const domains = await getDomainAllowlist(req.schoolId)

    res.json({
      sso_provider: config?.sso_provider || null,
      sso_config: config?.sso_config
        ? {
          // Never return secrets
          tenant_id: config.sso_config.tenant_id,
          hd: config.sso_config.hd,
          has_client_id: !!config.sso_config.client_id,
          has_client_secret: !!config.sso_config.client_secret,
        }
        : null,
      domains,
      platform_providers: {
        microsoft: !!process.env.MICROSOFT_CLIENT_ID,
        google: !!process.env.GOOGLE_CLIENT_ID,
      },
    })
  } catch (error) {
    console.error('[SSO] Config fetch error:', error)
    res.status(500).json({ error: 'Failed to load SSO configuration' })
  }
})

// PUT /api/sso/config
router.put('/config', authenticateToken, requireSsoAdmin, async (req, res) => {
  try {
    const { provider, tenant_id, hd, client_id, client_secret } = req.body

    if (provider && !['microsoft', 'google', null].includes(provider)) {
      return res.status(400).json({ error: 'Invalid provider. Must be microsoft, google, or null to disable.' })
    }

    const config = {}
    if (tenant_id) config.tenant_id = tenant_id
    if (hd) config.hd = hd
    // Only update client credentials if provided (don't wipe existing secrets)
    if (client_id) config.client_id = client_id
    if (client_secret) config.client_secret = client_secret

    await updateSchoolSsoConfig(
      req.schoolId,
      provider || null,
      Object.keys(config).length > 0 ? config : null
    )

    res.json({ success: true, sso_provider: provider || null })
  } catch (error) {
    console.error('[SSO] Config update error:', error)
    res.status(500).json({ error: 'Failed to update SSO configuration' })
  }
})

// GET /api/sso/domains
router.get('/domains', authenticateToken, requireSsoAdmin, async (req, res) => {
  try {
    const domains = await getDomainAllowlist(req.schoolId)
    res.json(domains)
  } catch (error) {
    res.status(500).json({ error: 'Failed to load domains' })
  }
})

// POST /api/sso/domains
router.post('/domains', authenticateToken, requireSsoAdmin, async (req, res) => {
  try {
    const { domain } = req.body
    if (!domain) return res.status(400).json({ error: 'domain is required' })

    // Basic validation
    if (!/^[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9]\.[a-zA-Z]{2,}$/.test(domain)) {
      return res.status(400).json({ error: 'Invalid domain format' })
    }

    await addDomainToAllowlist(req.schoolId, domain)
    const domains = await getDomainAllowlist(req.schoolId)
    res.json(domains)
  } catch (error) {
    console.error('[SSO] Domain add error:', error)
    res.status(500).json({ error: 'Failed to add domain' })
  }
})

// DELETE /api/sso/domains/:domain
router.delete('/domains/:domain', authenticateToken, requireSsoAdmin, async (req, res) => {
  try {
    await removeDomainFromAllowlist(req.schoolId, req.params.domain)
    const domains = await getDomainAllowlist(req.schoolId)
    res.json(domains)
  } catch (error) {
    res.status(500).json({ error: 'Failed to remove domain' })
  }
})

export default router
