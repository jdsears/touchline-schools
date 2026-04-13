import { useState, useEffect } from 'react'
import { Link, useParams } from 'react-router-dom'
import { blogService, SERVER_URL } from '../services/api'
import { Loader2, ArrowLeft, Calendar, Tag } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import SEO from '../components/common/SEO'

function resolveImageUrl(url) {
  if (!url) return ''
  if (url.startsWith('http')) return url
  return `${SERVER_URL}${url}`
}

export default function BlogPost() {
  const { slug } = useParams()
  const [post, setPost] = useState(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    const fetchPost = async () => {
      try {
        const res = await blogService.getPostBySlug(slug)
        setPost(res.data)
      } catch (error) {
        if (error.response?.status === 404) {
          setNotFound(true)
        }
      } finally {
        setLoading(false)
      }
    }
    fetchPost()

    return () => {}
  }, [slug])

  if (loading) {
    return (
      <div className="min-h-screen bg-navy-950 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-pitch-500" />
      </div>
    )
  }

  if (notFound || !post) {
    return (
      <div className="min-h-screen bg-navy-950 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-2">Post not found</h1>
          <Link to="/blog" className="text-pitch-400 hover:text-pitch-300">&larr; Back to blog</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-navy-950">
      <SEO
        title={post.meta_title || post.title}
        description={post.meta_description || post.excerpt || `${post.title} - Touchline Blog`}
        path={`/blog/${post.slug}`}
        type="article"
        image={post.cover_image_url ? resolveImageUrl(post.cover_image_url) : undefined}
      />
      <header className="bg-navy-950/80 backdrop-blur-md border-b border-navy-900">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link to="/blog" className="flex items-center gap-2 text-navy-300 hover:text-white transition-colors">
              <ArrowLeft className="w-4 h-4" />
              Blog
            </Link>
            <Link to="/" className="font-display font-semibold text-white">Touchline</Link>
          </div>
        </div>
      </header>

      <article className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {post.cover_image_url && (
          <img
            src={resolveImageUrl(post.cover_image_url)}
            alt={post.title}
            className="w-full rounded-xl mb-8"
            onError={(e) => { e.target.style.display = 'none' }}
          />
        )}

        <h1 className="text-3xl sm:text-4xl font-display font-bold text-white mb-4">{post.title}</h1>

        <div className="flex flex-wrap items-center gap-4 text-sm text-navy-500 mb-8 pb-8 border-b border-navy-800">
          {post.author_name && <span>By {post.author_name}</span>}
          {post.published_at && (
            <span className="flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" />
              {new Date(post.published_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
            </span>
          )}
          {post.tags?.length > 0 && (
            <span className="flex items-center gap-1">
              <Tag className="w-3.5 h-3.5" />
              {post.tags.join(', ')}
            </span>
          )}
        </div>

        <div className="blog-content">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              h1: ({ children }) => <h2 className="text-2xl font-bold text-white mt-10 mb-4">{children}</h2>,
              h2: ({ children }) => <h2 className="text-xl font-bold text-white mt-8 mb-3">{children}</h2>,
              h3: ({ children }) => <h3 className="text-lg font-semibold text-white mt-6 mb-2">{children}</h3>,
              h4: ({ children }) => <h4 className="text-base font-semibold text-white mt-5 mb-2">{children}</h4>,
              p: ({ children }) => <p className="text-navy-200 leading-relaxed mb-4">{children}</p>,
              strong: ({ children }) => <strong className="text-white font-semibold">{children}</strong>,
              em: ({ children }) => <em className="text-navy-300">{children}</em>,
              ul: ({ children }) => <ul className="list-disc list-inside space-y-1 my-4 ml-2 text-navy-200">{children}</ul>,
              ol: ({ children }) => <ol className="list-decimal list-inside space-y-1 my-4 ml-2 text-navy-200">{children}</ol>,
              li: ({ children }) => <li className="text-navy-200">{children}</li>,
              blockquote: ({ children }) => (
                <blockquote className="border-l-4 border-pitch-500 pl-4 my-4 text-navy-300 italic">{children}</blockquote>
              ),
              a: ({ href, children }) => (
                <a href={href} className="text-pitch-400 hover:text-pitch-300 underline" target="_blank" rel="noopener noreferrer">{children}</a>
              ),
              code: ({ children }) => (
                <code className="bg-navy-800 px-1.5 py-0.5 rounded text-sm text-pitch-300">{children}</code>
              ),
              hr: () => <hr className="border-navy-800 my-8" />,
              img: ({ src, alt }) => (
                <img src={resolveImageUrl(src)} alt={alt || ''} className="rounded-lg my-6 max-w-full" />
              ),
            }}
          >
            {post.content}
          </ReactMarkdown>
        </div>

        <div className="mt-12 pt-8 border-t border-navy-800 text-center">
          <p className="text-navy-300 mb-4">Ready to level up your coaching?</p>
          <Link to="/register" className="btn-primary px-6 py-2.5">
            Get Started Free
          </Link>
        </div>
      </article>

      <footer className="py-8 px-4 border-t border-navy-900 text-center">
        <p className="text-navy-500 text-sm">&copy; {new Date().getFullYear()} Touchline</p>
        <p className="text-navy-600 text-xs mt-2">
          Built by <a href="https://moonbootsconsultancy.net" target="_blank" rel="noopener noreferrer" className="hover:text-navy-400 transition-colors underline">MoonBoots Consultancy</a>
        </p>
      </footer>
    </div>
  )
}
