import type { LocalUser } from './client-auth'
import { getStoredUser, setStoredUser, hasLocalAuth } from './client-auth'

export { getStoredUser, setStoredUser, hasLocalAuth }
export type { LocalUser }

export const LOCAL_AUTH_USER_COOKIE = 'stackmemory-local-user-id'

export async function localSignUp(email: string, password: string, name: string): Promise<{ success: boolean; error?: string; user?: LocalUser }> {
  const normalizedEmail = email.trim().toLowerCase()
  
  if (password.length < 6) {
    return { success: false, error: '密码至少需要 6 个字符' }
  }

  try {
    const response = await fetch('/api/auth/local', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: normalizedEmail,
        password,
        name,
        action: 'register',
      }),
    })

    const result = await response.json()

    if (!result.success) {
      return { success: false, error: result.error }
    }

    const localUser: LocalUser = {
      id: result.user.id,
      email: result.user.email,
      name: result.user.name,
      createdAt: result.user.createdAt,
    }

    setStoredUser(localUser)
    return { success: true, user: localUser }
  } catch (error) {
    console.error('注册失败:', error)
    return { success: false, error: '注册失败，请稍后重试' }
  }
}

export async function localSignIn(email: string, password: string): Promise<{ success: boolean; error?: string; user?: LocalUser }> {
  const normalizedEmail = email.trim().toLowerCase()
  
  try {
    const response = await fetch('/api/auth/local', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: normalizedEmail,
        password,
        action: 'login',
      }),
    })

    const result = await response.json()

    if (!result.success) {
      return { success: false, error: result.error }
    }

    const localUser: LocalUser = {
      id: result.user.id,
      email: result.user.email,
      name: result.user.name,
      createdAt: result.user.createdAt,
    }

    setStoredUser(localUser)
    return { success: true, user: localUser }
  } catch (error) {
    console.error('登录失败:', error)
    return { success: false, error: '登录失败，请稍后重试' }
  }
}

export function localSignOut(): { success: boolean } {
  setStoredUser(null)
  return { success: true }
}
