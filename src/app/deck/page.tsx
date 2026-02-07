'use client'

import { useEffect, useState, useCallback } from 'react'
import { DeckGrid } from '@/components/deck/DeckGrid'
import { FilterBar } from '@/components/deck/FilterBar'
import { CardWithTags, getCards, getTags, deleteCard } from '@/app/actions/get-cards'
import { toast } from 'sonner'
import { Skeleton } from '@/components/ui/skeleton'

export default function DeckPage() {
  const [cards, setCards] = useState<CardWithTags[]>([])
  const [tags, setTags] = useState<{ id: string; name: string; color: string }[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedTagId, setSelectedTagId] = useState<string | undefined>()
  const [searchQuery, setSearchQuery] = useState('')
  const [totalCount, setTotalCount] = useState(0)

  // 加载标签
  const loadTags = useCallback(async () => {
    const result = await getTags()
    if (result.success && result.tags) {
      setTags(result.tags)
    }
  }, [])

  // 加载卡片
  const loadCards = useCallback(async () => {
    setLoading(true)
    const result = await getCards({
      tagId: selectedTagId,
      search: searchQuery || undefined,
    })

    if (result.success && result.cards) {
      setCards(result.cards)
      setTotalCount(result.total || 0)
    }
    setLoading(false)
  }, [selectedTagId, searchQuery])

  // 初始加载
  useEffect(() => {
    loadTags()
    loadCards()
  }, [loadTags, loadCards])

  // 处理标签选择
  const handleTagSelect = (tagId?: string) => {
    setSelectedTagId(tagId)
  }

  // 处理搜索
  const handleSearch = (query: string) => {
    setSearchQuery(query)
  }

  // 处理删除
  const handleDelete = async (cardId: string) => {
    const result = await deleteCard(cardId)
    if (result.success) {
      toast.success('卡片已删除')
      loadCards()
    } else {
      toast.error(result.error || '删除失败')
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">我的卡片</h1>
          <p className="text-muted-foreground mt-1">
            {loading ? '加载中...' : totalCount > 0 ? `共 ${totalCount} 张闪卡` : '开始创建你的闪卡吧！'}
          </p>
        </div>
      </div>

      {loading ? (
        // 加载骨架屏
        <div className="space-y-4">
          <div className="flex gap-2 flex-wrap">
            <Skeleton className="h-8 w-20" />
            <Skeleton className="h-8 w-20" />
            <Skeleton className="h-8 w-20" />
            <Skeleton className="h-8 w-20" />
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="border rounded-lg p-4 space-y-3">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-20 w-full" />
              </div>
            ))}
          </div>
        </div>
      ) : (
        <>
          <FilterBar
            tags={tags}
            selectedTagId={selectedTagId}
            searchQuery={searchQuery}
            totalCount={totalCount}
            onTagSelect={handleTagSelect}
            onSearch={handleSearch}
          />

          {cards.length === 0 ? (
            // 空状态
            <div className="text-center py-12">
              <div className="text-6xl mb-4">📚</div>
              <h3 className="text-xl font-semibold mb-2">
                {searchQuery || selectedTagId ? '没有找到匹配的卡片' : '还没有闪卡'}
              </h3>
              <p className="text-muted-foreground mb-4">
                {searchQuery || selectedTagId
                  ? '尝试调整搜索条件或筛选标签'
                  : '创建你的第一张闪卡，开始技术面试准备之旅'}
              </p>
              <a
                href="/create"
                className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
              >
                创建闪卡
              </a>
            </div>
          ) : (
            <DeckGrid cards={cards} onDelete={handleDelete} />
          )}
        </>
      )}
    </div>
  )
}
