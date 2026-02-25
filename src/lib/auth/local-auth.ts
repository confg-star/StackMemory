export interface LocalUser {
  id: string
  email: string
  name: string
  createdAt: string
}

export interface AuthState {
  user: LocalUser | null
  isAuthenticated: boolean
}

const USERS_KEY = 'stackmemory-users'
const CURRENT_USER_KEY = 'stackmemory-current-user'
export const LOCAL_AUTH_USER_COOKIE = 'stackmemory-local-user-id'

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
}

function generateId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }

  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

function normalizeUserId(user: LocalUser): LocalUser {
  if (isUuid(user.id)) return user
  return {
    ...user,
    id: generateId(),
  }
}

function getUsers(): Record<string, { password: string; user: LocalUser }> {
  if (typeof window === 'undefined') return {}
  try {
    const saved = localStorage.getItem(USERS_KEY)
    return saved ? JSON.parse(saved) : {}
  } catch {
    return {}
  }
}

function saveUsers(users: Record<string, { password: string; user: LocalUser }>) {
  if (typeof window === 'undefined') return
  localStorage.setItem(USERS_KEY, JSON.stringify(users))
}

export function getStoredUser(): LocalUser | null {
  if (typeof window === 'undefined') return null
  try {
    const saved = localStorage.getItem(CURRENT_USER_KEY)
    if (!saved) return null
    const parsed = JSON.parse(saved) as LocalUser
    const normalized = normalizeUserId(parsed)
    if (normalized.id !== parsed.id) {
      localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(normalized))
      const users = getUsers()
      const record = users[normalized.email]
      if (record) {
        users[normalized.email] = {
          ...record,
          user: normalized,
        }
        saveUsers(users)
      }
    }
    return normalized
  } catch {
    return null
  }
}

export function setStoredUser(user: LocalUser | null) {
  if (typeof window === 'undefined') return
  if (user) {
    localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user))
  } else {
    localStorage.removeItem(CURRENT_USER_KEY)
  }
}

export function localSignUp(email: string, password: string, name: string): { success: boolean; error?: string; user?: LocalUser } {
  const users = getUsers()
  const normalizedEmail = email.trim().toLowerCase()
  
  if (users[normalizedEmail]) {
    return { success: false, error: '该邮箱已被注册' }
  }

  if (password.length < 6) {
    return { success: false, error: '密码至少需要 6 个字符' }
  }

  const user: LocalUser = {
    id: generateId(),
    email: normalizedEmail,
    name: name || normalizedEmail.split('@')[0],
    createdAt: new Date().toISOString()
  }

  users[normalizedEmail] = { password, user }
  saveUsers(users)

  return { success: true, user }
}

export function localSignIn(email: string, password: string): { success: boolean; error?: string; user?: LocalUser } {
  const users = getUsers()
  const normalizedEmail = email.trim().toLowerCase()
  
  const record = users[normalizedEmail]
  if (!record) {
    return { success: false, error: '邮箱或密码错误' }
  }

  if (record.password !== password) {
    return { success: false, error: '邮箱或密码错误' }
  }

  const normalizedUser = normalizeUserId(record.user)
  if (normalizedUser.id !== record.user.id) {
    users[normalizedEmail] = {
      ...record,
      user: normalizedUser,
    }
    saveUsers(users)
  }

  return { success: true, user: normalizedUser }
}

export function localSignOut(): { success: boolean } {
  setStoredUser(null)
  return { success: true }
}

export function hasLocalAuth(): boolean {
  return typeof window !== 'undefined' && !!localStorage.getItem(CURRENT_USER_KEY)
}
