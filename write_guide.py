open("E:/Codex/GC/部署指南.md", "w", encoding="utf-8").write("""# 公出审批系统 - 部署指南（零基础版）

> 本指南适合完全没有服务器部署经验的新手。
> 你只需要会基本的电脑操作（打字、复制粘贴），就能跟着本指南完成部署。

---

## 整体架构

```
用户手机/电脑 → Cloudflare → GitHub Pages（前端页面）
                                    ↓
                              阿里云服务器（后端API + 数据库）
```

## 准备工作

| 需要什么 | 费用 | 说明 |
|---------|------|------|
| GitHub账号 | 免费 | 存放代码 [注册](https://github.com) |
| 阿里云服务器 | ~34元/月 | 运行后端程序 [购买](https://www.aliyun.com) |
| 域名（可选） | ~30元/年 | 没有也行 |
| 钉钉企业内部应用 | 已有 | 你已创建好的钉钉应用 |

---

## 第一步：购买阿里云轻量服务器

1. 打开 https://www.aliyun.com
2. 搜索"轻量应用服务器"
3. 选择配置：
   - 地域：离你最近的城市
   - 镜像：Ubuntu 22.04
   - 套餐：最便宜的即可（2核2G）
4. 购买后记下：
   - ✅ 服务器IP地址：____________
   - ✅ 登录密码：____________

---

## 第二步：连接到服务器

### 方法一：阿里云Workbench（推荐新手）

1. 登录阿里云控制台
2. 进入轻量应用服务器管理页面
3. 点击"远程连接"→"Workbench远程连接"
4. 输入登录密码
5. 看到黑底白字的命令行窗口就成功了

### 方法二：SSH（你的电脑上操作）

```bash
ssh root@你的服务器IP
# 输入密码（输入时不会显示，正常现象）
```

---

## 第三步：安装软件

```bash
# 更新软件源
apt update

# 安装 Node.js 20.x
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs

# 验证
node -v   # 应显示 v20.xx.x
npm -v    # 应显示 10.xx.x

# 安装 MySQL
apt install -y mysql-server

# 启动 MySQL
systemctl start mysql
systemctl enable mysql

# 检查 MySQL 状态（应看到 active (running)）
systemctl status mysql
```

---

## 第四步：配置数据库

```bash
# 登录 MySQL（刚安装没有密码，直接回车）
mysql
```

```sql
-- 设置root密码（替换 '你的密码' 为你的密码）
ALTER USER 'root'@'localhost' IDENTIFIED WITH mysql_native_password BY '你的密码';
FLUSH PRIVILEGES;
exit;
```

```bash
# 用新密码重新登录
mysql -u root -p
```

```sql
-- 创建数据库
CREATE DATABASE gc_approval CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE gc_approval;

-- 创建用户表
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  dingtalk_userid VARCHAR(255),
  department VARCHAR(255),
  title VARCHAR(100),
  role VARCHAR(50) DEFAULT 'employee',
  is_admin TINYINT(1) DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 创建地点表
CREATE TABLE IF NOT EXISTS locations (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  status TINYINT(1) DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 创建申请表
CREATE TABLE IF NOT EXISTS applications (
  id INT AUTO_INCREMENT PRIMARY KEY,
  applicant_id INT NOT NULL,
  approver_id INT NOT NULL,
  apply_date DATE,
  travel_date DATE,
  reason TEXT,
  attachments TEXT,
  location_id VARCHAR(50),
  person_count INT DEFAULT 1,
  amount DECIMAL(10, 2),
  status VARCHAR(20) DEFAULT 'draft',
  approver_comment TEXT,
  reject_reason TEXT,
  approved_at DATETIME,
  dingtalk_task_id VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

exit;
```

---

## 第五步：部署后端

```bash
# 安装 Git
apt install -y git

# 创建项目目录
mkdir -p /opt/app
cd /opt/app

# 拉取代码（替换为你的仓库地址）
git clone https://github.com/你的用户名/gc-approval-system.git
cd gc-approval-system/backend

# 配置环境变量
cp .env.example .env
nano .env
```
""")