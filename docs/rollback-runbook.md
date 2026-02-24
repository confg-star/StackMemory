# 回滚运行手册 (Rollback Runbook)

## 文档信息
- **版本**: 1.0
- **创建日期**: 2026-02-23
- **目标**: 从本地 PostgreSQL (local_pg) 回滚到 Supabase

## 1. 回滚触发条件

### 1.1 自动触发条件
- 核心功能完全不可用
- 数据库连接连续失败 (3 次以上)
- HTTP 错误率 > 10%
- 数据丢失或严重数据不一致

### 1.2 手动触发条件
- 页面加载时间持续 > 10s
- 卡片 CRUD 操作失败率 > 50%
- 标签功能完全失效

## 2. 回滚步骤

### 2.1 立即停止当前服务
```bash
cd /root/.openclaw/workspace/StackMemory
docker compose down
```

### 2.2 修改配置为 Supabase
在 .env 文件中修改或覆盖环境变量：
```
DATA_PROVIDER=supabase
```
或在 docker-compose.yml 中修改：
```yaml
environment:
  - DATA_PROVIDER=supabase
```

### 2.3 重新构建并启动服务
```bash
# 重新构建镜像
docker compose up -d --build

# 等待服务启动
sleep 10
```

### 2.4 验证回滚成功
```bash
# 检查容器状态
docker ps

# 检查应用日志
docker compose logs --tail=20 stackmemory

# 测试主页面
curl -s -o /dev/null -w "%{http_code}" http://localhost:3011/

# 测试 /tasks 端点
curl -s -o /dev/null -w "%{http_code}" http://localhost:3011/tasks
```

## 3. 回滚后验证

### 3.1 功能验证
- [ ] 主页可访问
- [ ] 卡片列表正常显示
- [ ] 创建新卡片成功
- [ ] 删除卡片成功
- [ ] 标签功能正常

### 3.2 数据完整性检查
- [ ] 确认 Supabase 连接正常
- [ ] 确认历史数据可读取
- [ ] 确认新增数据已同步 (如有)

### 3.3 日志检查
```bash
# 检查是否有新的错误
docker compose logs stackmemory | tail -50 | grep -i error

# 检查 Supabase 连接日志
docker compose logs stackmemory | grep -i supabase
```

## 4. 数据同步问题处理

### 4.1 切流期间新增数据
如果在切流到 local_pg 期间有新数据产生，回滚后需要手动同步：

```bash
# 导出本地新数据
docker exec -it stackmemory-postgres psql -U stackuser -d stackmemory -c "SELECT * FROM flashcards WHERE created_at > '2026-02-23';" > /root/.openclaw/workspace/StackMemory/.tmp/local_new_cards.json

# 手动导入到 Supabase (需要 Supabase 客户端工具)
# 或联系管理员处理
```

### 4.2 数据一致性验证
```bash
# 对比数据量
echo "Local PostgreSQL:"
docker exec -it stackmemory-postgres psql -U stackuser -d stackmemory -c "SELECT COUNT(*) FROM flashcards;"

# Supabase 数据需通过 UI 或 API 查看
```

## 5. 事后处理

### 5.1 事件记录
- [ ] 记录回滚时间
- [ ] 记录回滚原因
- [ ] 记录影响范围
- [ ] 记录数据损失情况

### 5.2 问题分析
- [ ] 分析根因
- [ ] 制定修复计划
- [ ] 更新文档和监控

### 5.3 通知相关方
- [ ] 通知团队成员回滚情况
- [ ] 通知业务方影响评估
- [ ] 安排后续切流时间

## 6. 快速回滚命令汇总

```bash
# 一键回滚 (切流到 Supabase)
cd /root/.openclaw/workspace/StackMemory

# 停止当前服务
docker compose down

# 修改环境变量并重启
export DATA_PROVIDER=supabase
docker compose up -d --build

# 验证
sleep 10
curl -s -o /dev/null -w "%{http_code}" http://localhost:3011/tasks
```

## 7. 联系信息

| 角色 | 联系方式 | 职责 |
|------|----------|------|
| 值班工程师 | - | 执行回滚操作 |
| DBA | - | 数据库问题支持 |
| 项目负责人 | - | 决策回滚时机 |

## 8. 变更记录

| 日期 | 操作 | 执行人 | 备注 |
|------|------|--------|------|
| 2026-02-23 | 创建回滚文档 | 工程代理 | 初始版本 |
