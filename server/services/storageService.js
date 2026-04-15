/**
 * Cloud Storage Service
 *
 * S3-compatible storage that works with:
 *   - Cloudflare R2 (recommended - no egress fees)
 *   - AWS S3
 *   - Any S3-compatible provider (MinIO, DigitalOcean Spaces, etc.)
 *
 * Falls back to local disk storage when S3 credentials are not configured,
 * so development works without any cloud setup.
 *
 * Required env vars for cloud storage:
 *   S3_BUCKET          - bucket name
 *   S3_ACCESS_KEY_ID   - access key
 *   S3_SECRET_ACCESS_KEY - secret key
 *   S3_ENDPOINT        - provider endpoint (required for R2/non-AWS)
 *   S3_REGION          - region (default: auto)
 *   S3_PUBLIC_URL      - public base URL for serving files
 *                         e.g. https://pub-xxx.r2.dev  or  https://cdn.yoursite.com
 */

import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const S3_BUCKET = process.env.S3_BUCKET
const S3_ACCESS_KEY_ID = process.env.S3_ACCESS_KEY_ID
const S3_SECRET_ACCESS_KEY = process.env.S3_SECRET_ACCESS_KEY
const S3_ENDPOINT = process.env.S3_ENDPOINT
const S3_REGION = process.env.S3_REGION || 'auto'
const S3_PUBLIC_URL = process.env.S3_PUBLIC_URL // e.g. https://pub-xxx.r2.dev

const isCloudEnabled = !!(S3_BUCKET && S3_ACCESS_KEY_ID && S3_SECRET_ACCESS_KEY)

let s3 = null
if (isCloudEnabled) {
  const config = {
    region: S3_REGION,
    credentials: {
      accessKeyId: S3_ACCESS_KEY_ID,
      secretAccessKey: S3_SECRET_ACCESS_KEY,
    },
  }
  if (S3_ENDPOINT) {
    config.endpoint = S3_ENDPOINT
    config.forcePathStyle = true // required for R2 / MinIO
  }
  s3 = new S3Client(config)
  console.log(`☁️  Cloud storage enabled (bucket: ${S3_BUCKET})`)
} else {
  console.log('📁 Using local disk storage (set S3_BUCKET, S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY for cloud)')
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getContentType(filePath) {
  const ext = path.extname(filePath).toLowerCase()
  const types = {
    '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png',
    '.gif': 'image/gif', '.webp': 'image/webp', '.svg': 'image/svg+xml',
    '.mp4': 'video/mp4', '.mov': 'video/quicktime', '.avi': 'video/x-msvideo',
    '.mkv': 'video/x-matroska', '.webm': 'video/webm',
    '.pdf': 'application/pdf',
    '.doc': 'application/msword',
    '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    '.xls': 'application/vnd.ms-excel',
    '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    '.heic': 'image/heic',
  }
  return types[ext] || 'application/octet-stream'
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Upload a file to cloud storage (or keep it on disk if cloud is disabled).
 *
 * @param {string} localFilePath  - absolute path to the file on disk (from multer)
 * @param {string} key            - the storage key / path, e.g. "match-media/media-abc-123.jpg"
 * @param {object} [opts]
 * @param {string} [opts.contentType] - MIME type override
 * @returns {Promise<string>} the public URL (cloud) or local path (/uploads/...)
 */
export async function uploadFile(localFilePath, key, opts = {}) {
  if (!isCloudEnabled) {
    // Local mode: file already written by multer - just return the local URL
    return `/uploads/${key}`
  }

  // Cloud mode: read local file, upload to S3, delete local copy
  const body = fs.readFileSync(localFilePath)
  const contentType = opts.contentType || getContentType(localFilePath)

  await s3.send(new PutObjectCommand({
    Bucket: S3_BUCKET,
    Key: key,
    Body: body,
    ContentType: contentType,
  }))

  // Remove local temp file
  try { fs.unlinkSync(localFilePath) } catch { /* ignore */ }

  // Return public URL
  if (S3_PUBLIC_URL) {
    return `${S3_PUBLIC_URL.replace(/\/$/, '')}/${key}`
  }
  // Fallback: construct from endpoint
  if (S3_ENDPOINT) {
    return `${S3_ENDPOINT.replace(/\/$/, '')}/${S3_BUCKET}/${key}`
  }
  return `https://${S3_BUCKET}.s3.${S3_REGION}.amazonaws.com/${key}`
}

/**
 * Delete a file from cloud storage (or disk).
 *
 * @param {string} filePathOrUrl - the stored path/URL (as saved in the DB)
 */
export async function deleteFile(filePathOrUrl) {
  if (!filePathOrUrl) return

  if (isCloudEnabled) {
    // Extract the key from the URL
    let key = filePathOrUrl
    if (S3_PUBLIC_URL && filePathOrUrl.startsWith(S3_PUBLIC_URL)) {
      key = filePathOrUrl.slice(S3_PUBLIC_URL.replace(/\/$/, '').length + 1)
    } else if (filePathOrUrl.startsWith('http')) {
      // Generic: take everything after the bucket/host
      try {
        const url = new URL(filePathOrUrl)
        key = url.pathname.replace(/^\//, '')
        // If path-style URL contains the bucket name, strip it
        if (key.startsWith(S3_BUCKET + '/')) {
          key = key.slice(S3_BUCKET.length + 1)
        }
      } catch { /* not a URL, use as-is */ }
    } else if (filePathOrUrl.startsWith('/uploads/')) {
      // Legacy local path stored in DB - strip the /uploads/ prefix to get the key
      key = filePathOrUrl.replace(/^\/uploads\//, '')
    }

    try {
      await s3.send(new DeleteObjectCommand({
        Bucket: S3_BUCKET,
        Key: key,
      }))
    } catch (err) {
      console.warn('Cloud delete warning:', err.message)
    }
  } else {
    // Local mode: delete from disk
    let diskPath
    if (filePathOrUrl.startsWith('/uploads/')) {
      diskPath = path.join(__dirname, '..', filePathOrUrl)
    } else {
      diskPath = filePathOrUrl
    }
    try {
      if (fs.existsSync(diskPath)) fs.unlinkSync(diskPath)
    } catch { /* ignore */ }
  }
}

/**
 * Check whether cloud storage is enabled.
 */
export function isCloud() {
  return isCloudEnabled
}
