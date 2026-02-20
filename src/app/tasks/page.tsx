import { currentTasks } from '@/lib/learning-data'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

export default function TasksPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">今日任务</h1>
        <p className="text-muted-foreground mt-2">
          你每天只需要完成这 3 件事：学一个点、做一个实操、写一次复盘。
        </p>
      </div>

      <div className="grid gap-4">
        {currentTasks.map((task, idx) => (
          <Card key={task.id}>
            <CardHeader>
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <CardTitle>
                  {idx + 1}. {task.title}
                </CardTitle>
                <div className="flex gap-2">
                  <Badge variant="outline">{task.type}</Badge>
                  <Badge variant="secondary">{task.estimate}</Badge>
                  <Badge>{task.difficulty}</Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-sm text-muted-foreground">任务目标</p>
                <p>{task.objective}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">完成标准</p>
                <p>{task.doneCriteria}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
