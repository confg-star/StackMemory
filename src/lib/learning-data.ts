export interface LearningPhase {
  id: string
  title: string
  weeks: string
  goal: string
  focus: string[]
  deliverables: string[]
}

export interface LearningTask {
  id: string
  title: string
  type: '学习' | '实操' | '复盘'
  difficulty: '简单' | '中等' | '进阶'
  estimate: string
  objective: string
  doneCriteria: string
}

export const learningPhases: LearningPhase[] = [
  {
    id: 'phase-1',
    title: '阶段 1：语言补齐（Python + TypeScript）',
    weeks: '第 1-2 周',
    goal: '从 Java 基础过渡到 Agent 常用语言栈，能写小工具。',
    focus: [
      'Python：函数、类、typing、asyncio、requests',
      'TypeScript：类型系统、async/await、Node 基础',
      'CLI 工具开发与 Git 提交流程',
    ],
    deliverables: ['完成 5 个小脚本', '提交 1 篇学习复盘', '建立统一开发环境'],
  },
  {
    id: 'phase-2',
    title: '阶段 2：LLM 与结构化输出',
    weeks: '第 3-4 周',
    goal: '掌握模型调用与稳定输出，避免“能跑但不稳”。',
    focus: [
      'Prompt 模板化与 JSON 输出约束',
      '超时、重试、fallback 机制',
      '内容抓取 -> 知识提炼 -> 存储链路',
    ],
    deliverables: ['可复用的解析服务 1 套', '错误处理策略文档 1 份'],
  },
  {
    id: 'phase-3',
    title: '阶段 3：Agent 核心能力',
    weeks: '第 5-8 周',
    goal: '完成工具调用、任务编排、记忆管理。',
    focus: [
      'Tool Calling 参数约束与执行',
      '短期/长期记忆分层设计',
      'Heartbeat/Cron 自动化执行',
    ],
    deliverables: ['Agent 工作流 v1', '每周自动学习汇报'],
  },
  {
    id: 'phase-4',
    title: '阶段 4：专属学习网站成型',
    weeks: '第 9-12 周',
    goal: '把 StackMemory 升级为“学习操作系统”。',
    focus: [
      '学习路线看板 + 今日任务系统',
      '复习队列 + 间隔重复机制',
      '周报与学习画像',
    ],
    deliverables: ['可持续学习网站 1 个', '可展示毕业项目 1 个'],
  },
]

export const currentTasks: LearningTask[] = [
  {
    id: 'task-day1-py',
    title: 'Python 快速补齐：函数 + typing + requests',
    type: '学习',
    difficulty: '简单',
    estimate: '45 分钟',
    objective: '掌握 Agent 常见 Python 代码结构，能读懂并改动脚本。',
    doneCriteria: '写出一个读取 URL 并输出 JSON 的脚本，成功运行一次。',
  },
  {
    id: 'task-day1-cli',
    title: '实操：写一个内容抓取 CLI',
    type: '实操',
    difficulty: '中等',
    estimate: '60 分钟',
    objective: '把“输入链接 -> 输出正文摘要”跑通。',
    doneCriteria: 'CLI 支持传入 URL，输出标题 + 200 字摘要，并提交到 Git。',
  },
  {
    id: 'task-day1-review',
    title: '复盘：记录今天 3 个坑 + 1 个下一步动作',
    type: '复盘',
    difficulty: '简单',
    estimate: '15 分钟',
    objective: '形成稳定复盘习惯，减少重复踩坑。',
    doneCriteria: '在学习日志里写下 3 个问题和 1 个可执行改进。',
  },
]
