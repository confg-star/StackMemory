import { NextRequest } from 'next/server'
import { resolveServerUserId } from '@/lib/server-user'

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
}

export interface OpenClawAuthResult {
  userId: string | null
  error?: string
  via: 'api_key' | 'session'
}

export async function resolveOpenClawUser(request: NextRequest): Promise<OpenClawAuthResult> {
  const configuredApiKey = process.env.OPENCLAW_API_KEY?.trim()
  const apiKey = request.headers.get('x-openclaw-key')?.trim()

  if (configuredApiKey && apiKey) {
    if (apiKey !== configuredApiKey) {
      return { userId: null, error: 'OpenClaw API Key 无效', via: 'api_key' }
    }

    const headerUserId = request.headers.get('x-stackmemory-user-id')?.trim()
    if (!headerUserId || !isUuid(headerUserId)) {
      return {
        userId: null,
        error: '请在 x-stackmemory-user-id 中提供合法 UUID',
        via: 'api_key',
      }
    }

    return { userId: headerUserId, via: 'api_key' }
  }

  const session = await resolveServerUserId()
  if (!session.userId) {
    return { userId: null, error: session.error || '请先登录', via: 'session' }
  }

  return { userId: session.userId, via: 'session' }
}
