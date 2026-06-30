# 公出审批系统

这是一个面向学校/单位内部使用的公出审批系统。前端使用 Vue 3 + Vant，适合部署到 GitHub Pages；后端使用 Node.js + Express + MySQL，适合部署到阿里云轻量应用服务器；域名和访问加速可交给 Cloudflare。

## 功能

- 员工提交公出申请
- 审批负责人审批或驳回
- 管理员维护用户、角色、公出地点和报销金额
- 支持附件上传和预览
- 支持按月导出数据
- 支持钉钉免登、钉钉通知、钉钉待办

## 项目结构

```text
GC/
├── frontend/              # 前端，Vue 3 + Vite + Vant
├── backend/               # 后端，Node.js + Express
├── database/init.sql      # 新服务器初始化数据库脚本
├── README.md              # 项目说明
└── 部署指南.md             # 零基础部署步骤
```

## 本地开发环境

需要先安装：

- Node.js 18 或更高版本
- MySQL 8.0 或更高版本

## 本地启动数据库

先创建数据库并导入表结构：

```bash
mysql -u root -p
```

进入 MySQL 后执行：

```sql
CREATE DATABASE IF NOT EXISTS gc_approval DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE gc_approval;
SOURCE E:/Codex/GC/database/init.sql;
```

## 本地启动后端

```bash
cd E:\Codex\GC\backend
npm install
npm start
```

后端默认地址：

```text
http://localhost:3000
```

健康检查地址：

```text
http://localhost:3000/api/health
```

## 本地启动前端

```bash
cd E:\Codex\GC\frontend
npm install
npm run dev
```

前端默认地址：

```text
http://localhost:5173
```

本地开发时，前端通过 Vite 代理访问：

- `/api` -> `http://localhost:3000/api`
- `/uploads` -> `http://localhost:3000/uploads`

## 测试登录

系统支持一个内置超级管理员账号：

```text
登录名：superadmin
密码：无需密码
```

数据库初始化脚本还会创建三个测试用户：

```text
test_admin      管理员
test_approver   审批负责人
test_employee   普通员工
```

登录页面输入名字即可登录。

## 生产部署架构

```text
用户浏览器
  ↓
Cloudflare 加速域名
  ↓
GitHub Pages 前端
  ↓ 调用 HTTPS API
Cloudflare 加速域名 api.example.com
  ↓
阿里云轻量应用服务器 Nginx
  ↓
Node.js 后端 + MySQL
```

推荐域名规划：

```text
app.example.com   前端页面，指向 GitHub Pages
api.example.com   后端接口，指向阿里云服务器
```

## 重要配置

前端生产 API 地址在：

```text
frontend/.env.production
```

示例：

```env
VITE_API_BASE_URL=https://api.example.com/api
```

后端生产环境变量在：

```text
backend/.env
```

关键项：

```env
NODE_ENV=production
PORT=3000
FRONTEND_URL=https://app.example.com
CORS_ORIGINS=https://app.example.com,https://你的用户名.github.io
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=gc_user
DB_PASSWORD=你的数据库密码
DB_NAME=gc_approval
JWT_SECRET=请改成一串很长的随机字符
JWT_EXPIRES_IN=7d
```

## 本次重点修复

- 修复附件上传线上地址错误：生产环境不再请求 GitHub Pages 自己的 `/api/upload`
- 修复附件预览地址：生产环境会正确拼接后端域名
- 修复 GitHub Pages hash 路由下 401 登录跳转错误
- 修复 MySQL 不可用时后端启动直接崩溃的问题
- 补齐数据库初始化字段：`attachments`、`dingtalk_task_id`、`mobile`、`title`、`is_admin`
- 增加 `/api/health` 健康检查
- 增强 CORS：支持多个生产前端域名、GitHub Pages、Cloudflare Pages 和本地开发地址

详细上线步骤见 [部署指南.md](./部署指南.md)。
