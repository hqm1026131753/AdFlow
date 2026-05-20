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

## 本地开发

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
pnpm dev
```

后端运行在 http://localhost:3000

**终端 2 — 启动前端：**

```bash
cd apps/web
pnpm dev
```

前端运行在 http://localhost:5173

打开浏览器访问 http://localhost:5173 即可使用。

## 生产部署（全自动）

部署架构：Nginx + pm2 + GitHub Actions 自动部署。

### 准备工作

1. **购买云服务器**（推荐阿里云/腾讯云轻量应用服务器，2C2G 即可，约 30-50 元/月）
2. **域名**（可选，但推荐绑定域名 + HTTPS）
3. **API 密钥**：Kimi + BananaPro

### 服务器首次初始化

SSH 连接到你的服务器，执行：

```bash
# 克隆项目
cd /var/www
git clone https://github.com/hqm1026131753/AdFlow.git adflow
cd adflow

# 运行初始化脚本
bash deploy/setup.sh
```

脚本会自动安装 Node.js、pnpm、pm2、Nginx，并配置好服务。

**初始化完成后，必须手动编辑环境变量：**

```bash
nano /var/www/adflow/apps/api/.env
```

填入你的 API 密钥，然后运行更新：

```bash
bash deploy/update.sh
```

### 配置 GitHub Actions 自动部署

1. 打开仓库的 **Settings → Secrets and variables → Actions**
2. 点击 **New repository secret**，添加以下 4 个 secrets：

| Secret 名称 | 说明 | 示例 |
|-------------|------|------|
| `SERVER_HOST` | 服务器公网 IP | `123.45.67.89` |
| `SERVER_USER` | SSH 用户名 | `root` 或 `ubuntu` |
| `SERVER_SSH_KEY` | SSH 私钥 | 你本地 `~/.ssh/id_rsa` 的内容 |
| `SERVER_PATH` | 服务器上的项目路径 | `/var/www/adflow` |

**如何生成 SSH 密钥对（如果你还没有）：**

```bash
ssh-keygen -t ed25519 -C "deploy" -f ~/.ssh/adflow_deploy
# 把公钥放到服务器上
cat ~/.ssh/adflow_deploy.pub | ssh root@你的服务器IP "mkdir -p ~/.ssh && cat >> ~/.ssh/authorized_keys"
# 把私钥内容复制到 GitHub Secret `SERVER_SSH_KEY`
cat ~/.ssh/adflow_deploy
```

3. 配置完成后，以后每次 `git push` 到 `main` 分支，GitHub Actions 会自动：
   - 构建前端
   - SSH 连到服务器执行 `update.sh`
   - 服务器自动拉代码、构建、重启服务

### 更新流程（日常）

以后你只需在本机做：

```bash
git add .
git commit -m "更新了什么功能"
git push origin main
```

GitHub Actions 会在 1-2 分钟内自动完成部署，不需要再手动连服务器。

### 手动更新（备用）

如果 GitHub Actions 出问题，可以手动 SSH 到服务器执行：

```bash
ssh root@你的服务器IP
cd /var/www/adflow
bash deploy/update.sh
```

## 项目结构

```
AdFlow/
├── .github/workflows/     # GitHub Actions 自动部署
├── apps/
│   ├── web/               # React 前端
│   └── api/               # Express 后端
├── deploy/                # 部署配置文件
│   ├── nginx.conf         # Nginx 反向代理
│   ├── pm2.config.cjs     # pm2 进程管理
│   ├── setup.sh           # 服务器首次初始化
│   └── update.sh          # 服务器更新脚本
├── packages/
│   └── shared/            # 共享类型和常量
├── pnpm-workspace.yaml
└── package.json
```

## API 密钥获取

- **Kimi**：https://platform.moonshot.cn 注册获取
- **BananaPro（生图）**：https://newapi.bananapro.top 注册获取

## License

MIT
