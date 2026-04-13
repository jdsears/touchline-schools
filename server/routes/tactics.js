import { Router } from 'express'
import pool from '../config/database.js'
import { authenticateToken } from '../middleware/auth.js'

const router = Router()

// Get game model
router.get('/:teamId/game-model', authenticateToken, async (req, res, next) => {
  try {
    const { teamId } = req.params
    const result = await pool.query('SELECT game_model FROM teams WHERE id = $1', [teamId])
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Team not found' })
    }
    res.json(result.rows[0].game_model || {})
  } catch (error) {
    next(error)
  }
})

// Update game model
router.put('/:teamId/game-model', authenticateToken, async (req, res, next) => {
  try {
    const { teamId } = req.params
    const gameModel = req.body
    
    const result = await pool.query(
      'UPDATE teams SET game_model = $1, updated_at = NOW() WHERE id = $2 RETURNING game_model',
      [JSON.stringify(gameModel), teamId]
    )
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Team not found' })
    }
    
    res.json(result.rows[0].game_model)
  } catch (error) {
    next(error)
  }
})

// Get formations
router.get('/:teamId/formations', authenticateToken, async (req, res, next) => {
  try {
    const { teamId } = req.params
    const result = await pool.query(
      "SELECT * FROM tactics WHERE team_id = $1 AND type = 'formation' ORDER BY name",
      [teamId]
    )
    res.json(result.rows)
  } catch (error) {
    next(error)
  }
})

// Save formation
router.post('/:teamId/formations', authenticateToken, async (req, res, next) => {
  try {
    const { teamId } = req.params
    const { name, formation, positions, movements, notes } = req.body
    
    const result = await pool.query(
      `INSERT INTO tactics (team_id, name, type, formation, positions, movements, notes)
       VALUES ($1, $2, 'formation', $3, $4, $5, $6) RETURNING *`,
      [teamId, name, formation, JSON.stringify(positions || []), 
       JSON.stringify(movements || []), notes]
    )
    
    res.status(201).json(result.rows[0])
  } catch (error) {
    next(error)
  }
})

// Get playbook
router.get('/:teamId/playbook', authenticateToken, async (req, res, next) => {
  try {
    const { teamId } = req.params
    const result = await pool.query(
      "SELECT * FROM tactics WHERE team_id = $1 AND type != 'formation' ORDER BY type, name",
      [teamId]
    )
    res.json(result.rows)
  } catch (error) {
    next(error)
  }
})

// Add play
router.post('/:teamId/playbook', authenticateToken, async (req, res, next) => {
  try {
    const { teamId } = req.params
    const { name, type, positions, movements, notes } = req.body
    
    const result = await pool.query(
      `INSERT INTO tactics (team_id, name, type, positions, movements, notes)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [teamId, name, type, JSON.stringify(positions || []), 
       JSON.stringify(movements || []), notes]
    )
    
    res.status(201).json(result.rows[0])
  } catch (error) {
    next(error)
  }
})

// Update play
router.put('/plays/:id', authenticateToken, async (req, res, next) => {
  try {
    const { id } = req.params
    const { name, type, positions, movements, notes } = req.body
    
    const result = await pool.query(
      `UPDATE tactics SET 
        name = COALESCE($1, name),
        type = COALESCE($2, type),
        positions = COALESCE($3, positions),
        movements = COALESCE($4, movements),
        notes = COALESCE($5, notes),
        updated_at = NOW()
       WHERE id = $6 RETURNING *`,
      [name, type, positions ? JSON.stringify(positions) : null, 
       movements ? JSON.stringify(movements) : null, notes, id]
    )
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Play not found' })
    }
    
    res.json(result.rows[0])
  } catch (error) {
    next(error)
  }
})

// Delete play
router.delete('/plays/:id', authenticateToken, async (req, res, next) => {
  try {
    const { id } = req.params
    const result = await pool.query('DELETE FROM tactics WHERE id = $1 RETURNING id', [id])
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Play not found' })
    }
    res.json({ message: 'Play deleted' })
  } catch (error) {
    next(error)
  }
})

export default router
