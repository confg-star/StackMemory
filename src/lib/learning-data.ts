import roadmapData from '@/data/learning-roadmap.json'

export interface LearningPhase {
  id: string
  title: string
  weeks: string
  goal: string
  focus: string[]
  deliverables: string[]
  tasks?: TimelineTask[]
}

export interface TimelineTask {
  id: string
  title: string
  week: number
  day?: number
  type: '学习' | '实操' | '复盘'
  status: 'pending' | 'in_progress' | 'completed'
}

export interface LearningMaterial {
  title: string
  url: string
  type: 'article' | 'video'
}

export interface KnowledgePoint {
  id: string
  title: string
  description?: string
  materials: LearningMaterial[]
}

export interface LearningTask {
  id: string
  title: string
  type: '学习' | '实操' | '复盘'
  difficulty: '简单' | '中等' | '进阶'
  estimate: string
  objective: string
  doneCriteria: string
  knowledgePoints?: KnowledgePoint[]
  materials?: LearningMaterial[]
}

export const learningPhases: LearningPhase[] = roadmapData.phases as LearningPhase[]
export const currentTasks: LearningTask[] = roadmapData.currentTasks as LearningTask[]
