#!/bin/bash

# =============================================================================
# 经典游戏合集 - Ubuntu 24.04 环境准备脚本
# =============================================================================
# 使用方法:
#   chmod +x setup.sh
#   ./setup.sh
# 
# 注意: 本脚本假设以 root 用户运行，工作目录为 /root
# =============================================================================

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 日志函数
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 检查是否为 root 用户
check_root() {
    if [ "$EUID" -ne 0 ]; then
        log_error "请以 root 用户运行此脚本"
        exit 1
    fi
    log_info "当前用户: root"
}

# 更新系统包
update_system() {
    log_info "正在更新系统包..."
    apt-get update -y
    apt-get upgrade -y
    log_success "系统包更新完成"
}

# 安装基础依赖
install_base_deps() {
    log_info "正在安装基础依赖..."
    apt-get install -y \
        curl \
        wget \
        git \
        vim \
        nano \
        unzip \
        zip \
        tar \
        htop \
        net-tools \
        ufw \
        fail2ban
    log_success "基础依赖安装完成"
}

# 安装 Nginx
install_nginx() {
    log_info "正在安装 Nginx..."
    apt-get install -y nginx
    systemctl enable nginx
    systemctl start nginx
    log_success "Nginx 安装完成"
}

# 配置防火墙
setup_firewall() {
    log_info "正在配置防火墙..."
    ufw default deny incoming
    ufw default allow outgoing
    ufw allow ssh
    ufw allow 80/tcp
    ufw allow 443/tcp
    ufw --force enable
    log_success "防火墙配置完成"
}

# 配置 fail2ban
setup_fail2ban() {
    log_info "正在配置 fail2ban..."
    systemctl enable fail2ban
    systemctl start fail2ban
    log_success "fail2ban 配置完成"
}

# 创建项目目录
setup_project_dir() {
    log_info "正在创建项目目录..."
    mkdir -p /var/www/games
    mkdir -p /var/www/backups
    chmod -R 755 /var/www/games
    chmod -R 755 /var/www/backups
    log_success "项目目录创建完成: /var/www/games"
}

# 配置 Nginx 站点
setup_nginx_config() {
    log_info "正在配置 Nginx 站点..."
    
    cat > /etc/nginx/sites-available/games << 'EOF'
server {
    listen 80;
    listen [::]:80;
    
    server_name _;  # 接受所有域名，或替换为你的域名
    
    root /var/www/games;
    index index.html;
    
    # 字符编码
    charset utf-8;
    
    # 日志配置
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
    
    # 主入口
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
EOF

    # 启用站点
    ln -sf /etc/nginx/sites-available/games /etc/nginx/sites-enabled/games
    
    # 删除默认站点
    rm -f /etc/nginx/sites-enabled/default
    
    # 测试配置
    nginx -t
    
    # 重载 Nginx
    systemctl reload nginx
    
    log_success "Nginx 站点配置完成"
}

# 配置 HTTPS (可选，使用 Certbot)
setup_https() {
    log_info "是否配置 HTTPS? (需要域名) [y/N]"
    read -r response
    if [[ "$response" =~ ^([yY][eE][sS]|[yY])$ ]]; then
        log_info "正在安装 Certbot..."
        apt-get install -y certbot python3-certbot-nginx
        
        log_info "请输入你的域名:"
        read -r domain
        
        if [ -n "$domain" ]; then
            certbot --nginx -d "$domain" --non-interactive --agree-tos --email admin@$domain
            log_success "HTTPS 配置完成"
        else
            log_warn "未输入域名，跳过 HTTPS 配置"
        fi
    else
        log_info "跳过 HTTPS 配置"
    fi
}

# 显示系统信息
show_system_info() {
    log_info "系统信息:"
    echo "  操作系统: $(lsb_release -d | cut -f2)"
    echo "  内核版本: $(uname -r)"
    echo "  Nginx 版本: $(nginx -v 2>&1 | head -1)"
    echo "  IP 地址: $(hostname -I | awk '{print $1}')"
}

# 主函数
main() {
    echo "========================================"
    echo "  经典游戏合集 - 环境准备脚本"
    echo "========================================"
    echo ""
    
    check_root
    update_system
    install_base_deps
    install_nginx
    setup_firewall
    setup_fail2ban
    setup_project_dir
    setup_nginx_config
    
    echo ""
    log_success "基础环境准备完成！"
    echo ""
    
    # 询问是否配置 HTTPS
    setup_https
    
    echo ""
    show_system_info
    echo ""
    echo "========================================"
    echo "  下一步操作:"
    echo "  1. 将项目文件上传到 /root/games/"
    echo "  2. 进入 /root/games/deploy/ 目录"
    echo "  3. 运行 ./deploy.sh 完成部署"
    echo "========================================"
}

main "$@"
