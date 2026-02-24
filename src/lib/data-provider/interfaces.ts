export interface Tag {
  id: string
  name: string
  color: string
}

export interface Route {
  id: string
  user_id: string
  topic: string
  background: string | null
  goals: string | null
  weeks: number
  roadmap_data: Record<string, unknown> | null
  is_current: boolean
  created_at: string
  updated_at: string
}

export interface RouteTask {
  id: string
  route_id: string
  user_id: string
  task_id: string
  title: string
  task_type: string | null
  status: 'pending' | 'in_progress' | 'completed'
  week: number | null
  day: number | null
  completed_at: string | null
  created_at: string
  updated_at: string
}

export interface Flashcard {
  id: string
  user_id: string
  route_id: string | null
  question: string
  answer: string
  code_snippet: string | null
  source_url: string | null
  source_title: string | null
  difficulty: string | null
  review_count: number | null
  last_reviewed_at: string | null
  created_at: string
}

export interface CardWithTags extends Flashcard {
  tags: Tag[]
}

export interface CardRepository {
  getCards(userId: string, options: {
    tagId?: string
    search?: string
    limit?: number
    offset?: number
    routeId?: string
  }): Promise<{ cards: CardWithTags[]; total: number }>

  getCardById(userId: string, cardId: string): Promise<CardWithTags | null>

  saveCards(userId: string, cards: {
    question: string
    answer: string
    codeSnippet?: string | null
    sourceUrl?: string | null
    routeId?: string | null
  }[], sourceUrl?: string, tagIds?: string[]): Promise<{ success: boolean; error?: string }>

  deleteCard(userId: string, cardId: string): Promise<{ success: boolean; error?: string }>

  getTags(userId: string): Promise<{ success: boolean; tags?: Tag[]; error?: string }>

  getOrCreateTags(userId: string, tagNames: string[]): Promise<string[]>
}

export interface RouteRepository {
  getRoutes(userId: string, options: {
    limit?: number
    offset?: number
  }): Promise<{ routes: Route[]; total: number }>

  getRouteById(userId: string, routeId: string): Promise<Route | null>

  getCurrentRoute(userId: string): Promise<Route | null>

  createRoute(userId: string, data: {
    topic: string
    background?: string
    goals?: string
    weeks?: number
    roadmapData?: Record<string, unknown>
  }): Promise<{ success: boolean; route?: Route; error?: string }>

  switchRoute(userId: string, routeId: string): Promise<{ success: boolean; error?: string }>
}

export interface RouteTaskRepository {
  getTasksByRoute(userId: string, routeId: string): Promise<RouteTask[]>

  getCurrentRouteTasks(userId: string): Promise<RouteTask[]>

  updateTaskStatus(userId: string, routeId: string, taskId: string, status: 'pending' | 'in_progress' | 'completed'): Promise<{ success: boolean; error?: string }>

  initializeRouteTasks(userId: string, routeId: string, tasks: {
    task_id: string
    title: string
    task_type?: string
    week?: number
    day?: number
  }[]): Promise<{ success: boolean; error?: string }>
}
