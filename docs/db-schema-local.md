# StackMemory Database Schema (Local)

## Overview

本地 PostgreSQL 业务 Schema 定义，包含核心业务表、约束和索引。

## Connection

```bash
postgresql://stackuser:stackpass@localhost:5432/stackmemory
```

## Tables

### 1. profiles

用户配置表，存储用户信息和设置。

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK, FK(auth.users) | 用户ID |
| username | VARCHAR(255) | UNIQUE | 用户名 |
| avatar_url | TEXT | nullable | 头像URL |
| settings | JSONB | DEFAULT '{}' | 用户设置 |
| created_at | TIMESTAMPTZ | NOT NULL | 创建时间 |
| updated_at | TIMESTAMPTZ | NOT NULL | 更新时间 |

**Indexes:**
- `idx_profiles_username` ON `username`

### 2. flashcards

核心闪卡表。

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK, DEFAULT gen_random_uuid() | 闪卡ID |
| user_id | UUID | FK(profiles), NOT NULL | 所属用户 |
| front | TEXT | NOT NULL | 正面内容 |
| back | TEXT | NOT NULL | 背面内容 |
| source_url | TEXT | nullable | 来源URL |
| review_count | INT | DEFAULT 0 | 复习次数 |
| next_review_at | TIMESTAMPTZ | nullable | 下次复习时间 |
| created_at | TIMESTAMPTZ | NOT NULL | 创建时间 |
| updated_at | TIMESTAMPTZ | NOT NULL | 更新时间 |

**Indexes:**
- `idx_flashcards_user_created` ON `(user_id, created_at DESC)`
- `idx_flashcards_next_review` ON `(user_id, next_review_at)` WHERE `next_review_at IS NOT NULL`

### 3. tags

用户定义的标签表。

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK, DEFAULT gen_random_uuid() | 标签ID |
| user_id | UUID | FK(profiles), NOT NULL | 所属用户 |
| name | VARCHAR(255) | NOT NULL | 标签名 |
| created_at | TIMESTAMPTZ | NOT NULL | 创建时间 |

**Constraints:**
- UNIQUE `(user_id, name)`

**Indexes:**
- `idx_tags_user_name` ON `(user_id, name)`

### 4. card_tags

闪卡与标签的多对多关联表。

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| card_id | UUID | FK(flashcards), NOT NULL | 闪卡ID |
| tag_id | UUID | FK(tags), NOT NULL | 标签ID |
| created_at | TIMESTAMPTZ | NOT NULL | 创建时间 |

**Constraints:**
- PRIMARY KEY `(card_id, tag_id)`

**Indexes:**
- `idx_card_tags_tag_id` ON `(tag_id)`

## Usage

### 初始化数据库

```bash
# 启动 PostgreSQL
docker compose up -d postgres

# 执行迁移
psql postgresql://stackuser:stackpass@localhost:5432/stackmemory -f db/migrations/001_init.sql
```

### 验证

```bash
# 检查表
psql postgresql://stackuser:stackpass@localhost:5432/stackmemory -c "\dt"

# 检查索引
psql postgresql://stackuser:stackpass@localhost:5432/stackmemory -c "\di"
```

## Idempotent

迁移脚本使用 `IF NOT EXISTS` 和 `DO $$` 块确保可重复执行。

## Files

- `db/schema.sql` - 主 schema 定义
- `db/migrations/001_init.sql` - 初始迁移文件（幂等）
