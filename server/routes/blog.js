import { Router } from 'express'
import pool from '../config/database.js'
import { authenticateToken, requireAdmin } from '../middleware/auth.js'
import Anthropic from '@anthropic-ai/sdk'
import multer from 'multer'
import path from 'path'

const router = Router()
const anthropic = new Anthropic()

// Configure multer for blog image uploads (memory storage - images stored in DB)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
  fileFilter: (req, file, cb) => {
    const allowed = ['.png', '.jpg', '.jpeg', '.gif', '.webp']
    const ext = path.extname(file.originalname).toLowerCase()
    if (allowed.includes(ext)) {
      cb(null, true)
    } else {
      cb(new Error('Only image files are allowed'))
    }
  }
})

// --- Public routes ---

// List published posts
router.get('/posts', async (req, res, next) => {
  try {
    const { limit = 20, offset = 0, tag } = req.query
    let query = `SELECT id, title, slug, excerpt, cover_image_url, author_name, tags, published_at
                 FROM blog_posts WHERE status = 'published'`
    const params = []
    if (tag) {
      params.push(tag)
      query += ` AND $${params.length} = ANY(tags)`
    }
    query += ` ORDER BY published_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`
    params.push(parseInt(limit), parseInt(offset))
    const result = await pool.query(query, params)
    res.json(result.rows)
  } catch (error) {
    next(error)
  }
})

// Get single post by slug (public)
router.get('/posts/slug/:slug', async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT * FROM blog_posts WHERE slug = $1 AND status = 'published'`,
      [req.params.slug]
    )
    if (result.rows.length === 0) return res.status(404).json({ message: 'Post not found' })
    res.json(result.rows[0])
  } catch (error) {
    next(error)
  }
})

// --- Admin routes ---

// List all posts (admin)
router.get('/admin/posts', authenticateToken, requireAdmin, async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT id, title, slug, excerpt, cover_image_url, status, tags, published_at, created_at, updated_at
       FROM blog_posts ORDER BY created_at DESC`
    )
    res.json(result.rows)
  } catch (error) {
    next(error)
  }
})

// Get single post (admin)
router.get('/admin/posts/:id', authenticateToken, requireAdmin, async (req, res, next) => {
  try {
    const result = await pool.query('SELECT * FROM blog_posts WHERE id = $1', [req.params.id])
    if (result.rows.length === 0) return res.status(404).json({ message: 'Post not found' })
    res.json(result.rows[0])
  } catch (error) {
    next(error)
  }
})

// Create post
router.post('/admin/posts', authenticateToken, requireAdmin, async (req, res, next) => {
  try {
    const { title, slug, excerpt, content, cover_image_url, status, author_name, tags, meta_title, meta_description } = req.body
    if (!title || !content) return res.status(400).json({ message: 'Title and content are required' })

    const finalSlug = slug || title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
    const publishedAt = status === 'published' ? 'NOW()' : null

    const result = await pool.query(
      `INSERT INTO blog_posts (title, slug, excerpt, content, cover_image_url, status, author_name, tags, meta_title, meta_description, published_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, ${status === 'published' ? 'NOW()' : 'NULL'})
       RETURNING *`,
      [title, finalSlug, excerpt || null, content, cover_image_url || null, status || 'draft',
       author_name || 'Touchline', tags || [], meta_title || null, meta_description || null]
    )
    res.status(201).json(result.rows[0])
  } catch (error) {
    if (error.code === '23505') return res.status(409).json({ message: 'A post with this slug already exists' })
    next(error)
  }
})

// Update post
router.put('/admin/posts/:id', authenticateToken, requireAdmin, async (req, res, next) => {
  try {
    const { id } = req.params
    const { title, slug, excerpt, content, cover_image_url, status, author_name, tags, meta_title, meta_description } = req.body

    // If publishing for the first time, set published_at
    const existing = await pool.query('SELECT status, published_at FROM blog_posts WHERE id = $1', [id])
    if (existing.rows.length === 0) return res.status(404).json({ message: 'Post not found' })

    const wasPublished = existing.rows[0].published_at
    const publishClause = status === 'published' && !wasPublished ? ', published_at = NOW()' : ''

    const result = await pool.query(
      `UPDATE blog_posts SET
        title = COALESCE($1, title), slug = COALESCE($2, slug), excerpt = $3,
        content = COALESCE($4, content), cover_image_url = $5, status = COALESCE($6, status),
        author_name = COALESCE($7, author_name), tags = COALESCE($8, tags),
        meta_title = $9, meta_description = $10, updated_at = NOW() ${publishClause}
       WHERE id = $11 RETURNING *`,
      [title, slug, excerpt ?? null, content, cover_image_url ?? null, status,
       author_name, tags, meta_title ?? null, meta_description ?? null, id]
    )
    res.json(result.rows[0])
  } catch (error) {
    if (error.code === '23505') return res.status(409).json({ message: 'Slug already exists' })
    next(error)
  }
})

// Delete post
router.delete('/admin/posts/:id', authenticateToken, requireAdmin, async (req, res, next) => {
  try {
    const result = await pool.query('DELETE FROM blog_posts WHERE id = $1 RETURNING id', [req.params.id])
    if (result.rows.length === 0) return res.status(404).json({ message: 'Post not found' })
    res.json({ message: 'Post deleted' })
  } catch (error) {
    next(error)
  }
})

// AI generate blog post
router.post('/admin/generate', authenticateToken, requireAdmin, async (req, res, next) => {
  try {
    const { topic, tone = 'informative', audience = 'grassroots football coaches and parents' } = req.body
    if (!topic) return res.status(400).json({ message: 'Topic is required' })

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 3000,
      system: `You are a blog writer for Touchline, an AI-powered coaching platform for grassroots youth football in the UK. Write engaging, informative blog posts that help coaches, parents, and players. Use British English. Be practical and actionable.

CRITICAL: You must respond with ONLY valid JSON. No text before or after the JSON object. No markdown code fences. The "content" field must use \\n for newlines and properly escape any quotes within the markdown.`,
      messages: [{
        role: 'user',
        content: `Write a blog post about: "${topic}"

Tone: ${tone}
Audience: ${audience}

Respond with a single JSON object in this exact structure:
{"title":"Blog post title","slug":"url-friendly-slug","excerpt":"2-3 sentence summary","content":"Full markdown content using ## for headings, **bold**, - bullet points etc. Use \\n for line breaks. 600-1000 words.","tags":["tag1","tag2","tag3"],"meta_title":"SEO title max 60 chars","meta_description":"SEO description max 155 chars"}`
      }],
    })

    const text = response.content[0].text.trim()
    let parsed
    try {
      // Try direct parse first
      parsed = JSON.parse(text)
    } catch {
      // Strip markdown code fences if present
      const stripped = text.replace(/^```(?:json)?\s*\n?/i, '').replace(/\n?```\s*$/i, '').trim()
      try {
        parsed = JSON.parse(stripped)
      } catch {
        // Last resort: find outermost JSON object
        const start = stripped.indexOf('{')
        const end = stripped.lastIndexOf('}')
        if (start !== -1 && end > start) {
          parsed = JSON.parse(stripped.slice(start, end + 1))
        } else {
          throw new Error('Failed to parse AI response as JSON')
        }
      }
    }

    res.json(parsed)
  } catch (error) {
    console.error('Blog generation error:', error)
    next(error)
  }
})

// AI generate cover image prompt (for use with external image generation)
router.post('/admin/generate-image-prompt', authenticateToken, requireAdmin, async (req, res, next) => {
  try {
    const { title, excerpt } = req.body
    if (!title) return res.status(400).json({ message: 'Title is required' })

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 500,
      messages: [{
        role: 'user',
        content: `Generate a detailed image generation prompt for a blog cover image.

Blog title: "${title}"
Blog summary: "${excerpt || ''}"

The image should be:
- Professional and clean
- Related to grassroots/youth football
- Suitable as a 16:9 blog header
- No text in the image

Return ONLY the image prompt text, nothing else.`
      }],
    })

    res.json({ prompt: response.content[0].text.trim() })
  } catch (error) {
    next(error)
  }
})

// Serve blog images from database (public)
router.get('/images/:id', async (req, res, next) => {
  try {
    const id = req.params.id.replace(/\.[^.]+$/, '') // strip extension
    const result = await pool.query('SELECT data, mime_type FROM blog_images WHERE id = $1', [id])
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Image not found' })
    }
    const { data, mime_type } = result.rows[0]

    // Ensure data is a proper Buffer for binary response
    let imageBuffer = data
    if (!Buffer.isBuffer(data)) {
      if (typeof data === 'string' && data.startsWith('\\x')) {
        imageBuffer = Buffer.from(data.slice(2), 'hex')
      } else if (typeof data === 'string') {
        imageBuffer = Buffer.from(data, 'binary')
      }
    }

    res.set('Content-Type', mime_type)
    res.set('Cache-Control', 'public, max-age=31536000, immutable')
    res.send(imageBuffer)
  } catch (error) {
    next(error)
  }
})

// Diagnostic: check blog_images table status (admin only)
router.get('/admin/image-diagnostics', authenticateToken, requireAdmin, async (req, res, next) => {
  try {
    const countResult = await pool.query('SELECT COUNT(*) as total FROM blog_images')
    const imagesResult = await pool.query(
      'SELECT id, filename, mime_type, length(data) as data_size_bytes, created_at FROM blog_images ORDER BY created_at DESC LIMIT 20'
    )
    const postsResult = await pool.query(
      "SELECT id, title, cover_image_url FROM blog_posts WHERE cover_image_url IS NOT NULL AND cover_image_url != '' ORDER BY created_at DESC LIMIT 20"
    )

    // Check for orphaned references (posts pointing to images that don't exist)
    const orphaned = []
    for (const post of postsResult.rows) {
      if (post.cover_image_url && post.cover_image_url.startsWith('/api/blog/images/')) {
        const imageId = post.cover_image_url.replace('/api/blog/images/', '').replace(/\.[^.]+$/, '')
        const exists = await pool.query('SELECT id FROM blog_images WHERE id = $1', [imageId])
        if (exists.rows.length === 0) {
          orphaned.push({ post_id: post.id, title: post.title, missing_image_url: post.cover_image_url })
        }
      }
    }

    res.json({
      total_images: parseInt(countResult.rows[0].total),
      images: imagesResult.rows,
      posts_with_cover_images: postsResult.rows,
      orphaned_references: orphaned,
      summary: orphaned.length > 0
        ? `${orphaned.length} post(s) reference images that no longer exist in the database`
        : 'All image references are valid'
    })
  } catch (error) {
    next(error)
  }
})

// Upload cover image (stores in database to persist across deploys)
router.post('/admin/upload-image', authenticateToken, requireAdmin, upload.single('image'), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image file provided' })
    }
    const result = await pool.query(
      'INSERT INTO blog_images (filename, mime_type, data) VALUES ($1, $2, $3) RETURNING id',
      [req.file.originalname, req.file.mimetype, req.file.buffer]
    )
    const ext = path.extname(req.file.originalname).toLowerCase()
    const imageUrl = `/api/blog/images/${result.rows[0].id}${ext}`
    res.json({ url: imageUrl })
  } catch (error) {
    next(error)
  }
})

export default router
