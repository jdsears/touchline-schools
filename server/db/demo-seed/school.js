/**
 * Seed the Ashworth Park Academy school tenant record.
 */

import pool from '../../config/database.js'

export async function seedSchool() {
  const result = await pool.query(`
    INSERT INTO schools (
      name, slug,
      school_type, urn,
      contact_email, contact_phone, website,
      address_line1, address_line2, city, county, postcode,
      primary_color, secondary_color,
      subscription_tier, subscription_status,
      season_start_month, season_end_month,
      voice_observations_enabled, audio_retention_days, transcript_retention_days,
      is_demo_tenant,
      settings,
      created_at, updated_at
    )
    VALUES (
      'Ashworth Park Academy',
      'ashworth-park-demo',
      'academy',
      '137492',
      'pe@ashworthpark.norfolk.sch.uk',
      '01603 555 0192',
      'https://www.ashworthpark.norfolk.sch.uk',
      'Ashworth Park Road',
      '',
      'Norwich',
      'Norfolk',
      'NR6 7QP',
      '#1B4332',
      '#D97706',
      'school_pro',
      'active',
      9, 7,
      true, 7, 30,
      true,
      $1,
      NOW(), NOW()
    )
    RETURNING *
  `, [JSON.stringify({
    pe_department_name: 'Physical Education Department',
    head_teacher: 'Mrs Helen Okafor',
    year_groups: [7, 8, 9, 10, 11, 12, 13],
    roll: 820,
    ofsted_rating: 'Good',
    sports_offered: ['football', 'rugby', 'cricket', 'hockey', 'netball'],
    fixtures_per_term: 8,
    demo_instance: true,
  })])

  return result.rows[0]
}
