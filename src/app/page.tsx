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
              栈记 <span className="text-muted-foreground">StackMemory</span>
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              将技术文章转化为面试准备闪卡，让学习更高效
            </p>
          </div>

          {/* Features */}
          <div className="grid gap-4 sm:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center gap-2 pb-2">
                <Sparkles className="h-5 w-5 text-primary" />
                <CardTitle className="text-base">AI 智能解析</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  自动从技术文章中提取关键知识点，生成高质量面试问答
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center gap-2 pb-2">
                <Brain className="h-5 w-5 text-primary" />
                <CardTitle className="text-base">间隔重复</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  科学记忆曲线设计，帮助你长期巩固技术知识
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center gap-2 pb-2">
                <BookOpen className="h-5 w-5 text-primary" />
                <CardTitle className="text-base">随时复习</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  所有闪卡保存在你的卡片库中，随时随地复习回顾
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
