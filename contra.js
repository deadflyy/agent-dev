class ContraGame {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');

        this.canvas.width = 800;
        this.canvas.height = 450;

        this.gameState = 'menu';
        this.score = 0;
        this.lives = 3;
        this.level = 1;

        this.keys = {};
        this.lastShotTime = 0;
        this.shotCooldown = 200;
        this.autoFire = false;

        this.player = null;
        this.bullets = [];
        this.enemies = [];
        this.particles = [];
        this.powerUps = [];
        this.platforms = [];
        this.camera = { x: 0 };

        this.enemySpawnTimer = 0;
        this.levelLength = 3000;
        this.playerProgress = 0;

        this.gravity = 0.6;
        this.groundY = this.canvas.height - 40;

        // Physics tuning
        this.coyoteTime = 0;
        this.coyoteTimeMax = 80;
        this.jumpBuffer = 0;
        this.jumpBufferMax = 100;

        // Screen shake
        this.shakeTimer = 0;
        this.shakeIntensity = 0;

        // High score
        this.highScore = parseInt(localStorage.getItem('contraHighScore') || '0');

        // Boss
        this.boss = null;
        this.bossDefeated = false;

        // Audio
        this.audioCtx = null;

        // Parallax layers
        this.clouds = [];
        this.trees = [];

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
                osc.frequency.setValueAtTime(800, now);
                osc.frequency.exponentialRampToValueAtTime(300, now + 0.08);
                gain.gain.setValueAtTime(0.1, now);
                gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
                osc.start(now);
                osc.stop(now + 0.08);
                break;
            case 'explosion':
                osc.type = 'sawtooth';
                osc.frequency.setValueAtTime(250, now);
                osc.frequency.exponentialRampToValueAtTime(40, now + 0.25);
                gain.gain.setValueAtTime(0.2, now);
                gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
                osc.start(now);
                osc.stop(now + 0.25);
                break;
            case 'hit':
                osc.type = 'triangle';
                osc.frequency.setValueAtTime(400, now);
                osc.frequency.exponentialRampToValueAtTime(150, now + 0.1);
                gain.gain.setValueAtTime(0.15, now);
                gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
                osc.start(now);
                osc.stop(now + 0.1);
                break;
            case 'powerup':
                osc.type = 'sine';
                osc.frequency.setValueAtTime(500, now);
                osc.frequency.exponentialRampToValueAtTime(1000, now + 0.12);
                gain.gain.setValueAtTime(0.12, now);
                gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
                osc.start(now);
                osc.stop(now + 0.15);
                break;
            case 'jump':
                osc.type = 'sine';
                osc.frequency.setValueAtTime(300, now);
                osc.frequency.exponentialRampToValueAtTime(500, now + 0.1);
                gain.gain.setValueAtTime(0.08, now);
                gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
                osc.start(now);
                osc.stop(now + 0.1);
                break;
            case 'victory':
                osc.type = 'square';
                [523, 659, 784, 1047].forEach((freq, i) => {
                    osc.frequency.setValueAtTime(freq, now + i * 0.12);
                });
                gain.gain.setValueAtTime(0.1, now);
                gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
                osc.start(now);
                osc.stop(now + 0.5);
                break;
            case 'gameover':
                osc.type = 'sawtooth';
                osc.frequency.setValueAtTime(300, now);
                osc.frequency.exponentialRampToValueAtTime(60, now + 0.5);
                gain.gain.setValueAtTime(0.12, now);
                gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
                osc.start(now);
                osc.stop(now + 0.5);
                break;
        }
    }

    init() {
        this.generateParallax();
        this.bindEvents();
        this.generateLevel();
        this.resetGame();
        this.gameLoop();
    }

    generateParallax() {
        this.clouds = [];
        for (let i = 0; i < 8; i++) {
            this.clouds.push({
                x: Math.random() * 4000,
                y: 20 + Math.random() * 100,
                width: 60 + Math.random() * 100,
                height: 20 + Math.random() * 30,
                speed: 0.1 + Math.random() * 0.15
            });
        }
        this.trees = [];
        for (let i = 0; i < 30; i++) {
            this.trees.push({
                x: Math.random() * this.levelLength,
                height: 40 + Math.random() * 60,
                width: 15 + Math.random() * 20
            });
        }
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
    }

    generateLevel() {
        this.platforms = [];

        for (let x = 0; x < this.levelLength; x += 40) {
            this.platforms.push({
                x: x,
                y: this.groundY,
                width: 40,
                height: 40,
                type: 'ground'
            });
        }

        const platformPositions = [
            { x: 300, y: 300, w: 120 },
            { x: 500, y: 250, w: 100 },
            { x: 700, y: 280, w: 80 },
            { x: 900, y: 200, w: 120 },
            { x: 1100, y: 280, w: 100 },
            { x: 1300, y: 220, w: 80 },
            { x: 1500, y: 300, w: 120 },
            { x: 1700, y: 250, w: 100 },
            { x: 1900, y: 200, w: 120 },
            { x: 2100, y: 280, w: 80 },
            { x: 2300, y: 220, w: 100 },
            { x: 2500, y: 300, w: 120 }
        ];

        platformPositions.forEach(p => {
            this.platforms.push({
                x: p.x,
                y: p.y,
                width: p.w,
                height: 20,
                type: 'platform'
            });
        });
    }

    resetGame() {
        this.player = {
            x: 100,
            y: this.groundY - 60,
            width: 30,
            height: 50,
            vx: 0,
            vy: 0,
            speed: 4,
            jumpPower: 12,
            onGround: false,
            alive: true,
            direction: 'right',
            invincible: false,
            invincibleTimer: 0,
            weapon: 'normal',
            weaponTimer: 0,
            animFrame: 0
        };

        this.bullets = [];
        this.enemies = [];
        this.particles = [];
        this.powerUps = [];
        this.camera.x = 0;
        this.playerProgress = 0;
        this.enemySpawnTimer = 0;
        this.shakeTimer = 0;
        this.boss = null;
        this.bossDefeated = false;
        this.coyoteTime = 0;
        this.jumpBuffer = 0;

        this.updateUI();
    }

    startGame() {
        this.gameState = 'playing';
        document.getElementById('gameOverlay').classList.add('hidden');
        this.resetGame();
        this.generateLevel();
        this.generateParallax();
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
            localStorage.setItem('contraHighScore', String(this.highScore));
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
        if (this.score > this.highScore) {
            this.highScore = this.score;
            localStorage.setItem('contraHighScore', String(this.highScore));
        }
        document.getElementById('overlayTitle').textContent = '关卡完成!';
        document.getElementById('overlayText').textContent = `进入第 ${this.level} 关  |  最高分: ${this.highScore}`;
        document.getElementById('startBtn').textContent = '下一关';
        document.getElementById('gameOverlay').classList.remove('hidden');
    }

    update(dt) {
        if (this.gameState !== 'playing') return;

        if (this.shakeTimer > 0) this.shakeTimer -= dt;

        // Jump buffer
        if (this.keys['KeyK'] || this.keys['KeyZ'] || this.keys['Space']) {
            this.jumpBuffer = this.jumpBufferMax;
        }
        if (this.jumpBuffer > 0) this.jumpBuffer -= dt;

        // Coyote time
        if (this.player.onGround) {
            this.coyoteTime = this.coyoteTimeMax;
        }
        if (this.coyoteTime > 0) this.coyoteTime -= dt;

        this.updatePlayer(dt);
        this.updateBullets();
        this.updateEnemies(dt);
        this.updateParticles(dt);
        this.updatePowerUps(dt);
        this.spawnEnemies(dt);
        this.checkCollisions();
        this.updateCamera();
        this.checkGameState();
        this.updateBoss(dt);

        if (this.player.invincible) {
            this.player.invincibleTimer -= dt;
            if (this.player.invincibleTimer <= 0) {
                this.player.invincible = false;
            }
        }

        // Weapon timer (replaces setTimeout)
        if (this.player.weaponTimer > 0) {
            this.player.weaponTimer -= dt;
            if (this.player.weaponTimer <= 0) {
                this.player.weapon = 'normal';
            }
        }

        // Auto-fire
        if (this.keys['KeyJ'] || this.keys['KeyX']) {
            this.playerShoot();
        }

        // Cloud movement
        this.clouds.forEach(c => {
            c.x += c.speed;
            if (c.x > this.levelLength + 200) c.x = -200;
        });
    }

    updatePlayer(dt) {
        if (!this.player.alive) return;

        // Horizontal
        if (this.keys['KeyA'] || this.keys['ArrowLeft']) {
            this.player.vx = -this.player.speed;
            this.player.direction = 'left';
        } else if (this.keys['KeyD'] || this.keys['ArrowRight']) {
            this.player.vx = this.player.speed;
            this.player.direction = 'right';
        } else {
            this.player.vx = 0;
        }

        // Jump with coyote time + buffer
        if (this.jumpBuffer > 0 && this.coyoteTime > 0) {
            this.player.vy = -this.player.jumpPower;
            this.player.onGround = false;
            this.coyoteTime = 0;
            this.jumpBuffer = 0;
            this.playSound('jump');
        }

        // Variable jump height: cut velocity on release
        if (!(this.keys['KeyK'] || this.keys['KeyZ'] || this.keys['Space']) && this.player.vy < -3) {
            this.player.vy *= 0.7;
        }

        this.player.vy += this.gravity;

        this.player.x += this.player.vx;
        this.player.y += this.player.vy;

        // Platform collision
        this.player.onGround = false;
        this.platforms.forEach(platform => {
            if (this.checkRectCollision(this.player, platform)) {
                if (this.player.vy > 0 && this.player.y < platform.y) {
                    this.player.y = platform.y - this.player.height;
                    this.player.vy = 0;
                    this.player.onGround = true;
                }
            }
        });

        this.player.x = Math.max(0, Math.min(this.levelLength - this.player.width, this.player.x));

        if (this.player.y > this.canvas.height) {
            this.playerHit();
        }

        this.playerProgress = this.player.x;

        // Animation
        if (this.player.vx !== 0) {
            this.player.animFrame += 0.15;
        }
    }

    updateBullets() {
        this.bullets = this.bullets.filter(bullet => {
            if (!bullet.alive) return false;

            // Store trail position
            bullet.trail = bullet.trail || [];
            bullet.trail.push({ x: bullet.x, y: bullet.y });
            if (bullet.trail.length > 5) bullet.trail.shift();

            bullet.x += bullet.vx;
            bullet.y += bullet.vy;

            if (bullet.x < this.camera.x - 100 || bullet.x > this.camera.x + this.canvas.width + 100) {
                return false;
            }

            return true;
        });
    }

    updateEnemies(dt) {
        this.enemies.forEach(enemy => {
            if (!enemy.alive) return;

            enemy.x += enemy.vx;
            enemy.y += enemy.vy;
            enemy.vy += this.gravity;

            if (enemy.type === 'walker') {
                if (Math.abs(enemy.x - this.player.x) < 300 && this.player.alive) {
                    enemy.vx = enemy.x < this.player.x ? 1.5 : -1.5;
                    enemy.direction = enemy.vx > 0 ? 'right' : 'left';
                }
                // Cliff detection
                const checkX = enemy.vx > 0 ? enemy.x + enemy.width + 5 : enemy.x - 5;
                let onGround = false;
                this.platforms.forEach(p => {
                    if (checkX >= p.x && checkX <= p.x + p.width &&
                        enemy.y + enemy.height >= p.y - 5 && enemy.y + enemy.height <= p.y + 10) {
                        onGround = true;
                    }
                });
                if (!onGround && enemy.vy === 0) {
                    enemy.vx = -enemy.vx;
                    enemy.direction = enemy.vx > 0 ? 'right' : 'left';
                }
            } else if (enemy.type === 'shooter') {
                enemy.shootTimer += dt;
                if (enemy.shootTimer > 2000) {
                    enemy.shootTimer = 0;
                    this.enemyShoot(enemy);
                }
            }

            // Platform collision
            this.platforms.forEach(platform => {
                if (this.checkRectCollision(enemy, platform)) {
                    if (enemy.vy > 0 && enemy.y < platform.y) {
                        enemy.y = platform.y - enemy.height;
                        enemy.vy = 0;
                    }
                }
            });

            if (enemy.x < this.camera.x - 100) {
                enemy.alive = false;
            }
        });
    }

    updateParticles(dt) {
        this.particles = this.particles.filter(particle => {
            particle.life -= dt;
            particle.x += particle.vx;
            particle.y += particle.vy;
            particle.vy += 0.1;
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
        this.enemySpawnTimer += dt;
        if (this.enemySpawnTimer > 1500) {
            this.enemySpawnTimer = 0;

            const spawnX = this.camera.x + this.canvas.width + 50;
            if (spawnX < this.levelLength - 200) {
                const types = ['walker', 'walker', 'shooter'];
                const type = types[Math.floor(Math.random() * types.length)];

                this.enemies.push({
                    x: spawnX,
                    y: this.groundY - 40,
                    width: 30,
                    height: 40,
                    vx: -1,
                    vy: 0,
                    alive: true,
                    type: type,
                    shootTimer: 0,
                    health: type === 'shooter' ? 2 : 1,
                    maxHealth: type === 'shooter' ? 2 : 1,
                    flashTimer: 0,
                    direction: 'left'
                });
            }
        }
    }

    updateCamera() {
        const targetX = this.player.x - this.canvas.width / 3;
        this.camera.x += (targetX - this.camera.x) * 0.1;
        this.camera.x = Math.max(0, Math.min(this.levelLength - this.canvas.width, this.camera.x));
    }

    updateBoss(dt) {
        if (!this.boss) return;
        if (!this.boss.alive) return;

        const b = this.boss;
        b.timer += dt;
        b.animFrame += 0.05;

        // Movement: patrol
        b.x += b.vx;
        if (b.x < this.levelLength - 350 || b.x > this.levelLength - 100) {
            b.vx = -b.vx;
        }

        // Shooting
        b.shootTimer += dt;
        if (b.shootTimer > 1200) {
            b.shootTimer = 0;
            // Triple shot
            for (let vy = -2; vy <= 2; vy += 2) {
                this.bullets.push({
                    x: b.x,
                    y: b.y + b.height / 2,
                    width: 8,
                    height: 4,
                    vx: -5,
                    vy: vy,
                    alive: true,
                    owner: 'enemy',
                    trail: []
                });
            }
        }

        // Flash decay
        if (b.flashTimer > 0) b.flashTimer -= dt;
    }

    checkCollisions() {
        // Bullets vs enemies
        for (let i = this.bullets.length - 1; i >= 0; i--) {
            const bullet = this.bullets[i];
            if (!bullet.alive) continue;

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
                            this.score += enemy.type === 'shooter' ? 200 : 100;
                            this.createExplosion(enemy.x + enemy.width / 2, enemy.y + enemy.height / 2);
                            this.playSound('explosion');
                            this.shakeTimer = 100;
                            this.shakeIntensity = 3;

                            if (Math.random() > 0.85) {
                                this.spawnPowerUp(enemy.x, enemy.y);
                            }
                        } else {
                            this.playSound('hit');
                        }

                        this.updateUI();
                        break;
                    }
                }

                // Bullets vs boss
                if (this.boss && this.boss.alive && bullet.alive) {
                    if (this.checkRectCollision(bullet, this.boss)) {
                        bullet.alive = false;
                        this.boss.health--;
                        this.boss.flashTimer = 100;
                        this.playSound('hit');
                        this.shakeTimer = 80;
                        this.shakeIntensity = 2;

                        if (this.boss.health <= 0) {
                            this.boss.alive = false;
                            this.bossDefeated = true;
                            this.score += 1000;
                            // Big explosion
                            for (let k = 0; k < 5; k++) {
                                setTimeout(() => {
                                    if (this.boss) {
                                        this.createExplosion(
                                            this.boss.x + Math.random() * this.boss.width,
                                            this.boss.y + Math.random() * this.boss.height
                                        );
                                        this.playSound('explosion');
                                    }
                                }, k * 150);
                            }
                            this.shakeTimer = 500;
                            this.shakeIntensity = 10;
                            this.updateUI();
                            // Victory after delay
                            setTimeout(() => {
                                if (this.gameState === 'playing') this.victory();
                            }, 1000);
                        }
                    }
                }
            } else {
                if (this.player.alive && !this.player.invincible &&
                    this.checkRectCollision(bullet, this.player)) {
                    bullet.alive = false;
                    this.playerHit();
                }
            }
        }

        // Player vs enemies
        this.enemies.forEach(enemy => {
            if (!enemy.alive) return;
            if (this.player.alive && !this.player.invincible &&
                this.checkRectCollision(this.player, enemy)) {
                this.playerHit();
            }
        });

        // Player vs powerUps
        this.powerUps.forEach(powerUp => {
            if (this.player.alive && this.checkRectCollision(this.player, powerUp)) {
                this.applyPowerUp(powerUp.type);
                powerUp.life = 0;
                this.playSound('powerup');
            }
        });
    }

    checkGameState() {
        // Spawn boss near end
        if (this.player.x >= this.levelLength - 400 && !this.boss && !this.bossDefeated) {
            this.spawnBoss();
        }
        // Fallback: if boss defeated, victory already triggered
        if (this.player.x >= this.levelLength - 100 && !this.boss && this.bossDefeated) {
            // Already handled
        }
    }

    spawnBoss() {
        this.boss = {
            x: this.levelLength - 200,
            y: this.groundY - 80,
            width: 60,
            height: 80,
            health: 15 + this.level * 5,
            maxHealth: 15 + this.level * 5,
            alive: true,
            vx: -1.5,
            shootTimer: 0,
            flashTimer: 0,
            timer: 0,
            animFrame: 0
        };
    }

    playerShoot() {
        const now = Date.now();
        if (now - this.lastShotTime < this.shotCooldown) return;
        this.lastShotTime = now;

        if (!this.player.alive) return;

        const bulletSpeed = 8;
        const direction = this.player.direction === 'right' ? 1 : -1;

        this.bullets.push({
            x: this.player.x + this.player.width / 2,
            y: this.player.y + this.player.height / 3,
            width: 10,
            height: 4,
            vx: bulletSpeed * direction,
            vy: 0,
            alive: true,
            owner: 'player',
            trail: []
        });

        if (this.player.weapon === 'spread') {
            this.bullets.push({
                x: this.player.x + this.player.width / 2,
                y: this.player.y + this.player.height / 3,
                width: 10,
                height: 4,
                vx: bulletSpeed * direction,
                vy: -2,
                alive: true,
                owner: 'player',
                trail: []
            });
            this.bullets.push({
                x: this.player.x + this.player.width / 2,
                y: this.player.y + this.player.height / 3,
                width: 10,
                height: 4,
                vx: bulletSpeed * direction,
                vy: 2,
                alive: true,
                owner: 'player',
                trail: []
            });
        }

        this.playSound('shoot');
    }

    enemyShoot(enemy) {
        const direction = enemy.x < this.player.x ? 1 : -1;

        this.bullets.push({
            x: enemy.x + enemy.width / 2,
            y: enemy.y + enemy.height / 3,
            width: 8,
            height: 4,
            vx: 5 * direction,
            vy: 0,
            alive: true,
            owner: 'enemy',
            trail: []
        });
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
            this.player.invincibleTimer = 2000;
            this.player.vy = -5;
        }
    }

    spawnPowerUp(x, y) {
        const types = ['life', 'spread'];
        const type = types[Math.floor(Math.random() * types.length)];

        this.powerUps.push({
            x: x,
            y: y - 20,
            width: 25,
            height: 25,
            type: type,
            life: 8000,
            vy: -2,
            bounce: 0
        });
    }

    applyPowerUp(type) {
        switch (type) {
            case 'life':
                this.lives++;
                break;
            case 'spread':
                this.player.weapon = 'spread';
                this.player.weaponTimer = 10000;
                break;
        }
        this.updateUI();
    }

    checkRectCollision(rect1, rect2) {
        return rect1.x < rect2.x + rect2.width &&
               rect1.x + rect1.width > rect2.x &&
               rect1.y < rect2.y + rect2.height &&
               rect1.y + rect1.height > rect2.y;
    }

    createParticles(x, y, color, count) {
        count = count || 8;
        for (let i = 0; i < count; i++) {
            this.particles.push({
                x: x,
                y: y,
                vx: (Math.random() - 0.5) * 6,
                vy: (Math.random() - 0.5) * 6,
                life: 400 + Math.random() * 300,
                color: color,
                size: Math.random() * 4 + 2
            });
        }
    }

    createExplosion(x, y) {
        // Fire particles
        for (let i = 0; i < 10; i++) {
            const angle = (Math.PI * 2 / 10) * i;
            const speed = 1 + Math.random() * 3;
            this.particles.push({
                x: x,
                y: y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                life: 250 + Math.random() * 250,
                color: Math.random() > 0.5 ? '#f39c12' : '#e74c3c',
                size: 2 + Math.random() * 4
            });
        }
        // Debris
        for (let i = 0; i < 5; i++) {
            this.particles.push({
                x: x + (Math.random() - 0.5) * 20,
                y: y + (Math.random() - 0.5) * 20,
                vx: (Math.random() - 0.5) * 4,
                vy: -2 - Math.random() * 3,
                life: 500 + Math.random() * 300,
                color: '#7f8c8d',
                size: 3 + Math.random() * 3
            });
        }
    }

    draw() {
        const ctx = this.ctx;

        // Sky gradient
        const skyGrad = ctx.createLinearGradient(0, 0, 0, this.canvas.height);
        skyGrad.addColorStop(0, '#1a1a4e');
        skyGrad.addColorStop(0.4, '#4a6fa5');
        skyGrad.addColorStop(1, '#87CEEB');
        ctx.fillStyle = skyGrad;
        ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        ctx.save();

        // Screen shake
        if (this.shakeTimer > 0) {
            const intensity = this.shakeIntensity * (this.shakeTimer / 300);
            ctx.translate(
                (Math.random() - 0.5) * intensity,
                (Math.random() - 0.5) * intensity
            );
        }

        this.drawBackground();

        ctx.save();
        ctx.translate(-this.camera.x, 0);

        this.drawPlatforms();
        this.drawLevelEnd();
        this.drawBoss();
        this.drawPlayer();
        this.drawEnemies();
        this.drawBullets();
        this.drawPowerUps();
        this.drawParticles();

        ctx.restore();

        ctx.restore();

        this.drawProgressBar();
        if (this.boss && this.boss.alive) {
            this.drawBossHealthBar();
        }
    }

    drawBackground() {
        const ctx = this.ctx;

        // Clouds (slow parallax)
        ctx.fillStyle = 'rgba(255,255,255,0.3)';
        this.clouds.forEach(c => {
            const screenX = c.x - this.camera.x * 0.2;
            if (screenX > -200 && screenX < this.canvas.width + 200) {
                ctx.beginPath();
                ctx.ellipse(screenX, c.y, c.width / 2, c.height / 2, 0, 0, Math.PI * 2);
                ctx.fill();
                ctx.beginPath();
                ctx.ellipse(screenX - c.width * 0.3, c.y + 5, c.width * 0.3, c.height * 0.4, 0, 0, Math.PI * 2);
                ctx.fill();
                ctx.beginPath();
                ctx.ellipse(screenX + c.width * 0.3, c.y + 3, c.width * 0.35, c.height * 0.35, 0, 0, Math.PI * 2);
                ctx.fill();
            }
        });

        // Far mountains (medium parallax)
        ctx.fillStyle = '#3d5c3d';
        for (let x = 0; x < this.levelLength; x += 200) {
            const screenX = x - this.camera.x * 0.4;
            if (screenX > -250 && screenX < this.canvas.width + 250) {
                const mountainHeight = 80 + Math.sin(x * 0.008) * 40 + Math.sin(x * 0.02) * 20;
                ctx.beginPath();
                ctx.moveTo(screenX, this.groundY);
                ctx.lineTo(screenX + 100, this.groundY - mountainHeight);
                ctx.lineTo(screenX + 200, this.groundY);
                ctx.fill();
            }
        }

        // Near trees (faster parallax)
        ctx.fillStyle = '#2d4a2d';
        this.trees.forEach(t => {
            const screenX = t.x - this.camera.x * 0.7;
            if (screenX > -50 && screenX < this.canvas.width + 50) {
                // Trunk
                ctx.fillStyle = '#5D3A1A';
                ctx.fillRect(screenX - 3, this.groundY - t.height * 0.4, 6, t.height * 0.4);
                // Canopy
                ctx.fillStyle = '#2d4a2d';
                ctx.beginPath();
                ctx.moveTo(screenX - t.width / 2, this.groundY - t.height * 0.4);
                ctx.lineTo(screenX, this.groundY - t.height);
                ctx.lineTo(screenX + t.width / 2, this.groundY - t.height * 0.4);
                ctx.fill();
                ctx.beginPath();
                ctx.moveTo(screenX - t.width * 0.4, this.groundY - t.height * 0.6);
                ctx.lineTo(screenX, this.groundY - t.height * 0.9);
                ctx.lineTo(screenX + t.width * 0.4, this.groundY - t.height * 0.6);
                ctx.fill();
            }
        });
    }

    drawPlatforms() {
        this.platforms.forEach(platform => {
            if (platform.x + platform.width < this.camera.x - 50 ||
                platform.x > this.camera.x + this.canvas.width + 50) return;

            if (platform.type === 'ground') {
                // Dirt
                this.ctx.fillStyle = '#6B3410';
                this.ctx.fillRect(platform.x, platform.y, platform.width, platform.height);
                // Grass top with variation
                this.ctx.fillStyle = '#228B22';
                this.ctx.fillRect(platform.x, platform.y, platform.width, 8);
                this.ctx.fillStyle = '#2ECC40';
                this.ctx.fillRect(platform.x, platform.y, platform.width, 4);
                // Grass blades
                this.ctx.fillStyle = '#27ae60';
                for (let gx = platform.x; gx < platform.x + platform.width; gx += 8) {
                    const gh = 3 + Math.sin(gx * 0.5) * 2;
                    this.ctx.fillRect(gx, platform.y - gh, 2, gh);
                }
            } else {
                // Platform with texture
                this.ctx.fillStyle = '#8B6914';
                this.ctx.fillRect(platform.x, platform.y, platform.width, platform.height);
                this.ctx.fillStyle = '#A0782C';
                this.ctx.fillRect(platform.x + 2, platform.y + 2, platform.width - 4, platform.height - 4);
                // Top edge
                this.ctx.fillStyle = '#B8922E';
                this.ctx.fillRect(platform.x, platform.y, platform.width, 3);
            }
        });
    }

    drawPlayer() {
        if (!this.player.alive) return;

        const ctx = this.ctx;
        const p = this.player;

        ctx.save();

        if (p.invincible && Math.floor(Date.now() / 80) % 2 === 0) {
            ctx.globalAlpha = 0.4;
        }

        const flip = p.direction === 'left' ? -1 : 1;
        ctx.translate(p.x + p.width / 2, p.y + p.height / 2);
        ctx.scale(flip, 1);

        // Legs animation
        const legSwing = Math.sin(p.animFrame) * 8;
        const isMoving = p.vx !== 0;

        // Shadow
        ctx.fillStyle = 'rgba(0,0,0,0.2)';
        ctx.beginPath();
        ctx.ellipse(0, p.height / 2, 14, 4, 0, 0, Math.PI * 2);
        ctx.fill();

        // Left leg
        ctx.fillStyle = '#2c3e50';
        ctx.save();
        ctx.translate(-6, 12);
        if (isMoving) ctx.rotate(legSwing * 0.03);
        ctx.fillRect(-4, 0, 8, 18);
        // Boot
        ctx.fillStyle = '#1a1a2e';
        ctx.fillRect(-5, 16, 10, 6);
        ctx.restore();

        // Right leg
        ctx.fillStyle = '#2c3e50';
        ctx.save();
        ctx.translate(6, 12);
        if (isMoving) ctx.rotate(-legSwing * 0.03);
        ctx.fillRect(-4, 0, 8, 18);
        ctx.fillStyle = '#1a1a2e';
        ctx.fillRect(-5, 16, 10, 6);
        ctx.restore();

        // Body
        ctx.fillStyle = '#3498db';
        ctx.beginPath();
        ctx.roundRect(-12, -15, 24, 28, 4);
        ctx.fill();

        // Belt
        ctx.fillStyle = '#2c3e50';
        ctx.fillRect(-12, 5, 24, 4);

        // Head
        ctx.fillStyle = '#f1c40f';
        ctx.beginPath();
        ctx.arc(0, -22, 10, 0, Math.PI * 2);
        ctx.fill();

        // Hair
        ctx.fillStyle = '#8B4513';
        ctx.beginPath();
        ctx.arc(0, -25, 10, Math.PI * 1.1, Math.PI * 1.9);
        ctx.fill();

        // Eyes
        ctx.fillStyle = '#000';
        ctx.beginPath();
        ctx.arc(3, -23, 2, 0, Math.PI * 2);
        ctx.fill();

        // Bandana
        ctx.fillStyle = '#e74c3c';
        ctx.fillRect(-10, -28, 20, 4);
        ctx.beginPath();
        ctx.moveTo(10, -28);
        ctx.lineTo(16, -24);
        ctx.lineTo(10, -24);
        ctx.fill();

        // Weapon
        ctx.fillStyle = '#2c3e50';
        ctx.fillRect(10, -8, 18, 5);
        // Muzzle
        ctx.fillStyle = '#555';
        ctx.fillRect(26, -9, 4, 7);

        ctx.restore();
    }

    drawEnemies() {
        this.enemies.forEach(enemy => {
            if (!enemy.alive) return;
            if (enemy.x + enemy.width < this.camera.x - 50 ||
                enemy.x > this.camera.x + this.canvas.width + 50) return;

            const ctx = this.ctx;
            ctx.save();

            // Flash on hit
            if (enemy.flashTimer > 0) {
                ctx.globalAlpha = 0.6 + Math.sin(Date.now() * 0.02) * 0.4;
            }

            const flip = enemy.direction === 'left' ? -1 : 1;
            ctx.translate(enemy.x + enemy.width / 2, enemy.y + enemy.height / 2);
            ctx.scale(flip, 1);

            if (enemy.type === 'walker') {
                // Body
                ctx.fillStyle = '#e74c3c';
                ctx.beginPath();
                ctx.roundRect(-12, -12, 24, 24, 4);
                ctx.fill();
                // Eyes
                ctx.fillStyle = '#fff';
                ctx.fillRect(-8, -8, 6, 6);
                ctx.fillRect(2, -8, 6, 6);
                ctx.fillStyle = '#000';
                ctx.fillRect(-6, -6, 3, 3);
                ctx.fillRect(4, -6, 3, 3);
                // Legs
                ctx.fillStyle = '#c0392b';
                const legOff = Math.sin(Date.now() * 0.008) * 4;
                ctx.fillRect(-8, 12, 6, 8 + legOff);
                ctx.fillRect(2, 12, 6, 8 - legOff);
            } else if (enemy.type === 'shooter') {
                // Body
                ctx.fillStyle = '#9b59b6';
                ctx.beginPath();
                ctx.roundRect(-12, -15, 24, 30, 4);
                ctx.fill();
                // Helmet
                ctx.fillStyle = '#7d3c98';
                ctx.beginPath();
                ctx.arc(0, -12, 12, Math.PI, 0);
                ctx.fill();
                // Eyes
                ctx.fillStyle = '#fff';
                ctx.fillRect(-6, -6, 5, 5);
                ctx.fillRect(1, -6, 5, 5);
                ctx.fillStyle = '#e74c3c';
                ctx.fillRect(-4, -4, 2, 2);
                ctx.fillRect(3, -4, 2, 2);
                // Weapon
                ctx.fillStyle = '#2c3e50';
                ctx.fillRect(10, -4, 14, 4);
                ctx.fillRect(22, -6, 4, 8);
            }

            // Health bar for multi-hp enemies
            if (enemy.maxHealth > 1) {
                ctx.fillStyle = '#333';
                ctx.fillRect(-12, -20, 24, 3);
                ctx.fillStyle = '#e74c3c';
                ctx.fillRect(-12, -20, 24 * (enemy.health / enemy.maxHealth), 3);
            }

            ctx.restore();
        });
    }

    drawBullets() {
        this.bullets.forEach(bullet => {
            if (!bullet.alive) return;

            const ctx = this.ctx;
            const color = bullet.owner === 'player' ? '#f39c12' : '#e74c3c';

            // Trail
            if (bullet.trail) {
                bullet.trail.forEach((t, i) => {
                    ctx.fillStyle = color;
                    ctx.globalAlpha = (i / bullet.trail.length) * 0.3;
                    ctx.fillRect(t.x, t.y, bullet.width * 0.6, bullet.height * 0.6);
                });
                ctx.globalAlpha = 1;
            }

            // Glow
            ctx.fillStyle = color;
            ctx.globalAlpha = 0.3;
            ctx.beginPath();
            ctx.arc(bullet.x + bullet.width / 2, bullet.y + bullet.height / 2, 6, 0, Math.PI * 2);
            ctx.fill();
            ctx.globalAlpha = 1;

            // Core
            ctx.fillStyle = '#fff';
            ctx.fillRect(bullet.x, bullet.y, bullet.width, bullet.height);
        });
    }

    drawPowerUps() {
        this.powerUps.forEach(powerUp => {
            const colors = { life: '#e74c3c', spread: '#3498db' };
            const symbols = { life: '♥', spread: 'S' };

            // Floating animation
            powerUp.bounce = (powerUp.bounce || 0) + 0.05;
            const floatY = Math.sin(powerUp.bounce) * 3;

            this.ctx.fillStyle = colors[powerUp.type];
            this.ctx.globalAlpha = 0.3;
            this.ctx.beginPath();
            this.ctx.arc(powerUp.x + powerUp.width / 2, powerUp.y + floatY + powerUp.height / 2, 16, 0, Math.PI * 2);
            this.ctx.fill();
            this.ctx.globalAlpha = 1;

            this.ctx.fillStyle = colors[powerUp.type];
            this.ctx.beginPath();
            this.ctx.roundRect(powerUp.x, powerUp.y + floatY, powerUp.width, powerUp.height, 5);
            this.ctx.fill();

            this.ctx.fillStyle = '#fff';
            this.ctx.font = 'bold 14px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            this.ctx.fillText(symbols[powerUp.type], powerUp.x + powerUp.width / 2, powerUp.y + floatY + powerUp.height / 2);

            // Blink when expiring
            if (powerUp.life < 2000 && Math.floor(Date.now() / 150) % 2 === 0) {
                this.ctx.globalAlpha = 0.3;
            }
            this.ctx.globalAlpha = 1;
        });
    }

    drawParticles() {
        this.particles.forEach(particle => {
            this.ctx.fillStyle = particle.color;
            this.ctx.globalAlpha = Math.max(0, particle.life / 700);
            if (particle.size > 3) {
                this.ctx.beginPath();
                this.ctx.arc(particle.x, particle.y, particle.size / 2, 0, Math.PI * 2);
                this.ctx.fill();
            } else {
                this.ctx.fillRect(particle.x, particle.y, particle.size, particle.size);
            }
        });
        this.ctx.globalAlpha = 1;
    }

    drawLevelEnd() {
        const endX = this.levelLength - 80;

        // Flag pole
        this.ctx.fillStyle = '#aaa';
        this.ctx.fillRect(endX + 30, this.groundY - 130, 4, 130);

        // Flag with wave
        this.ctx.fillStyle = '#e74c3c';
        const wave = Math.sin(Date.now() * 0.003) * 3;
        this.ctx.beginPath();
        this.ctx.moveTo(endX + 34, this.groundY - 130);
        this.ctx.lineTo(endX + 80 + wave, this.groundY - 115);
        this.ctx.lineTo(endX + 34, this.groundY - 100);
        this.ctx.fill();

        // Pole ball
        this.ctx.fillStyle = '#f39c12';
        this.ctx.beginPath();
        this.ctx.arc(endX + 32, this.groundY - 130, 4, 0, Math.PI * 2);
        this.ctx.fill();
    }

    drawBoss() {
        if (!this.boss || !this.boss.alive) return;

        const ctx = this.ctx;
        const b = this.boss;

        ctx.save();

        if (b.flashTimer > 0) {
            ctx.globalAlpha = 0.5 + Math.sin(Date.now() * 0.03) * 0.5;
        }

        // Shadow
        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        ctx.beginPath();
        ctx.ellipse(b.x + b.width / 2, b.y + b.height, 35, 8, 0, 0, Math.PI * 2);
        ctx.fill();

        // Body
        ctx.fillStyle = '#555';
        ctx.beginPath();
        ctx.roundRect(b.x - 5, b.y - 5, b.width + 10, b.height + 10, 8);
        ctx.fill();

        ctx.fillStyle = '#8B0000';
        ctx.beginPath();
        ctx.roundRect(b.x, b.y, b.width, b.height, 6);
        ctx.fill();

        // Armor plates
        ctx.fillStyle = '#A00000';
        ctx.fillRect(b.x + 5, b.y + 5, b.width - 10, 15);
        ctx.fillRect(b.x + 5, b.y + b.height - 20, b.width - 10, 15);

        // Eye
        const eyeX = b.x + b.width / 2;
        const eyeY = b.y + b.height / 2;
        ctx.fillStyle = '#FFD700';
        ctx.beginPath();
        ctx.arc(eyeX, eyeY, 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#FF0000';
        ctx.beginPath();
        ctx.arc(eyeX, eyeY, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#000';
        ctx.beginPath();
        ctx.arc(eyeX, eyeY, 2, 0, Math.PI * 2);
        ctx.fill();

        // Weapon barrels
        ctx.fillStyle = '#333';
        ctx.fillRect(b.x - 20, b.y + 20, 25, 8);
        ctx.fillRect(b.x - 20, b.y + b.height - 28, 25, 8);

        // Sparks animation
        if (b.health < b.maxHealth / 2) {
            if (Math.random() > 0.7) {
                this.createParticles(
                    b.x + Math.random() * b.width,
                    b.y + Math.random() * b.height,
                    '#FFD700', 3
                );
            }
        }

        ctx.restore();
    }

    drawProgressBar() {
        const ctx = this.ctx;
        const barWidth = 220;
        const barHeight = 12;
        const barX = this.canvas.width - barWidth - 15;
        const barY = 15;

        // Background
        ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
        ctx.beginPath();
        ctx.roundRect(barX - 2, barY - 2, barWidth + 4, barHeight + 4, 4);
        ctx.fill();

        // Fill
        const progress = Math.min(1, this.playerProgress / this.levelLength);
        const grad = ctx.createLinearGradient(barX, 0, barX + barWidth, 0);
        grad.addColorStop(0, '#2ecc71');
        grad.addColorStop(0.7, '#f39c12');
        grad.addColorStop(1, '#e74c3c');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.roundRect(barX, barY, barWidth * progress, barHeight, 3);
        ctx.fill();

        // Border
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.roundRect(barX, barY, barWidth, barHeight, 3);
        ctx.stroke();

        // Flag icon at end
        ctx.fillStyle = '#e74c3c';
        ctx.font = '12px Arial';
        ctx.textAlign = 'right';
        ctx.fillText('🏁', barX + barWidth + 12, barY + barHeight);

        // Player dot
        ctx.fillStyle = '#3498db';
        ctx.beginPath();
        ctx.arc(barX + barWidth * progress, barY + barHeight / 2, 5, 0, Math.PI * 2);
        ctx.fill();
    }

    drawBossHealthBar() {
        const ctx = this.ctx;
        const b = this.boss;
        const barWidth = 200;
        const barHeight = 10;
        const barX = (this.canvas.width - barWidth) / 2;
        const barY = 40;

        ctx.fillStyle = 'rgba(0,0,0,0.7)';
        ctx.beginPath();
        ctx.roundRect(barX - 10, barY - 5, barWidth + 20, barHeight + 20, 5);
        ctx.fill();

        ctx.fillStyle = '#fff';
        ctx.font = 'bold 10px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('BOSS', this.canvas.width / 2, barY + 4);

        ctx.fillStyle = '#333';
        ctx.fillRect(barX, barY + 8, barWidth, barHeight);
        ctx.fillStyle = '#e74c3c';
        ctx.fillRect(barX, barY + 8, barWidth * (b.health / b.maxHealth), barHeight);
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 1;
        ctx.strokeRect(barX, barY + 8, barWidth, barHeight);
    }

    updateUI() {
        document.getElementById('score').textContent = this.score;
        document.getElementById('lives').textContent = this.lives;
        document.getElementById('level').textContent = this.level;
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
    new ContraGame();
});
