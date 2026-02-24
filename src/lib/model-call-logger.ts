export type ModelCallType = 'roadmap_generation' | 'content_parsing' | 'card_generation' | 'general'

export interface ModelCallLog {
  id: string
  timestamp: string
  type: ModelCallType
  modelId: string
  isMultimodal: boolean
  inputTokens?: number
  outputTokens?: number
  totalTokens?: number
  duration: number
  status: 'success' | 'error' | 'fallback'
  error?: string
  fallbackModel?: string
  metadata?: Record<string, unknown>
}

const MODEL_CALL_LOGS: ModelCallLog[] = []
const MAX_LOGS = 1000

function generateLogId(): string {
  return `mcl-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
}

export function logModelCall(
  type: ModelCallType,
  modelId: string,
  isMultimodal: boolean,
  duration: number,
  status: 'success' | 'error' | 'fallback',
  options?: {
    inputTokens?: number
    outputTokens?: number
    error?: string
    fallbackModel?: string
    metadata?: Record<string, unknown>
  }
): ModelCallLog {
  const log: ModelCallLog = {
    id: generateLogId(),
    timestamp: new Date().toISOString(),
    type,
    modelId,
    isMultimodal,
    duration,
    status,
    ...options,
  }
  
  if (options?.inputTokens !== undefined) {
    log.inputTokens = options.inputTokens
  }
  if (options?.outputTokens !== undefined) {
    log.outputTokens = options.outputTokens
  }
  if (options?.error) {
    log.error = options.error
  }
  if (options?.fallbackModel) {
    log.fallbackModel = options.fallbackModel
  }
  if (options?.metadata) {
    log.metadata = options.metadata
  }
  
  log.totalTokens = (log.inputTokens || 0) + (log.outputTokens || 0)
  
  MODEL_CALL_LOGS.push(log)
  
  if (MODEL_CALL_LOGS.length > MAX_LOGS) {
    MODEL_CALL_LOGS.shift()
  }
  
  console.log(`[ModelCall] ${type} | model=${modelId} | multimodal=${isMultimodal} | status=${status} | duration=${duration}ms`)
  
  return log
}

export function getModelCallLogs(limit = 100): ModelCallLog[] {
  return MODEL_CALL_LOGS.slice(-limit)
}

export function getModelCallLogsByType(type: ModelCallType, limit = 50): ModelCallLog[] {
  return MODEL_CALL_LOGS.filter((log) => log.type === type).slice(-limit)
}

export function getModelCallStats(): {
  total: number
  success: number
  error: number
  fallback: number
  multimodalCount: number
  avgDuration: number
  byType: Record<ModelCallType, number>
} {
  const total = MODEL_CALL_LOGS.length
  const success = MODEL_CALL_LOGS.filter((l) => l.status === 'success').length
  const error = MODEL_CALL_LOGS.filter((l) => l.status === 'error').length
  const fallback = MODEL_CALL_LOGS.filter((l) => l.status === 'fallback').length
  const multimodalCount = MODEL_CALL_LOGS.filter((l) => l.isMultimodal).length
  
  const totalDuration = MODEL_CALL_LOGS.reduce((sum, l) => sum + l.duration, 0)
  const avgDuration = total > 0 ? totalDuration / total : 0
  
  const byType: Record<ModelCallType, number> = {
    roadmap_generation: 0,
    content_parsing: 0,
    card_generation: 0,
    general: 0,
  }
  
  MODEL_CALL_LOGS.forEach((log) => {
    byType[log.type]++
  })
  
  return {
    total,
    success,
    error,
    fallback,
    multimodalCount,
    avgDuration: Math.round(avgDuration),
    byType,
  }
}
