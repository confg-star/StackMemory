import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

/**
 * OAuth 和邮箱验证回调页面
 * 处理 GitHub 登录回调和邮箱验证回调
 */
export default async function AuthCallbackPage({
  searchParams,
}: {
  searchParams: Promise<{ code?: string; error?: string; error_description?: string; type?: string }>
}) {
  const supabase = await createClient()
  const params = await searchParams
  console.log('Auth callback params:', params)

  // 处理错误
  if (params.error) {
    console.error('Auth error:', params.error, params.error_description)
    redirect(`/auth?error=${encodeURIComponent(params.error_description || params.error)}`)
  }

  // 处理 OAuth 回调 code
  if (params.code) {
    console.log('Exchanging code for session...')
    const { data, error } = await supabase.auth.exchangeCodeForSession(params.code)

    if (error) {
      console.error('Session exchange error:', error)
      redirect(`/auth?error=${encodeURIComponent(error.message)}`)
    }

    // 获取用户信息
    if (data.user) {
      console.log('User logged in:', data.user.id)
      console.log('User email:', data.user.email)
      console.log('User metadata:', data.user.user_metadata)

      // 手动创建 profile
      try {
        const { error: profileError } = await supabase
          .from('profiles')
          .upsert({
            id: data.user.id,
            email: data.user.email,
            username: data.user.user_metadata?.full_name || data.user.email,
            avatar_url: data.user.user_metadata?.avatar_url,
          }, {
            onConflict: 'id',
          })

        if (profileError) {
          console.error('Profile creation error:', profileError)
        } else {
          console.log('Profile created/updated successfully')
        }
      } catch (e) {
        console.error('Profile creation exception:', e)
      }
    }
  }

  // 成功后跳转到卡片页面
  redirect('/deck')
}
