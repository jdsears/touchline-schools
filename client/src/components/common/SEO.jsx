import { Helmet } from 'react-helmet-async'

const defaultMeta = {
  title: 'Touchline | AI-Powered Coaching & Club Management for Grassroots Football',
  description: 'Touchline gives grassroots football coaches AI-powered tools for tactics, training sessions, player development, and club management. Free plan available.',
  image: 'https://touchline.xyz/touchline-og-image.png',
  url: 'https://touchline.xyz',
}

/**
 * SEO component for dynamic meta tags
 * @param {object} props - SEO properties
 * @param {string} props.title - Page title (will be appended with site name)
 * @param {string} props.description - Page description
 * @param {string} props.image - Open Graph image URL
 * @param {string} props.path - Page path for canonical URL
 * @param {string} props.type - Open Graph type (default: website)
 * @param {boolean} props.noIndex - Whether to prevent indexing
 */
export default function SEO({
  title,
  description = defaultMeta.description,
  image = defaultMeta.image,
  path = '',
  type = 'website',
  noIndex = false,
}) {
  const fullTitle = title
    ? `${title} | Touchline`
    : defaultMeta.title
  const canonicalUrl = `${defaultMeta.url}${path}`

  return (
    <Helmet>
      {/* Primary Meta Tags */}
      <title>{fullTitle}</title>
      <meta name="title" content={fullTitle} />
      <meta name="description" content={description} />
      <link rel="canonical" href={canonicalUrl} />

      {noIndex && <meta name="robots" content="noindex, nofollow" />}

      {/* Open Graph / Facebook */}
      <meta property="og:type" content={type} />
      <meta property="og:url" content={canonicalUrl} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={image} />

      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:url" content={canonicalUrl} />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={image} />
    </Helmet>
  )
}
