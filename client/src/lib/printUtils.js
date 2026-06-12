// Open a print window containing a copy of the given element, with the
// app's stylesheets applied so diagrams and typography print correctly.
export function printElement(el, title = 'MoonBoots Sports') {
  if (!el) return
  const win = window.open('', '_blank', 'width=900,height=700')
  if (!win) return
  const styles = Array.from(document.querySelectorAll('link[rel="stylesheet"], style'))
    .map((n) => n.outerHTML)
    .join('')
  win.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${title}</title>${styles}</head><body style="background:#fff;padding:32px;max-width:760px;margin:0 auto">${el.outerHTML}</body></html>`)
  win.document.close()
  win.focus()
  setTimeout(() => {
    win.print()
    win.close()
  }, 400)
}
