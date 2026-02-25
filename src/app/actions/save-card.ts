'use server'

import { Flashcard } from '@/lib/deepseek'
import { getCardRepository } from '@/lib/data-provider'
import { revalidatePath } from 'next/cache'
import { resolveServerUserId } from '@/lib/server-user'

export interface SaveCardsInput {
  cards: Flashcard[]
  sourceUrl?: string
  tags?: string[]
  routeId?: string
}

async function getAuthUserId(): Promise<{ userId: string | null; error?: string }> {
  const result = await resolveServerUserId()
  if (!result.userId) {
    return { userId: null, error: '请先登录后再保存' }
  }
  return result
}

export async function saveCards(
  cards: Flashcard[],
  sourceUrl?: string,
  tags?: string[],
  routeId?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { userId, error: authError } = await getAuthUserId()

    if (authError || !userId) {
      return {
        success: false,
        error: authError || '请先登录后再保存',
      }
    }

    if (!cards || cards.length === 0) {
      return {
        success: false,
        error: '没有可保存的卡片',
      }
    }

    if (!routeId || routeId.trim().length === 0) {
      console.warn('[route-guard] blocked save cards without routeId')
      return {
        success: false,
        error: '缺少 routeId，已拦截保存',
      }
    }

    const repo = getCardRepository()

    let tagIds: string[] = []
    if (tags && tags.length > 0) {
      tagIds = await repo.getOrCreateTags(userId, tags)
    }

    const cardsToSave = cards.map((card) => ({
      question: card.question,
      answer: card.answer,
      codeSnippet: card.codeSnippet || null,
      sourceUrl: sourceUrl || null,
      routeId,
    }))

    const result = await repo.saveCards(userId, cardsToSave, sourceUrl, tagIds)

    if (result.success) {
      revalidatePath('/deck')
    }

    return result
  } catch (error) {
    console.error('保存闪卡异常:', error)
    return {
      success: false,
      error: '保存失败，请稍后重试',
    }
  }
}
