# OpenClaw 接口文档（StackMemory）

本文档用于让 OpenClaw 读取并自动调用 StackMemory 的路线编辑接口。

## 1. 目标能力

- 查询用户路线（列表/详情）
- 修改路线元信息（topic/background/goals/weeks）
- 设置当前路线（`is_current`）
- 新增/修改/删除任务
- 新增/删除任务资料（支持任务级资料、知识点资料）

## 2. 鉴权方式

支持两种模式：

1) 会话模式（浏览器登录态）
- 适用于前端页面同域调用。
- 依赖本地登录 cookie。

2) OpenClaw API Key 模式（推荐给服务端 Agent）
- 请求头必须包含：
  - `x-openclaw-key: <OPENCLAW_API_KEY>`
  - `x-stackmemory-user-id: <目标用户UUID>`
- `OPENCLAW_API_KEY` 在 StackMemory 服务端环境变量中配置。

> 注意：如果你传了 `x-openclaw-key`，但未传合法 `x-stackmemory-user-id`，请求会被拒绝。

## 3. 返回格式

统一返回：

```json
{
  "success": true,
  "message": "可选",
  "data": {},
  "auth_via": "api_key"
}
```

失败时：

```json
{
  "success": false,
  "error": "错误信息"
}
```

## 4. 接口清单

### 4.1 查询路线列表

- `GET /api/openclaw/routes?limit=20&offset=0&includeRoadmap=false`

参数：
- `limit`: 1-100
- `offset`: >=0
- `includeRoadmap`: `true/false`，是否返回 `roadmap_data`

### 4.2 查询路线详情

- `GET /api/openclaw/routes/:routeId`

### 4.3 修改路线

- `PATCH /api/openclaw/routes/:routeId`

Body（全部可选）：

```json
{
  "topic": "大模型开发",
  "background": "有后端经验",
  "goals": "16 周可独立搭建 Agent 应用",
  "weeks": 16,
  "is_current": true,
  "overview": {
    "whatIs": "...",
    "quickStartPath": ["..."]
  },
  "roadmap_data": {
    "phases": [],
    "currentTasks": []
  }
}
```

说明：
- `is_current=true` 时会自动取消该用户其他路线的 current 状态。
- `roadmap_data` 传入后将作为完整路线内容进行覆盖。
- 如果只想改导学文案，用 `overview` 即可。

### 4.4 新增任务

- `POST /api/openclaw/routes/:routeId/tasks`

Body（必填：`title`, `week`）：

```json
{
  "id": "task-week3-rag-baseline",
  "title": "实现 RAG 最小可用版本",
  "week": 3,
  "day": 2,
  "type": "实操",
  "status": "pending",
  "difficulty": "中等",
  "estimate": "90分钟",
  "objective": "打通检索+生成",
  "doneCriteria": "可回答至少 5 个领域问题",
  "phaseId": "phase-2",
  "includeInCurrentTasks": true
}
```

说明：
- 不传 `id` 时，系统会自动生成。
- 不传 `day` 时，系统会按该周已有任务自动分配下一天。
- 会自动同步到 `route_tasks` 表，便于后续进度统计。

### 4.5 修改任务

- `PATCH /api/openclaw/routes/:routeId/tasks/:taskId`

Body（按需传入）：

```json
{
  "title": "升级为 RAG + ReRank",
  "week": 4,
  "day": 1,
  "type": "实操",
  "status": "in_progress",
  "phaseId": "phase-2"
}
```

说明：
- 可用于“调周次、改标题、改阶段、改状态”。
- 会同步更新 `route_tasks` 对应任务行。

### 4.6 删除任务

- `DELETE /api/openclaw/routes/:routeId/tasks/:taskId`

说明：
- 同时删除 `roadmap_data` 中该任务和 `route_tasks` 对应记录。

### 4.7 新增任务资料

- `POST /api/openclaw/routes/:routeId/tasks/:taskId/materials`

Body：

```json
{
  "title": "LangChain Retrieval 官方文档",
  "url": "https://python.langchain.com/docs/concepts/retrieval/",
  "type": "article",
  "knowledgePointId": "kp-rag-retrieval"
}
```

说明：
- 不传 `knowledgePointId`：加到任务级 `materials`。
- 传了 `knowledgePointId`：加到对应知识点的 `materials`。
- 同 URL 会覆盖旧条目（避免重复）。

### 4.8 删除任务资料

- `DELETE /api/openclaw/routes/:routeId/tasks/:taskId/materials`

Body（至少传一个）：

```json
{
  "url": "https://python.langchain.com/docs/concepts/retrieval/",
  "knowledgePointId": "kp-rag-retrieval"
}
```

或

```json
{
  "title": "LangChain Retrieval 官方文档"
}
```

说明：
- `url` 优先于 `title` 匹配。

## 5. OpenClaw 推荐调用流程

1. `GET /api/openclaw/routes?includeRoadmap=true` 拉取路线全集。
2. 选中目标路线后，按用户反馈执行：
   - 改目标/周期：`PATCH /routes/:routeId`
   - 改任务：`PATCH /tasks/:taskId`
   - 加任务：`POST /tasks`
   - 删任务：`DELETE /tasks/:taskId`
   - 调资料：`POST/DELETE /materials`
3. 每次写操作后，重新 `GET /routes/:routeId` 做一次一致性校验。

## 6. cURL 示例（API Key 模式）

```bash
curl -X GET "http://localhost:3011/api/openclaw/routes?includeRoadmap=true" \
  -H "x-openclaw-key: your_openclaw_key" \
  -H "x-stackmemory-user-id: 11111111-2222-4333-8444-555555555555"
```

```bash
curl -X POST "http://localhost:3011/api/openclaw/routes/<routeId>/tasks" \
  -H "Content-Type: application/json" \
  -H "x-openclaw-key: your_openclaw_key" \
  -H "x-stackmemory-user-id: 11111111-2222-4333-8444-555555555555" \
  -d '{
    "title":"实现 LangGraph Agent 最小闭环",
    "week":6,
    "type":"实操",
    "objective":"支持工具调用与记忆",
    "doneCriteria":"完成一次多轮任务并记录日志"
  }'
```

## 7. 错误码建议（供 OpenClaw 策略）

- `400`：参数错误，可修正后重试。
- `401`：鉴权失败，检查 key / user id / 登录态。
- `404`：路线或任务不存在，需刷新实体列表后重试。
- `500`：服务端异常，建议指数退避重试并告警。
