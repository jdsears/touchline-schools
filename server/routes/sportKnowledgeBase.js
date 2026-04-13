import express from 'express'
import pool from '../config/database.js'
import { authenticateToken, requireRole } from '../middleware/auth.js'
import { SUPPORTED_SPORTS } from '../services/sportKnowledge.js'

const router = express.Router()

router.use(authenticateToken)

// GET / - List all sport knowledge base documents (optionally filtered by sport)
router.get('/', async (req, res) => {
  try {
    const { sport, category } = req.query

    let query = `SELECT * FROM sport_knowledge_base WHERE 1=1`
    const params = []

    // Show system defaults + school-specific documents
    if (req.user.school_id) {
      query += ` AND (school_id IS NULL OR school_id = $${params.length + 1})`
      params.push(req.user.school_id)
    } else {
      query += ` AND school_id IS NULL`
    }

    if (sport) {
      query += ` AND sport = $${params.length + 1}`
      params.push(sport)
    }

    if (category) {
      query += ` AND category = $${params.length + 1}`
      params.push(category)
    }

    query += ` ORDER BY is_system_default DESC, sport ASC, category ASC, created_at DESC`

    const result = await pool.query(query, params)
    res.json(result.rows)
  } catch (error) {
    console.error('Error listing sport knowledge base:', error)
    res.status(500).json({ error: 'Failed to load knowledge base' })
  }
})

// GET /sports - List supported sports with document counts
router.get('/sports', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT sport, COUNT(*) AS document_count
       FROM sport_knowledge_base
       WHERE school_id IS NULL OR school_id = $1
       GROUP BY sport
       ORDER BY sport ASC`,
      [req.user.school_id || null]
    )

    // Merge with supported sports list so all sports appear
    const counts = {}
    for (const row of result.rows) {
      counts[row.sport] = parseInt(row.document_count)
    }

    const sports = SUPPORTED_SPORTS.map(sport => ({
      sport,
      document_count: counts[sport] || 0,
    }))

    res.json(sports)
  } catch (error) {
    console.error('Error listing sports:', error)
    res.status(500).json({ error: 'Failed to load sports' })
  }
})

// POST / - Add a knowledge base document (Head of Sport adds custom guidance)
router.post('/', requireRole('manager', 'assistant', 'scout'), async (req, res) => {
  try {
    const { sport, title, content, category, age_range, school_id } = req.body

    if (!sport || !title || !content) {
      return res.status(400).json({ error: 'Sport, title, and content are required' })
    }

    const result = await pool.query(
      `INSERT INTO sport_knowledge_base (school_id, sport, title, content, category, age_range, is_system_default, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, false, $7)
       RETURNING *`,
      [school_id || null, sport, title, content, category || 'custom', age_range || null, req.user.id]
    )

    res.status(201).json(result.rows[0])
  } catch (error) {
    console.error('Error adding knowledge base document:', error)
    res.status(500).json({ error: 'Failed to add document' })
  }
})

// PUT /:id - Update a knowledge base document (only non-system-default)
router.put('/:id', requireRole('manager', 'assistant', 'scout'), async (req, res) => {
  try {
    const { title, content, category, age_range } = req.body

    const result = await pool.query(
      `UPDATE sport_knowledge_base
       SET title = COALESCE($1, title),
           content = COALESCE($2, content),
           category = COALESCE($3, category),
           age_range = COALESCE($4, age_range),
           updated_at = NOW()
       WHERE id = $5 AND is_system_default = false
       RETURNING *`,
      [title, content, category, age_range, req.params.id]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Document not found or is a system default' })
    }

    res.json(result.rows[0])
  } catch (error) {
    console.error('Error updating knowledge base document:', error)
    res.status(500).json({ error: 'Failed to update document' })
  }
})

// DELETE /:id - Delete a knowledge base document (only non-system-default)
router.delete('/:id', requireRole('manager', 'assistant', 'scout'), async (req, res) => {
  try {
    const result = await pool.query(
      'DELETE FROM sport_knowledge_base WHERE id = $1 AND is_system_default = false RETURNING id',
      [req.params.id]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Document not found or is a system default' })
    }

    res.json({ message: 'Document deleted' })
  } catch (error) {
    console.error('Error deleting knowledge base document:', error)
    res.status(500).json({ error: 'Failed to delete document' })
  }
})

// GET /for-ai/:sport - Get all knowledge base content for a sport (used by AI system prompt)
// Returns concatenated text for injection into the AI context
router.get('/for-ai/:sport', async (req, res) => {
  try {
    const { sport } = req.params
    const schoolId = req.query.school_id || req.user.school_id

    const result = await pool.query(
      `SELECT title, content, category, age_range
       FROM sport_knowledge_base
       WHERE sport = $1 AND (school_id IS NULL OR school_id = $2)
       ORDER BY is_system_default DESC, category ASC, created_at ASC`,
      [sport, schoolId || null]
    )

    // Concatenate all documents into a single context block
    const contextBlocks = result.rows.map(doc => {
      let block = `### ${doc.title}`
      if (doc.age_range) block += ` (${doc.age_range})`
      if (doc.category !== 'general' && doc.category !== 'custom') {
        block += ` [${doc.category.replace('_', ' ')}]`
      }
      block += `\n${doc.content}`
      return block
    })

    res.json({
      sport,
      document_count: result.rows.length,
      context: contextBlocks.join('\n\n'),
    })
  } catch (error) {
    console.error('Error loading AI sport context:', error)
    res.status(500).json({ error: 'Failed to load sport context' })
  }
})

export default router
