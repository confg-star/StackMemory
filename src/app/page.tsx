'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ContentInput } from '@/components/parser/ContentInput'
import { CardPreview } from '@/components/parser/CardPreview'
import { Flashcard } from '@/lib/deepseek'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Sparkles, BookOpen, Brain, ArrowRight } from 'lucide-react'

export default function Home() {
  const [generatedCards, setGeneratedCards] = useState<Flashcard[]>([])
  const [sourceUrl, setSourceUrl] = useState<string>('')

  const handleCardsGenerated = (cards: Flashcard[]) => {
    setGeneratedCards(cards)
  }

  const handleReset = () => {
    setGeneratedCards([])
    setSourceUrl('')
  }

  return (
    <div className="space-y-8">
      {/* Hero Section */}
      {!generatedCards.length && (
        <>
          <div className="text-center space-y-4">
            <h1 className="text-4xl font-bold tracking-tight">
              栈记学习站 <span className="text-muted-foreground">StackMemory Learning</span>
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              你的专属 Agent 学习网站：路线、任务、闪卡和复盘都在这里
            </p>
          </div>

          {/* Features */}
          <div className="grid gap-4 sm:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center gap-2 pb-2">
                <Sparkles className="h-5 w-5 text-primary" />
                <CardTitle className="text-base">学习路线</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  我会按你的目标动态维护 12 周 Agent 路线，清楚知道每周学什么
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center gap-2 pb-2">
                <Brain className="h-5 w-5 text-primary" />
                <CardTitle className="text-base">每日任务</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  每天给你 3 个可执行任务（学习/实操/复盘），做完就有进展
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center gap-2 pb-2">
                <BookOpen className="h-5 w-5 text-primary" />
                <CardTitle className="text-base">知识沉淀</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  文章自动转闪卡，配合复习库，把输入内容变成长期可用的能力
                </p>
              </CardContent>
            </Card>
          </div>

          {/* CTA */}
          <div className="flex justify-center">
            <div className="w-full max-w-lg">
              <ContentInput onCardsGenerated={handleCardsGenerated} />
            </div>
          </div>

          {/* Quick Links */}
          <div className="text-center">
            <Link
              href="/deck"
              className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors"
            >
              查看我的卡片
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </>
      )}

      {/* Card Preview */}
      {generatedCards.length > 0 && (
        <CardPreview
          cards={generatedCards}
          sourceUrl={sourceUrl}
          onReset={handleReset}
        />
      )}
    </div>
  )
}
