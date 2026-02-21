import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Sparkles, Target, NotebookText, ArrowRight } from 'lucide-react'

const primaryActions = [
  {
    title: '一键生成今日任务',
    desc: '直接进入今日任务页，按“学习→实操→复盘”推进今天的主线。',
    href: '/tasks',
    cta: '立即生成任务',
    icon: Target,
  },
  {
    title: '学习复盘 / 错题沉淀',
    desc: '把今天的关键结论和错误沉淀到卡片库，形成长期可复用知识。',
    href: '/deck',
    cta: '去复盘沉淀',
    icon: NotebookText,
  },
]

export default function Home() {
  return (
    <div className="space-y-8">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold tracking-tight">
          栈记学习站 <span className="text-muted-foreground">StackMemory Learning</span>
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          主线只做两件高价值动作：今日任务执行 + 学习复盘沉淀
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {primaryActions.map((action) => {
          const Icon = action.icon
          return (
            <Card key={action.title} className="border-border/70 shadow-sm">
              <CardHeader className="space-y-2">
                <div className="flex items-center gap-2">
                  <Icon className="h-5 w-5 text-primary" />
                  <CardTitle className="text-lg">{action.title}</CardTitle>
                </div>
                <p className="text-sm text-muted-foreground">{action.desc}</p>
              </CardHeader>
              <CardContent>
                <Button asChild className="w-full">
                  <Link href={action.href}>
                    {action.cta}
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <div className="text-center">
        <Link
          href="/create"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors"
        >
          <Sparkles className="h-4 w-4" />
          手动建卡（次要功能）
        </Link>
      </div>
    </div>
  )
}
