import express from 'express'
import multer from 'multer'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'
import pool from '../config/database.js'
import { authenticateToken } from '../middleware/auth.js'
import { uploadFile, deleteFile } from '../services/storageService.js'

const router = express.Router()

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '../uploads/documents')
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
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Allow common document types
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'image/jpeg',
      'image/png',
      'image/gif',
      'text/plain',
      'text/csv',
    ]

    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true)
    } else {
      cb(new Error('Invalid file type. Allowed: PDF, Word, Excel, PowerPoint, images, text files.'), false)
    }
  }
})

// Get all documents for a team
router.get('/:teamId', authenticateToken, async (req, res) => {
  try {
    const { teamId } = req.params
    const isParent = req.user.role === 'parent'

    let query = `
      SELECT d.*, u.name as uploaded_by_name
      FROM team_documents d
      LEFT JOIN users u ON d.uploaded_by = u.id
      WHERE d.team_id = $1
    `
    const params = [teamId]

    // Parents can only see documents marked as visible
    if (isParent) {
      query += ' AND d.visible_to_parents = true'
    }

    query += ' ORDER BY d.created_at DESC'

    const result = await pool.query(query, params)
    res.json(result.rows)
  } catch (error) {
    console.error('Error fetching documents:', error)
    res.status(500).json({ message: 'Failed to fetch documents' })
  }
})

// Upload a document
router.post('/:teamId/upload', authenticateToken, upload.single('file'), async (req, res) => {
  try {
    const { teamId } = req.params
    const { description, visibleToParents } = req.body
    const file = req.file

    if (!file) {
      return res.status(400).json({ message: 'No file uploaded' })
    }

    // Check user has permission to upload
    if (!['manager', 'assistant'].includes(req.user.role)) {
      // Delete the uploaded file
      fs.unlinkSync(file.path)
      return res.status(403).json({ message: 'Not authorized to upload documents' })
    }

    const storageKey = `documents/${teamId}/${file.filename}`
    const fileUrl = await uploadFile(file.path, storageKey, { contentType: file.mimetype })

    const result = await pool.query(
      `INSERT INTO team_documents
        (team_id, uploaded_by, filename, original_name, file_type, file_size, file_path, visible_to_parents, description)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [
        teamId,
        req.user.id,
        file.filename,
        file.originalname,
        file.mimetype,
        file.size,
        fileUrl,
        visibleToParents === 'true' || visibleToParents === true,
        description || null
      ]
    )

    // Get uploader name
    const doc = result.rows[0]
    doc.uploaded_by_name = req.user.name

    res.status(201).json(doc)
  } catch (error) {
    console.error('Error uploading document:', error)
    // Clean up file if database insert failed
    if (req.file) {
      try {
        fs.unlinkSync(req.file.path)
      } catch (e) {}
    }
    res.status(500).json({ message: error.message || 'Failed to upload document' })
  }
})

// Update document visibility
router.patch('/:teamId/documents/:docId', authenticateToken, async (req, res) => {
  try {
    const { teamId, docId } = req.params
    const { visibleToParents, description } = req.body

    // Check user has permission
    if (!['manager', 'assistant'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Not authorized to update documents' })
    }

    const updates = []
    const values = []
    let paramCount = 0

    if (visibleToParents !== undefined) {
      paramCount++
      updates.push(`visible_to_parents = $${paramCount}`)
      values.push(visibleToParents)
    }

    if (description !== undefined) {
      paramCount++
      updates.push(`description = $${paramCount}`)
      values.push(description)
    }

    if (updates.length === 0) {
      return res.status(400).json({ message: 'No updates provided' })
    }

    paramCount++
    values.push(docId)
    paramCount++
    values.push(teamId)

    const result = await pool.query(
      `UPDATE team_documents
       SET ${updates.join(', ')}
       WHERE id = $${paramCount - 1} AND team_id = $${paramCount}
       RETURNING *`,
      values
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Document not found' })
    }

    res.json(result.rows[0])
  } catch (error) {
    console.error('Error updating document:', error)
    res.status(500).json({ message: 'Failed to update document' })
  }
})

// Delete a document
router.delete('/:teamId/documents/:docId', authenticateToken, async (req, res) => {
  try {
    const { teamId, docId } = req.params

    // Check user has permission
    if (!['manager', 'assistant'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Not authorized to delete documents' })
    }

    // Get document to delete file
    const docResult = await pool.query(
      'SELECT * FROM team_documents WHERE id = $1 AND team_id = $2',
      [docId, teamId]
    )

    if (docResult.rows.length === 0) {
      return res.status(404).json({ message: 'Document not found' })
    }

    const doc = docResult.rows[0]

    // Delete from database
    await pool.query('DELETE FROM team_documents WHERE id = $1', [docId])

    // Delete file (cloud or local)
    await deleteFile(doc.file_path)

    res.json({ message: 'Document deleted' })
  } catch (error) {
    console.error('Error deleting document:', error)
    res.status(500).json({ message: 'Failed to delete document' })
  }
})

export default router
