import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'
import {
  isModelMultimodal,
  getBestMultimodalModel,
  validateModelForProduction,
} from '@/lib/model-capability'
import { logModelCall, ModelCallType } from '@/lib/model-call-logger'
import { validateAllTasks, QualityGateResult } from '@/lib/resource-quality-gate'

const DATA_FILE = path.join(process.cwd(), 'data', 'learning-roadmap.json')

interface LearningPhase {
  id: string
  title: string
  weeks: string
  goal: string
  focus: string[]
  deliverables: string[]
  tasks: {
    id: string
    title: string
    week: number
    day?: number
    type: '学习' | '实操' | '复盘'
    status: 'pending'
  }[]
}

interface KnowledgePoint {
  id: string
  title: string
  description?: string
  materials: {
    title: string
    url: string
    type: 'article' | 'video'
  }[]
}

interface LearningTask {
  id: string
  title: string
  type: '学习' | '实操' | '复盘'
  difficulty: '简单' | '中等' | '进阶'
  estimate: string
  objective: string
  doneCriteria: string
  knowledgePoints?: KnowledgePoint[]
  materials?: {
    title: string
    url: string
    type: 'article' | 'video'
  }[]
}

interface RoadmapData {
  phases: LearningPhase[]
  currentTasks: LearningTask[]
}

async function callAIForRoadmap(
  topic: string,
  background?: string,
  goals?: string,
  timeBudget?: string,
  weeks?: number,
  constraints?: string
): Promise<RoadmapData | null> {
  const startTime = Date.now()
  const callType: ModelCallType = 'roadmap_generation'
  
  const apiKey = process.env.OPENROUTER_API_KEY

  if (!apiKey) {
    const errorMsg = 'OPENROUTER_API_KEY 未配置'
    logModelCall(callType, 'unknown', false, Date.now() - startTime, 'error', {
      error: errorMsg,
      metadata: { topic, weeks },
    })
    throw new Error(errorMsg)
  }

  let model = process.env.AI_MODEL || 'gpt-5.3-codex'
  const configuredModel = model
  
  const validation = validateModelForProduction(model)
  if (!validation.valid) {
    console.warn(`[ModelCapability] ${validation.error}，路线生成为纯文本任务，继续使用配置模型: ${model}`)
  }
  
  const isMultimodal = isModelMultimodal(model)
  
  console.log(`[ModelCapability] 路线生成使用模型: ${model}, 多模态: ${isMultimodal}`)

  const baseUrl = process.env.AI_API_URL || 'https://openrouter.ai/api/v1/chat/completions'

  const prompt = `你是一个学习路线规划专家。请根据以下信息为"${topic}"生成一个完整的个性化学习路线。

用户背景信息：
掌握技能：${background || '未提供'}
薄弱点/需加强：${goals || '未提供'}
学习目标：${goals || '未提供'}
每周投入时间：${timeBudget || '未提供'}
期望学习周期：${weeks ? `${weeks} 周（用户指定）` : '未提供（默认 12 周）'}
其他限制/要求：${constraints || '无'}

请根据以上信息生成个性化的学习路线。若用户未指定周期，默认使用 12 周，也可根据目标难度调整为 4/8/16 周。

请严格按照以下 JSON 格式返回，不要有其他内容：
{
  "phases": [
    {
      "id": "phase-1",
      "title": "阶段标题",
      "weeks": "第X-Y周",
      "goal": "阶段目标",
      "focus": ["重点1", "重点2"],
      "deliverables": ["交付物1"],
      "tasks": [
        {
          "id": "t1-1",
          "title": "任务标题",
          "week": 1,
          "day": 1,
          "type": "学习",
          "status": "pending"
        }
      ]
    }
  ],
  "currentTasks": [
    {
      "id": "task-day1-xxx",
      "title": "今日任务标题",
      "type": "学习",
      "difficulty": "简单",
      "estimate": "30分钟",
      "objective": "学习目标",
      "doneCriteria": "完成标准",
      "knowledgePoints": [
        {
          "id": "kp-xxx",
          "title": "知识点标题",
          "description": "知识点描述",
          "materials": [
            { "title": "材料标题", "url": "https://example.com", "type": "article" }
          ]
        }
      ],
      "materials": [
        { "title": "材料标题", "url": "https://example.com", "type": "article" }
      ]
    }
  ]
}

要求：
1. 学习路线总周期为 ${weeks || 12} 周，若用户未指定则默认 12 周
2. 每个阶段根据总周期动态分配（建议每3-4周为一个阶段）
3. 每个阶段3-10个任务
4. 每个任务包含具体的 week 和 day
5. currentTasks 包含3-5个具体的学习任务
6. 所有 URL 必须是真实有效的学习资源链接
7. 任务类型只能是 "学习"、"实操" 或 "复盘"
8. 难度只能是 "简单"、"中等" 或 "进阶"
9. 所有 id 必须唯一

请只返回 JSON，不要有其他内容。`

  try {
    const response = await fetch(baseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': 'http://localhost:3011',
        'X-Title': 'StackMemory',
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: 'system',
            content: '你是一个专业的学习路线规划专家，擅长设计系统化的学习路径。',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.7,
        max_tokens: 8000,
      }),
      signal: AbortSignal.timeout(120000),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(`API 错误 ${response.status}: ${errorData.error?.message || errorData.message || response.statusText}`)
    }

    const data = await response.json()
    let contentResponse = ''

    if (data.choices?.[0]?.message?.content) {
      contentResponse = data.choices[0].message.content
    } else if (data.text) {
      contentResponse = data.text
    }

    if (!contentResponse) {
      throw new Error('API 返回空结果')
    }

    const jsonMatch = contentResponse.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      throw new Error('无法从响应中提取 JSON')
    }

    const parsed = JSON.parse(jsonMatch[0])
    
    logModelCall(callType, model, isMultimodal, Date.now() - startTime, 'success', {
      outputTokens: data.usage?.completion_tokens,
      metadata: { topic, weeks, phasesCount: parsed.phases?.length },
    })
    
    return parsed as RoadmapData
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error'
    logModelCall(callType, model, isMultimodal, Date.now() - startTime, 'error', {
      error: errorMsg,
      metadata: { topic, weeks },
    })
    console.error('AI 调用失败:', error)
    throw error
  }
}

function saveRoadmapData(data: RoadmapData): void {
  const dir = path.dirname(DATA_FILE)
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8')
}

async function runQualityGate(data: RoadmapData): Promise<{
  qualityGateResults: QualityGateResult[]
  overallPassRate: number
  passedCount: number
  totalTasks: number
}> {
  if (!data.currentTasks || data.currentTasks.length === 0) {
    return {
      qualityGateResults: [],
      overallPassRate: 0,
      passedCount: 0,
      totalTasks: 0,
    }
  }
  
  try {
    const validation = await validateAllTasks(data.currentTasks)
    return {
      qualityGateResults: validation.results,
      overallPassRate: validation.overallPassRate,
      passedCount: validation.passedCount,
      totalTasks: validation.totalTasks,
    }
  } catch (error) {
    console.error('质量门禁验证失败:', error)
    return {
      qualityGateResults: [],
      overallPassRate: 0,
      passedCount: 0,
      totalTasks: 0,
    }
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { topic, background, goals, time_budget, weeks, constraints } = body

    if (!topic || typeof topic !== 'string') {
      return NextResponse.json(
        { success: false, error: '请提供主题参数 (topic)' },
        { status: 400 }
      )
    }

    const weeksValue = weeks && typeof weeks === 'number' && weeks > 0 ? weeks : 12
    console.log(`生成学习路线: ${topic}, 背景: ${background || '未提供'}, 目标: ${goals || '未提供'}, 时间: ${time_budget || '未提供'}, 周期: ${weeksValue}周`)

    const roadmapData = await callAIForRoadmap(topic, background, goals, time_budget, weeksValue, constraints)
    
    if (!roadmapData) {
      return NextResponse.json(
        { success: false, error: '生成学习路线失败' },
        { status: 500 }
      )
    }

    saveRoadmapData(roadmapData)

    const qualityGate = await runQualityGate(roadmapData)

    return NextResponse.json({
      success: true,
      message: '学习路线已生成',
      data: roadmapData,
      qualityGate,
    })
  } catch (error) {
    console.error('生成学习路线失败:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : '生成学习路线失败' 
      },
      { status: 500 }
    )
  }
}

export async function GET() {
  try {
    if (!fs.existsSync(DATA_FILE)) {
      return NextResponse.json({
        success: true,
        data: null,
        message: '暂无学习路线数据',
      })
    }

    const content = fs.readFileSync(DATA_FILE, 'utf-8')
    const data = JSON.parse(content)

    const qualityGate = await runQualityGate(data)

    return NextResponse.json({
      success: true,
      data,
      qualityGate,
    })
  } catch (error) {
    console.error('读取学习路线失败:', error)
    return NextResponse.json(
      { success: false, error: '读取学习路线失败' },
      { status: 500 }
    )
  }
}
