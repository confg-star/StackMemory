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
import { LogOut } from 'lucide-react'
import { createClient, hasSupabaseEnv } from '@/lib/supabase/client'
import { LocalUser } from '@/lib/auth/local-auth'

interface SupabaseUser {
  email?: string
  user_metadata?: {
    avatar_url?: string
    full_name?: string
    name?: string
  }
}

interface UserMenuProps {
  user?: SupabaseUser | null
  localUser?: LocalUser | null
  onSignOut?: () => void
}

function isLocalUser(user: SupabaseUser | LocalUser): user is LocalUser {
  return 'id' in user && 'name' in user && 'createdAt' in user
}

export function UserMenu({ user, localUser, onSignOut }: UserMenuProps) {
  const [open, setOpen] = useState(false)

  const activeUser = localUser || user

  if (!activeUser) {
    return (
      <Link href="/auth">
        <Button variant="ghost" size="sm">
          登录
        </Button>
      </Link>
    )
  }

  const isLocal = isLocalUser(activeUser)
  const avatarUrl = isLocal ? undefined : activeUser.user_metadata?.avatar_url
  const name = isLocal 
    ? activeUser.name 
    : (activeUser.user_metadata?.full_name || activeUser.user_metadata?.name || activeUser.email?.split('@')[0] || '用户')
  const email = activeUser.email
  const initials = name.charAt(0).toUpperCase()

  const handleSignOut = async () => {
    setOpen(false)
    
    if (localUser && onSignOut) {
      onSignOut()
      window.location.reload()
      return
    }

    if (hasSupabaseEnv) {
      const supabase = createClient()
      if (supabase) {
        await supabase.auth.signOut()
      }
    }
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
