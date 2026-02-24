'use client'

import { useState, useSyncExternalStore } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { LearningTask } from '@/lib/learning-data'
import { ExternalLink } from 'lucide-react'

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

  const handleToggle = () => {
    const newValue = !completed
    setCompleted(newValue)
    setStoredCompletion(task.id, newValue, completionScope)
  }

  return (
    <Card className={completed ? 'opacity-60' : ''}>
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
            <CardTitle className={completed ? 'line-through' : ''}>
              {index + 1}. {task.title}
            </CardTitle>
          </div>
          <div className="flex gap-2">
            <Badge variant="outline">{task.type}</Badge>
            <Badge variant="secondary">{task.estimate}</Badge>
            <Badge>{task.difficulty}</Badge>
            {completed && <Badge variant="default">已完成</Badge>}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <p className="text-sm text-muted-foreground">任务目标</p>
          <p>{task.objective}</p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">完成标准</p>
          <p>{task.doneCriteria}</p>
        </div>

        {task.knowledgePoints && task.knowledgePoints.length > 0 && (
          <div>
            <p className="text-sm text-muted-foreground mb-2">知识点</p>
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
            <p className="text-sm text-muted-foreground mb-2">学习资料</p>
            <div className="flex flex-wrap gap-3">
              {task.materials.map((m, i) => (
                <a
                  key={i}
                  href={m.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                >
                  <ExternalLink className="h-3 w-3" />
                  {m.title}
                  <Badge variant="outline" className="ml-1">
                    {m.type === 'video' ? '视频' : '文章'}
                  </Badge>
                </a>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
