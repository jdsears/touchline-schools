import pool from './database.js'

const migrations = `
-- Users table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255),
  name VARCHAR(255) NOT NULL,
  role VARCHAR(50) DEFAULT 'manager',
  is_admin BOOLEAN DEFAULT false,
  team_id UUID,
  parent_user_id UUID REFERENCES users(id),
  player_id UUID,
  magic_link_token VARCHAR(255),
  magic_link_expires TIMESTAMP,
  push_subscription JSONB,
  notification_preferences JSONB DEFAULT '{"email": true, "push": true, "availability": true, "squad": true}',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add is_admin column if not exists (for existing databases)
DO $$ BEGIN
  ALTER TABLE users ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT false;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

-- Teams table with white-label branding
CREATE TABLE IF NOT EXISTS teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  hub_name VARCHAR(255),
  age_group VARCHAR(20),
  formation VARCHAR(20) DEFAULT '4-3-3',
  game_model JSONB DEFAULT '{}',
  positions JSONB DEFAULT '[]',
  coaching_philosophy TEXT,

  -- White-label branding
  primary_color VARCHAR(7) DEFAULT '#22C55E',
  secondary_color VARCHAR(7) DEFAULT '#0F172A',
  accent_color VARCHAR(7) DEFAULT '#F97316',
  logo_url VARCHAR(500),

  -- FA Full-Time integration
  fa_fulltime_url VARCHAR(500),
  fa_division_id VARCHAR(50),
  fa_season_id VARCHAR(50),
  fa_team_id VARCHAR(50),

  subscription_tier VARCHAR(50) DEFAULT 'free',
  trial_ends_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add foreign key to users
DO $$ BEGIN
  ALTER TABLE users ADD CONSTRAINT fk_user_team
    FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Players table with linked user account
CREATE TABLE IF NOT EXISTS players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id),
  name VARCHAR(255) NOT NULL,
  dob DATE,
  positions VARCHAR(10)[] DEFAULT '{}',
  physical_attributes JSONB DEFAULT '{}',
  technical_skills JSONB DEFAULT '{}',
  tactical_understanding JSONB DEFAULT '{}',
  mental_traits JSONB DEFAULT '{}',
  attribute_analysis TEXT,
  attribute_analysis_at TIMESTAMP,
  parent_contact VARCHAR(255),
  parent_email VARCHAR(255),
  parent_name VARCHAR(255),
  squad_number INTEGER,
  notes TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add player_id foreign key to users
DO $$ BEGIN
  ALTER TABLE users ADD CONSTRAINT fk_user_player
    FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Observations table
CREATE TABLE IF NOT EXISTS observations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  observer_id UUID NOT NULL REFERENCES users(id),
  type VARCHAR(50) NOT NULL,
  content TEXT NOT NULL,
  context VARCHAR(255),
  context_type VARCHAR(20) DEFAULT 'general',
  match_id UUID REFERENCES matches(id) ON DELETE SET NULL,
  training_session_id UUID REFERENCES training_sessions(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add context columns to observations if not exist
DO $$ BEGIN
  ALTER TABLE observations ADD COLUMN IF NOT EXISTS context_type VARCHAR(20) DEFAULT 'general';
  ALTER TABLE observations ADD COLUMN IF NOT EXISTS training_session_id UUID REFERENCES training_sessions(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

-- Matches table with availability tracking
CREATE TABLE IF NOT EXISTS matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  opponent VARCHAR(255) NOT NULL,
  date TIMESTAMP NOT NULL,
  location VARCHAR(255),
  is_home BOOLEAN DEFAULT true,
  competition VARCHAR(255),
  result VARCHAR(20),
  goals_for INTEGER,
  goals_against INTEGER,
  formation_used VARCHAR(20),
  notes TEXT,
  veo_link VARCHAR(500),
  video_url VARCHAR(500),
  prep_notes JSONB DEFAULT '{}',
  report JSONB DEFAULT '{}',

  -- Availability & Squad
  availability_deadline TIMESTAMP,
  squad_announced BOOLEAN DEFAULT false,
  squad_announced_at TIMESTAMP,
  meetup_time TIMESTAMP,
  meetup_location VARCHAR(255),

  -- FA Full-Time sync
  fa_match_id VARCHAR(50),
  is_synced BOOLEAN DEFAULT false,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Match Availability table
CREATE TABLE IF NOT EXISTS match_availability (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id),
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  notes TEXT,
  responded_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(match_id, player_id)
);

-- Match Squad Selection table
CREATE TABLE IF NOT EXISTS match_squads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  position VARCHAR(20),
  is_starting BOOLEAN DEFAULT false,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(match_id, player_id)
);

-- League Settings table
CREATE TABLE IF NOT EXISTS league_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  league_name VARCHAR(255) NOT NULL,
  season VARCHAR(50),
  division VARCHAR(255),
  fa_fulltime_table_url VARCHAR(500),
  fa_fulltime_fixtures_url VARCHAR(500),
  fa_fulltime_results_url VARCHAR(500),
  use_fa_embed BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- League Table (for manual tracking)
CREATE TABLE IF NOT EXISTS league_table (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  league_id UUID NOT NULL REFERENCES league_settings(id) ON DELETE CASCADE,
  team_name VARCHAR(255) NOT NULL,
  is_own_team BOOLEAN DEFAULT false,
  played INTEGER DEFAULT 0,
  won INTEGER DEFAULT 0,
  drawn INTEGER DEFAULT 0,
  lost INTEGER DEFAULT 0,
  goals_for INTEGER DEFAULT 0,
  goals_against INTEGER DEFAULT 0,
  goal_difference INTEGER GENERATED ALWAYS AS (goals_for - goals_against) STORED,
  points INTEGER DEFAULT 0,
  position INTEGER,
  last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Training sessions table
CREATE TABLE IF NOT EXISTS training_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  duration INTEGER,
  focus_areas VARCHAR(100)[] DEFAULT '{}',
  plan JSONB DEFAULT '{}',
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tactics table
CREATE TABLE IF NOT EXISTS tactics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  type VARCHAR(50) NOT NULL,
  formation VARCHAR(20),
  positions JSONB DEFAULT '[]',
  movements JSONB DEFAULT '[]',
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Messages table (chat history)
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id),
  role VARCHAR(20) NOT NULL,
  content TEXT NOT NULL,
  context JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Videos table
CREATE TABLE IF NOT EXISTS videos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  match_id UUID REFERENCES matches(id),
  url VARCHAR(500),
  veo_link VARCHAR(500),
  type VARCHAR(50) DEFAULT 'match',
  analysis JSONB DEFAULT '{}',
  clips JSONB DEFAULT '[]',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Invites table
CREATE TABLE IF NOT EXISTS invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL,
  player_id UUID REFERENCES players(id),
  token VARCHAR(255) UNIQUE NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  accepted_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Content table (for player lounge)
CREATE TABLE IF NOT EXISTS content (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  type VARCHAR(50) NOT NULL,
  content TEXT,
  video_url VARCHAR(500),
  player_ids UUID[] DEFAULT '{}',
  is_published BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Individual Development Plans
CREATE TABLE IF NOT EXISTS development_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  goals JSONB DEFAULT '[]',
  strengths JSONB DEFAULT '[]',
  areas_to_improve JSONB DEFAULT '[]',
  generated_content TEXT,
  notes TEXT,
  review_weeks INTEGER DEFAULT 6,
  next_review_at TIMESTAMP,
  auto_review BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Player Achievements/Badges table
CREATE TABLE IF NOT EXISTS player_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id UUID REFERENCES players(id) ON DELETE CASCADE,
  achievement_type VARCHAR(50) NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  icon VARCHAR(50),
  earned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  match_id UUID REFERENCES matches(id) ON DELETE SET NULL,
  training_session_id UUID REFERENCES training_sessions(id) ON DELETE SET NULL,
  awarded_by UUID REFERENCES users(id) ON DELETE SET NULL
);

-- Notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  data JSONB DEFAULT '{}',
  is_read BOOLEAN DEFAULT false,
  is_sent BOOLEAN DEFAULT false,
  sent_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_team ON users(team_id);
CREATE INDEX IF NOT EXISTS idx_players_team ON players(team_id);
CREATE INDEX IF NOT EXISTS idx_matches_team ON matches(team_id);
CREATE INDEX IF NOT EXISTS idx_matches_date ON matches(date);
CREATE INDEX IF NOT EXISTS idx_messages_team ON messages(team_id);
CREATE INDEX IF NOT EXISTS idx_observations_player ON observations(player_id);
CREATE INDEX IF NOT EXISTS idx_invites_token ON invites(token);
CREATE INDEX IF NOT EXISTS idx_match_availability_match ON match_availability(match_id);
CREATE INDEX IF NOT EXISTS idx_match_availability_player ON match_availability(player_id);
CREATE INDEX IF NOT EXISTS idx_match_squads_match ON match_squads(match_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications(user_id, is_read) WHERE is_read = false;
CREATE INDEX IF NOT EXISTS idx_league_table_league ON league_table(league_id);
CREATE INDEX IF NOT EXISTS idx_player_achievements_player_id ON player_achievements(player_id);

-- Add has_detailed_stats column to league_settings for tracking detailed imports
DO $$ BEGIN
  ALTER TABLE league_settings ADD COLUMN IF NOT EXISTS has_detailed_stats BOOLEAN DEFAULT false;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

-- Add home/away stats columns to league_table for detailed tracking
DO $$ BEGIN
  ALTER TABLE league_table ADD COLUMN IF NOT EXISTS home_played INTEGER DEFAULT 0;
  ALTER TABLE league_table ADD COLUMN IF NOT EXISTS home_won INTEGER DEFAULT 0;
  ALTER TABLE league_table ADD COLUMN IF NOT EXISTS home_drawn INTEGER DEFAULT 0;
  ALTER TABLE league_table ADD COLUMN IF NOT EXISTS home_lost INTEGER DEFAULT 0;
  ALTER TABLE league_table ADD COLUMN IF NOT EXISTS home_goals_for INTEGER DEFAULT 0;
  ALTER TABLE league_table ADD COLUMN IF NOT EXISTS home_goals_against INTEGER DEFAULT 0;
  ALTER TABLE league_table ADD COLUMN IF NOT EXISTS away_played INTEGER DEFAULT 0;
  ALTER TABLE league_table ADD COLUMN IF NOT EXISTS away_won INTEGER DEFAULT 0;
  ALTER TABLE league_table ADD COLUMN IF NOT EXISTS away_drawn INTEGER DEFAULT 0;
  ALTER TABLE league_table ADD COLUMN IF NOT EXISTS away_lost INTEGER DEFAULT 0;
  ALTER TABLE league_table ADD COLUMN IF NOT EXISTS away_goals_for INTEGER DEFAULT 0;
  ALTER TABLE league_table ADD COLUMN IF NOT EXISTS away_goals_against INTEGER DEFAULT 0;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

-- Team Documents table for file uploads
CREATE TABLE IF NOT EXISTS team_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  uploaded_by UUID REFERENCES users(id) ON DELETE SET NULL,
  filename VARCHAR(255) NOT NULL,
  original_name VARCHAR(255) NOT NULL,
  file_type VARCHAR(100),
  file_size INTEGER,
  file_path VARCHAR(500) NOT NULL,
  visible_to_parents BOOLEAN DEFAULT false,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_team_documents_team ON team_documents(team_id);

-- Match Clips table for video clips
CREATE TABLE IF NOT EXISTS match_clips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  uploaded_by UUID REFERENCES users(id) ON DELETE SET NULL,
  filename VARCHAR(255) NOT NULL,
  original_name VARCHAR(255) NOT NULL,
  file_path VARCHAR(500) NOT NULL,
  file_size INTEGER,
  title VARCHAR(255),
  description TEXT,
  clip_type VARCHAR(50),
  minute INTEGER,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_match_clips_match ON match_clips(match_id);

-- Add team_notes to matches for manager performance notes
DO $$ BEGIN
  ALTER TABLE matches ADD COLUMN IF NOT EXISTS team_notes TEXT;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

-- Add discreet_notes to players for private coach notes about player psychology/communication
-- These notes are NEVER shared with the AI or the player/parent portal
DO $$ BEGIN
  ALTER TABLE players ADD COLUMN IF NOT EXISTS discreet_notes TEXT;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

-- Convert players.positions from VARCHAR(10)[] to JSONB to support priority info
-- Using multi-step approach since PostgreSQL doesn't allow subqueries in USING clause
DO $$
BEGIN
  -- Check if positions column is currently varchar array type
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'players'
    AND column_name = 'positions'
    AND data_type = 'ARRAY'
  ) THEN
    -- Step 1: Add temporary JSONB column
    ALTER TABLE players ADD COLUMN positions_new JSONB DEFAULT '[]'::jsonb;

    -- Step 2: Update the new column with transformed data
    UPDATE players SET positions_new = COALESCE(
      (SELECT jsonb_agg(
        jsonb_build_object(
          'position', pos,
          'priority', CASE
            WHEN rn = 1 THEN 'primary'
            WHEN rn = 2 THEN 'secondary'
            ELSE 'tertiary'
          END
        )
      )
      FROM (
        SELECT unnest(positions) as pos, row_number() OVER () as rn
      ) sub
      WHERE pos IS NOT NULL),
      '[]'::jsonb
    );

    -- Step 3: Drop the old column
    ALTER TABLE players DROP COLUMN positions;

    -- Step 4: Rename new column to positions
    ALTER TABLE players RENAME COLUMN positions_new TO positions;
  END IF;
END $$;

-- Team Memberships table for multi-team support
CREATE TABLE IF NOT EXISTS team_memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  role VARCHAR(50) NOT NULL DEFAULT 'parent',
  player_id UUID REFERENCES players(id) ON DELETE SET NULL,
  is_primary BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, team_id)
);

CREATE INDEX IF NOT EXISTS idx_team_memberships_user ON team_memberships(user_id);
CREATE INDEX IF NOT EXISTS idx_team_memberships_team ON team_memberships(team_id);

-- Migrate existing user-team relationships to team_memberships table
INSERT INTO team_memberships (user_id, team_id, role, player_id, is_primary)
SELECT id, team_id, role, player_id, true
FROM users
WHERE team_id IS NOT NULL
ON CONFLICT (user_id, team_id) DO NOTHING;

-- Team Stream Credentials table (for Veo RTMP integration)
CREATE TABLE IF NOT EXISTS team_stream_credentials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  mux_live_stream_id TEXT NOT NULL,
  stream_key TEXT NOT NULL,
  rtmp_url TEXT NOT NULL,
  playback_id TEXT,
  status VARCHAR(50) DEFAULT 'idle',
  stream_name VARCHAR(255),
  last_active_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(team_id)
);

CREATE INDEX IF NOT EXISTS idx_team_stream_credentials_team ON team_stream_credentials(team_id);
CREATE INDEX IF NOT EXISTS idx_team_stream_credentials_stream_key ON team_stream_credentials(stream_key);

-- =============================================
-- SAFEGUARDING & COMPLIANCE TABLES (Phase 4)
-- =============================================

-- Volunteer / Coach Compliance Records
CREATE TABLE IF NOT EXISTS compliance_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role_at_club TEXT NOT NULL,
  dbs_number TEXT,
  dbs_issue_date DATE,
  dbs_expiry_date DATE,
  dbs_status TEXT DEFAULT 'pending',
  dbs_update_service BOOLEAN DEFAULT false,
  coaching_badges JSONB DEFAULT '[]',
  first_aid_cert_type TEXT,
  first_aid_expiry DATE,
  safeguarding_course TEXT,
  safeguarding_date DATE,
  safeguarding_expiry DATE,
  emergency_contact_name TEXT,
  emergency_contact_phone TEXT,
  documents JSONB DEFAULT '[]',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_compliance_club ON compliance_records(club_id);
CREATE INDEX IF NOT EXISTS idx_compliance_user ON compliance_records(user_id);
CREATE INDEX IF NOT EXISTS idx_compliance_dbs_expiry ON compliance_records(dbs_expiry_date);

-- Safeguarding Roles
CREATE TABLE IF NOT EXISTS safeguarding_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id),
  safeguarding_role TEXT NOT NULL,
  team_id UUID REFERENCES teams(id),
  appointed_date DATE,
  training_up_to_date BOOLEAN DEFAULT false,
  UNIQUE(club_id, safeguarding_role, team_id)
);

CREATE INDEX IF NOT EXISTS idx_safeguarding_roles_club ON safeguarding_roles(club_id);

-- Safeguarding Incidents (confidential)
CREATE TABLE IF NOT EXISTS safeguarding_incidents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  reported_by UUID NOT NULL REFERENCES users(id),
  reported_at TIMESTAMPTZ DEFAULT NOW(),
  incident_date DATE NOT NULL,
  incident_type TEXT NOT NULL,
  severity TEXT DEFAULT 'low',
  people_involved JSONB DEFAULT '[]',
  description TEXT NOT NULL,
  location TEXT,
  actions_taken JSONB DEFAULT '[]',
  referred_to TEXT,
  referral_date DATE,
  referral_reference TEXT,
  status TEXT DEFAULT 'open',
  outcome TEXT,
  closed_at TIMESTAMPTZ,
  closed_by UUID REFERENCES users(id),
  access_log JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_incidents_club ON safeguarding_incidents(club_id);
CREATE INDEX IF NOT EXISTS idx_incidents_status ON safeguarding_incidents(status);

-- Compliance Alerts (auto-generated)
CREATE TABLE IF NOT EXISTS compliance_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  alert_type TEXT NOT NULL,
  target_user_id UUID REFERENCES users(id),
  message TEXT NOT NULL,
  severity TEXT DEFAULT 'warning',
  status TEXT DEFAULT 'active',
  acknowledged_by UUID REFERENCES users(id),
  resolved_at TIMESTAMPTZ,
  due_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_alerts_club ON compliance_alerts(club_id, status);

-- =============================================
-- EVENTS & AVAILABILITY TABLES (Phase 5)
-- =============================================

-- Club Events (camps, tournaments, presentation nights)
CREATE TABLE IF NOT EXISTS club_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  event_type TEXT NOT NULL,
  start_date TIMESTAMPTZ NOT NULL,
  end_date TIMESTAMPTZ,
  venue_name TEXT,
  venue_address TEXT,
  venue_postcode TEXT,
  target_audience TEXT DEFAULT 'all',
  target_team_ids UUID[] DEFAULT '{}',
  target_age_groups TEXT[] DEFAULT '{}',
  allow_external BOOLEAN DEFAULT false,
  max_participants INTEGER,
  current_participants INTEGER DEFAULT 0,
  waitlist_enabled BOOLEAN DEFAULT false,
  price INTEGER,
  early_bird_price INTEGER,
  early_bird_deadline TIMESTAMPTZ,
  sibling_discount_percent INTEGER,
  stripe_product_id TEXT,
  custom_fields JSONB DEFAULT '[]',
  collect_medical_info BOOLEAN DEFAULT true,
  confirmation_email_text TEXT,
  status TEXT DEFAULT 'draft',
  registration_opens TIMESTAMPTZ,
  registration_closes TIMESTAMPTZ,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_events_club ON club_events(club_id, start_date);
CREATE INDEX IF NOT EXISTS idx_events_status ON club_events(status);

-- Event Registrations
CREATE TABLE IF NOT EXISTS event_registrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES club_events(id) ON DELETE CASCADE,
  club_id UUID NOT NULL REFERENCES clubs(id),
  player_id UUID REFERENCES players(id),
  guardian_id UUID REFERENCES guardians(id),
  external_name TEXT,
  external_email TEXT,
  external_phone TEXT,
  external_dob DATE,
  external_medical TEXT,
  custom_field_responses JSONB DEFAULT '{}',
  amount_paid INTEGER,
  stripe_payment_intent_id TEXT,
  payment_status TEXT DEFAULT 'pending',
  attended BOOLEAN,
  status TEXT DEFAULT 'registered',
  photo_consent BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_event_reg_event ON event_registrations(event_id);
CREATE INDEX IF NOT EXISTS idx_event_reg_player ON event_registrations(player_id);

-- Session Schedule (training sessions + matches with availability)
CREATE TABLE IF NOT EXISTS session_schedule (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  session_type TEXT NOT NULL,
  title TEXT,
  date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME,
  venue_name TEXT,
  venue_address TEXT,
  meet_time TIME,
  opponent TEXT,
  is_home BOOLEAN,
  match_id UUID,
  is_recurring BOOLEAN DEFAULT false,
  recurrence_rule TEXT,
  recurrence_parent_id UUID REFERENCES session_schedule(id),
  kit_colour TEXT,
  coach_notes TEXT,
  status TEXT DEFAULT 'scheduled',
  cancellation_reason TEXT,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sessions_team ON session_schedule(team_id, date);
CREATE INDEX IF NOT EXISTS idx_sessions_date ON session_schedule(date);

-- Availability Responses
CREATE TABLE IF NOT EXISTS availability_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES session_schedule(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  response TEXT NOT NULL,
  reason TEXT,
  responded_by UUID REFERENCES users(id),
  responded_at TIMESTAMPTZ DEFAULT NOW(),
  attended BOOLEAN,
  UNIQUE(session_id, player_id)
);

CREATE INDEX IF NOT EXISTS idx_availability_session ON availability_responses(session_id);
CREATE INDEX IF NOT EXISTS idx_availability_player ON availability_responses(player_id);

-- =============================================
-- AI CLUB INTELLIGENCE TABLES (Phase 6)
-- =============================================

-- AI-generated match reports for parents
CREATE TABLE IF NOT EXISTS match_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES clubs(id),
  team_id UUID NOT NULL REFERENCES teams(id),
  match_id UUID NOT NULL,
  report_text TEXT NOT NULL,
  status TEXT DEFAULT 'draft',
  approved_by UUID REFERENCES users(id),
  sent_at TIMESTAMPTZ,
  model_used TEXT DEFAULT 'claude-sonnet-4-6',
  generation_cost_tokens INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_match_reports_team ON match_reports(team_id);
CREATE INDEX IF NOT EXISTS idx_match_reports_match ON match_reports(match_id);

-- AI insights (attendance, engagement, compliance, etc.)
CREATE TABLE IF NOT EXISTS ai_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES clubs(id),
  team_id UUID REFERENCES teams(id),
  insight_type TEXT NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  data_snapshot JSONB,
  priority TEXT DEFAULT 'normal',
  seen_by JSONB DEFAULT '[]',
  actioned BOOLEAN DEFAULT false,
  model_used TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_insights_club ON ai_insights(club_id);
CREATE INDEX IF NOT EXISTS idx_ai_insights_team ON ai_insights(team_id);

-- AI usage tracking
CREATE TABLE IF NOT EXISTS ai_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES clubs(id),
  feature TEXT NOT NULL,
  model TEXT NOT NULL,
  input_tokens INTEGER,
  output_tokens INTEGER,
  estimated_cost_gbp NUMERIC(10,6),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_usage_club ON ai_usage(club_id, created_at);

-- Grant application drafts
CREATE TABLE IF NOT EXISTS grant_drafts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES clubs(id),
  grant_type TEXT NOT NULL,
  description TEXT NOT NULL,
  estimated_cost TEXT,
  draft_text TEXT NOT NULL,
  status TEXT DEFAULT 'draft',
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_grant_drafts_club ON grant_drafts(club_id);

-- Match Goals — individual goalscorer and assist tracking per match
CREATE TABLE IF NOT EXISTS match_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  scorer_player_id UUID REFERENCES players(id) ON DELETE SET NULL,
  assist_player_id UUID REFERENCES players(id) ON DELETE SET NULL,
  minute INTEGER,
  goal_type VARCHAR(20) DEFAULT 'open_play',
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_match_goals_match ON match_goals(match_id);
CREATE INDEX IF NOT EXISTS idx_match_goals_scorer ON match_goals(scorer_player_id) WHERE scorer_player_id IS NOT NULL;

-- Knowledge Base Documents — coaching resources uploaded by coaches
CREATE TABLE IF NOT EXISTS knowledge_base_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  uploaded_by UUID REFERENCES users(id) ON DELETE SET NULL,
  title VARCHAR(500) NOT NULL,
  description TEXT,
  source_type VARCHAR(50) NOT NULL DEFAULT 'manual',
  file_path VARCHAR(500),
  original_filename VARCHAR(500),
  file_type VARCHAR(100),
  file_size INTEGER,
  tags TEXT[] DEFAULT '{}',
  age_group VARCHAR(20),
  category VARCHAR(50) DEFAULT 'general',
  status VARCHAR(20) DEFAULT 'processing',
  chunk_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_kb_documents_team ON knowledge_base_documents(team_id);
CREATE INDEX IF NOT EXISTS idx_kb_documents_category ON knowledge_base_documents(category);
CREATE INDEX IF NOT EXISTS idx_kb_documents_status ON knowledge_base_documents(status);

-- Knowledge Base Chunks — parsed, searchable units of coaching knowledge
CREATE TABLE IF NOT EXISTS knowledge_base_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES knowledge_base_documents(id) ON DELETE CASCADE,
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  chunk_index INTEGER NOT NULL DEFAULT 0,
  tags TEXT[] DEFAULT '{}',
  age_group VARCHAR(20),
  category VARCHAR(50) DEFAULT 'general',
  session_type VARCHAR(50),
  skill_focus VARCHAR(100),
  search_vector tsvector,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_kb_chunks_team ON knowledge_base_chunks(team_id);
CREATE INDEX IF NOT EXISTS idx_kb_chunks_document ON knowledge_base_chunks(document_id);
CREATE INDEX IF NOT EXISTS idx_kb_chunks_category ON knowledge_base_chunks(category);
CREATE INDEX IF NOT EXISTS idx_kb_chunks_search ON knowledge_base_chunks USING GIN(search_vector);
CREATE INDEX IF NOT EXISTS idx_kb_chunks_tags ON knowledge_base_chunks USING GIN(tags);

-- Add onboarding flag to users
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'has_completed_onboarding') THEN
    ALTER TABLE users ADD COLUMN has_completed_onboarding BOOLEAN DEFAULT false;
  END IF;
END $$;

-- Match substitutions
CREATE TABLE IF NOT EXISTS match_substitutions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  player_off_id UUID REFERENCES players(id) ON DELETE SET NULL,
  player_on_id UUID REFERENCES players(id) ON DELETE SET NULL,
  minute INTEGER,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_match_subs_match ON match_substitutions(match_id);

-- Match media (photos/videos)
CREATE TABLE IF NOT EXISTS match_media (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID REFERENCES matches(id) ON DELETE CASCADE,
  uploaded_by UUID REFERENCES users(id) ON DELETE SET NULL,
  player_id UUID REFERENCES players(id) ON DELETE SET NULL,
  filename VARCHAR(255) NOT NULL,
  original_name VARCHAR(255) NOT NULL,
  file_type VARCHAR(100),
  file_size INTEGER,
  file_path VARCHAR(500) NOT NULL,
  media_type VARCHAR(20) NOT NULL DEFAULT 'photo',
  caption TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_match_media_match_id ON match_media(match_id);

-- Parent POTM votes
CREATE TABLE IF NOT EXISTS parent_potm_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(match_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_parent_potm_votes_match ON parent_potm_votes(match_id);

-- Training attendance
CREATE TABLE IF NOT EXISTS training_attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES training_sessions(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  attended BOOLEAN NOT NULL DEFAULT false,
  notes TEXT,
  recorded_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(session_id, player_id)
);
CREATE INDEX IF NOT EXISTS idx_training_attendance_session ON training_attendance(session_id);
CREATE INDEX IF NOT EXISTS idx_training_attendance_player ON training_attendance(player_id);

-- Training Availability table (mirrors match_availability for training/S&C sessions)
CREATE TABLE IF NOT EXISTS training_availability (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES training_sessions(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id),
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  notes TEXT,
  responded_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(session_id, player_id)
);
CREATE INDEX IF NOT EXISTS idx_training_availability_session ON training_availability(session_id);
CREATE INDEX IF NOT EXISTS idx_training_availability_player ON training_availability(player_id);

-- Credit transactions for deep video credits
CREATE TABLE IF NOT EXISTS credit_transactions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL,
  credits INTEGER NOT NULL,
  payment_intent_id VARCHAR(255) UNIQUE NOT NULL,
  processed BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW()
);
`

async function migrate() {
  try {
    console.log('Running migrations...')
    await pool.query(migrations)
    console.log('✅ Migrations completed successfully')
    process.exit(0)
  } catch (error) {
    console.error('❌ Migration failed:', error)
    process.exit(1)
  }
}

migrate()
