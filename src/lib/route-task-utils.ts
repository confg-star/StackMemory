export interface RouteTimelineTask {
  id: string
  title: string
  week: number
  day?: number
  type: '学习' | '实操' | '复盘'
  status: 'pending' | 'in_progress' | 'completed'
  difficulty?: '简单' | '中等' | '进阶'
  estimate?: string
  objective?: string
  doneCriteria?: string
  materials?: Array<{
    title: string
    url: string
    type: 'article' | 'video'
    isGenerated?: boolean
    content?: string
  }>
  knowledgePoints?: Array<{
    id: string
    title: string
    description?: string
    materials: Array<{
      title: string
      url: string
      type: 'article' | 'video'
      isGenerated?: boolean
      content?: string
    }>
  }>
}

export function normalizeTaskDaysByWeek<T extends { week: number; day?: number }>(tasks: T[]): T[] {
  if (tasks.length === 0) return tasks

  const normalized = [...tasks]
  const weekBuckets = new Map<number, Array<{ task: T; index: number }>>()

  tasks.forEach((task, index) => {
    const safeWeek = Number.isInteger(task.week) && task.week > 0 ? task.week : 1
    const bucket = weekBuckets.get(safeWeek) || []
    bucket.push({ task: { ...task, week: safeWeek }, index })
    weekBuckets.set(safeWeek, bucket)
  })

  for (const [, bucket] of weekBuckets) {
    bucket
      .sort((a, b) => {
        const dayA = Number.isInteger(a.task.day) && (a.task.day as number) > 0 ? (a.task.day as number) : Number.MAX_SAFE_INTEGER
        const dayB = Number.isInteger(b.task.day) && (b.task.day as number) > 0 ? (b.task.day as number) : Number.MAX_SAFE_INTEGER
        if (dayA !== dayB) return dayA - dayB
        return a.index - b.index
      })
      .forEach((item, position) => {
        normalized[item.index] = {
          ...item.task,
          day: position + 1,
        }
      })
  }

  return normalized
}

export const TASK_DATE_RANGE_DAYS = 30

export function resolveRouteId(routeId: string | null | undefined, source: string): string | null {
  if (typeof routeId === 'string' && routeId.trim().length > 0) {
    return routeId
  }

  console.warn(`[route-guard] blocked request without routeId (${source})`)
  return null
}

export function buildRouteDateScope(routeId: string, dateKey: string): string {
  return `${routeId}:${dateKey}`
}

interface BuildTasksPathInput {
  routeId?: string | null
  date: string
  taskId?: string | null
}

export function buildTasksPath({ routeId, date, taskId }: BuildTasksPathInput): string {
  const params = new URLSearchParams()
  if (typeof routeId === 'string' && routeId.trim().length > 0) {
    params.set('routeId', routeId)
  }
  params.set('date', date)
  if (typeof taskId === 'string' && taskId.trim().length > 0) {
    params.set('taskId', taskId)
  }
  return `/tasks?${params.toString()}`
}

export function normalizeDate(input: Date): Date {
  return new Date(input.getFullYear(), input.getMonth(), input.getDate())
}

export function formatDateKey(input: Date): string {
  const date = normalizeDate(input)
  const year = date.getFullYear()
  const month = `${date.getMonth() + 1}`.padStart(2, '0')
  const day = `${date.getDate()}`.padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function parseDateKey(value?: string | null): Date | null {
  if (!value) return null
  const matched = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (!matched) return null
  const year = Number.parseInt(matched[1], 10)
  const month = Number.parseInt(matched[2], 10)
  const day = Number.parseInt(matched[3], 10)
  const date = new Date(year, month - 1, day)
  if (Number.isNaN(date.getTime())) return null
  if (date.getFullYear() !== year || date.getMonth() + 1 !== month || date.getDate() !== day) return null
  return normalizeDate(date)
}

export function getTaskDateRange(today: Date, rangeDays = TASK_DATE_RANGE_DAYS): { min: Date; max: Date } {
  const normalizedToday = normalizeDate(today)
  return {
    min: shiftDate(normalizedToday, -rangeDays),
    max: shiftDate(normalizedToday, rangeDays),
  }
}

export function isTaskDateInRange(date: Date, today: Date, rangeDays = TASK_DATE_RANGE_DAYS): boolean {
  const normalized = normalizeDate(date)
  const { min, max } = getTaskDateRange(today, rangeDays)
  return normalized >= min && normalized <= max
}

export function canShiftTaskDate(date: Date, offset: number, today: Date, rangeDays = TASK_DATE_RANGE_DAYS): boolean {
  return isTaskDateInRange(shiftDate(date, offset), today, rangeDays)
}

export type TaskQueryDateResolution = {
  date: Date
  fallbackReason: 'invalid' | 'out_of_range' | null
}

export function resolveTaskQueryDate(value: string | null | undefined, today: Date, rangeDays = TASK_DATE_RANGE_DAYS): TaskQueryDateResolution {
  const normalizedToday = normalizeDate(today)
  if (!value || value.trim().length === 0) {
    return { date: normalizedToday, fallbackReason: null }
  }

  const parsed = parseDateKey(value)
  if (!parsed) {
    return { date: normalizedToday, fallbackReason: 'invalid' }
  }

  if (!isTaskDateInRange(parsed, normalizedToday, rangeDays)) {
    return { date: normalizedToday, fallbackReason: 'out_of_range' }
  }

  return { date: parsed, fallbackReason: null }
}

export function toRouteTaskDate(task: Pick<RouteTimelineTask, 'week' | 'day'>, routeCreatedAt: string): Date {
  const base = normalizeDate(new Date(routeCreatedAt))
  const safeWeek = Math.max(1, task.week || 1)
  const safeDay = Math.max(1, task.day || 1)
  const offsetDays = (safeWeek - 1) * 7 + (safeDay - 1)
  const mapped = new Date(base)
  mapped.setDate(base.getDate() + offsetDays)
  return normalizeDate(mapped)
}

export function toRouteTaskDateKey(task: Pick<RouteTimelineTask, 'week' | 'day'>, routeCreatedAt: string): string {
  return formatDateKey(toRouteTaskDate(task, routeCreatedAt))
}

export function shiftDate(date: Date, days: number): Date {
  const next = normalizeDate(date)
  next.setDate(next.getDate() + days)
  return next
}
