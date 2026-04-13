export const config = { runtime: 'edge' }

export default async function handler(request) {
  const url = new URL(request.url)
  const slug = url.searchParams.get('slug')

  if (!slug) {
    return new Response('Not found', { status: 404 })
  }

  const apiBase = process.env.VITE_API_URL || process.env.API_URL || 'https://touchline.xyz/api'

  let post
  try {
    const res = await fetch(`${apiBase}/blog/posts/slug/${slug}`)
    if (!res.ok) {
      return new Response('Not found', { status: 404 })
    }
    post = await res.json()
  } catch {
    return new Response('Error fetching post', { status: 500 })
  }

  const serverBase = apiBase.replace(/\/api$/, '')
  const ogImage = post.cover_image_url
    ? (post.cover_image_url.startsWith('http') ? post.cover_image_url : `${serverBase}${post.cover_image_url}`)
    : 'https://touchline.xyz/touchline-og-image.png'

  const title = post.meta_title || post.title
  const description = post.meta_description || post.excerpt || ''
  const postUrl = `https://touchline.xyz/blog/${slug}`
  const publishedAt = post.published_at || post.created_at

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>${esc(title)} | Touchline Blog</title>
  <meta name="description" content="${esc(description)}" />

  <meta property="og:title" content="${esc(title)}" />
  <meta property="og:description" content="${esc(description)}" />
  <meta property="og:image" content="${esc(ogImage)}" />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />
  <meta property="og:url" content="${esc(postUrl)}" />
  <meta property="og:type" content="article" />
  <meta property="og:site_name" content="Touchline" />
  ${publishedAt ? `<meta property="article:published_time" content="${esc(publishedAt)}" />` : ''}
  ${post.author_name ? `<meta property="article:author" content="${esc(post.author_name)}" />` : ''}

  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${esc(title)}" />
  <meta name="twitter:description" content="${esc(description)}" />
  <meta name="twitter:image" content="${esc(ogImage)}" />

  <link rel="canonical" href="${esc(postUrl)}" />
  <meta http-equiv="refresh" content="0;url=${esc(postUrl)}" />
</head>
<body>
  <h1>${esc(post.title)}</h1>
  <p>${esc(description)}</p>
  <a href="${esc(postUrl)}">Read on Touchline</a>
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
