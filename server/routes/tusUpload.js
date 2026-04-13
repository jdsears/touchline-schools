import express, { Router } from 'express'
import { Server } from '@tus/server'
import { FileStore } from '@tus/file-store'
import path from 'path'
import { fileURLToPath } from 'url'
import fs from 'fs'
import { execSync } from 'child_process'
import pool from '../config/database.js'
import { authenticateToken } from '../middleware/auth.js'
import { uploadFile } from '../services/storageService.js'

// Check available disk space (returns bytes)
function getAvailableDiskSpace(directory) {
  try {
    // Use df command to get available space
    const output = execSync(`df -B1 "${directory}" | tail -1 | awk '{print $4}'`, { encoding: 'utf8' })
    return parseInt(output.trim(), 10)
  } catch {
    // Fallback: assume enough space if we can't check
    console.warn('Could not check disk space, proceeding with upload')
    return Infinity
  }
}

// Minimum required free space after upload (500MB buffer)
const MIN_FREE_SPACE_BUFFER = 500 * 1024 * 1024

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const router = Router()

// Ensure upload directories exist
const uploadsDir = path.join(__dirname, '../uploads/videos')
const tusDir = path.join(__dirname, '../uploads/tus-temp')

if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true })
}
if (!fs.existsSync(tusDir)) {
  fs.mkdirSync(tusDir, { recursive: true })
}

// Configure tus server with 3GB max file size
const tusServer = new Server({
  path: '/api/uploads/video',
  datastore: new FileStore({ directory: tusDir }),
  maxSize: 3 * 1024 * 1024 * 1024, // 3GB
  generateUrl: (req, { proto, host, path, id }) => {
    return `${proto}://${host}${path}/${id}`
  },
  namingFunction: (req, metadata) => {
    // Generate unique filename with original extension
    // In @tus/server v2.x, the second parameter is the metadata object directly
    const ext = metadata?.filetype?.split('/')[1] || 'mp4'
    return `${Date.now()}-${Math.random().toString(36).substring(7)}.${ext}`
  },
  onUploadCreate: async (req, res, upload) => {
    const filename = upload.metadata?.filename || 'unknown'
    const filesize = upload.size || 0
    const filesizeMB = (filesize / 1024 / 1024).toFixed(2)

    console.log(`[Upload] Starting new upload: ${filename} (${filesizeMB} MB)`)

    // Validate file type from metadata
    const filetype = upload.metadata?.filetype
    const allowedTypes = ['video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/x-matroska', 'video/webm']

    if (filetype && !allowedTypes.includes(filetype)) {
      console.log(`[Upload] Rejected: Invalid file type ${filetype}`)
      throw { status_code: 415, body: 'Only video files are allowed (mp4, mov, avi, mkv, webm)' }
    }

    // Check disk space (need space for temp + final file + buffer)
    const requiredSpace = (filesize * 2) + MIN_FREE_SPACE_BUFFER
    const availableSpace = getAvailableDiskSpace(tusDir)

    if (availableSpace < requiredSpace) {
      const availableMB = (availableSpace / 1024 / 1024).toFixed(0)
      const requiredMB = (requiredSpace / 1024 / 1024).toFixed(0)
      console.error(`[Upload] Rejected: Insufficient disk space. Available: ${availableMB} MB, Required: ${requiredMB} MB`)
      throw {
        status_code: 507,
        body: `Insufficient disk space. Need ${requiredMB} MB but only ${availableMB} MB available.`
      }
    }

    console.log(`[Upload] Accepted: ${filename}, disk space OK`)
    return res
  },
  onUploadFinish: async (req, res, upload) => {
    const filename = upload.metadata?.filename || upload.id
    const filesizeMB = ((upload.size || 0) / 1024 / 1024).toFixed(2)

    // Move completed upload from temp to permanent location
    const tempPath = path.join(tusDir, upload.id)
    const finalPath = path.join(uploadsDir, upload.id)

    console.log(`[Upload] Finishing upload: ${filename} (${filesizeMB} MB)`)

    try {
      // Verify temp file exists and has expected size
      if (!fs.existsSync(tempPath)) {
        console.error(`[Upload] Error: Temp file not found: ${tempPath}`)
        throw { status_code: 500, body: 'Upload file not found. Please retry the upload.' }
      }

      const stats = fs.statSync(tempPath)
      if (upload.size && stats.size !== upload.size) {
        console.error(`[Upload] Error: Size mismatch. Expected ${upload.size}, got ${stats.size}`)
        throw { status_code: 500, body: 'Upload incomplete. Please retry the upload.' }
      }

      // Move file to permanent location
      fs.renameSync(tempPath, finalPath)
      console.log(`[Upload] File moved to: ${finalPath}`)

      // Clean up .json metadata file
      const metaPath = tempPath + '.json'
      if (fs.existsSync(metaPath)) {
        fs.unlinkSync(metaPath)
      }

      console.log(`[Upload] Complete: ${filename} (${filesizeMB} MB) -> ${upload.id}`)
    } catch (error) {
      if (error.status_code) {
        throw error // Re-throw TUS-formatted errors
      }
      console.error(`[Upload] Error finishing upload ${upload.id}:`, error.message)
      throw { status_code: 500, body: 'Failed to save upload. Please retry.' }
    }

    return res
  }
})

// Middleware to extract auth token from query params for tus requests
// (tus client sends token in metadata, but we also support query param)
const tusAuthMiddleware = async (req, res, next) => {
  // Try to get token from Authorization header first
  let token = req.headers.authorization?.replace('Bearer ', '')

  // If not in header, try query param (for tus resumption)
  if (!token && req.query.token) {
    token = req.query.token
    req.headers.authorization = `Bearer ${token}`
  }

  // For OPTIONS (CORS preflight), skip auth
  if (req.method === 'OPTIONS') {
    return next()
  }

  // Validate token
  if (token) {
    authenticateToken(req, res, next)
  } else {
    res.status(401).json({ message: 'Authentication required' })
  }
}

// Create video record after upload completes
// NOTE: Specific routes must be defined BEFORE the catch-all tus handler
// Need express.json() since global JSON middleware is skipped for this route
router.post('/complete', express.json(), authenticateToken, async (req, res, next) => {
  try {
    const { uploadId, teamId, matchId, filename } = req.body

    if (!uploadId || !teamId) {
      return res.status(400).json({ message: 'uploadId and teamId are required' })
    }

    // Verify file exists
    const filePath = path.join(uploadsDir, uploadId)
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ message: 'Upload not found' })
    }

    // Get file size
    const stats = fs.statSync(filePath)
    const fileSize = stats.size

    // Upload to cloud storage (or keep local)
    const ext = path.extname(filename || uploadId) || '.mp4'
    const storageKey = `videos/${uploadId}${ext !== path.extname(uploadId) ? '' : ''}`
    const videoUrl = await uploadFile(filePath, `videos/${uploadId}`, { contentType: `video/${ext.replace('.', '') || 'mp4'}` })

    // Create video record in database
    const result = await pool.query(
      `INSERT INTO videos (team_id, match_id, url, type, file_size, original_filename, upload_status)
       VALUES ($1, $2, $3, 'match', $4, $5, 'completed') RETURNING *`,
      [teamId, matchId || null, videoUrl, fileSize, filename || uploadId]
    )

    // Update match if matchId provided
    if (matchId) {
      await pool.query(
        'UPDATE matches SET video_url = $1, video_id = $2 WHERE id = $3',
        [videoUrl, result.rows[0].id, matchId]
      )
    }

    res.status(201).json({
      video: result.rows[0],
      message: 'Video uploaded successfully'
    })
  } catch (error) {
    next(error)
  }
})

// Get upload status
router.get('/status/:uploadId', authenticateToken, async (req, res) => {
  const { uploadId } = req.params
  const filePath = path.join(uploadsDir, uploadId)
  const tempPath = path.join(tusDir, uploadId)

  if (fs.existsSync(filePath)) {
    const stats = fs.statSync(filePath)
    res.json({
      status: 'completed',
      size: stats.size,
      path: `/uploads/videos/${uploadId}`
    })
  } else if (fs.existsSync(tempPath)) {
    const stats = fs.statSync(tempPath)
    res.json({
      status: 'in_progress',
      uploadedBytes: stats.size
    })
  } else {
    res.status(404).json({ status: 'not_found' })
  }
})

// Handle all tus requests with extended timeout
// IMPORTANT: This catch-all must be LAST so specific routes above are matched first
router.all('*', tusAuthMiddleware, (req, res) => {
  // Set per-request timeout for large uploads (10 minutes per chunk)
  req.setTimeout(10 * 60 * 1000)
  res.setTimeout(10 * 60 * 1000)

  // Log chunk uploads for debugging
  if (req.method === 'PATCH') {
    const uploadId = req.url.split('/').pop()
    const contentLength = req.headers['content-length']
    console.log(`[Upload] Receiving chunk for ${uploadId}: ${(contentLength / 1024 / 1024).toFixed(2)} MB`)
  }

  // Express strips the mount path from req.url, but @tus/server expects the full path
  // to match its configured path. Restore the full URL for tus server processing.
  req.url = req.baseUrl + req.url

  tusServer.handle(req, res)
})

export default router
