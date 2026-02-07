import { JSDOM } from 'jsdom'

export interface ScrapeResult {
  title: string
  content: string
  error?: string
}

/**
 * 爬取 URL 并提取正文内容
 * @param url 目标 URL
 * @returns 包含标题和正文的结果
 */
export async function scrapeUrl(url: string): Promise<ScrapeResult> {
  try {
    // 验证 URL 格式
    const urlObj = new URL(url)

    // 发送请求获取 HTML
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'StackMemory/1.0 (Educational Tool)',
      },
      signal: AbortSignal.timeout(30000), // 30秒超时
    })

    if (!response.ok) {
      return {
        title: '',
        content: '',
        error: `HTTP ${response.status}: ${response.statusText}`,
      }
    }

    const html = await response.text()

    // 使用 JSDOM 解析 HTML
    const dom = new JSDOM(html, { url })
    const document = dom.window.document

    // 移除不需要的元素（广告、导航、脚本等）
    const removeSelectors = [
      'script',
      'style',
      'nav',
      'header',
      'footer',
      'aside',
      '.sidebar',
      '.advertisement',
      '.ad',
      '.ads',
      '.social-share',
      '.comments',
      '[role="banner"]',
      '[role="navigation"]',
      '[role="complementary"]',
    ]

    removeSelectors.forEach((selector) => {
      document.querySelectorAll(selector).forEach((el) => el.remove())
    })

    // 获取标题
    const title =
      document.querySelector('h1')?.textContent?.trim() ||
      document.querySelector('title')?.textContent?.trim() ||
      urlObj.hostname

    // 提取正文内容
    // 尝试找到主要文章内容区域
    const articleSelectors = [
      'article',
      '[role="main"]',
      '.post-content',
      '.article-content',
      '.entry-content',
      '.content',
      'main',
    ]

    let content = ''
    for (const selector of articleSelectors) {
      const element = document.querySelector(selector)
      if (element) {
        content = element.textContent?.trim() || ''
        break
      }
    }

    // 如果没有找到特定区域，尝试 body
    if (!content) {
      content = document.body.textContent?.trim() || ''
    }

    // 清理内容：移除多余空白行
    content = content
      .replace(/\n{3,}/g, '\n\n')
      .replace(/[ \t]{2,}/g, ' ')
      .trim()

    // 限制内容长度（最多 10000 字符，避免超出 API 限制）
    const maxLength = 10000
    if (content.length > maxLength) {
      content = content.substring(0, maxLength) + '...'
    }

    return { title, content }
  } catch (error) {
    return {
      title: '',
      content: '',
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}
