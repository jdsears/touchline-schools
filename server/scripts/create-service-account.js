import pool from '../config/database.js'
import jwt from 'jsonwebtoken'
import dotenv from 'dotenv'

dotenv.config()

const JWT_SECRET = process.env.JWT_SECRET
if (!JWT_SECRET) throw new Error('JWT_SECRET environment variable is required')

async function createServiceAccount() {
  try {
    // Check if service account already exists
    const existing = await pool.query(
      "SELECT id FROM users WHERE email = 'agent@touchline.xyz'"
    )

    let userId
    if (existing.rows.length > 0) {
      userId = existing.rows[0].id
      console.log('Service account already exists:', userId)
    } else {
      const result = await pool.query(
        `INSERT INTO users (name, email, password_hash, role, is_admin)
         VALUES ('Executive Agent', 'agent@touchline.xyz', 'service-account-no-login', 'manager', true)
         RETURNING id`
      )
      userId = result.rows[0].id
      console.log('Service account created:', userId)
    }

    // Generate a 10-year token
    const token = jwt.sign({ userId }, JWT_SECRET, { expiresIn: '10y' })

    console.log('\n========================================')
    console.log('TOUCHLINE_API_TOKEN=' + token)
    console.log('========================================\n')
    console.log('Add this as an environment variable in the executive team Railway service.')

    process.exit(0)
  } catch (error) {
    console.error('Failed:', error.message)
    process.exit(1)
  }
}

createServiceAccount()
