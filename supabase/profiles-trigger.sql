-- 1. 删除旧的 trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS handle_new_user ON auth.users;

-- 2. 删除旧的函数
DROP FUNCTION IF EXISTS public.handle_new_user();

-- 3. 创建 profiles 表
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    email TEXT,
    username TEXT,
    avatar_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. 清理旧的 policy
DROP POLICY IF EXISTS "用户只能操作自己的 profile" ON public.profiles;

-- 5. 启用 RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 6. 创建 policy
CREATE POLICY "用户只能操作自己的 profile" ON public.profiles
    FOR ALL USING (auth.uid() = id);

-- 7. 验证
SELECT '创建完成' AS status;
