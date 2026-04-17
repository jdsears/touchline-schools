export const config = { runtime: 'edge' }

const SITE_URL = 'https://moonbootssports.com'
const API_BASE = process.env.VITE_API_URL || process.env.API_URL || 'https://moonbootssports.com/api'

export default async function handler() {
  const today = new Date().toISOString().split('T')[0]

  // Static pages
  const staticPages = [
    { loc: '/', changefreq: 'weekly', priority: '1.0' },
    { loc: '/login', changefreq: 'monthly', priority: '0.8' },
    { loc: '/register', changefreq: 'monthly', priority: '0.9' },
    { loc: '/pricing', changefreq: 'weekly', priority: '0.9' },
    { loc: '/blog', changefreq: 'weekly', priority: '0.8' },
    { loc: '/grassroots-football-coaching', changefreq: 'monthly', priority: '0.9' },
    { loc: '/youth-football-coaches', changefreq: 'monthly', priority: '0.9' },
    { loc: '/football-training-plans', changefreq: 'monthly', priority: '0.9' },
    { loc: '/club-payments', changefreq: 'monthly', priority: '0.9' },
    { loc: '/terms', changefreq: 'monthly', priority: '0.5' },
  ]

  // Feature pages
  const featurePages = [
    'session-planner', 'player-development', 'video-analysis',
    'tactical-advisor', 'tactics-board', 'match-prep',
    'live-streaming', 'parent-portal',
    'safeguarding', 'events-camps', 'ai-intelligence',
  ].map(slug => ({
    loc: `/features/${slug}`, changefreq: 'monthly', priority: '0.8',
  }))

  // Fetch published blog posts from backend API
  let blogPages = []
  try {
    const res = await fetch(`${API_BASE}/blog/posts?limit=200`)
    if (res.ok) {
      const posts = await res.json()
      blogPages = posts
        .filter(p => p.slug)
        .map(post => ({
          loc: `/blog/${post.slug}`,
          lastmod: (post.published_at || today).toString().split('T')[0],
          changefreq: 'monthly',
          priority: '0.7',
        }))
    }
  } catch (err) {
    // Blog fetch failed - generate sitemap without blog posts
  }

  const allPages = [
    ...staticPages.map(p => ({ ...p, lastmod: today })),
    ...featurePages.map(p => ({ ...p, lastmod: today })),
    ...blogPages,
  ]

  const urls = allPages.map(p => `  <url>
    <loc>${SITE_URL}${p.loc}</loc>
    <lastmod>${p.lastmod}</lastmod>
    <changefreq>${p.changefreq}</changefreq>
    <priority>${p.priority}</priority>
  </url>`).join('\n')

  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>`

  return new Response(sitemap, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
    },
  })
}
