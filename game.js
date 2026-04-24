class TankGame {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');

        this.tileSize = 32;
        this.mapWidth = 26;
        this.mapHeight = 26;
        this.canvas.width = this.mapWidth * this.tileSize;
        this.canvas.height = this.mapHeight * this.tileSize;

        this.gameState = 'menu';
        this.score = 0;
        this.lives = 3;
        this.level = 1;
        this.maxEnemies = 20;
        this.enemiesKilled = 0;
        this.enemiesOnScreen = 0;
        this.maxEnemiesOnScreen = 4;

        this.keys = {};
        this.lastShotTime = 0;
        this.shotCooldown = 300;

        this.player = null;
        this.enemies = [];
        this.bullets = [];
        this.particles = [];
        this.powerUps = [];

        this.map = [];
        this.base = null;

        this.enemySpawnTimer = 0;
        this.enemySpawnInterval = 2000;

        // Screen shake
        this.shakeTimer = 0;
        this.shakeIntensity = 0;

        // High score
        this.highScore = parseInt(localStorage.getItem('tankHighScore') || '0');

        // Wall brick pattern offscreen canvas
        this.wallCanvas1 = null;
        this.wallCanvas2 = null;

        // Audio
        this.audioCtx = null;

        // Touch controls
        this.touchDir = null;
        this.touchShoot = false;

        this.init();
    }

    initAudio() {
        if (this.audioCtx) return;
        this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }

    playSound(type) {
        if (!this.audioCtx) return;
        const ctx = this.audioCtx;
        const now = ctx.currentTime;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);

        switch (type) {
            case 'shoot':
                osc.type = 'square';
                osc.frequency.setValueAtTime(600, now);
                osc.frequency.exponentialRampToValueAtTime(200, now + 0.1);
                gain.gain.setValueAtTime(0.15, now);
                gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
                osc.start(now);
                osc.stop(now + 0.1);
                break;
            case 'explosion':
                osc.type = 'sawtooth';
                osc.frequency.setValueAtTime(200, now);
                osc.frequency.exponentialRampToValueAtTime(30, now + 0.3);
                gain.gain.setValueAtTime(0.2, now);
                gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
                osc.start(now);
                osc.stop(now + 0.3);
                break;
            case 'powerup':
                osc.type = 'sine';
                osc.frequency.setValueAtTime(400, now);
                osc.frequency.exponentialRampToValueAtTime(800, now + 0.15);
                gain.gain.setValueAtTime(0.15, now);
                gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
                osc.start(now);
                osc.stop(now + 0.2);
                break;
            case 'hit':
                osc.type = 'triangle';
                osc.frequency.setValueAtTime(300, now);
                osc.frequency.exponentialRampToValueAtTime(100, now + 0.15);
                gain.gain.setValueAtTime(0.2, now);
                gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
                osc.start(now);
                osc.stop(now + 0.15);
                break;
            case 'victory':
                osc.type = 'square';
                [523, 659, 784, 1047].forEach((freq, i) => {
                    osc.frequency.setValueAtTime(freq, now + i * 0.15);
                });
                gain.gain.setValueAtTime(0.12, now);
                gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
                osc.start(now);
                osc.stop(now + 0.6);
                break;
            case 'gameover':
                osc.type = 'sawtooth';
                osc.frequency.setValueAtTime(300, now);
                osc.frequency.exponentialRampToValueAtTime(80, now + 0.5);
                gain.gain.setValueAtTime(0.15, now);
                gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
                osc.start(now);
                osc.stop(now + 0.5);
                break;
        }
    }

    buildWallPatterns() {
        // Indestructible wall pattern
        this.wallCanvas1 = document.createElement('canvas');
        this.wallCanvas1.width = this.tileSize;
        this.wallCanvas1.height = this.tileSize;
        const c1 = this.wallCanvas1.getContext('2d');
        c1.fillStyle = '#7f8c8d';
        c1.fillRect(0, 0, 32, 32);
        c1.fillStyle = '#95a5a6';
        c1.fillRect(2, 2, 28, 28);
        // Steel rivet dots
        c1.fillStyle = '#aab7b8';
        c1.beginPath(); c1.arc(8, 8, 2, 0, Math.PI * 2); c1.fill();
        c1.beginPath(); c1.arc(24, 8, 2, 0, Math.PI * 2); c1.fill();
        c1.beginPath(); c1.arc(8, 24, 2, 0, Math.PI * 2); c1.fill();
        c1.beginPath(); c1.arc(24, 24, 2, 0, Math.PI * 2); c1.fill();

        // Destructible wall pattern (bricks)
        this.wallCanvas2 = document.createElement('canvas');
        this.wallCanvas2.width = this.tileSize;
        this.wallCanvas2.height = this.tileSize;
        const c2 = this.wallCanvas2.getContext('2d');
        c2.fillStyle = '#8B4513';
        c2.fillRect(0, 0, 32, 32);
        c2.strokeStyle = '#5D2E0C';
        c2.lineWidth = 1;
        // Horizontal lines
        c2.beginPath();
        c2.moveTo(0, 8); c2.lineTo(32, 8);
        c2.moveTo(0, 16); c2.lineTo(32, 16);
        c2.moveTo(0, 24); c2.lineTo(32, 24);
        c2.stroke();
        // Vertical brick lines (offset per row)
        c2.beginPath();
        c2.moveTo(16, 0); c2.lineTo(16, 8);
        c2.moveTo(8, 8); c2.lineTo(8, 16);
        c2.moveTo(24, 8); c2.lineTo(24, 16);
        c2.moveTo(16, 16); c2.lineTo(16, 24);
        c2.moveTo(8, 24); c2.lineTo(8, 32);
        c2.moveTo(24, 24); c2.lineTo(24, 32);
        c2.stroke();
        // Highlight
        c2.fillStyle = '#A0522D';
        c2.fillRect(1, 1, 14, 6);
        c2.fillRect(17, 9, 6, 6);
        c2.fillRect(1, 17, 14, 6);
        c2.fillRect(17, 25, 6, 6);
    }

    init() {
        this.buildWallPatterns();
        this.bindEvents();
        this.generateMap();
        this.resetGame();
        this.gameLoop();
    }

    bindEvents() {
        document.addEventListener('keydown', (e) => {
            this.keys[e.code] = true;

            if (e.code === 'Space') {
                e.preventDefault();
                this.initAudio();
                if (this.gameState === 'menu' || this.gameState === 'gameover' || this.gameState === 'victory') {
                    this.startGame();
                }
            }

            if (e.code === 'Enter') {
                e.preventDefault();
                this.initAudio();
                if (this.gameState === 'menu' || this.gameState === 'gameover' || this.gameState === 'victory') {
                    this.startGame();
                }
            }

            if (e.code === 'KeyP') {
                this.togglePause();
            }
        });

        document.addEventListener('keyup', (e) => {
            this.keys[e.code] = false;
        });

        document.getElementById('startBtn').addEventListener('click', () => {
            this.initAudio();
            this.startGame();
        });

        // Touch controls
        this.canvas.addEventListener('touchstart', (e) => {
            e.preventDefault();
            this.initAudio();
            const rect = this.canvas.getBoundingClientRect();
            for (const touch of e.changedTouches) {
                const tx = touch.clientX - rect.left;
                const ty = touch.clientY - rect.top;
                const cx = rect.width / 2;
                const cy = rect.height / 2;
                if (tx > cx + rect.width * 0.15) {
                    this.touchShoot = true;
                } else {
                    const dx = tx - cx;
                    const dy = ty - cy;
                    if (Math.abs(dx) > Math.abs(dy)) {
                        this.touchDir = dx > 0 ? 'right' : 'left';
                    } else {
                        this.touchDir = dy > 0 ? 'down' : 'up';
                    }
                }
            }
            if (this.gameState !== 'playing') this.startGame();
        }, { passive: false });

        this.canvas.addEventListener('touchend', (e) => {
            e.preventDefault();
            this.touchDir = null;
            this.touchShoot = false;
        }, { passive: false });
    }

    generateMap() {
        this.map = [];
        for (let y = 0; y < this.mapHeight; y++) {
            this.map[y] = [];
            for (let x = 0; x < this.mapWidth; x++) {
                if (x === 0 || x === this.mapWidth - 1 || y === 0 || y === this.mapHeight - 1) {
                    this.map[y][x] = 1;
                } else {
                    this.map[y][x] = 0;
                }
            }
        }

        for (let y = 3; y < this.mapHeight - 1; y += 4) {
            for (let x = 3; x < this.mapWidth - 1; x += 4) {
                if (this.map[y][x] === 0) {
                    this.map[y][x] = 1;
                }
            }
        }

        for (let i = 0; i < 50; i++) {
            const x = Math.floor(Math.random() * (this.mapWidth - 2)) + 1;
            const y = Math.floor(Math.random() * (this.mapHeight - 2)) + 1;
            if (this.map[y][x] === 0 && !(x < 6 && y < 6) && !(x > this.mapWidth - 7 && y > this.mapHeight - 7)) {
                this.map[y][x] = 2;
            }
        }

        this.base = {
            x: Math.floor(this.mapWidth / 2) * this.tileSize,
            y: (this.mapHeight - 2) * this.tileSize,
            width: this.tileSize * 2,
            height: this.tileSize * 2,
            alive: true
        };

        const baseX = Math.floor(this.mapWidth / 2);
        const baseY = this.mapHeight - 3;
        for (let dx = -1; dx <= 2; dx++) {
            for (let dy = 0; dy <= 1; dy++) {
                if (baseX + dx >= 0 && baseX + dx < this.mapWidth && baseY + dy >= 0 && baseY + dy < this.mapHeight) {
                    if (this.map[baseY + dy][baseX + dx] === 0) {
                        this.map[baseY + dy][baseX + dx] = 2;
                    }
                }
            }
        }
    }

    resetGame() {
        this.player = {
            x: this.tileSize * 4,
            y: this.tileSize * 4,
            width: this.tileSize - 4,
            height: this.tileSize - 4,
            speed: 2,
            baseSpeed: 2,
            direction: 'up',
            alive: true,
            invincible: false,
            invincibleTimer: 0,
            speedBuffTimer: 0
        };

        this.enemies = [];
        this.bullets = [];
        this.particles = [];
        this.powerUps = [];
        this.enemiesOnScreen = 0;
        this.enemiesKilled = 0;
        this.shakeTimer = 0;

        this.updateUI();
    }

    startGame() {
        this.gameState = 'playing';
        document.getElementById('gameOverlay').classList.add('hidden');
        this.resetGame();
        this.generateMap();
    }

    togglePause() {
        if (this.gameState === 'playing') {
            this.gameState = 'paused';
            document.getElementById('overlayTitle').textContent = '游戏暂停';
            document.getElementById('overlayText').textContent = '按 P 键继续游戏';
            document.getElementById('startBtn').textContent = '继续游戏';
            document.getElementById('gameOverlay').classList.remove('hidden');
        } else if (this.gameState === 'paused') {
            this.gameState = 'playing';
            document.getElementById('gameOverlay').classList.add('hidden');
        }
    }

    gameOver() {
        this.gameState = 'gameover';
        this.playSound('gameover');
        if (this.score > this.highScore) {
            this.highScore = this.score;
            localStorage.setItem('tankHighScore', String(this.highScore));
        }
        document.getElementById('overlayTitle').textContent = '游戏结束';
        document.getElementById('overlayText').textContent = `最终得分: ${this.score}  |  最高分: ${this.highScore}`;
        document.getElementById('startBtn').textContent = '重新开始';
        document.getElementById('gameOverlay').classList.remove('hidden');
    }

    victory() {
        this.gameState = 'victory';
        this.level++;
        this.playSound('victory');
        document.getElementById('overlayTitle').textContent = '关卡完成!';
        document.getElementById('overlayText').textContent = `进入第 ${this.level} 关  |  最高分: ${this.highScore}`;
        document.getElementById('startBtn').textContent = '下一关';
        document.getElementById('gameOverlay').classList.remove('hidden');
    }

    getDifficultyMultiplier() {
        return 1 + (this.level - 1) * 0.15;
    }

    update(dt) {
        if (this.gameState !== 'playing') return;

        // Screen shake
        if (this.shakeTimer > 0) {
            this.shakeTimer -= dt;
        }

        this.updatePlayer(dt);
        this.updateEnemies(dt);
        this.updateBullets(dt);
        this.updateParticles(dt);
        this.updatePowerUps(dt);
        this.spawnEnemies(dt);
        this.checkCollisions();
        this.checkGameState();

        // Buff timers
        if (this.player.invincible) {
            this.player.invincibleTimer -= dt;
            if (this.player.invincibleTimer <= 0) {
                this.player.invincible = false;
            }
        }
        if (this.player.speedBuffTimer > 0) {
            this.player.speedBuffTimer -= dt;
            if (this.player.speedBuffTimer <= 0) {
                this.player.speed = this.player.baseSpeed;
            }
        }

        // Auto-fire when holding space
        if (this.keys['Space']) {
            this.playerShoot();
        }
        if (this.touchShoot) {
            this.playerShoot();
        }
    }

    updatePlayer(dt) {
        if (!this.player.alive) return;

        let dx = 0;
        let dy = 0;

        const dir = this.touchDir;
        if (this.keys['KeyW'] || this.keys['ArrowUp'] || dir === 'up') {
            dy = -this.player.speed;
            this.player.direction = 'up';
        } else if (this.keys['KeyS'] || this.keys['ArrowDown'] || dir === 'down') {
            dy = this.player.speed;
            this.player.direction = 'down';
        } else if (this.keys['KeyA'] || this.keys['ArrowLeft'] || dir === 'left') {
            dx = -this.player.speed;
            this.player.direction = 'left';
        } else if (this.keys['KeyD'] || this.keys['ArrowRight'] || dir === 'right') {
            dx = this.player.speed;
            this.player.direction = 'right';
        }

        const newX = this.player.x + dx;
        const newY = this.player.y + dy;

        if (this.canMove(newX, newY, this.player.width, this.player.height)) {
            this.player.x = newX;
            this.player.y = newY;
        }

        this.player.x = Math.max(0, Math.min(this.canvas.width - this.player.width, this.player.x));
        this.player.y = Math.max(0, Math.min(this.canvas.height - this.player.height, this.player.y));
    }

    updateEnemies(dt) {
        const diff = this.getDifficultyMultiplier();

        this.enemies.forEach(enemy => {
            if (!enemy.alive) return;

            enemy.moveTimer += dt;
            enemy.shootTimer += dt;

            // Smart AI: track player when in range
            const distToPlayer = Math.abs(enemy.x - this.player.x) + Math.abs(enemy.y - this.player.y);
            if (distToPlayer < this.tileSize * 8 && this.player.alive) {
                // Chase mode: pick direction toward player
                const dx = this.player.x - enemy.x;
                const dy = this.player.y - enemy.y;
                if (Math.abs(dx) > Math.abs(dy)) {
                    enemy.direction = dx > 0 ? 'right' : 'left';
                } else {
                    enemy.direction = dy > 0 ? 'down' : 'up';
                }
                enemy.moveTimer = 0;
            } else if (enemy.moveTimer > enemy.moveInterval) {
                enemy.moveTimer = 0;
                enemy.direction = this.getRandomDirection();
                enemy.moveInterval = Math.random() * 2000 + 1000;
            }

            let edx = 0;
            let edy = 0;

            switch (enemy.direction) {
                case 'up': edy = -enemy.speed; break;
                case 'down': edy = enemy.speed; break;
                case 'left': edx = -enemy.speed; break;
                case 'right': edx = enemy.speed; break;
            }

            const newX = enemy.x + edx;
            const newY = enemy.y + edy;

            if (this.canMove(newX, newY, enemy.width, enemy.height)) {
                enemy.x = newX;
                enemy.y = newY;
            } else {
                enemy.direction = this.getRandomDirection();
            }

            if (enemy.shootTimer > enemy.shootInterval / diff) {
                enemy.shootTimer = 0;
                this.enemyShoot(enemy);
            }
        });
    }

    updateBullets(dt) {
        this.bullets = this.bullets.filter(bullet => {
            if (!bullet.alive) return false;

            switch (bullet.direction) {
                case 'up': bullet.y -= bullet.speed; break;
                case 'down': bullet.y += bullet.speed; break;
                case 'left': bullet.x -= bullet.speed; break;
                case 'right': bullet.x += bullet.speed; break;
            }

            if (bullet.x < 0 || bullet.x > this.canvas.width ||
                bullet.y < 0 || bullet.y > this.canvas.height) {
                return false;
            }

            return true;
        });
    }

    updateParticles(dt) {
        this.particles = this.particles.filter(particle => {
            particle.life -= dt;
            particle.x += particle.vx;
            particle.y += particle.vy;
            particle.vy += particle.gravity || 0;
            return particle.life > 0;
        });
    }

    updatePowerUps(dt) {
        this.powerUps = this.powerUps.filter(powerUp => {
            powerUp.life -= dt;
            return powerUp.life > 0;
        });
    }

    spawnEnemies(dt) {
        const diff = this.getDifficultyMultiplier();
        const maxOnScreen = Math.min(4 + Math.floor(this.level / 2), 8);

        if (this.enemiesOnScreen >= maxOnScreen) return;
        if (this.enemiesKilled + this.enemiesOnScreen >= this.maxEnemies) return;

        this.enemySpawnTimer += dt;
        if (this.enemySpawnTimer > this.enemySpawnInterval / diff) {
            this.enemySpawnTimer = 0;

            const spawnPoints = [
                { x: this.tileSize, y: this.tileSize },
                { x: (this.mapWidth - 2) * this.tileSize, y: this.tileSize },
                { x: Math.floor(this.mapWidth / 2) * this.tileSize, y: this.tileSize }
            ];

            const spawn = spawnPoints[Math.floor(Math.random() * spawnPoints.length)];

            // Armored enemy type at higher levels
            const roll = Math.random();
            let type = 'normal';
            if (this.level >= 3 && roll > 0.85) {
                type = 'armored';
            } else if (roll > 0.6) {
                type = 'fast';
            }

            const enemy = {
                x: spawn.x,
                y: spawn.y,
                width: this.tileSize - 4,
                height: this.tileSize - 4,
                speed: 1 + Math.random() * 0.5,
                direction: 'down',
                alive: true,
                moveTimer: 0,
                moveInterval: 1500,
                shootTimer: 0,
                shootInterval: 2000 + Math.random() * 2000,
                type: type,
                health: 1,
                flashTimer: 0
            };

            if (type === 'fast') {
                enemy.speed = 2 * diff;
                enemy.shootInterval = 1500;
            } else if (type === 'armored') {
                enemy.speed = 0.8;
                enemy.health = 3;
                enemy.shootInterval = 2500;
                enemy.width = this.tileSize;
                enemy.height = this.tileSize;
            }

            this.enemies.push(enemy);
            this.enemiesOnScreen++;
        }
    }

    checkCollisions() {
        for (let i = this.bullets.length - 1; i >= 0; i--) {
            const bullet = this.bullets[i];
            if (!bullet.alive) continue;

            let bulletDestroyed = false;

            const tileX = Math.floor((bullet.x + bullet.width / 2) / this.tileSize);
            const tileY = Math.floor((bullet.y + bullet.height / 2) / this.tileSize);

            if (tileX >= 0 && tileX < this.mapWidth && tileY >= 0 && tileY < this.mapHeight) {
                if (this.map[tileY][tileX] === 1) {
                    bullet.alive = false;
                    bulletDestroyed = true;
                    this.createParticles(bullet.x + bullet.width / 2, bullet.y + bullet.height / 2, '#95a5a6', 6);
                } else if (this.map[tileY][tileX] === 2) {
                    bullet.alive = false;
                    bulletDestroyed = true;
                    this.map[tileY][tileX] = 0;
                    this.createParticles(bullet.x + bullet.width / 2, bullet.y + bullet.height / 2, '#A0522D', 10);
                    this.playSound('explosion');

                    if (Math.random() > 0.8) {
                        this.spawnPowerUp(tileX * this.tileSize, tileY * this.tileSize);
                    }
                }
            }

            if (bulletDestroyed) continue;

            if (bullet.owner === 'player') {
                for (let j = this.enemies.length - 1; j >= 0; j--) {
                    const enemy = this.enemies[j];
                    if (!enemy.alive) continue;
                    if (this.checkRectCollision(bullet, enemy)) {
                        bullet.alive = false;
                        enemy.health--;
                        enemy.flashTimer = 100;

                        if (enemy.health <= 0) {
                            enemy.alive = false;
                            this.enemiesOnScreen--;
                            this.enemiesKilled++;
                            const scoreMap = { fast: 200, armored: 300, normal: 100 };
                            this.score += scoreMap[enemy.type] || 100;
                            this.createExplosion(enemy.x + enemy.width / 2, enemy.y + enemy.height / 2);
                            this.playSound('explosion');
                            this.shakeTimer = 150;
                            this.shakeIntensity = 4;

                            if (Math.random() > 0.8) {
                                this.spawnPowerUp(enemy.x, enemy.y);
                            }
                        } else {
                            this.playSound('hit');
                        }

                        this.updateUI();
                        bulletDestroyed = true;
                        break;
                    }
                }
            } else {
                if (this.player.alive && !this.player.invincible &&
                    this.checkRectCollision(bullet, this.player)) {
                    bullet.alive = false;
                    this.playerHit();
                    bulletDestroyed = true;
                }
            }

            if (bulletDestroyed) continue;

            if (this.base.alive && this.checkRectCollision(bullet, this.base)) {
                bullet.alive = false;
                this.base.alive = false;
                this.createExplosion(this.base.x + this.base.width / 2, this.base.y + this.base.height / 2);
                this.playSound('explosion');
                this.shakeTimer = 300;
                this.shakeIntensity = 8;
                this.gameOver();
            }
        }

        for (let i = this.powerUps.length - 1; i >= 0; i--) {
            const powerUp = this.powerUps[i];
            if (this.player.alive && this.checkRectCollision(this.player, powerUp)) {
                this.applyPowerUp(powerUp.type);
                powerUp.life = 0;
                this.playSound('powerup');
            }
        }
    }

    checkGameState() {
        if (this.enemiesKilled >= this.maxEnemies && this.enemiesOnScreen === 0) {
            this.victory();
        }
    }

    playerShoot() {
        const now = Date.now();
        if (now - this.lastShotTime < this.shotCooldown) return;
        this.lastShotTime = now;

        if (!this.player.alive) return;

        const bullet = this.createBullet(this.player, 'player', 5);
        this.bullets.push(bullet);
        this.playSound('shoot');
    }

    enemyShoot(enemy) {
        const bullet = this.createBullet(enemy, 'enemy', 4);
        this.bullets.push(bullet);
    }

    createBullet(tank, owner, speed) {
        const centerX = tank.x + tank.width / 2;
        const centerY = tank.y + tank.height / 2;
        let bulletX = centerX - 2;
        let bulletY = centerY - 2;

        const barrelLength = 14;

        switch (tank.direction) {
            case 'up':
                bulletX = centerX - 2;
                bulletY = tank.y - barrelLength;
                break;
            case 'down':
                bulletX = centerX - 2;
                bulletY = tank.y + tank.height + barrelLength - 4;
                break;
            case 'left':
                bulletX = tank.x - barrelLength;
                bulletY = centerY - 2;
                break;
            case 'right':
                bulletX = tank.x + tank.width + barrelLength - 4;
                bulletY = centerY - 2;
                break;
        }

        return {
            x: bulletX,
            y: bulletY,
            width: 4,
            height: 4,
            speed: speed,
            direction: tank.direction,
            alive: true,
            owner: owner
        };
    }

    playerHit() {
        this.lives--;
        this.updateUI();
        this.playSound('hit');
        this.shakeTimer = 200;
        this.shakeIntensity = 6;

        if (this.lives <= 0) {
            this.player.alive = false;
            this.createExplosion(this.player.x + this.player.width / 2, this.player.y + this.player.height / 2);
            this.gameOver();
        } else {
            this.player.invincible = true;
            this.player.invincibleTimer = 3000;
            this.player.x = this.tileSize * 4;
            this.player.y = this.tileSize * 4;
            this.player.direction = 'up';
        }
    }

    spawnPowerUp(x, y) {
        const types = ['life', 'speed', 'shield'];
        const type = types[Math.floor(Math.random() * types.length)];

        this.powerUps.push({
            x: x,
            y: y,
            width: this.tileSize,
            height: this.tileSize,
            type: type,
            life: 10000,
            pulse: 0
        });
    }

    applyPowerUp(type) {
        switch (type) {
            case 'life':
                this.lives++;
                break;
            case 'speed':
                this.player.speed = 4;
                this.player.speedBuffTimer = 5000;
                break;
            case 'shield':
                this.player.invincible = true;
                this.player.invincibleTimer = 5000;
                break;
        }
        this.updateUI();
    }

    canMove(x, y, width, height) {
        const margin = 1;
        const points = [
            { x: x + margin, y: y + margin },
            { x: x + width - margin, y: y + margin },
            { x: x + margin, y: y + height - margin },
            { x: x + width - margin, y: y + height - margin }
        ];

        for (const point of points) {
            const tileX = Math.floor(point.x / this.tileSize);
            const tileY = Math.floor(point.y / this.tileSize);

            if (tileX < 0 || tileX >= this.mapWidth || tileY < 0 || tileY >= this.mapHeight) {
                return false;
            }

            if (this.map[tileY][tileX] !== 0) {
                return false;
            }
        }

        return true;
    }

    checkRectCollision(rect1, rect2) {
        return rect1.x < rect2.x + rect2.width &&
               rect1.x + rect1.width > rect2.x &&
               rect1.y < rect2.y + rect2.height &&
               rect1.y + rect1.height > rect2.y;
    }

    getRandomDirection() {
        const directions = ['up', 'down', 'left', 'right'];
        return directions[Math.floor(Math.random() * directions.length)];
    }

    createParticles(x, y, color, count) {
        for (let i = 0; i < count; i++) {
            this.particles.push({
                x: x,
                y: y,
                vx: (Math.random() - 0.5) * 3,
                vy: (Math.random() - 0.5) * 3,
                life: 300 + Math.random() * 300,
                color: color,
                size: Math.random() * 3 + 1,
                gravity: 0
            });
        }
    }

    createExplosion(x, y) {
        // Hot core particles
        for (let i = 0; i < 12; i++) {
            const angle = (Math.PI * 2 / 12) * i;
            const speed = 1 + Math.random() * 2;
            this.particles.push({
                x: x,
                y: y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                life: 200 + Math.random() * 200,
                color: Math.random() > 0.5 ? '#f39c12' : '#e74c3c',
                size: 2 + Math.random() * 3,
                gravity: 0.02
            });
        }
        // Smoke particles
        for (let i = 0; i < 6; i++) {
            this.particles.push({
                x: x + (Math.random() - 0.5) * 10,
                y: y + (Math.random() - 0.5) * 10,
                vx: (Math.random() - 0.5) * 0.5,
                vy: -0.5 - Math.random() * 0.5,
                life: 400 + Math.random() * 300,
                color: '#7f8c8d',
                size: 4 + Math.random() * 4,
                gravity: -0.01
            });
        }
    }

    draw() {
        const ctx = this.ctx;

        ctx.save();

        // Screen shake
        if (this.shakeTimer > 0) {
            const intensity = this.shakeIntensity * (this.shakeTimer / 300);
            ctx.translate(
                (Math.random() - 0.5) * intensity,
                (Math.random() - 0.5) * intensity
            );
        }

        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        this.drawMap();
        this.drawBase();

        if (this.player.alive) {
            this.drawTank(this.player, '#3498db', true);
        }

        this.enemies.forEach(enemy => {
            if (enemy.alive) {
                const colors = { normal: '#e67e22', fast: '#e74c3c', armored: '#7f8c8d' };
                this.drawTank(enemy, colors[enemy.type] || '#e67e22', false);
            }
        });

        this.bullets.forEach(bullet => {
            if (bullet.alive) {
                this.drawBullet(bullet);
            }
        });

        this.particles.forEach(particle => {
            ctx.fillStyle = particle.color;
            ctx.globalAlpha = Math.max(0, particle.life / 600);
            if (particle.size > 3) {
                ctx.beginPath();
                ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
                ctx.fill();
            } else {
                ctx.fillRect(particle.x - particle.size / 2, particle.y - particle.size / 2, particle.size, particle.size);
            }
        });
        ctx.globalAlpha = 1;

        this.powerUps.forEach(powerUp => {
            this.drawPowerUp(powerUp);
        });

        ctx.restore();
    }

    drawMap() {
        for (let y = 0; y < this.mapHeight; y++) {
            for (let x = 0; x < this.mapWidth; x++) {
                const px = x * this.tileSize;
                const py = y * this.tileSize;
                if (this.map[y][x] === 1) {
                    this.ctx.drawImage(this.wallCanvas1, px, py);
                } else if (this.map[y][x] === 2) {
                    this.ctx.drawImage(this.wallCanvas2, px, py);
                }
            }
        }
    }

    drawBase() {
        if (!this.base.alive) return;

        const ctx = this.ctx;
        const b = this.base;

        // Bunker shape
        ctx.fillStyle = '#555';
        ctx.fillRect(b.x - 2, b.y - 2, b.width + 4, b.height + 4);
        ctx.fillStyle = '#f39c12';
        ctx.fillRect(b.x, b.y, b.width, b.height);
        ctx.fillStyle = '#e67e22';
        ctx.fillRect(b.x + 4, b.y + 4, b.width - 8, b.height - 8);

        // Star
        ctx.fillStyle = '#f1c40f';
        ctx.font = 'bold 22px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('★', b.x + b.width / 2, b.y + b.height / 2);

        // Flag pole
        ctx.fillStyle = '#aaa';
        ctx.fillRect(b.x + b.width / 2 - 1, b.y - 20, 2, 20);
        ctx.fillStyle = '#e74c3c';
        ctx.beginPath();
        ctx.moveTo(b.x + b.width / 2 + 1, b.y - 20);
        ctx.lineTo(b.x + b.width / 2 + 15, b.y - 14);
        ctx.lineTo(b.x + b.width / 2 + 1, b.y - 8);
        ctx.fill();
    }

    drawTank(tank, color, isPlayer) {
        const ctx = this.ctx;
        ctx.save();

        if (tank.invincible && Math.floor(Date.now() / 100) % 2 === 0) {
            ctx.globalAlpha = 0.5;
        }

        // Shadow
        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        ctx.fillRect(tank.x + 3, tank.y + 3, tank.width, tank.height);

        // Body
        ctx.fillStyle = color;
        ctx.fillRect(tank.x, tank.y, tank.width, tank.height);

        // Turret
        const centerX = tank.x + tank.width / 2;
        const centerY = tank.y + tank.height / 2;
        ctx.fillStyle = isPlayer ? '#2980b9' : '#c0392b';
        ctx.fillRect(centerX - 6, centerY - 6, 12, 12);

        // Track lines (animated)
        const trackOffset = (Date.now() / 50) % 4;
        ctx.strokeStyle = isPlayer ? '#1a5276' : '#7b241c';
        ctx.lineWidth = 1;
        if (tank.direction === 'up' || tank.direction === 'down') {
            for (let i = 0; i < 5; i++) {
                const ty = tank.y + (i * 7 + trackOffset) % tank.height;
                ctx.beginPath();
                ctx.moveTo(tank.x, ty);
                ctx.lineTo(tank.x + tank.width, ty);
                ctx.stroke();
            }
        } else {
            for (let i = 0; i < 5; i++) {
                const tx = tank.x + (i * 7 + trackOffset) % tank.width;
                ctx.beginPath();
                ctx.moveTo(tx, tank.y);
                ctx.lineTo(tx, tank.y + tank.height);
                ctx.stroke();
            }
        }

        // Barrel
        ctx.fillStyle = '#2c3e50';
        switch (tank.direction) {
            case 'up':
                ctx.fillRect(centerX - 2, tank.y - 10, 4, 14);
                break;
            case 'down':
                ctx.fillRect(centerX - 2, tank.y + tank.height - 4, 4, 14);
                break;
            case 'left':
                ctx.fillRect(tank.x - 10, centerY - 2, 14, 4);
                break;
            case 'right':
                ctx.fillRect(tank.x + tank.width - 4, centerY - 2, 14, 4);
                break;
        }

        // Armored tank health bar
        if (tank.type === 'armored' && tank.health > 1) {
            const barW = tank.width;
            const barH = 3;
            ctx.fillStyle = '#333';
            ctx.fillRect(tank.x, tank.y - 6, barW, barH);
            ctx.fillStyle = '#e74c3c';
            ctx.fillRect(tank.x, tank.y - 6, barW * (tank.health / 3), barH);
        }

        // Enemy flash on hit
        if (tank.flashTimer > 0) {
            ctx.fillStyle = 'rgba(255,255,255,0.5)';
            ctx.fillRect(tank.x, tank.y, tank.width, tank.height);
            tank.flashTimer -= 16;
        }

        ctx.restore();
    }

    drawBullet(bullet) {
        const ctx = this.ctx;
        const color = bullet.owner === 'player' ? '#f39c12' : '#e74c3c';

        // Glow
        ctx.fillStyle = color;
        ctx.globalAlpha = 0.4;
        ctx.beginPath();
        ctx.arc(bullet.x + bullet.width / 2, bullet.y + bullet.height / 2, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;

        // Core
        ctx.fillStyle = '#fff';
        ctx.fillRect(bullet.x, bullet.y, bullet.width, bullet.height);
    }

    drawPowerUp(powerUp) {
        const ctx = this.ctx;

        const colors = {
            life: '#e74c3c',
            speed: '#3498db',
            shield: '#f39c12'
        };

        const symbols = {
            life: '♥',
            speed: '⚡',
            shield: '盾'
        };

        // Pulsing animation
        powerUp.pulse = (powerUp.pulse || 0) + 0.05;
        const scale = 1 + Math.sin(powerUp.pulse) * 0.1;
        const pw = powerUp.width * scale;
        const ph = powerUp.height * scale;
        const ox = (powerUp.width - pw) / 2;
        const oy = (powerUp.height - ph) / 2;

        // Glow
        ctx.fillStyle = colors[powerUp.type];
        ctx.globalAlpha = 0.2 + Math.sin(powerUp.pulse) * 0.1;
        ctx.beginPath();
        ctx.arc(powerUp.x + powerUp.width / 2, powerUp.y + powerUp.height / 2, pw / 2 + 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;

        ctx.fillStyle = colors[powerUp.type];
        ctx.fillRect(powerUp.x + ox + 4, powerUp.y + oy + 4, pw - 8, ph - 8);

        ctx.fillStyle = '#fff';
        ctx.font = '16px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(symbols[powerUp.type], powerUp.x + powerUp.width / 2, powerUp.y + powerUp.height / 2);

        // Blink when about to expire
        if (powerUp.life < 3000 && Math.floor(Date.now() / 200) % 2 === 0) {
            ctx.globalAlpha = 0.3;
            ctx.fillStyle = '#000';
            ctx.fillRect(powerUp.x, powerUp.y, powerUp.width, powerUp.height);
            ctx.globalAlpha = 1;
        }
    }

    updateUI() {
        document.getElementById('score').textContent = this.score;
        document.getElementById('lives').textContent = this.lives;
        document.getElementById('level').textContent = this.level;
        document.getElementById('enemiesLeft').textContent = this.maxEnemies - this.enemiesKilled;
    }

    gameLoop() {
        const now = Date.now();
        const dt = now - (this.lastTime || now);
        this.lastTime = now;

        this.update(dt);
        this.draw();

        requestAnimationFrame(() => this.gameLoop());
    }
}

window.addEventListener('load', () => {
    new TankGame();
});
