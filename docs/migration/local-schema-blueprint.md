# StackMemory 本地 PostgreSQL 建表蓝图

**Created**: 2026-02-23
**Project**: StackMemory
**Mode**: Local PostgreSQL (不依赖 Supabase Auth)

## 概述

本文档定义 StackMemory 应用的本地 PostgreSQL 数据库 Schema，基于现有代码数据模型与访问路径产出。

## 连接配置

```bash
# Docker Compose 方式
docker compose up -d postgres

# 直连
postgresql://stackuser:stackpass@localhost:5432/stackmemory
```

## 建表顺序与依赖图

```
┌─────────────────────────────────────────────────────────────┐
│  P0 核心表 (必须)                                           │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│   ┌─────────┐     ┌───────────┐     ┌──────────────────┐   │
│   │  tags   │────▶│ card_tags │◀────│    flashcards    │   │
│   └─────────┘     └───────────┘     └──────────────────┘   │
│       ▲                                         │          │
│       │                                         ▼          │
│       │                                    ┌──────────┐    │
│       └────────────────────────────────────│  routes  │    │
│                                            └──────────┘    │
│                                                             │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  P1 扩展表 (可选)                                           │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│   ┌──────────────┐                                         │
│   │ route_tasks  │────▶ routes (route_id FK)              │
│   └──────────────┘                                         │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## P0 核心表

### 1. tags (标签表)

用户定义的标签，用于闪卡分类。

| 字段 | 类型 | 约束 | 默认值 | 说明 |
|------|------|------|--------|------|
| id | UUID | PK | gen_random_uuid() | 标签ID |
| name | VARCHAR(255) | NOT NULL | - | 标签名称(小写) |
| color | VARCHAR(50) | - | '#3b82f6' | 标签颜色 |
| user_id | UUID | NOT NULL | - | 所属用户 |
| created_at | TIMESTAMPTZ | NOT NULL | NOW() | 创建时间 |

**约束**:
- UNIQUE (name, user_id)

**索引**:
- idx_tags_user_id ON (user_id)
- idx_tags_user_name ON (user_id, name)

---

### 2. flashcards (闪卡表)

核心闪卡存储。

| 字段 | 类型 | 约束 | 默认值 | 说明 |
|------|------|------|--------|------|
| id | UUID | PK | gen_random_uuid() | 闪卡ID |
| user_id | UUID | NOT NULL | - | 所属用户 |
| route_id | UUID | FK (routes) | NULL | 关联路线 |
| question | TEXT | NOT NULL | - | 问题/正面 |
| answer | TEXT | NOT NULL | - | 答案/背面 |
| code_snippet | TEXT | - | NULL | 代码片段 |
| source_url | TEXT | - | NULL | 来源URL |
| source_title | TEXT | - | NULL | 来源标题 |
| difficulty | VARCHAR(50) | - | NULL | 难度 |
| is_reviewed | BOOLEAN | - | FALSE | 是否已复习 |
| review_count | INTEGER | - | 0 | 复习次数 |
| last_reviewed_at | TIMESTAMPTZ | - | NULL | 上次复习时间 |
| created_at | TIMESTAMPTZ | NOT NULL | NOW() | 创建时间 |
| updated_at | TIMESTAMPTZ | NOT NULL | NOW() | 更新时间 |

**索引**:
- idx_flashcards_user_id ON (user_id)
- idx_flashcards_created_at ON (created_at DESC)
- idx_flashcards_user_created ON (user_id, created_at DESC)
- idx_flashcards_route_id ON (route_id)

---

### 3. card_tags (闪卡-标签关联表)

闪卡与标签的多对多关系。

| 字段 | 类型 | 约束 | 默认值 | 说明 |
|------|------|------|--------|------|
| id | UUID | PK | gen_random_uuid() | 关联ID |
| card_id | UUID | FK (flashcards) | - | 闪卡ID |
| tag_id | UUID | FK (tags) | - | 标签ID |
| created_at | TIMESTAMPTZ | NOT NULL | NOW() | 创建时间 |

**约束**:
- UNIQUE (card_id, tag_id)

**索引**:
- idx_card_tags_card_id ON (card_id)
- idx_card_tags_tag_id ON (tag_id)

---

### 4. routes (学习路线表)

用户创建的学习路线。

| 字段 | 类型 | 约束 | 默认值 | 说明 |
|------|------|------|--------|------|
| id | UUID | PK | gen_random_uuid() | 路线ID |
| user_id | UUID | NOT NULL | - | 所属用户 |
| topic | VARCHAR(500) | NOT NULL | - | 主题 |
| background | TEXT | - | NULL | 学习背景 |
| goals | TEXT | - | NULL | 学习目标 |
| weeks | INTEGER | - | 4 | 周期(周) |
| roadmap_data | JSONB | - | NULL | 路线数据 |
| is_current | BOOLEAN | - | FALSE | 是否当前路线 |
| created_at | TIMESTAMPTZ | NOT NULL | NOW() | 创建时间 |
| updated_at | TIMESTAMPTZ | NOT NULL | NOW() | 更新时间 |

**约束**:
- 每个用户只能有一个 is_current = TRUE

**索引**:
- idx_routes_user_id ON (user_id)
- idx_routes_updated_at ON (updated_at DESC)
- idx_routes_is_current ON (user_id, is_current) WHERE is_current = TRUE

---

## P1 扩展表

### 5. route_tasks (路线任务表)

路线下的学习任务追踪。

| 字段 | 类型 | 约束 | 默认值 | 说明 |
|------|------|------|--------|------|
| id | UUID | PK | gen_random_uuid() | 任务ID |
| route_id | UUID | FK (routes) | - | 关联路线 |
| user_id | UUID | NOT NULL | - | 所属用户 |
| task_id | VARCHAR(255) | NOT NULL | - | 任务标识 |
| title | TEXT | NOT NULL | - | 任务标题 |
| task_type | VARCHAR(50) | - | NULL | 任务类型 |
| status | VARCHAR(20) | - | 'pending' | 状态 |
| week | INTEGER | - | NULL | 所属周 |
| day | INTEGER | - | NULL | 所属日 |
| completed_at | TIMESTAMPTZ | - | NULL | 完成时间 |
| created_at | TIMESTAMPTZ | NOT NULL | NOW() | 创建时间 |
| updated_at | TIMESTAMPTZ | NOT NULL | NOW() | 更新时间 |

**约束**:
- UNIQUE (route_id, task_id)
- CHECK (status IN ('pending', 'in_progress', 'completed'))

**索引**:
- idx_route_tasks_route_id ON (route_id)
- idx_route_tasks_user_id ON (user_id)
- idx_route_tasks_status ON (status)

---

## 扩展依赖

### 必须扩展

```sql
-- 启用 UUID 生成扩展
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
```

---

## 建表 SQL 脚本

### 完整建表脚本 (可执行顺序)

```sql
-- 001_tags.sql
CREATE TABLE IF NOT EXISTS tags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    color VARCHAR(50) DEFAULT '#3b82f6',
    user_id UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(name, user_id)
);

CREATE INDEX IF NOT EXISTS idx_tags_user_id ON tags(user_id);
CREATE INDEX IF NOT EXISTS idx_tags_user_name ON tags(user_id, name);

-- 002_routes.sql
CREATE TABLE IF NOT EXISTS routes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    topic VARCHAR(500) NOT NULL,
    background TEXT,
    goals TEXT,
    weeks INTEGER DEFAULT 4,
    roadmap_data JSONB,
    is_current BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL NOW()
);

CREATE INDEX IF NOT EXISTS idx_routes_user_id ON routes(user_id);
CREATE INDEX IF NOT EXISTS idx_routes_updated_at ON routes(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_routes_is_current ON routes(user_id, is_current) WHERE is_current = TRUE;

-- 003_flashcards.sql
CREATE TABLE IF NOT EXISTS flashcards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    route_id UUID REFERENCES routes(id) ON DELETE SET NULL,
    question TEXT NOT NULL,
    answer TEXT NOT NULL,
    code_snippet TEXT,
    source_url TEXT,
    source_title TEXT,
    difficulty VARCHAR(50),
    is_reviewed BOOLEAN DEFAULT FALSE,
    review_count INTEGER DEFAULT 0,
    last_reviewed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_flashcards_user_id ON flashcards(user_id);
CREATE INDEX IF NOT EXISTS idx_flashcards_created_at ON flashcards(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_flashcards_user_created ON flashcards(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_flashcards_route_id ON flashcards(route_id);

-- 004_card_tags.sql
CREATE TABLE IF NOT EXISTS card_tags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    card_id UUID NOT NULL REFERENCES flashcards(id) ON DELETE CASCADE,
    tag_id UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(card_id, tag_id)
);

CREATE INDEX IF NOT EXISTS idx_card_tags_card_id ON card_tags(card_id);
CREATE INDEX IF NOT EXISTS idx_card_tags_tag_id ON card_tags(tag_id);

-- 005_route_tasks.sql (P1)
CREATE TABLE IF NOT EXISTS route_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    route_id UUID NOT NULL REFERENCES routes(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    task_id VARCHAR(255) NOT NULL,
    title TEXT NOT NULL,
    task_type VARCHAR(50),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed')),
    week INTEGER,
    day INTEGER,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(route_id, task_id)
);

CREATE INDEX IF NOT EXISTS idx_route_tasks_route_id ON route_tasks(route_id);
CREATE INDEX IF NOT EXISTS idx_route_tasks_user_id ON route_tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_route_tasks_status ON route_tasks(status);
```

---

## 代码模型映射

| 接口/类型 | 表 | 访问路径 |
|-----------|-----|----------|
| Tag | tags | LocalPgCardRepository.getTags, getOrCreateTags |
| Flashcard | flashcards | LocalPgCardRepository.getCards, getCardById, saveCards |
| CardWithTags | flashcards + card_tags | LocalPgCardRepository.getCards |
| Route | routes | LocalPgRouteRepository.getRoutes, createRoute, switchRoute |
| RouteTask | route_tasks | LocalPgRouteTaskRepository |

---

## 验证命令

```bash
# 连接数据库
psql postgresql://stackuser:stackpass@localhost:5432/stackmemory

# 检查表
\dt

# 检查索引
\di

# 检查外键
\d flashcards
\d card_tags
\d route_tasks

# 验证数据
SELECT COUNT(*) FROM flashcards;
SELECT COUNT(*) FROM routes;
SELECT COUNT(*) FROM tags;
```

---

## 阻塞点

无阻塞点。本蓝图基于现有代码接口定义，可直接作为 migration 输入。

---

## 下一步

1. 执行上述建表 SQL
2. 验证表结构和索引
3. 如需迁移历史数据，参考 `docs/migration-report.md`
