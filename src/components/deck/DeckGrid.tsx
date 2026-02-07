'use client'

import { Flashcard } from './Flashcard'
import { CardWithTags } from '@/app/actions/get-cards'
import { Card } from '@/components/ui/card'
import { Loader2 } from 'lucide-react'

interface DeckGridProps {
  cards: CardWithTags[]
  loading?: boolean
  onDelete?: (id: string) => void
}

export function DeckGrid({ cards, loading, onDelete }: DeckGridProps) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!cards || cards.length === 0) {
    return (
      <Card className="p-12 text-center">
        <div className="space-y-4">
          <div className="text-6xl">📚</div>
          <h3 className="text-xl font-semibold">还没有闪卡</h3>
          <p className="text-muted-foreground max-w-sm mx-auto">
            创建你的第一张闪卡，开始你的技术面试准备之旅！
          </p>
        </div>
      </Card>
    )
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {cards.map((card) => (
        <Flashcard key={card.id} card={card} onDelete={onDelete} />
      ))}
    </div>
  )
}
