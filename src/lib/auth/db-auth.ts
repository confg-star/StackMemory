import pg from 'pg'
import { localPgConfig } from '@/lib/data-config'

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

export interface DbUser {
  id: string
  username: string
  email: string | null
  password: string | null
  avatar_url: string | null
  settings: Record<string, unknown>
  created_at: Date
  updated_at: Date
}

export async function findUserByEmail(email: string): Promise<DbUser | null> {
  const pool = getPool()
  const normalizedEmail = email.trim().toLowerCase()
  const { rows } = await pool.query(
    'SELECT * FROM profiles WHERE email = $1',
    [normalizedEmail]
  )
  return rows[0] || null
}

export async function findUserById(id: string): Promise<DbUser | null> {
  const pool = getPool()
  const { rows } = await pool.query(
    'SELECT * FROM profiles WHERE id = $1',
    [id]
  )
  return rows[0] || null
}

export async function createUser(email: string, password: string, name: string): Promise<DbUser> {
  const pool = getPool()
  const normalizedEmail = email.trim().toLowerCase()
  const userId = crypto.randomUUID()
  const username = name || normalizedEmail.split('@')[0]

  const { rows } = await pool.query(
    `INSERT INTO profiles (id, username, email, password, settings)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [userId, username, normalizedEmail, password, { mode: 'local_pg' }]
  )
  return rows[0]
}

export async function updateUserPassword(id: string, newPassword: string): Promise<DbUser | null> {
  const pool = getPool()
  const { rows } = await pool.query(
    'UPDATE profiles SET password = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
    [newPassword, id]
  )
  return rows[0] || null
}
