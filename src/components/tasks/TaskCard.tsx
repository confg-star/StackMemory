'use client'

import { useState, useSyncExternalStore } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Button } from '@/components/ui/button'
import { LearningTask } from '@/lib/learning-data'
import { ExternalLink, Target, CheckCircle2, BookOpen, Sparkles, FileText, Video, Lightbulb, ChevronDown, Trophy } from 'lucide-react'

const STORAGE_KEY = 'stackmemory_task_completion'

function getStoredCompletion(taskId: string, scope: string): boolean {
  if (typeof window === 'undefined') return false
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      const data = JSON.parse(stored)
      return data[`${scope}:${taskId}`] === true
    }
  } catch {
    // ignore
  }
  return false
}

function setStoredCompletion(taskId: string, completed: boolean, scope: string) {
  if (typeof window === 'undefined') return
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    const data = stored ? JSON.parse(stored) : {}
    data[`${scope}:${taskId}`] = completed
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
    window.dispatchEvent(new CustomEvent('task-completion-changed'))
  } catch {
    // ignore
  }
}

function subscribe(callback: () => void) {
  window.addEventListener('storage', callback)
  return () => window.removeEventListener('storage', callback)
}

function getSnapshot(): boolean {
  return true
}

function getServerSnapshot(): boolean {
  return false
}

interface TaskCardProps {
  task: LearningTask
  index: number
  completionScope?: string
}

export function TaskCard({ task, index, completionScope = 'global' }: TaskCardProps) {
  const isClient = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
  const [completed, setCompleted] = useState(() => getStoredCompletion(task.id, completionScope))
  const [expanded, setExpanded] = useState(true)
  const [celebrating, setCelebrating] = useState(false)

  const typeMeta = {
    学习: { icon: <BookOpen className="h-3.5 w-3.5" />, className: 'bg-blue-500/10 text-blue-700 border-blue-500/30' },
    实操: { icon: <Sparkles className="h-3.5 w-3.5" />, className: 'bg-violet-500/10 text-violet-700 border-violet-500/30' },
    复盘: { icon: <Lightbulb className="h-3.5 w-3.5" />, className: 'bg-amber-500/10 text-amber-700 border-amber-500/30' },
  } as const

  const currentTypeMeta = typeMeta[task.type]

  const handleToggle = () => {
    const newValue = !completed
    setCompleted(newValue)
    setStoredCompletion(task.id, newValue, completionScope)
    if (newValue) {
      setCelebrating(true)
      window.setTimeout(() => setCelebrating(false), 900)
    }
  }

  return (
    <Card className={`relative overflow-hidden transition-all duration-300 hover:shadow-md ${completed ? 'opacity-90 bg-green-500/[0.04] border-green-500/25' : 'hover:-translate-y-0.5'}`}>
      {celebrating && (
        <>
          <span className="absolute right-3 top-3 inline-flex h-6 w-6 rounded-full bg-green-500/20 animate-ping" />
          <span className="absolute right-3 top-3 inline-flex h-6 w-6 items-center justify-center rounded-full bg-green-500/30">
            <Trophy className="h-3.5 w-3.5 text-green-700" />
          </span>
        </>
      )}
      <CardHeader>
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            {isClient && (
              <Checkbox
                checked={completed}
                onCheckedChange={handleToggle}
                id={`task-${task.id}`}
              />
            )}
            <CardTitle className={`text-lg ${completed ? 'line-through' : ''}`}>
              <span className="inline-flex items-center gap-2">
                <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-primary/10 px-2 text-xs font-semibold text-primary">
                  {index + 1}
                </span>
                {task.title}
              </span>
            </CardTitle>
          </div>
          <div className="flex gap-2">
            <Badge variant="outline" className={`inline-flex items-center gap-1 ${currentTypeMeta.className}`}>
              {currentTypeMeta.icon}
              {task.type}
            </Badge>
            <Badge variant="secondary">{task.estimate}</Badge>
            <Badge>{task.difficulty}</Badge>
            {completed && <Badge variant="default">已完成</Badge>}
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label={expanded ? '收起任务详情' : '展开任务详情'}
              onClick={() => setExpanded((prev) => !prev)}
              className="h-7 w-7"
            >
              <ChevronDown className={`h-4 w-4 transition-transform ${expanded ? 'rotate-0' : '-rotate-90'}`} />
            </Button>
          </div>
        </div>
        <div className="pt-1">
          <div className="h-1.5 rounded-full bg-muted overflow-hidden">
            <div className={`h-full transition-all duration-500 ${completed ? 'w-full bg-green-500' : 'w-1/3 bg-primary/50'}`} />
          </div>
        </div>
      </CardHeader>
      <CardContent className={`space-y-4 transition-all duration-300 ${expanded ? 'max-h-[1200px] opacity-100' : 'max-h-0 overflow-hidden opacity-0 p-0'}`}>
        <div className="rounded-lg border bg-muted/20 p-3">
          <p className="text-sm text-muted-foreground inline-flex items-center gap-1.5">
            <Target className="h-3.5 w-3.5" />
            任务目标
          </p>
          <p>{task.objective}</p>
        </div>
        <div className="rounded-lg border bg-muted/20 p-3">
          <p className="text-sm text-muted-foreground inline-flex items-center gap-1.5">
            <CheckCircle2 className="h-3.5 w-3.5" />
            完成标准
          </p>
          <p>{task.doneCriteria}</p>
        </div>

        {task.knowledgePoints && task.knowledgePoints.length > 0 && (
          <div>
            <p className="text-sm text-muted-foreground mb-2 inline-flex items-center gap-1.5">
              <Lightbulb className="h-3.5 w-3.5" />
              知识点
            </p>
            <div className="space-y-2">
              {task.knowledgePoints.map((kp) => (
                <div key={kp.id} className="border rounded-md p-3 bg-muted/30">
                  <p className="font-medium">{kp.title}</p>
                  {kp.description && (
                    <p className="text-sm text-muted-foreground">{kp.description}</p>
                  )}
                  {kp.materials.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {kp.materials.map((m, i) => (
                        m.isGenerated ? (
                          <div key={i} className="rounded-md border bg-background p-2 text-sm w-full">
                            <p className="font-medium text-foreground">{m.title}</p>
                            {m.content && <p className="mt-1 text-muted-foreground leading-6">{m.content}</p>}
                          </div>
                        ) : (
                          <a
                            key={i}
                            href={m.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                          >
                            <ExternalLink className="h-3 w-3" />
                            {m.title}
                          </a>
                        )
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {task.materials && task.materials.length > 0 && (
          <div>
            <p className="text-sm text-muted-foreground mb-2 inline-flex items-center gap-1.5">
              <BookOpen className="h-3.5 w-3.5" />
              学习资料
            </p>
            <div className="flex flex-wrap gap-3">
              {task.materials.map((m, i) => (
                m.isGenerated ? (
                  <div key={i} className="w-full rounded-md border bg-muted/20 p-3">
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">自生成资料</Badge>
                      <Badge variant="outline">{m.type === 'video' ? '视频讲解稿' : '文章笔记'}</Badge>
                    </div>
                    <p className="mt-2 font-medium">{m.title}</p>
                    {m.content && <p className="mt-1 text-sm text-muted-foreground leading-6">{m.content}</p>}
                  </div>
                ) : (
                  <a
                    key={i}
                    href={m.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 rounded-md border bg-background px-3 py-1.5 text-sm text-primary hover:bg-primary/5 transition-colors"
                  >
                    {m.type === 'video' ? <Video className="h-3.5 w-3.5" /> : <FileText className="h-3.5 w-3.5" />}
                    {m.title}
                    <Badge variant="outline" className="ml-1">
                      {m.type === 'video' ? '视频' : '文章'}
                    </Badge>
                    <ExternalLink className="h-3 w-3" />
                  </a>
                )
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
