import {
  isModelMultimodal,
  getBestMultimodalModel,
  validateModelForProduction,
} from '@/lib/model-capability'
import { logModelCall, ModelCallType } from '@/lib/model-call-logger'

export interface Flashcard {
  question: string
  answer: string
  codeSnippet?: string
  sourceUrl?: string
}

export interface ParseResult {
  success: boolean
  cards: Flashcard[]
  error?: string
  sourceUrl?: string
}

/**
 * 调用 OpenRouter AI API (Moonshot/Kimi 模型)
 * @param content 要解析的内容（URL 或文本）
 * @param sourceUrl 来源 URL（用于追踪）
 * @returns 解析结果
 */
export async function callAI(content: string, sourceUrl?: string): Promise<ParseResult> {
  const startTime = Date.now()
  const callType: ModelCallType = 'content_parsing'
  
  const apiKey = process.env.OPENROUTER_API_KEY

  if (!apiKey) {
    const errorMsg = 'OPENROUTER_API_KEY 未配置'
    logModelCall(callType, 'unknown', false, Date.now() - startTime, 'error', {
      error: errorMsg,
      metadata: { contentLength: content.length, sourceUrl },
    })
    return {
      success: false,
      cards: [],
      error: errorMsg,
    }
  }

  let model = process.env.AI_MODEL || 'qwen/qwen3-coder:free'
  const configuredModel = model
  
  const validation = validateModelForProduction(model)
  if (!validation.valid) {
    console.warn(`[ModelCapability] ${validation.error}，内容解析为纯文本任务，继续使用配置模型: ${model}`)
  }
  
  const isMultimodal = isModelMultimodal(model)
  
  console.log(`[ModelCapability] 使用模型: ${model}, 多模态: ${isMultimodal}`)

  const baseUrl = process.env.AI_API_URL || 'https://openrouter.ai/api/v1/chat/completions'

  const prompt = `你是一个技术面试辅导助手。请将以下技术内容转换为 3-5 个面试闪卡。

要求：
1. 每个闪卡包含一个问题（正面）和答案（背面）
2. 问题应该是一个清晰的技术概念或知识点
3. 答案应该简洁准确，包含核心要点
4. 如果内容包含代码片段，将其包含在答案中，使用 markdown 代码块标记
5. 只提取真正有价值的技术知识点

请严格按照以下 JSON 格式返回：
{
  "cards": [
    {
      "question": "问题描述",
      "answer": "答案描述",
      "codeSnippet": "可选的代码片段"
    }
  ]
}

以下是技术内容：
---
${content}
---

请只返回 JSON，不要有其他内容。`

  try {
    const response = await fetch(baseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': 'http://localhost:3000',
        'X-Title': 'StackMemory',
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: 'system',
            content: '你是一个专业的技术面试辅导助手，善于将复杂的技术内容提炼成简洁的面试问答。',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.7,
        max_tokens: 4000,
      }),
      signal: AbortSignal.timeout(60000),
    })

    console.log('OpenRouter API 响应状态:', response.status)

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      console.error('OpenRouter API 错误:', JSON.stringify(errorData))
      const errorMsg = `API 错误 ${response.status}: ${errorData.error?.message || errorData.message || response.statusText}`
      logModelCall(callType, model, isMultimodal, Date.now() - startTime, 'error', {
        error: errorMsg,
        metadata: { contentLength: content.length, sourceUrl },
      })
      return {
        success: false,
        cards: [],
        error: errorMsg,
      }
    }

    const data = await response.json()
    console.log('OpenRouter API 返回数据:', JSON.stringify(data, null, 2))

    // OpenAI 兼容格式: choices[0].message.content
    let contentResponse = ''
    if (data.choices?.[0]?.message?.content) {
      contentResponse = data.choices[0].message.content
    } else if (data.text) {
      contentResponse = data.text
    }

    if (!contentResponse) {
      const errorMsg = 'API 返回空结果'
      logModelCall(callType, model, isMultimodal, Date.now() - startTime, 'error', {
        error: errorMsg,
        metadata: { contentLength: content.length, sourceUrl },
      })
      return {
        success: false,
        cards: [],
        error: errorMsg,
      }
    }

    // 解析 JSON
    try {
      const parsed = JSON.parse(contentResponse)

      if (Array.isArray(parsed.cards)) {
        logModelCall(callType, model, isMultimodal, Date.now() - startTime, 'success', {
          outputTokens: data.usage?.completion_tokens,
          metadata: { cardsCount: parsed.cards.length, sourceUrl },
        })
        return {
          success: true,
          cards: parsed.cards.map((card: { question: string; answer: string; codeSnippet?: string }) => ({
            question: card.question || '',
            answer: card.answer || '',
            codeSnippet: card.codeSnippet,
            sourceUrl,
          })),
          sourceUrl,
        }
      }
    } catch {
      // 尝试提取 JSON
      const jsonMatch = contentResponse.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        try {
          const parsed = JSON.parse(jsonMatch[0])
          if (Array.isArray(parsed.cards)) {
            logModelCall(callType, model, isMultimodal, Date.now() - startTime, 'success', {
              outputTokens: data.usage?.completion_tokens,
              metadata: { cardsCount: parsed.cards.length, sourceUrl },
            })
            return {
              success: true,
              cards: parsed.cards.map((card: { question: string; answer: string; codeSnippet?: string }) => ({
                question: card.question || '',
                answer: card.answer || '',
                codeSnippet: card.codeSnippet,
                sourceUrl,
              })),
              sourceUrl,
            }
          }
        } catch {}
      }
    }

    const parseError = '无法解析 API 返回结果'
    logModelCall(callType, model, isMultimodal, Date.now() - startTime, 'error', {
      error: parseError,
      metadata: { contentLength: content.length, sourceUrl },
    })

    return {
      success: false,
      cards: [],
      error: '无法解析 API 返回结果',
      sourceUrl,
    }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error'
    logModelCall(callType, model, isMultimodal, Date.now() - startTime, 'error', {
      error: errorMsg,
      metadata: { contentLength: content.length, sourceUrl },
    })
    return {
      success: false,
      cards: [],
      error: errorMsg,
      sourceUrl,
    }
  }
}
