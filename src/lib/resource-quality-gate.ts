export interface LearningMaterial {
  title: string
  url: string
  type: 'article' | 'video'
  relevance?: string
  isForeign?: boolean
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

export interface MaterialValidationResult {
  url: string
  title: string
  accessible: boolean
  statusCode?: number
  redirectUrl?: string
  error?: string
  responseTime?: number
  relevanceScore?: number
  relevanceReason?: string
  isForeign: boolean
  source: string
}

export interface QualityGateResult {
  taskId: string
  taskTitle: string
  totalMaterials: number
  accessibleCount: number
  accessibleRate: number
  foreignCount: number
  results: MaterialValidationResult[]
  passed: boolean
  summary: string
}

const DOMESTIC_DOMAINS = [
  'bilibili.com',
  'bilibili.tv',
  'zhihu.com',
  'juejin.cn',
  'csdn.net',
  'segmentfault.com',
  'cnblogs.com',
  'imooc.com',
  'geekbang.org',
  'time.geekbang.org',
  'jike.dev',
  'notion.so',
  'aliyundrive.com',
  'baidu.com',
  'tencent.com',
  'sourl.cn',
  'docschina.org',
  'ruanyifeng.com',
  'wangdoc.com',
  'learnku.com',
  'bootcss.com',
  'v2ex.com',
  'docs.python.org',
  'typescriptlang.org',
  'react.dev',
  'nextjs.org',
  'mozilla.org',
  'nodejs.org',
]

const FOREIGN_DOMAINS = [
  'github.com',
  'stackoverflow.com',
  'medium.com',
  'dev.to',
  'youtube.com',
  'udemy.com',
  'coursera.org',
  'pluralsight.com',
  'frontendmasters.com',
  'react.dev',
  'nextjs.org',
  'typescriptlang.org',
  'python.org',
  'mozilla.org',
  'w3.org',
  'wikipedia.org',
]

const RELEVANCE_KEYWORDS: Record<string, string[]> = {
  python: ['python', 'py', 'pip', 'asyncio', 'typing', 'requests', 'django', 'flask'],
  typescript: ['typescript', 'ts', 'type', 'interface', '泛型', '类型'],
  javascript: ['javascript', 'js', 'node', 'nodejs', 'npm'],
  cli: ['cli', '命令行', 'argparse', 'commander', '终端'],
  web: ['http', 'https', 'request', 'fetch', 'api', 'rest', 'html', 'css'],
  scraping: ['scraping', '爬虫', 'beautifulsoup', 'selenium', 'playwright', 'parser', '解析'],
  ai: ['ai', 'llm', 'gpt', 'openai', 'prompt', '模型', '人工智能'],
  agent: ['agent', '代理', 'tool', 'tool calling', '工具'],
  memory: ['memory', '记忆', 'vector', '向量', 'database', '数据库'],
  roadmap: ['roadmap', '学习路线', '教程', 'tutorial', '入门', '基础'],
  review: ['review', '复盘', '反思', '总结', '回顾'],
}

const MATERIAL_MIN_COUNT = 2
const MATERIAL_MAX_COUNT = 6

function isForeignSource(url: string): { isForeign: boolean; source: string } {
  try {
    const urlObj = new URL(url)
    const hostname = urlObj.hostname.toLowerCase()
    
    for (const domestic of DOMESTIC_DOMAINS) {
      if (hostname.includes(domestic)) {
        return { isForeign: false, source: domestic }
      }
    }
    
    for (const foreign of FOREIGN_DOMAINS) {
      if (hostname.includes(foreign)) {
        return { isForeign: true, source: foreign }
      }
    }
    
    return { isForeign: true, source: hostname }
  } catch {
    return { isForeign: true, source: 'unknown' }
  }
}

function calculateRelevance(materialTitle: string, taskTitle: string, taskObjective: string): { score: number; reason: string } {
  const text = `${materialTitle} ${taskTitle} ${taskObjective}`.toLowerCase()
  let bestScore = 0
  let bestReason = ''
  
  for (const [, keywords] of Object.entries(RELEVANCE_KEYWORDS)) {
    let topicMatches = 0
    for (const keyword of keywords) {
      if (text.includes(keyword.toLowerCase())) {
        topicMatches++
      }
    }
    const score = topicMatches / keywords.length
    if (score > bestScore) {
      bestScore = score
      bestReason = `关键词匹配: ${keywords.slice(0, 3).join(', ')}`
    }
  }
  
  if (bestScore === 0) {
    bestScore = 0.3
    bestReason = '通用学习资源'
  }
  
  return { score: bestScore, reason: bestReason }
}

async function checkUrlAccessibility(url: string): Promise<{ accessible: boolean; statusCode?: number; redirectUrl?: string; error?: string; responseTime?: number }> {
  const startTime = Date.now()
  
  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 10000)
    
    const response = await fetch(url, {
      method: 'HEAD',
      signal: controller.signal,
      redirect: 'manual',
    })
    
    clearTimeout(timeoutId)
    const responseTime = Date.now() - startTime
    
    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get('location')
      return {
        accessible: true,
        statusCode: response.status,
        redirectUrl: location || undefined,
        responseTime,
      }
    }
    
    if (response.status >= 200 && response.status < 400) {
      return {
        accessible: true,
        statusCode: response.status,
        responseTime,
      }
    }
    
    return {
      accessible: false,
      statusCode: response.status,
      error: `HTTP ${response.status}`,
      responseTime,
    }
  } catch (error) {
    const responseTime = Date.now() - startTime
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    
    if (errorMessage.includes('abort')) {
      return {
        accessible: false,
        error: '请求超时 (10s)',
        responseTime,
      }
    }
    
    return {
      accessible: false,
      error: errorMessage,
      responseTime,
    }
  }
}

export function validateMaterialCount(taskMaterials: LearningMaterial[] | undefined, kpMaterials: LearningMaterial[] | undefined): { total: number; valid: boolean; message: string } {
  const total = (taskMaterials?.length || 0) + (kpMaterials?.length || 0)
  
  if (total < MATERIAL_MIN_COUNT) {
    return { total, valid: false, message: `资料数量不足 (${total}/${MATERIAL_MIN_COUNT})` }
  }
  
  if (total > MATERIAL_MAX_COUNT) {
    return { total, valid: false, message: `资料数量过多 (${total}/${MATERIAL_MAX_COUNT})` }
  }
  
  return { total, valid: true, message: `资料数量适中 (${total})` }
}

export async function validateMaterial(
  material: LearningMaterial,
  taskTitle: string,
  taskObjective: string
): Promise<MaterialValidationResult> {
  const { isForeign, source } = isForeignSource(material.url)
  const accessibility = await checkUrlAccessibility(material.url)
  const relevance = calculateRelevance(material.title, taskTitle, taskObjective)
  
  return {
    url: material.url,
    title: material.title,
    accessible: accessibility.accessible,
    statusCode: accessibility.statusCode,
    redirectUrl: accessibility.redirectUrl,
    error: accessibility.error,
    responseTime: accessibility.responseTime,
    relevanceScore: relevance.score,
    relevanceReason: relevance.reason,
    isForeign,
    source,
  }
}

export async function validateTaskMaterials(task: LearningTask): Promise<QualityGateResult> {
  const allMaterials: LearningMaterial[] = [
    ...(task.materials || []),
    ...(task.knowledgePoints?.flatMap(kp => kp.materials || []) || []),
  ]
  
  const results = await Promise.all(
    allMaterials.map(material => validateMaterial(material, task.title, task.objective))
  )
  
  const accessibleCount = results.filter(r => r.accessible).length
  const foreignCount = results.filter(r => r.isForeign).length
  const accessibleRate = allMaterials.length > 0 ? (accessibleCount / allMaterials.length) * 100 : 0
  
  const passed = accessibleRate >= 95
  
  let summary = ''
  if (passed) {
    summary = `✅ 通过 - 可访问率 ${accessibleRate.toFixed(0)}% (${accessibleCount}/${allMaterials.length})`
  } else {
    summary = `❌ 未通过 - 可访问率 ${accessibleRate.toFixed(0)}% (${accessibleCount}/${allMaterials.length})，需要补充有效链接`
  }
  
  if (foreignCount > 0) {
    summary += `, 国外来源 ${foreignCount} 个`
  }
  
  return {
    taskId: task.id,
    taskTitle: task.title,
    totalMaterials: allMaterials.length,
    accessibleCount,
    accessibleRate,
    foreignCount,
    results,
    passed,
    summary,
  }
}

export async function validateAllTasks(tasks: LearningTask[]): Promise<{
  results: QualityGateResult[]
  overallPassRate: number
  passedCount: number
  totalTasks: number
}> {
  const results = await Promise.all(tasks.map(task => validateTaskMaterials(task)))
  
  const passedCount = results.filter(r => r.passed).length
  const overallPassRate = (passedCount / results.length) * 100
  
  return {
    results,
    overallPassRate,
    passedCount,
    totalTasks: tasks.length,
  }
}

export function getQualityReport(tasks: LearningTask[], validationResults: QualityGateResult[]): string {
  const lines: string[] = ['# 学习资料质量门禁报告', '']
  
  for (const result of validationResults) {
    lines.push(`## ${result.taskTitle}`)
    lines.push(`- 总资料数: ${result.totalMaterials}`)
    lines.push(`- 可访问: ${result.accessibleCount} (${result.accessibleRate.toFixed(0)}%)`)
    lines.push(`- 国外来源: ${result.foreignCount}`)
    lines.push(`- 状态: ${result.passed ? '✅ 通过' : '❌ 未通过'}`)
    lines.push('')
    
    for (const material of result.results) {
      const foreignTag = material.isForeign ? ' [国外]' : ''
      const accessStatus = material.accessible ? '✅' : '❌'
      lines.push(`  ${accessStatus} ${material.title}${foreignTag}`)
      lines.push(`    URL: ${material.url}`)
      if (material.statusCode) {
        lines.push(`    状态: ${material.statusCode}`)
      }
      if (material.relevanceReason) {
        lines.push(`    相关性: ${material.relevanceReason}`)
      }
      if (material.error) {
        lines.push(`    错误: ${material.error}`)
      }
      lines.push('')
    }
  }
  
  return lines.join('\n')
}
