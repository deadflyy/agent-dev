#!/bin/bash

# =============================================================================
# 经典游戏合集 - 部署脚本
# =============================================================================
# 使用方法:
#   chmod +x deploy.sh
#   ./deploy.sh
#
# 注意: 本脚本假设以 root 用户运行，项目文件位于 /root/games/
# =============================================================================

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

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

# 项目配置
PROJECT_DIR="/var/www/games"
BACKUP_DIR="/var/www/backups"
SOURCE_DIR=""

# 检查是否为 root 用户
check_root() {
    if [ "$EUID" -ne 0 ]; then
        log_error "请以 root 用户运行此脚本"
        exit 1
    fi
    log_info "当前用户: root"
}

# 检查 Nginx 是否安装
check_nginx() {
    if ! command -v nginx &> /dev/null; then
        log_error "Nginx 未安装，请先运行 setup.sh"
        exit 1
    fi
}

# 备份现有项目
backup_project() {
    if [ -d "$PROJECT_DIR" ] && [ "$(ls -A $PROJECT_DIR)" ]; then
        log_info "正在备份现有项目..."
        mkdir -p "$BACKUP_DIR"
        backup_name="backup-$(date +%Y%m%d-%H%M%S).tar.gz"
        tar -czf "$BACKUP_DIR/$backup_name" -C "$PROJECT_DIR" .
        log_success "备份完成: $BACKUP_DIR/$backup_name"
    else
        log_info "项目目录为空，无需备份"
    fi
}

# 清理项目目录
clean_project_dir() {
    log_info "正在清理项目目录..."
    rm -rf "$PROJECT_DIR"/*
    log_success "项目目录清理完成"
}

# 复制项目文件
copy_project_files() {
    log_info "正在复制项目文件..."
    
    if [ -z "$SOURCE_DIR" ]; then
        # 如果未指定源目录，默认使用 /root/games/
        DEFAULT_SOURCE="/root/games"
        
        if [ -f "$DEFAULT_SOURCE/index.html" ]; then
            SOURCE_DIR="$DEFAULT_SOURCE"
            log_info "使用默认项目目录: /root/games"
        else
            # 尝试从脚本所在目录查找
            SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
            PARENT_DIR="$(dirname "$SCRIPT_DIR")"
            
            if [ -f "$PARENT_DIR/index.html" ]; then
                SOURCE_DIR="$PARENT_DIR"
                log_info "使用脚本所在项目目录: $PARENT_DIR"
            else
                log_error "无法找到项目文件"
                echo ""
                echo "请确保项目文件位于以下位置之一:"
                echo "  1. /root/games/"
                echo "  2. 与 deploy.sh 同级目录"
                echo ""
                echo "或者指定源目录路径:"
                echo "  ./deploy.sh /path/to/project"
                exit 1
            fi
        fi
    fi
    
    # 复制所有项目文件
    cp -r "$SOURCE_DIR"/* "$PROJECT_DIR/"
    
    # 确保文件权限正确
    chmod -R 755 "$PROJECT_DIR"
    
    log_success "项目文件复制完成"
}

# 验证项目文件
verify_project() {
    log_info "正在验证项目文件..."
    
    required_files=("index.html" "style.css" "tank.html" "contra.html" "slacking.html")
    missing_files=()
    
    for file in "${required_files[@]}"; do
        if [ ! -f "$PROJECT_DIR/$file" ]; then
            missing_files+=("$file")
        fi
    done
    
    if [ ${#missing_files[@]} -ne 0 ]; then
        log_error "缺少以下必需文件:"
        for file in "${missing_files[@]}"; do
            echo "  - $file"
        done
        exit 1
    fi
    
    log_success "项目文件验证通过"
}

# 重启 Nginx
restart_nginx() {
    log_info "正在重启 Nginx..."
    systemctl reload nginx
    log_success "Nginx 重启完成"
}

# 显示部署信息
show_deploy_info() {
    echo ""
    echo "========================================"
    echo "  部署完成！"
    echo "========================================"
    echo ""
    echo "  项目路径: $PROJECT_DIR"
    echo "  访问地址: http://$(hostname -I | awk '{print $1}')"
    echo ""
    echo "  项目文件:"
    ls -la "$PROJECT_DIR"
    echo ""
    echo "========================================"
}

# 主函数
main() {
    echo "========================================"
    echo "  经典游戏合集 - 部署脚本"
    echo "========================================"
    echo ""
    
    # 如果提供了源目录参数
    if [ -n "$1" ]; then
        SOURCE_DIR="$1"
    fi
    
    check_root
    check_nginx
    backup_project
    clean_project_dir
    copy_project_files
    verify_project
    restart_nginx
    
    log_success "部署完成！"
    show_deploy_info
}

main "$@"
