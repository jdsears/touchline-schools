import pool from '../config/database.js'
import Anthropic from '@anthropic-ai/sdk'
import fs from 'fs'
import dotenv from 'dotenv'

dotenv.config()

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

// Categories for coaching knowledge
const CATEGORIES = {
  COACHING_GUIDELINES: 'coaching_guidelines',
  SESSION_PLANS: 'session_plans',
  PLAYER_DEVELOPMENT: 'player_development',
  TACTICAL: 'tactical',
  MATCH_PREP: 'match_prep',
  OBSERVATIONS: 'observations',
  SAFEGUARDING: 'safeguarding',
  GENERAL: 'general',
}

// Maximum chunk size in characters (~500 words)
const MAX_CHUNK_SIZE = 2000
// Overlap between chunks for context continuity
const CHUNK_OVERLAP = 200

/**
 * Split text into chunks with overlap, respecting paragraph boundaries
 */
function chunkText(text, maxSize = MAX_CHUNK_SIZE, overlap = CHUNK_OVERLAP) {
  if (!text || text.length <= maxSize) {
    return [text]
  }

  const chunks = []
  const paragraphs = text.split(/\n\n+/)
  let currentChunk = ''

  for (const paragraph of paragraphs) {
    // If a single paragraph exceeds max size, split by sentences
    if (paragraph.length > maxSize) {
      if (currentChunk) {
        chunks.push(currentChunk.trim())
        currentChunk = ''
      }
      const sentences = paragraph.match(/[^.!?]+[.!?]+/g) || [paragraph]
      let sentenceChunk = ''
      for (const sentence of sentences) {
        if ((sentenceChunk + sentence).length > maxSize && sentenceChunk) {
          chunks.push(sentenceChunk.trim())
          // Keep overlap from previous chunk
          const overlapText = sentenceChunk.slice(-overlap)
          sentenceChunk = overlapText + sentence
        } else {
          sentenceChunk += sentence
        }
      }
      if (sentenceChunk) {
        currentChunk = sentenceChunk
      }
      continue
    }

    if ((currentChunk + '\n\n' + paragraph).length > maxSize && currentChunk) {
      chunks.push(currentChunk.trim())
      // Keep overlap from previous chunk
      const overlapText = currentChunk.slice(-overlap)
      currentChunk = overlapText + '\n\n' + paragraph
    } else {
      currentChunk = currentChunk ? currentChunk + '\n\n' + paragraph : paragraph
    }
  }

  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim())
  }

  return chunks
}

/**
 * Use Claude to extract metadata tags from a chunk of coaching content
 */
async function extractChunkMetadata(content, documentTitle, documentCategory) {
  try {
    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 256,
      system: 'You extract metadata from coaching content. Respond ONLY with valid JSON.',
      messages: [{
        role: 'user',
        content: `Extract metadata from this coaching content chunk. Return JSON with:
- "tags": array of 2-5 relevant tags (e.g. "passing", "pressing", "warm-up", "U13", "defending", "set pieces", "player welfare")
- "skill_focus": primary skill or topic (e.g. "passing and receiving", "defensive shape", "player wellbeing") or null
- "session_type": if applicable, one of "training", "match_prep", "review", "development" or null
- "age_group": if a specific age group is mentioned (e.g. "U13", "U10") or null

Document title: "${documentTitle}"
Document category: "${documentCategory}"

Content:
${content.slice(0, 1000)}`
      }]
    })

    const text = response.content[0].text
    // Extract JSON from response
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0])
    }
    return { tags: [], skill_focus: null, session_type: null, age_group: null }
  } catch (error) {
    console.error('Metadata extraction failed:', error.message)
    return { tags: [], skill_focus: null, session_type: null, age_group: null }
  }
}

/**
 * Ingest a text document into the knowledge base
 */
export async function ingestDocument({
  teamId,
  uploadedBy,
  title,
  description,
  content,
  sourceType = 'manual',
  category = 'general',
  ageGroup = null,
  tags = [],
  filePath = null,
  originalFilename = null,
  fileType = null,
  fileSize = null,
}) {
  const client = await pool.connect()

  try {
    await client.query('BEGIN')

    // Create the document record
    const docResult = await client.query(
      `INSERT INTO knowledge_base_documents
        (team_id, uploaded_by, title, description, source_type, file_path, original_filename, file_type, file_size, tags, age_group, category, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 'processing')
       RETURNING *`,
      [teamId, uploadedBy, title, description, sourceType, filePath, originalFilename, fileType, fileSize, tags, ageGroup, category]
    )

    const document = docResult.rows[0]

    // Chunk the content
    const chunks = chunkText(content)

    // Process each chunk
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i]

      // Extract metadata for the chunk (batch with rate limiting consideration)
      const metadata = await extractChunkMetadata(chunk, title, category)

      // Combine document-level and chunk-level tags
      const chunkTags = [...new Set([...tags, ...(metadata.tags || [])])]

      await client.query(
        `INSERT INTO knowledge_base_chunks
          (document_id, team_id, content, chunk_index, tags, age_group, category, session_type, skill_focus, search_vector)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, to_tsvector('english', $3))`,
        [
          document.id,
          teamId,
          chunk,
          i,
          chunkTags,
          metadata.age_group || ageGroup,
          metadata.session_type ? metadata.session_type : category,
          metadata.session_type,
          metadata.skill_focus,
        ]
      )
    }

    // Update document status and chunk count
    await client.query(
      `UPDATE knowledge_base_documents
       SET status = 'ready', chunk_count = $1, updated_at = NOW()
       WHERE id = $2`,
      [chunks.length, document.id]
    )

    await client.query('COMMIT')

    return { ...document, chunk_count: chunks.length, status: 'ready' }
  } catch (error) {
    await client.query('ROLLBACK')
    console.error('Knowledge base ingestion error:', error)
    throw error
  } finally {
    client.release()
  }
}

/**
 * Read text content from an uploaded file
 */
export function readFileContent(filePath, fileType) {
  if (!filePath || !fs.existsSync(filePath)) {
    return null
  }

  // Only support text-based files for now
  const textTypes = ['text/plain', 'text/csv', 'text/markdown']
  if (textTypes.includes(fileType)) {
    return fs.readFileSync(filePath, 'utf-8')
  }

  return null
}

/**
 * Search the knowledge base for relevant chunks
 * Uses PostgreSQL full-text search + metadata filtering
 */
export async function searchKnowledgeBase({
  teamId,
  query,
  ageGroup = null,
  category = null,
  tags = [],
  limit = 5,
}) {
  // Build the search query with tsvector ranking
  const tsQuery = query
    .split(/\s+/)
    .filter(word => word.length > 2)
    .map(word => word.replace(/[^a-zA-Z0-9]/g, ''))
    .filter(Boolean)
    .join(' | ')

  if (!tsQuery) {
    return []
  }

  let sql = `
    SELECT
      c.id,
      c.content,
      c.tags,
      c.age_group,
      c.category,
      c.session_type,
      c.skill_focus,
      d.title as document_title,
      d.source_type,
      ts_rank(c.search_vector, to_tsquery('english', $2)) as rank
    FROM knowledge_base_chunks c
    JOIN knowledge_base_documents d ON c.document_id = d.id
    WHERE c.team_id = $1
      AND d.status = 'ready'
      AND c.search_vector @@ to_tsquery('english', $2)
  `

  const params = [teamId, tsQuery]
  let paramIndex = 3

  if (ageGroup) {
    sql += ` AND (c.age_group = $${paramIndex} OR c.age_group IS NULL)`
    params.push(ageGroup)
    paramIndex++
  }

  if (category) {
    sql += ` AND c.category = $${paramIndex}`
    params.push(category)
    paramIndex++
  }

  if (tags.length > 0) {
    sql += ` AND c.tags && $${paramIndex}`
    params.push(tags)
    paramIndex++
  }

  sql += ` ORDER BY rank DESC LIMIT $${paramIndex}`
  params.push(limit)

  try {
    const result = await pool.query(sql, params)
    return result.rows
  } catch (error) {
    console.error('Knowledge base search error:', error)
    return []
  }
}

/**
 * Formulate sub-queries from a coaching question to improve retrieval
 */
export async function formulateSubQueries(message, teamContext = {}) {
  try {
    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 256,
      system: 'You help break down coaching questions into search queries. Respond ONLY with valid JSON.',
      messages: [{
        role: 'user',
        content: `Break this coaching question into 2-3 search sub-queries to find relevant coaching knowledge. Consider the team context.

Question: "${message}"
${teamContext.ageGroup ? `Age group: ${teamContext.ageGroup}` : ''}
${teamContext.formation ? `Formation: ${teamContext.formation}` : ''}

Return JSON: {"queries": ["query1", "query2", "query3"], "category": "one of: coaching_guidelines, session_plans, player_development, tactical, match_prep, observations, safeguarding, general or null", "tags": ["relevant", "tags"]}`
      }]
    })

    const text = response.content[0].text
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0])
    }
    return { queries: [message], category: null, tags: [] }
  } catch (error) {
    console.error('Sub-query formulation failed:', error.message)
    return { queries: [message], category: null, tags: [] }
  }
}

/**
 * Retrieve relevant knowledge base context for a coaching query
 * This is the main entry point used by The Gaffer's chat flow
 */
export async function retrieveCoachingContext({
  teamId,
  message,
  ageGroup = null,
  limit = 5,
}) {
  try {
    // Check if the team has any knowledge base documents
    const countResult = await pool.query(
      'SELECT COUNT(*) as count FROM knowledge_base_documents WHERE team_id = $1 AND status = $2',
      [teamId, 'ready']
    )

    if (parseInt(countResult.rows[0].count) === 0) {
      return null
    }

    // Formulate sub-queries for better retrieval
    const { queries, category, tags } = await formulateSubQueries(message, { ageGroup })

    // Search with each sub-query and deduplicate results
    const allResults = new Map()

    for (const query of queries) {
      const results = await searchKnowledgeBase({
        teamId,
        query,
        ageGroup,
        category,
        tags,
        limit: 3,
      })

      for (const result of results) {
        if (!allResults.has(result.id)) {
          allResults.set(result.id, result)
        }
      }
    }

    // Sort by rank and take top results
    const sortedResults = Array.from(allResults.values())
      .sort((a, b) => b.rank - a.rank)
      .slice(0, limit)

    if (sortedResults.length === 0) {
      return null
    }

    // Format retrieved context for injection into The Gaffer's prompt
    const contextParts = sortedResults.map((r, i) => {
      const source = r.document_title || 'Coaching Resource'
      return `[Source: ${source}${r.skill_focus ? ` | Focus: ${r.skill_focus}` : ''}${r.age_group ? ` | Age: ${r.age_group}` : ''}]\n${r.content}`
    })

    return {
      context: contextParts.join('\n\n---\n\n'),
      sources: sortedResults.map(r => ({
        title: r.document_title,
        category: r.category,
        relevance: r.rank,
      })),
      chunkCount: sortedResults.length,
    }
  } catch (error) {
    console.error('Knowledge base retrieval error:', error)
    return null
  }
}

/**
 * Get all documents for a team
 */
export async function getDocuments(teamId) {
  const result = await pool.query(
    `SELECT d.*, u.name as uploaded_by_name
     FROM knowledge_base_documents d
     LEFT JOIN users u ON d.uploaded_by = u.id
     WHERE d.team_id = $1
     ORDER BY d.created_at DESC`,
    [teamId]
  )
  return result.rows
}

/**
 * Get a single document with its chunks
 */
export async function getDocument(documentId, teamId) {
  const docResult = await pool.query(
    `SELECT d.*, u.name as uploaded_by_name
     FROM knowledge_base_documents d
     LEFT JOIN users u ON d.uploaded_by = u.id
     WHERE d.id = $1 AND d.team_id = $2`,
    [documentId, teamId]
  )

  if (docResult.rows.length === 0) {
    return null
  }

  const chunksResult = await pool.query(
    `SELECT id, content, chunk_index, tags, age_group, category, session_type, skill_focus
     FROM knowledge_base_chunks
     WHERE document_id = $1
     ORDER BY chunk_index`,
    [documentId]
  )

  return {
    ...docResult.rows[0],
    chunks: chunksResult.rows,
  }
}

/**
 * Delete a document and its chunks (cascade)
 */
export async function deleteDocument(documentId, teamId) {
  const result = await pool.query(
    'DELETE FROM knowledge_base_documents WHERE id = $1 AND team_id = $2 RETURNING id',
    [documentId, teamId]
  )
  return result.rows.length > 0
}

/**
 * Get knowledge base stats for a team
 */
export async function getKnowledgeBaseStats(teamId) {
  const result = await pool.query(
    `SELECT
      COUNT(DISTINCT d.id) as document_count,
      COALESCE(SUM(d.chunk_count), 0) as total_chunks,
      array_agg(DISTINCT d.category) FILTER (WHERE d.category IS NOT NULL) as categories
     FROM knowledge_base_documents d
     WHERE d.team_id = $1 AND d.status = 'ready'`,
    [teamId]
  )
  return result.rows[0]
}

/**
 * Auto-seed a team's knowledge base with age-appropriate FA development guidelines.
 * Called on team creation and when age group changes.
 * Replaces any previous auto-seeded FA guidelines for this team.
 */
export async function seedFAGuidelines(teamId, ageGroup) {
  if (!ageGroup) return null

  const ag = ageGroup.toLowerCase().replace(/[^0-9u]/g, '')
  const num = parseInt(ag.replace('u', ''))
  if (isNaN(num)) return null

  // Remove any previously auto-seeded FA guidelines for this team
  try {
    await pool.query(
      `DELETE FROM knowledge_base_documents WHERE team_id = $1 AND source_type = 'fa_guidelines'`,
      [teamId]
    )
  } catch (error) {
    console.error('Error removing old FA guidelines:', error.message)
  }

  // Build age-appropriate content
  const { title, content } = buildFAGuidelinesContent(num)

  try {
    const result = await ingestDocument({
      teamId,
      uploadedBy: null,
      title,
      description: `Automatically populated FA development guidelines for ${ageGroup} teams. This content is updated when your team's age group changes.`,
      content,
      sourceType: 'fa_guidelines',
      category: 'coaching_guidelines',
      ageGroup: ageGroup,
      tags: ['FA', 'development', 'guidelines', ageGroup],
    })
    console.log(`FA guidelines seeded for team ${teamId} (${ageGroup})`)
    return result
  } catch (error) {
    console.error('Error seeding FA guidelines:', error.message)
    return null
  }
}

function buildFAGuidelinesContent(ageNum) {
  // Common FA principles that apply to all age groups
  const commonPrinciples = `
## FA Coaching Principles

- **70-30 ratio**: Ball-rolling time vs standing/talking time — players should be active for at least 70% of the session
- **Game-realistic practices**: No static line drills. Everything should relate to real game situations
- **Teaching Games for Understanding (TGfU)**: Game-based learning, not drill-based
- **Ask more than tell**: Coaches should use guided discovery and ask questions rather than dictating
- **Whisper more than shout**: Calm, positive coaching environment
- **Player-centred approach**: Empower individuals, develop the whole person
- **The FA Four Corner Model**: Every session should consider Technical/Tactical, Physical, Psychological, and Social development

## England DNA — Player-Centred Philosophy

- Foundation Phase: "Power of Play" — developing young players through enjoyment
- Athlete-centred coaching: empower players, develop the whole person
- Four Corner Model: Technical/Tactical, Physical, Psychological, Social
- Coaching methodology: more questions than answers, game-based learning, 70-30 active ratio

## FA Respect & The Grassroots Code

Five pillars: Enjoy the Game, Give Respect, Be Inclusive, Work Together, Play Safe
- Only team captains may approach match officials (Captains Only Protocol)
- Parents must: remember children play for FUN, applaud effort not just success, respect officials, let the coach coach, never criticise a child for making a mistake (mistakes = learning)

## FA Safeguarding Requirements

- DBS Checks mandatory for anyone 16+ in unsupervised role with under-18s (valid 36 months)
- Club Welfare Officer (CWO) is a mandatory role
- No anonymous messaging between adults and minors
- All coaching interactions should be transparent and safeguarding-aware

## FA Heading Rules (Youth Football)

- No deliberate heading in matches for U7–U11 (phased introduction 2024-2027)
- Heading reintroduced at U12 (secondary school transition)
- Infringement: indirect free kick at the point of the deliberate header
`

  if (ageNum <= 6) {
    return {
      title: `FA Development Guidelines — Foundation Phase (U${ageNum})`,
      content: `# FA Development Guidelines — Foundation Phase (U${ageNum})

## Development Phase: Foundation Phase (U5–U11) — "The Play Phase"

This is the most critical stage: a child's relationship with football is formed here.

### Key Principles for U${ageNum}

- **The FA strictly prohibits ANY competitive matches** (including friendlies and tournaments) for U6 and below (FA Rule 8(C))
- Emphasis: FUN, participation, maximising touches on the ball
- Development over results. Success = retention and enjoyment, NOT trophies
- Children are NOT small adults — sessions must be age-specific, not simplified adult football

### Session Guidelines

- Sessions: play, movement (ABC — Agility, Balance, Coordination), skills-based training games
- Format: Fun games, 1v1, 2v1, 2v2, 3v3 in carousel/station format
- Session length: 30–45 minutes maximum
- Coach approach: join in, demonstrate, make it a game — zero tactical instruction
- NO tactical instruction, NO positional play, NO formations
- EVERY session must be fun — if children are not smiling, change the activity
- No heading of any kind
- Focus: falling in love with the ball, confidence, basic movement skills

### Working with Parents

- Parents should be welcomed and encouraged to play alongside their children
- Focus entirely on enjoyment — scores and results are irrelevant at this age
- Celebrate effort, smiles, and participation

## FA FutureFit — Format Changes from 2026-27 Season

- U7: 3v3 (new entry format, was 5v5)
- U8-U9: 5v5
- U10-U11: 7v7
- U12-U13: 9v9
- U14+: 11v11
- Principle: children play smaller formats for longer, more touches, more fun
${commonPrinciples}`,
    }
  }

  if (ageNum <= 8) {
    return {
      title: `FA Development Guidelines — Foundation Phase (U${ageNum})`,
      content: `# FA Development Guidelines — Foundation Phase (U${ageNum})

## Development Phase: Foundation Phase (U5–U11) — "The Play Phase"

### Match Format for U${ageNum}: Mini Soccer (5v5, or 3v3 under FutureFit)

- Pitch: 40×30 yards. Goals: 12ft×6ft. Ball: size 3. Match: 20 min halves
- No league tables or published results — results genuinely do not matter
- No deliberate heading (indirect free kick if infringed)
- Pass-in/dribble-in replaces throw-in (from 2024-25 season)
- Unlimited rolling substitutions — every player should get equal time
- Trophy events: max 2 weekends per season, 40-minute max playing duration

### Session & Coaching Focus

- Coaching focus: dribbling, turning, 1v1 confidence, having fun with the ball
- Let them play — minimal stoppages, no positional rigidity
- Training: fun games, small-sided games (1v1, 2v2, 3v3), skills challenges
- NO complex tactics. Simple principles only: "can you dribble past them?", "where's the space?"

### Working with Parents

- Reassure that scores and results do not matter at this age
- Celebrate effort and enjoyment over outcomes
- Children play for FUN — applaud effort, not just success

## FA FutureFit — Format Changes from 2026-27 Season

- U7: 3v3 (new entry format, was 5v5)
- U8-U9: 5v5
- U10-U11: 7v7
- U12-U13: 9v9
- U14+: 11v11
- Principle: children play smaller formats for longer, more touches, more fun
${commonPrinciples}`,
    }
  }

  if (ageNum <= 10) {
    return {
      title: `FA Development Guidelines — Foundation Phase (U${ageNum})`,
      content: `# FA Development Guidelines — Foundation Phase (U${ageNum})

## Development Phase: Foundation Phase (U5–U11) — "The Play Phase"

### Match Format for U${ageNum}: Mini Soccer (7v7, or 5v5 under FutureFit)

- Pitch: 60×40 yards. Goals: 12ft×6ft. Ball: size 3. Match: 25 min halves
- Still fun-focused with maximum game time for all players
- No deliberate heading at U9 (indirect free kick). U10 heading ban from 2025-26.

### Session & Coaching Focus

- Begin introducing: basic width, support play, simple passing combinations
- Technical focus: passing, receiving, dribbling under light pressure, shooting
- Let players explore positions — don't lock them into fixed roles yet
- Training: small-sided games (3v3, 4v4, 5v5), fun technical challenges
- Minimal tactical instruction — guide through questions, not commands
- Development is the priority, results are secondary

## FA FutureFit — Format Changes from 2026-27 Season

- U7: 3v3 (new entry format, was 5v5)
- U8-U9: 5v5
- U10-U11: 7v7
- U12-U13: 9v9
- U14+: 11v11
- Principle: children play smaller formats for longer, more touches, more fun
${commonPrinciples}`,
    }
  }

  if (ageNum <= 12) {
    return {
      title: `FA Development Guidelines — Youth Development Phase (U${ageNum})`,
      content: `# FA Development Guidelines — Youth Development Phase (U${ageNum})

## Development Phase: Youth Development Phase (U12–U16)

The game begins to resemble 11-a-side with tactical concepts (shape, formations, positional roles). Results and league tables may be published from U12. Greater tactical depth, but development still prioritised over winning.

### Match Format for U${ageNum}: 9v9 (or 7v7 under FutureFit for U10-11)

- Pitch: 80×50 yards. Goals: 16ft×7ft. Ball: size 4. Match: 30 min halves
- Offside rule introduced at U11
- Heading reintroduced at U12 with gradual integration
- Players beginning to understand positions, basic shape, simple tactical concepts

### Session & Coaching Focus

- Development focus: decision-making, positional awareness, understanding space
- Still prioritise development over results — growth spurts affect performance
- Training: game-realistic practices, guided discovery, positional play introduction
- The FA Four Corner Model: balance Technical, Physical, Psychological, Social development
- Be aware of relative age effect and early/late developers

## FA FutureFit — Format Changes from 2026-27 Season

- U7: 3v3 (new entry format, was 5v5)
- U8-U9: 5v5
- U10-U11: 7v7
- U12-U13: 9v9
- U14+: 11v11
- Principle: children play smaller formats for longer, more touches, more fun
${commonPrinciples}`,
    }
  }

  // U13+
  return {
    title: `FA Development Guidelines — Youth Development Phase (U${ageNum})`,
    content: `# FA Development Guidelines — Youth Development Phase (U${ageNum})

## Development Phase: Youth Development Phase (U12–U16)

### Match Format for U${ageNum}: 11v11

- Full-size pitch and goals. Ball: size 5. Match: ${ageNum <= 14 ? '35' : '40'} min halves
- Tactical development: formations, pressing, transitions, set pieces
- Physical development considerations: growth spurts, relative age effect
- Mental resilience: coping with pressure, competitive environment

### Session & Coaching Focus

- Tactical development appropriate: formations, pressing, transitions, set pieces
- Physical development: be aware of growth spurts, Peak Height Velocity, and injury risk
- Mental resilience: coping with pressure, competitive environment, dealing with setbacks
- Relative age effect: some players may be 11 months older/younger than peers
- The FA Four Corner Model remains central: Technical/Tactical, Physical, Psychological, Social
- Development still matters — avoid win-at-all-costs mentality
- Encourage players to play multiple positions to build understanding
- Substitution strategies — equal playing time for younger age groups (FA guidance)

## FA FutureFit — Format Changes from 2026-27 Season

- U7: 3v3 (new entry format, was 5v5)
- U8-U9: 5v5
- U10-U11: 7v7
- U12-U13: 9v9
- U14+: 11v11
- Principle: children play smaller formats for longer, more touches, more fun
${commonPrinciples}`,
  }
}

export { CATEGORIES }
