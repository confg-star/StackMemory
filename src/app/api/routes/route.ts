import { NextRequest, NextResponse } from 'next/server'
import { LocalPgRouteRepository } from '@/lib/data-provider/local-pg-repository'
import { resolveServerUserId } from '@/lib/server-user'

const routeRepository = new LocalPgRouteRepository()

export async function GET(request: NextRequest) {
  try {
    const { userId, error: authError } = await resolveServerUserId()
    if (!userId) {
      return NextResponse.json({ success: false, error: authError || '请先登录' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '20')
    const offset = parseInt(searchParams.get('offset') || '0')

    if (isNaN(limit) || isNaN(offset) || limit < 1 || limit > 100 || offset < 0) {
      return NextResponse.json(
        { success: false, error: '无效的分页参数' },
        { status: 400 }
      )
    }

    const result = await routeRepository.getRoutes(userId, { limit, offset })

    return NextResponse.json({
      success: true,
      data: {
        routes: result.routes,
        total: result.total,
        limit,
        offset,
      },
    })
  } catch (error) {
    console.error('获取路线列表失败:', error)
    return NextResponse.json(
      { success: false, error: '获取路线列表失败' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId, error: authError } = await resolveServerUserId()
    if (!userId) {
      return NextResponse.json({ success: false, error: authError || '请先登录' }, { status: 401 })
    }

    const body = await request.json()
    const { topic, background, goals, weeks, roadmap_data } = body

    if (!topic || typeof topic !== 'string' || topic.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: '请提供主题参数 (topic)' },
        { status: 400 }
      )
    }

    if (topic.length > 500) {
      return NextResponse.json(
        { success: false, error: '主题长度不能超过 500 字符' },
        { status: 400 }
      )
    }

    if (weeks !== undefined && (typeof weeks !== 'number' || weeks < 1 || weeks > 52)) {
      return NextResponse.json(
        { success: false, error: 'weeks 必须是 1-52 之间的数字' },
        { status: 400 }
      )
    }

    const result = await routeRepository.createRoute(userId, {
      topic: topic.trim(),
      background,
      goals,
      weeks,
      roadmapData: roadmap_data,
    })

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error || '创建路线失败' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: '路线创建成功',
      data: result.route,
    })
  } catch (error) {
    console.error('创建路线失败:', error)
    return NextResponse.json(
      { success: false, error: '创建路线失败' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { userId, error: authError } = await resolveServerUserId()
    if (!userId) {
      return NextResponse.json({ success: false, error: authError || '请先登录' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    let routeId = searchParams.get('routeId')?.trim()

    if (!routeId) {
      const body = await request.json().catch(() => ({})) as { route_id?: string }
      routeId = body.route_id?.trim()
    }

    if (!routeId) {
      return NextResponse.json(
        { success: false, error: '请提供路线 ID (routeId 或 route_id)' },
        { status: 400 }
      )
    }

    const result = await routeRepository.deleteRoute(userId, routeId)

    if (!result.success) {
      const statusCode = result.error?.includes('不存在') ? 404 : 500
      return NextResponse.json(
        { success: false, error: result.error || '删除路线失败' },
        { status: statusCode }
      )
    }

    return NextResponse.json({
      success: true,
      message: '路线删除成功',
      data: {
        deleted_route_id: routeId,
        next_current_route_id: result.nextCurrentRouteId ?? null,
      },
    })
  } catch (error) {
    console.error('删除路线失败:', error)
    return NextResponse.json(
      { success: false, error: '删除路线失败' },
      { status: 500 }
    )
  }
}
