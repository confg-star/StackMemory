'use client'

import { Suspense, useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Loader2, Mail } from 'lucide-react'
import { useLocalAuth } from '@/lib/auth/auth-context'
import { useToast } from '@/components/ui/use-toast'

export default function AuthPage() {
  return (
    <Suspense fallback={<AuthPageFallback />}>
      <AuthPageContent />
    </Suspense>
  )
}

function AuthPageFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/50 px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">加载中</CardTitle>
          <CardDescription>正在准备登录页面...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-6 text-muted-foreground">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            处理中...
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function AuthPageContent() {
  const [isLogin, setIsLogin] = useState(true)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()
  const { user, signIn: localSignIn, signUp: localSignUp, loading: authLoading } = useLocalAuth()

  useEffect(() => {
    if (user && !authLoading) {
      router.replace('/')
    }
  }, [user, authLoading, router])

  useEffect(() => {
    const authError = searchParams.get('error')
    if (!authError) return

    toast({
      title: '登录失败',
      description: authError,
      variant: 'destructive',
    })
  }, [searchParams, toast])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const normalizedEmail = email.trim().toLowerCase()
    if (!normalizedEmail) {
      toast({ title: '错误', description: '请输入邮箱', variant: 'destructive' })
      return
    }

    if (password.trim().length < 6) {
      toast({ title: '错误', description: '密码至少 6 位', variant: 'destructive' })
      return
    }

    if (!isLogin && !name.trim()) {
      toast({ title: '错误', description: '注册时请填写昵称', variant: 'destructive' })
      return
    }

    setLoading(true)

    try {
      let result
      if (isLogin) {
        result = await localSignIn(normalizedEmail, password)
      } else {
        result = await localSignUp(normalizedEmail, password, name.trim())
      }

      if (result.success) {
        await fetch('/api/auth/local/post-login', { method: 'POST' }).catch(() => null)

        toast({
          title: isLogin ? '登录成功' : '注册成功',
          description: isLogin ? '欢迎回来！' : '账户已创建，欢迎使用栈记！',
        })
        router.replace('/')
        window.setTimeout(() => {
          if (typeof window !== 'undefined' && window.location.pathname === '/auth') {
            window.location.assign('/')
          }
        }, 350)
        router.refresh()
      } else {
        toast({
          title: '错误',
          description: result.error || '操作失败',
          variant: 'destructive',
        })
      }
    } catch {
      toast({
        title: '错误',
        description: '网络错误，请稍后重试',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/50 px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">
            {isLogin ? '欢迎回来' : '创建账户'}
          </CardTitle>
          <CardDescription>
            {isLogin ? '使用邮箱登录你的账户' : '使用邮箱注册后开始使用栈记'}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="flex items-center gap-2 rounded-md border bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
            <Mail className="h-4 w-4" />
            当前仅开放邮箱登录，已关闭 GitHub 等第三方登录。
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <div className="space-y-2">
                <Label htmlFor="name">昵称</Label>
                <Input
                  id="name"
                  type="text"
                  placeholder="你的昵称"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={loading}
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">邮箱</Label>
              <Input
                id="email"
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">密码</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
                minLength={6}
              />
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  处理中...
                </>
              ) : isLogin ? (
                '邮箱登录'
              ) : (
                '邮箱注册'
              )}
            </Button>
          </form>

          {!isLogin && (
            <p className="text-xs text-muted-foreground text-center">
              本地账户数据保存在浏览器本地存储中
            </p>
          )}
        </CardContent>

        <CardFooter className="flex flex-col gap-2">
          <p className="text-sm text-muted-foreground">
            {isLogin ? '还没有账户？' : '已有账户？'}
            <button
              type="button"
              onClick={() => setIsLogin(!isLogin)}
              className="ml-1 text-primary hover:underline"
            >
              {isLogin ? '立即注册' : '立即登录'}
            </button>
          </p>
        </CardFooter>
      </Card>
    </div>
  )
}
