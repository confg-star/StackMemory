# 切流运行手册 (Cutover Runbook)

## 文档信息
- **版本**: 1.0
- **创建日期**: 2026-02-23
- **目标**: 从 Supabase 切换到本地 PostgreSQL (local_pg)

## 1. 切流前检查清单

### 1.1 环境检查
- [ ] 确认 docker 和 docker-compose 已安装
- [ ] 确认 .env 文件中 DATA_PROVIDER 配置
- [ ] 确认本地 PostgreSQL 数据已初始化

### 1.2 数据库准备
```bash
# 检查 PostgreSQL 容器健康状态
docker ps | grep postgres

# 验证数据库连接
docker exec -it stackmemory-postgres psql -U stackuser -d stackmemory -c "SELECT 1"
```

### 1.3 数据迁移验证
- [ ] 确认数据已从 Supabase 迁移到本地 PostgreSQL
- [ ] 确认 flashcards 表记录数正确
- [ ] 确认 tags 表记录数正确
- [ ] 确认 card_tags 关联表记录数正确

## 2. 切流步骤

### 2.1 停止当前服务 (可选，仅在不重建镜像时)
```bash
cd /root/.openclaw/workspace/StackMemory
docker compose down
```

### 2.2 配置环境变量
确保 .env 或 docker-compose.yml 中配置：
```
DATA_PROVIDER=local_pg
LOCAL_PG_HOST=postgres
LOCAL_PG_PORT=5432
LOCAL_PG_DB=stackmemory
LOCAL_PG_USER=stackuser
LOCAL_PG_PASSWORD=stackpass
```

### 2.3 构建并启动服务
```bash
cd /root/.openclaw/workspace/StackMemory

# 重新构建镜像
docker compose up -d --build

# 等待服务启动
sleep 10
```

### 2.4 验证服务状态
```bash
# 检查容器运行状态
docker ps

# 查看应用日志
docker compose logs --tail=20 stackmemory
```

### 2.5 健康检查
```bash
# 测试主页面
curl -s -o /dev/null -w "%{http_code}" http://localhost:3011/

# 测试 /tasks 端点
curl -s -o /dev/null -w "%{http_code}" http://localhost:3011/tasks
```

## 3. 切流后验收测试

### 3.1 页面访问测试
- [ ] 主页 (http://localhost:3011/) 返回 200
- [ ] /deck 页面可访问
- [ ] /tasks 页面可访问
- [ ] /create 页面可访问
- [ ] /roadmap 页面可访问

### 3.2 卡片 CRUD 测试
- [ ] 创建新卡片成功
- [ ] 读取卡片列表成功
- [ ] 更新卡片成功
- [ ] 删除卡片成功

### 3.3 标签逻辑测试
- [ ] 创建标签成功
- [ ] 卡片关联标签成功
- [ ] 按标签筛选卡片成功

### 3.4 性能验证
- [ ] 页面加载时间 < 3s
- [ ] 卡片列表查询 < 1s

## 4. 观察窗口 (24h)

### 4.1 监控指标
- **服务可用性**: 检查 HTTP 200 响应率
- **错误率**: 查看 docker logs 中的 error 日志
- **响应时间**: 页面加载时间
- **数据库连接**: 检查 PostgreSQL 连接池状态

### 4.2 告警阈值
| 指标 | 阈值 | 动作 |
|------|------|------|
| HTTP 5xx 错误 | > 1% | 触发回滚 |
| 响应时间 | > 5s | 告警检查 |
| 数据库连接失败 | 连续 3 次 | 触发回滚 |
| 磁盘使用率 | > 80% | 告警清理 |

### 4.3 监控命令
```bash
# 实时查看错误日志
docker compose logs -f stackmemory | grep -i error

# 检查数据库连接
docker exec -it stackmemory-postgres psql -U stackuser -d stackmemory -c "SELECT count(*) FROM flashcards"

# 检查磁盘使用
df -h /var/lib/docker
```

## 5. 故障处理

### 5.1 自动回滚触发条件
- 核心功能不可用 (CRUD 全部失败)
- 数据库连接持续失败
- 错误率超过 10%

### 5.2 回滚执行
详见 [rollback-runbook.md](./rollback-runbook.md)

## 6. 变更记录

| 日期 | 操作 | 执行人 | 备注 |
|------|------|--------|------|
| 2026-02-23 | 初始切流 | 工程代理 | 切换到 local_pg |
