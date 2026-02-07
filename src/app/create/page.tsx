'use client'

import { useState } from 'react'
import { ContentInput } from '@/components/parser/ContentInput'
import { CardPreview } from '@/components/parser/CardPreview'
import { Flashcard } from '@/lib/deepseek'

export default function CreatePage() {
  const [cards, setCards] = useState<Flashcard[] | null>(null)
  const [sourceUrl, setSourceUrl] = useState<string | undefined>()

  const handleCardsGenerated = (newCards: Flashcard[], url?: string) => {
    setCards(newCards)
    setSourceUrl(url)
  }

  const handleReset = () => {
    setCards(null)
    setSourceUrl(undefined)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">创建闪卡</h1>
        <p className="text-muted-foreground mt-2">
          通过 URL 解析或粘贴文本，快速将技术内容转换为面试闪卡
        </p>
      </div>

      {!cards ? (
        <ContentInput onCardsGenerated={(c) => handleCardsGenerated(c)} />
      ) : (
        <CardPreview
          cards={cards}
          sourceUrl={sourceUrl}
          onReset={handleReset}
        />
      )}
    </div>
  )
}
