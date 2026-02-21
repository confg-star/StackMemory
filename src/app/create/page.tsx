'use client'

import Link from 'next/link'
import { useState } from 'react'
import { ContentInput } from '@/components/parser/ContentInput'
import { CardPreview } from '@/components/parser/CardPreview'
import { Flashcard } from '@/lib/deepseek'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ArrowRight, Sparkles, Target, NotebookText } from 'lucide-react'

const quickActions = [
  {
    title: '一键生成今日任务',
    desc: '直接进入今日任务页，按“学习→实操→复盘”执行，不再空转。',
    href: '/tasks',
    cta: '立即生成并执行',
    icon: Target,
    badge: '主入口',
  },
  {
    title: '学习复盘 / 错题沉淀',
    desc: '把今天的踩坑、错题、关键结论沉淀到卡片库，形成可复用知识。',
    href: '/deck',
    cta: '去复盘沉淀',
    icon: NotebookText,
    badge: '主入口',
  },
]

export default function ActionCenterPage() {
  const [cards, setCards] = useState<Flashcard[] | null>(null)
  const [showManualCreate, setShowManualCreate] = useState(false)

  return (
    <div className="space-y-8">
      <section className="space-y-3">
        <div className="flex items-center gap-2 text-primary">
          <Sparkles className="h-5 w-5" />
          <span className="text-sm font-medium">行动中心</span>
        </div>
        <h1 className="text-3xl font-bold tracking-tight">先做高价值动作</h1>
        <p className="text-muted-foreground max-w-3xl leading-7">
          主流程只保留两个入口：先拿到并执行今日任务，再做学习复盘与错题沉淀。
          手动建卡降级为次要功能，默认隐藏。
        </p>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        {quickActions.map((action) => {
          const Icon = action.icon
          return (
            <Card key={action.title} className="border-border/70 shadow-sm">
              <CardHeader className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <Icon className="h-5 w-5 text-primary" />
                  <Badge variant="secondary" className="text-xs">{action.badge}</Badge>
                </div>
                <CardTitle className="text-xl">{action.title}</CardTitle>
                <CardDescription className="leading-6">{action.desc}</CardDescription>
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
      </section>

      <section className="space-y-4 border-t pt-6">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h2 className="text-xl font-semibold">手动建卡（次要功能）</h2>
            <p className="text-muted-foreground mt-1 text-sm">
              仅在你已有明确内容要沉淀时使用，默认隐藏。
            </p>
          </div>
          <Button variant="outline" onClick={() => setShowManualCreate((v) => !v)}>
            {showManualCreate ? '隐藏手动建卡' : '显示手动建卡'}
          </Button>
        </div>

        {showManualCreate && (
          <div className="space-y-4">
            {cards ? (
              <>
                <div className="flex justify-end">
                  <Button variant="outline" onClick={() => setCards(null)}>
                    返回手动建卡输入
                  </Button>
                </div>
                <CardPreview cards={cards} onReset={() => setCards(null)} />
              </>
            ) : (
              <ContentInput onCardsGenerated={setCards} />
            )}
          </div>
        )}
      </section>
    </div>
  )
}
