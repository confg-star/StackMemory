export type DataProviderType = 'supabase' | 'local_pg'

export const DATA_PROVIDER = (process.env.DATA_PROVIDER as DataProviderType) || 'supabase'

export const localPgConfig = {
  host: process.env.LOCAL_PG_HOST || 'localhost',
  port: parseInt(process.env.LOCAL_PG_PORT || '5432'),
  database: process.env.LOCAL_PG_DB || 'stackmemory',
  user: process.env.LOCAL_PG_USER || 'stackuser',
  password: process.env.LOCAL_PG_PASSWORD || 'stackpass',
}
