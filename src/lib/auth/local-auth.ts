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

function generateId(): string {
  return `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
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
    return saved ? JSON.parse(saved) : null
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
  
  if (users[email]) {
    return { success: false, error: '该邮箱已被注册' }
  }

  if (password.length < 6) {
    return { success: false, error: '密码至少需要 6 个字符' }
  }

  const user: LocalUser = {
    id: generateId(),
    email,
    name: name || email.split('@')[0],
    createdAt: new Date().toISOString()
  }

  users[email] = { password, user }
  saveUsers(users)

  return { success: true, user }
}

export function localSignIn(email: string, password: string): { success: boolean; error?: string; user?: LocalUser } {
  const users = getUsers()
  
  const record = users[email]
  if (!record) {
    return { success: false, error: '邮箱或密码错误' }
  }

  if (record.password !== password) {
    return { success: false, error: '邮箱或密码错误' }
  }

  return { success: true, user: record.user }
}

export function localSignOut(): { success: boolean } {
  setStoredUser(null)
  return { success: true }
}

export function hasLocalAuth(): boolean {
  return typeof window !== 'undefined' && !!localStorage.getItem(CURRENT_USER_KEY)
}
