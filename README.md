# 经典游戏合集

一个包含多个经典小游戏的在线游戏平台，支持用户注册登录和游戏进度保存。

## 功能特点

- 🎮 **5款经典游戏**：坦克大战、魂斗罗、课堂划水游戏、小猫回家、医生救小兔
- 👤 **用户系统**：支持注册、登录、个人进度保存
- 💾 **进度同步**：登录后可保存和加载游戏进度，下次继续玩
- 📱 **响应式设计**：支持 PC 和移动设备
- 🎨 **精美界面**：深色主题，现代游戏卡片设计

## 游戏介绍

### 1. 坦克大战
经典红白机风格坦克对战游戏，保护基地，消灭敌军。

- **操作**：WASD/方向键移动，空格键射击
- **目标**：消灭所有敌方坦克，进入下一关

### 2. 魂斗罗
横版动作射击游戏，勇闯敌营，拯救世界。

- **操作**：WASD/方向键移动，K/Z跳跃，J/X射击
- **目标**：消灭敌人，到达关卡终点

### 3. 课堂划水游戏
老师与学生之间的博弈休闲游戏。

- **操作**：点击选择选项
- **目标**：在回合中获得更高分

### 4. 小猫回家
益智学习游戏，帮助小猫找到回家的路。

- **操作**：点击地面移动猫咪
- **内容**：数学、字母、颜色认知

### 5. 医生救小兔
帮助医生收集药片救治生病的小兔子。

- **操作**：点击地面移动医生
- **内容**：解答数学题、收集药片

## 技术栈

- **前端**：原生 HTML5、CSS3、JavaScript
- **后端**：Node.js + Express
- **数据库**：SQLite (sql.js)
- **认证**：JWT + bcrypt

## 快速开始

### 本地运行

```bash
# 1. 安装依赖
npm install

# 2. 启动服务器
npm start

# 3. 访问游戏
open http://localhost:3000
```

### 部署到服务器

#### Ubuntu/Nginx 部署

```bash
# 1. 安装 Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# 2. 上传项目
scp -r . user@your-server:/var/www/games/

# 3. 安装依赖
cd /var/www/games
npm install --production

# 4. 使用 PM2 运行
sudo npm install -g pm2
pm2 start server.js --name games

# 5. 配置 Nginx 反向代理
sudo nano /etc/nginx/sites-available/games
```

Nginx 配置：

```nginx
server {
    listen 80;
    server_name your-domain.com;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
# 6. 启用站点
sudo ln -sf /etc/nginx/sites-available/games /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

## 目录结构

```
agent-dev/
├── index.html          # 游戏选择主页
├── style.css          # 全局样式
├── auth.js            # 认证模块
├── server.js          # 后端服务
├── package.json      # 项目配置
│
├── tank.html         # 坦克大战
├── tank.js           
├── contra.html       # 魂斗罗
├── contra.js         
├── slacking.html    # 课堂划水游戏
├── slacking.js      
├── cat.html         # 小猫回家
├── cat.js           
├── cat.css          
├── doctor.html      # 医生救小兔
├── doctor.js        
├── doctor.css       
│
├── deploy/           # 部署脚本
│   ├── setup.sh     
│   ├── deploy.sh    
│   └── DEPLOY.md    
│
└── 老师.jpg          # 游戏素材
```

## API 接口

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | /api/register | 用户注册 |
| POST | /api/login | 用户登录 |
| GET | /api/progress/:gameName | 获取进度 |
| POST | /api/progress/:gameName | 保存进度 |

## 开发

```bash
# 开发模式
npm run dev

# 代码检查
# (根据需要添加 lint 命令)
```

## 许可证

MIT License