export interface LocalUser {
  id: string
  email: string
  name: string
  createdAt: string
}

const CURRENT_USER_KEY = 'stackmemory-current-user'

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

export function getStoredUser(): LocalUser | null {
  if (typeof window === 'undefined') return null
  try {
    const saved = localStorage.getItem(CURRENT_USER_KEY)
    if (!saved) return null
    const parsed = JSON.parse(saved) as LocalUser
    if (isUuid(parsed.id)) return parsed
    const normalized = {
      ...parsed,
      id: generateId(),
    }
    localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(normalized))
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

export function hasLocalAuth(): boolean {
  return typeof window !== 'undefined' && !!localStorage.getItem(CURRENT_USER_KEY)
}
