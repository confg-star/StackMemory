'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Timeline } from '@/components/roadmap/Timeline'
import { ModuleErrorBoundary } from '@/components/common/ModuleErrorBoundary'
import { CheckCircle2, Circle, Clock, List, Calendar, Loader2 } from 'lucide-react'
import { useRoute } from '@/lib/context/RouteContext'
import { buildRouteDateScope, buildTasksPath, toRouteTaskDateKey } from '@/lib/route-task-utils'
import Link from 'next/link'

interface LearningPhase {
  id: string
  title: string
  weeks: string
  goal: string
  focus: string[]
  deliverables: string[]
  tasks?: TimelineTask[]
}

interface TimelineTask {
  id: string
  title: string
  week: number
  day?: number
  type: '学习' | '实操' | '复盘'
  status: 'pending' | 'in_progress' | 'completed'
}

interface LearningTask {
  id: string
  title: string
  type: '学习' | '实操' | '复盘'
  difficulty: string
  estimate: string
  objective: string
  doneCriteria: string
}

interface RoadmapData {
  phases: LearningPhase[]
  currentTasks: LearningTask[]
}

const STORAGE_KEY = 'stackmemory-timeline-status'

function buildStorageKey(routeId?: string): string {
  return `${STORAGE_KEY}:${routeId || 'none'}`
}

function loadTaskStatus(routeId?: string): Record<string, 'pending' | 'in_progress' | 'completed'> {
  if (typeof window === 'undefined') return {}
  try {
    const saved = localStorage.getItem(buildStorageKey(routeId))
    return saved ? JSON.parse(saved) : {}
  } catch {
    return {}
  }
}

function saveTaskStatus(routeId: string | undefined, status: Record<string, 'pending' | 'in_progress' | 'completed'>) {
  if (typeof window === 'undefined') return
  localStorage.setItem(buildStorageKey(routeId), JSON.stringify(status))
}

function buildTaskStatusKey(routeId: string, dateKey: string, taskId: string): string {
  return `${routeId}:${dateKey}:${taskId}`
}

export default function RoadmapPage() {
  const router = useRouter()
  const [taskStatus, setTaskStatus] = useState<Record<string, 'pending' | 'in_progress' | 'completed'>>({})
  const [activePhase, setActivePhase] = useState<string>('phase-1')
  const [roadmapData, setRoadmapData] = useState<RoadmapData | null>(null)
  const [loading, setLoading] = useState(true)
  const [navigatingTaskId, setNavigatingTaskId] = useState<string | null>(null)
  const { currentRoute } = useRoute()
  const loadVersionRef = useRef(0)

  useEffect(() => {
    async function loadRoadmapData() {
      const requestVersion = ++loadVersionRef.current
      setLoading(true)
      setRoadmapData(null)
      setTaskStatus({})
      setActivePhase('phase-1')

      if (!currentRoute?.roadmap_data) {
        if (requestVersion === loadVersionRef.current) {
          setLoading(false)
        }
        return
      }

      try {
        const data = currentRoute.roadmap_data as unknown as RoadmapData
        if (data && data.phases) {
          if (requestVersion !== loadVersionRef.current) {
            return
          }
          setRoadmapData(data)
          setActivePhase(data.phases[0]?.id || 'phase-1')
          setTaskStatus(loadTaskStatus(currentRoute.id))
        }
      } catch (err) {
        console.error('解析路线数据失败:', err)
      } finally {
        if (requestVersion === loadVersionRef.current) {
          setLoading(false)
        }
      }
    }
    loadRoadmapData()
  }, [currentRoute])

  useEffect(() => {
    const handleRouteChange = (event: Event) => {
      const customEvent = event as CustomEvent<{ id?: string } | null>
      const changedRouteId = customEvent.detail?.id
      if (!changedRouteId) {
        setTaskStatus({})
        return
      }
      setTaskStatus(loadTaskStatus(changedRouteId))
    }
    window.addEventListener('route-changed', handleRouteChange)
    return () => window.removeEventListener('route-changed', handleRouteChange)
  }, [])

  const phases = roadmapData?.phases || []
  const allTasks = phases.flatMap((p) => p.tasks || [])
  const totalWeeks = phases.length > 0
    ? Math.max(...phases.flatMap(p => p.tasks?.map(t => t.week) || [0]))
    : 0

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[400px]">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
          <p className="text-muted-foreground">加载学习路线...</p>
        </div>
      </div>
    )
  }

  if (!roadmapData || phases.length === 0) {
    return (
      <div className="text-center py-12 space-y-4">
        <h2 className="text-2xl font-bold">暂无学习路线</h2>
        <p className="text-muted-foreground">
          请创建或选择一条学习路线开始你的学习之旅
        </p>
        <div className="flex justify-center gap-2">
          <Button asChild>
            <Link href="/create">创建路线</Link>
          </Button>
        </div>
      </div>
    )
  }
  
  const completedCount = allTasks.filter((task) => {
    if (!currentRoute) return false
    const statusKey = buildTaskStatusKey(currentRoute.id, toRouteTaskDateKey(task, currentRoute.created_at), task.id)
    return taskStatus[statusKey] === 'completed'
  }).length
  const inProgressCount = allTasks.filter((task) => {
    if (!currentRoute) return false
    const statusKey = buildTaskStatusKey(currentRoute.id, toRouteTaskDateKey(task, currentRoute.created_at), task.id)
    return taskStatus[statusKey] === 'in_progress'
  }).length
  const totalCount = allTasks.length
  const progress = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0

  const cycleStatus = (task: TimelineTask) => {
    if (!currentRoute) return
    const taskDateKey = toRouteTaskDateKey(task, currentRoute.created_at)
    const routeDateScope = buildRouteDateScope(currentRoute.id, taskDateKey)
    const taskStatusKey = `${routeDateScope}:${task.id}`
    const currentStatus = taskStatus[taskStatusKey]
    const newStatus: Record<string, 'pending' | 'in_progress' | 'completed'> = { ...taskStatus }
    if (!currentStatus || currentStatus === 'pending') {
      newStatus[taskStatusKey] = 'in_progress'
    } else if (currentStatus === 'in_progress') {
      newStatus[taskStatusKey] = 'completed'
    } else {
      delete newStatus[taskStatusKey]
    }
    setTaskStatus(newStatus)
    saveTaskStatus(currentRoute.id, newStatus)
  }

  const navigateToTaskByRoadmap = (task: TimelineTask) => {
    if (!currentRoute) return
    if (navigatingTaskId) return
    setNavigatingTaskId(task.id)
    const dateKey = toRouteTaskDateKey(task, currentRoute.created_at)
    router.push(buildTasksPath({ routeId: currentRoute.id, date: dateKey, taskId: task.id }))
    window.setTimeout(() => {
      setNavigatingTaskId((current) => (current === task.id ? null : current))
    }, 500)
  }

  const getStatusIcon = (status?: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />
      case 'in_progress':
        return <Clock className="h-4 w-4 text-yellow-500" />
      default:
        return <Circle className="h-4 w-4 text-muted-foreground" />
    }
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case '学习':
        return 'bg-blue-500/10 text-blue-600 border-blue-500/30'
      case '实操':
        return 'bg-purple-500/10 text-purple-600 border-purple-500/30'
      case '复盘':
        return 'bg-orange-500/10 text-orange-600 border-orange-500/30'
      default:
        return 'bg-muted text-muted-foreground'
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold">学习路线</h1>
          <p className="text-muted-foreground mt-2">
            {currentRoute?.topic || (totalWeeks > 0 ? `${totalWeeks} 周` : '')}个性化学习路线
          </p>
        </div>

        <ModuleErrorBoundary
          moduleName="roadmap-stats-card"
          fallback={
            <Card className="min-w-[200px] border-red-300/60">
              <CardContent className="pt-4 text-sm text-red-600">统计模块异常，已降级</CardContent>
            </Card>
          }
        >
          <Card className="min-w-[200px]">
            <CardContent className="pt-4">
              <div className="text-center">
                <div className="text-3xl font-bold text-primary">{progress}%</div>
                <p className="text-sm text-muted-foreground">总体进度</p>
                <div className="mt-2 h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <div className="mt-2 flex justify-center gap-4 text-xs">
                  <span className="text-green-600">完成: {completedCount}</span>
                  <span className="text-yellow-600">进行: {inProgressCount}</span>
                  <span className="text-muted-foreground">共: {totalCount}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </ModuleErrorBoundary>
      </div>

      <Tabs defaultValue="timeline" className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="timeline" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            时间轴
          </TabsTrigger>
          <TabsTrigger value="phases" className="flex items-center gap-2">
            <List className="h-4 w-4" />
            阶段详情
          </TabsTrigger>
        </TabsList>

        <TabsContent value="timeline" className="mt-6">
          <ModuleErrorBoundary
            moduleName="roadmap-panel"
            fallback={
              <Card className="border-red-300/60">
                <CardContent className="pt-4 text-sm text-red-600">路线面板异常，已降级展示</CardContent>
              </Card>
            }
          >
            <Card>
              <CardHeader>
                <CardTitle>{totalWeeks > 0 ? `${totalWeeks} 周` : ''}学习时间轴</CardTitle>
                <p className="text-sm text-muted-foreground">点击任务可切换状态：待处理 → 进行中 → 已完成</p>
              </CardHeader>
              <CardContent className="max-h-[600px] overflow-y-auto">
                <Timeline
                  phases={phases}
                  currentWeek={1}
                  taskStatus={taskStatus}
                  disableTaskActions={Boolean(navigatingTaskId)}
                  statusKeyResolver={(task) => {
                    if (!currentRoute) return task.id
                    return buildTaskStatusKey(currentRoute.id, toRouteTaskDateKey(task, currentRoute.created_at), task.id)
                  }}
                  onTaskClick={cycleStatus}
                  onTaskNavigate={navigateToTaskByRoadmap}
                />
              </CardContent>
            </Card>
          </ModuleErrorBoundary>
        </TabsContent>

        <TabsContent value="phases" className="mt-6">
          <ModuleErrorBoundary
            moduleName="roadmap-task-list"
            fallback={
              <Card className="border-red-300/60">
                <CardContent className="pt-4 text-sm text-red-600">任务列表模块异常，已降级展示</CardContent>
              </Card>
            }
          >
            <div className="flex gap-2 mb-4 flex-wrap">
              {phases.map((phase) => (
                <Button
                  key={phase.id}
                  variant={activePhase === phase.id ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setActivePhase(phase.id)}
                >
                  {phase.weeks}
                </Button>
              ))}
            </div>

            {phases.map((phase) => (
              <div key={phase.id} className={activePhase === phase.id ? 'block' : 'hidden'}>
                <Card className="border-border/70 shadow-sm">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                      <CardTitle className="text-xl leading-tight">{phase.title}</CardTitle>
                      <Badge variant="secondary" className="text-xs">{phase.weeks}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-5">
                    <section>
                      <p className="text-sm font-medium text-muted-foreground">阶段目标</p>
                      <p className="mt-2 leading-7">{phase.goal}</p>
                    </section>

                    <section>
                      <p className="text-sm font-medium text-muted-foreground">学习重点</p>
                      <ul className="mt-2 list-disc pl-5 space-y-2 leading-7">
                        {phase.focus.map((item: string) => (
                          <li key={item}>{item}</li>
                        ))}
                      </ul>
                    </section>

                    <section>
                      <p className="text-sm font-medium text-muted-foreground">阶段产出</p>
                      <ul className="mt-2 list-disc pl-5 space-y-2 leading-7">
                        {phase.deliverables.map((item: string) => (
                          <li key={item}>{item}</li>
                        ))}
                      </ul>
                    </section>

                    {phase.tasks && phase.tasks.length > 0 && (
                      <section>
                        <p className="text-sm font-medium text-muted-foreground mb-3">阶段任务</p>
                        <div className="grid gap-2">
                          {phase.tasks.map((task) => (
                              <button
                                key={task.id}
                                type="button"
                                onClick={() => navigateToTaskByRoadmap(task)}
                                disabled={Boolean(navigatingTaskId)}
                                className="flex items-center gap-3 p-2 rounded border hover:bg-muted/50 transition-colors text-left w-full disabled:cursor-not-allowed disabled:opacity-65"
                              >
                              {getStatusIcon(
                                currentRoute
                                  ? taskStatus[buildTaskStatusKey(currentRoute.id, toRouteTaskDateKey(task, currentRoute.created_at), task.id)]
                                  : undefined
                              )}
                              <span className="flex-1 text-sm">{task.title}</span>
                              <Badge variant="outline" className={`text-xs ${getTypeColor(task.type)}`}>
                                {task.type}
                              </Badge>
                              {task.day && (
                                <span className="text-xs text-muted-foreground">D{task.day}</span>
                              )}
                            </button>
                          ))}
                        </div>
                      </section>
                    )}
                  </CardContent>
                </Card>
              </div>
            ))}
          </ModuleErrorBoundary>
        </TabsContent>
      </Tabs>
    </div>
  )
}
