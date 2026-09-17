import PDFDocument from 'pdfkit'

// Server-rendered PDFs for parents' evenings and report distribution.
// pdfkit draws with the built-in Helvetica family so nothing has to be
// installed on the host; school colours come from the schools row.

const NAVY = '#0F1E3D'
const GOLD = '#C9A961'
const INK = '#1B1F26'
const MUTED = '#5B6470'
const RULE = '#E2E5EA'
const PAGE_MARGIN = 48

export const ATTAINMENT_LABELS = {
  emerging: 'Emerging', developing: 'Developing', secure: 'Secure', excelling: 'Excelling',
  Beg: 'Beginning', Dev: 'Developing', Sec: 'Secure', Exc: 'Exceeding',
}
export const EFFORT_LABELS = {
  needs_improvement: 'Needs improvement', good: 'Good', very_good: 'Very good', excellent: 'Excellent',
  1: 'Needs improvement', 2: 'Inconsistent', 3: 'Good', 4: 'Very good', 5: 'Excellent',
}

export function gradeLabel(map, value) {
  if (value == null || value === '') return '—'
  return map[String(value)] || String(value)
}

function fmtDate(value, opts = { day: 'numeric', month: 'long', year: 'numeric' }) {
  if (!value) return ''
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString('en-GB', opts)
}

const ACRONYMS = new Set(['gcse', 'pe', 'ks3', 'ks4', 'ks5', 'xi', 'xv', 'a', 'b', 'u11', 'u13', 'u15', 'u16', 'u18'])

function titleCase(value) {
  return String(value || '').replace(/[_-]+/g, ' ').split(' ').filter(Boolean)
    .map(w => (ACRONYMS.has(w.toLowerCase()) ? w.toUpperCase() : w.charAt(0).toUpperCase() + w.slice(1)))
    .join(' ')
}

function pupilDisplayName(p) {
  return (p?.name && p.name.trim()) || [p?.first_name, p?.last_name].filter(Boolean).join(' ') || 'Pupil'
}

function safeColour(value, fallback) {
  return /^#[0-9a-f]{6}$/i.test(String(value || '')) ? value : fallback
}

// ── Document plumbing ───────────────────────────────────────────────

function createDoc({ title, subject, footer }) {
  const doc = new PDFDocument({
    size: 'A4', margin: PAGE_MARGIN, bufferPages: true,
    info: { Title: title, Author: 'MoonBoots Sports', Subject: subject || title, Creator: 'MoonBoots Sports' },
  })
  doc._mbFooter = footer
  return doc
}

function finish(doc) {
  // Footer on every page, with page numbers, once the content is complete.
  // The footer sits inside the bottom margin, so the margin is zeroed while
  // drawing it — otherwise pdfkit treats the text as overflow and adds pages.
  const range = doc.bufferedPageRange()
  for (let i = range.start; i < range.start + range.count; i++) {
    doc.switchToPage(i)
    const bottom = doc.page.margins.bottom
    doc.page.margins.bottom = 0
    const y = doc.page.height - PAGE_MARGIN + 14
    doc.save()
    doc.moveTo(PAGE_MARGIN, y - 8).lineTo(doc.page.width - PAGE_MARGIN, y - 8).lineWidth(0.5).strokeColor(RULE).stroke()
    doc.font('Helvetica').fontSize(8).fillColor(MUTED)
      .text(doc._mbFooter || '', PAGE_MARGIN, y, { width: doc.page.width - PAGE_MARGIN * 2 - 70, height: 12, lineBreak: false, ellipsis: true })
      .text(`Page ${i - range.start + 1} of ${range.count}`, doc.page.width - PAGE_MARGIN - 60, y, { width: 60, height: 12, align: 'right', lineBreak: false })
    doc.restore()
    doc.page.margins.bottom = bottom
  }
  return new Promise((resolve, reject) => {
    const chunks = []
    doc.on('data', c => chunks.push(c))
    doc.on('end', () => resolve(Buffer.concat(chunks)))
    doc.on('error', reject)
    doc.end()
  })
}

function contentWidth(doc) {
  return doc.page.width - PAGE_MARGIN * 2
}

function ensureSpace(doc, needed) {
  if (doc.y + needed > doc.page.height - PAGE_MARGIN - 24) doc.addPage()
}

function headerBand(doc, { schoolName, colour, title, subtitle }) {
  const h = 72
  doc.save()
  doc.rect(0, 0, doc.page.width, h).fill(colour)
  doc.rect(0, h, doc.page.width, 3).fill(GOLD)
  doc.restore()
  doc.font('Helvetica-Bold').fontSize(15).fillColor('#FFFFFF').text(schoolName || 'School', PAGE_MARGIN, 22, { width: contentWidth(doc) * 0.6, lineBreak: false })
  doc.font('Helvetica').fontSize(10).fillColor('#FFFFFF').text(title, PAGE_MARGIN, 44, { width: contentWidth(doc) * 0.6, lineBreak: false })
  if (subtitle) {
    doc.font('Helvetica').fontSize(9).fillColor('#FFFFFF').text(subtitle, doc.page.width / 2, 30, { width: contentWidth(doc) / 2, align: 'right' })
  }
  doc.y = h + 28
  doc.x = PAGE_MARGIN
}

function sectionTitle(doc, text) {
  ensureSpace(doc, 40)
  doc.moveDown(0.6)
  doc.font('Helvetica-Bold').fontSize(8.5).fillColor(GOLD).text(text.toUpperCase(), PAGE_MARGIN, doc.y, { characterSpacing: 1.2 })
  const y = doc.y + 4
  doc.moveTo(PAGE_MARGIN, y).lineTo(doc.page.width - PAGE_MARGIN, y).lineWidth(0.5).strokeColor(RULE).stroke()
  doc.y = y + 10
  doc.x = PAGE_MARGIN
}

function paragraph(doc, text, { size = 10.5, colour = INK, italic = false, indent = 0 } = {}) {
  if (!text) return
  ensureSpace(doc, 30)
  doc.font(italic ? 'Helvetica-Oblique' : 'Helvetica').fontSize(size).fillColor(colour)
    .text(String(text), PAGE_MARGIN + indent, doc.y, { width: contentWidth(doc) - indent, lineGap: 2 })
  doc.moveDown(0.4)
}

function muted(doc, text) {
  paragraph(doc, text, { size: 9.5, colour: MUTED, italic: true })
}

function labelValue(doc, label, value, { width = contentWidth(doc), x = PAGE_MARGIN } = {}) {
  doc.font('Helvetica').fontSize(8).fillColor(MUTED).text(label.toUpperCase(), x, doc.y, { width, characterSpacing: 0.6 })
  doc.font('Helvetica-Bold').fontSize(11).fillColor(INK).text(value || '—', x, doc.y, { width })
}

function bullet(doc, text) {
  ensureSpace(doc, 24)
  const y = doc.y
  doc.circle(PAGE_MARGIN + 4, y + 6, 1.6).fill(GOLD)
  doc.font('Helvetica').fontSize(10.5).fillColor(INK).text(String(text), PAGE_MARGIN + 14, y, { width: contentWidth(doc) - 14, lineGap: 2 })
  doc.moveDown(0.25)
}

// Simple table: columns [{ label, width (fraction), key }], rows as objects.
function table(doc, columns, rows) {
  const total = contentWidth(doc)
  const widths = columns.map(c => Math.floor(total * c.width))
  const drawHeader = () => {
    let x = PAGE_MARGIN
    const y = doc.y
    doc.font('Helvetica-Bold').fontSize(8).fillColor(MUTED)
    columns.forEach((c, i) => { doc.text(c.label.toUpperCase(), x, y, { width: widths[i] - 8, characterSpacing: 0.5, lineBreak: false }); x += widths[i] })
    doc.y = y + 14
    doc.moveTo(PAGE_MARGIN, doc.y - 3).lineTo(PAGE_MARGIN + total, doc.y - 3).lineWidth(0.5).strokeColor(RULE).stroke()
  }
  drawHeader()
  for (const row of rows) {
    const cells = columns.map(c => String(row[c.key] ?? '—'))
    doc.font('Helvetica').fontSize(9.5)
    const heights = cells.map((cell, i) => doc.heightOfString(cell, { width: widths[i] - 8 }))
    const rowH = Math.max(...heights, 12) + 8
    if (doc.y + rowH > doc.page.height - PAGE_MARGIN - 24) { doc.addPage(); drawHeader() }
    let x = PAGE_MARGIN
    const y = doc.y
    cells.forEach((cell, i) => {
      doc.font(columns[i].bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(9.5).fillColor(INK).text(cell, x, y + 2, { width: widths[i] - 8 })
      x += widths[i]
    })
    doc.y = y + rowH
    doc.moveTo(PAGE_MARGIN, doc.y - 2).lineTo(PAGE_MARGIN + total, doc.y - 2).lineWidth(0.3).strokeColor(RULE).stroke()
  }
  doc.x = PAGE_MARGIN
  doc.moveDown(0.5)
}

// ── Pupil parents' evening pack ─────────────────────────────────────

export async function pupilPackPdf({ school, pupil, classes = [], teams = [], reports = [], assessments = [], goals = [], achievements = [], participation = {}, generatedBy }) {
  const name = pupilDisplayName(pupil)
  const colour = safeColour(school?.primary_color, NAVY)
  const generated = fmtDate(new Date())
  const doc = createDoc({
    title: `${name} — progress report`,
    subject: `PE and sport progress report for ${name}`,
    footer: `${school?.name || 'MoonBoots Sports'} · Progress report for ${name} · Generated ${generated}${generatedBy ? ` by ${generatedBy}` : ''} · Confidential`,
  })

  headerBand(doc, { schoolName: school?.name, colour, title: 'PE & Sport progress report', subtitle: generated })

  doc.font('Helvetica-Bold').fontSize(24).fillColor(INK).text(name, PAGE_MARGIN, doc.y)
  const metaBits = []
  if (pupil.year_group) metaBits.push(`Year ${pupil.year_group}`)
  if (pupil.house) metaBits.push(`${pupil.house} House`)
  if (classes.length) metaBits.push(`Classes: ${classes.map(c => c.name).join(', ')}`)
  if (teams.length) metaBits.push(`Teams: ${teams.map(t => t.name).join(', ')}`)
  doc.font('Helvetica').fontSize(10.5).fillColor(MUTED).text(metaBits.join('  ·  ') || ' ', PAGE_MARGIN, doc.y + 4, { width: contentWidth(doc) })

  // Reports
  sectionTitle(doc, 'Written reports')
  if (reports.length === 0) {
    muted(doc, 'No written reports have been published for this pupil yet.')
  }
  for (const r of reports) {
    ensureSpace(doc, 90)
    doc.font('Helvetica-Bold').fontSize(12).fillColor(INK).text(`${r.window_name || 'Report'}${r.term ? ` · ${titleCase(r.term)} term` : ''}${r.academic_year ? ` ${r.academic_year}` : ''}`, PAGE_MARGIN, doc.y)
    doc.font('Helvetica').fontSize(9.5).fillColor(MUTED).text([r.unit_name || titleCase(r.sport || r.unit_sport), r.teacher_name ? `by ${r.teacher_name}` : null, r.updated_at ? fmtDate(r.updated_at) : null].filter(Boolean).join('  ·  '), PAGE_MARGIN, doc.y + 2)
    doc.moveDown(0.5)
    const y = doc.y
    const half = contentWidth(doc) / 2
    labelValue(doc, 'Attainment', gradeLabel(ATTAINMENT_LABELS, r.attainment_grade), { width: half - 10 })
    const afterFirst = doc.y
    doc.y = y
    labelValue(doc, 'Effort', gradeLabel(EFFORT_LABELS, r.effort_grade), { width: half - 10, x: PAGE_MARGIN + half })
    doc.y = Math.max(afterFirst, doc.y)
    doc.moveDown(0.4)
    if (r.teacher_comment) paragraph(doc, r.teacher_comment)
    doc.moveDown(0.6)
  }

  // Curriculum assessment
  sectionTitle(doc, 'Curriculum assessment')
  if (assessments.length === 0) {
    muted(doc, 'No curriculum assessments have been recorded yet.')
  } else {
    table(doc, [
      { label: 'Unit', key: 'unit', width: 0.34, bold: true },
      { label: 'Strand / criterion', key: 'criterion', width: 0.36 },
      { label: 'Grade', key: 'grade', width: 0.14 },
      { label: 'Date', key: 'date', width: 0.16 },
    ], assessments.map(a => ({
      unit: a.unit_name || titleCase(a.sport) || 'PE',
      criterion: [a.strand_name, a.criterion_name || a.criterion].filter(Boolean).join(' — ') || (a.assessment_type ? titleCase(a.assessment_type) : '—'),
      grade: gradeLabel(ATTAINMENT_LABELS, a.grade),
      date: fmtDate(a.assessed_at, { day: 'numeric', month: 'short', year: 'numeric' }),
    })))
  }

  // Development plan
  sectionTitle(doc, 'Development plan')
  const active = goals.filter(g => g.status === 'in_progress')
  const yearAgo = Date.now() - 365 * 86400000
  const achieved = goals.filter(g => g.status === 'achieved' && new Date(g.updated_at || g.created_at).getTime() > yearAgo)
  if (active.length === 0 && achieved.length === 0) {
    muted(doc, 'No development goals have been set yet.')
  }
  if (active.length) {
    doc.font('Helvetica-Bold').fontSize(10).fillColor(INK).text('Current goals', PAGE_MARGIN, doc.y)
    doc.moveDown(0.3)
    for (const g of active) {
      ensureSpace(doc, 40)
      bullet(doc, `${g.goal_description}${g.sport_key ? ` (${titleCase(g.sport_key)})` : ''}${g.target_date ? ` — target ${fmtDate(g.target_date, { day: 'numeric', month: 'short', year: 'numeric' })}` : ''}`)
      if (g.success_criteria) paragraph(doc, `Success looks like: ${g.success_criteria}`, { size: 9.5, colour: MUTED, indent: 14 })
    }
  }
  if (achieved.length) {
    doc.moveDown(0.3)
    doc.font('Helvetica-Bold').fontSize(10).fillColor(INK).text('Achieved this year', PAGE_MARGIN, doc.y)
    doc.moveDown(0.3)
    for (const g of achieved) bullet(doc, `${g.goal_description}${g.sport_key ? ` (${titleCase(g.sport_key)})` : ''}`)
  }

  // Achievements
  sectionTitle(doc, 'Achievements and awards')
  if (achievements.length === 0) {
    muted(doc, 'No awards recorded yet.')
  } else {
    for (const a of achievements) {
      bullet(doc, `${a.title}${a.sport_key ? ` · ${titleCase(a.sport_key)}` : ''}${a.earned_at ? ` · ${fmtDate(a.earned_at, { day: 'numeric', month: 'short', year: 'numeric' })}` : ''}${a.description ? ` — ${a.description}` : ''}`)
    }
  }

  // Participation
  sectionTitle(doc, 'Participation')
  const sports = [...new Set(teams.map(t => titleCase(t.sport)).filter(Boolean))]
  if (teams.length) bullet(doc, `Represents the school in ${teams.map(t => t.name).join(', ')}${sports.length ? ` (${sports.join(', ')})` : ''}.`)
  bullet(doc, participation.fixtures > 0
    ? `Selected in ${participation.fixtures} fixture squad${participation.fixtures === 1 ? '' : 's'} to date.`
    : 'No fixture squad selections recorded yet.')
  bullet(doc, participation.observations > 0
    ? `${participation.observations} progress observation${participation.observations === 1 ? '' : 's'} logged by staff in the last 12 months.`
    : 'No progress observations logged in the last 12 months.')

  return finish(doc)
}

// ── Reporting window batch / single report ──────────────────────────

function renderReportPage(doc, { school, window, report }) {
  const colour = safeColour(school?.primary_color, NAVY)
  const name = pupilDisplayName(report)
  headerBand(doc, {
    schoolName: school?.name, colour,
    title: `${window?.name || 'Report'}${window?.term ? ` · ${titleCase(window.term)} term` : ''}${window?.academic_year ? ` ${window.academic_year}` : ''}`,
    subtitle: report.status ? titleCase(report.status) : '',
  })
  doc.font('Helvetica-Bold').fontSize(22).fillColor(INK).text(name, PAGE_MARGIN, doc.y)
  doc.font('Helvetica').fontSize(10.5).fillColor(MUTED).text(
    [report.year_group ? `Year ${report.year_group}` : null, report.house ? `${report.house} House` : null, report.class_name].filter(Boolean).join('  ·  ') || ' ',
    PAGE_MARGIN, doc.y + 4)

  sectionTitle(doc, 'Assessment')
  const y = doc.y
  const third = contentWidth(doc) / 3
  labelValue(doc, 'Sport / unit', report.unit_name || titleCase(report.sport || report.unit_sport) || '—', { width: third - 10 })
  const a = doc.y; doc.y = y
  labelValue(doc, 'Attainment', gradeLabel(ATTAINMENT_LABELS, report.attainment_grade), { width: third - 10, x: PAGE_MARGIN + third })
  const b = doc.y; doc.y = y
  labelValue(doc, 'Effort', gradeLabel(EFFORT_LABELS, report.effort_grade), { width: third - 10, x: PAGE_MARGIN + third * 2 })
  doc.y = Math.max(a, b, doc.y)

  sectionTitle(doc, 'Teacher comment')
  if (report.teacher_comment) paragraph(doc, report.teacher_comment, { size: 11 })
  else muted(doc, 'No comment written yet.')

  doc.moveDown(0.5)
  doc.font('Helvetica').fontSize(9.5).fillColor(MUTED).text(
    [report.teacher_name ? `Written by ${report.teacher_name}` : null, report.updated_at ? `Last updated ${fmtDate(report.updated_at)}` : null].filter(Boolean).join('  ·  '),
    PAGE_MARGIN, doc.y)
}

export async function windowReportsPdf({ school, window, reports = [], filters = {}, generatedBy }) {
  const generated = fmtDate(new Date())
  const doc = createDoc({
    title: `${window?.name || 'Reports'} — ${school?.name || ''}`,
    subject: 'Pupil reports',
    footer: `${school?.name || 'MoonBoots Sports'} · ${window?.name || 'Reports'} · Generated ${generated}${generatedBy ? ` by ${generatedBy}` : ''} · Confidential`,
  })

  if (reports.length !== 1) {
    headerBand(doc, { schoolName: school?.name, colour: safeColour(school?.primary_color, NAVY), title: 'Pupil reports', subtitle: generated })
    doc.font('Helvetica-Bold').fontSize(22).fillColor(INK).text(window?.name || 'Reports', PAGE_MARGIN, doc.y)
    doc.font('Helvetica').fontSize(10.5).fillColor(MUTED).text(
      [window?.term ? `${titleCase(window.term)} term` : null, window?.academic_year, `${reports.length} report${reports.length === 1 ? '' : 's'}`,
        filters.class_name ? `Class: ${filters.class_name}` : null, filters.status ? `Status: ${titleCase(filters.status)}` : null].filter(Boolean).join('  ·  '),
      PAGE_MARGIN, doc.y + 4)
    sectionTitle(doc, 'Contents')
    if (reports.length === 0) muted(doc, 'No reports match this selection.')
    else {
      table(doc, [
        { label: 'Pupil', key: 'pupil', width: 0.3, bold: true },
        { label: 'Class', key: 'class', width: 0.16 },
        { label: 'Sport / unit', key: 'unit', width: 0.26 },
        { label: 'Attainment', key: 'attainment', width: 0.15 },
        { label: 'Effort', key: 'effort', width: 0.13 },
      ], reports.map(r => ({
        pupil: pupilDisplayName(r),
        class: r.class_name || '—',
        unit: r.unit_name || titleCase(r.sport || r.unit_sport) || '—',
        attainment: gradeLabel(ATTAINMENT_LABELS, r.attainment_grade),
        effort: gradeLabel(EFFORT_LABELS, r.effort_grade),
      })))
    }
    for (const report of reports) {
      doc.addPage()
      renderReportPage(doc, { school, window, report })
    }
  } else {
    renderReportPage(doc, { school, window, report: reports[0] })
  }

  return finish(doc)
}

export function pdfFilename(...parts) {
  const base = parts.filter(Boolean).join('-').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
  return `${base || 'report'}.pdf`
}
