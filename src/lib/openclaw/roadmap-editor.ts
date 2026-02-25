import pg from 'pg'
import { randomUUID } from 'crypto'
import { localPgConfig } from '@/lib/data-config'

const { Pool } = pg

type TaskStatus = 'pending' | 'in_progress' | 'completed'
type TaskType = '学习' | '实操' | '复盘'
type MaterialType = 'article' | 'video'

interface LearningMaterial {
  title: string
  url: string
  type: MaterialType
  isGenerated?: boolean
  content?: string
}

interface KnowledgePoint {
  id: string
  title: string
  description?: string
  materials: LearningMaterial[]
}

interface LearningTask {
  id: string
  title: string
  week: number
  day?: number
  type: TaskType
  status: TaskStatus
  difficulty?: '简单' | '中等' | '进阶'
  estimate?: string
  objective?: string
  doneCriteria?: string
  materials?: LearningMaterial[]
  knowledgePoints?: KnowledgePoint[]
}

interface LearningPhase {
  id: string
  title: string
  weeks: string
  goal: string
  focus: string[]
  deliverables: string[]
  tasks: LearningTask[]
}

interface LearningOverview {
  whatIs: string
  keyTechnologies: string[]
  capabilities: string[]
  commonScenarios: string[]
  quickStartPath: string[]
  efficientLearningTips: string[]
}

interface RoadmapData {
  overview?: Partial<LearningOverview>
  phases: LearningPhase[]
  currentTasks: LearningTask[]
}

interface RouteRow {
  id: string
  user_id: string
  topic: string
  background: string | null
  goals: string | null
  weeks: number
  roadmap_data: unknown
  is_current: boolean
  created_at: string
  updated_at: string
}

export interface OpenClawRouteTaskInput {
  id?: string
  title: string
  week: number
  day?: number
  type?: TaskType
  status?: TaskStatus
  difficulty?: '简单' | '中等' | '进阶'
  estimate?: string
  objective?: string
  doneCriteria?: string
  materials?: LearningMaterial[]
  knowledgePoints?: KnowledgePoint[]
  phaseId?: string
  includeInCurrentTasks?: boolean
}

export interface OpenClawRouteTaskPatch {
  title?: string
  week?: number
  day?: number
  type?: TaskType
  status?: TaskStatus
  difficulty?: '简单' | '中等' | '进阶'
  estimate?: string
  objective?: string
  doneCriteria?: string
  phaseId?: string
}

export interface OpenClawMaterialInput {
  title: string
  url: string
  type: MaterialType
  isGenerated?: boolean
  content?: string
  knowledgePointId?: string
}

export interface OpenClawRoutePatch {
  topic?: string
  background?: string
  goals?: string
  weeks?: number
  is_current?: boolean
  roadmap_data?: Record<string, unknown>
  overview?: Partial<LearningOverview>
}

let pool: pg.Pool | null = null

function getPool(): pg.Pool {
  if (!pool) {
    pool = new Pool({
      host: localPgConfig.host,
      port: localPgConfig.port,
      database: localPgConfig.database,
      user: localPgConfig.user,
      password: localPgConfig.password,
    })
  }
  return pool
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function toStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
}

function sanitizeMaterial(input: LearningMaterial): LearningMaterial {
  const url = typeof input.url === 'string' ? input.url.trim() : ''
  const title = typeof input.title === 'string' ? input.title.trim() : ''

  if (!title) {
    throw new Error('资料 title 不能为空')
  }

  if (!/^https?:\/\//i.test(url) && !/^about:generated\//i.test(url)) {
    throw new Error('资料 url 必须是 http(s) 或 about:generated/*')
  }

  return {
    title,
    url,
    type: input.type === 'video' ? 'video' : 'article',
    isGenerated: Boolean(input.isGenerated),
    content: typeof input.content === 'string' && input.content.trim().length > 0 ? input.content.trim() : undefined,
  }
}

function sanitizeMaterials(inputs: LearningMaterial[] | undefined): LearningMaterial[] {
  if (!inputs || inputs.length === 0) return []
  const unique = new Map<string, LearningMaterial>()

  for (const raw of inputs) {
    try {
      const material = sanitizeMaterial(raw)
      unique.set(material.url, material)
    } catch {
      continue
    }
  }

  return Array.from(unique.values())
}

function sanitizeKnowledgePoints(inputs: KnowledgePoint[] | undefined): KnowledgePoint[] {
  if (!inputs || inputs.length === 0) return []

  return inputs
    .filter((kp) => typeof kp?.id === 'string' && kp.id.trim().length > 0 && typeof kp?.title === 'string' && kp.title.trim().length > 0)
    .map((kp) => ({
      id: kp.id.trim(),
      title: kp.title.trim(),
      description: typeof kp.description === 'string' && kp.description.trim().length > 0 ? kp.description.trim() : undefined,
      materials: sanitizeMaterials(kp.materials),
    }))
}

function sanitizeTaskPayload(input: OpenClawRouteTaskInput): LearningTask {
  if (!input.title || !input.title.trim()) {
    throw new Error('任务 title 不能为空')
  }

  if (!Number.isInteger(input.week) || input.week < 1 || input.week > 52) {
    throw new Error('任务 week 必须在 1-52 之间')
  }

  if (input.day !== undefined && (!Number.isInteger(input.day) || input.day < 1 || input.day > 7)) {
    throw new Error('任务 day 必须在 1-7 之间')
  }

  return {
    id: input.id?.trim() || `task-${randomUUID()}`,
    title: input.title.trim(),
    week: input.week,
    day: input.day,
    type: input.type || '学习',
    status: input.status || 'pending',
    difficulty: input.difficulty,
    estimate: input.estimate?.trim() || undefined,
    objective: input.objective?.trim() || undefined,
    doneCriteria: input.doneCriteria?.trim() || undefined,
    materials: sanitizeMaterials(input.materials),
    knowledgePoints: sanitizeKnowledgePoints(input.knowledgePoints),
  }
}

function normalizeRoadmapData(raw: unknown): RoadmapData {
  if (!isRecord(raw)) {
    return { phases: [], currentTasks: [] }
  }

  const phases = Array.isArray(raw.phases)
    ? raw.phases
        .filter((phase): phase is Record<string, unknown> => isRecord(phase))
        .map((phase, index) => {
          const tasks = Array.isArray(phase.tasks)
            ? phase.tasks
                .filter((task): task is Record<string, unknown> => isRecord(task) && typeof task.id === 'string' && typeof task.title === 'string')
                .map((task) => ({
                  id: String(task.id),
                  title: String(task.title),
                  week: Number.isInteger(task.week) && Number(task.week) > 0 ? Number(task.week) : 1,
                  day: Number.isInteger(task.day) ? Number(task.day) : undefined,
                  type: task.type === '实操' || task.type === '复盘' ? task.type : '学习',
                  status: task.status === 'completed' || task.status === 'in_progress' ? task.status : 'pending',
                  difficulty: task.difficulty === '简单' || task.difficulty === '中等' || task.difficulty === '进阶' ? task.difficulty : undefined,
                  estimate: typeof task.estimate === 'string' ? task.estimate : undefined,
                  objective: typeof task.objective === 'string' ? task.objective : undefined,
                  doneCriteria: typeof task.doneCriteria === 'string' ? task.doneCriteria : undefined,
                  materials: sanitizeMaterials(task.materials as LearningMaterial[] | undefined),
                  knowledgePoints: sanitizeKnowledgePoints(task.knowledgePoints as KnowledgePoint[] | undefined),
                }))
            : []

          return {
            id: typeof phase.id === 'string' && phase.id.trim() ? phase.id : `phase-${index + 1}`,
            title: typeof phase.title === 'string' ? phase.title : `阶段 ${index + 1}`,
            weeks: typeof phase.weeks === 'string' ? phase.weeks : '自定义阶段',
            goal: typeof phase.goal === 'string' ? phase.goal : '',
            focus: toStringArray(phase.focus),
            deliverables: toStringArray(phase.deliverables),
            tasks,
          } as LearningPhase
        })
    : []

  const currentTasks = Array.isArray(raw.currentTasks)
    ? raw.currentTasks
        .filter((task): task is Record<string, unknown> => isRecord(task) && typeof task.id === 'string' && typeof task.title === 'string')
        .map((task) => ({
          id: String(task.id),
          title: String(task.title),
          week: Number.isInteger(task.week) && Number(task.week) > 0 ? Number(task.week) : 1,
          day: Number.isInteger(task.day) ? Number(task.day) : undefined,
          type: task.type === '实操' || task.type === '复盘' ? task.type : '学习',
          status: task.status === 'completed' || task.status === 'in_progress' ? task.status : 'pending',
          difficulty: task.difficulty === '简单' || task.difficulty === '中等' || task.difficulty === '进阶' ? task.difficulty : undefined,
          estimate: typeof task.estimate === 'string' ? task.estimate : undefined,
          objective: typeof task.objective === 'string' ? task.objective : undefined,
          doneCriteria: typeof task.doneCriteria === 'string' ? task.doneCriteria : undefined,
          materials: sanitizeMaterials(task.materials as LearningMaterial[] | undefined),
          knowledgePoints: sanitizeKnowledgePoints(task.knowledgePoints as KnowledgePoint[] | undefined),
        }))
    : []

  const overview = isRecord(raw.overview) ? raw.overview : undefined

  return {
    overview,
    phases,
    currentTasks,
  }
}

function findTaskPointer(roadmap: RoadmapData, taskId: string): { phaseIndex: number; taskIndex: number } | null {
  for (let phaseIndex = 0; phaseIndex < roadmap.phases.length; phaseIndex++) {
    const taskIndex = roadmap.phases[phaseIndex].tasks.findIndex((task) => task.id === taskId)
    if (taskIndex >= 0) {
      return { phaseIndex, taskIndex }
    }
  }
  return null
}

function findPhaseIndexForTask(roadmap: RoadmapData, task: LearningTask, phaseId?: string): number {
  if (phaseId) {
    const byId = roadmap.phases.findIndex((phase) => phase.id === phaseId)
    if (byId >= 0) return byId
  }

  const byWeek = roadmap.phases.findIndex((phase) => phase.tasks.some((existingTask) => existingTask.week === task.week))
  if (byWeek >= 0) return byWeek

  if (roadmap.phases.length > 0) {
    return roadmap.phases.length - 1
  }

  roadmap.phases.push({
    id: 'phase-custom',
    title: '自定义阶段',
    weeks: '自定义',
    goal: '由 OpenClaw 按反馈动态调整',
    focus: ['按用户反馈迭代任务'],
    deliverables: ['可执行学习清单'],
    tasks: [],
  })
  return 0
}

function nextDayInWeek(roadmap: RoadmapData, week: number): number {
  const days = roadmap.phases
    .flatMap((phase) => phase.tasks)
    .filter((task) => task.week === week && Number.isInteger(task.day))
    .map((task) => Number(task.day))

  if (days.length === 0) return 1
  return Math.min(Math.max(...days) + 1, 7)
}

function upsertCurrentTask(roadmap: RoadmapData, task: LearningTask): void {
  const index = roadmap.currentTasks.findIndex((item) => item.id === task.id)
  if (index >= 0) {
    roadmap.currentTasks[index] = { ...roadmap.currentTasks[index], ...task }
    return
  }

  roadmap.currentTasks.push(task)
}

function removeCurrentTask(roadmap: RoadmapData, taskId: string): void {
  roadmap.currentTasks = roadmap.currentTasks.filter((task) => task.id !== taskId)
}

function ensureTaskStatus(status: unknown): TaskStatus {
  if (status === 'in_progress' || status === 'completed') {
    return status
  }
  return 'pending'
}

function sanitizeRoutePatch(input: OpenClawRoutePatch): OpenClawRoutePatch {
  if (input.weeks !== undefined && (!Number.isInteger(input.weeks) || input.weeks < 1 || input.weeks > 52)) {
    throw new Error('weeks 必须在 1-52 之间')
  }

  if (input.topic !== undefined && (!input.topic.trim() || input.topic.trim().length > 500)) {
    throw new Error('topic 不能为空且长度不能超过 500')
  }

  return {
    topic: input.topic?.trim(),
    background: input.background?.trim(),
    goals: input.goals?.trim(),
    weeks: input.weeks,
    is_current: input.is_current,
    roadmap_data: input.roadmap_data,
    overview: input.overview,
  }
}

async function getRouteForUpdate(client: pg.PoolClient, userId: string, routeId: string): Promise<RouteRow> {
  const { rows } = await client.query(
    `SELECT id, user_id, topic, background, goals, weeks, roadmap_data, is_current, created_at, updated_at
     FROM routes
     WHERE id = $1 AND user_id = $2
     FOR UPDATE`,
    [routeId, userId]
  )

  if (rows.length === 0) {
    throw new Error('路线不存在或无权访问')
  }

  return rows[0] as RouteRow
}

async function syncRouteTasksFromRoadmap(client: pg.PoolClient, userId: string, routeId: string, roadmap: RoadmapData): Promise<void> {
  const tasks = roadmap.phases.flatMap((phase) => phase.tasks)
  const taskIds = tasks.map((task) => task.id)

  if (taskIds.length === 0) {
    await client.query('DELETE FROM route_tasks WHERE route_id = $1 AND user_id = $2', [routeId, userId])
    return
  }

  await client.query(
    'DELETE FROM route_tasks WHERE route_id = $1 AND user_id = $2 AND NOT (task_id = ANY($3::text[]))',
    [routeId, userId, taskIds]
  )

  for (const task of tasks) {
    await client.query(
      `INSERT INTO route_tasks (route_id, user_id, task_id, title, task_type, status, week, day, completed_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CASE WHEN $6 = 'completed' THEN NOW() ELSE NULL END)
       ON CONFLICT (route_id, task_id)
       DO UPDATE SET
         title = EXCLUDED.title,
         task_type = EXCLUDED.task_type,
         status = EXCLUDED.status,
         week = EXCLUDED.week,
         day = EXCLUDED.day,
         completed_at = CASE WHEN EXCLUDED.status = 'completed' THEN NOW() ELSE NULL END,
         updated_at = NOW()`,
      [
        routeId,
        userId,
        task.id,
        task.title,
        task.type,
        ensureTaskStatus(task.status),
        task.week,
        task.day || null,
      ]
    )
  }
}

export async function listOpenClawRoutes(
  userId: string,
  options: { limit?: number; offset?: number; includeRoadmap?: boolean } = {}
): Promise<{ routes: RouteRow[]; total: number }> {
  const limit = Number.isInteger(options.limit) ? Math.min(Math.max(options.limit as number, 1), 100) : 20
  const offset = Number.isInteger(options.offset) ? Math.max(options.offset as number, 0) : 0
  const includeRoadmap = Boolean(options.includeRoadmap)
  const pool = getPool()

  const countResult = await pool.query('SELECT COUNT(*)::int AS total FROM routes WHERE user_id = $1', [userId])
  const total = countResult.rows[0]?.total || 0

  const selectRoadmap = includeRoadmap ? 'roadmap_data,' : ''
  const { rows } = await pool.query(
    `SELECT id, user_id, topic, background, goals, weeks, ${selectRoadmap} is_current, created_at, updated_at
     FROM routes
     WHERE user_id = $1
     ORDER BY updated_at DESC
     LIMIT $2 OFFSET $3`,
    [userId, limit, offset]
  )

  return {
    routes: rows as RouteRow[],
    total,
  }
}

export async function getOpenClawRoute(userId: string, routeId: string): Promise<RouteRow | null> {
  const pool = getPool()
  const { rows } = await pool.query(
    `SELECT id, user_id, topic, background, goals, weeks, roadmap_data, is_current, created_at, updated_at
     FROM routes
     WHERE id = $1 AND user_id = $2`,
    [routeId, userId]
  )

  if (rows.length === 0) return null
  return rows[0] as RouteRow
}

export async function patchOpenClawRoute(userId: string, routeId: string, patch: OpenClawRoutePatch): Promise<RouteRow> {
  const payload = sanitizeRoutePatch(patch)
  const pool = getPool()
  const client = await pool.connect()

  try {
    await client.query('BEGIN')
    const route = await getRouteForUpdate(client, userId, routeId)

    const roadmap = payload.roadmap_data ? normalizeRoadmapData(payload.roadmap_data) : normalizeRoadmapData(route.roadmap_data)

    if (payload.overview && isRecord(payload.overview)) {
      roadmap.overview = {
        ...(isRecord(roadmap.overview) ? roadmap.overview : {}),
        ...payload.overview,
      }
    }

    if (payload.roadmap_data) {
      await syncRouteTasksFromRoadmap(client, userId, routeId, roadmap)
    }

    if (payload.is_current === true) {
      await client.query('UPDATE routes SET is_current = false WHERE user_id = $1', [userId])
    }

    const { rows } = await client.query(
      `UPDATE routes
       SET topic = $1,
           background = $2,
           goals = $3,
           weeks = $4,
           roadmap_data = $5::jsonb,
           is_current = COALESCE($6, is_current),
           updated_at = NOW()
       WHERE id = $7 AND user_id = $8
       RETURNING id, user_id, topic, background, goals, weeks, roadmap_data, is_current, created_at, updated_at`,
      [
        payload.topic ?? route.topic,
        payload.background ?? route.background,
        payload.goals ?? route.goals,
        payload.weeks ?? route.weeks,
        JSON.stringify(roadmap),
        payload.is_current ?? null,
        routeId,
        userId,
      ]
    )

    await client.query('COMMIT')
    return rows[0] as RouteRow
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}

export async function addTaskToRoute(userId: string, routeId: string, input: OpenClawRouteTaskInput): Promise<RouteRow> {
  const task = sanitizeTaskPayload(input)

  const pool = getPool()
  const client = await pool.connect()

  try {
    await client.query('BEGIN')
    const route = await getRouteForUpdate(client, userId, routeId)
    const roadmap = normalizeRoadmapData(route.roadmap_data)

    if (findTaskPointer(roadmap, task.id)) {
      throw new Error('任务 ID 已存在，请使用新的 id')
    }

    if (!task.day) {
      task.day = nextDayInWeek(roadmap, task.week)
    }

    const phaseIndex = findPhaseIndexForTask(roadmap, task, input.phaseId)
    roadmap.phases[phaseIndex].tasks.push(task)

    if (input.includeInCurrentTasks || roadmap.currentTasks.length < 5) {
      upsertCurrentTask(roadmap, task)
    }

    await client.query(
      `INSERT INTO route_tasks (route_id, user_id, task_id, title, task_type, status, week, day)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [routeId, userId, task.id, task.title, task.type, ensureTaskStatus(task.status), task.week, task.day || null]
    )

    const { rows } = await client.query(
      `UPDATE routes
       SET roadmap_data = $1::jsonb,
           updated_at = NOW()
       WHERE id = $2 AND user_id = $3
       RETURNING id, user_id, topic, background, goals, weeks, roadmap_data, is_current, created_at, updated_at`,
      [JSON.stringify(roadmap), routeId, userId]
    )

    await client.query('COMMIT')
    return rows[0] as RouteRow
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}

export async function updateTaskInRoute(
  userId: string,
  routeId: string,
  taskId: string,
  patch: OpenClawRouteTaskPatch
): Promise<RouteRow> {
  if (patch.week !== undefined && (!Number.isInteger(patch.week) || patch.week < 1 || patch.week > 52)) {
    throw new Error('任务 week 必须在 1-52 之间')
  }
  if (patch.day !== undefined && (!Number.isInteger(patch.day) || patch.day < 1 || patch.day > 7)) {
    throw new Error('任务 day 必须在 1-7 之间')
  }

  const pool = getPool()
  const client = await pool.connect()

  try {
    await client.query('BEGIN')
    const route = await getRouteForUpdate(client, userId, routeId)
    const roadmap = normalizeRoadmapData(route.roadmap_data)
    const pointer = findTaskPointer(roadmap, taskId)
    if (!pointer) {
      throw new Error('任务不存在')
    }

    const oldTask = roadmap.phases[pointer.phaseIndex].tasks[pointer.taskIndex]
    const mergedTask: LearningTask = {
      ...oldTask,
      ...(patch.title !== undefined ? { title: patch.title.trim() } : {}),
      ...(patch.week !== undefined ? { week: patch.week } : {}),
      ...(patch.day !== undefined ? { day: patch.day } : {}),
      ...(patch.type !== undefined ? { type: patch.type } : {}),
      ...(patch.status !== undefined ? { status: patch.status } : {}),
      ...(patch.difficulty !== undefined ? { difficulty: patch.difficulty } : {}),
      ...(patch.estimate !== undefined ? { estimate: patch.estimate.trim() } : {}),
      ...(patch.objective !== undefined ? { objective: patch.objective.trim() } : {}),
      ...(patch.doneCriteria !== undefined ? { doneCriteria: patch.doneCriteria.trim() } : {}),
    }

    if (!mergedTask.title) {
      throw new Error('任务 title 不能为空')
    }

    const targetPhaseIndex = findPhaseIndexForTask(roadmap, mergedTask, patch.phaseId)
    roadmap.phases[pointer.phaseIndex].tasks.splice(pointer.taskIndex, 1)
    roadmap.phases[targetPhaseIndex].tasks.push(mergedTask)

    const currentIndex = roadmap.currentTasks.findIndex((item) => item.id === taskId)
    if (currentIndex >= 0) {
      roadmap.currentTasks[currentIndex] = {
        ...roadmap.currentTasks[currentIndex],
        ...mergedTask,
      }
    }

    await client.query(
      `UPDATE route_tasks
       SET title = $1,
           task_type = $2,
           status = $3,
           week = $4,
           day = $5,
           updated_at = NOW(),
           completed_at = CASE WHEN $3 = 'completed' THEN NOW() ELSE NULL END
       WHERE route_id = $6 AND user_id = $7 AND task_id = $8`,
      [
        mergedTask.title,
        mergedTask.type,
        ensureTaskStatus(mergedTask.status),
        mergedTask.week,
        mergedTask.day || null,
        routeId,
        userId,
        taskId,
      ]
    )

    const { rows } = await client.query(
      `UPDATE routes
       SET roadmap_data = $1::jsonb,
           updated_at = NOW()
       WHERE id = $2 AND user_id = $3
       RETURNING id, user_id, topic, background, goals, weeks, roadmap_data, is_current, created_at, updated_at`,
      [JSON.stringify(roadmap), routeId, userId]
    )

    await client.query('COMMIT')
    return rows[0] as RouteRow
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}

export async function deleteTaskFromRoute(userId: string, routeId: string, taskId: string): Promise<RouteRow> {
  const pool = getPool()
  const client = await pool.connect()

  try {
    await client.query('BEGIN')
    const route = await getRouteForUpdate(client, userId, routeId)
    const roadmap = normalizeRoadmapData(route.roadmap_data)

    const pointer = findTaskPointer(roadmap, taskId)
    if (!pointer) {
      throw new Error('任务不存在')
    }

    roadmap.phases[pointer.phaseIndex].tasks.splice(pointer.taskIndex, 1)
    removeCurrentTask(roadmap, taskId)

    await client.query(
      'DELETE FROM route_tasks WHERE route_id = $1 AND user_id = $2 AND task_id = $3',
      [routeId, userId, taskId]
    )

    const { rows } = await client.query(
      `UPDATE routes
       SET roadmap_data = $1::jsonb,
           updated_at = NOW()
       WHERE id = $2 AND user_id = $3
       RETURNING id, user_id, topic, background, goals, weeks, roadmap_data, is_current, created_at, updated_at`,
      [JSON.stringify(roadmap), routeId, userId]
    )

    await client.query('COMMIT')
    return rows[0] as RouteRow
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}

function addMaterialToTask(task: LearningTask, material: LearningMaterial, knowledgePointId?: string): void {
  if (knowledgePointId) {
    const kp = (task.knowledgePoints || []).find((item) => item.id === knowledgePointId)
    if (!kp) {
      throw new Error(`未找到知识点: ${knowledgePointId}`)
    }
    const base = kp.materials || []
    kp.materials = [...base.filter((item) => item.url !== material.url), material]
    return
  }

  const base = task.materials || []
  task.materials = [...base.filter((item) => item.url !== material.url), material]
}

function removeMaterialFromTask(task: LearningTask, selector: { url?: string; title?: string; knowledgePointId?: string }): boolean {
  const matches = (material: LearningMaterial): boolean => {
    if (selector.url) {
      return material.url === selector.url
    }
    if (selector.title) {
      return material.title === selector.title
    }
    return false
  }

  if (selector.knowledgePointId) {
    const kp = (task.knowledgePoints || []).find((item) => item.id === selector.knowledgePointId)
    if (!kp) {
      return false
    }
    const before = kp.materials.length
    kp.materials = kp.materials.filter((material) => !matches(material))
    return kp.materials.length !== before
  }

  const base = task.materials || []
  const before = base.length
  task.materials = base.filter((material) => !matches(material))
  return task.materials.length !== before
}

export async function addMaterialToRouteTask(
  userId: string,
  routeId: string,
  taskId: string,
  input: OpenClawMaterialInput
): Promise<RouteRow> {
  const material = sanitizeMaterial(input)
  const pool = getPool()
  const client = await pool.connect()

  try {
    await client.query('BEGIN')
    const route = await getRouteForUpdate(client, userId, routeId)
    const roadmap = normalizeRoadmapData(route.roadmap_data)

    const pointer = findTaskPointer(roadmap, taskId)
    if (!pointer) {
      throw new Error('任务不存在')
    }

    const task = roadmap.phases[pointer.phaseIndex].tasks[pointer.taskIndex]
    addMaterialToTask(task, material, input.knowledgePointId)

    const currentTask = roadmap.currentTasks.find((item) => item.id === taskId)
    if (currentTask) {
      addMaterialToTask(currentTask, material, input.knowledgePointId)
    }

    const { rows } = await client.query(
      `UPDATE routes
       SET roadmap_data = $1::jsonb,
           updated_at = NOW()
       WHERE id = $2 AND user_id = $3
       RETURNING id, user_id, topic, background, goals, weeks, roadmap_data, is_current, created_at, updated_at`,
      [JSON.stringify(roadmap), routeId, userId]
    )

    await client.query('COMMIT')
    return rows[0] as RouteRow
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}

export async function removeMaterialFromRouteTask(
  userId: string,
  routeId: string,
  taskId: string,
  selector: { url?: string; title?: string; knowledgePointId?: string }
): Promise<RouteRow> {
  if (!selector.url && !selector.title) {
    throw new Error('请至少提供 url 或 title 作为删除条件')
  }

  const pool = getPool()
  const client = await pool.connect()

  try {
    await client.query('BEGIN')
    const route = await getRouteForUpdate(client, userId, routeId)
    const roadmap = normalizeRoadmapData(route.roadmap_data)

    const pointer = findTaskPointer(roadmap, taskId)
    if (!pointer) {
      throw new Error('任务不存在')
    }

    const task = roadmap.phases[pointer.phaseIndex].tasks[pointer.taskIndex]
    const removedFromTask = removeMaterialFromTask(task, selector)

    const currentTask = roadmap.currentTasks.find((item) => item.id === taskId)
    let removedFromCurrentTask = false
    if (currentTask) {
      removedFromCurrentTask = removeMaterialFromTask(currentTask, selector)
    }

    if (!removedFromTask && !removedFromCurrentTask) {
      throw new Error('未找到要删除的资料')
    }

    const { rows } = await client.query(
      `UPDATE routes
       SET roadmap_data = $1::jsonb,
           updated_at = NOW()
       WHERE id = $2 AND user_id = $3
       RETURNING id, user_id, topic, background, goals, weeks, roadmap_data, is_current, created_at, updated_at`,
      [JSON.stringify(roadmap), routeId, userId]
    )

    await client.query('COMMIT')
    return rows[0] as RouteRow
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}
