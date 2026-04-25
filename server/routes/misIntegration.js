import { Router } from 'express'
import { authenticateToken } from '../middleware/auth.js'
import { getConfig, saveConfig, getSyncHistory } from '../services/mis/iSAMSService.js'
import pool from '../config/database.js'

const router = Router()

async function getSchoolId(user) {
  const mem = await pool.query(
    `SELECT school_id FROM school_members WHERE user_id = $1 AND status = 'active' LIMIT 1`,
    [user.id]
  )
  if (mem.rows.length) return mem.rows[0].school_id
  if (user.is_admin) {
    const fallback = await pool.query('SELECT id FROM schools ORDER BY created_at ASC LIMIT 1')
    return fallback.rows[0]?.id || null
  }
  return null
}

router.get('/config', authenticateToken, async (req, res, next) => {
  try {
    const schoolId = await getSchoolId(req.user)
    if (!schoolId) return res.status(403).json({ error: 'No school access' })
    const config = await getConfig(schoolId)
    res.json(config || { provider: null, configured: false })
  } catch (error) { next(error) }
})

router.put('/config', authenticateToken, async (req, res, next) => {
  try {
    const schoolId = await getSchoolId(req.user)
    if (!schoolId) return res.status(403).json({ error: 'No school access' })
    const config = await saveConfig(schoolId, req.body)
    res.json(config)
  } catch (error) { next(error) }
})

router.get('/history', authenticateToken, async (req, res, next) => {
  try {
    const schoolId = await getSchoolId(req.user)
    if (!schoolId) return res.status(403).json({ error: 'No school access' })
    const history = await getSyncHistory(schoolId)
    res.json(history)
  } catch (error) { next(error) }
})

export default router
