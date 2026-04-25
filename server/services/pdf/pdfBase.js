const BASE_CSS = `
  @page { margin: 20mm; size: A4 portrait; }
  * { box-sizing: border-box; }
  body {
    font-family: 'Inter', -apple-system, sans-serif;
    font-size: 11pt;
    line-height: 1.5;
    color: #1A1A1A;
    margin: 0;
    padding: 0;
  }
  h1, h2, h3, h4 {
    font-family: 'Source Serif 4', 'Crimson Pro', Georgia, serif;
    color: #0F1E3D;
    margin: 0 0 8px;
    page-break-after: avoid;
  }
  h1 { font-size: 18pt; }
  h2 { font-size: 14pt; border-bottom: 1px solid #E8E8E4; padding-bottom: 4px; margin-bottom: 12px; }
  h3 { font-size: 12pt; }
  p { margin: 0 0 8px; orphans: 3; widows: 3; }
  table { width: 100%; border-collapse: collapse; margin: 12px 0; page-break-inside: avoid; }
  th, td { border: 1px solid #D8D8D4; padding: 6px 10px; font-size: 10pt; text-align: left; }
  th { background: #F5F3EC; font-weight: 600; color: #0F1E3D; }
  tr:nth-child(even) { background: #FAFAF7; }
  .badge { display: inline-block; padding: 2px 8px; border-radius: 10px; font-size: 8pt; font-weight: 600; }
  .badge-success { background: #E8F2EC; color: #2F7A4A; }
  .badge-warning { background: #FBF3E2; color: #B07B1A; }
  .badge-error { background: #F7E4DF; color: #A8351F; }
`

export function wrapHtml({ title, schoolName, schoolLogoUrl, body, extraCss = '' }) {
  const header = schoolName ? `
    <div style="display:flex;align-items:center;gap:12px;margin-bottom:16px;padding-bottom:12px;border-bottom:2px solid #0F1E3D;">
      ${schoolLogoUrl ? `<img src="${schoolLogoUrl}" style="width:40px;height:40px;border-radius:4px;" />` : ''}
      <div>
        <div style="font-family:'Source Serif 4',Georgia,serif;font-size:14pt;font-weight:600;color:#0F1E3D;">${esc(schoolName)}</div>
        <div style="font-size:9pt;color:#6B6B6B;">${esc(title)}</div>
      </div>
    </div>
  ` : ''

  return `<!DOCTYPE html><html><head>
    <meta charset="utf-8" />
    <title>${esc(title)}</title>
    <style>${BASE_CSS}${extraCss}</style>
  </head><body>${header}${body}
    <div style="position:fixed;bottom:10mm;right:10mm;font-size:8pt;color:#A8A8A8;">
      ${esc(schoolName || 'MoonBoots Sports')} | ${esc(title)} | Generated ${new Date().toLocaleDateString('en-GB')}
    </div>
  </body></html>`
}

function esc(s) { return (s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;') }

export function tableHtml(headers, rows) {
  const ths = headers.map(h => `<th>${esc(h)}</th>`).join('')
  const trs = rows.map(row => `<tr>${row.map(c => `<td>${c ?? ''}</td>`).join('')}</tr>`).join('')
  return `<table><thead><tr>${ths}</tr></thead><tbody>${trs}</tbody></table>`
}
