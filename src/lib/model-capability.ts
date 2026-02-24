export interface ModelCapability {
  modelId: string
  isMultimodal: boolean
  supportsVision: boolean
  supportsImages: boolean
  maxTokens: number
  contextWindow: number
  description: string
}

export interface ModelWhitelistEntry {
  modelId: string
  priority: number
  isMultimodal: boolean
  fallbackModel?: string
}

export const MULTIMODAL_MODEL_WHITELIST: ModelWhitelistEntry[] = [
  {
    modelId: 'gpt-5.3-codex',
    priority: 110,
    isMultimodal: true,
  },
  {
    modelId: 'openai/gpt-4o',
    priority: 100,
    isMultimodal: true,
  },
  {
    modelId: 'openai/gpt-4o-mini',
    priority: 95,
    isMultimodal: true,
  },
  {
    modelId: 'openai/gpt-4.5',
    priority: 90,
    isMultimodal: true,
  },
  {
    modelId: 'anthropic/claude-3.5-sonnet',
    priority: 85,
    isMultimodal: true,
  },
  {
    modelId: 'anthropic/claude-3-opus',
    priority: 80,
    isMultimodal: true,
  },
  {
    modelId: 'google/gemini-2.0-flash',
    priority: 75,
    isMultimodal: true,
  },
  {
    modelId: 'google/gemini-1.5-pro',
    priority: 70,
    isMultimodal: true,
  },
  {
    modelId: 'google/gemini-1.5-flash',
    priority: 65,
    isMultimodal: true,
  },
  {
    modelId: 'qwen/qwen2-vl',
    priority: 60,
    isMultimodal: true,
  },
  {
    modelId: 'qwen/qwen2.5-vl',
    priority: 60,
    isMultimodal: true,
  },
  {
    modelId: 'moonshot/kimi-vl-a3b',
    priority: 55,
    isMultimodal: true,
  },
]

export const FALLBACK_MODEL = 'openai/gpt-4o-mini'

export function isModelMultimodal(modelId: string): boolean {
  const normalizedModelId = modelId.toLowerCase().trim()
  
  const entry = MULTIMODAL_MODEL_WHITELIST.find(
    (m) => normalizedModelId === m.modelId.toLowerCase()
  )
  
  if (entry) {
    return entry.isMultimodal
  }
  
  const knownMultimodalPatterns = [
    'gpt-4o', 'gpt-4.5', 'claude-3.5', 'claude-3-opus',
    'gemini-', 'qwen2-vl', 'qwen2.5-vl', 'kimi-vl',
  ]
  
  return knownMultimodalPatterns.some((pattern) =>
    normalizedModelId.includes(pattern.toLowerCase())
  )
}

export function getBestMultimodalModel(): string {
  const sorted = [...MULTIMODAL_MODEL_WHITELIST]
    .filter((m) => m.isMultimodal)
    .sort((a, b) => b.priority - a.priority)
  
  return sorted[0]?.modelId || FALLBACK_MODEL
}

export function getFallbackModel(currentModel: string): string | null {
  const normalizedModelId = currentModel.toLowerCase().trim()
  
  const entry = MULTIMODAL_MODEL_WHITELIST.find(
    (m) => normalizedModelId === m.modelId.toLowerCase()
  )
  
  if (entry?.fallbackModel) {
    return entry.fallbackModel
  }
  
  if (!isModelMultimodal(currentModel)) {
    return getBestMultimodalModel()
  }
  
  return null
}

export function validateModelForProduction(modelId: string): {
  valid: boolean
  error?: string
  recommendedModel?: string
} {
  if (!modelId || typeof modelId !== 'string') {
    return {
      valid: false,
      error: '模型 ID 不能为空',
      recommendedModel: getBestMultimodalModel(),
    }
  }
  
  if (!isModelMultimodal(modelId)) {
    return {
      valid: false,
      error: `模型 "${modelId}" 不支持多模态，无法进入核心生产链路`,
      recommendedModel: getBestMultimodalModel(),
    }
  }
  
  return { valid: true }
}
