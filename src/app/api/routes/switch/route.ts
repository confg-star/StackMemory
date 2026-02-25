import { NextRequest, NextResponse } from 'next/server'
import { LocalPgRouteRepository } from '@/lib/data-provider/local-pg-repository'
import { resolveServerUserId } from '@/lib/server-user'

const routeRepository = new LocalPgRouteRepository()

export async function PUT(request: NextRequest) {
  try {
    const { userId, error: authError } = await resolveServerUserId()
    if (!userId) {
      return NextResponse.json({ success: false, error: authError || '请先登录' }, { status: 401 })
    }

    const body = await request.json()
    const { route_id } = body

    if (!route_id || typeof route_id !== 'string') {
      return NextResponse.json(
        { success: false, error: '请提供路线ID (route_id)' },
        { status: 400 }
      )
    }

    const switchResult = await routeRepository.switchRoute(userId, route_id)

    if (!switchResult.success) {
      const status = switchResult.error?.includes('不存在') ? 404 : 500
      return NextResponse.json(
        { success: false, error: switchResult.error || '切换路线失败' },
        { status }
      )
    }

    const currentRoute = await routeRepository.getRouteById(userId, route_id)

    return NextResponse.json({
      success: true,
      message: '路线切换成功',
      data: currentRoute,
    })
  } catch (error) {
    console.error('切换路线失败:', error)
    return NextResponse.json(
      { success: false, error: '切换路线失败' },
      { status: 500 }
    )
  }
}
