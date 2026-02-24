'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Loader2, RotateCw, Save, Copy, Check } from 'lucide-react'
import { Flashcard } from '@/lib/deepseek'
import { saveCards } from '@/app/actions/save-card'
import { useRoute } from '@/lib/context/RouteContext'
import { toast } from 'sonner'

interface CardPreviewProps {
  cards: Flashcard[]
  sourceUrl?: string
  onReset: () => void
}

export function CardPreview({ cards, sourceUrl, onReset }: CardPreviewProps) {
  const [flippedIndex, setFlippedIndex] = useState<number | null>(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null)
  const { currentRoute } = useRoute()

  const handleSave = async () => {
    if (!currentRoute?.id) {
      toast.error('缺少 routeId，已拦截保存')
      return
    }

    setSaving(true)
    try {
      const result = await saveCards(cards, sourceUrl, undefined, currentRoute.id)
      if (!result.success) {
        toast.error(result.error || '保存失败')
        return
      }
      setSaved(true)
      toast.success('保存成功')
    } catch (error) {
      console.error('保存失败:', error)
      toast.error('保存失败')
    } finally {
      setSaving(false)
    }
  }

  const handleCopy = async (card: Flashcard, index: number) => {
    const text = `Q: ${card.question}\nA: ${card.answer}`
    await navigator.clipboard.writeText(text)
    setCopiedIndex(index)
    setTimeout(() => setCopiedIndex(null), 2000)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">预览 ({cards.length} 张闪卡)</h2>
          {sourceUrl && (
            <p className="text-sm text-muted-foreground mt-1">
              来源: {sourceUrl}
            </p>
          )}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onReset}>
            <RotateCw className="mr-2 h-4 w-4" />
            重新生成
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                保存中...
              </>
            ) : saved ? (
              <>
                <Check className="mr-2 h-4 w-4" />
                已保存
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                保存到卡片库
              </>
            )}
          </Button>
        </div>
      </div>

      <div className="grid gap-4">
        {cards.map((card, index) => (
          <Card
            key={index}
            className={`cursor-pointer transition-all hover:shadow-md ${
              flippedIndex === index ? 'ring-2 ring-primary' : ''
            }`}
            onClick={() =>
              setFlippedIndex(flippedIndex === index ? null : index)
            }
          >
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <Badge variant="secondary">卡片 {index + 1}</Badge>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleCopy(card, index)
                  }}
                >
                  {copiedIndex === index ? (
                    <Check className="h-4 w-4 text-green-500" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    问题
                  </p>
                  <p className="text-lg font-medium">{card.question}</p>
                </div>

                {flippedIndex === index && (
                  <div className="animate-in fade-in slide-in-from-top-2 duration-200">
                    <hr className="my-3" />
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">
                        答案
                      </p>
                      <p className="mt-1">{card.answer}</p>
                    </div>
                    {card.codeSnippet && (
                      <div className="mt-3">
                        <p className="text-sm font-medium text-muted-foreground">
                          代码示例
                        </p>
                        <pre className="mt-2 p-3 bg-muted rounded-md overflow-x-auto text-sm">
                          <code>{card.codeSnippet}</code>
                        </pre>
                      </div>
                    )}
                  </div>
                )}

                {flippedIndex !== index && (
                  <p className="text-xs text-muted-foreground">
                    点击查看答案
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
