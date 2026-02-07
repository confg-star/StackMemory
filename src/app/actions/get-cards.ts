'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export interface CardWithTags {
  id: string
  user_id: string
  question: string
  answer: string
  code_snippet: string | null
  source_url: string | null
  source_title: string | null
  difficulty: string | null
  review_count: number | null
  last_reviewed_at: string | null
  created_at: string
  tags: { id: string; name: string; color: string }[]
}

export interface GetCardsOptions {
  tagId?: string
  search?: string
  limit?: number
  offset?: number
}

/**
 * 获取用户闪卡的 Server Action
 */
export async function getCards(
  options: GetCardsOptions = {}
): Promise<{ success: boolean; cards?: CardWithTags[]; error?: string; total?: number }> {
  try {
    const supabase = await createClient()

    // 获取当前用户
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      console.log('getCards: 用户未登录')
      return {
        success: false,
        cards: [],
        error: '请先登录',
      }
    }

    console.log('getCards: user.id =', user.id)

    const { tagId, search, limit = 50, offset = 0 } = options

    // 先查询所有属于该用户的卡片数量
    const { count: totalCount, error: countError } = await supabase
      .from('flashcards')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)

    console.log('getCards: totalCount =', totalCount, 'countError =', countError)

    // 构建查询 - 简单查询，不关联标签表
    let query = supabase
      .from('flashcards')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    // 搜索
    if (search) {
      query = query.or(`question.ilike.%${search}%,answer.ilike.%${search}%`)
    }

    const { data, error } = await query

    console.log('getCards: data =', data?.length, 'cards')
    if (error) {
      console.error('获取卡片失败:', error)
      return {
        success: false,
        cards: [],
        error: '获取卡片失败: ' + error.message,
      }
    }

    // 分别获取每张卡的标签
    const cardsWithTags: CardWithTags[] = await Promise.all(
      (data || []).map(async (card: any) => {
        // 获取卡片关联的标签
        const { data: tagRelations } = await supabase
          .from('card_tags')
          .select(`
            tags(id, name, color)
          `)
          .eq('card_id', card.id)

        const tags = tagRelations?.map((t: any) => t.tags).filter(Boolean) || []

        return {
          id: card.id,
          user_id: card.user_id,
          question: card.question,
          answer: card.answer,
          code_snippet: card.code_snippet,
          source_url: card.source_url,
          source_title: card.source_title,
          difficulty: card.difficulty,
          review_count: card.review_count,
          last_reviewed_at: card.last_reviewed_at,
          created_at: card.created_at,
          tags,
        }
      })
    )

    // 获取总数
    const { count } = await supabase
      .from('flashcards')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)

    return {
      success: true,
      cards: cardsWithTags,
      total: count || 0,
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

/**
 * 获取所有标签
 */
export async function getTags(): Promise<{ success: boolean; tags?: { id: string; name: string; color: string }[]; error?: string }> {
  try {
    const supabase = await createClient()

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return {
        success: false,
        tags: [],
        error: '请先登录',
      }
    }

    // 获取系统标签和用户创建的标签
    const { data, error } = await supabase
      .from('tags')
      .select('id, name, color')
      .or(`user_id.eq.${user.id},user_id.is.null`)
      .order('name')

    if (error) {
      console.error('获取标签失败:', error)
      return {
        success: false,
        tags: [],
        error: '获取标签失败',
      }
    }

    return {
      success: true,
      tags: data || [],
    }
  } catch (error) {
    console.error('获取标签异常:', error)
    return {
      success: false,
      tags: [],
      error: '获取标签失败',
    }
  }
}

/**
 * 删除卡片
 */
export async function deleteCard(
  cardId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient()

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return {
        success: false,
        error: '请先登录',
      }
    }

    // 检查卡片是否属于当前用户
    const { data: existingCard } = await supabase
      .from('flashcards')
      .select('id')
      .eq('id', cardId)
      .eq('user_id', user.id)
      .single()

    if (!existingCard) {
      return {
        success: false,
        error: '卡片不存在或无权删除',
      }
    }

    const { error } = await supabase
      .from('flashcards')
      .delete()
      .eq('id', cardId)
      .eq('user_id', user.id)

    if (error) {
      console.error('删除卡片失败:', error)
      return {
        success: false,
        error: '删除失败',
      }
    }

    revalidatePath('/deck')
    return { success: true }
  } catch (error) {
    console.error('删除卡片异常:', error)
    return {
      success: false,
      error: '删除失败',
    }
  }
}
