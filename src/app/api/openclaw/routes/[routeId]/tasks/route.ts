import { NextRequest, NextResponse } from 'next/server'
import { addTaskToRoute, OpenClawRouteTaskInput } from '@/lib/openclaw/roadmap-editor'
import { resolveOpenClawUser } from '@/lib/openclaw/auth'

interface Params {
  routeId: string
}

export async function POST(request: NextRequest, context: { params: Promise<Params> }) {
  try {
    const auth = await resolveOpenClawUser(request)
    if (!auth.userId) {
      return NextResponse.json({ success: false, error: auth.error || '未授权' }, { status: 401 })
    }

    const { routeId } = await context.params
    if (!routeId) {
      return NextResponse.json({ success: false, error: 'routeId 不能为空' }, { status: 400 })
    }

    const body = await request.json().catch(() => null)
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ success: false, error: '请求体必须是 JSON 对象' }, { status: 400 })
    }

    const updated = await addTaskToRoute(auth.userId, routeId, body as OpenClawRouteTaskInput)

    return NextResponse.json({
      success: true,
      message: '任务新增成功',
      data: updated,
      auth_via: auth.via,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : '任务新增失败'
    const status = message.includes('不存在') || message.includes('无权') ? 404 : 400
    console.error('openclaw add task failed:', error)
    return NextResponse.json({ success: false, error: message }, { status })
  }
}
