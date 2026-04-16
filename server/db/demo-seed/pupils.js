/**
 * Seed ~60 pupils across Years 7, 9, 11 and 13 for Ashworth Park Academy.
 *
 * Names are invented UK-plausible diverse names with no real individuals.
 * Each pupil is flagged is_demo_user=true and gets demo_expires_at.
 */

import pool from '../../config/database.js'
import bcrypt from 'bcryptjs'

const PUPIL_PASSWORD_HASH_CACHE = {}

async function getDemoPasswordHash() {
  if (!PUPIL_PASSWORD_HASH_CACHE.hash) {
    PUPIL_PASSWORD_HASH_CACHE.hash = await bcrypt.hash('pupil-demo-no-login', 10)
  }
  return PUPIL_PASSWORD_HASH_CACHE.hash
}

// year_group → approximate year of birth (relative to school year 2025-26)
function dobForYear(yearGroup) {
  const base = 2026 - yearGroup - 11
  const month = String(Math.floor(Math.random() * 12) + 1).padStart(2, '0')
  const day = String(Math.floor(Math.random() * 28) + 1).padStart(2, '0')
  return `${base}-${month}-${day}`
}

const YEAR_7_PUPILS = [
  { name: 'Amara Osei', house: 'Elm' },
  { name: 'Ben Kowalski', house: 'Oak' },
  { name: 'Chloe Adeyemi', house: 'Maple' },
  { name: 'Dylan Patel', house: 'Elm' },
  { name: 'Ellie Thornton', house: 'Oak' },
  { name: 'Finlay Hughes', house: 'Maple' },
  { name: 'Grace Mensah', house: 'Elm' },
  { name: 'Harrison Yeboah', house: 'Oak' },
  { name: 'Isla Fernandez', house: 'Maple' },
  { name: 'Jamie Okafor', house: 'Elm' },
  { name: 'Kemi Adewale', house: 'Oak' },
  { name: 'Liam Fletcher', house: 'Maple' },
  { name: 'Maisie Njoku', house: 'Elm' },
  { name: 'Noah Barker', house: 'Oak' },
  { name: 'Olivia Kaur', house: 'Maple' },
]

const YEAR_9_PUPILS = [
  { name: 'Abigail Osei', house: 'Elm' },
  { name: 'Blake Andersen', house: 'Oak' },
  { name: 'Caleb Nwosu', house: 'Maple' },
  { name: 'Demi Owusu', house: 'Elm' },
  { name: 'Ethan Blackwell', house: 'Oak' },
  { name: 'Fiona Chang', house: 'Maple' },
  { name: 'George Mensah', house: 'Elm' },
  { name: 'Harriet Suleman', house: 'Oak' },
  { name: 'Ivan Price', house: 'Maple' },
  { name: 'Jade Osei-Bonsu', house: 'Elm' },
  { name: 'Kieran Walsh', house: 'Oak' },
  { name: 'Layla Ibrahim', house: 'Maple' },
  { name: 'Marcus Ntow', house: 'Elm' },
  { name: 'Nadia Petrov', house: 'Oak' },
  { name: 'Oscar Bennett', house: 'Maple' },
  { name: 'Priya Rao', house: 'Elm' },
]

const YEAR_11_PUPILS = [
  { name: 'Aaron Clarke', house: 'Elm' },
  { name: 'Bethany Owusu', house: 'Oak' },
  { name: 'Connor Doherty', house: 'Maple' },
  { name: 'Danielle Amoah', house: 'Elm' },
  { name: 'Elliot Patel', house: 'Oak' },
  { name: 'Faith Mensah-Bonsu', house: 'Maple' },
  { name: 'Gabriel Hassan', house: 'Elm' },
  { name: 'Holly Nkrumah', house: 'Oak' },
  { name: 'Isaac Thompson', house: 'Maple' },
  { name: 'Jade Williamson', house: 'Elm' },
  { name: 'Kwame Asante', house: 'Oak' },
  { name: 'Lauren Tran', house: 'Maple' },
  { name: 'Matthew Osei', house: 'Elm' },
  { name: 'Naomi Kofi', house: 'Oak' },
  { name: 'Patrick Doyle', house: 'Maple' },
]

const YEAR_13_PUPILS = [
  { name: 'Alexis Brown', house: 'Elm' },
  { name: 'Billy Olawale', house: 'Oak' },
  { name: 'Charlotte Dubois', house: 'Maple' },
  { name: 'Dean Patel', house: 'Elm' },
  { name: 'Eva Kowalski', house: 'Oak' },
  { name: 'Frank Asante', house: 'Maple' },
  { name: 'Gemma Osei', house: 'Elm' },
  { name: 'Harry Chukwu', house: 'Oak' },
  { name: 'Imogen Taylor', house: 'Maple' },
  { name: 'Joel Antwi', house: 'Elm' },
  { name: 'Kate Lawson', house: 'Oak' },
  { name: 'Liam Mensah', house: 'Maple' },
  { name: 'Mia Okonkwo', house: 'Elm' },
  { name: 'Nathan Baines', house: 'Oak' },
]

async function insertPupil(schoolId, { name, house, yearGroup }) {
  const passwordHash = await getDemoPasswordHash()
  const email = `${name.toLowerCase().replace(/\s+/g, '.').replace(/[^a-z.]/g, '')}.demo@ashworthpark.norfolk.sch.uk`

  // Create a user account for pupil portal access
  const userResult = await pool.query(`
    INSERT INTO users (name, email, password_hash, role, is_demo_user, demo_expires_at, created_at)
    VALUES ($1, $2, $3, 'manager', true, NOW() + INTERVAL '7 days', NOW())
    RETURNING id
  `, [name, email, passwordHash])
  const userId = userResult.rows[0].id

  // Split name into first_name / last_name
  const nameParts = name.split(' ')
  const firstName = nameParts[0]
  const lastName = nameParts.slice(1).join(' ')

  // Create the pupil record
  const pupilResult = await pool.query(`
    INSERT INTO pupils (
      name, first_name, last_name,
      year_group, house, date_of_birth,
      is_active, user_id, created_at
    )
    VALUES ($1, $2, $3, $4, $5, $6, true, $7, NOW())
    RETURNING *
  `, [name, firstName, lastName, yearGroup, house, dobForYear(yearGroup), userId])

  const pupil = pupilResult.rows[0]

  // Add pupil as school member (read-only role for portal access)
  await pool.query(`
    INSERT INTO school_members (school_id, user_id, role, school_role, can_view_reports, joined_at)
    VALUES ($1, $2, 'parent', 'read_only', false, NOW())
    ON CONFLICT (school_id, user_id) DO NOTHING
  `, [schoolId, userId])

  return pupil
}

export async function seedPupils(schoolId) {
  const all = []

  for (const p of YEAR_7_PUPILS) {
    all.push(await insertPupil(schoolId, { ...p, yearGroup: 7 }))
  }
  for (const p of YEAR_9_PUPILS) {
    all.push(await insertPupil(schoolId, { ...p, yearGroup: 9 }))
  }
  for (const p of YEAR_11_PUPILS) {
    all.push(await insertPupil(schoolId, { ...p, yearGroup: 11 }))
  }
  for (const p of YEAR_13_PUPILS) {
    all.push(await insertPupil(schoolId, { ...p, yearGroup: 13 }))
  }

  return all
}
