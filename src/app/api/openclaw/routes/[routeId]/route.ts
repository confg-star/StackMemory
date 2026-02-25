import { NextRequest, NextResponse } from 'next/server'
import { getOpenClawRoute, OpenClawRoutePatch, patchOpenClawRoute } from '@/lib/openclaw/roadmap-editor'
import { resolveOpenClawUser } from '@/lib/openclaw/auth'

interface Params {
  routeId: string
}

export async function GET(request: NextRequest, context: { params: Promise<Params> }) {
  try {
    const auth = await resolveOpenClawUser(request)
    if (!auth.userId) {
      return NextResponse.json({ success: false, error: auth.error || '未授权' }, { status: 401 })
    }

    const { routeId } = await context.params
    if (!routeId) {
      return NextResponse.json({ success: false, error: 'routeId 不能为空' }, { status: 400 })
    }

    const route = await getOpenClawRoute(auth.userId, routeId)
    if (!route) {
      return NextResponse.json({ success: false, error: '路线不存在' }, { status: 404 })
    }

    return NextResponse.json({ success: true, data: route, auth_via: auth.via })
  } catch (error) {
    console.error('openclaw get route failed:', error)
    return NextResponse.json({ success: false, error: '读取路线失败' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest, context: { params: Promise<Params> }) {
  try {
    const auth = await resolveOpenClawUser(request)
    if (!auth.userId) {
      return NextResponse.json({ success: false, error: auth.error || '未授权' }, { status: 401 })
    }

    const { routeId } = await context.params
    if (!routeId) {
      return NextResponse.json({ success: false, error: 'routeId 不能为空' }, { status: 400 })
    }

    const patch = await request.json().catch(() => null)
    if (!patch || typeof patch !== 'object') {
      return NextResponse.json({ success: false, error: '请求体必须是 JSON 对象' }, { status: 400 })
    }

    const updated = await patchOpenClawRoute(auth.userId, routeId, patch as OpenClawRoutePatch)

    return NextResponse.json({
      success: true,
      message: '路线更新成功',
      data: updated,
      auth_via: auth.via,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : '更新路线失败'
    const status = message.includes('不存在') || message.includes('无权') ? 404 : 400
    console.error('openclaw patch route failed:', error)
    return NextResponse.json({ success: false, error: message }, { status })
  }
}
