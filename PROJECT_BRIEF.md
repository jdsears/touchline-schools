# Football Assistant Manager - Complete Project Brief

## Project Overview

**Name:** Football Assistant Manager (FAM)
**Client:** John Sears / MoonBoots Consultancy
**Initial Use Case:** Morley U13 (11-a-side grassroots football)
**Future Vision:** SaaS platform for grassroots football coaches

---

## Product Vision

An AI-powered assistant manager platform that transforms how grassroots football coaches prepare, analyse, and develop their teams. The platform combines tactical intelligence, player development tracking, and automated match analysis to give amateur coaches access to professional-level coaching tools.

---

## Core Features

### 1. Authentication System

**Manager Registration & Login**
- Email/password registration for head coaches
- Magic link authentication option
- Team creation during onboarding
- Subscription tier selection (Free trial → Paid plans)

**Coach Invitations**
- Managers generate invite links for assistant coaches
- Role-based permissions (Manager, Assistant, Scout)
- Coaches can view and contribute but not delete

**Player/Parent Invitations**
- For U18 players: Parents register and grant access to children
- Player-specific login with restricted views
- Parental consent flow for data storage

### 2. Assistant Manager Chatbot (Core AI Engine)

The heart of the platform - a contextual AI assistant with deep football knowledge.

**Knowledge Base:**
- FA Youth Development Framework
- Age-appropriate tactics for U13 (11v11 transition year)
- Grassroots coaching best practices
- Player development principles
- Team psychology and leadership

**Context Awareness:**
- Current squad composition
- Recent match results and analysis
- Training history
- Individual player profiles
- Upcoming fixtures

**Capabilities:**
- Answer tactical questions
- Suggest formations based on available players
- Provide training drill ideas
- Offer match preparation advice
- Generate team talks and scripts
- Analyse uploaded match footage

### 3. Tactical Architecture Engine

**Game Model Builder**
- Define team playing style (possession, direct, counter-attack, etc.)
- Set formation preferences (4-3-3, 4-2-3-1, 3-5-2, etc.)
- Document principles of play for each phase:
  - Build-up from goalkeeper
  - Progression through midfield
  - Final third entries
  - Pressing triggers
  - Defensive shape
  - Set pieces

**Formation Visualiser**
- Interactive pitch graphic
- Drag-and-drop player positioning
- Show passing lanes and movement patterns
- Save multiple formations

**Tactical Playbook**
- Store set plays (corners, free kicks, throw-ins)
- Document attacking patterns
- Record defensive schemes
- Share with players via Player Lounge

### 4. Match Prep & Analysis Automator

**Pre-Match**
- Input upcoming opponent
- Generate tactical briefing based on game model
- Create player-specific instructions
- Produce warm-up routine
- Generate team talk outline

**Post-Match**
- Quick result logging
- Performance notes per player
- Tactical observations
- Areas for training focus
- Automatic match report generation

### 5. On-Demand Scenario Fixes

**Half-Time Adjustments**
- Input current situation (score, issues observed)
- AI suggests tactical tweaks
- Formation change recommendations
- Player substitution advice
- Psychological approach guidance

**Plan B/C Generator**
- Pre-game alternative strategies
- "If we're losing" scenarios
- "If we're winning" game management
- Weather adaptation plans
- Injury contingency plans

**Leadership Scripts**
- Captain briefing templates
- Referee communication guides
- Difficult conversation frameworks
- Player conflict resolution

### 6. Training Design Generator

**Session Builder**
- Input: Available time, players, facilities, focus areas
- Output: Complete session plan with:
  - Warm-up (with timing)
  - Technical drill (with coaching points)
  - Tactical exercise (linked to game model)
  - Match-related practice
  - Cool-down

**Drill Library**
- Categorised by skill/objective
- Age-appropriate progressions
- Equipment requirements
- Space requirements
- Video examples (where available)

**Weekly Planning**
- Match-to-match periodisation
- Load management for youth players
- Skill development curriculum
- Fun activities balance

### 7. Player Development & Profiling

**Player Profiles**
- Basic info (name, DOB, position preferences)
- Physical attributes
- Technical strengths/weaknesses
- Tactical understanding
- Mental/character traits
- Parent/guardian contact

**Observation Logging**
- Quick match observations
- Training performance notes
- Character/attitude notes
- Timestamp and context

**Role-Fit Analysis**
- AI analysis of player observations
- Suggested best positions
- Development pathway recommendations
- Comparison to role requirements

**Individual Development Plans (IDPs)**
- Auto-generated from observations
- Specific, measurable goals
- Timeline for review
- Linked training activities

**Player KPIs (Qualitative)**
- Age-appropriate metrics
- Technical markers
- Tactical understanding indicators
- Physical development tracking
- Mental/social development

### 8. Leadership & Culture Scripts

**Team Talks Library**
- Pre-match motivation templates
- Half-time adjustment scripts
- Post-match review frameworks
- End of season speeches
- New player welcome scripts

**Standards & Expectations**
- Team rules generator
- Behaviour charter creator
- Code of conduct templates
- Parent communication templates

**Difficult Situations**
- Dropping players from starting XI
- Addressing poor attitude
- Managing parent concerns
- Handling player conflicts
- Dealing with defeat

### 9. Match Analysis Engine (Veo Integration)

**Video Upload**
- Accept Veo links (app.veo.co/matches/...)
- Direct video upload (MP4, MOV)
- Cloud storage for videos

**AI Analysis** (Using Claude's vision capabilities)
- Formation recognition
- Key moment identification
- Player heat maps (manual tagging)
- Passage of play breakdown

**Report Generation**
- Match summary
- Tactical observations
- Individual player notes
- Areas for improvement
- Positive highlights

**Clip Creation**
- Timestamp key moments
- Generate shareable clips
- Annotate with drawings
- Add to Player Lounge

### 10. Coaches Lounge

**Dashboard**
- Upcoming fixtures
- Recent results
- Training schedule
- Quick actions

**Shared Resources**
- Tactical documents
- Training plans
- Match reports
- Team statistics

**Communication**
- Coach notes/chat
- Task assignments
- Calendar integration

### 11. Players Lounge

**Curated Content**
- Coach-selected videos
- Tactical explainers
- Individual feedback clips
- Team highlights

**Personal Area**
- My development plan
- My match feedback
- My goals

**Notifications**
- Email push notifications
- New content alerts
- Coach messages
- Schedule reminders

---

## Technical Architecture

### Frontend (React + Vite + Tailwind)

```
/src
  /components
    /auth
      LoginForm.jsx
      RegisterForm.jsx
      MagicLinkAuth.jsx
      InviteAccept.jsx
    /chat
      ChatInterface.jsx
      MessageBubble.jsx
      SuggestedPrompts.jsx
    /tactics
      FormationBuilder.jsx
      PitchVisualiser.jsx
      PlaybookManager.jsx
    /training
      SessionBuilder.jsx
      DrillLibrary.jsx
      WeeklyPlanner.jsx
    /players
      PlayerList.jsx
      PlayerProfile.jsx
      PlayerCard.jsx
      IDPBuilder.jsx
      ObservationForm.jsx
    /matches
      MatchList.jsx
      MatchPrep.jsx
      MatchReport.jsx
      VideoAnalysis.jsx
      VeoEmbed.jsx
    /lounges
      CoachDashboard.jsx
      PlayerDashboard.jsx
      ContentFeed.jsx
    /common
      Navbar.jsx
      Sidebar.jsx
      Modal.jsx
      Button.jsx
      Card.jsx
      Pitch.jsx
  /pages
    Landing.jsx
    Login.jsx
    Register.jsx
    Dashboard.jsx
    Chat.jsx
    Tactics.jsx
    Training.jsx
    Players.jsx
    Matches.jsx
    CoachLounge.jsx
    PlayerLounge.jsx
    Settings.jsx
  /hooks
    useAuth.js
    useChat.js
    usePlayers.js
    useMatches.js
  /context
    AuthContext.jsx
    TeamContext.jsx
    ChatContext.jsx
  /services
    api.js
    auth.js
    claude.js
  /utils
    formatters.js
    validators.js
  App.jsx
  main.jsx
```

### Backend (Node.js + Express)

```
/server
  /controllers
    authController.js
    chatController.js
    teamController.js
    playerController.js
    matchController.js
    trainingController.js
    tacticsController.js
    videoController.js
  /models
    User.js
    Team.js
    Player.js
    Match.js
    TrainingSession.js
    Observation.js
    Message.js
    Video.js
    Tactic.js
  /routes
    auth.js
    chat.js
    teams.js
    players.js
    matches.js
    training.js
    tactics.js
    videos.js
  /middleware
    auth.js
    roleCheck.js
    rateLimit.js
    errorHandler.js
  /services
    claudeService.js
    emailService.js
    videoService.js
    storageService.js
  /utils
    prompts.js
    helpers.js
  /config
    database.js
    claude.js
  index.js
```

### Database Schema (PostgreSQL)

**Users**
- id, email, password_hash, name, role, team_id, parent_user_id, created_at

**Teams**
- id, name, age_group, formation, game_model, subscription_tier, created_at

**Players**
- id, team_id, name, dob, positions, physical_attributes, technical_skills, tactical_understanding, mental_traits, parent_contact, created_at

**Observations**
- id, player_id, observer_id, type, content, context, match_id, created_at

**Matches**
- id, team_id, opponent, date, location, result, formation_used, notes, veo_link, video_url, created_at

**Training Sessions**
- id, team_id, date, duration, focus_areas, plan, notes, created_at

**Tactics**
- id, team_id, name, type, formation, positions, movements, notes, created_at

**Messages**
- id, team_id, user_id, role, content, context, created_at

**Videos**
- id, team_id, match_id, url, type, analysis, clips, created_at

**Invites**
- id, team_id, email, role, token, expires_at, accepted_at, created_at

### AI Integration (Claude API)

**System Prompts by Context:**

1. **General Assistant** - Broad football knowledge, team-aware
2. **Tactical Advisor** - Formation and game model specialist
3. **Training Designer** - Session planning expert
4. **Player Developer** - Individual development specialist
5. **Match Analyst** - Video and performance analysis
6. **Leadership Coach** - Team psychology and management

**Context Injection:**
- Current squad details
- Recent match results
- Team game model
- Upcoming fixtures
- Player observations

---

## Subscription Tiers

### Free Trial (14 days)
- 1 team, 18 players max
- Basic chat (20 messages/day)
- 3 training sessions/month
- No video analysis

### Grassroots (£9.99/month)
- 1 team, 25 players
- Unlimited chat
- Unlimited training sessions
- 5 video analyses/month
- Player development profiles

### Academy (£24.99/month)
- 3 teams, unlimited players
- All Grassroots features
- Unlimited video analysis
- Advanced tactical tools
- Priority support

### Club (£99.99/month)
- Unlimited teams
- All Academy features
- Custom branding
- API access
- Dedicated support

---

## Railway Deployment

### Services

1. **Web** (React frontend)
   - Build: `npm run build`
   - Static serving via nginx or serve

2. **API** (Node.js backend)
   - Start: `npm start`
   - Environment variables for secrets

3. **PostgreSQL** (Database)
   - Railway managed PostgreSQL
   - Automatic backups

4. **Redis** (Optional - caching/sessions)
   - For chat message caching
   - Session storage

### Environment Variables

```
DATABASE_URL=postgresql://...
ANTHROPIC_API_KEY=sk-ant-...
JWT_SECRET=your-secret
EMAIL_API_KEY=...
STORAGE_BUCKET=...
FRONTEND_URL=https://your-app.railway.app
```

---

## Development Phases

### Phase 1: Foundation (Week 1-2)
- [x] Project structure
- [ ] Authentication system
- [ ] Basic database schema
- [ ] Team creation flow
- [ ] Simple chat interface

### Phase 2: Core AI (Week 2-3)
- [ ] Claude integration
- [ ] Context injection system
- [ ] System prompts
- [ ] Chat memory/history

### Phase 3: Player Management (Week 3-4)
- [ ] Player CRUD
- [ ] Observation logging
- [ ] Profile views
- [ ] Basic IDP generation

### Phase 4: Tactical Tools (Week 4-5)
- [ ] Formation builder
- [ ] Game model editor
- [ ] Playbook storage
- [ ] Pitch visualisation

### Phase 5: Training & Matches (Week 5-6)
- [ ] Training session generator
- [ ] Match prep workflow
- [ ] Match logging
- [ ] Basic reports

### Phase 6: Video Analysis (Week 6-7)
- [ ] Veo link embedding
- [ ] Video upload
- [ ] AI analysis integration
- [ ] Clip timestamping

### Phase 7: Lounges & Comms (Week 7-8)
- [ ] Coach dashboard
- [ ] Player dashboard
- [ ] Content feed
- [ ] Email notifications

### Phase 8: Subscriptions & Polish (Week 8-9)
- [ ] Stripe integration
- [ ] Subscription management
- [ ] UI polish
- [ ] Performance optimisation

### Phase 9: Testing & Launch (Week 9-10)
- [ ] User testing
- [ ] Bug fixes
- [ ] Documentation
- [ ] Production deployment

---

## Key Design Decisions

### UI/UX

**Aesthetic:** Clean, professional, sports-focused
- Primary colour: Deep navy blue (#0F172A)
- Accent colour: Vibrant green (#22C55E) - grass/pitch association
- Secondary accent: Warm orange (#F97316) - energy/action
- Typography: Modern sans-serif (Outfit for headings, Inter for body)
- Pitch visualisations with actual grass texture
- Player cards with photo placeholders
- Mobile-first responsive design

**Navigation:**
- Sidebar for desktop
- Bottom navigation for mobile
- Quick actions floating button
- Chat accessible from all pages

### Data Privacy

- GDPR compliant
- Parental consent for U18 data
- Data export capability
- Right to deletion
- Encrypted storage
- No data sharing with third parties

### AI Guardrails

- Age-appropriate responses
- No injury diagnosis
- Defer to medical professionals
- Positive and developmental focus
- Inclusive language
- FA safeguarding awareness

---

## API Endpoints

### Authentication
- POST /api/auth/register
- POST /api/auth/login
- POST /api/auth/magic-link
- POST /api/auth/invite
- GET /api/auth/verify/:token
- POST /api/auth/logout

### Teams
- GET /api/teams/:id
- PUT /api/teams/:id
- GET /api/teams/:id/members
- POST /api/teams/:id/invite

### Players
- GET /api/players
- POST /api/players
- GET /api/players/:id
- PUT /api/players/:id
- DELETE /api/players/:id
- GET /api/players/:id/observations
- POST /api/players/:id/observations
- GET /api/players/:id/idp

### Matches
- GET /api/matches
- POST /api/matches
- GET /api/matches/:id
- PUT /api/matches/:id
- GET /api/matches/:id/prep
- GET /api/matches/:id/report

### Training
- GET /api/training
- POST /api/training
- GET /api/training/:id
- PUT /api/training/:id
- POST /api/training/generate

### Tactics
- GET /api/tactics
- POST /api/tactics
- GET /api/tactics/:id
- PUT /api/tactics/:id
- GET /api/tactics/game-model

### Chat
- GET /api/chat/history
- POST /api/chat/message
- POST /api/chat/context

### Videos
- GET /api/videos
- POST /api/videos
- GET /api/videos/:id
- POST /api/videos/:id/analyse
- GET /api/videos/:id/clips

---

## Next Steps

1. Review this brief and confirm scope
2. Set up Railway project
3. Initialise Git repository
4. Begin Phase 1 implementation

---

*Document created: January 2026*
*Author: Claude (AI Assistant)*
*For: John Sears / MoonBoots Consultancy*
