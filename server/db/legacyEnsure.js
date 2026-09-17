// Boot-time ensure-schema statements that historically lived in server/index.js
// (ensureDemoPrerequisites) and ran only on demo deployments - which made them
// a second, competing schema source and the root of most column-drift bugs.
// Now invoked from runMigrations() so every environment gets the same shape.
// Every statement is individually best-effort.
import pool from '../config/database.js'

export async function runLegacyEnsure() {
  const stmts = [
    // Rename clubs -> schools if needed
    `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'schools') THEN IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'clubs') THEN ALTER TABLE clubs RENAME TO schools; END IF; END IF; END $$`,
    // Rename club_members -> school_members if needed
    `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'school_members') THEN IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'club_members') THEN ALTER TABLE club_members RENAME TO school_members; END IF; END IF; END $$`,
  ]
  // Rename club_id -> school_id in all tables that still have the old column name
  const clubIdTables = ['school_members', 'teams', 'school_announcements', 'school_comms_log', 'compliance_records', 'safeguarding_roles', 'safeguarding_incidents', 'compliance_alerts', 'school_events', 'event_registrations', 'session_schedule', 'match_reports', 'ai_insights', 'ai_usage', 'grant_drafts', 'teaching_groups', 'pupils']
  for (const t of clubIdTables) {
    stmts.push(`DO $$ BEGIN IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = '${t}' AND column_name = 'club_id') THEN ALTER TABLE ${t} RENAME COLUMN club_id TO school_id; END IF; END $$`)
  }
  // Add missing columns on schools (if table exists)
  const schoolCols = ['school_type TEXT', 'urn TEXT', 'voice_observations_enabled BOOLEAN DEFAULT false', 'audio_retention_days INTEGER DEFAULT 7', 'transcript_retention_days INTEGER DEFAULT 30', 'is_demo_tenant BOOLEAN DEFAULT false']
  for (const col of schoolCols) stmts.push(`ALTER TABLE schools ADD COLUMN IF NOT EXISTS ${col}`)
  // Add missing columns on school_members (if table exists)
  const smCols = ['school_role TEXT', 'can_view_all_classes BOOLEAN DEFAULT false', 'can_view_all_teams BOOLEAN DEFAULT false', 'can_manage_curriculum BOOLEAN DEFAULT false', 'can_view_reports BOOLEAN DEFAULT false', 'can_manage_safeguarding BOOLEAN DEFAULT false']
  for (const col of smCols) stmts.push(`ALTER TABLE school_members ADD COLUMN IF NOT EXISTS ${col}`)
  // Add missing columns on teams
  stmts.push(`ALTER TABLE teams ADD COLUMN IF NOT EXISTS school_id UUID`, `ALTER TABLE teams ADD COLUMN IF NOT EXISTS sport TEXT`, `ALTER TABLE teams ADD COLUMN IF NOT EXISTS gender TEXT`, `ALTER TABLE teams ADD COLUMN IF NOT EXISTS season_type TEXT`, `ALTER TABLE teams ADD COLUMN IF NOT EXISTS owner_id UUID`)
  // Ensure pupils has team_id column (needed by team queries)
  stmts.push(`ALTER TABLE pupils ADD COLUMN IF NOT EXISTS team_id UUID`)
  // Ensure team_memberships exists
  stmts.push(`CREATE TABLE IF NOT EXISTS team_memberships (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), team_id UUID REFERENCES teams(id) ON DELETE CASCADE, user_id UUID REFERENCES users(id) ON DELETE CASCADE, pupil_id UUID, role TEXT DEFAULT 'player', is_primary BOOLEAN DEFAULT false, created_at TIMESTAMPTZ DEFAULT NOW(), UNIQUE(user_id, team_id))`)
  // Ensure pupils table exists (may still be named players)
  stmts.push(`DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'pupils') THEN IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'players') THEN ALTER TABLE players RENAME TO pupils; ELSE CREATE TABLE pupils (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), name TEXT NOT NULL, school_id UUID, year_group INTEGER, house TEXT, date_of_birth DATE, is_active BOOLEAN DEFAULT true, user_id UUID, created_at TIMESTAMPTZ DEFAULT NOW()); END IF; END IF; END $$`)
  // Add missing columns on pupils
  stmts.push(`ALTER TABLE pupils ADD COLUMN IF NOT EXISTS year_group INTEGER`)
  stmts.push(`ALTER TABLE pupils ADD COLUMN IF NOT EXISTS house TEXT`)
  stmts.push(`ALTER TABLE pupils ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true`)
  stmts.push(`ALTER TABLE pupils ADD COLUMN IF NOT EXISTS user_id UUID`)
  stmts.push(`ALTER TABLE pupils ADD COLUMN IF NOT EXISTS school_id UUID`)
  stmts.push(`ALTER TABLE pupils ADD COLUMN IF NOT EXISTS first_name TEXT`)
  stmts.push(`ALTER TABLE pupils ADD COLUMN IF NOT EXISTS last_name TEXT`)
  stmts.push(`ALTER TABLE pupils ADD COLUMN IF NOT EXISTS nicknames TEXT`)
  stmts.push(`ALTER TABLE pupils ADD COLUMN IF NOT EXISTS protected_from_reset BOOLEAN DEFAULT false`)
  stmts.push(`ALTER TABLE pupils ADD COLUMN IF NOT EXISTS gcse_pe_candidate BOOLEAN NOT NULL DEFAULT FALSE`)
  // v1.7 test persona columns
  stmts.push(`ALTER TABLE users ADD COLUMN IF NOT EXISTS is_test_persona BOOLEAN DEFAULT false`)
  stmts.push(`ALTER TABLE users ADD COLUMN IF NOT EXISTS protected_from_reset BOOLEAN DEFAULT false`)
  // Add missing columns on teaching_groups
  stmts.push(`ALTER TABLE teaching_groups ADD COLUMN IF NOT EXISTS group_identifier TEXT`)
  stmts.push(`ALTER TABLE teaching_groups ADD COLUMN IF NOT EXISTS academic_year TEXT`)
  stmts.push(`ALTER TABLE teaching_groups ADD COLUMN IF NOT EXISTS key_stage TEXT DEFAULT 'KS3'`)
  // Add 'date' column to matches (many queries use m.date, table has match_date)
  stmts.push(`ALTER TABLE matches ADD COLUMN IF NOT EXISTS date DATE`)
  stmts.push(`UPDATE matches SET date = match_date WHERE date IS NULL AND match_date IS NOT NULL`)
  // v1.6 school profile columns
  const schoolProfileCols = ['school_type TEXT', 'urn TEXT', 'head_teacher_name TEXT', 'head_teacher_email TEXT', 'safeguarding_lead_name TEXT', 'safeguarding_lead_email TEXT', 'dpo_name TEXT', 'dpo_email TEXT', 'accent_color TEXT']
  for (const col of schoolProfileCols) stmts.push(`ALTER TABLE schools ADD COLUMN IF NOT EXISTS ${col}`)
  // Add missing columns on observations
  stmts.push(`ALTER TABLE observations ADD COLUMN IF NOT EXISTS source TEXT`)
  stmts.push(`ALTER TABLE observations ADD COLUMN IF NOT EXISTS review_state TEXT`)
  stmts.push(`ALTER TABLE observations ADD COLUMN IF NOT EXISTS sport TEXT`)
  stmts.push(`ALTER TABLE observations ADD COLUMN IF NOT EXISTS teaching_group_id UUID`)
  stmts.push(`ALTER TABLE observations ADD COLUMN IF NOT EXISTS visible_to_pupil BOOLEAN NOT NULL DEFAULT FALSE`)
  // Add missing columns on reporting_windows
  stmts.push(`ALTER TABLE reporting_windows ADD COLUMN IF NOT EXISTS year_groups TEXT`)
  // Add missing columns on pupil_assessments and pupil_reports
  stmts.push(`ALTER TABLE pupil_assessments ADD COLUMN IF NOT EXISTS assessed_by UUID`)
  stmts.push(`ALTER TABLE pupil_assessments ADD COLUMN IF NOT EXISTS unit_id UUID`)
  // Rename sport_unit_id to unit_id if it exists (schema fix)
  stmts.push(`DO $$ BEGIN IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'pupil_assessments' AND column_name = 'sport_unit_id') AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'pupil_assessments' AND column_name = 'unit_id') THEN ALTER TABLE pupil_assessments RENAME COLUMN sport_unit_id TO unit_id; END IF; END $$`)
  stmts.push(`ALTER TABLE pupil_reports ADD COLUMN IF NOT EXISTS unit_id UUID`)
  stmts.push(`ALTER TABLE pupil_reports ADD COLUMN IF NOT EXISTS sport TEXT`)
  stmts.push(`ALTER TABLE pupil_reports ADD COLUMN IF NOT EXISTS attainment_grade TEXT`)
  stmts.push(`ALTER TABLE pupil_reports ADD COLUMN IF NOT EXISTS teacher_comment TEXT`)
  stmts.push(`ALTER TABLE pupil_reports ADD COLUMN IF NOT EXISTS generated_by UUID`)
  stmts.push(`ALTER TABLE pupil_reports ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ`)
  stmts.push(`ALTER TABLE pupil_reports ADD COLUMN IF NOT EXISTS teaching_group_id UUID`)
  stmts.push(`ALTER TABLE pupil_reports ADD COLUMN IF NOT EXISTS teacher_id UUID`)
  // assessment_criteria: seed uses 'criterion' and 'key_stage' columns
  stmts.push(`ALTER TABLE assessment_criteria ADD COLUMN IF NOT EXISTS criterion TEXT`)
  stmts.push(`ALTER TABLE assessment_criteria ADD COLUMN IF NOT EXISTS key_stage TEXT`)
  // pupil_assessments: seed uses 'criteria_id' and 'assessment_type' and 'teacher_notes'
  stmts.push(`ALTER TABLE pupil_assessments ADD COLUMN IF NOT EXISTS criteria_id UUID`)
  stmts.push(`ALTER TABLE pupil_assessments ADD COLUMN IF NOT EXISTS assessment_type TEXT DEFAULT 'formative'`)
  stmts.push(`ALTER TABLE pupil_assessments ADD COLUMN IF NOT EXISTS teacher_notes TEXT`)
  // Create all tables the demo seed needs (Phases 8-12 of migration that may not have run)
  const createTables = [
    `CREATE TABLE IF NOT EXISTS teacher_sports (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), teacher_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE, sport TEXT NOT NULL, role TEXT DEFAULT 'coach', created_at TIMESTAMPTZ DEFAULT NOW(), UNIQUE(teacher_id, sport))`,
    `CREATE TABLE IF NOT EXISTS audit_log (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), school_id UUID, user_id UUID, action TEXT NOT NULL, entity_type TEXT, entity_id UUID, details JSONB, ip_address TEXT, created_at TIMESTAMPTZ DEFAULT NOW())`,
    `CREATE TABLE IF NOT EXISTS teaching_groups (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), school_id UUID, name TEXT NOT NULL, year_group INTEGER, group_identifier TEXT, teacher_id UUID, academic_year TEXT, key_stage TEXT DEFAULT 'KS3', created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW())`,
    `CREATE TABLE IF NOT EXISTS teaching_group_pupils (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), teaching_group_id UUID REFERENCES teaching_groups(id) ON DELETE CASCADE, pupil_id UUID, created_at TIMESTAMPTZ DEFAULT NOW(), UNIQUE(teaching_group_id, pupil_id))`,
    `CREATE TABLE IF NOT EXISTS sport_units (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), teaching_group_id UUID REFERENCES teaching_groups(id) ON DELETE CASCADE, sport TEXT NOT NULL, unit_name TEXT NOT NULL, curriculum_area TEXT, start_date DATE, end_date DATE, term TEXT, lesson_count INTEGER, display_order INTEGER DEFAULT 0, created_at TIMESTAMPTZ DEFAULT NOW())`,
    `CREATE TABLE IF NOT EXISTS assessment_scales (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), school_id UUID, name TEXT NOT NULL, key_stage TEXT, scale_type TEXT DEFAULT 'descriptive', grades JSONB, is_default BOOLEAN DEFAULT false, created_at TIMESTAMPTZ DEFAULT NOW())`,
    `CREATE TABLE IF NOT EXISTS curriculum_strands (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), school_id UUID, key_stage TEXT, strand_name TEXT NOT NULL, description TEXT, display_order INTEGER DEFAULT 0, is_system_default BOOLEAN DEFAULT false, created_at TIMESTAMPTZ DEFAULT NOW())`,
    `CREATE TABLE IF NOT EXISTS assessment_criteria (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), strand_id UUID, sport TEXT, criterion_name TEXT NOT NULL, description TEXT, display_order INTEGER DEFAULT 0, created_at TIMESTAMPTZ DEFAULT NOW())`,
    `CREATE TABLE IF NOT EXISTS pupil_assessments (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), pupil_id UUID, unit_id UUID, strand_id UUID, criterion_id UUID, grade TEXT, teacher_id UUID, assessed_at TIMESTAMPTZ DEFAULT NOW(), created_at TIMESTAMPTZ DEFAULT NOW())`,
    `CREATE TABLE IF NOT EXISTS reporting_windows (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), school_id UUID, name TEXT NOT NULL, academic_year TEXT, term TEXT, opens_at TIMESTAMPTZ, closes_at TIMESTAMPTZ, status TEXT DEFAULT 'draft', created_at TIMESTAMPTZ DEFAULT NOW())`,
    `CREATE TABLE IF NOT EXISTS pupil_reports (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), pupil_id UUID NOT NULL, reporting_window_id UUID, teaching_group_id UUID, teacher_id UUID, unit_id UUID, overall_grade TEXT, effort_grade TEXT, comment TEXT, ai_draft TEXT, status TEXT DEFAULT 'draft', created_at TIMESTAMPTZ DEFAULT NOW())`,
    `CREATE TABLE IF NOT EXISTS lesson_plans (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), teaching_group_id UUID REFERENCES teaching_groups(id) ON DELETE CASCADE, sport_unit_id UUID REFERENCES sport_units(id) ON DELETE SET NULL, teacher_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE, title TEXT NOT NULL, lesson_date DATE, duration INTEGER DEFAULT 60, learning_objectives TEXT, activities TEXT, equipment TEXT, differentiation TEXT, homework TEXT, status TEXT DEFAULT 'draft', created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW())`,
    `CREATE TABLE IF NOT EXISTS data_export_requests (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), school_id UUID, pupil_id UUID, request_type TEXT NOT NULL, status TEXT DEFAULT 'pending', created_at TIMESTAMPTZ DEFAULT NOW(), completed_at TIMESTAMPTZ)`,
    `CREATE TABLE IF NOT EXISTS data_deletion_log (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), school_id UUID, pupil_reference TEXT, reason TEXT, created_at TIMESTAMPTZ DEFAULT NOW())`,
    `CREATE TABLE IF NOT EXISTS gdpr_consent_records (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), school_id UUID, pupil_id UUID, consent_type TEXT NOT NULL, granted BOOLEAN DEFAULT false, withdrawn_at TIMESTAMPTZ, created_at TIMESTAMPTZ DEFAULT NOW())`,
    // v1.6 Settings restructure tables
    `CREATE TABLE IF NOT EXISTS school_sports_configuration (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), school_id UUID NOT NULL, sport_key TEXT NOT NULL, active BOOLEAN DEFAULT true, ngb_framework_key TEXT, grading_scale_override_id UUID, created_at TIMESTAMPTZ DEFAULT NOW(), UNIQUE(school_id, sport_key))`,
    `CREATE TABLE IF NOT EXISTS school_academic_structure (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), school_id UUID NOT NULL UNIQUE, year_groups_offered JSONB DEFAULT '[]', house_system JSONB, term_dates JSONB DEFAULT '[]', assessment_windows JSONB DEFAULT '[]', reporting_windows_config JSONB DEFAULT '[]', created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW())`,
    `CREATE TABLE IF NOT EXISTS school_licence (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), school_id UUID NOT NULL UNIQUE, term_start DATE, term_end DATE, seat_count INTEGER DEFAULT 0, sport_count INTEGER DEFAULT 0, commercial_contact_name TEXT, commercial_contact_email TEXT, notes TEXT, created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW())`,
    `CREATE TABLE IF NOT EXISTS staff_qualifications (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), user_id UUID NOT NULL, school_id UUID, qualification_type TEXT NOT NULL, qualification_name TEXT NOT NULL, issue_date DATE, expiry_date DATE, reference_number TEXT, document_url TEXT, created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW())`,
    `CREATE TABLE IF NOT EXISTS knowledge_base_resources (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), school_id UUID NOT NULL, uploader_id UUID, title TEXT NOT NULL, file_url TEXT, file_type TEXT, file_size INTEGER, sports JSONB DEFAULT '[]', year_groups JSONB DEFAULT '[]', description TEXT, visibility TEXT DEFAULT 'all', created_at TIMESTAMPTZ DEFAULT NOW(), archived_at TIMESTAMPTZ)`,
    `CREATE TABLE IF NOT EXISTS reporting_templates (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), school_id UUID NOT NULL, template_type TEXT NOT NULL, name TEXT NOT NULL, structure JSONB DEFAULT '{}', tone_guidance TEXT, is_default BOOLEAN DEFAULT false, created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW())`,
    `CREATE TABLE IF NOT EXISTS fixture_defaults (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), school_id UUID NOT NULL, sport_key TEXT, age_group TEXT, match_duration_minutes INTEGER, default_home_ground_address TEXT, default_travel_arrangement TEXT, default_kit_config JSONB DEFAULT '{}', created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW(), UNIQUE(school_id, sport_key, age_group))`,
    `CREATE TABLE IF NOT EXISTS notification_preferences (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), user_id UUID NOT NULL UNIQUE, fixture_reminders BOOLEAN DEFAULT true, assessment_deadlines BOOLEAN DEFAULT true, report_due_dates BOOLEAN DEFAULT true, pupil_observations BOOLEAN DEFAULT true, safeguarding_concerns BOOLEAN DEFAULT true, weekly_digest BOOLEAN DEFAULT false, monthly_summary BOOLEAN DEFAULT false, product_updates BOOLEAN DEFAULT false, email_enabled BOOLEAN DEFAULT true, push_enabled BOOLEAN DEFAULT false, created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW())`,
    `CREATE TABLE IF NOT EXISTS user_accessibility (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), user_id UUID NOT NULL UNIQUE, font_size TEXT DEFAULT 'medium', reduced_motion BOOLEAN DEFAULT false, high_contrast BOOLEAN DEFAULT false, screen_reader_optimised BOOLEAN DEFAULT false, created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW())`,
    `CREATE TABLE IF NOT EXISTS venues (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), school_id UUID NOT NULL, name TEXT NOT NULL, address TEXT, postcode TEXT, latitude DOUBLE PRECISION, longitude DOUBLE PRECISION, parking_notes TEXT, changing_room_notes TEXT, pitch_layout_notes TEXT, contact_name TEXT, contact_phone TEXT, accessibility_notes TEXT, is_school_venue BOOLEAN DEFAULT false, last_visited_date DATE, archived_at TIMESTAMPTZ, created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW())`,
    `CREATE TABLE IF NOT EXISTS fixture_travel (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), match_id UUID NOT NULL UNIQUE, transport_mode TEXT NOT NULL DEFAULT 'school_coach', departure_location TEXT, departure_time TIME, return_time TIME, contact_phone TEXT, special_instructions TEXT, coordinator_notes TEXT, parent_lifts_requested BOOLEAN DEFAULT false, created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW())`,
    `CREATE TABLE IF NOT EXISTS travel_assignments (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), match_id UUID NOT NULL, pupil_id UUID NOT NULL, transport_mode TEXT NOT NULL DEFAULT 'team', driver_name TEXT, driver_capacity INTEGER, notes TEXT, created_at TIMESTAMPTZ DEFAULT NOW(), UNIQUE(match_id, pupil_id))`,
    `CREATE TABLE IF NOT EXISTS mis_integrations (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), school_id UUID NOT NULL UNIQUE, provider TEXT NOT NULL DEFAULT 'isams', api_endpoint TEXT, api_key_encrypted TEXT, sync_frequency TEXT DEFAULT 'nightly', sync_scope TEXT DEFAULT 'pupils_staff', last_sync_at TIMESTAMPTZ, last_sync_status TEXT, last_sync_summary JSONB, consecutive_failures INTEGER DEFAULT 0, is_test_mode BOOLEAN DEFAULT true, created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW())`,
    `CREATE TABLE IF NOT EXISTS mis_sync_log (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), school_id UUID NOT NULL, status TEXT NOT NULL, summary JSONB, is_dry_run BOOLEAN DEFAULT false, error_message TEXT, started_at TIMESTAMPTZ DEFAULT NOW(), completed_at TIMESTAMPTZ)`,
    `CREATE TABLE IF NOT EXISTS concussion_incidents (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), pupil_id UUID NOT NULL, match_id UUID, school_id UUID NOT NULL, occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), reported_by_user_id UUID NOT NULL, severity TEXT DEFAULT 'awaiting_assessment', symptoms_observed JSONB DEFAULT '[]', immediate_action_taken TEXT, doctor_assessment_required BOOLEAN DEFAULT true, parent_notified_at TIMESTAMPTZ, return_to_play_status TEXT DEFAULT 'excluded', return_to_play_protocol_started_at TIMESTAMPTZ, fully_cleared_at TIMESTAMPTZ, notes TEXT, external_platform_id TEXT, created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW())`,
    `CREATE TABLE IF NOT EXISTS concussion_followups (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), incident_id UUID NOT NULL REFERENCES concussion_incidents(id) ON DELETE CASCADE, stage INTEGER NOT NULL DEFAULT 1, followup_date DATE NOT NULL, completed_at TIMESTAMPTZ, notes TEXT, completed_by_user_id UUID, created_at TIMESTAMPTZ DEFAULT NOW())`,
    `CREATE TABLE IF NOT EXISTS consent_types (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), school_id UUID NOT NULL, name TEXT NOT NULL, description TEXT, is_per_term BOOLEAN DEFAULT false, is_per_fixture BOOLEAN DEFAULT false, expiry_period_months INTEGER, requires_text_acknowledgement BOOLEAN DEFAULT true, default_response TEXT DEFAULT 'no_default', display_order INTEGER DEFAULT 0, created_at TIMESTAMPTZ DEFAULT NOW())`,
    `CREATE TABLE IF NOT EXISTS pupil_consents (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), pupil_id UUID NOT NULL, consent_type_id UUID NOT NULL REFERENCES consent_types(id) ON DELETE CASCADE, status TEXT NOT NULL DEFAULT 'pending', granted_at TIMESTAMPTZ, granted_by_parent_email TEXT, expires_at TIMESTAMPTZ, parent_signature_text TEXT, consent_text_version TEXT, ip_address TEXT, notes TEXT, created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW(), UNIQUE(pupil_id, consent_type_id))`,
  ]
  for (const sql of createTables) stmts.push(sql)
  stmts.push(`ALTER TABLE matches ADD COLUMN IF NOT EXISTS venue_id UUID REFERENCES venues(id) ON DELETE SET NULL`)
  stmts.push(`CREATE INDEX IF NOT EXISTS idx_venues_school ON venues(school_id)`)
  stmts.push(`ALTER TABLE schools ADD COLUMN IF NOT EXISTS public_fixtures_enabled BOOLEAN DEFAULT false`)
  stmts.push(`ALTER TABLE schools ADD COLUMN IF NOT EXISTS public_name_format TEXT DEFAULT 'first_initial'`)
  stmts.push(`ALTER TABLE teams ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT false`)
  stmts.push(`ALTER TABLE matches ADD COLUMN IF NOT EXISTS match_report_text TEXT`)
  stmts.push(`ALTER TABLE matches ADD COLUMN IF NOT EXISTS match_report_status TEXT DEFAULT 'none'`)
  stmts.push(`ALTER TABLE matches ADD COLUMN IF NOT EXISTS match_report_approved_by UUID`)
  stmts.push(`ALTER TABLE matches ADD COLUMN IF NOT EXISTS match_report_approved_at TIMESTAMPTZ`)

  for (const sql of stmts) {
    try { await pool.query(sql) } catch (e) { console.warn('[legacy-ensure]', e.message.slice(0, 80)) }
  }
}
