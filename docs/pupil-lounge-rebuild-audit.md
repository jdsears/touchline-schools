# Pupil Sports Lounge Rebuild Audit

**Date:** 2026-04-16
**Purpose:** Assess the existing Pupil Portal state before v1.8 rebuild.

---

## 1. Existing routes

All routes are nested under `/pupil` with `PupilLayout` as the parent (App.jsx lines 332-345):

| Route               | Component              | Status     |
|---------------------|------------------------|------------|
| `/pupil` (index)    | PupilSports            | Functional |
| `/pupil/week`       | PupilWeek              | Stub       |
| `/pupil/development`| PupilDevelopment       | Functional |
| `/pupil/training`   | PupilTraining          | Stub       |
| `/pupil/clips`      | PupilClipsPage         | Stub       |
| `/pupil/assistant`  | PupilAssistantPage     | Stub       |
| `/pupil/achievements`| PupilAchievements     | Stub       |

Route protection: `ProtectedRoute` with `allowedRoles={['player']}` (bypassed during impersonation via `fam_impersonating` localStorage key).

---

## 2. Existing components

**PupilLayout.jsx (212 lines)** - Desktop-first sidebar layout:
- 7-item left sidebar with icons (Home, Calendar, TrendingUp, Dumbbell, Video, Sparkles, Trophy)
- Responsive: mobile hamburger menu slides in; lg:fixed 64px sidebar
- School branding (logo, name, accent colour)
- Impersonation banner (amber, fixed top, with "Return to HoD" button)
- Logout button in sidebar footer

**PupilSports.jsx (116 lines)** - Functional:
- Calls `GET /api/pupils/me` via useEffect
- Shows sport gradient tiles (football, rugby, etc.) with team names
- Shows teaching group list below
- Loading skeleton state
- Empty state with "Welcome to your portal" fallback

**PupilDevelopment.jsx (147 lines)** - Functional:
- Calls `GET /api/pupils/me/development`
- Observation timeline with type-coloured cards (praise/concern/development/note)
- Sport filter pills (All, Football, Rugby)
- Relative timestamps via date-fns
- Loading skeleton state

**5 Stubs (24 lines each):**
- PupilWeek, PupilTraining, PupilClipsPage, PupilAssistantPage, PupilAchievements
- Each has a heading, description, and hardcoded empty state
- Zero data fetching, zero interactivity

---

## 3. Backend readiness

### Pupil self-service endpoints (server/routes/pupils.js)

| Endpoint                            | Method | Returns                                                    | Live |
|-------------------------------------|--------|-----------------------------------------------------------|------|
| `/pupils/me`                        | GET    | Pupil profile, sports, teams, teaching groups              | Yes  |
| `/pupils/me/development`            | GET    | Confirmed observations (50 most recent, newest first)      | Yes  |
| `/pupils/:id/zone`                  | GET    | Comprehensive: pupil, team, matches, training, obs, IDP, videos, docs, announcements, POTM, achievements | Yes |
| `/pupils/:id/availability/:matchId` | POST   | Upsert match RSVP (available/unavailable/maybe)            | Yes  |
| `/pupils/:id/training-availability/:sessionId` | POST | Upsert training RSVP                            | Yes  |
| `/pupils/:id/achievements`          | GET    | All teacher-awarded achievements                           | Yes  |
| `/pupils/:id/idp`                   | GET    | Latest development plan (goals, strengths, areas)          | Yes  |
| `/pupils/:id/observations`          | GET    | All observations for pupil (teacher-facing)                | Yes  |

**Key finding:** The `/pupils/:id/zone` endpoint is a comprehensive data aggregator that returns nearly everything the Sports Lounge will need in a single call. This is highly reusable.

### Other relevant endpoints

- `GET /api/lessons` - teacher's lesson plans (not pupil-scoped yet)
- `GET /api/assessments` - teacher-facing assessment routes exist
- `GET /api/teaching-groups` - group management (teacher-facing)
- Match, training, fixture routes are team-scoped, not pupil-scoped

---

## 4. Data model readiness

| Table                  | Pupil-relevant columns                                      | Ready |
|------------------------|-------------------------------------------------------------|-------|
| `pupils`               | year_group, house, dob, squad_number, positions (JSONB), attributes (JSONB), user_id, school_id | Yes |
| `observations`         | pupil_id, type, content, sport, context_type, review_state, created_at | Yes |
| `team_memberships`     | pupil_id, team_id, role, is_primary                         | Yes   |
| `teaching_group_pupils`| pupil_id, teaching_group_id                                 | Yes   |
| `matches`              | date, opponent, result, venue, kit info, player_of_match_id | Yes   |
| `match_availability`   | match_id, pupil_id, status (available/unavailable/maybe)    | Yes   |
| `training_sessions`    | date, time, location, focus_areas, plan, share_plan_with_players | Yes |
| `training_availability`| session_id, pupil_id, status, notes                         | Yes   |
| `lesson_plans`         | teaching_group_id, title, lesson_date, duration, activities | Yes   |
| `pupil_assessments`    | pupil_id, unit_id, criteria_id, grade, teacher_notes        | Yes   |
| `pupil_reports`        | pupil_id, overall_grade, effort_grade, comment, status      | Yes   |
| `development_plans`    | pupil_id, goals/strengths/areas_to_improve (JSONB), notes   | Yes   |
| `player_achievements`  | player_id, achievement_type, title, icon, earned_at, awarded_by | Yes |
| `sport_units`          | sport, unit_name, curriculum_area, term                     | Yes   |
| `assessment_criteria`  | criterion_name, key_stage, strand_id                        | Yes   |
| `curriculum_strands`   | strand_name, key_stage, description                         | Yes   |
| `notification_preferences` | user_id, fixture_reminders, assessment_deadlines, etc.  | Yes   |

### Missing from observations

No `visible_to_pupil` boolean column. Currently all confirmed observations are returned to the pupil self-service endpoint. The brief requires teacher feedback to obey visibility flags. Options:
1. Add `visible_to_pupil BOOLEAN DEFAULT true` column to observations
2. Filter by type (only show praise/development, hide concerns from pupil view)

**Recommendation:** Add the column. Some observations are genuinely internal-only.

### Missing from schedule

No unified "pupil schedule" view. Events come from three separate tables (matches, training_sessions, lesson_plans) and would need a union query or client-side merge. No existing endpoint aggregates this.

---

## 5. PWA readiness

| Asset                 | Status  | Notes                                           |
|-----------------------|---------|-------------------------------------------------|
| `manifest.json`       | Ready   | Standalone, correct theme colour (#0F1E3D), icons, screenshots |
| `sw.js`               | Ready   | Cache-first static, network-first fetch, push notification handler |
| `icon-192.png`        | Present | Maskable                                         |
| `icon-512.png`        | Present | Maskable                                         |
| `apple-touch-icon.png`| Present | 180x180                                          |
| `favicon.svg`         | Present | Vector                                           |
| Push registration     | Wired   | VAPID key fetch + subscription in AuthContext     |

**Start URL:** Currently `/` for all users. Needs conditional `/pupil-lounge` for pupil role.

**Install prompt:** No custom install prompt logic exists. Browser default only.

---

## 6. Auth context state

From `AuthContext.jsx` (223 lines):

```
user: { id, name, email, role, team_id, pupil_id, is_admin, hasFullAccess, subscriptionStatus }
loading: boolean
impersonating: string | null (persona name from localStorage)
```

**Not in context:** year_group, house, school_id. These come from the `/pupils/me` API call.

Impersonation is tracked via localStorage keys (`fam_impersonating`, `fam_original_token`). Start/end methods on context. ProtectedRoute bypasses role check when impersonating.

---

## 7. Salvage vs rebuild recommendation

**Recommendation: Full rebuild under `/pupil-lounge`.**

Reasons:
1. The existing layout (`PupilLayout.jsx`) is desktop-first with a sidebar. The brief demands mobile-first with a bottom tab bar. These are incompatible layouts.
2. 5 of 7 pages are empty stubs with no logic to preserve.
3. The 2 functional pages (PupilSports, PupilDevelopment) were built in the last commit. Their data-fetching patterns are useful reference but the presentation needs mobile-first redesign.
4. Route structure changes from `/pupil/*` to `/pupil-lounge/*` with different tab groupings.
5. The brief's 5-tab architecture (Today, Schedule, Sports, Progress, Me) does not map to the existing 7-item sidebar.

**What to reuse:**
- Backend endpoints: `/pupils/me`, `/pupils/me/development`, `/pupils/:id/zone` are all directly usable
- Data models: no schema changes needed (except adding `visible_to_pupil` to observations)
- PWA assets: manifest.json, sw.js, icons all carry forward
- Impersonation infrastructure: works as-is, just needs the banner in the new layout
- Sport emoji/gradient maps from PupilSports.jsx can be extracted to shared constants

**What to discard:**
- `PupilLayout.jsx` (sidebar layout)
- All 5 stub pages (no code of value)
- `PupilSports.jsx` and `PupilDevelopment.jsx` (logic reusable, presentation not)

---

## 8. Gaps to address during build

1. **Observation visibility flag** - add `visible_to_pupil` column
2. **Unified schedule endpoint** - union query across matches, training, lessons for a date range
3. **Pupil schedule data** - lesson_plans are per-teacher, not per-pupil; need to join via teaching_group_pupils
4. **Age mode** - year_group is on the pupil record, not in auth context; need a hook that fetches and caches it
5. **GCSE PE candidate flag** - no column exists on pupils; will need one for conditional portfolio display
6. **Motivational quotes library** - does not exist; needs creation as JSON file
7. **Install prompt tracking** - need localStorage counter for "show after 3 visits" logic
