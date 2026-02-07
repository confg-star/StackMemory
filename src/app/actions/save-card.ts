'use server'

import { createClient } from '@/lib/supabase/server'
import { Flashcard } from '@/lib/deepseek'
import { revalidatePath } from 'next/cache'

export interface SaveCardsInput {
  cards: Flashcard[]
  sourceUrl?: string
  tags?: string[]
}

/**
 * 保存闪卡到数据库的 Server Action
 */
export async function saveCards(
  cards: Flashcard[],
  sourceUrl?: string,
  tags?: string[]
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient()

    // 获取当前用户
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return {
        success: false,
        error: '请先登录后再保存',
      }
    }

    // 验证卡片
    if (!cards || cards.length === 0) {
      return {
        success: false,
        error: '没有可保存的卡片',
      }
    }

    // 获取或创建标签
    const tagIds: string[] = []
    if (tags && tags.length > 0) {
      for (const tagName of tags) {
        const normalizedTag = tagName.toLowerCase().trim()

        // 尝试查找现有标签
        const { data: existingTag } = await supabase
          .from('tags')
          .select('id')
          .eq('name', normalizedTag)
          .eq('user_id', user.id)
          .single()

        if (existingTag) {
          tagIds.push(existingTag.id)
        } else {
          // 创建新标签
          const { data: newTag, error: tagError } = await supabase
            .from('tags')
            .insert({ name: normalizedTag, user_id: user.id })
            .select('id')
            .single()

          if (tagError) {
            console.error('创建标签失败:', tagError)
          } else if (newTag) {
            tagIds.push(newTag.id)
          }
        }
      }
    }

    // 插入闪卡
    const flashcardsToInsert = cards.map((card) => ({
      user_id: user.id,
      question: card.question,
      answer: card.answer,
      code_snippet: card.codeSnippet || null,
      source_url: sourceUrl || null,
      is_reviewed: false,
      review_count: 0,
      created_at: new Date().toISOString(),
    }))

    const { data: insertedCards, error: insertError } = await supabase
      .from('flashcards')
      .insert(flashcardsToInsert)
      .select()

    if (insertError) {
      console.error('插入闪卡失败:', insertError)
      return {
        success: false,
        error: '保存失败，请稍后重试',
      }
    }

    // 关联标签（如果有）
    if (tagIds.length > 0 && insertedCards && insertedCards.length > 0) {
      const cardTagRelations: { card_id: string; tag_id: string }[] = []

      for (const card of insertedCards) {
        for (const tagId of tagIds) {
          cardTagRelations.push({
            card_id: card.id,
            tag_id: tagId,
          })
        }
      }

      if (cardTagRelations.length > 0) {
        await supabase.from('card_tags').insert(cardTagRelations)
      }
    }

    // 刷新卡片列表页面
    revalidatePath('/deck')

    return { success: true }
  } catch (error) {
    console.error('保存闪卡异常:', error)
    return {
      success: false,
      error: '保存失败，请稍后重试',
    }
  }
}
