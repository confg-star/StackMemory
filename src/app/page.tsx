'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Sparkles, Target, NotebookText, ArrowRight, Loader2, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react'
import { useRoute } from '@/lib/context/RouteContext'

const primaryActions = [
  {
    title: '一键生成今日任务',
    desc: '直接进入今日任务页，按"学习→实操→复盘"推进今天的主线。',
    href: '/tasks',
    cta: '立即生成任务',
    icon: Target,
  },
  {
    title: '学习复盘 / 错题沉淀',
    desc: '把今天的关键结论和错误沉淀到卡片库，形成长期可复用知识。',
    href: '/deck',
    cta: '去复盘沉淀',
    icon: NotebookText,
  },
]

interface ApiResult<T> {
  success: boolean
  error?: string
  data?: T
}

interface CreatedRoute {
  id: string
}

type GenerationStage = 'idle' | 'ai' | 'saving' | 'switching' | 'syncing'

const STAGE_ORDER: Exclude<GenerationStage, 'idle'>[] = ['ai', 'saving', 'switching', 'syncing']

const STAGE_LABEL: Record<Exclude<GenerationStage, 'idle'>, string> = {
  ai: 'AI 生成路线中',
  saving: '保存路线到数据库',
  switching: '切换到新路线',
  syncing: '同步页面状态',
}

export default function Home() {
  const router = useRouter()
  const { refreshRoutes } = useRoute()
  const [topic, setTopic] = useState('')
  const [background, setBackground] = useState('')
  const [goals, setGoals] = useState('')
  const [timeBudget, setTimeBudget] = useState('')
  const [weeks, setWeeks] = useState('')
  const [constraints, setConstraints] = useState('')
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [generationStage, setGenerationStage] = useState<GenerationStage>('idle')
  const handleGenerate = async () => {
    if (!topic.trim()) {
      setError('请输入你想学习的内容')
      return
    }

    if (!background.trim() || !goals.trim() || !timeBudget.trim()) {
      setError('请补充完整的背景信息（已掌握技能、学习目标、每周投入时间）及期望时长')
      setShowAdvanced(true)
      return
    }

    setLoading(true)
    setError('')
    setGenerationStage('ai')

    try {
      const response = await fetch('/api/learning-roadmap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: topic.trim(),
          background: background.trim(),
          goals: goals.trim(),
          time_budget: timeBudget.trim(),
          weeks: weeks.trim() ? parseInt(weeks.trim(), 10) : undefined,
          constraints: constraints.trim() || undefined
        }),
      })

      const result = await response.json()

      if (!result.success) {
        throw new Error(result.error || '生成失败')
      }

      setGenerationStage('saving')
      const createRouteResponse = await fetch('/api/routes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: topic.trim(),
          background: background.trim() || undefined,
          goals: goals.trim() || undefined,
          weeks: weeks.trim() ? parseInt(weeks.trim(), 10) : undefined,
          roadmap_data: result.data,
        }),
      })

      const createRouteResult: ApiResult<CreatedRoute> = await createRouteResponse.json()
      if (!createRouteResponse.ok || !createRouteResult.success || !createRouteResult.data?.id) {
        throw new Error(createRouteResult.error || '学习路线已生成，但保存失败')
      }

      setGenerationStage('switching')
      const switchRouteResponse = await fetch('/api/routes/switch', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ route_id: createRouteResult.data.id }),
      })

      const switchRouteResult: ApiResult<unknown> = await switchRouteResponse.json()
      if (!switchRouteResponse.ok || !switchRouteResult.success) {
        throw new Error(switchRouteResult.error || '学习路线已生成，但切换失败')
      }

      if (typeof window !== 'undefined') {
        localStorage.setItem('stackmemory-current-route', createRouteResult.data.id)
      }

      setGenerationStage('syncing')
      await refreshRoutes()

      router.push('/roadmap')
    } catch (err) {
      setError(err instanceof Error ? err.message : '生成学习路线失败，请稍后重试')
    } finally {
      setLoading(false)
      setGenerationStage('idle')
    }
  }

  const currentStageIndex = generationStage === 'idle' ? 0 : STAGE_ORDER.indexOf(generationStage) + 1
  const progressPercent = generationStage === 'idle' ? 0 : Math.round((currentStageIndex / STAGE_ORDER.length) * 100)
  return (
    <div className="space-y-8">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold tracking-tight">
          栈记学习站 <span className="text-muted-foreground">StackMemory Learning</span>
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          主线只做两件高价值动作：今日任务执行 + 学习复盘沉淀
        </p>
      </div>

      <Card className="border-primary/20 shadow-md">
        <CardHeader>
          <CardTitle className="text-xl flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            一键生成专属路线
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="你想学什么？例如：Python 机器学习、React 开发..."
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleGenerate()}
              disabled={loading}
              className="flex-1"
            />
            <Button onClick={handleGenerate} disabled={loading} className="min-w-[100px]">
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {generationStage === 'idle' ? '生成中' : STAGE_LABEL[generationStage]}
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  生成
                </>
              )}
            </Button>
          </div>

          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="text-sm text-muted-foreground hover:text-primary flex items-center gap-1"
          >
            {showAdvanced ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            {showAdvanced ? '收起详细信息' : '补充背景信息，让路线更精准'}
          </button>

          {showAdvanced && (
            <div className="space-y-3 p-4 bg-muted/30 rounded-lg">
              <div>
                <label className="text-sm font-medium">已掌握技能</label>
                <Textarea
                  placeholder="例如：熟悉 JavaScript 基础、做过简单网页项目..."
                  value={background}
                  onChange={(e) => setBackground(e.target.value)}
                  disabled={loading}
                  className="mt-1"
                  rows={2}
                />
              </div>
              <div>
                <label className="text-sm font-medium">学习目标</label>
                <Textarea
                  placeholder="例如：找一份前端开发工作、完成个人项目..."
                  value={goals}
                  onChange={(e) => setGoals(e.target.value)}
                  disabled={loading}
                  className="mt-1"
                  rows={2}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium">每周投入时间</label>
                  <Input
                    placeholder="例如：每天2小时、周末6小时"
                    value={timeBudget}
                    onChange={(e) => setTimeBudget(e.target.value)}
                    disabled={loading}
                    className="mt-1"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">期望周期（周）</label>
                  <Input
                    placeholder="4/8/12/16（默认12周）"
                    value={weeks}
                    onChange={(e) => setWeeks(e.target.value)}
                    disabled={loading}
                    className="mt-1"
                  />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium">其他限制（可选）</label>
                <Input
                  placeholder="例如：需要周末休息、偏好视频学习..."
                  value={constraints}
                  onChange={(e) => setConstraints(e.target.value)}
                  disabled={loading}
                  className="mt-1"
                />
              </div>
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2 text-sm text-red-500 bg-red-50 dark:bg-red-950/20 p-2 rounded">
              <AlertCircle className="h-4 w-4" />
              {error}
            </div>
          )}

          {loading && generationStage !== 'idle' && (
            <div className="rounded-md border border-primary/20 bg-primary/5 p-3 space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">{STAGE_LABEL[generationStage]}</span>
                <span className="text-muted-foreground">{currentStageIndex}/{STAGE_ORDER.length}</span>
              </div>
              <div className="h-2 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full bg-primary transition-all duration-300"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>
          )}

          <p className="text-xs text-muted-foreground">
            AI 将根据你的背景、目标与期望时长生成个性化学习路线（默认12周，可自定义4/8/16周），包含每日任务和学习资源
          </p>
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2">
        {primaryActions.map((action) => {
          const Icon = action.icon
          return (
            <Card key={action.title} className="border-border/70 shadow-sm">
              <CardHeader className="space-y-2">
                <div className="flex items-center gap-2">
                  <Icon className="h-5 w-5 text-primary" />
                  <CardTitle className="text-lg">{action.title}</CardTitle>
                </div>
                <p className="text-sm text-muted-foreground">{action.desc}</p>
              </CardHeader>
              <CardContent>
                <Button asChild className="w-full">
                  <Link href={action.href}>
                    {action.cta}
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <div className="text-center">
        <Link
          href="/create"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors"
        >
          <Sparkles className="h-4 w-4" />
          手动建卡（次要功能）
        </Link>
      </div>
    </div>
  )
}
