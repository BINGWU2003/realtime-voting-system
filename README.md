# 实时投票系统

这是一个基于 Next.js 14 构建的实时投票系统，支持实时投票和结果展示。

## 功能特色

- 📊 **实时投票**: 用户可以参与预设问卷的投票
- 🔄 **实时更新**: 使用 SSE (Server-Sent Events) 实现投票结果实时推送
- 🎨 **现代界面**: 基于 shadcn/ui 的精美界面设计
- 🚫 **防重复投票**: 基于 IP 地址限制，每用户仅可投票一次
- 📱 **响应式设计**: 支持桌面端和移动端设备

## 技术栈

- **前端**: Next.js 14 + React 18 + TypeScript
- **样式**: Tailwind CSS + shadcn/ui
- **后端**: Next.js API Routes
- **数据库**: MySQL + Prisma ORM
- **实时通信**: Server-Sent Events (SSE)
- **图表**: Progress 进度条组件

## 项目结构

```
realtime-voting-system/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── poll/
│   │   │   │   ├── route.ts          # 获取投票数据API
│   │   │   │   └── vote/
│   │   │   │       └── route.ts      # 提交投票API
│   │   │   └── sse/
│   │   │       └── poll/
│   │   │           └── route.ts      # SSE实时推送API
│   │   ├── globals.css
│   │   └── page.tsx                  # 主页面
│   ├── components/
│   │   ├── ui/                       # shadcn/ui 组件
│   │   └── VotingPoll.tsx           # 投票组件
│   ├── lib/
│   │   └── db.ts                    # Prisma 数据库连接
├── prisma/
│   ├── schema.prisma                # 数据库模式定义
│   └── seed.ts                      # 数据种子文件
└── package.json
```

## 数据库模式

系统包含三个主要数据模型：

- **Poll**: 投票问卷（题目、描述等）
- **Option**: 投票选项
- **Vote**: 投票记录（包含投票者IP和选择的选项）

## 安装和运行

### 1. 环境要求

- Node.js 18+ 
- MySQL 数据库

### 2. 克隆项目

```bash
git clone <项目地址>
cd realtime-voting-system
```

### 3. 安装依赖

```bash
npm install
```

### 4. 配置环境变量

创建 `.env` 文件并配置数据库连接：

```env
DATABASE_URL="mysql://用户名:密码@主机:端口/数据库名"
NEXTAUTH_SECRET="your-secret-key-here"
NEXTAUTH_URL="http://localhost:3000"
```

### 5. 数据库设置

```bash
# 生成 Prisma 客户端
npx prisma generate

# 推送数据库模式
npx prisma db push

# 初始化种子数据
npm run seed
```

### 6. 启动开发服务器

```bash
npm run dev
```

项目将在 `http://localhost:3000` 上运行。

## API 接口

### 获取投票数据
```
GET /api/poll
```

返回当前投票问卷的所有信息，包括选项和票数统计。

### 提交投票
```
POST /api/poll/vote
Content-Type: application/json

{
  "optionId": "选项ID"
}
```

提交用户的投票选择。

### SSE 实时更新
```
GET /api/sse/poll
```

建立 SSE 连接，自动接收投票结果的实时更新。连接后会立即发送当前投票数据，之后每当有新投票时会推送更新。

## 使用说明

1. **访问系统**: 打开浏览器访问 `http://localhost:3000`
2. **查看问卷**: 系统会显示预设的投票问卷和选项
3. **参与投票**: 选择一个选项并点击"提交投票"
4. **查看结果**: 投票后会自动显示实时结果，包括各选项的票数和百分比
5. **实时更新**: 其他用户的投票会通过 SSE 实时更新到你的界面上
6. **连接状态**: 界面上会显示实时连接状态（连接中/已连接/连接断开）

## SSE vs WebSocket

本系统选择使用 **Server-Sent Events (SSE)** 而不是 WebSocket，原因如下：

### SSE 的优势
- ✅ **简单性**: 更简单的实现和调试
- ✅ **自动重连**: 浏览器会自动重连断开的连接
- ✅ **防火墙友好**: 使用标准HTTP连接，更容易通过防火墙
- ✅ **缓存支持**: 可以利用HTTP缓存机制
- ✅ **更少的资源消耗**: 对于单向数据推送场景更高效

### 适用场景
SSE 非常适合我们的投票系统，因为：
- 只需要服务器向客户端推送数据（单向通信）
- 实时性要求适中（投票结果更新）
- 连接断开后需要自动重连

## 防重复投票机制

系统通过以下方式防止重复投票：

1. **IP地址限制**: 基于客户端IP地址，每个IP只能对同一问卷投票一次
2. **前端状态**: 使用 localStorage 记录投票状态，防止同一浏览器重复投票
3. **数据库约束**: 在数据库层面设置唯一约束 `(pollId, voterIp)`

## 开发命令

```bash
# 开发模式
npm run dev

# 构建生产版本
npm run build

# 启动生产服务器
npm run start

# 代码检查
npm run lint

# 重新初始化数据
npm run seed
```

## 生产部署

1. 确保生产环境有 MySQL 数据库
2. 设置正确的环境变量
3. 运行构建命令: `npm run build`
4. 启动生产服务器: `npm run start`

> **注意**: 由于使用了 SSE，建议在生产环境中使用支持长连接的 Web 服务器（如 Nginx）。

## 许可证

MIT License
