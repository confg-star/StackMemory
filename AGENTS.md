# AGENTS.md

本文件是本仓库的 Agent 工作规范，供自动化编码 Agent 使用。

## 0. 语言规则（强制）

- 默认沟通语言：**中文**。
- 分析过程、实施说明、变更说明：**中文**。
- 仅当用户明确要求英文时，才切换英文。
- 代码、SQL、API 字段名、第三方库标识保持原始语言（通常为英文）。

## 1. 项目概览

- 项目名：`stack-memory`
- 技术栈：Next.js 16（App Router）+ React 19 + TypeScript
- 样式：Tailwind CSS 4 + Radix/Shadcn 风格组件
- 数据层：默认本地 PostgreSQL（`DATA_PROVIDER=local_pg`），兼容 Supabase 分支
- 关键目录：
  - `src/app`：页面、API Route Handlers、Server Actions
  - `src/components`：UI 组件
  - `src/lib`：数据仓储、AI、上下文、工具
  - `db`：初始化 SQL、seed、迁移文件

## 2. 常用命令

### 依赖与启动

- 安装依赖：`npm install`
- 启动开发：`npm run dev`
- 指定 3011 端口：`npm run dev -- --port 3011`
- 构建：`npm run build`
- 生产启动：`npm run start`

### 代码检查

- 全量 lint：`npm run lint`
- 单文件 lint：`npx eslint src/app/page.tsx`
- 目录 lint：`npx eslint src/app`

### 测试说明（当前状态）

- 当前仓库**尚未配置测试框架**（无 `test` script、无 Jest/Vitest 配置）。
- 当前主要验证手段：`lint + 本地联调`。

### 单测命令模板（未来引入测试后使用）

- Vitest 单文件：`npx vitest run path/to/file.test.ts`
- Vitest 按用例名：`npx vitest run path/to/file.test.ts -t "用例名"`
- Jest 单文件：`npx jest path/to/file.test.ts`
- Jest 按用例名：`npx jest path/to/file.test.ts -t "用例名"`

> 若新增测试框架，请同步在 `package.json` 增加 `test` 脚本。

## 3. 数据库与本地环境

- 一键初始化本地库：`bash scripts/db-init-local.sh`
- 初始化 SQL：`db/local-one-click-init.sql`
- 可选 seed：`db/seed.sql`

常见环境变量（`.env.local`）：

- `DATA_PROVIDER=local_pg`
- `LOCAL_PG_HOST`, `LOCAL_PG_PORT`, `LOCAL_PG_DB`, `LOCAL_PG_USER`, `LOCAL_PG_PASSWORD`
- `LOCAL_DEMO_USER_ID`
- `OPENROUTER_API_KEY`

## 4. Cursor / Copilot 规则检查

- `.cursor/rules/`：未发现
- `.cursorrules`：未发现
- `.github/copilot-instructions.md`：未发现

补充本地约束来源：

- `CLAUDE.md`
- `agents.md`（历史文件）

若规则冲突，优先级：用户明确指令 > 本文件 > 其他说明文档。

## 5. 代码风格规范

### TypeScript 与类型

- 维持 `strict: true` 约束。
- 优先显式类型（接口/类型别名），避免 `any`。
- 必须使用 `unknown` 时，后续做类型收窄。
- API 请求/响应建议统一结构：`{ success, data?, error? }`。

### 导入规范

- 内部模块优先用别名：`@/...`。
- 导入顺序建议：
  1) React/Next
  2) 第三方库
  3) 内部别名模块
  4) 相对路径
- 禁止保留未使用导入。

### 命名规范

- 组件/类型/接口：`PascalCase`
- 变量/函数/Hook：`camelCase`
- 常量：`UPPER_SNAKE_CASE`（仅真正常量）
- 文件命名保持现有目录习惯，不做无关重命名。

### 格式化规范

- 以 ESLint 与当前文件风格为准。
- 禁止“纯格式化大改动”掩盖真实改动。
- JSX 保持可读，避免渲染层写过深逻辑。

### React / Next.js 规范

- 使用函数组件与 Hooks。
- 明确 client/server 边界（需要时使用 `'use client'`）。
- Route Handler 必须做输入校验与错误返回。
- 状态更新优先小步、可追踪，不做大范围重写。

### 错误处理

- I/O、网络、数据库调用必须 `try/catch`。
- 记录可定位的错误上下文（`console.error`）。
- 返回用户可理解错误，不暴露密钥、连接串等敏感信息。

## 6. 开发流程（Agent 执行）

1. 先读相关代码再改。
2. 先做最小可行改动（MVP fix）。
3. 做针对性验证（lint/接口/页面联动）。
4. 输出变更说明：改了什么、为什么、怎么验。

涉及跨模块（UI + API + DB）时，必须做端到端自检。

## 7. 禁止事项

- 禁止提交密钥、凭据、`.env` 实值。
- 禁止在修 bug 时顺带做无关重构。
- 禁止使用破坏性 Git 操作（除非用户明确要求）。
- 禁止静默更改数据提供者策略（如从 local_pg 改回 supabase）。

## 8. 输出与协作风格

- 对用户说明使用中文，简洁直接。
- 变更说明必须带文件路径。
- 无法本地验证时，明确说明原因和下一步命令。

## 9. 提交前检查清单

- `npm run lint`（若有历史问题需明确标注）。
- 开发服务可启动：`npm run dev -- --port 3011`。
- 涉及 API 的改动：至少验证成功与失败分支。
- 涉及数据库改动：验证连接、建表/读写流程。
