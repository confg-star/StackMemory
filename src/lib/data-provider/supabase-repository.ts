import { createClient as createSupabaseClient } from '@/lib/supabase/server'
import { CardRepository, CardWithTags, Tag } from './interfaces'

export class SupabaseCardRepository implements CardRepository {
  private async getClient() {
    return createSupabaseClient()
  }

  async getCards(
    userId: string,
    options: { tagId?: string; search?: string; limit?: number; offset?: number; routeId?: string } = {}
  ): Promise<{ cards: CardWithTags[]; total: number }> {
    const supabase = await this.getClient()
    const { tagId, search, limit = 50, offset = 0, routeId } = options

    let query = supabase
      .from('flashcards')
      .select('*', { count: 'exact' })
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (search) {
      query = query.or(`question.ilike.%${search}%,answer.ilike.%${search}%`)
    }

    if (tagId) {
      query = query.eq('tags.id', tagId)
    }

    if (routeId) {
      query = query.eq('route_id', routeId)
    }

    const { data, error, count } = await query

    if (error || !data) {
      console.error('Supabase getCards error:', error)
      return { cards: [], total: count || 0 }
    }

    const cardsWithTags: CardWithTags[] = await Promise.all(
      data.map(async (card) => {
        const { data: tagRelations } = await supabase
          .from('card_tags')
          .select('tags(id, name, color)')
          .eq('card_id', card.id)

        const tags = (tagRelations as { tags: Tag }[] | null)?.map((t) => t.tags).filter((t) => t !== null) || []

        return {
          ...card,
          tags,
        }
      })
    )

    return { cards: cardsWithTags, total: count || 0 }
  }

  async getCardById(userId: string, cardId: string): Promise<CardWithTags | null> {
    const supabase = await this.getClient()

    const { data: card, error } = await supabase
      .from('flashcards')
      .select('*')
      .eq('id', cardId)
      .eq('user_id', userId)
      .single()

    if (error || !card) return null

    const { data: tagRelations } = await supabase
      .from('card_tags')
      .select('tags(id, name, color)')
      .eq('card_id', cardId)

    const tags = (tagRelations as { tags: Tag }[] | null)?.map((t) => t.tags).filter((t) => t !== null) || []

    return { ...card, tags }
  }

  async saveCards(
    userId: string,
    cards: { question: string; answer: string; codeSnippet?: string | null; sourceUrl?: string | null; routeId?: string | null }[],
    sourceUrl?: string,
    tagIds?: string[]
  ): Promise<{ success: boolean; error?: string }> {
    const supabase = await this.getClient()

    const flashcardsToInsert = cards.map((card) => ({
      user_id: userId,
      question: card.question,
      answer: card.answer,
      route_id: card.routeId || null,
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
      console.error('Supabase saveCards insert error:', insertError)
      return { success: false, error: insertError.message }
    }

    if (tagIds && tagIds.length > 0 && insertedCards && insertedCards.length > 0) {
      const cardTagRelations: { card_id: string; tag_id: string }[] = []

      for (const card of insertedCards) {
        for (const tagId of tagIds) {
          cardTagRelations.push({ card_id: card.id, tag_id: tagId })
        }
      }

      await supabase.from('card_tags').insert(cardTagRelations)
    }

    return { success: true }
  }

  async deleteCard(userId: string, cardId: string): Promise<{ success: boolean; error?: string }> {
    const supabase = await this.getClient()

    const { data: existingCard } = await supabase
      .from('flashcards')
      .select('id')
      .eq('id', cardId)
      .eq('user_id', userId)
      .single()

    if (!existingCard) {
      return { success: false, error: '卡片不存在或无权删除' }
    }

    const { error } = await supabase
      .from('flashcards')
      .delete()
      .eq('id', cardId)
      .eq('user_id', userId)

    if (error) {
      console.error('Supabase deleteCard error:', error)
      return { success: false, error: error.message }
    }

    return { success: true }
  }

  async getTags(userId: string): Promise<{ success: boolean; tags?: Tag[]; error?: string }> {
    const supabase = await this.getClient()

    const { data, error } = await supabase
      .from('tags')
      .select('id, name, color')
      .or(`user_id.eq.${userId},user_id.is.null`)
      .order('name')

    if (error) {
      console.error('Supabase getTags error:', error)
      return { success: false, error: error.message }
    }

    return { success: true, tags: data || [] }
  }

  async getOrCreateTags(userId: string, tagNames: string[]): Promise<string[]> {
    const supabase = await this.getClient()
    const tagIds: string[] = []

    for (const tagName of tagNames) {
      const normalizedTag = tagName.toLowerCase().trim()

      const { data: existingTag } = await supabase
        .from('tags')
        .select('id')
        .eq('name', normalizedTag)
        .eq('user_id', userId)
        .single()

      if (existingTag) {
        tagIds.push(existingTag.id)
      } else {
        const { data: newTag, error: tagError } = await supabase
          .from('tags')
          .insert({ name: normalizedTag, user_id: userId })
          .select('id')
          .single()

        if (!tagError && newTag) {
          tagIds.push(newTag.id)
        }
      }
    }

    return tagIds
  }
}
