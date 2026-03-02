import { NextRequest, NextResponse } from 'next/server'
import { findUserByEmail, createUser } from '@/lib/auth/db-auth'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, password, name, action } = body

    if (!email || !password) {
      return NextResponse.json({ success: false, error: '邮箱和密码必填' }, { status: 400 })
    }

    const normalizedEmail = email.trim().toLowerCase()

    if (action === 'register') {
      if (password.length < 6) {
        return NextResponse.json({ success: false, error: '密码至少需要 6 个字符' }, { status: 400 })
      }

      const existingUser = await findUserByEmail(normalizedEmail)
      if (existingUser) {
        return NextResponse.json({ success: false, error: '该邮箱已被注册' }, { status: 409 })
      }

      const newUser = await createUser(normalizedEmail, password, name || '')

      return NextResponse.json({
        success: true,
        user: {
          id: newUser.id,
          email: newUser.email,
          name: newUser.username,
          createdAt: newUser.created_at.toISOString(),
        },
      })
    } else if (action === 'login') {
      const dbUser = await findUserByEmail(normalizedEmail)
      if (!dbUser) {
        return NextResponse.json({ success: false, error: '邮箱或密码错误' }, { status: 401 })
      }

      if (dbUser.password !== password) {
        return NextResponse.json({ success: false, error: '邮箱或密码错误' }, { status: 401 })
      }

      return NextResponse.json({
        success: true,
        user: {
          id: dbUser.id,
          email: dbUser.email,
          name: dbUser.username,
          createdAt: dbUser.created_at.toISOString(),
        },
      })
    }

    return NextResponse.json({ success: false, error: '无效的操作' }, { status: 400 })
  } catch (error) {
    console.error('Auth API error:', error)
    return NextResponse.json({ success: false, error: '服务器错误' }, { status: 500 })
  }
}
