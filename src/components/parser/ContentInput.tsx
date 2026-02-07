'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Label } from '@/components/ui/label'
import { Loader2, Link as LinkIcon, FileText } from 'lucide-react'
import { parseContent } from '@/app/actions/parse-content'
import { Flashcard } from '@/lib/deepseek'

interface ContentInputProps {
  onCardsGenerated: (cards: Flashcard[]) => void
}

export function ContentInput({ onCardsGenerated }: ContentInputProps) {
  const [url, setUrl] = useState('')
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleUrlSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!url.trim()) return

    setLoading(true)
    setError(null)

    try {
      const result = await parseContent({ url: url.trim() })
      if (result.success) {
        onCardsGenerated(result.cards)
      } else {
        setError(result.error || '解析失败')
      }
    } catch {
      setError('网络错误，请稍后重试')
    } finally {
      setLoading(false)
    }
  }

  const handleTextSubmit = async () => {
    if (!text.trim()) return

    setLoading(true)
    setError(null)

    try {
      const result = await parseContent({ text: text.trim() })
      if (result.success) {
        onCardsGenerated(result.cards)
      } else {
        setError(result.error || '解析失败')
      }
    } catch {
      setError('网络错误，请稍后重试')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>创建闪卡</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="url" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="url" className="flex items-center gap-2">
              <LinkIcon className="h-4 w-4" />
              URL 解析
            </TabsTrigger>
            <TabsTrigger value="text" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              粘贴文本
            </TabsTrigger>
          </TabsList>

          <TabsContent value="url" className="space-y-4">
            <form onSubmit={handleUrlSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="url">文章 URL</Label>
                <Input
                  id="url"
                  type="url"
                  placeholder="https://example.com/article"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  disabled={loading}
                />
              </div>
              <Button type="submit" disabled={loading || !url.trim()} className="w-full">
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    解析中...
                  </>
                ) : (
                  '解析文章'
                )}
              </Button>
            </form>
          </TabsContent>

          <TabsContent value="text" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="text">技术内容</Label>
              <Textarea
                id="text"
                placeholder="粘贴技术文章、文档或笔记内容..."
                value={text}
                onChange={(e) => setText(e.target.value)}
                disabled={loading}
                rows={10}
              />
            </div>
            <Button
              onClick={handleTextSubmit}
              disabled={loading || !text.trim()}
              className="w-full"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  生成中...
                </>
              ) : (
                '生成闪卡'
              )}
            </Button>
          </TabsContent>
        </Tabs>

        {error && (
          <div className="mt-4 p-3 text-sm text-red-500 bg-red-50 rounded-md">
            {error}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
