# StackMemory 本地数据库（完全脱离 Supabase）配置指南

## 目标

将项目切换为 `local_pg` 数据提供者，使用本机 PostgreSQL（或 Docker PostgreSQL）运行，支持一键初始化数据库结构。

## 1. 环境变量

复制示例文件：

```bash
cp .env.local.example .env.local
```

关键变量：

- `DATA_PROVIDER=local_pg`
- `LOCAL_PG_HOST/PORT/DB/USER/PASSWORD`
- `LOCAL_DEMO_USER_ID`（默认 `00000000-0000-0000-0000-000000000002`）

## 2. 启动本地数据库（推荐 Docker）

```bash
docker compose up -d postgres
```

说明：`docker-compose.yml` 已挂载 `db/local-one-click-init.sql` 到容器初始化目录。首次创建数据卷时会自动执行。

## 3. 手动一键初始化 SQL

如果数据库已存在或想重复执行初始化，运行：

```bash
bash scripts/db-init-local.sh
```

该脚本会自动检测：

- 若容器 `stackmemory-postgres` 运行中，则在容器内执行 SQL
- 否则调用本机 `psql` 执行 SQL

## 4. 启动应用

```bash
npm install
npm run dev
```

## 5. 验证点

1. 打开应用后可创建路线，不再依赖 Supabase 登录态。
2. `/tasks`、`/deck` 页面可正常读写本地 PostgreSQL。
3. `profiles` 表存在 demo 用户：`00000000-0000-0000-0000-000000000002`。

## 6. 常见问题

- **首次启动没建表**：确认 `pgdata` 是新卷；旧卷不会自动重跑 `/docker-entrypoint-initdb.d`。
- **连接失败**：检查 `.env.local` 里的端口和账号密码是否与 PostgreSQL 一致。
- **权限/外键报错**：直接执行 `bash scripts/db-init-local.sh`，SQL 为幂等设计，可重复执行。
