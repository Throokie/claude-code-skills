# Codex Free API Pool

一个多账号管理的 Codex API 反代服务，支持负载均衡、健康监控、API Key 认证等功能。

## 功能特性

- **OpenAI API 兼容**：完全兼容 OpenAI API 格式，支持 `/v1/chat/completions` 等标准端点
- **多账号负载均衡**：支持轮询、随机、加权、最少连接等多种策略
- **健康监控**：自动检测账号可用性，自动剔除失效账号
- **API Key 认证**：支持 API Key 认证和分级限流控制
- **管理后台**：美观的 React 管理界面，实时监控服务状态
- **流式响应**：支持 SSE 流式响应，适配各类 AI 客户端

## 技术栈

- **后端**：Node.js + TypeScript + Fastify + Prisma + SQLite
- **前端**：React + TypeScript + Vite + Ant Design + TanStack Query
- **测试**：Vitest + Playwright

## 快速开始

### 1. 克隆项目

```bash
git clone <repository-url>
cd codex-auto
```

### 2. 安装依赖

```bash
# 安装后端依赖
npm install

# 安装前端依赖
cd web && npm install && cd ..
```

### 3. 配置环境变量

```bash
cp .env.example .env
# 编辑 .env 文件，设置必要的配置
```

### 4. 初始化数据库

```bash
npm run db:migrate
npm run db:generate
```

### 5. 启动服务

```bash
# 启动后端服务
npm run dev

# 在另一个终端启动前端服务
cd web && npm run dev
```

访问 http://localhost:5173 打开管理后台

## API 使用

```bash
# 获取模型列表
curl http://localhost:3000/v1/models \
  -H "Authorization: Bearer YOUR_API_KEY"

# 聊天补全
curl http://localhost:3000/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -d '{
    "model": "gpt-3.5-turbo",
    "messages": [{"role": "user", "content": "Hello!"}]
  }'
```

## 部署

### Docker 部署

```bash
# 使用 Docker Compose
docker-compose up -d
```

### 手动部署

```bash
# 构建
npm run build
cd web && npm run build && cd ..

# 启动
npm start
```

## 项目结构

```
codex-auto/
├── src/                    # 后端源码
│   ├── repositories/       # 数据访问层
│   ├── services/           # 业务逻辑层
│   ├── routes/             # API路由
│   ├── middleware/         # 中间件
│   ├── utils/              # 工具函数
│   └── types/              # 类型定义
├── web/                    # 前端源码
│   ├── src/
│   │   ├── components/     # 组件
│   │   ├── pages/          # 页面
│   │   ├── api/            # API客户端
│   │   └── styles/         # 样式
├── prisma/                 # 数据库模型
├── tests/                  # 测试文件
└── docs/prd/               # PRD文档
```

## 开发计划

- [x] 基础项目结构
- [x] 数据库模型设计
- [x] API 路由实现
- [x] 负载均衡服务
- [x] 健康检查服务
- [x] 管理后台界面
- [ ] 账号自动注册
- [ ] 日志审计功能
- [ ] 用户配额系统
- [ ] 完整测试覆盖

## 注意事项

⚠️ **免责声明**：本项目仅供学习研究使用，请遵守以下原则：
1. 遵守 OpenAI/Codex 服务条款
2. 遵守当地法律法规
3. 禁止用于商业盈利目的
4. 用户自行承担使用风险

## License

MIT
