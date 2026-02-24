'use client'

import { useState } from 'react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { MapPin, Loader2, Plus } from 'lucide-react'
import { toast } from 'sonner'
import { useRoute } from '@/lib/context/RouteContext'
import Link from 'next/link'
import { Skeleton } from '@/components/ui/skeleton'

export function RouteSelector() {
  const [switching, setSwitching] = useState(false)
  const { routes, currentRoute, loading, switchingRoute, switchRoute } = useRoute()

  const handleSwitchRoute = async (routeId: string) => {
    if (!routeId || routeId === currentRoute?.id) return

    setSwitching(true)
    try {
      const success = await switchRoute(routeId)
      if (success) {
        toast.success('路线切换成功')
      } else {
        toast.error('切换路线失败')
      }
    } catch (err) {
      console.error('切换路线失败:', err)
      toast.error('切换路线失败')
    } finally {
      setSwitching(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2">
        <Skeleton className="h-9 w-[180px]" />
      </div>
    )
  }

  if (routes.length === 0) {
    return (
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" disabled className="w-[180px] justify-start">
          <MapPin className="h-4 w-4 mr-2" />
          暂无路线
        </Button>
        <Button variant="outline" size="sm" asChild>
          <Link href="/create">
            <Plus className="h-4 w-4 mr-2" />
            新建
          </Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2">
      <Select
        value={currentRoute?.id || ''}
        onValueChange={handleSwitchRoute}
        disabled={switching || switchingRoute}
      >
        <SelectTrigger className={`w-[180px] transition-opacity duration-200 ${(switching || switchingRoute) ? 'opacity-80' : 'opacity-100'}`}>
          {(switching || switchingRoute) ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <>
              <MapPin className="h-4 w-4 mr-2" />
              <SelectValue placeholder="选择路线" />
            </>
          )}
        </SelectTrigger>
        <SelectContent>
          {routes.map((route) => (
            <SelectItem key={route.id} value={route.id}>
              <div className="flex items-center gap-2">
                {route.is_current && (
                  <span className="w-2 h-2 rounded-full bg-green-500" />
                )}
                <span className="truncate max-w-[140px]">{route.topic}</span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
