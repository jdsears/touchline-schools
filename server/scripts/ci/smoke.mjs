// CI API smoke: sign in as the demo Head of PE and walk the endpoints a real
// demo session touches. Every check here corresponds to a page a prospect
// opens; several encode regressions that previously shipped:
//   - pupil observations 500 masked as "Observations (0)"      (#53)
//   - HoD denied access to teams they don't personally coach   (#55)
//   - department-scope chat crashing on uuid "null"            (#56)
//   - /teams/mine/sessions selecting renamed columns           (#57)
//
// Usage: DATABASE_URL=... SMOKE_BASE_URL=http://127.0.0.1:3555 node scripts/ci/smoke.mjs
import pool from '../../config/database.js'

const BASE = process.env.SMOKE_BASE_URL || 'http://127.0.0.1:3555'
const results = []
let token = null

function record(label, ok, detail = '') {
  results.push({ label, ok, detail })
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${ok || !detail ? '' : `\n      ${detail}`}`)
}

async function get(path, { expect = 200, validate } = {}) {
  const label = `GET ${path}`
  try {
    const res = await fetch(`${BASE}/api${path}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    const text = await res.text()
    let body = null
    try { body = JSON.parse(text) } catch { /* non-JSON */ }
    if (res.status !== expect) {
      record(label, false, `status ${res.status}, body: ${text.slice(0, 200)}`)
      return null
    }
    if (validate) {
      const problem = validate(body)
      if (problem) {
        record(label, false, problem)
        return body
      }
    }
    record(label, true)
    return body
  } catch (e) {
    record(label, false, e.message)
    return null
  }
}

async function send(method, path, body, { expect, form = false, validate, label: customLabel } = {}) {
  const label = customLabel || `${method} ${path}`
  try {
    const res = await fetch(`${BASE}/api${path}`, {
      method,
      headers: form
        ? { Authorization: `Bearer ${token}` }
        : { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: form ? body : JSON.stringify(body),
    })
    const text = await res.text()
    let parsed = null
    try { parsed = JSON.parse(text) } catch { /* non-JSON */ }
    if (res.status !== expect) {
      record(label, false, `status ${res.status}, body: ${text.slice(0, 200)}`)
      return null
    }
    if (validate) {
      const problem = validate(parsed)
      if (problem) {
        record(label, false, problem)
        return parsed
      }
    }
    record(label, true)
    return parsed
  } catch (e) {
    record(label, false, e.message)
    return null
  }
}

const post = (path, body, opts = {}) => send('POST', path, body, { expect: 201, ...opts })
const patch = (path, body, opts = {}) => send('PATCH', path, body, { expect: 200, ...opts })

// Binary download: must answer 200 with a PDF body.
async function getPdf(path, { minBytes = 2000, label: customLabel } = {}) {
  const label = customLabel || `GET ${path} (pdf)`
  try {
    const res = await fetch(`${BASE}/api${path}`, { headers: { Authorization: `Bearer ${token}` } })
    const buf = Buffer.from(await res.arrayBuffer())
    const type = res.headers.get('content-type') || ''
    const ok = res.status === 200 && type.includes('application/pdf') && buf.subarray(0, 5).toString() === '%PDF-' && buf.length >= minBytes
    record(label, ok, `status ${res.status}, type ${type}, ${buf.length} bytes${ok ? '' : `, body: ${buf.subarray(0, 120).toString()}`}`)
    return ok
  } catch (e) {
    record(label, false, e.message)
    return false
  }
}

// ── Sign in as the demo HoD ──────────────────────────────────────────
try {
  const res = await fetch(`${BASE}/api/auth/demo-login`, { method: 'POST' })
  const body = await res.json()
  token = body.token
  record('POST /auth/demo-login', res.status === 200 && !!token,
    `status ${res.status}: ${JSON.stringify(body).slice(0, 150)}`)
} catch (e) {
  record('POST /auth/demo-login', false, e.message)
}

if (token) {
  const isArray = (b) => (Array.isArray(b) ? null : 'expected an array')
  const nonEmptyArray = (b) => (Array.isArray(b) && b.length > 0 ? null : `expected non-empty array, got ${JSON.stringify(b).slice(0, 100)}`)

  await get('/auth/me', { validate: (b) => (b?.user?.email?.includes('.demo@') && b?.user?.is_demo_user === true ? null : 'expected demo user payload') })
  await get('/hod/check', { validate: (b) => (b?.isHoD === true ? null : `expected isHoD true, got ${JSON.stringify(b).slice(0, 100)}`) })
  await get('/hod/school-overview/weekly-summary', {
    validate: (b) => (b?.trends && Number.isFinite(b.trends.unique_pupils?.delta)
      ? null
      : `expected trends with numeric deltas, got ${JSON.stringify(b?.trends).slice(0, 120)}`),
  })

  // Digest preview renders the full HoD email without sending anything
  try {
    const res = await fetch(`${BASE}/api/hod/school-overview/digest-preview`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    const html = await res.text()
    record('GET /hod/school-overview/digest-preview', res.status === 200 && html.includes('Ashworth Park') && html.includes('department'),
      `status ${res.status}, length ${html.length}`)
  } catch (e) {
    record('GET /hod/school-overview/digest-preview', false, e.message)
  }
  await get('/notifications', { validate: isArray })
  await get('/teacher-dashboard/development', { validate: nonEmptyArray })
  await get('/teams/mine/fixtures', { validate: isArray })
  await get('/teams/mine/sessions', { validate: isArray }) // regression #57
  await get('/chat/department/history', { validate: nonEmptyArray }) // regression #56 + seeded Coach exchange
  await get('/voice-observations', { validate: nonEmptyArray }) // seeded voice recordings for the mic badge
  await get('/pupils/me/schedule', { validate: isArray }) // pupil calendar endpoint responds for staff too

  // ── Dashboard overview: every section reads live data (#67) ─────────
  // The overview used to render a hardcoded "Confirm squad · vs Whitfield
  // Grove" row and a static briefing; these feeds are what replaced them.
  await get('/teacher-dashboard/today', {
    validate: (b) => (['classes', 'lessons', 'training', 'fixtures'].every((k) => Array.isArray(b?.[k])) && /^\d{4}-\d{2}-\d{2}$/.test(b?.date || '')
      ? null
      : `expected date + four arrays, got ${JSON.stringify(b).slice(0, 120)}`),
  })
  const ROLES = new Set(['schoolAdmin', 'hod', 'teacherCurriculum', 'teacherExtraCurricular'])
  const URGENCIES = new Set(['high', 'medium', 'low'])
  await get('/teacher-dashboard/attention', {
    validate: (b) => {
      if (!Array.isArray(b?.items) || b.items.length === 0) return `expected non-empty items, got ${JSON.stringify(b).slice(0, 120)}`
      const bad = b.items.find((it) => !it.verb || !it.subject || !String(it.href || '').startsWith('/') || !ROLES.has(it.role) || !URGENCIES.has(it.urgency))
      return bad ? `malformed item ${JSON.stringify(bad).slice(0, 160)}` : null
    },
  })
  await get('/teacher-dashboard/my-classes', { validate: isArray })
  await get('/teacher-dashboard/my-teams', {
    validate: (b) => {
      if (!Array.isArray(b) || b.length === 0) return 'expected non-empty array'
      const withNext = b.find((t) => t.next_fixture)
      if (withNext && (!withNext.next_fixture.id || typeof withNext.next_fixture.squad_size === 'undefined')) {
        return `next_fixture missing id/squad_size: ${JSON.stringify(withNext.next_fixture).slice(0, 120)}`
      }
      return null
    },
  })
  await get('/hod/school-overview/attention', {
    validate: (b) => (Array.isArray(b?.reporting_windows)
      && b.reporting_windows.every((w) => Number.isInteger(w.submitted) && Number.isInteger(w.published) && Number.isInteger(w.total))
      ? null
      : `expected reporting_windows with integer counts, got ${JSON.stringify(b?.reporting_windows).slice(0, 160)}`),
  })

  // Top-bar feeds for a Head of PE. consent/venues/concussion resolved the
  // school through a nonexistent school_members.status column (500 on every
  // call); voice safeguarding accepted only owner/admin (silent 403 for HoDs).
  // School Overview "today" rows link to the team / fixture / class, so each
  // needs its id (the training rows previously carried none).
  await get('/hod/school-overview/today', {
    validate: (b) => {
      if (!['fixtures', 'training', 'lessons'].every((k) => Array.isArray(b?.[k]))) return `expected three arrays, got ${JSON.stringify(b).slice(0, 120)}`
      const badTraining = b.training.find((t) => !t.team_id)
      const badFixture = b.fixtures.find((f) => !f.id || !f.team_id)
      return badTraining || badFixture ? `row missing ids: ${JSON.stringify(badTraining || badFixture).slice(0, 120)}` : null
    },
  })
  await get('/consent/expiring?days=30', { validate: isArray })
  await get('/voice-safeguarding/flagged', { validate: isArray })
  await get('/venues', { validate: isArray })

  // School-area membership lookups (my schools, role gate) read
  // school_members.status, which fresh databases lacked until Phase 30; the
  // incident log additionally admits HoD/DSL roles, not just owner/admin.
  const mySchools = await get('/schools', { validate: nonEmptyArray })
  const demoSchoolId = mySchools?.find((s) => s.slug === 'ashworth-park-demo')?.id
  if (demoSchoolId) {
    // Rows must carry the date/type the log renders (it showed "Invalid Date"
    // and a blank type when only incident_date/category came back).
    await get(`/school-safeguarding/${demoSchoolId}/safeguarding/incidents`, {
      validate: (b) => (Array.isArray(b) && b.every((i) => i.date && i.type) ? null : `expected date+type on every incident, got ${JSON.stringify(b?.[0]).slice(0, 120)}`),
    })
  } else {
    record('demo school in /schools', false, `expected ashworth-park-demo in ${JSON.stringify(mySchools).slice(0, 120)}`)
  }

  const myTeams = await get('/teams/mine', { validate: nonEmptyArray })
  if (myTeams?.[0]?.id) {
    const teamId = myTeams[0].id
    await get(`/teams/${teamId}`)
    await get(`/teams/${teamId}/pupils`, { validate: nonEmptyArray })
    await get(`/teams/${teamId}/matches`, { validate: isArray })
  }

  // Regression #55: a HoD can open a team they do not own or coach
  const other = await pool.query(`
    SELECT t.id FROM teams t
    JOIN schools s ON s.id = t.school_id AND s.slug = 'ashworth-park-demo'
    WHERE t.owner_id <> (SELECT id FROM users WHERE LOWER(email) = 'j.okonkwo.demo@ashworthpark.norfolk.sch.uk')
    LIMIT 1`)
  if (other.rows[0]) {
    await get(`/teams/${other.rows[0].id}`)
    await get(`/teams/${other.rows[0].id}/pupils`, { validate: isArray })
  } else {
    record('non-owned team lookup', false, 'no team owned by another member found')
  }

  // Regression #53 + profile stack: the flagship persona reads as lived-in
  const toby = await pool.query(`SELECT id FROM pupils WHERE name = 'Toby Marsh' LIMIT 1`)
  if (toby.rows[0]) {
    const pid = toby.rows[0].id
    await get(`/pupils/${pid}/observations`, { validate: nonEmptyArray }) // regression #53
    await get(`/pupil-management/${pid}/profile`, {
      validate: (b) => {
        const gcse = (b?.classes || []).filter((c) => c.name === '11 GCSE PE')
        if (gcse.length !== 1) return `expected exactly one '11 GCSE PE' class, got ${gcse.length}`
        if ((b?.assessments || []).length < 1) return 'expected at least one assessment'
        return null
      },
    })
    await get(`/pupil-profile/${pid}`)
    await get(`/pupil-profile/${pid}/idp-goals`, { validate: nonEmptyArray })
    await get(`/pupil-profile/${pid}/achievements`, { validate: nonEmptyArray })

    // Observations → IDP: goals are written through the API (they used to
    // be seed-only), carry their evidence, and can be closed or removed.
    const goalStamp = Date.now().toString(36)
    const obsRow = await pool.query(`SELECT id FROM observations WHERE pupil_id = $1 ORDER BY created_at DESC LIMIT 1`, [pid])
    const evidenceId = obsRow.rows[0]?.id
    const created = await post(`/pupil-profile/${pid}/idp-goals`, {
      goal_description: `Smoke goal ${goalStamp}`,
      success_criteria: 'Three consecutive sessions without prompting',
      sport_key: 'football',
      target_weeks: 6,
      source_observation_ids: evidenceId ? [evidenceId] : [],
      origin: 'teacher',
    }, {
      validate: (b) => (b?.id && b?.status === 'in_progress' && Array.isArray(b?.evidence) && (!evidenceId || b.evidence.length === 1)
        ? null
        : `unexpected goal payload ${JSON.stringify(b).slice(0, 160)}`),
    })
    if (created?.id) {
      await patch(`/pupil-profile/${pid}/idp-goals/${created.id}`, { status: 'achieved', teacher_assessment_notes: 'smoke note' }, {
        label: `PATCH /pupil-profile/${pid}/idp-goals/:goalId (achieve)`,
        validate: (b) => (b?.status === 'achieved' && b?.teacher_assessment_notes === 'smoke note' ? null : 'status/note not updated'),
      })
      await get(`/pupil-profile/${pid}/idp-goals`, {
        validate: (b) => (Array.isArray(b) && b.some((g) => g.id === created.id) ? null : 'created goal missing from list'),
      })
      await send('DELETE', `/pupil-profile/${pid}/idp-goals/${created.id}`, undefined, { expect: 204, label: `DELETE /pupil-profile/${pid}/idp-goals/:goalId` })
    }
    // Parents' evening pack: one PDF per pupil (reports, grades, plan, awards, participation)
    await getPdf(`/pupil-profile/${pid}/parents-evening-pack`)
    // Reporting window batch PDF and a single report PDF, scoped to the caller's school
    const openWindow = await pool.query(`
      SELECT rw.id FROM reporting_windows rw JOIN schools s ON s.id = rw.school_id
      WHERE s.slug = 'ashworth-park-demo' AND EXISTS (SELECT 1 FROM pupil_reports pr WHERE pr.reporting_window_id = rw.id)
      ORDER BY rw.closes_at DESC LIMIT 1`)
    if (openWindow.rows[0]) {
      const wid = openWindow.rows[0].id
      await getPdf(`/reporting/windows/${wid}/pdf`, { minBytes: 4000 })
      const oneReport = await pool.query(`SELECT id FROM pupil_reports WHERE reporting_window_id = $1 LIMIT 1`, [wid])
      if (oneReport.rows[0]) await getPdf(`/reporting/reports/${oneReport.rows[0].id}/pdf`)
    } else {
      record('reporting window with reports', false, 'no demo window carries reports')
    }
    // Suggestions need a live model: 200 with an array when a key is configured, a clean 503 otherwise.
    try {
      const res = await fetch(`${BASE}/api/pupil-profile/${pid}/idp-goals/suggest`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } })
      const body = await res.json().catch(() => null)
      const ok = (res.status === 200 && Array.isArray(body?.suggestions)) || (res.status === 503 && body?.code === 'AI_NOT_CONFIGURED')
      record('POST idp-goals/suggest (200 with key, 503 AI_NOT_CONFIGURED without)', ok, `status ${res.status}: ${JSON.stringify(body).slice(0, 150)}`)
    } catch (e) {
      record('POST idp-goals/suggest', false, e.message)
    }
  } else {
    record('Toby Marsh persona lookup', false, 'persona pupil missing from seed')
  }

  // ── Onboarding surface: Add Pupil, CSV import, teacher invites ─────
  // Add Pupil regression: the insert used to omit the NOT NULL name column,
  // so the button failed on every deployment.
  const stamp = Date.now().toString(36)
  await post('/pupil-management', { first_name: 'Smoke', last_name: `Added${stamp}`, year_group: 8 })

  const schoolRow = await pool.query(`SELECT id FROM schools WHERE slug = 'ashworth-park-demo'`)
  const schoolId = schoolRow.rows[0]?.id
  if (schoolId) {
    const csvOf = (rows) => {
      const fd = new FormData()
      fd.append('school_id', schoolId)
      fd.append('file', new Blob([`first_name,last_name,year_group,house\n${rows.join('\n')}`], { type: 'text/csv' }), 'pupils.csv')
      return fd
    }

    // Unique rows import cleanly...
    await post('/onboarding/pupils/csv', csvOf([`Smokey,Import${stamp},7,Elm`, `Smokier,Import${stamp},9,Oak`]), {
      form: true,
      label: 'POST /onboarding/pupils/csv (new rows)',
      validate: (b) => (b?.created === 2 ? null : `expected created 2, got ${JSON.stringify(b).slice(0, 150)}`),
    })
    // ...and re-importing the same export skips as duplicates, never doubles the roster
    const fixed = ['Dedupe,Check,8,Elm', 'Dedupe,Again,8,Oak']
    const first = await post('/onboarding/pupils/csv', csvOf(fixed), {
      form: true,
      label: 'POST /onboarding/pupils/csv (fixed pair)',
      validate: (b) => ((b?.created ?? 0) + (b?.duplicates ?? 0) === 2 ? null : `expected created+duplicates 2, got ${JSON.stringify(b).slice(0, 150)}`),
    })
    if (first) {
      await post('/onboarding/pupils/csv', csvOf(fixed), {
        form: true,
        label: 'POST /onboarding/pupils/csv (re-import dedupes)',
        validate: (b) => (b?.created === 0 && b?.duplicates === 2 ? null : `expected 0 created / 2 duplicates, got ${JSON.stringify(b).slice(0, 150)}`),
      })
    }

    // Teacher invite: creates the account, membership, and a working
    // 7-day magic sign-in link (previously inserted into a nonexistent
    // users.password column, so this step had never once succeeded).
    const inviteEmail = `smoke.invite.${stamp}@ashworthpark.norfolk.sch.uk`
    const invite = await post('/onboarding/teachers', {
      school_id: schoolId,
      teachers: [{ name: 'Smoke Invitee', email: inviteEmail, role: 'coach' }],
    }, {
      validate: (b) => (b?.invited === 1 && b?.teachers?.[0]?.invite_link ? null : `expected 1 invite with link, got ${JSON.stringify(b).slice(0, 150)}`),
    })
    const inviteToken = invite?.teachers?.[0]?.invite_link?.split('/magic/')[1]
    if (inviteToken) {
      try {
        const res = await fetch(`${BASE}/api/auth/magic-link/verify`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token: inviteToken }),
        })
        const body = await res.json()
        record('invite magic link signs the teacher in', res.status === 200 && !!body.token,
          `status ${res.status}: ${JSON.stringify(body).slice(0, 150)}`)
      } catch (e) {
        record('invite magic link signs the teacher in', false, e.message)
      }
    } else {
      record('invite magic link signs the teacher in', false, 'no invite link returned')
    }
  } else {
    record('onboarding smoke (school lookup)', false, 'demo school not found')
  }

  // ── Multi-school: the switcher header and the trust overview (#74) ───
  // The demo Head of PE creates a second school (becoming its owner), so
  // they now oversee two; the client's X-School-Id header must move every
  // HoD-scoped request to the chosen school, and only to one of theirs.
  const trustSchool = await post('/schools', { name: `Smoke Trust School ${stamp}`, dpa_accepted: true }, {
    validate: (b) => (b?.id ? null : `no school id in ${JSON.stringify(b).slice(0, 120)}`),
  })
  if (trustSchool?.id) {
    await get('/hod/check', {
      validate: (b) => (Array.isArray(b?.schools) && b.schools.length >= 2 && b.schools.some((s) => s.id === trustSchool.id) ? null : `expected the new school among ${JSON.stringify(b?.schools).slice(0, 120)}`),
    })
    await get('/hod/schools', {
      validate: (b) => (Array.isArray(b?.schools) && b.schools.some((s) => s.id === trustSchool.id) && b.schools.every((s) => Number.isInteger(s.pupils) && Number.isInteger(s.attention))
        ? null : `trust overview missing the new school or its counts: ${JSON.stringify(b?.schools).slice(0, 160)}`),
    })
    const withSchool = (path, id) => fetch(`${BASE}/api${path}`, { headers: { Authorization: `Bearer ${token}`, 'X-School-Id': id } })
    try {
      const switched = await (await withSchool('/hod/check', trustSchool.id)).json()
      record('X-School-Id switches the working school', switched?.school_id === trustSchool.id && switched?.role === 'owner', JSON.stringify(switched).slice(0, 150))
      const attention = await withSchool('/teacher-dashboard/attention', trustSchool.id)
      record('attention queue follows the active school', attention.status === 200, `status ${attention.status}`)
      const branding = await (await withSchool('/schools/my-branding', trustSchool.id)).json()
      record('branding follows the active school', branding?.branding?.schoolId === trustSchool.id, JSON.stringify(branding).slice(0, 120))
      const forged = await (await withSchool('/hod/check', '00000000-0000-0000-0000-000000000000')).json()
      record('an X-School-Id the user does not belong to is ignored', forged?.school_id && forged.school_id !== '00000000-0000-0000-0000-000000000000', JSON.stringify(forged).slice(0, 120))
    } catch (e) {
      record('school switch', false, e.message)
    }
    await pool.query('DELETE FROM schools WHERE id = $1', [trustSchool.id])
  }

  // ── Offline voice notes: idempotent upload (#73) ─────────────────────
  // Queued recordings are retried by the app and the service worker with
  // the same client id; the second attempt must return the first record.
  {
    const clientUploadId = `smoke${stamp}${Math.random().toString(36).slice(2, 10)}`
    const audioForm = () => {
      const fd = new FormData()
      fd.append('audio', new Blob([Buffer.from('1a45dfa3000000000000', 'hex')], { type: 'audio/webm' }), 'observation.webm')
      fd.append('context_type', 'general')
      fd.append('client_upload_id', clientUploadId)
      return fd
    }
    const first = await post('/voice-observations/upload', audioForm(), {
      form: true, label: 'POST /voice-observations/upload (with client_upload_id)',
      validate: (b) => (b?.audio_source_id && b?.status === 'processing' ? null : `unexpected ${JSON.stringify(b).slice(0, 120)}`),
    })
    if (first?.audio_source_id) {
      await post('/voice-observations/upload', audioForm(), {
        form: true, expect: 200, label: 'POST /voice-observations/upload (retry is deduplicated)',
        validate: (b) => (b?.audio_source_id === first.audio_source_id && b?.status === 'duplicate' ? null : `expected duplicate of ${first.audio_source_id}, got ${JSON.stringify(b).slice(0, 120)}`),
      })
      await pool.query(`DELETE FROM observations WHERE audio_source_id = $1`, [first.audio_source_id]).catch(() => {})
      await pool.query(`DELETE FROM audio_sources WHERE id = $1`, [first.audio_source_id])
    }
  }

  // ── Parent consent self-serve (#72) ──────────────────────────────────
  // Staff create a personal link; the parent answers without an account;
  // answers land in pupil_consents; the link then refuses reuse.
  const consentPupil = await pool.query(`SELECT id FROM pupils WHERE name = 'Toby Marsh' LIMIT 1`)
  const consentTypes = await pool.query(`
    SELECT ct.id FROM consent_types ct JOIN schools s ON s.id = ct.school_id
    WHERE s.slug = 'ashworth-park-demo' ORDER BY ct.display_order LIMIT 2`)
  if (consentPupil.rows[0] && consentTypes.rows.length === 2) {
    const cpid = consentPupil.rows[0].id
    const typeIds = consentTypes.rows.map((r) => r.id)
    const parentEmail = `smoke.parent.${stamp}@example.com`
    const before = await pool.query(`SELECT parent_email FROM pupils WHERE id = $1`, [cpid])
    const createdReq = await post('/consent/requests', {
      pupil_ids: [cpid], consent_type_ids: typeIds, parent_emails: { [cpid]: parentEmail }, message: 'Smoke test',
    }, {
      validate: (b) => (b?.created?.length === 1 && b.created[0].link?.includes('/consent/') && b?.skipped?.length === 0
        ? null
        : `unexpected ${JSON.stringify(b).slice(0, 160)}`),
    })
    const consentToken = createdReq?.created?.[0]?.link?.split('/consent/')[1]
    if (consentToken) {
      // No Authorization header: the parent has no account.
      try {
        const res = await fetch(`${BASE}/api/consent/public/${consentToken}`)
        const body = await res.json()
        record('GET /consent/public/:token (no auth)', res.status === 200 && body?.state === 'open' && body?.items?.length === 2 && body?.pupil?.first_name,
          `status ${res.status}: ${JSON.stringify(body).slice(0, 150)}`)
        const decisions = { [typeIds[0]]: 'granted', [typeIds[1]]: 'refused' }
        const submit = await fetch(`${BASE}/api/consent/public/${consentToken}`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ decisions, responder_name: 'Smoke Parent', confirmed: true }),
        })
        const submitted = await submit.json()
        record('POST /consent/public/:token (answers recorded)', submit.status === 200 && submitted?.granted === 1 && submitted?.refused === 1,
          `status ${submit.status}: ${JSON.stringify(submitted).slice(0, 150)}`)
        const again = await fetch(`${BASE}/api/consent/public/${consentToken}`)
        record('GET /consent/public/:token (completed link is closed)', again.status === 410, `status ${again.status}`)
        const stored = await pool.query(
          `SELECT status, parent_signature_text FROM pupil_consents WHERE pupil_id = $1 AND consent_type_id = ANY($2::uuid[]) ORDER BY status`,
          [cpid, typeIds]
        )
        record('pupil_consents reflect the parent answers',
          stored.rows.length === 2 && stored.rows.some((r) => r.status === 'granted') && stored.rows.some((r) => r.status === 'refused') && stored.rows.every((r) => r.parent_signature_text === 'Smoke Parent'),
          JSON.stringify(stored.rows))
      } catch (e) {
        record('parent consent public flow', false, e.message)
      }
      await get('/consent/requests', { validate: (b) => (Array.isArray(b) && b.some((r) => r.status === 'completed' && r.parent_email === parentEmail) ? null : 'completed request missing from list') })
      // Leave the demo as we found it.
      await pool.query(`DELETE FROM pupil_consents WHERE pupil_id = $1 AND consent_type_id = ANY($2::uuid[]) AND parent_signature_text = 'Smoke Parent'`, [cpid, typeIds])
      await pool.query(`DELETE FROM consent_requests WHERE parent_email = $1`, [parentEmail])
      await pool.query(`UPDATE pupils SET parent_email = $1 WHERE id = $2`, [before.rows[0]?.parent_email || null, cpid])
    }
  } else {
    record('parent consent fixtures', false, 'demo pupil or consent types missing')
  }

  // ── Match prep and result round-trip (#67) ───────────────────────────
  // The V15 prep page saved notes through PUT (into team_notes) and read
  // them back from prep_notes, so nothing typed there ever reappeared; the
  // overview had no way to record a result at all. Both now go via PATCH.
  const demoMatch = await pool.query(`
    SELECT m.id FROM matches m
    JOIN teams t ON t.id = m.team_id
    JOIN users u ON u.id = t.owner_id AND LOWER(u.email) = 'j.okonkwo.demo@ashworthpark.norfolk.sch.uk'
    ORDER BY (m.score_for IS NULL AND COALESCE(m.date, m.match_date) < CURRENT_DATE) DESC, COALESCE(m.date, m.match_date) DESC
    LIMIT 1`)
  if (demoMatch.rows[0]) {
    const mid = demoMatch.rows[0].id
    const before = await get(`/matches/${mid}`)
    const notes = JSON.stringify({ opposition: `smoke ${stamp}`, setPieces: '', talkingPoints: '' })
    await patch(`/matches/${mid}`, { prep_notes: notes }, {
      label: `PATCH /matches/${mid} (prep notes)`,
      validate: (b) => (b?.prep_notes === notes ? null : `prep_notes did not round-trip: ${JSON.stringify(b?.prep_notes).slice(0, 100)}`),
    })
    await patch(`/matches/${mid}`, { formations: { format: '11v11', primary: { presetId: 'smoke', assignment: { s1: 'p1' } }, backup: null } }, {
      label: `PATCH /matches/${mid} (formation)`,
      validate: (b) => (b?.formations?.primary?.assignment?.s1 === 'p1' ? null : `formations did not round-trip: ${JSON.stringify(b?.formations).slice(0, 120)}`),
    })
    await patch(`/matches/${mid}`, { prep_completed: true }, {
      label: `PATCH /matches/${mid} (prep complete)`,
      validate: (b) => (b?.prep_completed_at ? null : 'prep_completed_at not set'),
    })
    await patch(`/matches/${mid}`, { prep_completed: false }, {
      label: `PATCH /matches/${mid} (prep reopened)`,
      validate: (b) => (b?.prep_completed_at === null ? null : 'prep_completed_at not cleared'),
    })
    await patch(`/matches/${mid}`, { score_for: 'three', score_against: 1 }, { expect: 400, label: `PATCH /matches/${mid} (rejects non-numeric score)` })
    await patch(`/matches/${mid}`, { score_for: 2, score_against: 1 }, {
      label: `PATCH /matches/${mid} (record result)`,
      validate: (b) => (b?.score_for === 2 && b?.score_against === 1 ? null : `score did not round-trip: ${b?.score_for}-${b?.score_against}`),
    })
    // Sport-specific breakdowns (innings, events, rubbers) live in result_data.
    await patch(`/matches/${mid}`, { score_for: 120, score_against: 98, result_data: { for: { runs: 120, wickets: 4, overs: '20' }, against: { runs: 98, wickets: 9, overs: '18.3' } } }, {
      label: `PATCH /matches/${mid} (result breakdown)`,
      validate: (b) => (b?.result_data?.for?.runs === 120 && b?.result_data?.against?.wickets === 9 ? null : `result_data did not round-trip: ${JSON.stringify(b?.result_data).slice(0, 120)}`),
    })
    await patch(`/matches/${mid}`, { result_data: ['not', 'an', 'object'] }, { expect: 400, label: `PATCH /matches/${mid} (rejects non-object result_data)` })
    // Put the fixture back as we found it so the demo data stays untouched.
    await patch(`/matches/${mid}`, {
      score_for: before?.score_for ?? null,
      score_against: before?.score_against ?? null,
      result_data: before?.result_data ?? null,
      prep_notes: before?.prep_notes ?? null,
      formations: before?.formations ?? null,
    }, { label: `PATCH /matches/${mid} (restore)` })
  } else {
    record('demo match lookup', false, 'no match owned by the demo teacher')
  }
}

await pool.end()
const failed = results.filter((r) => !r.ok).length
if (failed > 0) {
  console.error(`\n${failed}/${results.length} smoke check(s) failed`)
  process.exit(1)
}
console.log(`\nAll ${results.length} smoke checks passed`)
