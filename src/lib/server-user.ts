import { DATA_PROVIDER } from '@/lib/data-config'
import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'

export const LOCAL_DEMO_USER_ID =
  process.env.LOCAL_DEMO_USER_ID || '00000000-0000-0000-0000-000000000002'
export const LOCAL_AUTH_USER_COOKIE = 'stackmemory-local-user-id'

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
}

export async function resolveServerUserId(): Promise<{ userId: string | null; error?: string }> {
  if (DATA_PROVIDER === 'local_pg') {
    const cookieStore = await cookies()
    const localUserId = cookieStore.get(LOCAL_AUTH_USER_COOKIE)?.value

    if (!localUserId || !isUuid(localUserId)) {
      return { userId: null, error: '请先登录邮箱账号' }
    }

    return { userId: localUserId }
  }

  const supabase = await createClient()
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    return { userId: null, error: '请先登录' }
  }

  return { userId: user.id }
}
