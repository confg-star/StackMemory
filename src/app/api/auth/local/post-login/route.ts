import { NextResponse } from 'next/server'
import pg from 'pg'
import { localPgConfig } from '@/lib/data-config'
import { LOCAL_DEMO_USER_ID, resolveServerUserId } from '@/lib/server-user'

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

export async function POST() {
  try {
    const { userId, error } = await resolveServerUserId()
    if (!userId) {
      return NextResponse.json({ success: false, error: error || '请先登录' }, { status: 401 })
    }

    const client = await getPool().connect()
    try {
      await client.query('BEGIN')

      const username = `user_${userId.slice(0, 8)}`
      await client.query(
        `INSERT INTO profiles (id, username, settings)
         VALUES ($1, $2, '{"mode":"local_pg"}'::jsonb)
         ON CONFLICT (id) DO NOTHING`,
        [userId, username]
      )

      if (userId !== LOCAL_DEMO_USER_ID) {
        const currentRouteCount = await client.query(
          'SELECT COUNT(*)::int AS count FROM routes WHERE user_id = $1',
          [userId]
        )
        const currentHasRoutes = (currentRouteCount.rows[0]?.count || 0) > 0

        if (!currentHasRoutes) {
          await client.query('UPDATE routes SET user_id = $1 WHERE user_id = $2', [userId, LOCAL_DEMO_USER_ID])
          await client.query('UPDATE route_tasks SET user_id = $1 WHERE user_id = $2', [userId, LOCAL_DEMO_USER_ID])
          await client.query('UPDATE flashcards SET user_id = $1 WHERE user_id = $2', [userId, LOCAL_DEMO_USER_ID])
          await client.query('UPDATE tags SET user_id = $1 WHERE user_id = $2', [userId, LOCAL_DEMO_USER_ID])

          const demoRouteCount = await client.query('SELECT COUNT(*)::int AS count FROM routes WHERE user_id = $1', [LOCAL_DEMO_USER_ID])
          const demoCardCount = await client.query('SELECT COUNT(*)::int AS count FROM flashcards WHERE user_id = $1', [LOCAL_DEMO_USER_ID])
          const demoTagCount = await client.query('SELECT COUNT(*)::int AS count FROM tags WHERE user_id = $1', [LOCAL_DEMO_USER_ID])

          if ((demoRouteCount.rows[0]?.count || 0) === 0 && (demoCardCount.rows[0]?.count || 0) === 0 && (demoTagCount.rows[0]?.count || 0) === 0) {
            await client.query('DELETE FROM profiles WHERE id = $1', [LOCAL_DEMO_USER_ID])
          }
        }
      }

      await client.query('COMMIT')
      return NextResponse.json({ success: true })
    } catch (dbError) {
      await client.query('ROLLBACK')
      console.error('post-login migrate failed:', dbError)
      return NextResponse.json({ success: false, error: '登录后数据准备失败' }, { status: 500 })
    } finally {
      client.release()
    }
  } catch (error) {
    console.error('post-login route failed:', error)
    return NextResponse.json({ success: false, error: '登录后处理失败' }, { status: 500 })
  }
}
