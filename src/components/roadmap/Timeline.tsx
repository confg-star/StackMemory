'use client'

import { TimelineTask } from '@/lib/learning-data'
import { Badge } from '@/components/ui/badge'
import { CheckCircle2, Circle, Clock, BookOpen, Hammer, ClipboardList } from 'lucide-react'

interface LearningPhaseLike {
  id: string
  title: string
  tasks?: TimelineTask[]
}

interface TimelineProps {
  phases: LearningPhaseLike[]
  currentWeek?: number
  taskStatus?: Record<string, 'pending' | 'in_progress' | 'completed'>
  statusKeyResolver?: (task: TimelineTask) => string
  onTaskClick?: (task: TimelineTask) => void
  onTaskNavigate?: (task: TimelineTask) => void
  disableTaskActions?: boolean
}

export function Timeline({ phases, currentWeek = 1, taskStatus = {}, statusKeyResolver, onTaskClick, onTaskNavigate, disableTaskActions = false }: TimelineProps) {
  const allTasks: (TimelineTask & { phaseId: string; phaseTitle: string })[] = 
    phases.flatMap(phase => 
      (phase.tasks || []).map(task => ({
        ...task,
        phaseId: phase.id,
        phaseTitle: phase.title,
        status: taskStatus[statusKeyResolver ? statusKeyResolver(task) : task.id] || task.status
      }))
    )

  const weekGroups = allTasks.reduce((acc, task) => {
    const key = task.week
    if (!acc[key]) acc[key] = []
    acc[key].push(task)
    return acc
  }, {} as Record<number, typeof allTasks>)

  const sortedWeeks = Object.keys(weekGroups).map(Number).sort((a, b) => a - b)

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />
      case 'in_progress':
        return <Clock className="h-4 w-4 text-yellow-500" />
      default:
        return <Circle className="h-4 w-4 text-muted-foreground" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-500/10 border-green-500/30'
      case 'in_progress':
        return 'bg-yellow-500/10 border-yellow-500/30'
      default:
        return 'bg-muted/50 border-border'
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

  const getTypeIcon = (type: string) => {
    switch (type) {
      case '学习':
        return <BookOpen className="h-3 w-3" />
      case '实操':
        return <Hammer className="h-3 w-3" />
      case '复盘':
        return <ClipboardList className="h-3 w-3" />
      default:
        return null
    }
  }

  const getPhaseInfo = (phaseId: string) => {
    const phase = phases.find(p => p.id === phaseId)
    return phase?.title || ''
  }

  const totalTasks = allTasks.length
  const completedTasks = allTasks.filter(t => t.status === 'completed').length
  const inProgressTasks = allTasks.filter(t => t.status === 'in_progress').length

  return (
    <div className="relative">
      <div className="mb-6 p-4 rounded-lg bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">{totalTasks}</div>
              <div className="text-xs text-muted-foreground">总任务</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{completedTasks}</div>
              <div className="text-xs text-muted-foreground">已完成</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-600">{inProgressTasks}</div>
              <div className="text-xs text-muted-foreground">进行中</div>
            </div>
          </div>
          <div className="flex items-center gap-3 flex-1 max-w-xs">
            <div className="h-2 flex-1 bg-muted rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-green-500 to-primary transition-all duration-500"
                style={{ width: `${totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0}%` }}
              />
            </div>
            <span className="text-sm font-medium">{totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0}%</span>
          </div>
        </div>
      </div>
      
      <div className="absolute left-4 top-[120px] bottom-0 w-0.5 bg-gradient-to-b from-primary via-primary/50 to-muted-foreground/30" />
      
      <div className="space-y-6">
        {sortedWeeks.map(week => {
          const tasks = weekGroups[week]
          const isCurrentWeek = week === currentWeek
          const isPast = week < currentWeek
          const completedInWeek = tasks.filter(t => t.status === 'completed').length
          const progressInWeek = tasks.length > 0 ? Math.round((completedInWeek / tasks.length) * 100) : 0
          
          return (
            <div key={week} className={`relative pl-10 ${isCurrentWeek ? 'ring-2 ring-primary/30 rounded-xl p-4 -ml-2 bg-primary/5' : ''}`}>
              <div className={`absolute left-2.5 top-1 w-4 h-4 rounded-full border-2 ${
                isPast ? 'bg-green-500 border-green-500' : isCurrentWeek ? 'bg-primary border-primary animate-pulse shadow-lg shadow-primary/50' : 'bg-background border-muted-foreground/40'
              }`} />
              
              <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-lg text-foreground">
                    第 {week} 周
                  </h3>
                  {isCurrentWeek && (
                    <Badge variant="default" className="text-xs bg-primary">进行中</Badge>
                  )}
                  {isPast && (
                    <Badge variant="secondary" className="text-xs bg-green-100 text-green-700">已完成</Badge>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-1.5 w-24 bg-muted rounded-full overflow-hidden">
                    <div 
                      className={`h-full transition-all duration-500 ${isPast ? 'bg-green-500' : 'bg-primary'}`}
                      style={{ width: `${progressInWeek}%` }}
                    />
                  </div>
                  <span className="text-xs text-muted-foreground">{completedInWeek}/{tasks.length}</span>
                </div>
              </div>
              
              <div className="grid gap-2">
                {tasks.map(task => (
                  <div
                    key={task.id}
                    role="button"
                    tabIndex={disableTaskActions ? -1 : 0}
                    onClick={() => {
                      if (disableTaskActions) return
                      if (onTaskNavigate) {
                        onTaskNavigate(task)
                        return
                      }
                      onTaskClick?.(task)
                    }}
                    onKeyDown={(event) => {
                      if (disableTaskActions) return
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault()
                        if (onTaskNavigate) {
                          onTaskNavigate(task)
                          return
                        }
                        onTaskClick?.(task)
                      }
                    }}
                    className={`flex items-center gap-3 p-3 rounded-lg border transition-all duration-200 hover:shadow-md cursor-pointer text-left w-full ${disableTaskActions ? 'cursor-not-allowed opacity-65' : ''} ${getStatusColor(task.status)}`}
                  >
                    <button
                      type="button"
                      aria-label={`切换任务状态：${task.title}`}
                      className="flex-shrink-0 mt-0.5 rounded-full"
                      disabled={disableTaskActions}
                      onClick={(event) => {
                        event.stopPropagation()
                        if (disableTaskActions) return
                        onTaskClick?.(task)
                      }}
                    >
                      {getStatusIcon(task.status)}
                    </button>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium truncate">{task.title}</span>
                        <Badge variant="outline" className={`text-xs flex items-center gap-1 ${getTypeColor(task.type)}`}>
                          {getTypeIcon(task.type)}
                          {task.type}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1 truncate">{getPhaseInfo(task.phaseId)}</p>
                    </div>
                    {task.day && (
                      <div className="flex-shrink-0">
                        <span className="text-xs px-2 py-1 rounded-full bg-muted text-muted-foreground">Day {task.day}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>
      
      <div className="mt-6 pt-4 border-t flex items-center justify-center gap-6 flex-wrap text-xs text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <Circle className="h-3 w-3" />
          <span>待处理</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Clock className="h-3 w-3 text-yellow-500" />
          <span>进行中</span>
        </div>
        <div className="flex items-center gap-1.5">
          <CheckCircle2 className="h-3 w-3 text-green-500" />
          <span>已完成</span>
        </div>
        <div className="flex items-center gap-1.5">
          <BookOpen className="h-3 w-3 text-blue-600" />
          <span>学习</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Hammer className="h-3 w-3 text-purple-600" />
          <span>实操</span>
        </div>
        <div className="flex items-center gap-1.5">
          <ClipboardList className="h-3 w-3 text-orange-600" />
          <span>复盘</span>
        </div>
      </div>
    </div>
  )
}
