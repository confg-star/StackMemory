import pg from 'pg'
import { CardRepository, CardWithTags, RouteRepository, Route, RouteTask, RouteTaskRepository, Tag } from './interfaces'
import { localPgConfig } from '../data-config'

const { Pool } = pg

let pool: pg.Pool | null = null

function getPool(): pg.Pool {
  if (!pool) {
    pool = new Pool({
      host: localPgConfig.host,
      port: localPgConfig.port,
      database: localPgConfig.database,
      user: localPgConfig.user,
      password: localPgConfig.password,
    })
  }
  return pool
}

export class LocalPgCardRepository implements CardRepository {
  async getCards(
    userId: string,
    options: { tagId?: string; search?: string; limit?: number; offset?: number; routeId?: string } = {}
  ): Promise<{ cards: CardWithTags[]; total: number }> {
    const pool = getPool()
    const { tagId, search, limit = 50, offset = 0, routeId } = options

    try {
      let whereClause = 'WHERE f.user_id = $1'
      const params: (string | number)[] = [userId]
      let paramIndex = 2

      if (search) {
        whereClause += ` AND (f.question ILIKE $${paramIndex} OR f.answer ILIKE $${paramIndex})`
        params.push(`%${search}%`)
        paramIndex++
      }

      if (tagId) {
        whereClause += ` AND EXISTS (SELECT 1 FROM card_tags ct WHERE ct.card_id = f.id AND ct.tag_id = $${paramIndex})`
        params.push(tagId)
        paramIndex++
      }

      if (routeId) {
        whereClause += ` AND f.route_id = $${paramIndex}`
        params.push(routeId)
        paramIndex++
      }

      const countResult = await pool.query(
        `SELECT COUNT(*) as total FROM flashcards f ${whereClause}`,
        params
      )
      const total = parseInt(countResult.rows[0]?.total || '0')

      const dataQuery = `
        SELECT f.id, f.user_id, f.route_id, f.question, f.answer, f.code_snippet, 
               f.source_url, f.source_title, f.difficulty, 
               f.review_count, f.last_reviewed_at, f.created_at
        FROM flashcards f
        ${whereClause}
        ORDER BY f.created_at DESC
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `
      params.push(limit, offset)

      const { rows: cards } = await pool.query(dataQuery, params)

      const cardsWithTags = await Promise.all(
        cards.map(async (card: Record<string, unknown>) => {
          const tagQuery = `
            SELECT t.id, t.name, t.color
            FROM tags t
            JOIN card_tags ct ON ct.tag_id = t.id
            WHERE ct.card_id = $1
          `
          const { rows: tags } = await pool.query(tagQuery, [card.id])

          return {
            id: card.id as string,
            user_id: card.user_id as string,
            route_id: card.route_id as string | null,
            question: card.question as string,
            answer: card.answer as string,
            code_snippet: card.code_snippet as string | null,
            source_url: card.source_url as string | null,
            source_title: card.source_title as string | null,
            difficulty: card.difficulty as string | null,
            review_count: card.review_count as number | null,
            last_reviewed_at: card.last_reviewed_at as string | null,
            created_at: card.created_at as string,
            tags: tags as Tag[],
          }
        })
      )

      return { cards: cardsWithTags, total }
    } catch (error) {
      console.error('LocalPg getCards error:', error)
      return { cards: [], total: 0 }
    }
  }

  async getCardById(userId: string, cardId: string): Promise<CardWithTags | null> {
    const pool = getPool()

    try {
      const { rows } = await pool.query(
        `SELECT id, user_id, route_id, question, answer, code_snippet, 
                source_url, source_title, difficulty, 
                review_count, last_reviewed_at, created_at
         FROM flashcards WHERE id = $1 AND user_id = $2`,
        [cardId, userId]
      )

      if (rows.length === 0) return null

      const card = rows[0]

      const { rows: tags } = await pool.query(
        `SELECT t.id, t.name, t.color
         FROM tags t
         JOIN card_tags ct ON ct.tag_id = t.id
         WHERE ct.card_id = $1`,
        [cardId]
      )

      return { ...card, tags: tags as Tag[] }
    } catch (error) {
      console.error('LocalPg getCardById error:', error)
      return null
    }
  }

  async saveCards(
    userId: string,
    cards: { question: string; answer: string; codeSnippet?: string | null; sourceUrl?: string | null; routeId?: string | null }[],
    sourceUrl?: string,
    tagIds?: string[]
  ): Promise<{ success: boolean; error?: string }> {
    const pool = getPool()
    const client = await pool.connect()

    try {
      await client.query('BEGIN')

      const cardIds: string[] = []

      for (const card of cards) {
        const { rows } = await client.query(
          `INSERT INTO flashcards (user_id, route_id, question, answer, code_snippet, source_url, is_reviewed, review_count, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, false, 0, NOW())
           RETURNING id`,
          [userId, card.routeId || null, card.question, card.answer, card.codeSnippet || null, sourceUrl || null]
        )

        cardIds.push(rows[0].id)
      }

      if (tagIds && tagIds.length > 0 && cardIds.length > 0) {
        for (const cardId of cardIds) {
          for (const tagId of tagIds) {
            await client.query(
              `INSERT INTO card_tags (card_id, tag_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
              [cardId, tagId]
            )
          }
        }
      }

      await client.query('COMMIT')
      return { success: true }
    } catch (error) {
      await client.query('ROLLBACK')
      console.error('LocalPg saveCards error:', error)
      return { success: false, error: String(error) }
    } finally {
      client.release()
    }
  }

  async deleteCard(userId: string, cardId: string): Promise<{ success: boolean; error?: string }> {
    const pool = getPool()

    try {
      const { rows } = await pool.query(
        'SELECT id FROM flashcards WHERE id = $1 AND user_id = $2',
        [cardId, userId]
      )

      if (rows.length === 0) {
        return { success: false, error: '卡片不存在或无权删除' }
      }

      await pool.query('DELETE FROM card_tags WHERE card_id = $1', [cardId])
      await pool.query('DELETE FROM flashcards WHERE id = $1 AND user_id = $2', [cardId, userId])

      return { success: true }
    } catch (error) {
      console.error('LocalPg deleteCard error:', error)
      return { success: false, error: String(error) }
    }
  }

  async getTags(userId: string): Promise<{ success: boolean; tags?: Tag[]; error?: string }> {
    const pool = getPool()

    try {
      const { rows } = await pool.query(
        `SELECT id, name, color FROM tags 
         WHERE user_id = $1 OR user_id IS NULL 
         ORDER BY name`,
        [userId]
      )

      return { success: true, tags: rows as Tag[] }
    } catch (error) {
      console.error('LocalPg getTags error:', error)
      return { success: false, error: String(error) }
    }
  }

  async getOrCreateTags(userId: string, tagNames: string[]): Promise<string[]> {
    const pool = getPool()
    const tagIds: string[] = []

    for (const tagName of tagNames) {
      const normalizedTag = tagName.toLowerCase().trim()

      const { rows: existing } = await pool.query(
        'SELECT id FROM tags WHERE name = $1 AND user_id = $2',
        [normalizedTag, userId]
      )

      if (existing.length > 0) {
        tagIds.push(existing[0].id)
      } else {
        const { rows: newTag } = await pool.query(
          'INSERT INTO tags (name, user_id) VALUES ($1, $2) RETURNING id',
          [normalizedTag, userId]
        )

        if (newTag.length > 0) {
          tagIds.push(newTag[0].id)
        }
      }
    }

    return tagIds
  }
}

export class LocalPgRouteRepository implements RouteRepository {
  async getRoutes(
    userId: string,
    options: { limit?: number; offset?: number } = {}
  ): Promise<{ routes: Route[]; total: number }> {
    const pool = getPool()
    const { limit = 20, offset = 0 } = options

    try {
      const countResult = await pool.query(
        'SELECT COUNT(*) as total FROM routes WHERE user_id = $1',
        [userId]
      )
      const total = parseInt(countResult.rows[0]?.total || '0')

      const { rows } = await pool.query(
        `SELECT id, user_id, topic, background, goals, weeks, roadmap_data, is_current, created_at, updated_at
         FROM routes WHERE user_id = $1
         ORDER BY updated_at DESC
         LIMIT $2 OFFSET $3`,
        [userId, limit, offset]
      )

      return { routes: rows as Route[], total }
    } catch (error) {
      console.error('LocalPg getRoutes error:', error)
      return { routes: [], total: 0 }
    }
  }

  async getRouteById(userId: string, routeId: string): Promise<Route | null> {
    const pool = getPool()

    try {
      const { rows } = await pool.query(
        `SELECT id, user_id, topic, background, goals, weeks, roadmap_data, is_current, created_at, updated_at
         FROM routes WHERE id = $1 AND user_id = $2`,
        [routeId, userId]
      )

      if (rows.length === 0) return null
      return rows[0] as Route
    } catch (error) {
      console.error('LocalPg getRouteById error:', error)
      return null
    }
  }

  async getCurrentRoute(userId: string): Promise<Route | null> {
    const pool = getPool()

    try {
      const { rows } = await pool.query(
        `SELECT id, user_id, topic, background, goals, weeks, roadmap_data, is_current, created_at, updated_at
         FROM routes WHERE user_id = $1 AND is_current = true`,
        [userId]
      )

      if (rows.length === 0) return null
      return rows[0] as Route
    } catch (error) {
      console.error('LocalPg getCurrentRoute error:', error)
      return null
    }
  }

  async createRoute(
    userId: string,
    data: {
      topic: string
      background?: string
      goals?: string
      weeks?: number
      roadmapData?: Record<string, unknown>
    }
  ): Promise<{ success: boolean; route?: Route; error?: string }> {
    const pool = getPool()
    const client = await pool.connect()

    try {
      await client.query('BEGIN')

      const { rows } = await client.query(
        `INSERT INTO routes (user_id, topic, background, goals, weeks, roadmap_data, is_current)
         VALUES ($1, $2, $3, $4, $5, $6, false)
         RETURNING id, user_id, topic, background, goals, weeks, roadmap_data, is_current, created_at, updated_at`,
        [
          userId,
          data.topic,
          data.background || null,
          data.goals || null,
          data.weeks || 4,
          data.roadmapData ? JSON.stringify(data.roadmapData) : null,
        ]
      )

      await client.query('COMMIT')
      return { success: true, route: rows[0] as Route }
    } catch (error) {
      await client.query('ROLLBACK')
      console.error('LocalPg createRoute error:', error)
      return { success: false, error: String(error) }
    } finally {
      client.release()
    }
  }

  async switchRoute(userId: string, routeId: string): Promise<{ success: boolean; error?: string }> {
    const pool = getPool()
    const client = await pool.connect()

    try {
      await client.query('BEGIN')

      const { rows: existing } = await client.query(
        'SELECT id FROM routes WHERE id = $1 AND user_id = $2',
        [routeId, userId]
      )

      if (existing.length === 0) {
        await client.query('ROLLBACK')
        return { success: false, error: '路线不存在或无权操作' }
      }

      await client.query(
        'UPDATE routes SET is_current = false WHERE user_id = $1',
        [userId]
      )

      await client.query(
        'UPDATE routes SET is_current = true, updated_at = NOW() WHERE id = $1 AND user_id = $2',
        [routeId, userId]
      )

      await client.query('COMMIT')
      return { success: true }
    } catch (error) {
      await client.query('ROLLBACK')
      console.error('LocalPg switchRoute error:', error)
      return { success: false, error: String(error) }
    } finally {
      client.release()
    }
  }
}

export class LocalPgRouteTaskRepository implements RouteTaskRepository {
  async getTasksByRoute(userId: string, routeId: string): Promise<RouteTask[]> {
    const pool = getPool()

    try {
      const { rows } = await pool.query(
        `SELECT id, route_id, user_id, task_id, title, task_type, status, week, day, completed_at, created_at, updated_at
         FROM route_tasks
         WHERE user_id = $1 AND route_id = $2
         ORDER BY week ASC, day ASC`,
        [userId, routeId]
      )

      return rows as RouteTask[]
    } catch (error) {
      console.error('LocalPg getTasksByRoute error:', error)
      return []
    }
  }

  async getCurrentRouteTasks(userId: string): Promise<RouteTask[]> {
    const pool = getPool()

    try {
      const { rows } = await pool.query(
        `SELECT rt.id, rt.route_id, rt.user_id, rt.task_id, rt.title, rt.task_type, rt.status, rt.week, rt.day, rt.completed_at, rt.created_at, rt.updated_at
         FROM route_tasks rt
         JOIN routes r ON r.id = rt.route_id
         WHERE rt.user_id = $1 AND r.is_current = true
         ORDER BY rt.week ASC, rt.day ASC`,
        [userId]
      )

      return rows as RouteTask[]
    } catch (error) {
      console.error('LocalPg getCurrentRouteTasks error:', error)
      return []
    }
  }

  async updateTaskStatus(
    userId: string,
    routeId: string,
    taskId: string,
    status: 'pending' | 'in_progress' | 'completed'
  ): Promise<{ success: boolean; error?: string }> {
    const pool = getPool()
    const client = await pool.connect()

    try {
      await client.query('BEGIN')

      const { rows: existing } = await client.query(
        'SELECT id FROM route_tasks WHERE route_id = $1 AND task_id = $2 AND user_id = $3',
        [routeId, taskId, userId]
      )

      if (existing.length === 0) {
        await client.query('ROLLBACK')
        return { success: false, error: '任务不存在或无权操作' }
      }

      const completedAt = status === 'completed' ? 'NOW()' : 'NULL'

      await client.query(
        `UPDATE route_tasks 
         SET status = $1, completed_at = ${completedAt === 'NULL' ? 'NULL' : 'NOW()'}, updated_at = NOW()
         WHERE route_id = $2 AND task_id = $3 AND user_id = $4`,
        [status, routeId, taskId, userId]
      )

      await client.query('COMMIT')
      return { success: true }
    } catch (error) {
      await client.query('ROLLBACK')
      console.error('LocalPg updateTaskStatus error:', error)
      return { success: false, error: String(error) }
    } finally {
      client.release()
    }
  }

  async initializeRouteTasks(
    userId: string,
    routeId: string,
    tasks: {
      task_id: string
      title: string
      task_type?: string
      week?: number
      day?: number
    }[]
  ): Promise<{ success: boolean; error?: string }> {
    const pool = getPool()
    const client = await pool.connect()

    try {
      await client.query('BEGIN')

      for (const task of tasks) {
        await client.query(
          `INSERT INTO route_tasks (route_id, user_id, task_id, title, task_type, status, week, day)
           VALUES ($1, $2, $3, $4, $5, 'pending', $6, $7)
           ON CONFLICT (route_id, task_id) DO NOTHING`,
          [routeId, userId, task.task_id, task.title, task.task_type || null, task.week || null, task.day || null]
        )
      }

      await client.query('COMMIT')
      return { success: true }
    } catch (error) {
      await client.query('ROLLBACK')
      console.error('LocalPg initializeRouteTasks error:', error)
      return { success: false, error: String(error) }
    } finally {
      client.release()
    }
  }
}
