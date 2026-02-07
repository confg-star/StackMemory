'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export interface AuthResult {
  success: boolean
  error?: string
}

/**
 * 邮箱密码登录
 */
export async function signIn(email: string, password: string): Promise<AuthResult> {
  try {
    const supabase = await createClient()

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (error) {
    return { success: false, error: '登录失败，请稍后重试' }
  }
}

/**
 * 邮箱密码注册
 */
export async function signUp(email: string, password: string): Promise<AuthResult> {
  try {
    const supabase = await createClient()

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback`,
      },
    })

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (error) {
    return { success: false, error: '注册失败，请稍后重试' }
  }
}

/**
 * GitHub 社交登录
 */
export async function signInWithGithub(): Promise<AuthResult & { url?: string }> {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'github',
      options: {
        redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback`,
      },
    })

    if (error) {
      return { success: false, error: error.message }
    }

    // 返回授权 URL
    if (data.url) {
      return { success: true, url: data.url }
    }

    return { success: false, error: '无法启动 GitHub 登录' }
  } catch (error) {
    return { success: false, error: 'GitHub 登录失败，请稍后重试' }
  }
}

/**
 * 退出登录
 */
export async function signOut(): Promise<AuthResult> {
  try {
    const supabase = await createClient()
    await supabase.auth.signOut()
    revalidatePath('/', 'layout')
    return { success: true }
  } catch (error) {
    return { success: false, error: '退出失败' }
  }
}

/**
 * 获取当前用户
 */
export async function getUser() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    return user
  } catch {
    return null
  }
}
