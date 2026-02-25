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
import { MapPin, Loader2, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { useRoute } from '@/lib/context/RouteContext'
import { Skeleton } from '@/components/ui/skeleton'

export function RouteSelector() {
  const [switching, setSwitching] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const { routes, currentRoute, loading, switchingRoute, switchRoute, refreshRoutes } = useRoute()

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
      <div className="flex items-center">
        <Button variant="outline" size="sm" disabled className="w-[180px] justify-start">
          <MapPin className="h-4 w-4 mr-2" />
          暂无路线
        </Button>
      </div>
    )
  }

  const handleDeleteCurrentRoute = async () => {
    if (!currentRoute?.id || deleting || switching || switchingRoute) return

    const confirmed = window.confirm(`确认删除学习路线「${currentRoute.topic}」吗？\n\n删除后不可恢复。`)
    if (!confirmed) return

    setDeleting(true)
    try {
      const res = await fetch(`/api/routes?routeId=${encodeURIComponent(currentRoute.id)}`, {
        method: 'DELETE',
      })
      const result = await res.json().catch(() => ({ success: false, error: '删除失败：服务响应异常' }))

      if (!res.ok || !result.success) {
        toast.error(result.error || '删除路线失败')
        return
      }

      toast.success('路线已删除')
      await refreshRoutes()
    } catch (err) {
      console.error('删除路线失败:', err)
      toast.error('删除路线失败')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="flex items-center gap-2">
      <Select
        value={currentRoute?.id}
        onValueChange={handleSwitchRoute}
        disabled={switching || switchingRoute || deleting}
      >
        <SelectTrigger className="w-[180px]">
          <MapPin className="h-4 w-4 mr-2" />
          <SelectValue placeholder="选择路线" />
          {(switching || switchingRoute) && <Loader2 className="h-4 w-4 animate-spin ml-1" />}
        </SelectTrigger>
        <SelectContent position="popper" align="start" sideOffset={6} className="w-[--radix-select-trigger-width]">
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

      <Button
        variant="outline"
        size="icon"
        onClick={handleDeleteCurrentRoute}
        disabled={!currentRoute || deleting || switching || switchingRoute}
        title={currentRoute ? `删除路线：${currentRoute.topic}` : '暂无可删除路线'}
        aria-label="删除当前路线"
      >
        {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
      </Button>
    </div>
  )
}
