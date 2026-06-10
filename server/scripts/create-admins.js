/**
 * Create or promote admin users for MoonBoots Sports.
 *
 * Identities come from ADMIN_EMAILS (comma-separated). New accounts are created
 * with SEED_ADMIN_PASSWORD; existing accounts are promoted to admin and, if a
 * password is provided, have their password reset to it.
 *
 * Usage:
 *   ADMIN_EMAILS="a@x.com,b@y.com" SEED_ADMIN_PASSWORD="..." node scripts/create-admins.js
 */

import bcrypt from 'bcryptjs'
import pool from '../config/database.js'
import dotenv from 'dotenv'

dotenv.config()

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || '')
  .split(',').map(e => e.trim()).filter(Boolean)
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD || ''

async function createAdmins() {
  if (ADMIN_EMAILS.length === 0) {
    console.error('ADMIN_EMAILS is not set. Aborting.')
    process.exit(1)
  }

  for (const email of ADMIN_EMAILS) {
    const normalizedEmail = email.trim().toLowerCase()
    const name = normalizedEmail.split('@')[0]

    // Check if user already exists
    const existing = await pool.query(
      'SELECT id, is_admin FROM users WHERE LOWER(email) = $1',
      [normalizedEmail]
    )

    if (existing.rows.length > 0) {
      const user = existing.rows[0]
      if (!user.is_admin) {
        await pool.query('UPDATE users SET is_admin = true WHERE id = $1', [user.id])
        console.log(`Promoted ${normalizedEmail} to admin.`)
      } else {
        console.log(`${normalizedEmail} already exists as admin.`)
      }
      // Optionally reset password when one is supplied
      if (ADMIN_PASSWORD) {
        const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 10)
        await pool.query('UPDATE users SET password_hash = $1 WHERE id = $2', [passwordHash, user.id])
        console.log(`  Password reset for ${normalizedEmail}`)
      }
      continue
    }

    // Create new admin user (requires a password)
    if (!ADMIN_PASSWORD) {
      console.warn(`${normalizedEmail} not found and SEED_ADMIN_PASSWORD not set — skipping creation.`)
      continue
    }
    const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 10)
    const result = await pool.query(
      `INSERT INTO users (name, email, password_hash, role, is_admin)
       VALUES ($1, $2, $3, 'manager', true)
       RETURNING id, email, name, role, is_admin`,
      [name, normalizedEmail, passwordHash]
    )

    console.log(`Created admin: ${result.rows[0].email}`)
  }

  console.log('\nDone.')
  process.exit(0)
}

createAdmins().catch(err => {
  console.error('Error creating admins:', err)
  process.exit(1)
})
