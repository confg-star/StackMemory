'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('Global error caught:', error)
  }, [error])

  const isServerActionError =
    error.message.includes('Server Action') ||
    error.message.includes('deployment') ||
    error.message.includes('Failed to find Server Action') ||
    error.digest?.includes('Server Action')

  return (
    <html lang="zh-CN">
      <body className="min-h-screen flex items-center justify-center bg-muted/50 px-4">
        <div className="max-w-md w-full space-y-6 text-center">
          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-foreground">
              {isServerActionError ? '版本不匹配' : '出现错误'}
            </h2>
            <p className="text-muted-foreground">
              {isServerActionError
                ? '服务器已更新，请刷新页面获取最新版本后再试。'
                : '应用程序遇到了意外错误，请重试。'}
            </p>
            {isServerActionError && (
              <p className="text-sm text-yellow-600 bg-yellow-50 dark:bg-yellow-900/20 p-2 rounded">
                这可能是由于服务器部署更新导致的，请刷新页面。
              </p>
            )}
          </div>

          <div className="flex gap-4 justify-center">
            <Button onClick={reset} variant="default">
              重试
            </Button>
            <Button onClick={() => window.location.reload()} variant="outline">
              刷新页面
            </Button>
          </div>

          {process.env.NODE_ENV === 'development' && (
            <details className="text-left text-xs text-muted-foreground mt-4 p-2 border rounded">
              <summary>错误详情（仅开发环境可见）</summary>
              <pre className="mt-2 whitespace-pre-wrap break-all">
                {error.message}
                {error.stack && `\n\n${error.stack}`}
              </pre>
            </details>
          )}
        </div>
      </body>
    </html>
  )
}
