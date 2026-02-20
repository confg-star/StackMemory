import { learningPhases } from '@/lib/learning-data'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

export default function RoadmapPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">学习路线（Agent 开发）</h1>
        <p className="text-muted-foreground mt-2">
          这是为老板定制的 12 周路线：从 Java 基础出发，逐步到可独立开发 Agent 产品。
        </p>
      </div>

      <div className="grid gap-4">
        {learningPhases.map((phase) => (
          <Card key={phase.id}>
            <CardHeader>
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <CardTitle>{phase.title}</CardTitle>
                <Badge variant="secondary">{phase.weeks}</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground">阶段目标</p>
                <p className="mt-1">{phase.goal}</p>
              </div>

              <div>
                <p className="text-sm text-muted-foreground">学习重点</p>
                <ul className="mt-1 list-disc pl-5 space-y-1">
                  {phase.focus.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>

              <div>
                <p className="text-sm text-muted-foreground">阶段产出</p>
                <ul className="mt-1 list-disc pl-5 space-y-1">
                  {phase.deliverables.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
