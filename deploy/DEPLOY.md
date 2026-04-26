# 经典游戏合集 - 部署手册

## 项目概述

本项目是一个包含用户系统的在线小游戏平台：

- **坦克大战** - 经典射击游戏
- **魂斗罗** - 横版动作射击游戏
- **课堂划水游戏** - 休闲策略游戏
- **小猫回家** - 益智学习游戏
- **医生救小兔** - 益智学习游戏

**已实现功能**：
- 用户注册/登录
- 游戏进度保存和加载
- 用户系统（Node.js + Express + SQLite）

## 系统要求

- **操作系统**: Ubuntu 24.04 LTS
- **Node.js**: 18.x 或更高版本
- **Web 服务器**: Nginx (用于反向代理)
- **PM2**: 进程管理器
- **域名**: 可选（用于 HTTPS）

## 目录结构

```
agent-dev/
├── deploy/              # 部署相关文件
│   ├── setup.sh        # 环境准备脚本
│   ├── deploy.sh       # 部署脚本
│   └── DEPLOY.md       # 本手册
├── index.html          # 游戏选择主页
├── style.css           # 全局样式
├── auth.js            # 认证模块
├── server.js          # 后端服务
├── package.json      # 项目配置
├── tank.html          # 坦克大战
├── tank.js / game.js  # 游戏逻辑
├── contra.html        # 魂斗罗
├── contra.js         
├── slacking.html     # 课堂划水游戏
├── slacking.js       
├── cat.html          # 小猫回家
├── cat.js / cat.css  
├── doctor.html       # 医生救小兔
├── doctor.js / doctor.css
└── 老师.jpg          # 游戏素材
```

## 快速开始

### 方法一：使用自动化脚本（推荐）

#### 1. 上传项目文件

将项目文件上传到服务器的 `/root/games/` 目录：

```bash
# 在本地执行（假设使用 root 用户）
scp -r agent-dev/* root@你的服务器IP:/root/games/
```

#### 2. 运行环境准备脚本

```bash
# SSH 登录服务器（root 用户）
ssh root@你的服务器IP

# 进入项目目录
cd /root/games/deploy

# 运行环境准备脚本
chmod +x setup.sh
./setup.sh
```

脚本会自动完成以下操作：
- 更新系统包
- 安装 Nginx
- 配置防火墙（开放 80/443 端口）
- 配置 fail2ban（防暴力破解）
- 创建项目目录 `/var/www/games`
- 配置 Nginx 站点
- 可选：配置 HTTPS

#### 3. 运行部署脚本

```bash
# 运行部署脚本
chmod +x deploy.sh
./deploy.sh
```

### 方法二：手动部署

#### 1. 更新系统

```bash
apt-get update
apt-get upgrade -y
```

#### 2. 安装 Nginx

```bash
apt-get install -y nginx
systemctl enable nginx
systemctl start nginx
```

#### 3. 配置防火墙

```bash
ufw default deny incoming
ufw default allow outgoing
ufw allow ssh
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable
```

#### 4. 创建项目目录

```bash
mkdir -p /var/www/games
chmod -R 755 /var/www/games
```

#### 5. 上传项目文件

```bash
# 从本地上传（root 用户）
scp -r agent-dev/* root@你的服务器IP:/root/games/

# 复制到 web 目录
cp -r /root/games/* /var/www/games/

# 或者使用 git clone
# git clone 你的仓库地址 /var/www/games
```

#### 6. 配置 Nginx

创建站点配置文件：

```bash
nano /etc/nginx/sites-available/games
```

添加以下内容：

```nginx
server {
    listen 80;
    listen [::]:80;
    
    server_name _;  # 替换为你的域名
    
    root /var/www/games;
    index index.html;
    
    charset utf-8;
    
    access_log /var/log/nginx/games-access.log;
    error_log /var/log/nginx/games-error.log;
    
    # 静态资源缓存
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 30d;
        add_header Cache-Control "public, immutable";
    }
    
    # HTML 文件不缓存
    location ~* \.html$ {
        expires -1;
        add_header Cache-Control "no-cache, no-store, must-revalidate";
        add_header Pragma "no-cache";
    }
    
    location / {
        try_files $uri $uri/ /index.html;
    }
    
    # Gzip 压缩
    gzip on;
    gzip_vary on;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_types text/plain text/css text/xml application/json application/javascript application/rss+xml application/atom+xml image/svg+xml;
}
```

启用站点：

```bash
ln -sf /etc/nginx/sites-available/games /etc/nginx/sites-enabled/games
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl reload nginx
```

## HTTPS 配置（推荐）

### 使用 Certbot 配置 Let's Encrypt

```bash
# 安装 Certbot
apt-get install -y certbot python3-certbot-nginx

# 配置 HTTPS（替换 your-domain.com 为你的域名）
certbot --nginx -d your-domain.com --non-interactive --agree-tos --email your-email@example.com

# 自动续期测试
certbot renew --dry-run
```

## 常用命令

### 查看 Nginx 状态

```bash
systemctl status nginx
```

### 查看 Nginx 日志

```bash
# 访问日志
tail -f /var/log/nginx/games-access.log

# 错误日志
tail -f /var/log/nginx/games-error.log
```

### 重启 Nginx

```bash
systemctl reload nginx
```

### 更新项目

```bash
# 备份现有项目
tar -czf /var/www/backups/backup-$(date +%Y%m%d-%H%M%S).tar.gz -C /var/www/games .

# 上传新文件
scp -r agent-dev/* root@你的服务器IP:/root/games/

# 复制到 web 目录
cp -r /root/games/* /var/www/games/

# 重启 Nginx
systemctl reload nginx
```

## 故障排除

### 1. 无法访问网站

```bash
# 检查 Nginx 状态
sudo systemctl status nginx

# 检查防火墙状态
sudo ufw status

# 检查端口监听
sudo netstat -tlnp | grep nginx
```

### 2. 403 Forbidden 错误

```bash
# 检查文件权限
sudo chown -R www-data:www-data /var/www/games
sudo chmod -R 755 /var/www/games

# 检查 SELinux（如果启用）
sudo getenforce
sudo setenforce 0  # 临时关闭
```

### 3. 中文显示乱码

确保 Nginx 配置中包含：
```nginx
charset utf-8;
```

### 4. 静态资源 404

检查文件是否上传完整：
```bash
ls -la /var/www/games/
```

## 性能优化

### 启用 Gzip 压缩

已在 Nginx 配置中启用，可通过以下命令验证：

```bash
curl -H "Accept-Encoding: gzip" -I http://your-domain.com/style.css
```

### 浏览器缓存

静态资源已配置 30 天缓存，HTML 文件禁用缓存。

### CDN 加速（可选）

如需使用 CDN，可将静态资源上传到 CDN，然后修改 HTML 文件中的引用路径。

## 安全建议

1. **定期更新系统**：
   ```bash
   apt-get update && apt-get upgrade -y
   ```

2. **配置 fail2ban**：
   ```bash
   systemctl enable fail2ban
   systemctl start fail2ban
   ```

3. **配置 SSH 安全**（可选）：
   ```bash
   nano /etc/ssh/sshd_config
   # 建议修改以下配置：
   # PermitRootLogin prohibit-password  # 禁止密码登录，仅允许密钥
   # PasswordAuthentication no          # 禁用密码认证
   systemctl reload sshd
   ```

4. **使用密钥登录**（推荐）：
   ```bash
   # 在本地生成密钥（如果还没有）
   ssh-keygen -t rsa -b 4096
   
   # 上传公钥到服务器
   ssh-copy-id root@your-server-ip
   ```

## 备份与恢复

### 自动备份脚本

创建 `/home/ubuntu/backup.sh`：

```bash
#!/bin/bash
BACKUP_DIR="/var/www/backups"
PROJECT_DIR="/var/www/games"
DATE=$(date +%Y%m%d-%H%M%S)

mkdir -p "$BACKUP_DIR"
tar -czf "$BACKUP_DIR/backup-$DATE.tar.gz" -C "$PROJECT_DIR" .

# 保留最近 10 个备份
ls -t "$BACKUP_DIR"/backup-*.tar.gz | tail -n +11 | xargs -r rm
```

添加定时任务：

```bash
crontab -e
# 添加以下行（每天凌晨 3 点备份）
0 3 * * * /home/ubuntu/backup.sh
```

## 联系支持

如有问题，请检查 Nginx 日志或联系系统管理员。
