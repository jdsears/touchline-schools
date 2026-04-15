/**
 * Seed staff accounts for Ashworth Park Academy demo tenant.
 *
 * Personas:
 *  - hodPe: Head of PE (the primary demo persona for SLT-level prospects)
 *  - directorOfSport: Director of Sport (second senior persona)
 *  - teacher1: PE teacher / football + rugby coach
 *  - teacher2: PE teacher / hockey + netball coach
 *  - nonSpec1: Non-specialist who uses the platform for afternoon clubs
 *  - nonSpec2: Non-specialist / Cover supervisor
 *
 * Passwords are all set to '' (empty) - login is disabled for demo users.
 * A demo prospect is issued temp credentials by the admin provisioning flow.
 */

import pool from '../../config/database.js'
import bcrypt from 'bcryptjs'

async function createUser(data) {
  // Use a deterministic bcrypt hash placeholder - actual demo login uses
  // one-time temp passwords issued by the admin provisioning flow.
  const passwordHash = await bcrypt.hash(data.tempPassword || 'demo-no-login', 10)

  const result = await pool.query(`
    INSERT INTO users (
      name, email, password_hash, role,
      is_demo_user, demo_expires_at,
      has_completed_onboarding,
      created_at
    )
    VALUES ($1, $2, $3, 'manager', true, NOW() + INTERVAL '7 days', true, NOW())
    RETURNING *
  `, [data.name, data.email, passwordHash])

  return result.rows[0]
}

async function addSchoolMember(schoolId, userId, schoolRole, permissions = {}) {
  await pool.query(`
    INSERT INTO school_members (
      school_id, user_id, role, school_role,
      can_view_all_classes, can_view_all_teams,
      can_manage_curriculum, can_view_reports,
      can_manage_safeguarding,
      joined_at
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
    ON CONFLICT (school_id, user_id) DO NOTHING
  `, [
    schoolId, userId, 'teacher', schoolRole,
    permissions.viewAllClasses ?? false,
    permissions.viewAllTeams ?? false,
    permissions.manageCurriculum ?? false,
    permissions.viewReports ?? false,
    permissions.manageSafeguarding ?? false,
  ])
}

export async function seedStaff(schoolId) {
  // Head of PE
  const hodPe = await createUser({
    name: 'Mr James Okonkwo',
    email: 'j.okonkwo.demo@ashworthpark.norfolk.sch.uk',
    tempPassword: 'AshworthHoD2025!',
  })
  await addSchoolMember(schoolId, hodPe.id, 'head_of_pe', {
    viewAllClasses: true, viewAllTeams: true,
    manageCurriculum: true, viewReports: true, manageSafeguarding: true,
  })
  // Teacher sport links: head of football
  await pool.query(`
    INSERT INTO teacher_sports (teacher_id, sport, role)
    VALUES ($1, 'football', 'head_of_sport'), ($1, 'rugby', 'coach')
    ON CONFLICT DO NOTHING
  `, [hodPe.id])

  // Director of Sport
  const directorOfSport = await createUser({
    name: 'Ms Sarah Whitfield',
    email: 's.whitfield.demo@ashworthpark.norfolk.sch.uk',
    tempPassword: 'AshworthDoS2025!',
  })
  await addSchoolMember(schoolId, directorOfSport.id, 'head_of_pe', {
    viewAllClasses: true, viewAllTeams: true,
    manageCurriculum: true, viewReports: true, manageSafeguarding: true,
  })
  await pool.query(`
    INSERT INTO teacher_sports (teacher_id, sport, role)
    VALUES ($1, 'netball', 'head_of_sport'), ($1, 'hockey', 'head_of_sport'), ($1, 'cricket', 'coach')
    ON CONFLICT DO NOTHING
  `, [directorOfSport.id])

  // PE Teacher 1 - football & rugby specialist
  const teacher1 = await createUser({
    name: 'Mr Daniel Brennan',
    email: 'd.brennan.demo@ashworthpark.norfolk.sch.uk',
    tempPassword: 'AshworthPE12025!',
  })
  await addSchoolMember(schoolId, teacher1.id, 'teacher', {
    viewAllTeams: false, manageCurriculum: false, viewReports: true,
  })
  await pool.query(`
    INSERT INTO teacher_sports (teacher_id, sport, role)
    VALUES ($1, 'football', 'coach'), ($1, 'rugby', 'head_of_sport')
    ON CONFLICT DO NOTHING
  `, [teacher1.id])

  // PE Teacher 2 - hockey & netball specialist
  const teacher2 = await createUser({
    name: 'Miss Priya Sharma',
    email: 'p.sharma.demo@ashworthpark.norfolk.sch.uk',
    tempPassword: 'AshworthPE22025!',
  })
  await addSchoolMember(schoolId, teacher2.id, 'teacher', {
    viewAllTeams: false, manageCurriculum: false, viewReports: true,
  })
  await pool.query(`
    INSERT INTO teacher_sports (teacher_id, sport, role)
    VALUES ($1, 'netball', 'coach'), ($1, 'hockey', 'coach')
    ON CONFLICT DO NOTHING
  `, [teacher2.id])

  // Non-specialist 1 - runs Year 7 morning enrichment football
  const nonSpec1 = await createUser({
    name: 'Mr Tom Ellis',
    email: 't.ellis.demo@ashworthpark.norfolk.sch.uk',
    tempPassword: 'AshworthNS12025!',
  })
  await addSchoolMember(schoolId, nonSpec1.id, 'teacher', {
    viewReports: false,
  })

  // Non-specialist 2 - covers PE occasionally, reads reports
  const nonSpec2 = await createUser({
    name: 'Mrs Fatima Al-Hassan',
    email: 'f.alhassan.demo@ashworthpark.norfolk.sch.uk',
    tempPassword: 'AshworthNS22025!',
  })
  await addSchoolMember(schoolId, nonSpec2.id, 'read_only', {
    viewReports: true,
  })

  return { hodPe, directorOfSport, teacher1, teacher2, nonSpec1, nonSpec2 }
}
