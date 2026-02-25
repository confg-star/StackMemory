'use server'

import { getCardRepository } from '@/lib/data-provider'
import { CardWithTags } from '@/lib/data-provider/interfaces'
import { revalidatePath } from 'next/cache'
import { resolveServerUserId } from '@/lib/server-user'

export interface GetCardsOptions {
  tagId?: string
  search?: string
  limit?: number
  offset?: number
  routeId?: string
}

async function getAuthUserId(): Promise<{ userId: string | null; error?: string }> {
  return resolveServerUserId()
}

export async function getCards(
  options: GetCardsOptions = {}
): Promise<{ success: boolean; cards?: CardWithTags[]; error?: string; total?: number }> {
  try {
    const { userId, error: authError } = await getAuthUserId()

    if (authError || !userId) {
      return {
        success: false,
        cards: [],
        error: authError || '请先登录',
      }
    }

    if (!options.routeId || options.routeId.trim().length === 0) {
      console.warn('[route-guard] blocked card query without routeId')
      return {
        success: false,
        cards: [],
        error: '缺少 routeId，已拦截查询',
        total: 0,
      }
    }

    const repo = getCardRepository()
    const { cards, total } = await repo.getCards(userId, options)

    return {
      success: true,
      cards,
      total,
    }
  } catch (error) {
    console.error('获取卡片异常:', error)
    return {
      success: false,
      cards: [],
      error: '获取卡片失败',
    }
  }
}

export async function getTags(): Promise<{ success: boolean; tags?: { id: string; name: string; color: string }[]; error?: string }> {
  try {
    const { userId, error: authError } = await getAuthUserId()

    if (authError || !userId) {
      return {
        success: false,
        tags: [],
        error: authError || '请先登录',
      }
    }

    const repo = getCardRepository()
    return await repo.getTags(userId)
  } catch (error) {
    console.error('获取标签异常:', error)
    return {
      success: false,
      tags: [],
      error: '获取标签失败',
    }
  }
}

export async function deleteCard(
  cardId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { userId, error: authError } = await getAuthUserId()

    if (authError || !userId) {
      return {
        success: false,
        error: authError || '请先登录',
      }
    }

    const repo = getCardRepository()
    const result = await repo.deleteCard(userId, cardId)

    if (result.success) {
      revalidatePath('/deck')
    }

    return result
  } catch (error) {
    console.error('删除卡片异常:', error)
    return {
      success: false,
      error: '删除失败',
    }
  }
}
