import { NextRequest, NextResponse } from 'next/server'
import { deleteTaskFromRoute, OpenClawRouteTaskPatch, updateTaskInRoute } from '@/lib/openclaw/roadmap-editor'
import { resolveOpenClawUser } from '@/lib/openclaw/auth'

interface Params {
  routeId: string
  taskId: string
}

export async function PATCH(request: NextRequest, context: { params: Promise<Params> }) {
  try {
    const auth = await resolveOpenClawUser(request)
    if (!auth.userId) {
      return NextResponse.json({ success: false, error: auth.error || '未授权' }, { status: 401 })
    }

    const { routeId, taskId } = await context.params
    if (!routeId || !taskId) {
      return NextResponse.json({ success: false, error: 'routeId/taskId 不能为空' }, { status: 400 })
    }

    const body = await request.json().catch(() => null)
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ success: false, error: '请求体必须是 JSON 对象' }, { status: 400 })
    }

    const updated = await updateTaskInRoute(auth.userId, routeId, taskId, body as OpenClawRouteTaskPatch)

    return NextResponse.json({
      success: true,
      message: '任务更新成功',
      data: updated,
      auth_via: auth.via,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : '任务更新失败'
    const status = message.includes('不存在') || message.includes('无权') ? 404 : 400
    console.error('openclaw patch task failed:', error)
    return NextResponse.json({ success: false, error: message }, { status })
  }
}

export async function DELETE(request: NextRequest, context: { params: Promise<Params> }) {
  try {
    const auth = await resolveOpenClawUser(request)
    if (!auth.userId) {
      return NextResponse.json({ success: false, error: auth.error || '未授权' }, { status: 401 })
    }

    const { routeId, taskId } = await context.params
    if (!routeId || !taskId) {
      return NextResponse.json({ success: false, error: 'routeId/taskId 不能为空' }, { status: 400 })
    }

    const updated = await deleteTaskFromRoute(auth.userId, routeId, taskId)

    return NextResponse.json({
      success: true,
      message: '任务删除成功',
      data: updated,
      auth_via: auth.via,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : '任务删除失败'
    const status = message.includes('不存在') || message.includes('无权') ? 404 : 400
    console.error('openclaw delete task failed:', error)
    return NextResponse.json({ success: false, error: message }, { status })
  }
}
