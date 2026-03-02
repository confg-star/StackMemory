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

export interface SafeLearningMaterial {
  title: string
  url: string
  type: 'article' | 'video'
  isGenerated?: boolean
  content?: string
}

export interface SafeKnowledgePoint {
  id: string
  title: string
  description?: string
  materials: SafeLearningMaterial[]
}

export interface SafeLearningTask {
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
  materials?: SafeLearningMaterial[]
  knowledgePoints?: SafeKnowledgePoint[]
}

export interface SafeLearningPhase {
  id: string
  title: string
  weeks: string
  goal: string
  focus: string[]
  deliverables: string[]
  tasks: SafeLearningTask[]
}

export interface SafeLearningOverview {
  whatIs: string
  keyTechnologies: string[]
  capabilities: string[]
  commonScenarios: string[]
  quickStartPath: string[]
  efficientLearningTips: string[]
}

export interface SafeRoadmapData {
  overview: SafeLearningOverview
  phases: SafeLearningPhase[]
  currentTasks: SafeLearningTask[]
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string')
}

function toStringArray(value: unknown, fallback: string[] = []): string[] {
  if (isStringArray(value)) return value
  return fallback
}

function normalizeLearningMaterial(m: unknown): SafeLearningMaterial | null {
  if (!isRecord(m)) return null
  const title = typeof m.title === 'string' ? m.title.trim() : ''
  const url = typeof m.url === 'string' ? m.url.trim() : ''
  if (!title || !url) return null
  return {
    title,
    url,
    type: m.type === 'video' ? 'video' : 'article',
    isGenerated: Boolean(m.isGenerated),
    content: typeof m.content === 'string' ? m.content.trim() : undefined,
  }
}

function normalizeKnowledgePoint(kp: unknown): SafeKnowledgePoint | null {
  if (!isRecord(kp)) return null
  const id = typeof kp.id === 'string' ? kp.id.trim() : ''
  const title = typeof kp.title === 'string' ? kp.title.trim() : ''
  if (!id || !title) return null

  const materials = Array.isArray(kp.materials)
    ? (kp.materials.map(normalizeLearningMaterial).filter(Boolean) as SafeLearningMaterial[])
    : []

  return {
    id,
    title,
    description: typeof kp.description === 'string' ? kp.description.trim() : undefined,
    materials,
  }
}

function normalizeLearningTask(task: unknown): SafeLearningTask | null {
  if (!isRecord(task)) return null
  const id = typeof task.id === 'string' ? task.id.trim() : ''
  const title = typeof task.title === 'string' ? task.title.trim() : ''
  if (!id || !title) return null

  const weekValue = task.week
  const dayValue = task.day
  const week = Number.isInteger(weekValue) && Number(weekValue) > 0 ? Number(weekValue) : 1
  const day = Number.isInteger(dayValue) && Number(dayValue) > 0 ? Number(dayValue) : undefined

  const type = task.type === '实操' || task.type === '复盘' ? task.type : '学习'
  const status = task.status === 'completed' || task.status === 'in_progress' ? task.status : 'pending'
  const difficulty = task.difficulty === '简单' || task.difficulty === '中等' || task.difficulty === '进阶' ? task.difficulty : undefined

  const materials = Array.isArray(task.materials)
    ? (task.materials.map(normalizeLearningMaterial).filter(Boolean) as SafeLearningMaterial[])
    : []
  const knowledgePoints = Array.isArray(task.knowledgePoints)
    ? (task.knowledgePoints.map(normalizeKnowledgePoint).filter(Boolean) as SafeKnowledgePoint[])
    : []

  return {
    id,
    title,
    week,
    day,
    type,
    status,
    difficulty,
    estimate: typeof task.estimate === 'string' ? task.estimate.trim() : undefined,
    objective: typeof task.objective === 'string' ? task.objective.trim() : undefined,
    doneCriteria: typeof task.doneCriteria === 'string' ? task.doneCriteria.trim() : undefined,
    materials,
    knowledgePoints,
  }
}

function normalizeLearningPhase(phase: unknown, index: number): SafeLearningPhase {
  if (!isRecord(phase)) {
    return {
      id: `phase-${index + 1}`,
      title: `阶段 ${index + 1}`,
      weeks: '自定义',
      goal: '',
      focus: [],
      deliverables: [],
      tasks: [],
    }
  }

  const tasks = Array.isArray(phase.tasks)
    ? (phase.tasks.map(normalizeLearningTask).filter(Boolean) as SafeLearningTask[])
    : []

  return {
    id: typeof phase.id === 'string' && phase.id.trim() ? phase.id.trim() : `phase-${index + 1}`,
    title: typeof phase.title === 'string' ? phase.title.trim() : `阶段 ${index + 1}`,
    weeks: typeof phase.weeks === 'string' ? phase.weeks : '自定义',
    goal: typeof phase.goal === 'string' ? phase.goal.trim() : '',
    focus: toStringArray(phase.focus),
    deliverables: toStringArray(phase.deliverables),
    tasks,
  }
}

function normalizeLearningOverview(overview: unknown): SafeLearningOverview {
  if (!isRecord(overview)) {
    return {
      whatIs: '暂无介绍',
      keyTechnologies: [],
      capabilities: [],
      commonScenarios: [],
      quickStartPath: [],
      efficientLearningTips: [],
    }
  }

  return {
    whatIs: typeof overview.whatIs === 'string' ? overview.whatIs.trim() : '暂无介绍',
    keyTechnologies: toStringArray(overview.keyTechnologies, []),
    capabilities: toStringArray(overview.capabilities, []),
    commonScenarios: toStringArray(overview.commonScenarios, []),
    quickStartPath: toStringArray(overview.quickStartPath, []),
    efficientLearningTips: toStringArray(overview.efficientLearningTips, []),
  }
}

export function normalizeRoadmapDataSafe(data: unknown): SafeRoadmapData {
  if (!isRecord(data)) {
    return {
      overview: normalizeLearningOverview(undefined),
      phases: [],
      currentTasks: [],
    }
  }

  const overview = normalizeLearningOverview(data.overview)
  const phases = Array.isArray(data.phases)
    ? data.phases.map((phase, index) => normalizeLearningPhase(phase, index))
    : []
  const currentTasks = Array.isArray(data.currentTasks)
    ? data.currentTasks.map(normalizeLearningTask).filter(Boolean) as SafeLearningTask[]
    : []

  return {
    overview,
    phases,
    currentTasks,
  }
}
