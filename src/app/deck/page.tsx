'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { DeckGrid } from '@/components/deck/DeckGrid'
import { FilterBar } from '@/components/deck/FilterBar'
import { CardWithTags } from '@/lib/data-provider/interfaces'
import { getCards, getTags, deleteCard } from '@/app/actions/get-cards'
import { toast } from 'sonner'
import { Skeleton } from '@/components/ui/skeleton'
import { useRoute } from '@/lib/context/RouteContext'

export default function DeckPage() {
  const [cards, setCards] = useState<CardWithTags[]>([])
  const [tags, setTags] = useState<{ id: string; name: string; color: string }[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedTagId, setSelectedTagId] = useState<string | undefined>()
  const [searchQuery, setSearchQuery] = useState('')
  const [totalCount, setTotalCount] = useState(0)
  const { currentRoute } = useRoute()
  const requestVersionRef = useRef(0)
  const latestTagsRef = useRef<{ id: string; name: string; color: string }[]>([])

  const loadData = useCallback(async (tag?: string, search?: string, isInitial = false) => {
    const requestVersion = ++requestVersionRef.current

    if (!currentRoute?.id) {
      console.warn('[route-guard] blocked deck load without routeId')
      setCards([])
      setTotalCount(0)
      if (isInitial && requestVersion === requestVersionRef.current) {
        setLoading(false)
      }
      return
    }

    if (isInitial) setLoading(true)
    
    const [tagsResult, cardsResult] = await Promise.all([
      isInitial ? getTags() : Promise.resolve({ success: true, tags: latestTagsRef.current }),
      getCards({ tagId: tag, search: search || undefined, routeId: currentRoute.id })
    ])

    if (requestVersion !== requestVersionRef.current) {
      return
    }

    if (isInitial && tagsResult.success && tagsResult.tags) {
      latestTagsRef.current = tagsResult.tags
      setTags(tagsResult.tags)
    }

    if (cardsResult.success && cardsResult.cards) {
      setCards(cardsResult.cards)
      setTotalCount(cardsResult.total || 0)
    } else {
      setCards([])
      setTotalCount(0)
    }
    
    setLoading(false)
  }, [currentRoute])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadData(undefined, undefined, true)
    }, 0)
    return () => window.clearTimeout(timer)
  }, [loadData])

  useEffect(() => {
    const handler = () => {
      void loadData(selectedTagId, searchQuery, true)
    }
    window.addEventListener('route-changed', handler)
    return () => window.removeEventListener('route-changed', handler)
  }, [loadData, searchQuery, selectedTagId])

  const handleTagSelect = (tagId?: string) => {
    setSelectedTagId(tagId)
    loadData(tagId, searchQuery)
  }

  const handleSearch = (query: string) => {
    setSearchQuery(query)
    loadData(selectedTagId, query)
  }

  const handleDelete = async (cardId: string) => {
    const result = await deleteCard(cardId)
    if (result.success) {
      toast.success('卡片已删除')
      loadData(selectedTagId, searchQuery)
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
