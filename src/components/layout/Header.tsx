'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { createClient, hasSupabaseEnv } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Sparkles } from 'lucide-react'
import { UserMenu } from './UserMenu'
import { LocalUser, getStoredUser, LOCAL_AUTH_USER_COOKIE } from '@/lib/auth/local-auth'
import { RouteSelector } from './RouteSelector'
import { CreateRouteDialog } from './CreateRouteDialog'
import { useRoute } from '@/lib/context/RouteContext'
import { toast } from 'sonner'

interface CreatedRoute {
  id: string
  user_id: string
  topic: string
  background: string | null
  goals: string | null
  weeks: number
  roadmap_data: Record<string, unknown> | null
  is_current: boolean
  created_at: string
  updated_at: string
}

interface SupabaseUser {
  email?: string
  user_metadata?: {
    avatar_url?: string
    full_name?: string
    name?: string
  }
}

export function Header() {
  const [supabaseUser, setSupabaseUser] = useState<SupabaseUser | null>(null)
  const [localUser, setLocalUser] = useState<LocalUser | null>(null)
  const [mounted, setMounted] = useState(false)
  const { currentRoute, refreshRoutes, switchRoute, appendAndSelectRoute } = useRoute()

  const checkSession = useCallback(async () => {
    if (!hasSupabaseEnv) {
      return null
    }

    const supabase = createClient()
    if (!supabase) {
      return null
    }

    try {
      const { data: { session } } = await supabase.auth.getSession()
      return session?.user as SupabaseUser | null
    } catch {
      return null
    }
  }, [])

  useEffect(() => {
    const local = getStoredUser()
    const init = async () => {
      setMounted(true)
      setLocalUser(local)
      
      if (hasSupabaseEnv) {
        const user = await checkSession()
        setSupabaseUser(user)
      }
    }
    init()

    if (!hasSupabaseEnv) return

    const supabase = createClient()
    if (!supabase) return

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSupabaseUser(session?.user as SupabaseUser | null)
    })

    return () => subscription.unsubscribe()
  }, [checkSession])

  const handleLocalSignOut = () => {
    setLocalUser(null)
    if (typeof window !== 'undefined') {
      localStorage.removeItem('stackmemory-current-user')
      localStorage.removeItem('stackmemory-current-route')
      document.cookie = `${LOCAL_AUTH_USER_COOKIE}=; Path=/; Max-Age=0; SameSite=Lax`
    }
    void refreshRoutes()
  }

  const handleRouteCreated = async (route: CreatedRoute) => {
    appendAndSelectRoute(route)

    const switched = await switchRoute(route.id)
    if (!switched) {
      toast.error('路线已创建，但自动切换失败，请手动切换')
    }

    await refreshRoutes()
  }

  if (!mounted) {
    return (
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-14 items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/" className="flex items-center gap-2 font-semibold">
              <Sparkles className="h-5 w-5 text-primary" />
              <span>栈记</span>
            </Link>
          </div>
          <nav className="flex items-center gap-2">
            <Link href="/deck">
              <Button variant="ghost" size="sm">我的卡片</Button>
            </Link>
            <Link href="/create">
              <Button size="sm">行动中心</Button>
            </Link>
            <Link href="/auth">
              <Button variant="ghost" size="sm">登录</Button>
            </Link>
          </nav>
        </div>
      </header>
    )
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/" className="flex items-center gap-2 font-semibold">
            <Sparkles className="h-5 w-5 text-primary" />
            <span>栈记</span>
          </Link>
          
          {currentRoute && (
            <div className="hidden md:flex items-center gap-1 text-sm text-muted-foreground">
              <span className="w-2 h-2 rounded-full bg-green-500" />
              <span className="truncate max-w-[150px]">{currentRoute.topic}</span>
            </div>
          )}
        </div>

        <nav className="flex items-center gap-2">
          <RouteSelector />
          <CreateRouteDialog onRouteCreated={handleRouteCreated} />
          
          <div className="w-px h-6 bg-border mx-1" />
          
          <Link href="/roadmap">
            <Button variant="ghost" size="sm">学习路线</Button>
          </Link>
          <Link href="/tasks">
            <Button variant="ghost" size="sm">今日任务</Button>
          </Link>
          <Link href="/deck">
            <Button variant="ghost" size="sm">我的卡片</Button>
          </Link>
          <Link href="/create">
            <Button size="sm">行动中心</Button>
          </Link>
          <UserMenu user={supabaseUser} localUser={localUser} onSignOut={handleLocalSignOut} />
        </nav>
      </div>
    </header>
  )
}
