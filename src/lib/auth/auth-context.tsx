'use client'

import { createContext, useContext, useState, useCallback, ReactNode } from 'react'
import { LocalUser, getStoredUser, setStoredUser, localSignIn, localSignUp, localSignOut } from '@/lib/auth/local-auth'

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

  const handleSignIn = useCallback(async (email: string, password: string) => {
    const result = localSignIn(email, password)
    if (result.success && result.user) {
      setUser(result.user)
      setStoredUser(result.user)
    }
    return result
  }, [])

  const handleSignUp = useCallback(async (email: string, password: string, name?: string) => {
    const result = localSignUp(email, password, name || '')
    if (result.success && result.user) {
      setUser(result.user)
      setStoredUser(result.user)
    }
    return result
  }, [])

  const handleSignOut = useCallback(async () => {
    localSignOut()
    setUser(null)
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
