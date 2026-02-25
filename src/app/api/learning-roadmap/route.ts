import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'
import {
  isModelMultimodal,
  validateModelForProduction,
} from '@/lib/model-capability'
import { logModelCall, ModelCallType } from '@/lib/model-call-logger'
import { validateAllTasks, QualityGateResult } from '@/lib/resource-quality-gate'
import { normalizeTaskDaysByWeek } from '@/lib/route-task-utils'

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
    difficulty?: '简单' | '中等' | '进阶'
    estimate?: string
    objective?: string
    doneCriteria?: string
    knowledgePoints?: KnowledgePoint[]
    materials?: LearningMaterial[]
  }[]
}

interface LearningMaterial {
  title: string
  url: string
  type: 'article' | 'video'
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
  type: '学习' | '实操' | '复盘'
  difficulty: '简单' | '中等' | '进阶'
  estimate: string
  objective: string
  doneCriteria: string
  knowledgePoints?: KnowledgePoint[]
  materials?: LearningMaterial[]
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
  overview?: LearningOverview
  phases: LearningPhase[]
  currentTasks: LearningTask[]
}

const HIGH_QUALITY_SOURCES = [
  'react.dev',
  'nextjs.org',
  'typescriptlang.org',
  'developer.mozilla.org',
  'github.com',
  'youtube.com',
  'bilibili.com',
  'juejin.cn',
  'csdn.net',
  'zhihu.com',
]

function isChineseContent(material: LearningMaterial): boolean {
  const text = `${material.title} ${material.url}`
  return /[\u4e00-\u9fa5]/.test(text) || /\.(cn|com\.cn)\b/.test(material.url) || /bilibili|csdn|juejin|zhihu/.test(material.url)
}

function scoreMaterial(material: LearningMaterial, taskTitle: string, topic: string): number {
  const source = material.url.toLowerCase()
  const title = material.title.toLowerCase()
  const keywords = `${taskTitle} ${topic}`.toLowerCase().split(/\s+/).filter(Boolean)

  let score = 0
  const keywordMatches = keywords.filter((kw) => kw.length > 1 && (title.includes(kw) || source.includes(kw))).length
  score += keywordMatches * 12

  if (HIGH_QUALITY_SOURCES.some((s) => source.includes(s))) {
    score += 20
  }

  if (/2024|2025|2026|latest|新版|更新|v\d+/i.test(material.title)) {
    score += 14
  }

  if (isChineseContent(material)) {
    score += 8
  }

  if (material.type === 'video') {
    score += 2
  }

  return score
}

function normalizeMaterials(task: LearningTask | LearningPhase['tasks'][number], topic: string): LearningMaterial[] {
  const combined = [
    ...(task.materials || []),
    ...((task.knowledgePoints || []).flatMap((kp) => kp.materials || [])),
  ]

  const validLinks = combined.filter((m) => typeof m.url === 'string' && /^https?:\/\//i.test(m.url) && m.title)
  const unique = Array.from(new Map(validLinks.map((m) => [m.url, m])).values())

  return unique
    .sort((a, b) => scoreMaterial(b, task.title, topic) - scoreMaterial(a, task.title, topic))
    .slice(0, 4)
}

function buildGeneratedMaterials(taskTitle: string, taskType: LearningTask['type'], topic: string): LearningMaterial[] {
  const commonIntro = `围绕「${taskTitle}」先建立一条最小可运行路径：先理解概念，再动手实践，最后输出复盘。`
  const generated: LearningMaterial[] = [
    {
      title: `${taskTitle} - 通俗讲解笔记`,
      url: 'about:generated/guide',
      type: 'article',
      isGenerated: true,
      content: `${commonIntro} 重点关注与「${topic}」直接相关的核心概念、输入输出和常见误区。先学会判断“什么时候用、为什么用”。`,
    },
  ]

  if (taskType !== '复盘') {
    generated.push({
      title: `${taskTitle} - 15 分钟实操脚本`,
      url: 'about:generated/practice',
      type: 'video',
      isGenerated: true,
      content: '步骤建议：1) 用最小示例跑通；2) 修改一个参数观察变化；3) 故意制造一个错误并修复；4) 总结可复用模板。',
    })
  } else {
    generated.push({
      title: `${taskTitle} - 复盘模板`,
      url: 'about:generated/review',
      type: 'article',
      isGenerated: true,
      content: '复盘四问：今天学到什么？哪里卡住了？根因是什么？明天如何避免。最后沉淀 3 条可复用规则。',
    })
  }

  return generated
}

function buildTopicFallbackOverview(topic: string): LearningOverview {
  const normalized = topic.toLowerCase()

  if (normalized.includes('nginx')) {
    return {
      whatIs: 'Nginx 可以理解为网站前面的“总调度员”。它负责把请求分发到正确的服务上，也能直接处理静态资源，让系统更快更稳。',
      keyTechnologies: ['反向代理', '负载均衡', '静态资源托管', 'HTTPS 与证书', '缓存与压缩'],
      capabilities: ['把流量转发给不同后端', '提升并发访问稳定性', '统一做 HTTPS 与安全策略', '降低应用服务器压力'],
      commonScenarios: ['前后端分离项目入口', '微服务网关前置层', '高并发站点静态资源加速', '容器化部署的统一入口'],
      quickStartPath: ['先跑通最小配置并成功访问', '学会反向代理与静态资源配置', '再加 HTTPS、缓存、压缩', '最后做监控与性能调优'],
      efficientLearningTips: ['先理解“请求从哪来、到哪去”再记指令', '每学一个配置就立刻在本地验证', '对比改动前后延迟与吞吐，形成反馈闭环'],
    }
  }

  return {
    whatIs: `${topic} 可以看成一套解决实际问题的方法与工具集合。先理解它解决什么痛点，再学习具体实现，会更容易上手。`,
    keyTechnologies: ['核心概念', '常见工具链', '工程化实践', '部署与运维'],
    capabilities: ['解决真实业务问题', '提升开发效率与稳定性', '支持团队协作与持续迭代'],
    commonScenarios: ['个人项目落地', '团队生产环境应用', '性能与稳定性优化场景'],
    quickStartPath: ['先搭建可运行的最小示例', '再补关键概念与原理', '通过实操任务巩固', '最后做复盘与迁移应用'],
    efficientLearningTips: ['先做后懂，先跑通再深挖原理', '把任务拆成 30-60 分钟小块', '每次学习都输出一条可复用笔记'],
  }
}

function ensureOverview(overview: LearningOverview | undefined, topic: string): LearningOverview {
  const fallback = buildTopicFallbackOverview(topic)
  if (!overview) return fallback

  return {
    whatIs: overview.whatIs?.trim() || fallback.whatIs,
    keyTechnologies: overview.keyTechnologies?.length ? overview.keyTechnologies.slice(0, 6) : fallback.keyTechnologies,
    capabilities: overview.capabilities?.length ? overview.capabilities.slice(0, 6) : fallback.capabilities,
    commonScenarios: overview.commonScenarios?.length ? overview.commonScenarios.slice(0, 6) : fallback.commonScenarios,
    quickStartPath: overview.quickStartPath?.length ? overview.quickStartPath.slice(0, 6) : fallback.quickStartPath,
    efficientLearningTips: overview.efficientLearningTips?.length ? overview.efficientLearningTips.slice(0, 6) : fallback.efficientLearningTips,
  }
}

function enrichRoadmapMaterials(data: RoadmapData, topic: string): RoadmapData {
  const taskById = new Map(data.currentTasks.map((task) => [task.id, task]))

  const enrichedPhases = data.phases.map((phase) => {
    const tasks = normalizeTaskDaysByWeek(phase.tasks).map((task) => {
      const fromCurrent = taskById.get(task.id)
      const mergedTask = {
        ...task,
        difficulty: task.difficulty || fromCurrent?.difficulty || '中等',
        estimate: task.estimate || fromCurrent?.estimate || '45分钟',
        objective: task.objective || fromCurrent?.objective || `完成 ${task.title}`,
        doneCriteria: task.doneCriteria || fromCurrent?.doneCriteria || '完成学习并输出一条可验证结果',
        materials: [...(task.materials || []), ...(fromCurrent?.materials || [])],
        knowledgePoints: task.knowledgePoints || fromCurrent?.knowledgePoints || [],
      }

      const curated = normalizeMaterials(mergedTask, topic)
      const materials = curated.length >= 2 ? curated : [...curated, ...buildGeneratedMaterials(task.title, task.type, topic)].slice(0, 4)

      return {
        ...mergedTask,
        materials,
      }
    })

    return { ...phase, tasks }
  })

  const enrichedCurrentTasks = data.currentTasks.map((task) => {
    const timelineTask = enrichedPhases.flatMap((phase) => phase.tasks).find((item) => item.id === task.id)
    const curated = normalizeMaterials(task, topic)
    const preferred = timelineTask?.materials?.length ? timelineTask.materials : curated
    const materials = preferred.length >= 2 ? preferred : [...preferred, ...buildGeneratedMaterials(task.title, task.type, topic)].slice(0, 4)

    return {
      ...task,
      materials,
      knowledgePoints: task.knowledgePoints || timelineTask?.knowledgePoints || [],
    }
  })

  return {
    overview: ensureOverview(data.overview, topic),
    phases: enrichedPhases,
    currentTasks: enrichedCurrentTasks,
  }
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

  const model = process.env.AI_MODEL || 'gpt-5.3-codex'
  
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
  "overview": {
    "whatIs": "用通俗易懂的话解释这个学习主题是什么",
    "keyTechnologies": ["核心技术1", "核心技术2"],
    "capabilities": ["能实现的功能1", "能实现的功能2"],
    "commonScenarios": ["高频场景1", "高频场景2"],
    "quickStartPath": ["先做什么", "再做什么"],
    "efficientLearningTips": ["高效学习建议1", "高效学习建议2"]
  },
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
          "status": "pending",
          "difficulty": "中等",
          "estimate": "45分钟",
          "objective": "本任务目标",
          "doneCriteria": "可检验的完成标准",
          "materials": [
            { "title": "资料标题", "url": "https://example.com", "type": "article" }
          ]
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
10. 每个阶段任务都必须有 2-4 条资料（文章或视频）
11. 资料需与任务高度相关，优先高质量官方文档/高质量社区内容
12. 质量优先前提下，若有等价中文资料，优先中文资料
13. 优先选择较新的资料（2024+ 或近期更新）
14. 资料来源可多渠道：官方文档、GitHub、Bilibili、YouTube、CSDN、掘金、优质博客等
15. 必须提供 overview 导学信息，语言通俗，避免晦涩术语堆砌
16. overview 要回答：是什么、能做什么、常见场景、怎么开始学、如何更高效

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

    const enrichedRoadmapData = enrichRoadmapMaterials(roadmapData, topic)

    saveRoadmapData(enrichedRoadmapData)

    const qualityGate = await runQualityGate(enrichedRoadmapData)

    return NextResponse.json({
      success: true,
      message: '学习路线已生成',
      data: enrichedRoadmapData,
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
