# StackMemory 项目文档（代码级梳理）

## 1. 项目定位

StackMemory（栈记）是一个面向开发者学习场景的 AI 学习站，核心是把「学习路线」「每日任务」「复盘卡片」串成闭环：

- 输入学习目标与背景，自动生成阶段化学习路线
- 按日期查看并执行当天任务（学习 / 实操 / 复盘）
- 将文本或 URL 内容解析为闪卡并沉淀到卡片库
- 支持多路线切换，按路线隔离任务与卡片

## 2. 技术栈与运行环境

### 前端与服务端

- Next.js 16（App Router）
- React 19 + TypeScript
- Tailwind CSS 4 + Shadcn/ui（Radix 生态组件）
- Server Actions + Route Handlers（`src/app/actions`、`src/app/api`）

### 数据与认证

- 数据层支持双后端：
  - Supabase（默认）
  - 本地 PostgreSQL（`DATA_PROVIDER=local_pg`）
- 认证支持：
  - Supabase Auth（邮箱/密码 + GitHub OAuth）
  - 本地 localStorage 账户（开发兜底模式）

### AI 能力

- 统一走 OpenRouter 兼容接口
- 主要能力：
  - 学习路线生成（`/api/learning-roadmap`）
  - 内容转闪卡（`src/lib/deepseek/index.ts`）
- 内置模型能力校验与调用日志记录（model capability / call logger）

## 3. 目录结构（关键）

```text
StackMemory_repo/
├─ src/
│  ├─ app/
│  │  ├─ api/
│  │  │  ├─ learning-roadmap/route.ts
│  │  │  └─ routes/
│  │  │     ├─ route.ts
│  │  │     └─ switch/route.ts
│  │  ├─ actions/
│  │  │  ├─ parse-content.ts
│  │  │  ├─ save-card.ts
│  │  │  ├─ get-cards.ts
│  │  │  └─ auth.ts
│  │  ├─ page.tsx           # 首页（学习路线入口）
│  │  ├─ roadmap/page.tsx   # 路线与阶段
│  │  ├─ tasks/page.tsx     # 每日任务
│  │  ├─ deck/page.tsx      # 卡片库
│  │  └─ create/page.tsx    # 行动中心/手动建卡
│  ├─ components/
│  │  ├─ layout/
│  │  ├─ roadmap/
│  │  ├─ tasks/
│  │  ├─ parser/
│  │  └─ deck/
│  └─ lib/
│     ├─ context/RouteContext.tsx
│     ├─ data-provider/
│     ├─ deepseek/
│     ├─ scraper/
│     └─ resource-quality-gate.ts
├─ data/                    # 路线生成结果落盘（learning-roadmap.json）
├─ docs/
├─ db/
├─ docker-compose.yml
└─ init.sql
```

## 4. 核心业务流程

### 4.1 学习路线生成流程

1. 用户在首页填写学习主题、背景、目标、时间预算、周期
2. 前端请求 `POST /api/learning-roadmap`
3. API 调用 OpenRouter 生成 JSON 路线（阶段 + 任务 + 当前任务）
4. 服务端执行学习资料质量门禁（链接可达性、来源、相关性）
5. 路线写入本地文件 `data/learning-roadmap.json`
6. 前端进入 `/roadmap`、`/tasks` 进行可视化执行

### 4.2 路线管理与切换

- 路线列表：`GET /api/routes`
- 新建路线：`POST /api/routes`
- 切换当前路线：`PUT /api/routes/switch`
- 前端由 `RouteContext` 统一维护 `currentRoute`、`routes`、切换状态与事件广播（`route-changed`）

### 4.3 每日任务执行

- `/tasks` 页面按 `routeId + date` 解析 `roadmap_data` 得到当天任务
- 支持任务高亮跳转（`taskId`）与日期切换
- 任务完成状态本地存储（按 `routeId:date:taskId` 作用域）

### 4.4 知识卡片沉淀

1. 用户输入 URL 或文本（手动建卡）
2. URL 先经 `scrapeUrl` 抓正文，文本直接进入 AI
3. AI 输出 3-5 张问答卡片
4. `saveCards` 写入仓储层，按 `routeId` 关联到当前路线
5. `/deck` 支持搜索、标签筛选、删除

## 5. 数据设计（当前代码视角）

`init.sql` 里已有核心表：

- `profiles`
- `routes`（学习路线）
- `flashcards`（卡片主体，含 `route_id`）
- `tags`
- `card_tags`

仓储层抽象在 `src/lib/data-provider/interfaces.ts`，通过 `getCardRepository()` 按环境切换实现：

- `SupabaseCardRepository`
- `LocalPgCardRepository`

说明：`LocalPgRouteTaskRepository` 已有代码，但 `init.sql` 未包含 `route_tasks` 表定义，若启用相关能力需补齐迁移。

## 6. API 与 Server Action 清单

### Route Handlers

- `POST /api/learning-roadmap`：生成路线 + 质量门禁
- `GET /api/learning-roadmap`：读取最近一次路线文件
- `GET /api/routes`：路线分页列表
- `POST /api/routes`：创建路线
- `PUT /api/routes/switch`：切换当前路线

### Server Actions

- `parseContent`：URL/文本解析为闪卡
- `saveCards`：保存卡片（要求已登录 + routeId）
- `getCards/getTags/deleteCard`：卡片查询与管理
- `signIn/signUp/signInWithGithub/signOut`：认证操作

## 7. 配置与环境变量

### AI / 通用

- `OPENROUTER_API_KEY`（必需）
- `AI_MODEL`（可选，默认因模块而异）
- `AI_API_URL`（可选，默认 OpenRouter chat completions）

### 数据层

- `DATA_PROVIDER=supabase | local_pg`
- 本地 PG 模式：`LOCAL_PG_HOST/PORT/DB/USER/PASSWORD`

### Supabase（启用时）

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`（部分后端场景）
- `NEXT_PUBLIC_APP_URL`（认证回调）

## 8. 本地开发与部署

### 本地开发（Node）

```bash
npm install
npm run dev
```

### Docker 方式（本地 PG + 应用）

```bash
docker compose up -d --build
```

默认端口：

- App: `3011`
- PostgreSQL: `5432`

## 9. 目前代码现状与关注点

1. README 仍是 Next.js 模板文案，建议替换为项目专用说明
2. 学习路线接口写文件到 `data/learning-roadmap.json`，多实例部署下需要改为持久化存储
3. `docs/db-schema-local.md` 与 `init.sql` 字段命名存在差异（如 `front/back` vs `question/answer`），建议统一
4. `LocalPgRouteTaskRepository` 依赖 `route_tasks`，但初始化 SQL 未见建表，建议补迁移
5. 当前路线 API 使用固定 `DEMO_USER_ID`，若进入生产需切换为真实鉴权用户上下文

## 10. 建议的下一步文档化工作

- 补一份 `README.md`（快速启动 + 环境变量 + 功能截图）
- 补一份 API 合同文档（请求/响应示例 + 错误码）
- 补一份数据库迁移基线文档（以 `db/migrations` 为唯一事实源）
