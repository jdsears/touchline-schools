import pool from '../config/database.js'

// Run migrations
export async function runMigrations() {
  try {
    // ==========================================
    // BASE TABLES (must be created first)
    // ==========================================

    // Create teams table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS teams (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL,
        age_group VARCHAR(50),
        hub_name VARCHAR(255),
        primary_color VARCHAR(20) DEFAULT '#22C55E',
        secondary_color VARCHAR(20) DEFAULT '#0F172A',
        accent_color VARCHAR(20) DEFAULT '#F97316',
        fa_fulltime_url TEXT,
        logo_url TEXT,
        subscription_tier VARCHAR(50) DEFAULT 'free',
        trial_ends_at TIMESTAMP,
        formations JSONB DEFAULT '[]'::jsonb,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)

    // Ensure timezone column exists on teams (critical for squad announcements, scheduling, etc.)
    try {
      await pool.query(`ALTER TABLE teams ADD COLUMN IF NOT EXISTS timezone VARCHAR(50) DEFAULT 'Europe/London'`)
    } catch (e) {
      console.warn('teams timezone migration warning:', e.message)
    }

    // Create users table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        role VARCHAR(50) DEFAULT 'parent',
        team_id UUID REFERENCES teams(id) ON DELETE SET NULL,
        player_id UUID,
        is_admin BOOLEAN DEFAULT false,
        magic_link_token VARCHAR(255),
        magic_link_expires TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)

    // Create players table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS players (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        position VARCHAR(100),
        positions JSONB DEFAULT '[]'::jsonb,
        jersey_number INTEGER,
        date_of_birth DATE,
        notes TEXT,
        photo_url TEXT,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)

    // Ensure player linking and contact columns exist
    try {
      await pool.query(`ALTER TABLE players ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id)`)
      await pool.query(`ALTER TABLE players ADD COLUMN IF NOT EXISTS parent_contact VARCHAR(255)`)
      await pool.query(`ALTER TABLE players ADD COLUMN IF NOT EXISTS parent_email VARCHAR(255)`)
      await pool.query(`ALTER TABLE players ADD COLUMN IF NOT EXISTS parent_name VARCHAR(255)`)
    } catch (e) {
      console.warn('players linking columns migration warning:', e.message)
    }

    // Ensure is_active column exists (for existing databases where CREATE TABLE was a no-op)
    try {
      await pool.query(`ALTER TABLE players ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true`)
    } catch (e) {
      console.warn('is_active migration warning:', e.message)
    }

    // Ensure player profile columns exist (for existing databases where CREATE TABLE was a no-op)
    try {
      await pool.query(`ALTER TABLE players ADD COLUMN IF NOT EXISTS emergency_contact_name TEXT`)
      await pool.query(`ALTER TABLE players ADD COLUMN IF NOT EXISTS emergency_contact_phone TEXT`)
      await pool.query(`ALTER TABLE players ADD COLUMN IF NOT EXISTS emergency_contact_relationship TEXT`)
      await pool.query(`ALTER TABLE players ADD COLUMN IF NOT EXISTS id_document_url TEXT`)
      await pool.query(`ALTER TABLE players ADD COLUMN IF NOT EXISTS id_document_type TEXT`)
    } catch (e) {
      console.warn('players columns migration warning:', e.message)
    }

    // Add foreign key for users.player_id after players table exists
    await pool.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.table_constraints
          WHERE constraint_name = 'users_player_id_fkey' AND table_name = 'users'
        ) THEN
          ALTER TABLE users ADD CONSTRAINT users_player_id_fkey
            FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE SET NULL;
        END IF;
      END $$;
    `)

    // Create matches table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS matches (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
        opponent VARCHAR(255) NOT NULL,
        match_date DATE NOT NULL,
        match_time TIME,
        location VARCHAR(255),
        home_away VARCHAR(10) DEFAULT 'home',
        score_for INTEGER,
        score_against INTEGER,
        team_notes TEXT,
        prep_notes TEXT,
        formations JSONB DEFAULT '[]'::jsonb,
        player_of_match_id UUID REFERENCES players(id) ON DELETE SET NULL,
        player_of_match_reason TEXT,
        kit_type VARCHAR(20) DEFAULT 'home',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)

    // Ensure kit_type column exists on matches (for existing databases where CREATE TABLE was a no-op)
    try {
      await pool.query(`ALTER TABLE matches ADD COLUMN IF NOT EXISTS kit_type VARCHAR(20) DEFAULT 'home'`)
    } catch (e) {
      console.warn('kit_type migration warning:', e.message)
    }

    // Ensure meet_time column exists on matches
    try {
      await pool.query(`ALTER TABLE matches ADD COLUMN IF NOT EXISTS meet_time TIME`)
    } catch (e) {
      console.warn('meet_time migration warning:', e.message)
    }

    // Ensure squad announcement and availability columns exist on matches
    try {
      await pool.query(`ALTER TABLE matches ADD COLUMN IF NOT EXISTS squad_announced BOOLEAN DEFAULT false`)
      await pool.query(`ALTER TABLE matches ADD COLUMN IF NOT EXISTS squad_announced_at TIMESTAMP`)
      await pool.query(`ALTER TABLE matches ADD COLUMN IF NOT EXISTS meetup_time TIMESTAMP`)
      await pool.query(`ALTER TABLE matches ADD COLUMN IF NOT EXISTS meetup_location VARCHAR(255)`)
      await pool.query(`ALTER TABLE matches ADD COLUMN IF NOT EXISTS availability_deadline TIMESTAMP`)
      await pool.query(`ALTER TABLE matches ADD COLUMN IF NOT EXISTS report JSONB DEFAULT '{}'`)
      await pool.query(`ALTER TABLE matches ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP`)
    } catch (e) {
      console.warn('matches squad/availability columns migration warning:', e.message)
    }

    // Ensure IDP review period columns exist on development_plans
    try {
      await pool.query(`ALTER TABLE development_plans ADD COLUMN IF NOT EXISTS review_weeks INTEGER DEFAULT 6`)
      await pool.query(`ALTER TABLE development_plans ADD COLUMN IF NOT EXISTS next_review_at TIMESTAMP`)
      await pool.query(`ALTER TABLE development_plans ADD COLUMN IF NOT EXISTS auto_review BOOLEAN DEFAULT false`)
    } catch (e) {
      console.warn('IDP review columns migration warning:', e.message)
    }

    // Create parent_potm_votes table early (depends on matches, users, players)
    try {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS parent_potm_votes (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          match_id UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
          user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(match_id, user_id)
        )
      `)
      await pool.query(`CREATE INDEX IF NOT EXISTS idx_parent_potm_votes_match ON parent_potm_votes(match_id)`)
    } catch (e) {
      console.warn('parent_potm_votes migration warning:', e.message)
    }

    // Create training_sessions table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS training_sessions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
        session_date DATE NOT NULL,
        time TIME,
        meet_time TIME,
        location VARCHAR(255),
        session_type VARCHAR(50) DEFAULT 'training',
        venue_type VARCHAR(20) DEFAULT 'outdoor',
        focus TEXT,
        notes TEXT,
        summary TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)

    // Reconcile training_sessions schema: config/migrate.js uses "date" and "focus_areas",
    // db/migrations.js uses "session_date" and "focus". Ensure columns exist with the names
    // the application code expects (date, duration, focus_areas, plan, updated_at).
    await pool.query(`
      DO $$
      BEGIN
        -- If session_date exists but date does not, rename it
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'training_sessions' AND column_name = 'session_date')
           AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'training_sessions' AND column_name = 'date') THEN
          ALTER TABLE training_sessions RENAME COLUMN session_date TO date;
        END IF;
        -- If focus exists but focus_areas does not, rename it
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'training_sessions' AND column_name = 'focus')
           AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'training_sessions' AND column_name = 'focus_areas') THEN
          ALTER TABLE training_sessions RENAME COLUMN focus TO focus_areas;
        END IF;
        -- Ensure focus_areas is array type (may have been TEXT from db/migrations.js)
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'training_sessions' AND column_name = 'focus_areas' AND data_type = 'text') THEN
          ALTER TABLE training_sessions ALTER COLUMN focus_areas TYPE VARCHAR(100)[] USING CASE WHEN focus_areas IS NULL THEN NULL ELSE ARRAY[focus_areas] END;
        END IF;
        -- Add missing columns
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'training_sessions' AND column_name = 'duration') THEN
          ALTER TABLE training_sessions ADD COLUMN duration INTEGER;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'training_sessions' AND column_name = 'plan') THEN
          ALTER TABLE training_sessions ADD COLUMN plan JSONB DEFAULT '{}';
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'training_sessions' AND column_name = 'updated_at') THEN
          ALTER TABLE training_sessions ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'training_sessions' AND column_name = 'venue_type') THEN
          ALTER TABLE training_sessions ADD COLUMN venue_type VARCHAR(20) DEFAULT 'outdoor';
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'training_sessions' AND column_name = 'meet_time') THEN
          ALTER TABLE training_sessions ADD COLUMN meet_time TIME;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'training_sessions' AND column_name = 'custom_plan') THEN
          ALTER TABLE training_sessions ADD COLUMN custom_plan TEXT;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'training_sessions' AND column_name = 'plan_images') THEN
          ALTER TABLE training_sessions ADD COLUMN plan_images JSONB DEFAULT '[]';
        END IF;
      END $$;
    `)

    // Create training_attendance table (must follow training_sessions and players)
    await pool.query(`
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
      )
    `)
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_training_attendance_session ON training_attendance(session_id)`)
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_training_attendance_player ON training_attendance(player_id)`)

    // Create training_availability table (mirrors match_availability for training/S&C sessions)
    await pool.query(`
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
      )
    `)
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_training_availability_session ON training_availability(session_id)`)
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_training_availability_player ON training_availability(player_id)`)

    // Create invites table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS invites (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
        player_id UUID REFERENCES players(id) ON DELETE SET NULL,
        email VARCHAR(255) NOT NULL,
        role VARCHAR(50) DEFAULT 'parent',
        token VARCHAR(255) UNIQUE NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        accepted_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)

    // ==========================================
    // ADDITIONAL TABLES
    // ==========================================

    // Create player_messages table for player/parent AI chat
    await pool.query(`
      CREATE TABLE IF NOT EXISTS player_messages (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        player_id UUID REFERENCES players(id) ON DELETE CASCADE,
        user_id UUID REFERENCES users(id) ON DELETE SET NULL,
        role VARCHAR(20) NOT NULL,
        content TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)

    // Create index for faster lookups
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_player_messages_player_id
      ON player_messages(player_id)
    `)

    // Create team_documents table for file uploads
    await pool.query(`
      CREATE TABLE IF NOT EXISTS team_documents (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
        uploaded_by UUID REFERENCES users(id) ON DELETE SET NULL,
        filename VARCHAR(255) NOT NULL,
        original_name VARCHAR(255) NOT NULL,
        file_type VARCHAR(100),
        file_size INTEGER,
        file_path VARCHAR(500) NOT NULL,
        visible_to_parents BOOLEAN DEFAULT false,
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)

    // Create index for faster lookups
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_team_documents_team_id
      ON team_documents(team_id)
    `)

    // Create match_clips table for video clips
    await pool.query(`
      CREATE TABLE IF NOT EXISTS match_clips (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        match_id UUID REFERENCES matches(id) ON DELETE CASCADE,
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
      )
    `)

    // Create index for faster lookups
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_match_clips_match_id
      ON match_clips(match_id)
    `)

    // Add time, location, and session_type to training_sessions if not exists
    await pool.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns
          WHERE table_name = 'training_sessions' AND column_name = 'time') THEN
          ALTER TABLE training_sessions ADD COLUMN time TIME;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns
          WHERE table_name = 'training_sessions' AND column_name = 'location') THEN
          ALTER TABLE training_sessions ADD COLUMN location VARCHAR(255);
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns
          WHERE table_name = 'training_sessions' AND column_name = 'session_type') THEN
          ALTER TABLE training_sessions ADD COLUMN session_type VARCHAR(50) DEFAULT 'training';
        END IF;
      END $$;
    `)

    // Create match_media table for parent/player photo/video uploads
    await pool.query(`
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
      )
    `)

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_match_media_match_id
      ON match_media(match_id)
    `)

    // Create team_announcements table for coach messages
    await pool.query(`
      CREATE TABLE IF NOT EXISTS team_announcements (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
        created_by UUID REFERENCES users(id) ON DELETE SET NULL,
        title VARCHAR(255) NOT NULL,
        content TEXT NOT NULL,
        priority VARCHAR(20) DEFAULT 'normal',
        is_pinned BOOLEAN DEFAULT false,
        expires_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_team_announcements_team_id
      ON team_announcements(team_id)
    `)

    // Add player_of_match columns to matches table
    await pool.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns
          WHERE table_name = 'matches' AND column_name = 'player_of_match_id') THEN
          ALTER TABLE matches ADD COLUMN player_of_match_id UUID REFERENCES players(id) ON DELETE SET NULL;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns
          WHERE table_name = 'matches' AND column_name = 'player_of_match_reason') THEN
          ALTER TABLE matches ADD COLUMN player_of_match_reason TEXT;
        END IF;
      END $$;
    `)

    // Add summary column to training_sessions for AI-generated summaries
    await pool.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns
          WHERE table_name = 'training_sessions' AND column_name = 'summary') THEN
          ALTER TABLE training_sessions ADD COLUMN summary TEXT;
        END IF;
      END $$;
    `)

    // Add share_plan_with_players column to training_sessions for coach-controlled plan visibility
    await pool.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns
          WHERE table_name = 'training_sessions' AND column_name = 'share_plan_with_players') THEN
          ALTER TABLE training_sessions ADD COLUMN share_plan_with_players BOOLEAN DEFAULT false;
        END IF;
      END $$;
    `)

    // Create player_achievements table for badges/awards
    await pool.query(`
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
      )
    `)

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_player_achievements_player_id
      ON player_achievements(player_id)
    `)

    // Add formations to teams table if upgrading from older schema
    await pool.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns
          WHERE table_name = 'teams' AND column_name = 'formations') THEN
          ALTER TABLE teams ADD COLUMN formations JSONB DEFAULT '[]'::jsonb;
        END IF;
      END $$;
    `)

    // Add tactics-related columns to teams table
    await pool.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns
          WHERE table_name = 'teams' AND column_name = 'formation') THEN
          ALTER TABLE teams ADD COLUMN formation VARCHAR(50) DEFAULT '4-3-3';
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns
          WHERE table_name = 'teams' AND column_name = 'positions') THEN
          ALTER TABLE teams ADD COLUMN positions JSONB;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns
          WHERE table_name = 'teams' AND column_name = 'game_model') THEN
          ALTER TABLE teams ADD COLUMN game_model JSONB;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns
          WHERE table_name = 'teams' AND column_name = 'planned_subs') THEN
          ALTER TABLE teams ADD COLUMN planned_subs JSONB DEFAULT '[]'::jsonb;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns
          WHERE table_name = 'teams' AND column_name = 'custom_formations') THEN
          ALTER TABLE teams ADD COLUMN custom_formations JSONB DEFAULT '[]'::jsonb;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns
          WHERE table_name = 'teams' AND column_name = 'bench_players') THEN
          ALTER TABLE teams ADD COLUMN bench_players JSONB DEFAULT '[]'::jsonb;
        END IF;
      END $$;
    `)

    // Add team_format column to teams table for squad size (11, 9, 7, 5)
    await pool.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns
          WHERE table_name = 'teams' AND column_name = 'team_format') THEN
          ALTER TABLE teams ADD COLUMN team_format INTEGER DEFAULT 11;
        END IF;
      END $$;
    `)

    // Add formations to matches table if upgrading from older schema
    await pool.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns
          WHERE table_name = 'matches' AND column_name = 'formations') THEN
          ALTER TABLE matches ADD COLUMN formations JSONB DEFAULT '[]'::jsonb;
        END IF;
      END $$;
    `)

    // Add gaffer_disabled column to players table for individual parent control
    await pool.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns
          WHERE table_name = 'players' AND column_name = 'gaffer_disabled') THEN
          ALTER TABLE players ADD COLUMN gaffer_disabled BOOLEAN DEFAULT false;
        END IF;
      END $$;
    `)

    // Add positions to players table if upgrading from older schema
    await pool.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns
          WHERE table_name = 'players' AND column_name = 'positions') THEN
          ALTER TABLE players ADD COLUMN positions JSONB DEFAULT '[]'::jsonb;
        END IF;
      END $$;
    `)

    // Convert prep_notes from JSONB to TEXT if upgrading from older schema
    await pool.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'matches' AND column_name = 'prep_notes' AND data_type = 'jsonb'
        ) THEN
          ALTER TABLE matches
            ALTER COLUMN prep_notes TYPE TEXT
            USING CASE
              WHEN prep_notes IS NULL THEN NULL
              WHEN prep_notes ? 'generated' THEN prep_notes->>'generated'
              ELSE prep_notes::text
            END;
        END IF;
      END $$;
    `)

    // ==========================================
    // BILLING & SUBSCRIPTION TABLES
    // ==========================================

    // Create subscriptions table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS subscriptions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
        plan_id VARCHAR(50) NOT NULL,
        status VARCHAR(50) NOT NULL DEFAULT 'trialing',
        current_period_start TIMESTAMP NOT NULL,
        current_period_end TIMESTAMP NOT NULL,
        provider VARCHAR(50) DEFAULT 'manual',
        provider_customer_id VARCHAR(255),
        provider_subscription_id VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_subscriptions_team_id
      ON subscriptions(team_id)
    `)

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_subscriptions_status
      ON subscriptions(status)
    `)

    // Create usage_counters table for tracking monthly usage per team
    await pool.query(`
      CREATE TABLE IF NOT EXISTS usage_counters (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
        period_key VARCHAR(7) NOT NULL,
        video_count INTEGER DEFAULT 0,
        ocr_count INTEGER DEFAULT 0,
        email_count INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(team_id, period_key)
      )
    `)

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_usage_counters_team_period
      ON usage_counters(team_id, period_key)
    `)

    // Add deep_video_count, chat_count, sessions_count, idp_count to usage_counters
    await pool.query(`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns
          WHERE table_name = 'usage_counters' AND column_name = 'deep_video_count') THEN
          ALTER TABLE usage_counters ADD COLUMN deep_video_count INTEGER DEFAULT 0;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns
          WHERE table_name = 'usage_counters' AND column_name = 'chat_count') THEN
          ALTER TABLE usage_counters ADD COLUMN chat_count INTEGER DEFAULT 0;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns
          WHERE table_name = 'usage_counters' AND column_name = 'sessions_count') THEN
          ALTER TABLE usage_counters ADD COLUMN sessions_count INTEGER DEFAULT 0;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns
          WHERE table_name = 'usage_counters' AND column_name = 'idp_count') THEN
          ALTER TABLE usage_counters ADD COLUMN idp_count INTEGER DEFAULT 0;
        END IF;
      END $$
    `)

    // Add billing_exempt column to users table
    await pool.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns
          WHERE table_name = 'users' AND column_name = 'billing_exempt') THEN
          ALTER TABLE users ADD COLUMN billing_exempt BOOLEAN DEFAULT false;
        END IF;
      END $$;
    `)

    // Add stripe_customer_id column to users table for Stripe integration
    await pool.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns
          WHERE table_name = 'users' AND column_name = 'stripe_customer_id') THEN
          ALTER TABLE users ADD COLUMN stripe_customer_id VARCHAR(255);
        END IF;
      END $$;
    `)

    // Add subscription_tier column to users table for quick tier-based access checks
    await pool.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns
          WHERE table_name = 'users' AND column_name = 'subscription_tier') THEN
          ALTER TABLE users ADD COLUMN subscription_tier VARCHAR(50) DEFAULT 'free';
        END IF;
      END $$;
    `)

    // Add owner_id to teams table for multi-team support (links to primary owner user)
    await pool.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns
          WHERE table_name = 'teams' AND column_name = 'owner_id') THEN
          ALTER TABLE teams ADD COLUMN owner_id UUID REFERENCES users(id) ON DELETE SET NULL;
        END IF;
      END $$;
    `)

    // ==========================================
    // TEAM SUGGESTIONS TABLE
    // ==========================================

    // Create team_suggestions table for player/parent suggestions to coaches
    await pool.query(`
      CREATE TABLE IF NOT EXISTS team_suggestions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
        submitted_by UUID REFERENCES users(id) ON DELETE SET NULL,
        player_id UUID REFERENCES players(id) ON DELETE SET NULL,
        category VARCHAR(50) NOT NULL DEFAULT 'general',
        title VARCHAR(255) NOT NULL,
        content TEXT NOT NULL,
        status VARCHAR(50) DEFAULT 'pending',
        coach_response TEXT,
        responded_by UUID REFERENCES users(id) ON DELETE SET NULL,
        responded_at TIMESTAMP,
        is_anonymous BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_team_suggestions_team_id
      ON team_suggestions(team_id)
    `)

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_team_suggestions_status
      ON team_suggestions(status)
    `)

    // ==========================================
    // VIDEO UPLOAD SUPPORT
    // ==========================================

    // Create videos table if not exists (may already exist from config/migrate.js)
    await pool.query(`
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
      )
    `)

    // Add new columns for video upload support
    await pool.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns
          WHERE table_name = 'videos' AND column_name = 'file_size') THEN
          ALTER TABLE videos ADD COLUMN file_size BIGINT;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns
          WHERE table_name = 'videos' AND column_name = 'original_filename') THEN
          ALTER TABLE videos ADD COLUMN original_filename VARCHAR(255);
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns
          WHERE table_name = 'videos' AND column_name = 'upload_status') THEN
          ALTER TABLE videos ADD COLUMN upload_status VARCHAR(50) DEFAULT 'pending';
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns
          WHERE table_name = 'videos' AND column_name = 'processing_status') THEN
          ALTER TABLE videos ADD COLUMN processing_status VARCHAR(50);
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns
          WHERE table_name = 'videos' AND column_name = 'frame_count') THEN
          ALTER TABLE videos ADD COLUMN frame_count INTEGER;
        END IF;
      END $$;
    `)

    // Add video_url and video_id to matches table
    await pool.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns
          WHERE table_name = 'matches' AND column_name = 'video_url') THEN
          ALTER TABLE matches ADD COLUMN video_url VARCHAR(500);
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns
          WHERE table_name = 'matches' AND column_name = 'video_id') THEN
          ALTER TABLE matches ADD COLUMN video_id UUID REFERENCES videos(id) ON DELETE SET NULL;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns
          WHERE table_name = 'matches' AND column_name = 'veo_link') THEN
          ALTER TABLE matches ADD COLUMN veo_link VARCHAR(500);
        END IF;
      END $$;
    `)

    // Create promo_codes table for discount/fee-exempt codes
    await pool.query(`
      CREATE TABLE IF NOT EXISTS promo_codes (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        code VARCHAR(50) UNIQUE NOT NULL,
        description TEXT,
        discount_type VARCHAR(20) NOT NULL CHECK (discount_type IN ('percentage', 'fixed', 'free')),
        discount_value INTEGER DEFAULT 0,
        applicable_plans TEXT[] DEFAULT '{}',
        max_uses INTEGER,
        current_uses INTEGER DEFAULT 0,
        valid_from TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        valid_until TIMESTAMP WITH TIME ZONE,
        is_active BOOLEAN DEFAULT true,
        created_by UUID REFERENCES users(id),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `)

    // Create promo_code_redemptions table to track usage
    await pool.query(`
      CREATE TABLE IF NOT EXISTS promo_code_redemptions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        promo_code_id UUID REFERENCES promo_codes(id) ON DELETE CASCADE,
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        team_id UUID REFERENCES teams(id) ON DELETE SET NULL,
        subscription_id UUID REFERENCES subscriptions(id) ON DELETE SET NULL,
        redeemed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        discount_applied INTEGER,
        UNIQUE(promo_code_id, user_id)
      )
    `)

    // Add attribute_analysis column to players for storing AI analysis text
    await pool.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns
          WHERE table_name = 'players' AND column_name = 'attribute_analysis') THEN
          ALTER TABLE players ADD COLUMN attribute_analysis TEXT;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns
          WHERE table_name = 'players' AND column_name = 'attribute_analysis_at') THEN
          ALTER TABLE players ADD COLUMN attribute_analysis_at TIMESTAMP;
        END IF;
      END $$;
    `)

    // Add missing columns to players table that may be referenced in routes
    await pool.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns
          WHERE table_name = 'players' AND column_name = 'dob') THEN
          ALTER TABLE players ADD COLUMN dob DATE;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns
          WHERE table_name = 'players' AND column_name = 'physical_attributes') THEN
          ALTER TABLE players ADD COLUMN physical_attributes JSONB DEFAULT '{}';
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns
          WHERE table_name = 'players' AND column_name = 'technical_skills') THEN
          ALTER TABLE players ADD COLUMN technical_skills JSONB DEFAULT '{}';
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns
          WHERE table_name = 'players' AND column_name = 'tactical_understanding') THEN
          ALTER TABLE players ADD COLUMN tactical_understanding JSONB DEFAULT '{}';
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns
          WHERE table_name = 'players' AND column_name = 'mental_traits') THEN
          ALTER TABLE players ADD COLUMN mental_traits JSONB DEFAULT '{}';
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns
          WHERE table_name = 'players' AND column_name = 'core_capabilities') THEN
          ALTER TABLE players ADD COLUMN core_capabilities JSONB DEFAULT '{}';
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns
          WHERE table_name = 'players' AND column_name = 'parent_contact') THEN
          ALTER TABLE players ADD COLUMN parent_contact VARCHAR(255);
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns
          WHERE table_name = 'players' AND column_name = 'squad_number') THEN
          ALTER TABLE players ADD COLUMN squad_number INTEGER;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns
          WHERE table_name = 'players' AND column_name = 'discreet_notes') THEN
          ALTER TABLE players ADD COLUMN discreet_notes TEXT;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns
          WHERE table_name = 'players' AND column_name = 'is_active') THEN
          ALTER TABLE players ADD COLUMN is_active BOOLEAN DEFAULT true;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns
          WHERE table_name = 'players' AND column_name = 'updated_at') THEN
          ALTER TABLE players ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
        END IF;
      END $$;
    `)

    // ==========================================
    // TEAM MEMBERSHIPS TABLE (multi-team support)
    // ==========================================

    // Create team_memberships table for users belonging to multiple teams
    await pool.query(`
      CREATE TABLE IF NOT EXISTS team_memberships (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
        role VARCHAR(50) NOT NULL DEFAULT 'parent',
        player_id UUID REFERENCES players(id) ON DELETE SET NULL,
        is_primary BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, team_id)
      )
    `)

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_team_memberships_user_id
      ON team_memberships(user_id)
    `)

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_team_memberships_team_id
      ON team_memberships(team_id)
    `)

    // Migrate existing user-team relationships to team_memberships table
    await pool.query(`
      INSERT INTO team_memberships (user_id, team_id, role, player_id, is_primary)
      SELECT id, team_id, role, player_id, true
      FROM users
      WHERE team_id IS NOT NULL
      ON CONFLICT (user_id, team_id) DO NOTHING
    `)

    // Blog posts table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS blog_posts (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        title TEXT NOT NULL,
        slug TEXT UNIQUE NOT NULL,
        excerpt TEXT,
        content TEXT NOT NULL,
        cover_image_url TEXT,
        status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
        author_name TEXT DEFAULT 'Touchline',
        tags TEXT[] DEFAULT '{}',
        meta_title TEXT,
        meta_description TEXT,
        published_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      )
    `)
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_blog_posts_slug ON blog_posts(slug)`)
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_blog_posts_status ON blog_posts(status)`)
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_blog_posts_published_at ON blog_posts(published_at DESC)`)

    // Blog images table - stores images in DB to survive Railway container restarts
    await pool.query(`
      CREATE TABLE IF NOT EXISTS blog_images (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        filename VARCHAR(255) NOT NULL,
        mime_type VARCHAR(100) NOT NULL,
        data BYTEA NOT NULL,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      )
    `)

    // Support tickets table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS support_tickets (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email VARCHAR(255) NOT NULL,
        user_id UUID REFERENCES users(id) ON DELETE SET NULL,
        subject VARCHAR(50) NOT NULL,
        message TEXT NOT NULL,
        status VARCHAR(20) DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
        priority VARCHAR(20) DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'critical')),
        admin_response TEXT,
        responded_at TIMESTAMPTZ,
        page VARCHAR(255),
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      )
    `)
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON support_tickets(status)`)
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_support_tickets_email ON support_tickets(email)`)

    // ==========================================
    // MUX VIDEO ANALYSIS TABLES
    // ==========================================

    // Add Mux columns to existing videos table
    await pool.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns
          WHERE table_name = 'videos' AND column_name = 'mux_asset_id') THEN
          ALTER TABLE videos ADD COLUMN mux_asset_id TEXT;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns
          WHERE table_name = 'videos' AND column_name = 'mux_upload_id') THEN
          ALTER TABLE videos ADD COLUMN mux_upload_id TEXT;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns
          WHERE table_name = 'videos' AND column_name = 'mux_playback_id') THEN
          ALTER TABLE videos ADD COLUMN mux_playback_id TEXT;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns
          WHERE table_name = 'videos' AND column_name = 'title') THEN
          ALTER TABLE videos ADD COLUMN title TEXT;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns
          WHERE table_name = 'videos' AND column_name = 'description') THEN
          ALTER TABLE videos ADD COLUMN description TEXT;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns
          WHERE table_name = 'videos' AND column_name = 'duration_seconds') THEN
          ALTER TABLE videos ADD COLUMN duration_seconds REAL;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns
          WHERE table_name = 'videos' AND column_name = 'thumbnail_url') THEN
          ALTER TABLE videos ADD COLUMN thumbnail_url TEXT;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns
          WHERE table_name = 'videos' AND column_name = 'uploaded_by') THEN
          ALTER TABLE videos ADD COLUMN uploaded_by UUID;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns
          WHERE table_name = 'videos' AND column_name = 'status') THEN
          ALTER TABLE videos ADD COLUMN status TEXT DEFAULT 'waiting_upload';
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns
          WHERE table_name = 'videos' AND column_name = 'error_message') THEN
          ALTER TABLE videos ADD COLUMN error_message TEXT;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns
          WHERE table_name = 'videos' AND column_name = 'recorded_at') THEN
          ALTER TABLE videos ADD COLUMN recorded_at TIMESTAMPTZ;
        END IF;
      END $$;
    `)

    // Video clips table (proper relational, replacing JSONB clips column)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS video_clips (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        video_id UUID NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
        start_time REAL NOT NULL,
        end_time REAL NOT NULL,
        title TEXT NOT NULL,
        description TEXT,
        clip_type TEXT DEFAULT 'general',
        created_by UUID,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `)

    // Player tags on clips
    await pool.query(`
      CREATE TABLE IF NOT EXISTS clip_player_tags (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        clip_id UUID NOT NULL REFERENCES video_clips(id) ON DELETE CASCADE,
        player_id UUID NOT NULL,
        feedback TEXT,
        rating INTEGER CHECK (rating BETWEEN 1 AND 5),
        created_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(clip_id, player_id)
      )
    `)

    // Clip annotations (drawings/markers)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS clip_annotations (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        clip_id UUID NOT NULL REFERENCES video_clips(id) ON DELETE CASCADE,
        timestamp_seconds REAL NOT NULL,
        annotation_type TEXT NOT NULL,
        annotation_data JSONB NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `)

    // Video playlists
    await pool.query(`
      CREATE TABLE IF NOT EXISTS video_playlists (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        title TEXT NOT NULL,
        description TEXT,
        team_id UUID,
        created_by UUID,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `)

    await pool.query(`
      CREATE TABLE IF NOT EXISTS playlist_clips (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        playlist_id UUID NOT NULL REFERENCES video_playlists(id) ON DELETE CASCADE,
        clip_id UUID NOT NULL REFERENCES video_clips(id) ON DELETE CASCADE,
        sort_order INTEGER DEFAULT 0,
        UNIQUE(playlist_id, clip_id)
      )
    `)

    // AI analysis results
    await pool.query(`
      CREATE TABLE IF NOT EXISTS video_ai_analysis (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        video_id UUID REFERENCES videos(id) ON DELETE CASCADE,
        clip_id UUID REFERENCES video_clips(id) ON DELETE CASCADE,
        analysis_type TEXT NOT NULL,
        player_id UUID,
        summary TEXT,
        observations JSONB,
        recommendations JSONB,
        player_feedback JSONB,
        frames_analysed INTEGER,
        model_used TEXT DEFAULT 'claude-sonnet-4-6',
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `)

    // Indexes for video tables
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_videos_team_created ON videos(team_id, created_at DESC)`)
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_videos_mux_asset ON videos(mux_asset_id)`)
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_videos_mux_upload ON videos(mux_upload_id)`)
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_videos_status ON videos(status)`)
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_video_clips_video ON video_clips(video_id, start_time)`)
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_clip_tags_player ON clip_player_tags(player_id)`)
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_clip_tags_clip ON clip_player_tags(clip_id)`)
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_ai_analysis_video ON video_ai_analysis(video_id)`)
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_ai_analysis_player ON video_ai_analysis(player_id)`)

    // Add status and progress columns to video_ai_analysis for progress tracking
    await pool.query(`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns
          WHERE table_name = 'video_ai_analysis' AND column_name = 'status') THEN
          ALTER TABLE video_ai_analysis ADD COLUMN status TEXT DEFAULT 'complete';
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns
          WHERE table_name = 'video_ai_analysis' AND column_name = 'progress') THEN
          ALTER TABLE video_ai_analysis ADD COLUMN progress TEXT;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns
          WHERE table_name = 'video_ai_analysis' AND column_name = 'error') THEN
          ALTER TABLE video_ai_analysis ADD COLUMN error TEXT;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns
          WHERE table_name = 'video_ai_analysis' AND column_name = 'approved') THEN
          ALTER TABLE video_ai_analysis ADD COLUMN approved BOOLEAN DEFAULT false;
        END IF;
      END $$;
    `)

    // Add subtype column to videos (clip vs full_match)
    await pool.query(`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns
          WHERE table_name = 'videos' AND column_name = 'subtype') THEN
          ALTER TABLE videos ADD COLUMN subtype TEXT DEFAULT 'full_match';
        END IF;
      END $$;
    `)

    // Feature page screenshots - stored in DB like blog images
    await pool.query(`
      CREATE TABLE IF NOT EXISTS feature_screenshots (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        feature_slug VARCHAR(100) NOT NULL,
        slot VARCHAR(20) NOT NULL,
        filename VARCHAR(255) NOT NULL,
        mime_type VARCHAR(100) NOT NULL,
        data BYTEA NOT NULL,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(feature_slug, slot)
      )
    `)

    // ==========================================
    // LIVE STREAMING (Veo RTMP Integration)
    // ==========================================

    // Team stream credentials for Veo camera RTMP integration
    await pool.query(`
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
      )
    `)

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_team_stream_credentials_team
      ON team_stream_credentials(team_id)
    `)

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_team_stream_credentials_stream_key
      ON team_stream_credentials(stream_key)
    `)

    // Add guest access columns to stream credentials
    await pool.query(`
      ALTER TABLE team_stream_credentials
      ADD COLUMN IF NOT EXISTS guest_pin VARCHAR(6),
      ADD COLUMN IF NOT EXISTS share_code VARCHAR(12) UNIQUE
    `)

    // Index for share code lookups
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_team_stream_credentials_share_code
      ON team_stream_credentials(share_code) WHERE share_code IS NOT NULL
    `)

    // ==========================================
    // CLUB ENTITY & CRM (Phase 1)
    // ==========================================

    // Clubs table - parent entity above teams
    await pool.query(`
      CREATE TABLE IF NOT EXISTS clubs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name TEXT NOT NULL,
        slug TEXT UNIQUE NOT NULL,

        -- Club details
        logo_url TEXT,
        primary_color TEXT DEFAULT '#1a365d',
        secondary_color TEXT DEFAULT '#38a169',

        -- Contact
        contact_email TEXT,
        contact_phone TEXT,
        website TEXT,

        -- Address
        address_line1 TEXT,
        address_line2 TEXT,
        city TEXT,
        county TEXT,
        postcode TEXT,

        -- Football org
        fa_affiliation_number TEXT,
        league TEXT,
        charter_standard TEXT,

        -- Subscription
        subscription_tier TEXT DEFAULT 'club_starter',
        subscription_status TEXT DEFAULT 'trial',
        stripe_customer_id TEXT,
        stripe_account_id TEXT,

        -- Settings
        season_start_month INTEGER DEFAULT 9,
        season_end_month INTEGER DEFAULT 6,
        settings JSONB DEFAULT '{}',

        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `)

    await pool.query(`CREATE INDEX IF NOT EXISTS idx_clubs_slug ON clubs(slug)`)
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_clubs_stripe_account ON clubs(stripe_account_id)`)

    // Club members - roles within a club
    await pool.query(`
      CREATE TABLE IF NOT EXISTS club_members (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        club_id UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

        role TEXT NOT NULL DEFAULT 'coach',

        -- Parent-specific
        is_parent BOOLEAN DEFAULT false,

        -- Permissions (override by role, but can be customised)
        can_manage_payments BOOLEAN DEFAULT false,
        can_manage_players BOOLEAN DEFAULT false,
        can_view_financials BOOLEAN DEFAULT false,
        can_invite_members BOOLEAN DEFAULT false,

        status TEXT DEFAULT 'active',
        invited_at TIMESTAMPTZ,
        joined_at TIMESTAMPTZ DEFAULT NOW(),

        UNIQUE(club_id, user_id)
      )
    `)

    await pool.query(`CREATE INDEX IF NOT EXISTS idx_club_members_club ON club_members(club_id)`)
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_club_members_user ON club_members(user_id)`)

    // Guardians - parent/guardian CRM
    await pool.query(`
      CREATE TABLE IF NOT EXISTS guardians (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        club_id UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
        user_id UUID REFERENCES users(id),

        -- Contact info
        first_name TEXT NOT NULL,
        last_name TEXT NOT NULL,
        email TEXT NOT NULL,
        phone TEXT,

        -- Relationship
        relationship TEXT DEFAULT 'parent',
        is_primary_contact BOOLEAN DEFAULT true,
        is_emergency_contact BOOLEAN DEFAULT true,

        -- Address
        address_line1 TEXT,
        address_line2 TEXT,
        city TEXT,
        county TEXT,
        postcode TEXT,

        -- Consent & compliance
        photo_consent BOOLEAN DEFAULT false,
        data_consent BOOLEAN DEFAULT false,
        medical_consent BOOLEAN DEFAULT false,
        consent_date TIMESTAMPTZ,

        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `)

    await pool.query(`CREATE INDEX IF NOT EXISTS idx_guardians_club ON guardians(club_id)`)
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_guardians_email ON guardians(email)`)

    // Player-guardian link
    await pool.query(`
      CREATE TABLE IF NOT EXISTS player_guardians (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
        guardian_id UUID NOT NULL REFERENCES guardians(id) ON DELETE CASCADE,
        relationship TEXT DEFAULT 'parent',
        is_primary BOOLEAN DEFAULT true,

        UNIQUE(player_id, guardian_id)
      )
    `)

    await pool.query(`CREATE INDEX IF NOT EXISTS idx_player_guardians_player ON player_guardians(player_id)`)
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_player_guardians_guardian ON player_guardians(guardian_id)`)

    // Link existing teams to clubs
    await pool.query(`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns
          WHERE table_name = 'teams' AND column_name = 'club_id') THEN
          ALTER TABLE teams ADD COLUMN club_id UUID REFERENCES clubs(id);
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns
          WHERE table_name = 'teams' AND column_name = 'team_type') THEN
          ALTER TABLE teams ADD COLUMN team_type TEXT DEFAULT 'boys';
        END IF;
      END $$;
    `)

    // Player registration extended fields
    await pool.query(`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns
          WHERE table_name = 'players' AND column_name = 'medical_info') THEN
          ALTER TABLE players ADD COLUMN medical_info JSONB DEFAULT '{}';
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns
          WHERE table_name = 'players' AND column_name = 'allergies') THEN
          ALTER TABLE players ADD COLUMN allergies TEXT;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns
          WHERE table_name = 'players' AND column_name = 'medications') THEN
          ALTER TABLE players ADD COLUMN medications TEXT;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns
          WHERE table_name = 'players' AND column_name = 'doctor_name') THEN
          ALTER TABLE players ADD COLUMN doctor_name TEXT;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns
          WHERE table_name = 'players' AND column_name = 'doctor_phone') THEN
          ALTER TABLE players ADD COLUMN doctor_phone TEXT;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns
          WHERE table_name = 'players' AND column_name = 'fan_number') THEN
          ALTER TABLE players ADD COLUMN fan_number TEXT;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns
          WHERE table_name = 'players' AND column_name = 'registration_status') THEN
          ALTER TABLE players ADD COLUMN registration_status TEXT DEFAULT 'registered';
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns
          WHERE table_name = 'players' AND column_name = 'registration_date') THEN
          ALTER TABLE players ADD COLUMN registration_date TIMESTAMPTZ;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns
          WHERE table_name = 'players' AND column_name = 'kit_size') THEN
          ALTER TABLE players ADD COLUMN kit_size TEXT;
        END IF;
      END $$;
    `)

    // ==========================================
    // PAYMENT PLANS & SUBSCRIPTIONS (Phase 2)
    // ==========================================

    // Payment plans — what a club charges for (subs, match fees, kit)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS payment_plans (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        club_id UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,

        name TEXT NOT NULL,
        description TEXT,
        plan_type TEXT NOT NULL DEFAULT 'subscription',

        amount INTEGER NOT NULL,
        currency TEXT DEFAULT 'gbp',
        interval TEXT DEFAULT 'month',
        interval_count INTEGER DEFAULT 1,

        -- Stripe product/price IDs (on the club's connected account)
        stripe_product_id TEXT,
        stripe_price_id TEXT,

        -- Targeting
        team_ids UUID[] DEFAULT '{}',
        applies_to_all_teams BOOLEAN DEFAULT true,

        -- Status
        is_active BOOLEAN DEFAULT true,
        archived_at TIMESTAMPTZ,

        created_by UUID REFERENCES users(id),
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `)

    await pool.query(`CREATE INDEX IF NOT EXISTS idx_payment_plans_club ON payment_plans(club_id)`)
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_payment_plans_active ON payment_plans(club_id, is_active)`)

    // Ensure term columns exist on payment_plans (for existing databases)
    try {
      await pool.query(`ALTER TABLE payment_plans ADD COLUMN IF NOT EXISTS term_start DATE`)
      await pool.query(`ALTER TABLE payment_plans ADD COLUMN IF NOT EXISTS term_end DATE`)
      await pool.query(`ALTER TABLE payment_plans ADD COLUMN IF NOT EXISTS available_for_registration BOOLEAN DEFAULT false`)
    } catch (e) {
      console.warn('payment_plans term columns migration warning:', e.message)
    }

    // Player subscriptions — links a player to a payment plan
    await pool.query(`
      CREATE TABLE IF NOT EXISTS player_subscriptions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        club_id UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
        payment_plan_id UUID NOT NULL REFERENCES payment_plans(id) ON DELETE CASCADE,
        player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
        guardian_id UUID REFERENCES guardians(id),

        status TEXT NOT NULL DEFAULT 'pending',

        -- Stripe subscription (on connected account)
        stripe_subscription_id TEXT,
        stripe_customer_id TEXT,

        -- Payment tracking
        amount_paid INTEGER DEFAULT 0,
        amount_due INTEGER DEFAULT 0,
        last_payment_at TIMESTAMPTZ,
        next_payment_at TIMESTAMPTZ,

        -- Portal access token for parents
        portal_token TEXT UNIQUE,

        started_at TIMESTAMPTZ DEFAULT NOW(),
        cancelled_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `)

    await pool.query(`CREATE INDEX IF NOT EXISTS idx_player_subs_club ON player_subscriptions(club_id)`)
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_player_subs_plan ON player_subscriptions(payment_plan_id)`)
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_player_subs_player ON player_subscriptions(player_id)`)
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_player_subs_guardian ON player_subscriptions(guardian_id)`)
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_player_subs_token ON player_subscriptions(portal_token) WHERE portal_token IS NOT NULL`)
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_player_subs_status ON player_subscriptions(club_id, status)`)

    // Transactions — every payment recorded
    await pool.query(`
      CREATE TABLE IF NOT EXISTS club_transactions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        club_id UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
        player_subscription_id UUID REFERENCES player_subscriptions(id) ON DELETE SET NULL,
        player_id UUID REFERENCES players(id) ON DELETE SET NULL,
        guardian_id UUID REFERENCES guardians(id) ON DELETE SET NULL,

        -- Amounts in pence
        amount INTEGER NOT NULL,
        currency TEXT DEFAULT 'gbp',
        platform_fee INTEGER DEFAULT 0,
        net_amount INTEGER DEFAULT 0,

        type TEXT NOT NULL DEFAULT 'payment',
        status TEXT NOT NULL DEFAULT 'succeeded',
        description TEXT,

        -- Stripe references
        stripe_payment_intent_id TEXT,
        stripe_charge_id TEXT,
        stripe_checkout_session_id TEXT,

        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `)

    await pool.query(`CREATE INDEX IF NOT EXISTS idx_club_transactions_club ON club_transactions(club_id)`)
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_club_transactions_player ON club_transactions(player_id)`)
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_club_transactions_date ON club_transactions(club_id, created_at DESC)`)
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_club_transactions_stripe ON club_transactions(stripe_payment_intent_id)`)

    // Add stripe_onboarding_complete to clubs
    await pool.query(`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns
          WHERE table_name = 'clubs' AND column_name = 'stripe_onboarding_complete') THEN
          ALTER TABLE clubs ADD COLUMN stripe_onboarding_complete BOOLEAN DEFAULT false;
        END IF;
      END $$;
    `)

    // ================================================
    // PHASE 3: Parent Portal & Comms
    // ================================================

    // Club announcements (separate from team_announcements — club-wide to parents/guardians)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS club_announcements (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        club_id UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
        created_by UUID REFERENCES users(id),

        title VARCHAR(255) NOT NULL,
        content TEXT NOT NULL,
        priority VARCHAR(20) DEFAULT 'normal',
        is_pinned BOOLEAN DEFAULT false,

        -- Targeting
        target_type VARCHAR(50) DEFAULT 'all_parents',
        target_team_ids UUID[] DEFAULT '{}',

        -- Email tracking
        email_sent BOOLEAN DEFAULT false,
        email_count INTEGER DEFAULT 0,
        email_sent_at TIMESTAMPTZ,

        expires_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `)
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_club_announcements_club ON club_announcements(club_id)`)
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_club_announcements_date ON club_announcements(club_id, created_at DESC)`)

    // Guardian invite tokens (for account linking)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS guardian_invites (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        club_id UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
        guardian_id UUID NOT NULL REFERENCES guardians(id) ON DELETE CASCADE,
        email TEXT NOT NULL,
        token VARCHAR(128) UNIQUE NOT NULL,
        status VARCHAR(20) DEFAULT 'pending',
        expires_at TIMESTAMPTZ NOT NULL,
        claimed_by UUID REFERENCES users(id),
        claimed_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `)
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_guardian_invites_token ON guardian_invites(token)`)
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_guardian_invites_guardian ON guardian_invites(guardian_id)`)

    // Add guardian_id index on users if not exists (for parent lookup)
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_guardians_user ON guardians(user_id)`)

    // Communication log (track all emails sent by club)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS club_comms_log (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        club_id UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
        sent_by UUID REFERENCES users(id),
        type VARCHAR(50) NOT NULL,
        subject TEXT,
        message TEXT,
        recipient_count INTEGER DEFAULT 0,
        target_type VARCHAR(50),
        target_team_ids UUID[] DEFAULT '{}',
        announcement_id UUID REFERENCES club_announcements(id),
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `)
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_club_comms_log_club ON club_comms_log(club_id)`)

    // Add notification_preferences to guardians
    await pool.query(`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns
          WHERE table_name = 'guardians' AND column_name = 'notification_preferences') THEN
          ALTER TABLE guardians ADD COLUMN notification_preferences JSONB DEFAULT '{"announcements": true, "payments": true, "matches": true, "training": true}';
        END IF;
      END $$;
    `)

    // ==========================================
    // PERFORMANCE INDEXES
    // ==========================================

    // Matches: speed up team match listings sorted by date
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_matches_team_date ON matches(team_id, match_date DESC)`)

    // Matches: speed up player of the match lookups
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_matches_potm ON matches(player_of_match_id) WHERE player_of_match_id IS NOT NULL`)

    // Players: speed up team player listings
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_players_team_active ON players(team_id, is_active)`)

    // These indexes reference tables created by config/migrate.js — wrap each in
    // its own try/catch so a missing table doesn't block all subsequent migrations.
    const optionalIndexes = [
      `CREATE INDEX IF NOT EXISTS idx_observations_player_created ON observations(player_id, created_at DESC)`,
      `CREATE INDEX IF NOT EXISTS idx_development_plans_player_created ON development_plans(player_id, created_at DESC)`,
      `CREATE INDEX IF NOT EXISTS idx_notifications_user_created ON notifications(user_id, created_at DESC)`,
      `CREATE INDEX IF NOT EXISTS idx_club_payments_club ON club_payments(club_id, created_at DESC)`,
    ]
    for (const sql of optionalIndexes) {
      try { await pool.query(sql) } catch { /* table may not exist yet */ }
    }

    // Training sessions: speed up team session listings sorted by date
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_training_sessions_team_date ON training_sessions(team_id, date DESC)`)

    // Player messages: speed up chat history lookups
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_player_messages_player_created ON player_messages(player_id, created_at DESC)`)

    // Guardians: speed up club guardian lookups
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_guardians_club ON guardians(club_id)`)

    // =============================================
    // SAFEGUARDING & COMPLIANCE TABLES (Phase 4)
    // =============================================

    // Volunteer / Coach Compliance Records
    await pool.query(`CREATE TABLE IF NOT EXISTS compliance_records (
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
    )`)

    await pool.query(`CREATE INDEX IF NOT EXISTS idx_compliance_club ON compliance_records(club_id)`)
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_compliance_user ON compliance_records(user_id)`)
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_compliance_dbs_expiry ON compliance_records(dbs_expiry_date)`)

    // Safeguarding Roles
    await pool.query(`CREATE TABLE IF NOT EXISTS safeguarding_roles (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      club_id UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
      user_id UUID NOT NULL REFERENCES users(id),
      safeguarding_role TEXT NOT NULL,
      team_id UUID REFERENCES teams(id),
      appointed_date DATE,
      training_up_to_date BOOLEAN DEFAULT false,
      UNIQUE(club_id, safeguarding_role, team_id)
    )`)

    await pool.query(`CREATE INDEX IF NOT EXISTS idx_safeguarding_roles_club ON safeguarding_roles(club_id)`)

    // Safeguarding Incidents (confidential)
    await pool.query(`CREATE TABLE IF NOT EXISTS safeguarding_incidents (
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
    )`)

    await pool.query(`CREATE INDEX IF NOT EXISTS idx_incidents_club ON safeguarding_incidents(club_id)`)
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_incidents_status ON safeguarding_incidents(status)`)

    // Compliance Alerts (auto-generated)
    await pool.query(`CREATE TABLE IF NOT EXISTS compliance_alerts (
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
    )`)

    await pool.query(`CREATE INDEX IF NOT EXISTS idx_alerts_club ON compliance_alerts(club_id, status)`)

    // =============================================
    // EVENTS & AVAILABILITY TABLES (Phase 5)
    // =============================================

    // Club Events (camps, tournaments, presentation nights)
    await pool.query(`CREATE TABLE IF NOT EXISTS club_events (
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
    )`)

    await pool.query(`CREATE INDEX IF NOT EXISTS idx_events_club ON club_events(club_id, start_date)`)
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_events_status ON club_events(status)`)

    // Event Registrations
    await pool.query(`CREATE TABLE IF NOT EXISTS event_registrations (
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
    )`)

    await pool.query(`CREATE INDEX IF NOT EXISTS idx_event_reg_event ON event_registrations(event_id)`)
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_event_reg_player ON event_registrations(player_id)`)

    // Session Schedule (training sessions + matches with availability)
    await pool.query(`CREATE TABLE IF NOT EXISTS session_schedule (
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
    )`)

    await pool.query(`CREATE INDEX IF NOT EXISTS idx_sessions_team ON session_schedule(team_id, date)`)
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_sessions_date ON session_schedule(date)`)

    // Availability Responses
    await pool.query(`CREATE TABLE IF NOT EXISTS availability_responses (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      session_id UUID NOT NULL REFERENCES session_schedule(id) ON DELETE CASCADE,
      player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
      response TEXT NOT NULL,
      reason TEXT,
      responded_by UUID REFERENCES users(id),
      responded_at TIMESTAMPTZ DEFAULT NOW(),
      attended BOOLEAN,
      UNIQUE(session_id, player_id)
    )`)

    await pool.query(`CREATE INDEX IF NOT EXISTS idx_availability_session ON availability_responses(session_id)`)
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_availability_player ON availability_responses(player_id)`)

    // =============================================
    // AI CLUB INTELLIGENCE TABLES (Phase 6)
    // =============================================

    // AI-generated match reports for parents
    await pool.query(`CREATE TABLE IF NOT EXISTS match_reports (
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
    )`)

    await pool.query(`CREATE INDEX IF NOT EXISTS idx_match_reports_team ON match_reports(team_id)`)
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_match_reports_match ON match_reports(match_id)`)

    // AI insights (attendance, engagement, compliance, etc.)
    await pool.query(`CREATE TABLE IF NOT EXISTS ai_insights (
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
    )`)

    await pool.query(`CREATE INDEX IF NOT EXISTS idx_ai_insights_club ON ai_insights(club_id)`)
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_ai_insights_team ON ai_insights(team_id)`)

    // AI usage tracking
    await pool.query(`CREATE TABLE IF NOT EXISTS ai_usage (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      club_id UUID NOT NULL REFERENCES clubs(id),
      feature TEXT NOT NULL,
      model TEXT NOT NULL,
      input_tokens INTEGER,
      output_tokens INTEGER,
      estimated_cost_gbp NUMERIC(10,6),
      created_at TIMESTAMPTZ DEFAULT NOW()
    )`)

    await pool.query(`CREATE INDEX IF NOT EXISTS idx_ai_usage_club ON ai_usage(club_id, created_at)`)

    // Grant application drafts
    await pool.query(`CREATE TABLE IF NOT EXISTS grant_drafts (
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
    )`)

    await pool.query(`CREATE INDEX IF NOT EXISTS idx_grant_drafts_club ON grant_drafts(club_id)`)

    // =============================================
    // PHASE 7: Registration & Subscription Terms
    // =============================================

    // Add subscription term dates to payment_plans
    await pool.query(`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns
          WHERE table_name = 'payment_plans' AND column_name = 'term_start') THEN
          ALTER TABLE payment_plans ADD COLUMN term_start DATE;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns
          WHERE table_name = 'payment_plans' AND column_name = 'term_end') THEN
          ALTER TABLE payment_plans ADD COLUMN term_end DATE;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns
          WHERE table_name = 'payment_plans' AND column_name = 'available_for_registration') THEN
          ALTER TABLE payment_plans ADD COLUMN available_for_registration BOOLEAN DEFAULT false;
        END IF;
      END $$;
    `)

    // Add emergency contact, photo, and ID document fields to players
    await pool.query(`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns
          WHERE table_name = 'players' AND column_name = 'emergency_contact_name') THEN
          ALTER TABLE players ADD COLUMN emergency_contact_name TEXT;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns
          WHERE table_name = 'players' AND column_name = 'emergency_contact_phone') THEN
          ALTER TABLE players ADD COLUMN emergency_contact_phone TEXT;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns
          WHERE table_name = 'players' AND column_name = 'emergency_contact_relationship') THEN
          ALTER TABLE players ADD COLUMN emergency_contact_relationship TEXT;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns
          WHERE table_name = 'players' AND column_name = 'photo_url') THEN
          ALTER TABLE players ADD COLUMN photo_url TEXT;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns
          WHERE table_name = 'players' AND column_name = 'id_document_url') THEN
          ALTER TABLE players ADD COLUMN id_document_url TEXT;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns
          WHERE table_name = 'players' AND column_name = 'id_document_type') THEN
          ALTER TABLE players ADD COLUMN id_document_type TEXT;
        END IF;
      END $$;
    `)

    // =============================================
    // PHASE 8: Consent Tracking & DPA
    // =============================================

    // Consent records — audit trail for every consent given
    await pool.query(`
      CREATE TABLE IF NOT EXISTS consent_records (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        -- Who consented (one of these will be set)
        user_id UUID REFERENCES users(id) ON DELETE SET NULL,
        guardian_id UUID REFERENCES guardians(id) ON DELETE SET NULL,
        email TEXT,

        -- What they consented to
        consent_type TEXT NOT NULL,
        consent_version TEXT NOT NULL DEFAULT '1.0',
        consented BOOLEAN NOT NULL DEFAULT true,

        -- Context
        ip_address TEXT,
        user_agent TEXT,
        source TEXT,

        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `)
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_consent_records_user ON consent_records(user_id)`)
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_consent_records_guardian ON consent_records(guardian_id)`)
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_consent_records_email ON consent_records(email)`)

    // Add DPA accepted flag to clubs
    await pool.query(`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns
          WHERE table_name = 'clubs' AND column_name = 'dpa_accepted_at') THEN
          ALTER TABLE clubs ADD COLUMN dpa_accepted_at TIMESTAMPTZ;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns
          WHERE table_name = 'clubs' AND column_name = 'dpa_accepted_by') THEN
          ALTER TABLE clubs ADD COLUMN dpa_accepted_by UUID REFERENCES users(id);
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns
          WHERE table_name = 'clubs' AND column_name = 'dpa_version') THEN
          ALTER TABLE clubs ADD COLUMN dpa_version TEXT;
        END IF;
      END $$;
    `)

    // =============================================
    // SAFEGUARDING SCHEMA ALIGNMENT (Patch)
    // =============================================

    // compliance_records: add columns expected by route handlers
    await pool.query(`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns
          WHERE table_name = 'compliance_records' AND column_name = 'record_type') THEN
          ALTER TABLE compliance_records ADD COLUMN record_type TEXT;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns
          WHERE table_name = 'compliance_records' AND column_name = 'reference_number') THEN
          ALTER TABLE compliance_records ADD COLUMN reference_number TEXT;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns
          WHERE table_name = 'compliance_records' AND column_name = 'issue_date') THEN
          ALTER TABLE compliance_records ADD COLUMN issue_date DATE;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns
          WHERE table_name = 'compliance_records' AND column_name = 'expiry_date') THEN
          ALTER TABLE compliance_records ADD COLUMN expiry_date DATE;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns
          WHERE table_name = 'compliance_records' AND column_name = 'status') THEN
          ALTER TABLE compliance_records ADD COLUMN status TEXT DEFAULT 'valid';
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns
          WHERE table_name = 'compliance_records' AND column_name = 'created_by') THEN
          ALTER TABLE compliance_records ADD COLUMN created_by UUID;
        END IF;
      END $$;
    `)

    // safeguarding_roles: add columns expected by route handlers
    await pool.query(`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns
          WHERE table_name = 'safeguarding_roles' AND column_name = 'role_type') THEN
          ALTER TABLE safeguarding_roles ADD COLUMN role_type TEXT;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns
          WHERE table_name = 'safeguarding_roles' AND column_name = 'qualifications') THEN
          ALTER TABLE safeguarding_roles ADD COLUMN qualifications TEXT;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns
          WHERE table_name = 'safeguarding_roles' AND column_name = 'dbs_number') THEN
          ALTER TABLE safeguarding_roles ADD COLUMN dbs_number TEXT;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns
          WHERE table_name = 'safeguarding_roles' AND column_name = 'dbs_expiry') THEN
          ALTER TABLE safeguarding_roles ADD COLUMN dbs_expiry DATE;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns
          WHERE table_name = 'safeguarding_roles' AND column_name = 'assigned_by') THEN
          ALTER TABLE safeguarding_roles ADD COLUMN assigned_by UUID;
        END IF;
      END $$;
    `)

    // safeguarding_incidents: add columns expected by route handlers
    await pool.query(`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns
          WHERE table_name = 'safeguarding_incidents' AND column_name = 'category') THEN
          ALTER TABLE safeguarding_incidents ADD COLUMN category TEXT DEFAULT 'general';
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns
          WHERE table_name = 'safeguarding_incidents' AND column_name = 'involved_parties') THEN
          ALTER TABLE safeguarding_incidents ADD COLUMN involved_parties JSONB;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns
          WHERE table_name = 'safeguarding_incidents' AND column_name = 'immediate_action_taken') THEN
          ALTER TABLE safeguarding_incidents ADD COLUMN immediate_action_taken TEXT;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns
          WHERE table_name = 'safeguarding_incidents' AND column_name = 'resolution_notes') THEN
          ALTER TABLE safeguarding_incidents ADD COLUMN resolution_notes TEXT;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns
          WHERE table_name = 'safeguarding_incidents' AND column_name = 'resolved_by') THEN
          ALTER TABLE safeguarding_incidents ADD COLUMN resolved_by UUID;
        END IF;
      END $$;
    `)

    // compliance_alerts: add columns expected by route handlers
    await pool.query(`
      DO $$ BEGIN
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'compliance_alerts') THEN
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns
            WHERE table_name = 'compliance_alerts' AND column_name = 'notes') THEN
            ALTER TABLE compliance_alerts ADD COLUMN notes TEXT;
          END IF;
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns
            WHERE table_name = 'compliance_alerts' AND column_name = 'acknowledged_at') THEN
            ALTER TABLE compliance_alerts ADD COLUMN acknowledged_at TIMESTAMPTZ;
          END IF;
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns
            WHERE table_name = 'compliance_alerts' AND column_name = 'updated_at') THEN
            ALTER TABLE compliance_alerts ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
          END IF;
        END IF;
      END $$;
    `)

    // Create parent_potm_votes table for parent player of the match voting
    await pool.query(`
      CREATE TABLE IF NOT EXISTS parent_potm_votes (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        match_id UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(match_id, user_id)
      )
    `)
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_parent_potm_votes_match ON parent_potm_votes(match_id)`)

    // Late-stage column additions — wrapped individually so one failure doesn't block the rest
    const lateAlterations = [
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS push_subscription JSONB`,
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS notification_preferences JSONB DEFAULT '{"email": true, "push": true, "availability": true, "squad": true}'`,
      `ALTER TABLE matches ADD COLUMN IF NOT EXISTS prep_draft TEXT`,
      `ALTER TABLE matches ADD COLUMN IF NOT EXISTS kit_type VARCHAR(20) DEFAULT 'home'`,
      `ALTER TABLE training_sessions ADD COLUMN IF NOT EXISTS venue_type VARCHAR(20) DEFAULT 'outdoor'`,
    ]
    for (const sql of lateAlterations) {
      try { await pool.query(sql) } catch (e) { console.warn('Late migration warning:', e.message) }
    }

    // ==========================================
    // BLOG POST SEEDS (idempotent - skips if slug exists)
    // ==========================================

    try {
      await pool.query(`
        INSERT INTO blog_posts (title, slug, excerpt, content, cover_image_url, status, author_name, tags, meta_title, meta_description, published_at)
        VALUES (
          $1, $2, $3, $4, $5, 'published', 'Touchline', $6, $7, $8, NOW()
        ) ON CONFLICT (slug) DO NOTHING
      `, [
        'Touchline Platform Update — February 2025',
        'platform-update-february-2025',
        'We\'ve upgraded every AI feature in Touchline to the latest Claude Sonnet 4.6 model, added full Club Intelligence documentation, and improved all help assistants across the platform.',
        `## Smarter AI Across the Board\n\nWe've upgraded the AI engine powering every part of Touchline to **Claude Sonnet 4.6** — the latest model from Anthropic. This means improvements across every AI feature you use, with no change in pricing.\n\n## What This Means for Coaches\n\n- **Pep is sharper** — Tactical advice, training sessions, and match preparation documents are more detailed, more consistent, and better tailored to your team's age group and format\n- **Better match reports** — Post-match reports for parents are clearer and more insightful, especially when enriched with video analysis\n- **Improved video analysis** — Individual player feedback is more specific with fewer generic observations\n- **Stronger training plans** — Session plans follow a more logical progression with better coaching points\n- **More reliable outputs** — Fewer repeated suggestions and less generic filler across all AI features\n\n## What This Means for Players and Parents\n\n- **The Gaffer is smarter** — Players get better answers about their development, coach feedback, and how to improve\n- **Clearer development plans** — AI-generated Individual Development Plans are more actionable and age-appropriate\n- **Better pep talks** — Pre-match motivation messages feel more personal and relevant\n\n## Club Intelligence — Now Fully Documented\n\nFor clubs on the **Pro plan and above**, the Club Intelligence suite is now fully integrated across the platform with improved help and guidance:\n\n- **Attendance Insights** — AI analyses attendance patterns across your club and flags players with concerning trends\n- **Season Summary Reports** — Generate comprehensive AGM-ready reports covering membership, match records, finances, and compliance at the click of a button\n- **Grant Application Drafts** — AI drafts funding applications for Football Foundation, FA National Game, and County FA grants tailored to your club\n- **Compliance Analysis** — Safeguarding gap analysis covering DBS checks, first aid coverage, and training currency with a clear compliance score\n- **Coach Development** — Personalised development suggestions for every coach based on their activity, badges, and session history\n\n## Improved Help & Support\n\nBoth our website assistant and in-app help guide have been updated with full documentation covering:\n\n- All Club Intelligence features with step-by-step guides\n- Club communications and event management\n- Player registration workflows\n- Payment and subscription management\n\nWhether you're a new user exploring Touchline or a club admin managing multiple teams, our help assistants now have the answers you need.\n\n## What's Next\n\nWe're continuing to develop new features and improvements. As always, if you have feedback or suggestions, reach out to us at **hello@touchline.xyz** or use the suggestion box in the Player Lounge.\n\n**Happy coaching!**\nThe Touchline Team`,
        'https://images.unsplash.com/photo-1431324155629-1a6deb1dec8d?w=1200&h=675&fit=crop&crop=center&q=80',
        ['platform-update', 'ai', 'club-intelligence', 'release-notes'],
        'Touchline Platform Update — February 2025',
        'We\'ve upgraded to Claude Sonnet 4.6 across all AI features, added full Club Intelligence docs, and improved help assistants.'
      ])
      console.log('📝 Blog seed: platform update post checked')
    } catch (e) {
      console.warn('Blog seed warning:', e.message)
    }

    // ==========================================
    // TRAINING ATTENDANCE TABLE
    // ==========================================

    await pool.query(`
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
      )
    `)
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_training_attendance_session ON training_attendance(session_id)`)
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_training_attendance_player ON training_attendance(player_id)`)

    // Coaching qualifications on user profile
    try {
      await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS coaching_qualifications JSONB DEFAULT '[]'`)
    } catch (e) {
      console.warn('coaching_qualifications migration warning:', e.message)
    }

    // ==========================================
    // BLOG POST SEEDS
    // ==========================================

    try {
      await pool.query(`
        INSERT INTO blog_posts (title, slug, excerpt, content, cover_image_url, status, author_name, tags, meta_title, meta_description, published_at)
        VALUES (
          $1, $2, $3, $4, $5, 'published', 'Touchline', $6, $7, $8, NOW()
        ) ON CONFLICT (slug) DO NOTHING
      `, [
        'What Touchline Brings to Your Club — And Why Intelligence Changes Everything',
        'what-touchline-brings-to-clubs-intelligence-layer',
        'Most football platforms manage your club. Touchline actually understands it. Here\'s how the AI intelligence layer transforms the way grassroots clubs operate — from the training ground to the AGM.',
        `## Every Club Deserves an Intelligence Layer\n\nRunning a grassroots football club is relentless. Spreadsheets for attendance, WhatsApp for comms, a filing cabinet for DBS checks, and a prayer that someone remembers to book the pitch. Most "club management" tools digitise those spreadsheets and call it progress.\n\nTouchline does something different. It watches, learns, and surfaces the things you\'d miss — then helps you act on them.\n\nWe call it the **Intelligence Layer**, and it sits underneath every feature in the platform.\n\n## What Does "Intelligence" Actually Mean?\n\nIt means your club doesn\'t just store data — it **uses** it.\n\nWhen a coach records attendance after training, that data doesn\'t sit in a table. Touchline spots that a player\'s attendance has dropped from 90% to 50% over six weeks and flags it — not as a disciplinary issue, but as a welfare concern. Maybe they\'ve lost confidence. Maybe something\'s happening at home. The AI nudges the coach to check in, because that\'s what good clubs do.\n\nWhen a volunteer\'s DBS is due to expire in 60 days, the platform doesn\'t wait for someone to notice. It generates a compliance alert, calculates your club\'s overall safeguarding score, and tells you exactly which gaps need closing before your next Charter Standard review.\n\nWhen the AGM rolls around, you don\'t spend a weekend pulling numbers together. One click generates a **Season Summary Report** covering membership, match results, attendance trends, financial overview, and compliance status — ready to present.\n\nThat\'s the intelligence layer. Data in, insight out.\n\n## Built for How Clubs Actually Work\n\nTouchline isn\'t built for elite academies with full-time analysts. It\'s built for the volunteer coach who works Monday to Friday and gives up their weekends for the kids.\n\nEvery feature is designed to save time:\n\n- **AI Training Sessions** — Tell Touchline what you want to work on, and it generates a complete session plan with warm-up, drills, progressions, and coaching points. Tailored to your age group, pitch size, and player count.\n- **Match Preparation** — Before every game, generate a tactical briefing with formation suggestions, focus points, and a team talk. Share it with your coaching staff or keep it in your pocket on the touchline.\n- **Player Development** — Individual Development Plans generated from session-by-session observations. Track technical, tactical, physical, and mental progress across the season without a clipboard in sight.\n- **Video Analysis** — Upload match footage and get AI-powered individual player feedback with ratings, strengths, and areas to improve. The analysis feeds into match reports for parents automatically.\n\n## The Club Intelligence Suite\n\nFor clubs managing multiple teams, the intelligence layer scales up with the **Club Intelligence** suite:\n\n### Attendance Insights\nAI analyses attendance patterns across every team. Spots declining trends before they become dropouts. Flags welfare concerns sensitively. Gives coaches and welfare officers the information they need to act early.\n\n### Compliance & Safeguarding\nA real-time view of your club\'s compliance posture. DBS tracking with automatic expiry alerts. First aid coverage analysis per team. Safeguarding role assignments. Incident reporting with confidential audit trails. AI generates a gap analysis with a clear compliance score and actionable recommendations.\n\n### Grant Applications\nNeed funding? Touchline drafts grant applications for Football Foundation, FA National Game, and County FA grants — tailored to your club\'s actual data. Membership numbers, facility needs, community impact — all pulled from the platform and structured into a compelling application.\n\n### Season Summary Reports\nOne-click AGM-ready reports. Membership breakdown by age group, match records and results, attendance averages, financial summary, compliance status, and coaching activity — all generated from your real data, not guesswork.\n\n### Coach Development\nPersonalised development suggestions for every coach based on their qualifications, sessions delivered, video analyses conducted, and observation patterns. Helps coaches grow without needing expensive external CPD.\n\n## What Makes This Different\n\nOther platforms give you forms to fill in. Touchline gives you answers.\n\nThe intelligence layer means:\n\n- **No more missed renewals** — DBS, first aid, and safeguarding expiries are tracked and flagged automatically\n- **No more invisible dropouts** — Attendance trends surface before players disappear\n- **No more blank-page AGMs** — Season reports generate themselves\n- **No more generic sessions** — Every training plan is built for your team\'s format, age group, and focus areas\n- **No more grant-writing dread** — Applications draft themselves from your club\'s real data\n\nThe technology behind it is Claude, the latest AI from Anthropic — the same technology used by leading organisations worldwide. But you don\'t need to know that. You just need to know it works.\n\n## Pricing That Makes Sense\n\nTouchline starts at **£9.99/month** for individual teams with full AI coaching tools. Club plans with the full Intelligence suite start at **£34.99/month** for up to 6 teams — less than the cost of a set of training bibs.\n\nEvery plan includes unlimited coaches, players, and parents. No per-user fees. No hidden charges.\n\n## Try It\n\nIf you\'re running a grassroots club and spending more time on admin than coaching, Touchline was built for you. The intelligence layer isn\'t a gimmick — it\'s what happens when you build a platform that actually understands football.\n\n**[Start your free trial at touchline.xyz](https://touchline.xyz/register)**\n\n---\n\n*Touchline is built in England for English grassroots football. Every AI feature follows FA guidelines and the Youth Development Review framework.*`,
        'https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=1200&h=675&fit=crop&crop=center&q=80',
        ['club-intelligence', 'grassroots', 'ai', 'club-management', 'safeguarding'],
        'What Touchline Brings to Clubs — The AI Intelligence Layer',
        'Most football platforms manage your club. Touchline understands it. Discover how the AI intelligence layer transforms grassroots club operations.'
      ])
      console.log('📝 Blog seed: club intelligence post checked')
    } catch (e) {
      console.warn('Blog seed warning:', e.message)
    }

    // IDP review period tracking columns
    try {
      await pool.query(`ALTER TABLE development_plans ADD COLUMN IF NOT EXISTS review_weeks INTEGER DEFAULT 6`)
      await pool.query(`ALTER TABLE development_plans ADD COLUMN IF NOT EXISTS next_review_at TIMESTAMP`)
      await pool.query(`ALTER TABLE development_plans ADD COLUMN IF NOT EXISTS auto_review BOOLEAN DEFAULT false`)
    } catch (e) { /* table may not exist yet */ }

    // Trial lifecycle email tracking — records which reminder stage was last sent
    // Values: '3day', '1day', 'expired', or NULL (none sent)
    try {
      await pool.query(`ALTER TABLE teams ADD COLUMN IF NOT EXISTS trial_reminder_sent VARCHAR(10)`)
    } catch (e) {
      console.warn('trial_reminder_sent migration warning:', e.message)
    }

    // Payment reminder tracking — records which reminder stage was last sent
    // Values: 'upcoming', 'overdue', or NULL (none sent). Reset on successful payment.
    try {
      await pool.query(`ALTER TABLE player_subscriptions ADD COLUMN IF NOT EXISTS payment_reminder_sent VARCHAR(10)`)
    } catch (e) {
      console.warn('payment_reminder_sent migration warning:', e.message)
    }

    // Match goals — individual goalscorer and assist tracking per match
    await pool.query(`
      CREATE TABLE IF NOT EXISTS match_goals (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        match_id UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
        scorer_player_id UUID REFERENCES players(id) ON DELETE SET NULL,
        assist_player_id UUID REFERENCES players(id) ON DELETE SET NULL,
        minute INTEGER,
        goal_type VARCHAR(20) DEFAULT 'open_play',
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_match_goals_match ON match_goals(match_id)`)
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_match_goals_scorer ON match_goals(scorer_player_id) WHERE scorer_player_id IS NOT NULL`)

    // Add coaching_philosophy column to teams table
    await pool.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns
          WHERE table_name = 'teams' AND column_name = 'coaching_philosophy') THEN
          ALTER TABLE teams ADD COLUMN coaching_philosophy TEXT;
        END IF;
      END $$;
    `)

    // ==========================================
    // FREEMIUM & DEEP VIDEO CREDITS (2026-03)
    // ==========================================

    // Add deep_video_credits column to users
    await pool.query(`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns
          WHERE table_name = 'users' AND column_name = 'deep_video_credits') THEN
          ALTER TABLE users ADD COLUMN deep_video_credits INTEGER DEFAULT 0;
        END IF;
      END $$
    `)

    // Add plan column to users (defaults to 'free' for new signups)
    await pool.query(`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns
          WHERE table_name = 'users' AND column_name = 'plan') THEN
          ALTER TABLE users ADD COLUMN plan VARCHAR(50) DEFAULT 'free';
        END IF;
      END $$
    `)

    // Add chat_count, sessions_count, idp_count to usage_counters (duplicated early in file for safety)
    try {
      await pool.query(`
        DO $$ BEGIN
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns
            WHERE table_name = 'usage_counters' AND column_name = 'chat_count') THEN
            ALTER TABLE usage_counters ADD COLUMN chat_count INTEGER DEFAULT 0;
          END IF;
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns
            WHERE table_name = 'usage_counters' AND column_name = 'sessions_count') THEN
            ALTER TABLE usage_counters ADD COLUMN sessions_count INTEGER DEFAULT 0;
          END IF;
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns
            WHERE table_name = 'usage_counters' AND column_name = 'idp_count') THEN
            ALTER TABLE usage_counters ADD COLUMN idp_count INTEGER DEFAULT 0;
          END IF;
        END $$
      `)
    } catch (e) {
      console.warn('usage_counters chat/sessions/idp migration warning:', e.message)
    }

    // Create credit_transactions table for deep video credit purchase idempotency
    await pool.query(`
      CREATE TABLE IF NOT EXISTS credit_transactions (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL,
        credits INTEGER NOT NULL,
        payment_intent_id VARCHAR(255) UNIQUE NOT NULL,
        processed BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `)

    // Create match_substitutions table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS match_substitutions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        match_id UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
        player_off_id UUID REFERENCES players(id) ON DELETE SET NULL,
        player_on_id UUID REFERENCES players(id) ON DELETE SET NULL,
        minute INTEGER,
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_match_subs_match ON match_substitutions(match_id)`)

    // Add timezone column to teams
    await pool.query(`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns
          WHERE table_name = 'teams' AND column_name = 'timezone') THEN
          ALTER TABLE teams ADD COLUMN timezone VARCHAR(50) DEFAULT 'Europe/London';
        END IF;
      END $$
    `)

    // Add video_credits column to teams for purchased analysis top-ups
    await pool.query(`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns
          WHERE table_name = 'teams' AND column_name = 'video_credits') THEN
          ALTER TABLE teams ADD COLUMN video_credits INTEGER DEFAULT 0;
        END IF;
      END $$
    `)

    // Create match_availability table (needed for availability request flow)
    await pool.query(`
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
      )
    `)

    // Create notifications table (needed for in-app notifications)
    await pool.query(`
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
      )
    `)

    // Create match_squads table (needed for squad selection and announcement)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS match_squads (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        match_id UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
        player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
        position VARCHAR(20),
        is_starting BOOLEAN DEFAULT false,
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(match_id, player_id)
      )
    `)

    // Create observations table (needed for player observations)
    await pool.query(`
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
      )
    `)

    // Create messages table (needed for chat history)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS messages (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
        user_id UUID NOT NULL REFERENCES users(id),
        role VARCHAR(20) NOT NULL,
        content TEXT NOT NULL,
        context JSONB DEFAULT '{}',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)

    // Create tactics table (needed for tactical board)
    await pool.query(`
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
      )
    `)

    // Create league_settings table (needed for league management)
    await pool.query(`
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
      )
    `)

    // Create league_table table (needed for league standings)
    await pool.query(`
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
      )
    `)

    // Create development_plans table (needed for player IDPs)
    await pool.query(`
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
      )
    `)

    // ================================================
    // GIFT AID SUPPORT
    // ================================================

    // Club charity settings (Gift Aid / HMRC details)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS club_charity_settings (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        club_id UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,

        organisation_name VARCHAR(255) NOT NULL,
        charity_number VARCHAR(50),
        casc_number VARCHAR(50),
        hmrc_reference VARCHAR(100),
        authorised_official_name VARCHAR(255),
        authorised_official_position VARCHAR(100),
        organisation_address TEXT,
        organisation_postcode VARCHAR(20),

        gift_aid_enabled BOOLEAN DEFAULT false,

        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),

        UNIQUE(club_id)
      )
    `)

    await pool.query(`CREATE INDEX IF NOT EXISTS idx_club_charity_settings_club ON club_charity_settings(club_id)`)

    // Parent Gift Aid declarations
    await pool.query(`
      CREATE TABLE IF NOT EXISTS parent_gift_aid_declarations (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        club_id UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,

        gift_aid_opted_in BOOLEAN DEFAULT false,
        gift_aid_percentage DECIMAL(5,2),
        declaration_confirmed_at TIMESTAMPTZ,
        declaration_updated_at TIMESTAMPTZ,
        declaration_ip_address VARCHAR(45),

        full_name VARCHAR(255) NOT NULL,
        home_address TEXT NOT NULL,
        postcode VARCHAR(20) NOT NULL,

        is_active BOOLEAN DEFAULT true,

        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),

        -- No unique constraint on (user_id, club_id) because old declarations
        -- are preserved with is_active = false for audit trail.
        -- Uniqueness of active declarations is enforced via partial index below.
      )
    `)

    await pool.query(`CREATE INDEX IF NOT EXISTS idx_parent_gad_user ON parent_gift_aid_declarations(user_id)`)
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_parent_gad_club ON parent_gift_aid_declarations(club_id)`)
    await pool.query(`CREATE UNIQUE INDEX IF NOT EXISTS idx_parent_gad_active ON parent_gift_aid_declarations(user_id, club_id) WHERE is_active = true`)

    // Gift Aid receipt sequence per club
    await pool.query(`
      CREATE TABLE IF NOT EXISTS gift_aid_receipt_sequences (
        club_id UUID PRIMARY KEY REFERENCES clubs(id) ON DELETE CASCADE,
        next_val INTEGER NOT NULL DEFAULT 1
      )
    `)

    // Gift Aid records (per payment)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS gift_aid_records (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        transaction_id UUID REFERENCES club_transactions(id) ON DELETE CASCADE,
        club_id UUID NOT NULL REFERENCES clubs(id),
        user_id UUID NOT NULL REFERENCES users(id),
        declaration_id UUID NOT NULL REFERENCES parent_gift_aid_declarations(id),

        base_amount INTEGER NOT NULL,
        gift_aid_percentage DECIMAL(5,2) NOT NULL,
        gift_aid_donation INTEGER NOT NULL,
        total_charged INTEGER NOT NULL,
        hmrc_reclaim_amount INTEGER NOT NULL,

        tax_year VARCHAR(9),
        payment_date TIMESTAMPTZ NOT NULL,
        payment_type VARCHAR(50),
        payment_description VARCHAR(255),

        is_refunded BOOLEAN DEFAULT false,
        refunded_at TIMESTAMPTZ,

        receipt_number VARCHAR(50) UNIQUE,
        receipt_pdf_url TEXT,
        receipt_sent_at TIMESTAMPTZ,
        receipt_email_sent BOOLEAN DEFAULT false,
        receipt_in_app_sent BOOLEAN DEFAULT false,

        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `)

    await pool.query(`CREATE INDEX IF NOT EXISTS idx_gift_aid_records_club ON gift_aid_records(club_id)`)
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_gift_aid_records_user ON gift_aid_records(user_id)`)
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_gift_aid_records_tax_year ON gift_aid_records(club_id, tax_year)`)
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_gift_aid_records_receipt ON gift_aid_records(receipt_number)`)

    // ================================================
    // SEASON DEVELOPMENT TRACKING
    // ================================================

    // Attribute snapshots — timestamped records of player attributes for tracking improvement over time
    await pool.query(`
      CREATE TABLE IF NOT EXISTS attribute_snapshots (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
        team_id UUID REFERENCES teams(id) ON DELETE SET NULL,

        -- Snapshot of all attribute categories (same structure as players table JSONB columns)
        physical_attributes JSONB,
        technical_skills JSONB,
        tactical_understanding JSONB,
        mental_traits JSONB,
        core_capabilities JSONB,

        -- Metadata
        snapshot_type VARCHAR(20) DEFAULT 'ai_analysis',
        analysis_text TEXT,
        observation_count INTEGER DEFAULT 0,

        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `)

    await pool.query(`CREATE INDEX IF NOT EXISTS idx_attr_snapshots_player ON attribute_snapshots(player_id, created_at DESC)`)
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_attr_snapshots_team ON attribute_snapshots(team_id, created_at DESC)`)

    // Add effort_rating column to training_attendance (additive — does not touch existing columns)
    try {
      await pool.query(`ALTER TABLE training_attendance ADD COLUMN IF NOT EXISTS effort_rating SMALLINT`)
    } catch (e) {
      console.warn('training_attendance effort_rating migration warning:', e.message)
    }

    // =============================================
    // Film Room (Video Library)
    // =============================================

    await pool.query(`
      CREATE TABLE IF NOT EXISTS library_sections (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
        name VARCHAR(100) NOT NULL,
        slug VARCHAR(100) NOT NULL,
        is_predefined BOOLEAN DEFAULT FALSE,
        display_order INTEGER DEFAULT 0,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(team_id, slug)
      )
    `)

    await pool.query(`
      CREATE TABLE IF NOT EXISTS library_videos (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
        section_id UUID NOT NULL REFERENCES library_sections(id) ON DELETE CASCADE,
        added_by UUID NOT NULL REFERENCES users(id),
        source_type VARCHAR(10) NOT NULL CHECK (source_type IN ('youtube', 'mux')),
        youtube_url TEXT,
        youtube_video_id VARCHAR(20),
        mux_asset_id TEXT,
        mux_playback_id TEXT,
        mux_upload_id TEXT,
        mux_status VARCHAR(20) DEFAULT 'preparing',
        title VARCHAR(200) NOT NULL,
        notes TEXT,
        is_visible BOOLEAN DEFAULT TRUE,
        is_highlighted BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `)

    await pool.query(`
      CREATE TABLE IF NOT EXISTS library_video_watches (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        video_id UUID NOT NULL REFERENCES library_videos(id) ON DELETE CASCADE,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        watched_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(video_id, user_id)
      )
    `)

    await pool.query(`CREATE INDEX IF NOT EXISTS idx_library_videos_team ON library_videos(team_id)`)
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_library_videos_section ON library_videos(section_id)`)
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_library_watches_video ON library_video_watches(video_id)`)
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_library_watches_user ON library_video_watches(user_id)`)

    // Ensure unique constraint exists (may be missing if table was created by earlier migration)
    try {
      await pool.query(`ALTER TABLE library_sections ADD CONSTRAINT library_sections_team_id_slug_key UNIQUE (team_id, slug)`)
    } catch (e) {
      // Constraint already exists — ignore
    }

    // Seed predefined sections for all existing teams that don't have them yet
    try {
      const predefinedSections = [
        ['Attacking Play',         'attacking-play',       1],
        ['Defending',              'defending',             2],
        ['Set Pieces',             'set-pieces',            3],
        ['Pressing & Intensity',   'pressing-intensity',    4],
        ['Transitions',            'transitions',           5],
        ['Goalkeeper Training',    'goalkeeper-training',   6],
        ['Fitness & Conditioning', 'fitness-conditioning',  7],
        ['Tactics & Formation',    'tactics-formation',     8],
        ['Individual Skills',      'individual-skills',     9],
        ['Team Talks & Mindset',   'team-talks-mindset',   10],
      ]
      const teamsResult = await pool.query('SELECT id FROM teams')
      for (const team of teamsResult.rows) {
        for (const [name, slug, order] of predefinedSections) {
          // Check-then-insert to avoid dependency on unique constraint
          const exists = await pool.query(
            'SELECT id FROM library_sections WHERE team_id = $1 AND slug = $2',
            [team.id, slug]
          )
          if (exists.rows.length === 0) {
            await pool.query(
              `INSERT INTO library_sections (team_id, name, slug, is_predefined, display_order)
               VALUES ($1, $2, $3, TRUE, $4)`,
              [team.id, name, slug, order]
            )
          }
        }
      }
    } catch (e) {
      console.warn('Library sections seeding warning:', e.message)
    }

    // ==========================================
    // PHASE 8: TOUCHLINE FOR SCHOOLS TRANSFORMATION
    // ==========================================
    // Rename core entities, add multi-sport support, drop stripped features.
    // This is a fresh product database so no data preservation is needed.

    console.log('Running Phase 8: Schools transformation...')

    // --- 8a: Drop stripped tables (gift aid, parent payments, guardians) ---
    await pool.query(`DROP TABLE IF EXISTS gift_aid_records CASCADE`)
    await pool.query(`DROP TABLE IF EXISTS gift_aid_receipt_sequences CASCADE`)
    await pool.query(`DROP TABLE IF EXISTS parent_gift_aid_declarations CASCADE`)
    await pool.query(`DROP TABLE IF EXISTS club_charity_settings CASCADE`)
    await pool.query(`DROP TABLE IF EXISTS club_transactions CASCADE`)
    await pool.query(`DROP TABLE IF EXISTS player_subscriptions CASCADE`)
    await pool.query(`DROP TABLE IF EXISTS payment_plans CASCADE`)
    await pool.query(`DROP TABLE IF EXISTS guardian_invites CASCADE`)
    await pool.query(`DROP TABLE IF EXISTS player_guardians CASCADE`)
    await pool.query(`DROP TABLE IF EXISTS guardians CASCADE`)
    await pool.query(`DROP TABLE IF EXISTS parent_potm_votes CASCADE`)

    // --- 8b: Rename core tables ---
    // clubs -> schools
    await pool.query(`DO $$ BEGIN
      IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'clubs') THEN
        ALTER TABLE clubs RENAME TO schools;
      END IF;
    END $$`)

    // club_members -> school_members
    await pool.query(`DO $$ BEGIN
      IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'club_members') THEN
        ALTER TABLE club_members RENAME TO school_members;
      END IF;
    END $$`)

    // club_announcements -> school_announcements
    await pool.query(`DO $$ BEGIN
      IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'club_announcements') THEN
        ALTER TABLE club_announcements RENAME TO school_announcements;
      END IF;
    END $$`)

    // club_comms_log -> school_comms_log
    await pool.query(`DO $$ BEGIN
      IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'club_comms_log') THEN
        ALTER TABLE club_comms_log RENAME TO school_comms_log;
      END IF;
    END $$`)

    // club_events -> school_events
    await pool.query(`DO $$ BEGIN
      IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'club_events') THEN
        ALTER TABLE club_events RENAME TO school_events;
      END IF;
    END $$`)

    // players -> pupils
    await pool.query(`DO $$ BEGIN
      IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'players') THEN
        ALTER TABLE players RENAME TO pupils;
      END IF;
    END $$`)

    // player_achievements -> pupil_achievements
    await pool.query(`DO $$ BEGIN
      IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'player_achievements') THEN
        ALTER TABLE player_achievements RENAME TO pupil_achievements;
      END IF;
    END $$`)

    // player_messages -> pupil_messages
    await pool.query(`DO $$ BEGIN
      IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'player_messages') THEN
        ALTER TABLE player_messages RENAME TO pupil_messages;
      END IF;
    END $$`)

    // --- 8c: Rename club_id -> school_id in surviving tables ---
    const clubIdRenames = [
      'school_members', 'teams', 'school_announcements', 'school_comms_log',
      'compliance_records', 'safeguarding_roles', 'safeguarding_incidents',
      'compliance_alerts', 'school_events', 'event_registrations',
      'session_schedule', 'match_reports', 'ai_insights', 'ai_usage', 'grant_drafts'
    ]
    for (const table of clubIdRenames) {
      await pool.query(`DO $$ BEGIN
        IF EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = '${table}' AND column_name = 'club_id'
        ) THEN
          ALTER TABLE ${table} RENAME COLUMN club_id TO school_id;
        END IF;
      END $$`)
    }

    // --- 8d: Rename player_id -> pupil_id in surviving tables ---
    const playerIdRenames = [
      'users', 'training_attendance', 'training_availability', 'invites',
      'pupil_messages', 'match_media', 'pupil_achievements', 'team_suggestions',
      'team_memberships', 'clip_player_tags', 'video_ai_analysis',
      'event_registrations', 'availability_responses', 'match_availability',
      'match_squads', 'observations', 'development_plans', 'attribute_snapshots'
    ]
    for (const table of playerIdRenames) {
      await pool.query(`DO $$ BEGIN
        IF EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = '${table}' AND column_name = 'player_id'
        ) THEN
          ALTER TABLE ${table} RENAME COLUMN player_id TO pupil_id;
        END IF;
      END $$`)
    }

    // Rename player-related columns in match tables
    await pool.query(`DO $$ BEGIN
      IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'match_goals' AND column_name = 'scorer_player_id') THEN
        ALTER TABLE match_goals RENAME COLUMN scorer_player_id TO scorer_pupil_id;
      END IF;
    END $$`)
    await pool.query(`DO $$ BEGIN
      IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'match_goals' AND column_name = 'assist_player_id') THEN
        ALTER TABLE match_goals RENAME COLUMN assist_player_id TO assist_pupil_id;
      END IF;
    END $$`)
    await pool.query(`DO $$ BEGIN
      IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'match_substitutions' AND column_name = 'player_off_id') THEN
        ALTER TABLE match_substitutions RENAME COLUMN player_off_id TO pupil_off_id;
      END IF;
    END $$`)
    await pool.query(`DO $$ BEGIN
      IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'match_substitutions' AND column_name = 'player_on_id') THEN
        ALTER TABLE match_substitutions RENAME COLUMN player_on_id TO pupil_on_id;
      END IF;
    END $$`)

    // Also rename guardian_id -> drop it from event_registrations (guardians table is gone)
    await pool.query(`DO $$ BEGIN
      IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'event_registrations' AND column_name = 'guardian_id') THEN
        ALTER TABLE event_registrations DROP COLUMN guardian_id;
      END IF;
    END $$`)

    // --- 8e: Add new columns to schools table ---
    await pool.query(`DO $$ BEGIN
      ALTER TABLE schools ADD COLUMN IF NOT EXISTS school_type TEXT DEFAULT 'state'
        CHECK (school_type IN ('state', 'independent', 'academy', 'grammar', 'sixth_form_college'));
    EXCEPTION WHEN others THEN NULL;
    END $$`)

    await pool.query(`DO $$ BEGIN
      ALTER TABLE schools ADD COLUMN IF NOT EXISTS urn TEXT;
    EXCEPTION WHEN others THEN NULL;
    END $$`)

    await pool.query(`DO $$ BEGIN
      ALTER TABLE schools ADD COLUMN IF NOT EXISTS sso_provider TEXT;
    EXCEPTION WHEN others THEN NULL;
    END $$`)

    await pool.query(`DO $$ BEGIN
      ALTER TABLE schools ADD COLUMN IF NOT EXISTS sso_config JSONB;
    EXCEPTION WHEN others THEN NULL;
    END $$`)

    // Index on URN for school lookups
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_schools_urn ON schools(urn) WHERE urn IS NOT NULL`)

    // --- 8f: Add sport and schools-specific columns to teams ---
    await pool.query(`DO $$ BEGIN
      ALTER TABLE teams ADD COLUMN IF NOT EXISTS sport TEXT DEFAULT 'football'
        CHECK (sport IN ('football', 'rugby', 'cricket', 'hockey', 'netball'));
    EXCEPTION WHEN others THEN NULL;
    END $$`)

    await pool.query(`DO $$ BEGIN
      ALTER TABLE teams ADD COLUMN IF NOT EXISTS gender TEXT DEFAULT 'mixed'
        CHECK (gender IN ('boys', 'girls', 'mixed'));
    EXCEPTION WHEN others THEN NULL;
    END $$`)

    await pool.query(`DO $$ BEGIN
      ALTER TABLE teams ADD COLUMN IF NOT EXISTS season_type TEXT DEFAULT 'year_round'
        CHECK (season_type IN ('autumn', 'spring', 'summer', 'year_round'));
    EXCEPTION WHEN others THEN NULL;
    END $$`)

    await pool.query(`CREATE INDEX IF NOT EXISTS idx_teams_sport ON teams(sport)`)
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_teams_school ON teams(school_id) WHERE school_id IS NOT NULL`)

    // --- 8g: Add pupil-specific columns to pupils table ---
    await pool.query(`DO $$ BEGIN
      ALTER TABLE pupils ADD COLUMN IF NOT EXISTS year_group INTEGER CHECK (year_group BETWEEN 7 AND 13);
    EXCEPTION WHEN others THEN NULL;
    END $$`)

    await pool.query(`DO $$ BEGIN
      ALTER TABLE pupils ADD COLUMN IF NOT EXISTS house TEXT;
    EXCEPTION WHEN others THEN NULL;
    END $$`)

    // --- 8h: Create pupil_sports join table ---
    await pool.query(`CREATE TABLE IF NOT EXISTS pupil_sports (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      pupil_id UUID NOT NULL REFERENCES pupils(id) ON DELETE CASCADE,
      sport TEXT NOT NULL CHECK (sport IN ('football', 'rugby', 'cricket', 'hockey', 'netball')),
      active BOOLEAN DEFAULT true,
      joined_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(pupil_id, sport)
    )`)
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_pupil_sports_pupil ON pupil_sports(pupil_id)`)
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_pupil_sports_sport ON pupil_sports(sport)`)

    // --- 8i: Create teacher_sports join table ---
    await pool.query(`CREATE TABLE IF NOT EXISTS teacher_sports (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      teacher_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      sport TEXT NOT NULL CHECK (sport IN ('football', 'rugby', 'cricket', 'hockey', 'netball')),
      role TEXT DEFAULT 'coach' CHECK (role IN ('head_of_sport', 'coach', 'assistant')),
      created_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(teacher_id, sport)
    )`)
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_teacher_sports_teacher ON teacher_sports(teacher_id)`)
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_teacher_sports_sport ON teacher_sports(sport)`)

    // --- 8j: Create audit_log table ---
    await pool.query(`CREATE TABLE IF NOT EXISTS audit_log (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      school_id UUID REFERENCES schools(id) ON DELETE SET NULL,
      user_id UUID REFERENCES users(id) ON DELETE SET NULL,
      action TEXT NOT NULL,
      entity_type TEXT,
      entity_id UUID,
      details JSONB,
      ip_address TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )`)
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_audit_log_school ON audit_log(school_id)`)
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_audit_log_user ON audit_log(user_id)`)
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_audit_log_created ON audit_log(created_at)`)
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_audit_log_entity ON audit_log(entity_type, entity_id)`)

    console.log('Phase 8: Schools transformation complete')

    // ==========================================
    // PHASE 9: CURRICULUM PE AND ASSESSMENT
    // ==========================================
    // Teaching groups (timetabled PE classes), sport units, assessment
    // criteria, pupil assessments, and reporting infrastructure.

    console.log('Running Phase 9: Curriculum PE and assessment...')

    // --- 9a: Teaching groups (timetabled PE classes) ---
    await pool.query(`CREATE TABLE IF NOT EXISTS teaching_groups (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      year_group INTEGER NOT NULL CHECK (year_group BETWEEN 7 AND 13),
      group_identifier TEXT,
      teacher_id UUID REFERENCES users(id) ON DELETE SET NULL,
      academic_year TEXT NOT NULL,
      key_stage TEXT NOT NULL DEFAULT 'KS3' CHECK (key_stage IN ('KS3', 'KS4', 'KS5')),
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )`)
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_teaching_groups_school ON teaching_groups(school_id)`)
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_teaching_groups_teacher ON teaching_groups(teacher_id)`)
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_teaching_groups_year ON teaching_groups(year_group)`)

    // --- 9b: Teaching group pupils (which pupils are in each class) ---
    await pool.query(`CREATE TABLE IF NOT EXISTS teaching_group_pupils (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      teaching_group_id UUID NOT NULL REFERENCES teaching_groups(id) ON DELETE CASCADE,
      pupil_id UUID NOT NULL REFERENCES pupils(id) ON DELETE CASCADE,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(teaching_group_id, pupil_id)
    )`)
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_tg_pupils_group ON teaching_group_pupils(teaching_group_id)`)
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_tg_pupils_pupil ON teaching_group_pupils(pupil_id)`)

    // --- 9c: Sport units (blocks of lessons within a teaching group) ---
    await pool.query(`CREATE TABLE IF NOT EXISTS sport_units (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      teaching_group_id UUID NOT NULL REFERENCES teaching_groups(id) ON DELETE CASCADE,
      sport TEXT NOT NULL CHECK (sport IN ('football', 'rugby', 'cricket', 'hockey', 'netball',
        'athletics', 'gymnastics', 'dance', 'swimming', 'badminton', 'tennis', 'table_tennis',
        'rounders', 'basketball', 'handball', 'outdoor_adventurous', 'fitness', 'other')),
      unit_name TEXT NOT NULL,
      curriculum_area TEXT NOT NULL CHECK (curriculum_area IN (
        'invasion_games', 'net_wall', 'striking_fielding', 'athletics',
        'gymnastics', 'dance', 'swimming', 'outdoor_adventurous', 'fitness', 'other'
      )),
      start_date DATE,
      end_date DATE,
      term TEXT CHECK (term IN ('autumn', 'spring', 'summer')),
      lesson_count INTEGER,
      display_order INTEGER DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )`)
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_sport_units_group ON sport_units(teaching_group_id)`)
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_sport_units_sport ON sport_units(sport)`)

    // --- 9d: Assessment scales (school-defined grading systems) ---
    await pool.query(`CREATE TABLE IF NOT EXISTS assessment_scales (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      key_stage TEXT NOT NULL CHECK (key_stage IN ('KS3', 'KS4', 'KS5')),
      scale_type TEXT NOT NULL DEFAULT 'descriptive' CHECK (scale_type IN ('descriptive', 'numeric', 'percentage')),
      grades JSONB NOT NULL,
      is_default BOOLEAN DEFAULT false,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )`)
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_assessment_scales_school ON assessment_scales(school_id)`)

    // --- 9e: Curriculum strands (assessment dimensions) ---
    await pool.query(`CREATE TABLE IF NOT EXISTS curriculum_strands (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
      key_stage TEXT NOT NULL CHECK (key_stage IN ('KS3', 'KS4', 'KS5')),
      strand_name TEXT NOT NULL,
      description TEXT,
      display_order INTEGER DEFAULT 0,
      is_system_default BOOLEAN DEFAULT false,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )`)
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_curriculum_strands_school ON curriculum_strands(school_id)`)

    // --- 9f: Assessment criteria (specific criteria within strands) ---
    await pool.query(`CREATE TABLE IF NOT EXISTS assessment_criteria (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      strand_id UUID NOT NULL REFERENCES curriculum_strands(id) ON DELETE CASCADE,
      sport TEXT,
      criterion TEXT NOT NULL,
      grade_descriptors JSONB,
      key_stage TEXT NOT NULL CHECK (key_stage IN ('KS3', 'KS4', 'KS5')),
      display_order INTEGER DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )`)
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_assessment_criteria_strand ON assessment_criteria(strand_id)`)
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_assessment_criteria_sport ON assessment_criteria(sport)`)

    // --- 9g: Pupil assessments (actual marks and observations) ---
    await pool.query(`CREATE TABLE IF NOT EXISTS pupil_assessments (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      pupil_id UUID NOT NULL REFERENCES pupils(id) ON DELETE CASCADE,
      unit_id UUID REFERENCES sport_units(id) ON DELETE SET NULL,
      criteria_id UUID REFERENCES assessment_criteria(id) ON DELETE SET NULL,
      assessment_type TEXT NOT NULL DEFAULT 'formative' CHECK (assessment_type IN ('formative', 'summative', 'practical_exam')),
      grade TEXT,
      score NUMERIC,
      teacher_notes TEXT,
      assessed_by UUID REFERENCES users(id) ON DELETE SET NULL,
      assessed_at TIMESTAMPTZ DEFAULT NOW(),
      created_at TIMESTAMPTZ DEFAULT NOW()
    )`)
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_pupil_assessments_pupil ON pupil_assessments(pupil_id)`)
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_pupil_assessments_unit ON pupil_assessments(unit_id)`)
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_pupil_assessments_criteria ON pupil_assessments(criteria_id)`)

    // --- 9h: Reporting windows (school reporting periods) ---
    await pool.query(`CREATE TABLE IF NOT EXISTS reporting_windows (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      academic_year TEXT NOT NULL,
      term TEXT CHECK (term IN ('autumn', 'spring', 'summer')),
      opens_at TIMESTAMPTZ,
      closes_at TIMESTAMPTZ,
      year_groups INTEGER[],
      status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'open', 'closed', 'published')),
      created_at TIMESTAMPTZ DEFAULT NOW()
    )`)
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_reporting_windows_school ON reporting_windows(school_id)`)

    // --- 9i: Pupil reports (generated report data per pupil per subject) ---
    await pool.query(`CREATE TABLE IF NOT EXISTS pupil_reports (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      pupil_id UUID NOT NULL REFERENCES pupils(id) ON DELETE CASCADE,
      reporting_window_id UUID NOT NULL REFERENCES reporting_windows(id) ON DELETE CASCADE,
      unit_id UUID REFERENCES sport_units(id) ON DELETE SET NULL,
      sport TEXT,
      attainment_grade TEXT,
      effort_grade TEXT,
      teacher_comment TEXT,
      ai_draft_comment TEXT,
      generated_by UUID REFERENCES users(id) ON DELETE SET NULL,
      status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'published')),
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )`)
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_pupil_reports_pupil ON pupil_reports(pupil_id)`)
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_pupil_reports_window ON pupil_reports(reporting_window_id)`)

    // --- 9j: Seed default curriculum strands for KS3 and KS4 ---
    try {
      const ks3Strands = [
        ['Physical Competence', 'Develop competence to excel in a broad range of physical activities', 1],
        ['Rules, Strategies and Tactics', 'Apply rules, strategies and tactics across different sports and activities', 2],
        ['Health and Fitness', 'Understand how to lead a healthy, active lifestyle and improve fitness', 3],
        ['Evaluation and Improvement', 'Analyse performance, identify strengths and areas for development', 4],
      ]
      for (const [name, desc, order] of ks3Strands) {
        const exists = await pool.query(
          `SELECT id FROM curriculum_strands WHERE strand_name = $1 AND key_stage = 'KS3' AND is_system_default = true`,
          [name]
        )
        if (exists.rows.length === 0) {
          await pool.query(
            `INSERT INTO curriculum_strands (key_stage, strand_name, description, display_order, is_system_default)
             VALUES ('KS3', $1, $2, $3, true)`,
            [name, desc, order]
          )
        }
      }

      const ks4Strands = [
        ['Practical Performance', 'Demonstrate skills, techniques and tactics in chosen sports', 1],
        ['Analysis and Evaluation', 'Analyse and evaluate performance to produce strategies for improvement', 2],
        ['Anatomy and Physiology', 'Understand the body systems and their role in physical activity', 3],
        ['Physical Training', 'Understand the principles and methods of training', 4],
        ['Sport Psychology', 'Understand psychological factors affecting performance', 5],
        ['Socio-cultural Influences', 'Understand social, cultural and ethical factors in sport', 6],
      ]
      for (const [name, desc, order] of ks4Strands) {
        const exists = await pool.query(
          `SELECT id FROM curriculum_strands WHERE strand_name = $1 AND key_stage = 'KS4' AND is_system_default = true`,
          [name]
        )
        if (exists.rows.length === 0) {
          await pool.query(
            `INSERT INTO curriculum_strands (key_stage, strand_name, description, display_order, is_system_default)
             VALUES ('KS4', $1, $2, $3, true)`,
            [name, desc, order]
          )
        }
      }
    } catch (e) {
      console.warn('Curriculum strands seeding warning:', e.message)
    }

    console.log('Phase 9: Curriculum PE and assessment complete')

    // ==========================================
    // PHASE 10: U7+ AGE RANGE AND SPORT KNOWLEDGE BASE
    // ==========================================
    // Extend to primary/prep schools (Years 2-6), add sport knowledge base.

    console.log('Running Phase 10: Extended age range and sport knowledge base...')

    // --- 10a: Extend year_group range to support Years 2-13 (U7 upwards) ---
    // Drop the old CHECK constraint and add a wider one
    await pool.query(`DO $$ BEGIN
      ALTER TABLE pupils DROP CONSTRAINT IF EXISTS pupils_year_group_check;
      ALTER TABLE pupils ADD CONSTRAINT pupils_year_group_check CHECK (year_group BETWEEN 2 AND 13);
    EXCEPTION WHEN others THEN NULL;
    END $$`)

    await pool.query(`DO $$ BEGIN
      ALTER TABLE teaching_groups DROP CONSTRAINT IF EXISTS teaching_groups_year_group_check;
      ALTER TABLE teaching_groups ADD CONSTRAINT teaching_groups_year_group_check CHECK (year_group BETWEEN 2 AND 13);
    EXCEPTION WHEN others THEN NULL;
    END $$`)

    // --- 10b: Extend key_stage enums to include KS1 and KS2 ---
    await pool.query(`DO $$ BEGIN
      ALTER TABLE teaching_groups DROP CONSTRAINT IF EXISTS teaching_groups_key_stage_check;
      ALTER TABLE teaching_groups ADD CONSTRAINT teaching_groups_key_stage_check
        CHECK (key_stage IN ('KS1', 'KS2', 'KS3', 'KS4', 'KS5'));
    EXCEPTION WHEN others THEN NULL;
    END $$`)

    await pool.query(`DO $$ BEGIN
      ALTER TABLE curriculum_strands DROP CONSTRAINT IF EXISTS curriculum_strands_key_stage_check;
      ALTER TABLE curriculum_strands ADD CONSTRAINT curriculum_strands_key_stage_check
        CHECK (key_stage IN ('KS1', 'KS2', 'KS3', 'KS4', 'KS5'));
    EXCEPTION WHEN others THEN NULL;
    END $$`)

    await pool.query(`DO $$ BEGIN
      ALTER TABLE assessment_criteria DROP CONSTRAINT IF EXISTS assessment_criteria_key_stage_check;
      ALTER TABLE assessment_criteria ADD CONSTRAINT assessment_criteria_key_stage_check
        CHECK (key_stage IN ('KS1', 'KS2', 'KS3', 'KS4', 'KS5'));
    EXCEPTION WHEN others THEN NULL;
    END $$`)

    // --- 10c: Extend school_type enum for primary/prep ---
    await pool.query(`DO $$ BEGIN
      ALTER TABLE schools DROP CONSTRAINT IF EXISTS schools_school_type_check;
      ALTER TABLE schools ADD CONSTRAINT schools_school_type_check
        CHECK (school_type IN ('state', 'independent', 'academy', 'grammar', 'sixth_form_college', 'primary', 'prep', 'all_through', 'middle'));
    EXCEPTION WHEN others THEN NULL;
    END $$`)

    // --- 10d: Create sport_knowledge_base table ---
    await pool.query(`CREATE TABLE IF NOT EXISTS sport_knowledge_base (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
      sport TEXT NOT NULL,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      category TEXT DEFAULT 'general' CHECK (category IN (
        'general', 'development_framework', 'age_guidance', 'tactics',
        'training_methodology', 'safeguarding', 'assessment_criteria',
        'rules_and_regulations', 'custom'
      )),
      age_range TEXT,
      is_system_default BOOLEAN DEFAULT false,
      created_by UUID REFERENCES users(id) ON DELETE SET NULL,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )`)
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_sport_kb_school ON sport_knowledge_base(school_id)`)
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_sport_kb_sport ON sport_knowledge_base(sport)`)
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_sport_kb_category ON sport_knowledge_base(category)`)

    // --- 10e: Seed KS1 and KS2 curriculum strands ---
    try {
      const ks1Strands = [
        ['Master Basic Movements', 'Develop fundamental movements including running, jumping, throwing and catching', 1],
        ['Participate in Team Activities', 'Engage in team games, developing simple tactics for attacking and defending', 2],
        ['Perform Dances', 'Perform dances using simple movement patterns', 3],
      ]
      for (const [name, desc, order] of ks1Strands) {
        const exists = await pool.query(
          `SELECT id FROM curriculum_strands WHERE strand_name = $1 AND key_stage = 'KS1' AND is_system_default = true`,
          [name]
        )
        if (exists.rows.length === 0) {
          await pool.query(
            `INSERT INTO curriculum_strands (key_stage, strand_name, description, display_order, is_system_default)
             VALUES ('KS1', $1, $2, $3, true)`,
            [name, desc, order]
          )
        }
      }

      const ks2Strands = [
        ['Apply Skills in Competition', 'Use running, jumping, throwing and catching in isolation and combination', 1],
        ['Play Competitive Games', 'Play competitive games and apply basic principles of attacking and defending', 2],
        ['Develop Flexibility and Control', 'Develop flexibility, strength, technique, control and balance through gymnastics and athletics', 3],
        ['Perform Dances', 'Perform dances using a range of movement patterns', 4],
        ['Swimming and Water Safety', 'Swim competently, confidently and proficiently over 25 metres, using a range of strokes', 5],
        ['Compare and Improve', 'Compare performances with previous ones and demonstrate improvement', 6],
      ]
      for (const [name, desc, order] of ks2Strands) {
        const exists = await pool.query(
          `SELECT id FROM curriculum_strands WHERE strand_name = $1 AND key_stage = 'KS2' AND is_system_default = true`,
          [name]
        )
        if (exists.rows.length === 0) {
          await pool.query(
            `INSERT INTO curriculum_strands (key_stage, strand_name, description, display_order, is_system_default)
             VALUES ('KS2', $1, $2, $3, true)`,
            [name, desc, order]
          )
        }
      }
    } catch (e) {
      console.warn('KS1/KS2 strands seeding warning:', e.message)
    }

    console.log('Phase 10: Extended age range and sport knowledge base complete')

    console.log('Migrations completed')
  } catch (error) {
    console.error('Migration error:', error)
  }
}

// Run if called directly
if (process.argv[1].includes('migrations.js')) {
  runMigrations().then(() => process.exit(0))
}
