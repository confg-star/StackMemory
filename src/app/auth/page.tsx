'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Loader2, Github, Mail } from 'lucide-react'
import { signIn, signUp, signInWithGithub } from '@/app/actions/auth'
import { useToast } from '@/components/ui/use-toast'

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const { toast } = useToast()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      let result
      if (isLogin) {
        result = await signIn(email, password)
      } else {
        result = await signUp(email, password)
      }

      if (result.success) {
        if (isLogin) {
          toast({
            title: '登录成功',
            description: '欢迎回来！',
          })
          router.push('/deck')
          router.refresh()
        } else {
          toast({
            title: '注册成功',
            description: '请检查邮箱验证链接（如果已启用），然后登录。',
          })
          // 切换到登录模式
          setIsLogin(true)
        }
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

  const handleGithubSignIn = async () => {
    setLoading(true)
    const result = await signInWithGithub()
    if (result.success && result.url) {
      // 重定向到 GitHub 授权页面
      window.location.href = result.url
    } else if (result.error) {
      toast({
        title: '错误',
        description: result.error || 'GitHub 登录失败',
        variant: 'destructive',
      })
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
            {isLogin ? '登录你的账户' : '注册后开始使用栈记'}
          </CardDescription>
        </CardHeader>

        <CardContent>
          {/* GitHub 登录 */}
          <Button
            variant="outline"
            className="w-full mb-4"
            onClick={handleGithubSignIn}
            disabled={loading}
          >
            <Github className="mr-2 h-4 w-4" />
            GitHub 登录
          </Button>

          <div className="relative my-4">
            <Separator />
            <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-card px-2 text-xs text-muted-foreground">
              或
            </span>
          </div>

          {/* 邮箱登录表单 */}
          <form onSubmit={handleSubmit} className="space-y-4">
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
                '登录'
              ) : (
                '注册'
              )}
            </Button>
          </form>
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
