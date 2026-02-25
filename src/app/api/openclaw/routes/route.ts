import { NextRequest, NextResponse } from 'next/server'
import { listOpenClawRoutes } from '@/lib/openclaw/roadmap-editor'
import { resolveOpenClawUser } from '@/lib/openclaw/auth'

export async function GET(request: NextRequest) {
  try {
    const auth = await resolveOpenClawUser(request)
    if (!auth.userId) {
      return NextResponse.json({ success: false, error: auth.error || '未授权' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const limit = Number.parseInt(searchParams.get('limit') || '20', 10)
    const offset = Number.parseInt(searchParams.get('offset') || '0', 10)
    const includeRoadmap = searchParams.get('includeRoadmap') === 'true'

    if (Number.isNaN(limit) || Number.isNaN(offset) || limit < 1 || limit > 100 || offset < 0) {
      return NextResponse.json({ success: false, error: '分页参数无效' }, { status: 400 })
    }

    const data = await listOpenClawRoutes(auth.userId, { limit, offset, includeRoadmap })

    return NextResponse.json({
      success: true,
      data: {
        routes: data.routes,
        total: data.total,
        limit,
        offset,
      },
      auth_via: auth.via,
    })
  } catch (error) {
    console.error('openclaw list routes failed:', error)
    return NextResponse.json({ success: false, error: '读取路线列表失败' }, { status: 500 })
  }
}
