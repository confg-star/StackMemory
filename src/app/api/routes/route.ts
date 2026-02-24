import { NextRequest, NextResponse } from 'next/server'
import { LocalPgRouteRepository } from '@/lib/data-provider/local-pg-repository'

const routeRepository = new LocalPgRouteRepository()

const DEMO_USER_ID = '00000000-0000-0000-0000-000000000001'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '20')
    const offset = parseInt(searchParams.get('offset') || '0')

    if (isNaN(limit) || isNaN(offset) || limit < 1 || limit > 100 || offset < 0) {
      return NextResponse.json(
        { success: false, error: '无效的分页参数' },
        { status: 400 }
      )
    }

    const result = await routeRepository.getRoutes(DEMO_USER_ID, { limit, offset })

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

    const result = await routeRepository.createRoute(DEMO_USER_ID, {
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
