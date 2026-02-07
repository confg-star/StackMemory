'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Sparkles } from 'lucide-react'
import { UserMenu } from './UserMenu'

export function Header() {
  const [user, setUser] = useState<any>(null)
  const [mounted, setMounted] = useState(false)

  const checkSession = useCallback(async () => {
    const supabase = createClient()
    try {
      const { data: { session } } = await supabase.auth.getSession()
      setUser(session?.user ?? null)
    } catch (e) {
      console.error('Session check error:', e)
      setUser(null)
    }
  }, [])

  useEffect(() => {
    setMounted(true)
    checkSession()

    const supabase = createClient()
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      console.log('Auth state changed:', session?.user?.email)
      setUser(session?.user ?? null)
    })

    return () => subscription.unsubscribe()
  }, [checkSession])

  // 避免 hydration 不匹配
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
              <Button size="sm">创建卡片</Button>
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
        </div>

        <nav className="flex items-center gap-2">
          <Link href="/deck">
            <Button variant="ghost" size="sm">我的卡片</Button>
          </Link>
          <Link href="/create">
            <Button size="sm">创建卡片</Button>
          </Link>
          <UserMenu user={user} />
        </nav>
      </div>
    </header>
  )
}
