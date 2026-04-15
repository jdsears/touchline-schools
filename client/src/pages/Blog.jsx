import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { blogService, SERVER_URL } from '../services/api'
import { Loader2, ArrowLeft, Calendar, Tag } from 'lucide-react'
import SEO from '../components/common/SEO'

export default function Blog() {
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchPosts = async () => {
      try {
        const res = await blogService.getPosts()
        setPosts(res.data)
      } catch (error) {
        console.error('Failed to fetch blog posts:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchPosts()
  }, [])

  return (
    <div className="min-h-screen bg-navy-950">
      <SEO
        title="Blog"
        description="Coaching insights, tips, and grassroots football news from Touchline. Practical advice for volunteer coaches, school managers, and youth football."
        path="/blog"
      />
      {/* Header */}
      <header className="bg-navy-950/80 backdrop-blur-md border-b border-navy-900">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link to="/" className="flex items-center gap-2 text-navy-300 hover:text-white transition-colors">
              <ArrowLeft className="w-4 h-4" />
              <span className="font-display font-semibold text-white">Touchline</span>
            </Link>
            <Link to="/register" className="btn-primary text-sm px-4 py-1.5">
              Get Started Free
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-10">
          <h1 className="text-3xl sm:text-4xl font-display font-bold text-white mb-3">Blog</h1>
          <p className="text-navy-300 text-lg">Coaching insights, tips, and grassroots football news.</p>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-pitch-500" />
          </div>
        ) : posts.length === 0 ? (
          <div className="text-center py-20 text-navy-400">
            <p className="text-lg">No posts yet. Check back soon!</p>
          </div>
        ) : (
          <div className="space-y-6">
            {posts.map((post) => (
              <Link
                key={post.id}
                to={`/blog/${post.slug}`}
                className="block bg-navy-900 border border-navy-800 rounded-xl overflow-hidden hover:border-navy-700 transition-colors group"
              >
                <div className="flex flex-col sm:flex-row">
                  {post.cover_image_url && (
                    <div className="sm:w-72 shrink-0 bg-navy-800/50 flex items-center">
                      <img
                        src={post.cover_image_url.startsWith('http') ? post.cover_image_url : `${SERVER_URL}${post.cover_image_url}`}
                        alt={post.title}
                        className="w-full h-auto object-contain"
                        onError={(e) => { e.target.parentElement.style.display = 'none' }}
                      />
                    </div>
                  )}
                  <div className="p-5 flex-1">
                    <h2 className="text-xl font-semibold text-white group-hover:text-pitch-400 transition-colors mb-2">
                      {post.title}
                    </h2>
                    {post.excerpt && (
                      <p className="text-navy-300 mb-3 line-clamp-2">{post.excerpt}</p>
                    )}
                    <div className="flex items-center gap-4 text-sm text-navy-500">
                      {post.published_at && (
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5" />
                          {new Date(post.published_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </span>
                      )}
                      {post.tags?.length > 0 && (
                        <span className="flex items-center gap-1">
                          <Tag className="w-3.5 h-3.5" />
                          {post.tags.slice(0, 3).join(', ')}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>

      <footer className="py-8 px-4 border-t border-navy-900 text-center">
        <p className="text-navy-500 text-sm">&copy; {new Date().getFullYear()} Touchline</p>
        <p className="text-navy-600 text-xs mt-2">
          Built by <a href="https://moonbootsconsultancy.net" target="_blank" rel="noopener noreferrer" className="hover:text-navy-400 transition-colors underline">MoonBoots Consultancy</a>
        </p>
      </footer>
    </div>
  )
}
