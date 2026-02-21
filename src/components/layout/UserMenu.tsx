'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { LogOut, User } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface UserMenuProps {
  user?: any
}

export function UserMenu({ user }: UserMenuProps) {
  const [open, setOpen] = useState(false)

  if (!user) {
    return (
      <Link href="/auth">
        <Button variant="ghost" size="sm">
          登录
        </Button>
      </Link>
    )
  }

  // 从 user 对象中提取信息
  const avatarUrl = user.user_metadata?.avatar_url || user.avatar_url
  const name = user.user_metadata?.full_name || user.user_metadata?.name || user.name || user.email?.split('@')[0] || '用户'
  const email = user.email

  console.log('UserMenu - user:', user)
  console.log('UserMenu - avatarUrl:', avatarUrl)
  console.log('UserMenu - name:', name)

  const initials = name.charAt(0).toUpperCase()

  const handleSignOut = async () => {
    setOpen(false)
    const supabase = createClient()
    if (!supabase) {
      window.location.reload()
      return
    }
    await supabase.auth.signOut()
    window.location.reload()
  }

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="relative h-8 w-8 rounded-full">
          <Avatar className="h-8 w-8">
            <AvatarImage src={avatarUrl} alt={name} />
            <AvatarFallback className="bg-primary text-primary-foreground">
              {initials}
            </AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end">
        <div className="flex items-center justify-start gap-2 p-2">
          <Avatar className="h-8 w-8">
            <AvatarImage src={avatarUrl} alt={name} />
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">{name}</p>
            <p className="text-xs leading-none text-muted-foreground">
              {email}
            </p>
          </div>
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleSignOut}>
          <LogOut className="mr-2 h-4 w-4" />
          退出登录
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
