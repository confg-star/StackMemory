'use client'

import { createContext, useContext, useState, useCallback, ReactNode, useEffect } from 'react'
import { LocalUser, getStoredUser, setStoredUser, localSignIn, localSignUp, localSignOut, LOCAL_AUTH_USER_COOKIE } from '@/lib/auth/local-auth'

function setAuthCookie(userId: string) {
  if (typeof document === 'undefined') return
  document.cookie = `${LOCAL_AUTH_USER_COOKIE}=${encodeURIComponent(userId)}; Path=/; Max-Age=${60 * 60 * 24 * 30}; SameSite=Lax`
}

function clearAuthCookie() {
  if (typeof document === 'undefined') return
  document.cookie = `${LOCAL_AUTH_USER_COOKIE}=; Path=/; Max-Age=0; SameSite=Lax`
}

interface AuthContextType {
  user: LocalUser | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<{ success: boolean; error?: string }>
  signUp: (email: string, password: string, name?: string) => Promise<{ success: boolean; error?: string }>
  signOut: () => Promise<{ success: boolean }>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

function getInitialUser(): LocalUser | null {
  if (typeof window === 'undefined') return null
  return getStoredUser()
}

export function LocalAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<LocalUser | null>(getInitialUser)
  const [loading] = useState(false)

  useEffect(() => {
    if (user?.id) {
      setAuthCookie(user.id)
    }
  }, [user])

  const handleSignIn = useCallback(async (email: string, password: string) => {
    const result = localSignIn(email, password)
    if (result.success && result.user) {
      setUser(result.user)
      setStoredUser(result.user)
      setAuthCookie(result.user.id)
    }
    return result
  }, [])

  const handleSignUp = useCallback(async (email: string, password: string, name?: string) => {
    const result = localSignUp(email, password, name || '')
    if (result.success && result.user) {
      setUser(result.user)
      setStoredUser(result.user)
      setAuthCookie(result.user.id)
    }
    return result
  }, [])

  const handleSignOut = useCallback(async () => {
    localSignOut()
    setUser(null)
    clearAuthCookie()
    return { success: true }
  }, [])

  return (
    <AuthContext.Provider value={{
      user,
      loading,
      signIn: handleSignIn,
      signUp: handleSignUp,
      signOut: handleSignOut
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useLocalAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useLocalAuth must be used within a LocalAuthProvider')
  }
  return context
}
