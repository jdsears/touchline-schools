/**
 * Create admin users for MoonBoots Sports.
 *
 * Usage: node scripts/create-admins.js
 */

import bcrypt from 'bcryptjs'
import pool from '../config/database.js'
import dotenv from 'dotenv'

dotenv.config()

const ADMINS = [
  {
    name: 'John Sears',
    email: 'js@moonbootsconsultancy.net',
    password: 'MoonBoots2026!',
  },
  {
    name: 'Peter Taylor',
    email: 'petertaylor1983@gmail.com',
    password: 'MoonBoots2026!',
  },
]

async function createAdmins() {
  for (const admin of ADMINS) {
    const normalizedEmail = admin.email.trim().toLowerCase()

    // Check if user already exists
    const existing = await pool.query(
      'SELECT id, is_admin FROM users WHERE LOWER(email) = $1',
      [normalizedEmail]
    )

    if (existing.rows.length > 0) {
      const user = existing.rows[0]
      if (!user.is_admin) {
        await pool.query('UPDATE users SET is_admin = true WHERE id = $1', [user.id])
        console.log(`Updated ${admin.name} (${admin.email}) to admin.`)
      } else {
        console.log(`${admin.name} (${admin.email}) already exists as admin.`)
      }
      // Reset password to the specified one
      const passwordHash = await bcrypt.hash(admin.password, 10)
      await pool.query('UPDATE users SET password_hash = $1 WHERE id = $2', [passwordHash, user.id])
      console.log(`  Password reset for ${admin.email}`)
      continue
    }

    // Create new admin user
    const passwordHash = await bcrypt.hash(admin.password, 10)
    const result = await pool.query(
      `INSERT INTO users (name, email, password_hash, role, is_admin)
       VALUES ($1, $2, $3, 'manager', true)
       RETURNING id, email, name, role, is_admin`,
      [admin.name, normalizedEmail, passwordHash]
    )

    console.log(`Created admin: ${result.rows[0].name} (${result.rows[0].email})`)
  }

  console.log('\nDone. Both admins can log in at /login with their credentials.')
  process.exit(0)
}

createAdmins().catch(err => {
  console.error('Error creating admins:', err)
  process.exit(1)
})
