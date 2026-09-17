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

async function post(path, body, { expect = 201, form = false, validate, label: customLabel } = {}) {
  const label = customLabel || `POST ${path}`
  try {
    const res = await fetch(`${BASE}/api${path}`, {
      method: 'POST',
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
}

await pool.end()
const failed = results.filter((r) => !r.ok).length
if (failed > 0) {
  console.error(`\n${failed}/${results.length} smoke check(s) failed`)
  process.exit(1)
}
console.log(`\nAll ${results.length} smoke checks passed`)
