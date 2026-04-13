export const config = { runtime: 'edge' }

export default async function handler() {
  const robotsTxt = `# Touchline - Robots.txt
# https://touchline.xyz

User-agent: *
Allow: /
Allow: /login
Allow: /register
Allow: /pricing
Allow: /blog
Allow: /terms
Allow: /grassroots-football-coaching
Allow: /youth-football-coaches
Allow: /football-training-plans
Allow: /features/
Allow: /club-payments
Allow: /watch/

# Disallow authenticated app routes
Disallow: /admin
Disallow: /dashboard
Disallow: /chat
Disallow: /tactics
Disallow: /training
Disallow: /players
Disallow: /matches
Disallow: /fixtures
Disallow: /league
Disallow: /lounge
Disallow: /settings
Disallow: /player-lounge
Disallow: /invite
Disallow: /club/

# Disallow API routes
Disallow: /api/

# Sitemap
Sitemap: https://touchline.xyz/sitemap.xml
`

  return new Response(robotsTxt, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=86400',
    },
  })
}
