# 本地权限基线 (Local Permission Baseline)

**项目**: StackMemory  
**创建日期**: 2026-02-23  
**迁移文件**: `db/migrations/004_local_permission_baseline.sql`  
**状态**: ✅ 已实施

## 概述

本文档描述了从 Supabase RLS 迁移到本地 PostgreSQL RLS 的权限基线实现。由于不再使用 Supabase 的 `auth.uid()` 函数，需要实现本地会话上下文机制来替代 Supabase 的身份验证语义。

## 架构设计

### 1. 核心组件

| 组件 | 说明 |
|------|------|
| `current_user_id()` | 获取当前会话用户 ID，替代 `auth.uid()` |
| `set_current_user(UUID)` | 在认证后设置会话用户上下文 |
| `clear_current_user()` | 登出时清除会话上下文 |
| `is_authenticated()` | 检查当前会话是否已认证 |
| `authorize_owner(UUID)` | 验证当前用户是否为资源所有者 |

### 2. 应用角色

| 角色 | 用途 |
|------|------|
| `app_user` | 常规应用用户，具有读写权限 |
| `app_readonly` | 只读访问权限（用于报表等） |
| `app_service` | 服务账户，用于后台任务 |

### 3. RLS 策略

所有核心表均启用 RLS，策略如下：

#### profiles 表
- SELECT: 用户只能查看自己的 profile (`id = current_user_id()`)
- INSERT: 用户只能创建自己的 profile
- UPDATE: 用户只能修改自己的 profile
- DELETE: 用户只能删除自己的 profile

#### flashcards 表
- SELECT/INSERT/UPDATE/DELETE: 仅当 `user_id = current_user_id()`

#### tags 表
- SELECT/INSERT/UPDATE/DELETE: 仅当 `user_id = current_user_id()`

#### card_tags 表
- 策略: 用户必须拥有关联的 flashcard 或 tag
- 允许条件: `EXISTS (SELECT 1 FROM flashcards WHERE id = card_id AND user_id = current_user_id()) OR EXISTS (SELECT 1 FROM tags WHERE id = tag_id AND user_id = current_user_id())`

#### routes 表
- SELECT/INSERT/UPDATE/DELETE: 仅当 `user_id = current_user_id()`

#### route_tasks 表
- SELECT/INSERT/UPDATE/DELETE: 仅当 `user_id = current_user_id()`

## 使用方式

### 在应用代码中设置用户上下文

在用户登录后，需要调用 `set_current_user()` 函数设置会话上下文：

```sql
-- 登录后设置用户上下文
SELECT set_current_user('用户的UUID');
```

### 在应用层集成

Next.js API 路由示例：

```typescript
// src/lib/auth.ts
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function setSessionContext(userId: string) {
  // 在本地 PostgreSQL 中设置会话上下文
  // 需要通过 RPC 或直接 SQL 执行
  const { error } = await supabase.rpc('set_current_user', { 
    p_user_id: userId 
  })
  
  if (error) throw error
}

export async function clearSessionContext() {
  const { error } = await supabase.rpc('clear_current_user')
  if (error) throw error
}
```

### 验证权限

```sql
-- 查看当前会话上下文
SELECT * FROM v_session_context;

-- 测试: 以某用户身份查询
SET ROLE test_app_user;
SET app.current_user_id = '用户UUID';
SELECT * FROM flashcards;  -- 只返回该用户的卡片
```

## 测试结果

### 权限验证测试

| 测试场景 | 预期结果 | 实际结果 |
|----------|----------|----------|
| test_user 查看自己的 profile | 1 条记录 | ✅ 通过 |
| test_user 查看 demo_user 的 profile | 0 条记录 | ✅ 通过 |
| test_user 插入属于 demo_user 的 flashcard | 被拒绝 | ✅ 通过 |
| test_user 更新 demo_user 的 flashcard | 0 行受影响 | ✅ 通过 |
| test_user 删除 demo_user 的 flashcard | 0 行受影响 | ✅ 通过 |
| demo_user 查看自己的 flashcards | 7 条记录 | ✅ 通过 |

### 关键证据

```
# 越权访问测试 (作为 test_app_user, 会话设置为 test_user)
SELECT 'Can test_user see demo_user flashcards?' AS test, 
       (SELECT COUNT(*) FROM flashcards WHERE user_id = 'demo_user_id') AS demo_user_cards;

结果: 0 (正确 - 无法看到其他用户数据)

# 正常访问测试 (作为 test_app_user, 会话设置为 demo_user)
SELECT COUNT(*) FROM flashcards;
结果: 7 (正确 - 只能看到自己的数据)
```

## 维护手册

### 添加新表

1. 启用 RLS: `ALTER TABLE your_table ENABLE ROW LEVEL SECURITY;`
2. 创建策略:

```sql
CREATE POLICY "Users can view own your_table" ON your_table
FOR SELECT USING (user_id = current_user_id());

CREATE POLICY "Users can insert own your_table" ON your_table
FOR INSERT WITH CHECK (user_id = current_user_id());

CREATE POLICY "Users can update own your_table" ON your_table
FOR UPDATE USING (user_id = current_user_id());

CREATE POLICY "Users can delete own your_table" ON your_table
FOR DELETE USING (user_id = current_user_id());
```

### 调试权限问题

1. 检查当前会话: `SELECT * FROM v_session_context;`
2. 检查策略: `SELECT * FROM pg_policies WHERE tablename = 'your_table';`
3. 临时禁用 RLS: `ALTER TABLE your_table DISABLE ROW LEVEL SECURITY;`
4. 重新启用: `ALTER TABLE your_table ENABLE ROW LEVEL SECURITY;`

### 故障排除

| 问题 | 解决方案 |
|------|----------|
| 用户看不到自己的数据 | 确认已调用 `set_current_user()` |
| RLS 不生效 | 检查是否以表所有者身份运行（所有者默认绕过 RLS） |
| 策略冲突 | 检查是否有多个冲突的策略 |

## 后续步骤

1. 在应用层集成会话上下文设置
2. 添加审计日志功能
3. 考虑添加角色权限（admin vs user）
4. 定期审查权限策略

## 回滚计划

如需回滚，执行：

```sql
-- 禁用所有表的 RLS
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE flashcards DISABLE ROW LEVEL SECURITY;
ALTER TABLE tags DISABLE ROW LEVEL SECURITY;
ALTER TABLE card_tags DISABLE ROW LEVEL SECURITY;
ALTER TABLE routes DISABLE ROW LEVEL SECURITY;
ALTER TABLE route_tasks DISABLE ROW LEVEL SECURITY;

-- 删除策略
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
-- ... 其他策略类似

-- 删除函数
DROP FUNCTION IF EXISTS current_user_id();
DROP FUNCTION IF EXISTS set_current_user(UUID);
DROP FUNCTION IF EXISTS clear_current_user();
DROP FUNCTION IF EXISTS is_authenticated();
DROP FUNCTION IF EXISTS authorize_owner(UUID);
```
