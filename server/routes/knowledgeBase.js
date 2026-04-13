import { Router } from 'express'
import multer from 'multer'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'
import { authenticateToken } from '../middleware/auth.js'
import {
  ingestDocument,
  readFileContent,
  getDocuments,
  getDocument,
  deleteDocument,
  getKnowledgeBaseStats,
  searchKnowledgeBase,
  CATEGORIES,
} from '../services/knowledgeBaseService.js'

const router = Router()

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '../uploads/knowledge-base')
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true })
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const teamDir = path.join(uploadsDir, req.params.teamId)
    if (!fs.existsSync(teamDir)) {
      fs.mkdirSync(teamDir, { recursive: true })
    }
    cb(null, teamDir)
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
    const ext = path.extname(file.originalname)
    cb(null, uniqueSuffix + ext)
  }
})

const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit for knowledge base files
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'text/plain',
      'text/csv',
      'text/markdown',
      'application/pdf',
    ]
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true)
    } else {
      cb(new Error('Invalid file type. Allowed: text, CSV, markdown, PDF files.'), false)
    }
  }
})

// Get knowledge base stats for a team
router.get('/:teamId/stats', authenticateToken, async (req, res) => {
  try {
    const { teamId } = req.params
    const stats = await getKnowledgeBaseStats(teamId)
    res.json(stats)
  } catch (error) {
    console.error('Error fetching KB stats:', error)
    res.status(500).json({ message: 'Failed to fetch knowledge base stats' })
  }
})

// Get all knowledge base documents for a team
router.get('/:teamId', authenticateToken, async (req, res) => {
  try {
    const { teamId } = req.params
    const documents = await getDocuments(teamId)
    res.json(documents)
  } catch (error) {
    console.error('Error fetching KB documents:', error)
    res.status(500).json({ message: 'Failed to fetch knowledge base documents' })
  }
})

// Get a single document with its chunks
router.get('/:teamId/:documentId', authenticateToken, async (req, res) => {
  try {
    const { teamId, documentId } = req.params
    const document = await getDocument(documentId, teamId)

    if (!document) {
      return res.status(404).json({ message: 'Document not found' })
    }

    res.json(document)
  } catch (error) {
    console.error('Error fetching KB document:', error)
    res.status(500).json({ message: 'Failed to fetch document' })
  }
})

// Add text content to the knowledge base (manual entry)
router.post('/:teamId/text', authenticateToken, async (req, res) => {
  try {
    const { teamId } = req.params
    const { title, description, content, category, ageGroup, tags } = req.body

    if (!title || !content) {
      return res.status(400).json({ message: 'Title and content are required' })
    }

    // Check user has permission
    if (!['manager', 'assistant'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Not authorised to manage the knowledge base' })
    }

    const document = await ingestDocument({
      teamId,
      uploadedBy: req.user.id,
      title,
      description,
      content,
      sourceType: 'manual',
      category: category || 'general',
      ageGroup: ageGroup || null,
      tags: tags || [],
    })

    res.status(201).json(document)
  } catch (error) {
    console.error('Error ingesting text:', error)
    res.status(500).json({ message: 'Failed to add content to knowledge base' })
  }
})

// Upload a file to the knowledge base
router.post('/:teamId/upload', authenticateToken, upload.single('file'), async (req, res) => {
  try {
    const { teamId } = req.params
    const { title, description, category, ageGroup, tags } = req.body
    const file = req.file

    if (!file) {
      return res.status(400).json({ message: 'No file uploaded' })
    }

    // Check user has permission
    if (!['manager', 'assistant'].includes(req.user.role)) {
      if (file) fs.unlinkSync(file.path)
      return res.status(403).json({ message: 'Not authorised to manage the knowledge base' })
    }

    // Read file content
    const content = readFileContent(file.path, file.mimetype)
    if (!content) {
      fs.unlinkSync(file.path)
      return res.status(400).json({
        message: 'Could not extract text from this file. Currently supported: plain text, CSV, and markdown files.'
      })
    }

    const parsedTags = tags ? (typeof tags === 'string' ? JSON.parse(tags) : tags) : []

    const document = await ingestDocument({
      teamId,
      uploadedBy: req.user.id,
      title: title || file.originalname,
      description,
      content,
      sourceType: 'file',
      category: category || 'general',
      ageGroup: ageGroup || null,
      tags: parsedTags,
      filePath: file.path,
      originalFilename: file.originalname,
      fileType: file.mimetype,
      fileSize: file.size,
    })

    res.status(201).json(document)
  } catch (error) {
    console.error('Error uploading KB file:', error)
    if (req.file) {
      try { fs.unlinkSync(req.file.path) } catch (e) {}
    }
    res.status(500).json({ message: 'Failed to process file for knowledge base' })
  }
})

// Search the knowledge base
router.post('/:teamId/search', authenticateToken, async (req, res) => {
  try {
    const { teamId } = req.params
    const { query, ageGroup, category, tags, limit } = req.body

    if (!query) {
      return res.status(400).json({ message: 'Search query is required' })
    }

    const results = await searchKnowledgeBase({
      teamId,
      query,
      ageGroup,
      category,
      tags,
      limit: limit || 10,
    })

    res.json(results)
  } catch (error) {
    console.error('Error searching KB:', error)
    res.status(500).json({ message: 'Failed to search knowledge base' })
  }
})

// Delete a knowledge base document
router.delete('/:teamId/:documentId', authenticateToken, async (req, res) => {
  try {
    const { teamId, documentId } = req.params

    // Check user has permission
    if (!['manager', 'assistant'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Not authorised to manage the knowledge base' })
    }

    const deleted = await deleteDocument(documentId, teamId)
    if (!deleted) {
      return res.status(404).json({ message: 'Document not found' })
    }

    res.json({ success: true, message: 'Document removed from knowledge base' })
  } catch (error) {
    console.error('Error deleting KB document:', error)
    res.status(500).json({ message: 'Failed to delete document' })
  }
})

// Get available categories
router.get('/:teamId/categories', authenticateToken, async (req, res) => {
  res.json(CATEGORIES)
})

export default router
