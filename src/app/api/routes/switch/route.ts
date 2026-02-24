import { NextRequest, NextResponse } from 'next/server'
import { LocalPgRouteRepository } from '@/lib/data-provider/local-pg-repository'

const routeRepository = new LocalPgRouteRepository()

const DEMO_USER_ID = '00000000-0000-0000-0000-000000000001'

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { route_id } = body

    if (!route_id || typeof route_id !== 'string') {
      return NextResponse.json(
        { success: false, error: '请提供路线ID (route_id)' },
        { status: 400 }
      )
    }

    const switchResult = await routeRepository.switchRoute(DEMO_USER_ID, route_id)

    if (!switchResult.success) {
      const status = switchResult.error?.includes('不存在') ? 404 : 500
      return NextResponse.json(
        { success: false, error: switchResult.error || '切换路线失败' },
        { status }
      )
    }

    const currentRoute = await routeRepository.getRouteById(DEMO_USER_ID, route_id)

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
