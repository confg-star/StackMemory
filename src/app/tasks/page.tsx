'use client'

import { Suspense, useState, useEffect, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { TaskCard } from '@/components/tasks/TaskCard'
import { ModuleErrorBoundary } from '@/components/common/ModuleErrorBoundary'
import { useRoute } from '@/lib/context/RouteContext'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { Loader2, ChevronLeft, ChevronRight, CalendarDays } from 'lucide-react'
import { toast } from 'sonner'
import { Skeleton } from '@/components/ui/skeleton'
import { trackEvent } from '@/lib/telemetry'

import { LearningTask } from '@/lib/learning-data'
import {
  TASK_DATE_RANGE_DAYS,
  formatDateKey,
  shiftDate,
  buildRouteDateScope,
  buildTasksPath,
  resolveRouteId,
  toRouteTaskDateKey,
  canShiftTaskDate,
  resolveTaskQueryDate,
  type RouteTimelineTask,
} from '@/lib/route-task-utils'

interface RouteRoadmapData {
  phases?: Array<{
    tasks?: RouteTimelineTask[]
  }>
}

export default function TasksPage() {
  return (
    <Suspense fallback={<TasksPageFallback />}>
      <TasksPageContent />
    </Suspense>
  )
}

function TasksPageFallback() {
  return (
    <div className="flex items-center justify-center h-[400px]">
      <div className="text-center space-y-4">
        <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
        <p className="text-muted-foreground">加载今日任务...</p>
      </div>
    </div>
  )
}

function TasksPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [tasks, setTasks] = useState<LearningTask[]>([])
  const [activeDate, setActiveDate] = useState<Date>(() => {
    const resolved = resolveTaskQueryDate(searchParams.get('date'), new Date())
    return resolved.date
  })
  const [highlightTaskId, setHighlightTaskId] = useState<string | null>(() => searchParams.get('taskId'))
  const [switchingDate, setSwitchingDate] = useState(false)
  const [loading, setLoading] = useState(true)
  const { currentRoute, routes, switchRoute } = useRoute()
  const taskCacheRef = useRef<Map<string, LearningTask[]>>(new Map())
  const loadVersionRef = useRef(0)
  const routeGuardNotifiedRef = useRef(false)
  const invalidDateNotifiedRef = useRef<string | null>(null)
  const missingTaskNotifiedRef = useRef<string | null>(null)
  const invalidRouteNotifiedRef = useRef<string | null>(null)
  const dateSwitchStartRef = useRef<number | null>(null)
  const taskJumpTrackedRef = useRef<string | null>(null)

  useEffect(() => {
    const queryRouteId = searchParams.get('routeId')
    if (queryRouteId) {
      routeGuardNotifiedRef.current = false
    }
  }, [searchParams])

  useEffect(() => {
    const taskIdFromQuery = searchParams.get('taskId')
    setHighlightTaskId(taskIdFromQuery)

    const rawDate = searchParams.get('date')
    const { date: resolvedDate, fallbackReason } = resolveTaskQueryDate(rawDate, new Date())
    const resolvedDateKey = formatDateKey(resolvedDate)
    if (formatDateKey(activeDate) !== resolvedDateKey) {
      setActiveDate(resolvedDate)
    }

    if (fallbackReason && invalidDateNotifiedRef.current !== rawDate) {
      invalidDateNotifiedRef.current = rawDate
      toast.warning('日期参数非法或超范围，已回退到今天')
    }

    if (rawDate !== resolvedDateKey) {
      const params = new URLSearchParams(searchParams.toString())
      params.set('date', resolvedDateKey)
      if (currentRoute?.id) {
        params.set('routeId', currentRoute.id)
      }
      router.replace(`/tasks?${params.toString()}`)
    }
  }, [activeDate, currentRoute?.id, router, searchParams])

  useEffect(() => {
    const requestedRouteId = searchParams.get('routeId')
    if (requestedRouteId || !currentRoute?.id) {
      return
    }

    const params = new URLSearchParams(searchParams.toString())
    params.set('routeId', currentRoute.id)
    params.set('date', formatDateKey(activeDate))
    router.replace(`/tasks?${params.toString()}`)
  }, [activeDate, currentRoute?.id, router, searchParams])

  useEffect(() => {
    const requestedRouteId = searchParams.get('routeId')
    if (!requestedRouteId || requestedRouteId === currentRoute?.id) return

    const hasRequestedRoute = routes.some((route) => route.id === requestedRouteId)
    if (!hasRequestedRoute) {
      if (invalidRouteNotifiedRef.current !== requestedRouteId) {
        invalidRouteNotifiedRef.current = requestedRouteId
        toast.warning('routeId 无效，已回退到可用路线')
      }
      const fallbackRoute = currentRoute || routes.find((route) => route.is_current) || routes[0]
      if (fallbackRoute) {
        const params = new URLSearchParams(searchParams.toString())
        params.set('routeId', fallbackRoute.id)
        params.set('date', formatDateKey(activeDate))
        router.replace(`/tasks?${params.toString()}`)
      }
      return
    }

    void switchRoute(requestedRouteId).then((ok) => {
      if (!ok) {
        toast.warning('routeId 无效，已回退到可用路线')
        const fallbackRoute = currentRoute || routes.find((route) => route.is_current) || routes[0]
        if (fallbackRoute) {
          const params = new URLSearchParams(searchParams.toString())
          params.set('routeId', fallbackRoute.id)
          params.set('date', formatDateKey(activeDate))
          router.replace(`/tasks?${params.toString()}`)
        }
      }
    })
  }, [activeDate, currentRoute, router, routes, searchParams, switchRoute])

  useEffect(() => {
    async function loadTasks() {
      const requestVersion = ++loadVersionRef.current
      setLoading(true)
      setTasks([])

      const queryRouteId = resolveRouteId(searchParams.get('routeId'), 'tasks:query')
      const queryDate = searchParams.get('date')
      if (!queryRouteId) {
        if (!routeGuardNotifiedRef.current) {
          routeGuardNotifiedRef.current = true
          toast.error('缺少 routeId，已拦截任务查询')
        }
        if (requestVersion === loadVersionRef.current) {
          setLoading(false)
        }
        return
      }

      if (!queryDate) {
        toast.error('缺少 date，已拦截任务查询')
        if (requestVersion === loadVersionRef.current) {
          setLoading(false)
        }
        return
      }

      const routeId = resolveRouteId(currentRoute?.id, 'tasks:load')
      if (!routeId || !currentRoute?.roadmap_data) {
        if (!routeId && !routeGuardNotifiedRef.current) {
          routeGuardNotifiedRef.current = true
          toast.error('缺少 routeId，已拦截任务加载')
        }
        setTasks([])
        if (requestVersion === loadVersionRef.current) {
          setLoading(false)
        }
        return
      }

      if (routeId !== queryRouteId) {
        if (requestVersion === loadVersionRef.current) {
          setLoading(false)
        }
        return
      }

      try {
        const dateKey = formatDateKey(activeDate)
        const cacheKey = buildRouteDateScope(routeId, dateKey)
        const cached = taskCacheRef.current.get(cacheKey)
        if (cached) {
          const queryTaskId = searchParams.get('taskId')
          if (queryTaskId && !cached.some((task) => task.id === queryTaskId)) {
            const notifyKey = `${routeId}:${dateKey}:${queryTaskId}`
            if (missingTaskNotifiedRef.current !== notifyKey) {
              missingTaskNotifiedRef.current = notifyKey
              toast.warning('taskId 不存在，已降级为仅切换日期')
              trackEvent('task_jump_fail', {
                routeId,
                dateKey,
                taskId: queryTaskId,
                reason: 'task_not_found_in_cache',
              })
            }
            setHighlightTaskId(null)
            const nextParams = new URLSearchParams(searchParams.toString())
            nextParams.delete('taskId')
            router.replace(`/tasks?${nextParams.toString()}`)
          }
          if (queryTaskId && cached.some((task) => task.id === queryTaskId)) {
            const jumpKey = `${routeId}:${dateKey}:${queryTaskId}`
            if (taskJumpTrackedRef.current !== jumpKey) {
              taskJumpTrackedRef.current = jumpKey
              trackEvent('task_jump_success', {
                routeId,
                dateKey,
                taskId: queryTaskId,
                from: 'cache',
              })
            }
          }
          if (requestVersion === loadVersionRef.current) {
            setTasks(cached)
            setLoading(false)
          }
          return
        }

        const data = currentRoute.roadmap_data as unknown as RouteRoadmapData
        const timelineTasks = data?.phases?.flatMap((phase) => phase.tasks || []) || []
        const matchedTimeline = timelineTasks.filter((task) => toRouteTaskDateKey(task, currentRoute.created_at) === dateKey)

        if (matchedTimeline.length === 0) {
          taskCacheRef.current.set(cacheKey, [])
          setTasks([])
          return
        }

        const mappedTasks: LearningTask[] = matchedTimeline.map((task) => ({
          id: task.id,
          title: task.title,
          type: task.type,
          difficulty: '中等',
          estimate: '45分钟',
          objective: `完成 ${task.title}`,
          doneCriteria: '按任务说明完成并记录学习结果',
          materials: [],
          knowledgePoints: [],
        }))

        if (requestVersion !== loadVersionRef.current) {
          return
        }

        const queryTaskId = searchParams.get('taskId')
        if (queryTaskId && !mappedTasks.some((task) => task.id === queryTaskId)) {
          const notifyKey = `${routeId}:${dateKey}:${queryTaskId}`
          if (missingTaskNotifiedRef.current !== notifyKey) {
            missingTaskNotifiedRef.current = notifyKey
            toast.warning('taskId 不存在，已降级为仅切换日期')
            trackEvent('task_jump_fail', {
              routeId,
              dateKey,
              taskId: queryTaskId,
              reason: 'task_not_found',
            })
          }
          setHighlightTaskId(null)
          const nextParams = new URLSearchParams(searchParams.toString())
          nextParams.delete('taskId')
          router.replace(`/tasks?${nextParams.toString()}`)
        }

        taskCacheRef.current.set(cacheKey, mappedTasks)
        setTasks(mappedTasks)

        if (queryTaskId && mappedTasks.some((task) => task.id === queryTaskId)) {
          const jumpKey = `${routeId}:${dateKey}:${queryTaskId}`
          if (taskJumpTrackedRef.current !== jumpKey) {
            taskJumpTrackedRef.current = jumpKey
            trackEvent('task_jump_success', {
              routeId,
              dateKey,
              taskId: queryTaskId,
            })
          }
        }
      } catch (err) {
        console.error('解析任务数据失败:', err)
        setTasks([])
      } finally {
        if (requestVersion === loadVersionRef.current) {
          setLoading(false)
        }
      }
    }
    void loadTasks()
  }, [searchParams, currentRoute, activeDate, router])

  useEffect(() => {
    const handleRouteChange = (event: Event) => {
      const customEvent = event as CustomEvent<{ id?: string } | null>
      const changedRouteId = customEvent.detail?.id
      if (changedRouteId && changedRouteId !== currentRoute?.id) {
        return
      }
      setLoading(true)
      setTasks([])
      setHighlightTaskId(null)
    }
    window.addEventListener('route-changed', handleRouteChange)
    return () => window.removeEventListener('route-changed', handleRouteChange)
  }, [currentRoute?.id])

  useEffect(() => {
    if (!highlightTaskId) return
    const timer = window.setTimeout(() => {
      const node = document.getElementById(`task-${highlightTaskId}`)
      if (node) {
        node.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }
    }, 120)
    return () => window.clearTimeout(timer)
  }, [highlightTaskId, tasks])

  useEffect(() => {
    if (!highlightTaskId) return
    const fadeTimer = window.setTimeout(() => {
      setHighlightTaskId((current) => (current === highlightTaskId ? null : current))
    }, 4000)
    return () => window.clearTimeout(fadeTimer)
  }, [highlightTaskId])

  const syncQuery = (nextDate: Date, nextTaskId?: string | null) => {
    router.replace(buildTasksPath({ routeId: currentRoute?.id, date: formatDateKey(nextDate), taskId: nextTaskId }))
  }

  const changeDate = (offset: number) => {
    if (switchingDate || !canShiftTaskDate(activeDate, offset, new Date())) return
    setSwitchingDate(true)
    dateSwitchStartRef.current = performance.now()

    const nextDate = shiftDate(activeDate, offset)
    setActiveDate(nextDate)
    setHighlightTaskId(null)
    syncQuery(nextDate, null)

    window.setTimeout(() => setSwitchingDate(false), 220)
  }

  useEffect(() => {
    if (loading || !switchingDate || dateSwitchStartRef.current === null) {
      return
    }

    const latencyMs = Math.round(performance.now() - dateSwitchStartRef.current)
    console.info('[perf] date_switch_latency_ms', { latencyMs, date: formatDateKey(activeDate) })
    dateSwitchStartRef.current = null
  }, [activeDate, loading, switchingDate])

  const dateKey = formatDateKey(activeDate)
  const canGoPrev = canShiftTaskDate(activeDate, -1, new Date())
  const canGoNext = canShiftTaskDate(activeDate, 1, new Date())
  const safeRouteId = resolveRouteId(currentRoute?.id, 'tasks:completion-scope')
  const completionScope = safeRouteId
    ? buildRouteDateScope(safeRouteId, dateKey)
    : `none:${dateKey}`

  if (loading) {
    return (
      <div className="space-y-6 animate-in fade-in duration-200">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="space-y-2">
            <Skeleton className="h-8 w-36" />
            <Skeleton className="h-4 w-64" />
          </div>
          <Skeleton className="h-10 w-44" />
        </div>
        <div className="grid gap-4">
          {[1, 2, 3].map((item) => (
            <div key={item} className="rounded-xl border p-4 space-y-3">
              <Skeleton className="h-6 w-52" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-4/5" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (tasks.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-3xl font-bold">今日任务</h1>
            <p className="text-muted-foreground mt-2">
              {currentRoute ? `当前路线：${currentRoute.topic}` : '请先创建学习路线'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" disabled={switchingDate || !canGoPrev} onClick={() => changeDate(-1)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="px-3 py-2 rounded-md border bg-muted/30 text-sm min-w-[140px] text-center inline-flex items-center justify-center gap-2">
              <CalendarDays className="h-4 w-4" />
              {dateKey}
            </div>
            <Button variant="outline" size="icon" disabled={switchingDate || !canGoNext} onClick={() => changeDate(1)}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="text-center py-12 space-y-4 border rounded-lg bg-muted/20 animate-in fade-in duration-300">
          <h2 className="text-2xl font-bold">该日暂无任务</h2>
          <p className="text-muted-foreground">可查看范围为今天前后 {TASK_DATE_RANGE_DAYS} 天</p>
          {!currentRoute && (
            <Button asChild>
              <Link href="/create">创建路线</Link>
            </Button>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className={`space-y-6 transition-opacity duration-200 ${switchingDate ? 'opacity-80' : 'opacity-100'}`}>
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold">今日任务</h1>
          <p className="text-muted-foreground mt-2">
            {currentRoute ? `当前路线：${currentRoute.topic} - ` : ''}你每天只需要完成这 3 件事：学一个点、做一个实操、写一次复盘。
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" disabled={switchingDate || !canGoPrev} onClick={() => changeDate(-1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="px-3 py-2 rounded-md border bg-muted/30 text-sm min-w-[140px] text-center inline-flex items-center justify-center gap-2">
            <CalendarDays className="h-4 w-4" />
            {dateKey}
          </div>
          <Button variant="outline" size="icon" disabled={switchingDate || !canGoNext} onClick={() => changeDate(1)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <ModuleErrorBoundary
        moduleName="tasks-list"
        fallback={
          <div className="rounded-lg border border-red-300/60 bg-red-50/50 p-4 text-sm text-red-700">
            任务列表渲染异常，已降级，请刷新后重试。
          </div>
        }
      >
        <div className="grid gap-4 animate-in fade-in duration-200">
          {tasks.map((task, idx) => (
            <div key={`${completionScope}:${task.id}`} id={`task-${task.id}`} className={highlightTaskId === task.id ? 'rounded-xl ring-2 ring-primary/40 transition-all duration-300' : 'transition-all duration-300'}>
              <TaskCard task={task} index={idx} completionScope={completionScope} />
            </div>
          ))}
        </div>
      </ModuleErrorBoundary>
    </div>
  )
}
