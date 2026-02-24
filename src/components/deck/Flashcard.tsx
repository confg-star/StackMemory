'use client'

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { RotateCw, Copy, ExternalLink, Trash2 } from 'lucide-react'
import { CardWithTags } from '@/lib/data-provider/interfaces'

interface FlashcardProps {
  card: CardWithTags
  onDelete?: (id: string) => void
}

export function Flashcard({ card, onDelete }: FlashcardProps) {
  const [isFlipped, setIsFlipped] = useState(false)
  const [isAnimating, setIsAnimating] = useState(false)

  const handleFlip = () => {
    if (!isAnimating) {
      setIsFlipped(!isFlipped)
    }
  }

  const handleCopy = async () => {
    const text = `Q: ${card.question}\nA: ${card.answer}`
    await navigator.clipboard.writeText(text)
  }

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (onDelete && confirm('确定要删除这张卡片吗？')) {
      onDelete(card.id)
    }
  }

  // 格式化日期
  const formattedDate = new Date(card.created_at).toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })

  return (
    <div className="perspective-1000 w-full" onClick={handleFlip}>
      <div
        className={`relative w-full h-64 transition-all duration-500 transform-style-3d cursor-pointer ${
          isFlipped ? 'rotate-y-180' : ''
        }`}
        style={{
          transformStyle: 'preserve-3d',
          transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
        }}
      >
        {/* 正面 - 问题 */}
        <Card className="absolute inset-0 backface-hidden flex flex-col">
          <div className="flex-1 flex items-center justify-center p-6">
            <div className="text-center">
              <p className="text-lg font-medium leading-relaxed">
                {card.question}
              </p>
            </div>
          </div>
          <div className="border-t p-3 flex items-center justify-between bg-muted/30">
            <div className="flex gap-1 flex-wrap">
              {card.tags?.slice(0, 3).map((tag) => (
                <Badge
                  key={tag.id}
                  variant="secondary"
                  style={{ backgroundColor: tag.color + '20', color: tag.color }}
                >
                  {tag.name}
                </Badge>
              ))}
            </div>
            <span className="text-xs text-muted-foreground">
              {formattedDate}
            </span>
          </div>
        </Card>

        {/* 背面 - 答案 */}
        <Card
          className="absolute inset-0 backface-hidden rotate-y-180 flex flex-col"
          style={{ transform: 'rotateY(180deg)', backfaceVisibility: 'hidden' }}
        >
          <div className="flex-1 overflow-auto p-4">
            <div className="space-y-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">
                  答案
                </p>
                <p className="text-sm leading-relaxed whitespace-pre-wrap">
                  {card.answer}
                </p>
              </div>

              {card.code_snippet && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">
                    代码示例
                  </p>
                  <pre className="p-3 bg-muted rounded-md overflow-x-auto text-xs">
                    <code>{card.code_snippet}</code>
                  </pre>
                </div>
              )}

              {card.source_url && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <ExternalLink className="h-3 w-3" />
                  <a
                    href={card.source_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:underline"
                    onClick={(e) => e.stopPropagation()}
                  >
                    来源文章
                  </a>
                </div>
              )}
            </div>
          </div>
          <div className="border-t p-2 flex items-center justify-end gap-1 bg-muted/30">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCopy}
              title="复制"
            >
              <Copy className="h-4 w-4" />
            </Button>
            {onDelete && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDelete}
                title="删除"
                className="text-destructive hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </Card>
      </div>

      <style jsx global>{`
        .perspective-1000 {
          perspective: 1000px;
        }
        .transform-style-3d {
          transform-style: preserve-3d;
        }
        .backface-hidden {
          backface-visibility: hidden;
        }
        .rotate-y-180 {
          transform: rotateY(180deg);
        }
      `}</style>
    </div>
  )
}
