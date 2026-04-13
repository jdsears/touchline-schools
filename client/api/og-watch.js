export const config = { runtime: 'edge' }

export default async function handler(request) {
  const url = new URL(request.url)
  const shareCode = url.searchParams.get('code')

  if (!shareCode) {
    return new Response('Not found', { status: 404 })
  }

  const apiBase = process.env.VITE_API_URL || process.env.API_URL || 'https://touchline.xyz/api'
  const watchUrl = `https://touchline.xyz/watch/${shareCode}`

  let meta
  try {
    const res = await fetch(`${apiBase}/streaming/watch/${shareCode}/meta`)
    if (!res.ok) {
      return new Response('Not found', { status: 404 })
    }
    meta = await res.json()
  } catch {
    return new Response('Error fetching stream info', { status: 500 })
  }

  const teamName = meta.teamName || 'Live Stream'
  const title = `${teamName} — Watch Live on Touchline`
  const description = meta.hasPin
    ? `Watch ${teamName} live! You'll need the PIN from your coach to tune in.`
    : `Watch ${teamName} live on Touchline!`
  const statusText = meta.status === 'active' ? 'LIVE NOW' : 'Stream available'
  const ogImage = 'https://touchline.xyz/touchline-og-image.png'

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>${esc(title)}</title>
  <meta name="description" content="${esc(description)}" />

  <meta property="og:title" content="${esc(title)}" />
  <meta property="og:description" content="${esc(description)}" />
  <meta property="og:image" content="${esc(ogImage)}" />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />
  <meta property="og:url" content="${esc(watchUrl)}" />
  <meta property="og:type" content="website" />
  <meta property="og:site_name" content="Touchline" />

  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${esc(title)}" />
  <meta name="twitter:description" content="${esc(description)}" />
  <meta name="twitter:image" content="${esc(ogImage)}" />

  <link rel="canonical" href="${esc(watchUrl)}" />
  <meta http-equiv="refresh" content="0;url=${esc(watchUrl)}" />
</head>
<body>
  <h1>${esc(teamName)}</h1>
  <p>${esc(statusText)} — ${esc(description)}</p>
  <a href="${esc(watchUrl)}">Watch on Touchline</a>
</body>
</html>`

  return new Response(html, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  })
}

function esc(str) {
  if (!str) return ''
  return str
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}
