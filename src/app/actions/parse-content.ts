'use server'

import { scrapeUrl } from '@/lib/scraper'
import { callAI, Flashcard } from '@/lib/deepseek'

export interface ParseInput {
  url?: string
  text?: string
}

export interface ParseResult {
  success: boolean
  cards: Flashcard[]
  error?: string
  sourceUrl?: string
}

/**
 * 解析内容的 Server Action
 * 支持 URL 和纯文本两种输入方式
 */
export async function parseContent(input: ParseInput): Promise<ParseResult> {
  console.log('=== parseContent 开始 ===')
  console.log('input:', JSON.stringify(input))

  // 验证输入
  if (!input.url && !input.text) {
    return {
      success: false,
      cards: [],
      error: '请提供 URL 或文本内容',
    }
  }

  if (input.url && input.text) {
    return {
      success: false,
      cards: [],
      error: '只能选择 URL 或文本之一',
    }
  }

  let content = input.text || ''
  let sourceUrl = input.url

  // 如果是 URL，先爬取内容
  if (input.url) {
    console.log('开始爬取 URL:', input.url)
    const scrapeResult = await scrapeUrl(input.url)
    console.log('爬取结果:', JSON.stringify(scrapeResult))

    if (scrapeResult.error) {
      return {
        success: false,
        cards: [],
        error: `爬取失败: ${scrapeResult.error}`,
        sourceUrl: input.url,
      }
    }

    if (!scrapeResult.content) {
      return {
        success: false,
        cards: [],
        error: '无法提取页面内容',
        sourceUrl: input.url,
      }
    }

    content = `标题: ${scrapeResult.title}\n\n${scrapeResult.content}`
    sourceUrl = input.url
  }

  // 调用 MiniMax AI API 生成闪卡
  console.log('开始调用 AI API...')
  const result = await callAI(content, sourceUrl)
  console.log('AI 返回结果:', JSON.stringify(result))

  return result
}
