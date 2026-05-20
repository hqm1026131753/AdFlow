# AdFlow

可视化 AI 广告创意工作流画布。拖拽节点搭建从"找参考 → 洗图+换脸 → 产品替换 → 排版出图"的完整流程，批量生成广告素材。

## 功能

- **可视化画布**：基于 React Flow 的节点编辑器，支持拖拽、连线、缩放
- **AI 生图**：集成 BananaPro Gemini 模型，通过聊天接口生成图片
- **文案生成**：集成 Kimi API，自动生成广告文案
- **Ad Scout**：搜索海外社媒广告参考图，VLM 智能评分筛选
- **Agent 助手**：右侧 AI 对话面板，支持技能快捷入口
- **批量处理**：上传多张产品图，一键批量跑工作流

## 技术栈

| 层级 | 技术 |
|------|------|
| 前端 | React 19 + TypeScript + Vite + Tailwind CSS v4 |
| 画布 | React Flow (@xyflow/react v12) |
| 状态 | Zustand |
| 后端 | Express 5 + TypeScript |
| 数据库 | SQLite + Drizzle ORM |
| 队列 | p-queue |

## 快速开始

### 环境要求

- Node.js 20+
- pnpm (`npm install -g pnpm`)

### 1. 克隆项目

```bash
git clone https://github.com/hqm1026131753/AdFlow.git
cd AdFlow
```

### 2. 安装依赖

```bash
pnpm install
```

### 3. 配置环境变量

```bash
cp apps/api/.env.example apps/api/.env
```

编辑 `apps/api/.env`，填入你的 API 密钥：

```env
KIMI_API_KEY=sk-your-kimi-key
KIMI_BASE_URL=https://api.moonshot.cn/v1
IMAGE_GEN_API_KEY=sk-your-banana-key
IMAGE_GEN_BASE_URL=https://newapi.bananapro.top/v1
```

### 4. 启动开发服务器

**终端 1 — 启动后端：**

```bash
cd apps/api
npx tsx src/index.ts
```

后端运行在 http://localhost:3000

**终端 2 — 启动前端：**

```bash
cd apps/web
pnpm dev
```

前端运行在 http://localhost:5173

打开浏览器访问 http://localhost:5173 即可使用。

## 项目结构

```
AdFlow/
├── apps/
│   ├── web/          # React 前端
│   └── api/          # Express 后端
├── packages/
│   └── shared/       # 共享类型和常量
├── pnpm-workspace.yaml
└── package.json
```

## API 密钥获取

- **Kimi**：https://platform.moonshot.cn 注册获取
- **BananaPro（生图）**：https://newapi.bananapro.top 注册获取

## License

MIT
