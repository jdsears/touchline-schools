/**
 * SSO Service - Microsoft 365 & Google Workspace for Education
 *
 * Uses openid-client v5 (OIDC Authorization Code flow with PKCE).
 *
 * Flow:
 *  1. /api/sso/:provider/initiate  → generates URL, stores state+PKCE in DB
 *  2. Provider redirects back      → /api/sso/:provider/callback
 *  3. Exchange code, validate      → get user info (email, name, sub)
 *  4. Find or create user account  → match by sso_sub, then email, then create
 *  5. Issue Touchline JWT          → redirect to /sso-callback?token=...
 *
 * School-level SSO config is stored in schools.sso_config (JSONB):
 *   { tenant_id: '...', hd: '...', allowed_domains: [...] }
 *
 * Platform-level defaults (multi-tenant, any school can sign in):
 *   MICROSOFT_CLIENT_ID / MICROSOFT_CLIENT_SECRET
 *   GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET
 */

import { Issuer, generators } from 'openid-client'
import pool from '../config/database.js'

// ---------------------------------------------------------------------------
// OIDC Issuer discovery (lazy, cached per provider)
// ---------------------------------------------------------------------------

let _microsoftIssuer = null
let _googleIssuer = null

async function getMicrosoftIssuer(tenantId = 'common') {
  // For multi-tenant, use 'common'. For single-tenant schools, use their tenantId.
  if (!_microsoftIssuer) {
    _microsoftIssuer = await Issuer.discover(
      `https://login.microsoftonline.com/${tenantId}/v2.0`
    )
  }
  return _microsoftIssuer
}

async function getGoogleIssuer() {
  if (!_googleIssuer) {
    _googleIssuer = await Issuer.discover('https://accounts.google.com')
  }
  return _googleIssuer
}

// ---------------------------------------------------------------------------
// Build OIDC client for a given provider + school config
// ---------------------------------------------------------------------------

export async function buildClient(provider, schoolSsoConfig = {}) {
  const redirectUri = `${process.env.BACKEND_URL || 'https://app.moonbootssports.com'}/api/sso/${provider}/callback`

  if (provider === 'microsoft') {
    const tenantId = schoolSsoConfig.tenant_id || process.env.MICROSOFT_TENANT_ID || 'common'
    const issuer = await getMicrosoftIssuer(tenantId)
    return new issuer.Client({
      client_id: schoolSsoConfig.client_id || process.env.MICROSOFT_CLIENT_ID,
      client_secret: schoolSsoConfig.client_secret || process.env.MICROSOFT_CLIENT_SECRET,
      redirect_uris: [redirectUri],
      response_types: ['code'],
    })
  }

  if (provider === 'google') {
    const issuer = await getGoogleIssuer()
    return new issuer.Client({
      client_id: schoolSsoConfig.client_id || process.env.GOOGLE_CLIENT_ID,
      client_secret: schoolSsoConfig.client_secret || process.env.GOOGLE_CLIENT_SECRET,
      redirect_uris: [redirectUri],
      response_types: ['code'],
    })
  }

  throw new Error(`Unsupported SSO provider: ${provider}`)
}

// ---------------------------------------------------------------------------
// Initiate: generate auth URL + persist PKCE state
// ---------------------------------------------------------------------------

export async function initiateSso(provider, { schoolId, redirectTo = '/teacher' } = {}) {
  // Look up school SSO config if a schoolId is provided
  let schoolSsoConfig = {}
  if (schoolId) {
    const result = await pool.query(
      'SELECT sso_provider, sso_config FROM schools WHERE id = $1',
      [schoolId]
    )
    if (result.rows[0]?.sso_config) {
      schoolSsoConfig = result.rows[0].sso_config
    }
  }

  const client = await buildClient(provider, schoolSsoConfig)

  // PKCE
  const codeVerifier = generators.codeVerifier()
  const codeChallenge = generators.codeChallenge(codeVerifier)
  const state = generators.state()

  // Persist state for callback verification
  await pool.query(
    `INSERT INTO sso_state (state, provider, school_id, code_verifier, redirect_to)
     VALUES ($1, $2, $3, $4, $5)`,
    [state, provider, schoolId || null, codeVerifier, redirectTo]
  )

  // Build authorization URL
  const params = {
    scope: provider === 'microsoft'
      ? 'openid profile email offline_access'
      : 'openid profile email',
    state,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
  }

  // Google Workspace: restrict to school domain if configured
  if (provider === 'google' && schoolSsoConfig.hd) {
    params.hd = schoolSsoConfig.hd
  }

  // Microsoft: request specific tenant if configured
  if (provider === 'microsoft' && schoolSsoConfig.tenant_id) {
    // Tenant is already baked into the issuer URL
  }

  const authUrl = client.authorizationUrl(params)

  return { authUrl, state }
}

// ---------------------------------------------------------------------------
// Callback: exchange code, get user info, find/create account
// ---------------------------------------------------------------------------

export async function handleCallback(provider, callbackParams) {
  // Look up the stored state
  const stateResult = await pool.query(
    `SELECT * FROM sso_state
     WHERE state = $1 AND provider = $2 AND expires_at > NOW()`,
    [callbackParams.state, provider]
  )

  if (stateResult.rows.length === 0) {
    throw new Error('Invalid or expired SSO state. Please try signing in again.')
  }

  const storedState = stateResult.rows[0]

  // Clean up the state entry immediately (one-time use)
  await pool.query('DELETE FROM sso_state WHERE id = $1', [storedState.id])

  // Look up school SSO config
  let schoolSsoConfig = {}
  if (storedState.school_id) {
    const schoolResult = await pool.query(
      'SELECT sso_config FROM schools WHERE id = $1',
      [storedState.school_id]
    )
    if (schoolResult.rows[0]?.sso_config) {
      schoolSsoConfig = schoolResult.rows[0].sso_config
    }
  }

  const client = await buildClient(provider, schoolSsoConfig)

  // Exchange code for tokens
  const redirectUri = `${process.env.BACKEND_URL || 'https://app.moonbootssports.com'}/api/sso/${provider}/callback`
  const tokenSet = await client.callback(
    redirectUri,
    { code: callbackParams.code, state: callbackParams.state },
    {
      code_verifier: storedState.code_verifier,
      state: storedState.state,
    }
  )

  // Get user info from the ID token claims or userinfo endpoint
  let claims
  if (tokenSet.id_token) {
    claims = tokenSet.claims()
  } else {
    // Fallback: userinfo endpoint
    claims = await client.userinfo(tokenSet.access_token)
  }

  const ssoSub = claims.sub
  const ssoEmail = (claims.email || claims.preferred_username || '').toLowerCase()
  const ssoName = claims.name || claims.given_name
    ? `${claims.given_name || ''} ${claims.family_name || ''}`.trim()
    : ssoEmail.split('@')[0]

  if (!ssoEmail) {
    throw new Error('SSO provider did not return an email address. Check your app registration includes email scope.')
  }

  // ---------------------------------------------------------------------------
  // Find or create the user account
  // ---------------------------------------------------------------------------

  // 1. Look for existing user with this SSO identity
  let user = await findUserBySsoSub(provider, ssoSub)

  // 2. Look for existing user with matching email (link SSO to existing account)
  if (!user) {
    user = await findUserByEmail(ssoEmail)
    if (user) {
      // Link the SSO identity to the existing account
      await pool.query(
        `UPDATE users SET sso_provider = $1, sso_sub = $2, sso_email = $3 WHERE id = $4`,
        [provider, ssoSub, ssoEmail, user.id]
      )
    }
  }

  // 3. Check if this domain is in the allowlist for a school
  //    If so, auto-provision the user
  if (!user) {
    const domain = ssoEmail.split('@')[1]
    const allowlistResult = await pool.query(
      `SELECT dal.school_id, s.name as school_name
       FROM sso_domain_allowlist dal
       JOIN schools s ON dal.school_id = s.id
       WHERE dal.domain = $1`,
      [domain]
    )

    if (allowlistResult.rows.length > 0) {
      // Auto-provision: create user and add to school as 'teacher'
      const school = allowlistResult.rows[0]
      const newUserResult = await pool.query(
        `INSERT INTO users (name, email, password_hash, role, sso_provider, sso_sub, sso_email)
         VALUES ($1, $2, '', 'manager', $3, $4, $5)
         RETURNING *`,
        [ssoName, ssoEmail, provider, ssoSub, ssoEmail]
      )
      user = newUserResult.rows[0]

      // Add to school as teacher
      await pool.query(
        `INSERT INTO school_members (school_id, user_id, role, school_role, can_view_reports, joined_at)
         VALUES ($1, $2, 'teacher', 'teacher', true, NOW())
         ON CONFLICT (school_id, user_id) DO NOTHING`,
        [school.school_id, user.id]
      )
    }
  }

  if (!user) {
    throw new Error(
      `No MoonBoots Sports account found for ${ssoEmail}. ` +
      'Ask your school admin to add you to MoonBoots Sports first, then sign in again.'
    )
  }

  return {
    user,
    redirectTo: storedState.redirect_to || '/teacher',
    schoolId: storedState.school_id,
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function findUserBySsoSub(provider, sub) {
  const result = await pool.query(
    'SELECT * FROM users WHERE sso_provider = $1 AND sso_sub = $2',
    [provider, sub]
  )
  return result.rows[0] || null
}

async function findUserByEmail(email) {
  const result = await pool.query(
    'SELECT * FROM users WHERE LOWER(email) = $1',
    [email.toLowerCase()]
  )
  return result.rows[0] || null
}

// ---------------------------------------------------------------------------
// School SSO Configuration
// ---------------------------------------------------------------------------

export async function getSchoolSsoConfig(schoolId) {
  const result = await pool.query(
    'SELECT sso_provider, sso_config FROM schools WHERE id = $1',
    [schoolId]
  )
  return result.rows[0] || null
}

export async function updateSchoolSsoConfig(schoolId, provider, config) {
  await pool.query(
    `UPDATE schools SET sso_provider = $1, sso_config = $2 WHERE id = $3`,
    [provider || null, config ? JSON.stringify(config) : null, schoolId]
  )
}

export async function getDomainAllowlist(schoolId) {
  const result = await pool.query(
    'SELECT domain FROM sso_domain_allowlist WHERE school_id = $1 ORDER BY domain',
    [schoolId]
  )
  return result.rows.map(r => r.domain)
}

export async function addDomainToAllowlist(schoolId, domain) {
  await pool.query(
    `INSERT INTO sso_domain_allowlist (school_id, domain) VALUES ($1, $2)
     ON CONFLICT (school_id, domain) DO NOTHING`,
    [schoolId, domain.toLowerCase().trim()]
  )
}

export async function removeDomainFromAllowlist(schoolId, domain) {
  await pool.query(
    'DELETE FROM sso_domain_allowlist WHERE school_id = $1 AND domain = $2',
    [schoolId, domain.toLowerCase().trim()]
  )
}

// Purge expired SSO states (called from cron or on-demand)
export async function purgeExpiredSsoStates() {
  const result = await pool.query('DELETE FROM sso_state WHERE expires_at < NOW()')
  if (result.rowCount > 0) {
    console.log(`[SSO] Purged ${result.rowCount} expired SSO state entries`)
  }
}
