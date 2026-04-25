import pool from '../../config/database.js'
import crypto from 'crypto'

const ENCRYPTION_KEY = process.env.MIS_ENCRYPTION_KEY || 'default-dev-key-change-in-production!!'
const IV_LENGTH = 16

function encrypt(text) {
  const key = crypto.scryptSync(ENCRYPTION_KEY, 'salt', 32)
  const iv = crypto.randomBytes(IV_LENGTH)
  const cipher = crypto.createCipheriv('aes-256-cbc', key, iv)
  let encrypted = cipher.update(text, 'utf8', 'hex')
  encrypted += cipher.final('hex')
  return iv.toString('hex') + ':' + encrypted
}

function decrypt(text) {
  const key = crypto.scryptSync(ENCRYPTION_KEY, 'salt', 32)
  const [ivHex, encrypted] = text.split(':')
  const iv = Buffer.from(ivHex, 'hex')
  const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv)
  let decrypted = decipher.update(encrypted, 'hex', 'utf8')
  decrypted += decipher.final('utf8')
  return decrypted
}

export async function getConfig(schoolId) {
  const result = await pool.query(
    'SELECT * FROM mis_integrations WHERE school_id = $1',
    [schoolId]
  )
  if (!result.rows.length) return null
  const config = result.rows[0]
  return {
    id: config.id,
    schoolId: config.school_id,
    provider: config.provider,
    apiEndpoint: config.api_endpoint,
    hasApiKey: !!config.api_key_encrypted,
    syncFrequency: config.sync_frequency,
    syncScope: config.sync_scope,
    lastSyncAt: config.last_sync_at,
    lastSyncStatus: config.last_sync_status,
    lastSyncSummary: config.last_sync_summary,
    consecutiveFailures: config.consecutive_failures,
    isTestMode: config.is_test_mode,
    createdAt: config.created_at,
  }
}

export async function saveConfig(schoolId, { apiEndpoint, apiKey, syncFrequency, syncScope, isTestMode }) {
  const existing = await pool.query('SELECT id FROM mis_integrations WHERE school_id = $1', [schoolId])

  if (existing.rows.length) {
    const updates = []
    const params = [schoolId]
    let idx = 2
    if (apiEndpoint !== undefined) { updates.push(`api_endpoint = $${idx++}`); params.push(apiEndpoint) }
    if (apiKey) { updates.push(`api_key_encrypted = $${idx++}`); params.push(encrypt(apiKey)) }
    if (syncFrequency !== undefined) { updates.push(`sync_frequency = $${idx++}`); params.push(syncFrequency) }
    if (syncScope !== undefined) { updates.push(`sync_scope = $${idx++}`); params.push(syncScope) }
    if (isTestMode !== undefined) { updates.push(`is_test_mode = $${idx++}`); params.push(isTestMode) }
    updates.push('updated_at = NOW()')
    await pool.query(`UPDATE mis_integrations SET ${updates.join(', ')} WHERE school_id = $1`, params)
  } else {
    await pool.query(
      `INSERT INTO mis_integrations (school_id, provider, api_endpoint, api_key_encrypted, sync_frequency, sync_scope, is_test_mode)
       VALUES ($1, 'isams', $2, $3, $4, $5, $6)`,
      [schoolId, apiEndpoint, apiKey ? encrypt(apiKey) : null, syncFrequency || 'nightly', syncScope || 'pupils_staff', isTestMode !== false]
    )
  }
  return getConfig(schoolId)
}

export async function getSyncHistory(schoolId, limit = 10) {
  const result = await pool.query(
    `SELECT * FROM mis_sync_log WHERE school_id = $1 ORDER BY started_at DESC LIMIT $2`,
    [schoolId, limit]
  )
  return result.rows
}

export async function logSync(schoolId, { status, summary, dryRun, error }) {
  await pool.query(
    `INSERT INTO mis_sync_log (school_id, status, summary, is_dry_run, error_message, started_at, completed_at)
     VALUES ($1, $2, $3, $4, $5, NOW(), NOW())`,
    [schoolId, status, summary ? JSON.stringify(summary) : null, dryRun || false, error || null]
  )

  if (status === 'success') {
    await pool.query(
      `UPDATE mis_integrations SET last_sync_at = NOW(), last_sync_status = 'success',
        last_sync_summary = $2, consecutive_failures = 0, updated_at = NOW() WHERE school_id = $1`,
      [schoolId, summary ? JSON.stringify(summary) : null]
    )
  } else {
    await pool.query(
      `UPDATE mis_integrations SET last_sync_status = 'error',
        consecutive_failures = consecutive_failures + 1, updated_at = NOW() WHERE school_id = $1`,
      [schoolId]
    )
  }
}

export async function getDecryptedApiKey(schoolId) {
  const result = await pool.query(
    'SELECT api_key_encrypted FROM mis_integrations WHERE school_id = $1',
    [schoolId]
  )
  if (!result.rows.length || !result.rows[0].api_key_encrypted) return null
  try {
    return decrypt(result.rows[0].api_key_encrypted)
  } catch {
    return null
  }
}

async function fetchFromiSAMS(apiEndpoint, apiKey, resource) {
  const url = `${apiEndpoint.replace(/\/$/, '')}/api/${resource}`
  const res = await fetch(url, {
    headers: { 'Authorization': `Bearer ${apiKey}`, 'Accept': 'application/json' },
    signal: AbortSignal.timeout(30000),
  })
  if (!res.ok) throw new Error(`iSAMS API error: ${res.status} ${res.statusText}`)
  return res.json()
}

export async function runSync(schoolId, { dryRun = false } = {}) {
  const config = await pool.query('SELECT * FROM mis_integrations WHERE school_id = $1', [schoolId])
  if (!config.rows.length) throw new Error('MIS integration not configured')
  const c = config.rows[0]

  const apiKey = c.api_key_encrypted ? decrypt(c.api_key_encrypted) : null
  if (!apiKey || !c.api_endpoint) throw new Error('API endpoint or key not configured')

  const summary = { pupils: { added: 0, updated: 0, deactivated: 0 }, staff: { added: 0, updated: 0 } }

  try {
    const pupils = await fetchFromiSAMS(c.api_endpoint, apiKey, 'students')
    const pupilList = Array.isArray(pupils) ? pupils : (pupils.students || pupils.data || [])

    for (const p of pupilList) {
      const email = (p.email || `${(p.firstName || '').toLowerCase()}.${(p.lastName || '').toLowerCase()}@isams.sync`).toLowerCase()
      const existing = await pool.query(
        `SELECT u.id, p2.id AS pupil_id, p2.year_group, p2.house FROM users u
         LEFT JOIN pupils p2 ON p2.user_id = u.id
         WHERE LOWER(u.email) = $1`, [email]
      )

      if (dryRun) {
        if (existing.rows.length) summary.pupils.updated++
        else summary.pupils.added++
        continue
      }

      if (existing.rows.length) {
        const u = existing.rows[0]
        await pool.query('UPDATE users SET name = $1, updated_at = NOW() WHERE id = $2',
          [`${p.firstName} ${p.lastName}`, u.id])
        if (u.pupil_id) {
          await pool.query(
            `UPDATE pupils SET first_name = $1, last_name = $2, year_group = $3, house = $4, is_active = true WHERE id = $5`,
            [p.firstName, p.lastName, p.yearGroup || u.year_group, p.house || u.house, u.pupil_id]
          )
        }
        summary.pupils.updated++
      } else {
        const userRes = await pool.query(
          `INSERT INTO users (name, email, role, is_demo_user, created_at)
           VALUES ($1, $2, 'manager', false, NOW()) ON CONFLICT (email) DO UPDATE SET name = $1 RETURNING id`,
          [`${p.firstName} ${p.lastName}`, email]
        )
        await pool.query(
          `INSERT INTO pupils (name, first_name, last_name, year_group, house, user_id, is_active, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, true, NOW())`,
          [`${p.firstName} ${p.lastName}`, p.firstName, p.lastName, p.yearGroup, p.house, userRes.rows[0].id]
        )
        await pool.query(
          `INSERT INTO school_members (school_id, user_id, role, school_role, joined_at)
           VALUES ($1, $2, 'parent', 'read_only', NOW()) ON CONFLICT (school_id, user_id) DO NOTHING`,
          [schoolId, userRes.rows[0].id]
        )
        summary.pupils.added++
      }
    }

    if (c.sync_scope !== 'pupils_only') {
      const staff = await fetchFromiSAMS(c.api_endpoint, apiKey, 'staff')
      const staffList = Array.isArray(staff) ? staff : (staff.staff || staff.data || [])

      for (const s of staffList) {
        const email = (s.email || '').toLowerCase()
        if (!email) continue
        const existing = await pool.query('SELECT id FROM users WHERE LOWER(email) = $1', [email])

        if (dryRun) {
          if (existing.rows.length) summary.staff.updated++
          else summary.staff.added++
          continue
        }

        if (existing.rows.length) {
          await pool.query('UPDATE users SET name = $1, updated_at = NOW() WHERE id = $2',
            [`${s.firstName || s.title || ''} ${s.lastName}`.trim(), existing.rows[0].id])
          summary.staff.updated++
        } else {
          const userRes = await pool.query(
            `INSERT INTO users (name, email, role, created_at) VALUES ($1, $2, 'manager', NOW())
             ON CONFLICT (email) DO UPDATE SET name = $1 RETURNING id`,
            [`${s.firstName || s.title || ''} ${s.lastName}`.trim(), email]
          )
          await pool.query(
            `INSERT INTO school_members (school_id, user_id, role, school_role, joined_at)
             VALUES ($1, $2, 'teacher', 'teacher', NOW()) ON CONFLICT (school_id, user_id) DO NOTHING`,
            [schoolId, userRes.rows[0].id]
          )
          summary.staff.added++
        }
      }
    }

    await logSync(schoolId, { status: 'success', summary, dryRun })
    return { status: 'success', summary, dryRun }
  } catch (error) {
    await logSync(schoolId, { status: 'error', error: error.message, dryRun })
    throw error
  }
}
