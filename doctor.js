/**
 * 医生救小兔游戏
 * 帮助医生收集药片，给小兔子看病
 */

class DoctorGame {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');

        // 游戏状态
        this.gameState = 'start';
        this.currentLevel = 1;
        this.maxLevels = 15;
        this.score = 0;

        // 难度设置
        this.difficulty = 'medium';
        this.difficultyProgress = this.loadDifficultyProgress();

        // 网格设置
        this.gridWidth = 8;
        this.gridHeight = 8;
        this.tileSize = 60;

        // 游戏对象
        this.doctor = { x: 0, y: 0 };
        this.rabbit = { x: 0, y: 0 };
        this.pills = [];
        this.walls = [];
        this.puzzles = [];
        this.particles = [];

        // 药片收集
        this.pillsCollected = 0;
        this.pillsNeeded = 3;

        // 当前关卡数据
        this.currentLevelData = null;
        this.currentPuzzle = null;

        // 待处理移动
        this.pendingMove = null;

        // 动画
        this.animationFrame = null;
        this.lastTime = 0;

        // 天气系统
        this.currentWeather = null;
        this.weatherEffects = [];

        // 天气背景音乐
        this.audioCtx = null;
        this.weatherMusicNodes = [];
        this.weatherMusicGain = null;

        // 初始化
        this.init();
    }

    // 从本地存储加载难度独立的进度
    loadDifficultyProgress() {
        try {
            const saved = localStorage.getItem('doctorGameDifficultyProgress');
            if (saved) {
                return JSON.parse(saved);
            }
        } catch (e) {
            console.log('无法读取本地存储');
        }
        return {
            easy: [1],
            medium: [1],
            hard: [1]
        };
    }

    // 保存难度独立的进度到本地存储
    saveDifficultyProgress() {
        try {
            localStorage.setItem('doctorGameDifficultyProgress', JSON.stringify(this.difficultyProgress));
        } catch (e) {
            console.log('无法保存到本地存储');
        }
    }

    // 获取当前难度的已解锁关卡
    getUnlockedLevels() {
        return this.difficultyProgress[this.difficulty] || [1];
    }

    // 解锁新关卡（当前难度）
    unlockLevel(level) {
        if (!this.difficultyProgress[this.difficulty]) {
            this.difficultyProgress[this.difficulty] = [1];
        }
        if (!this.difficultyProgress[this.difficulty].includes(level)) {
            this.difficultyProgress[this.difficulty].push(level);
            this.difficultyProgress[this.difficulty].sort((a, b) => a - b);
            this.saveDifficultyProgress();
        }
    }

    // 设置难度
    setDifficulty(difficulty) {
        this.difficulty = difficulty;
        switch(difficulty) {
            case 'easy':
                this.gridWidth = 6;
                this.gridHeight = 6;
                this.tileSize = 70;
                break;
            case 'medium':
                this.gridWidth = 8;
                this.gridHeight = 8;
                this.tileSize = 60;
                break;
            case 'hard':
                this.gridWidth = 10;
                this.gridHeight = 10;
                this.tileSize = 50;
                break;
        }
        this.canvas.width = this.gridWidth * this.tileSize;
        this.canvas.height = this.gridHeight * this.tileSize;
        this.currentLevel = 1;
    }

    // 自适应canvas尺寸（适配移动端）
    adaptCanvasSize() {
        const gameScreen = document.getElementById('gameScreen');
        if (!gameScreen) return;

        const style = window.getComputedStyle(gameScreen);
        const paddingLeft = parseFloat(style.paddingLeft) || 0;
        const paddingRight = parseFloat(style.paddingRight) || 0;
        const availableWidth = gameScreen.clientWidth - paddingLeft - paddingRight;

        // 根据难度设置 tileSize 范围
        const tileLimits = {
            easy:   { min: 40, max: 70 },
            medium: { min: 32, max: 60 },
            hard:   { min: 28, max: 50 }
        };
        const limits = tileLimits[this.difficulty] || tileLimits.medium;

        // 计算适配的 tileSize
        let newTileSize = Math.floor(availableWidth / this.gridWidth);
        newTileSize = Math.max(limits.min, Math.min(limits.max, newTileSize));

        if (newTileSize !== this.tileSize) {
            this.tileSize = newTileSize;
            this.canvas.width = this.gridWidth * this.tileSize;
            this.canvas.height = this.gridHeight * this.tileSize;
        }

        // 移动端去掉圆角避免多余空白
        if (window.innerWidth <= 768) {
            this.canvas.style.borderRadius = '10px';
        } else {
            this.canvas.style.borderRadius = '';
        }
    }

    // 渲染关卡选择网格
    renderLevelGrid() {
        const levelGrid = document.getElementById('levelGrid');
        if (!levelGrid) return;

        levelGrid.innerHTML = '';
        const unlockedLevels = this.getUnlockedLevels();

        for (let i = 1; i <= this.maxLevels; i++) {
            const btn = document.createElement('button');
            btn.className = 'level-btn';
            btn.dataset.level = i;

            const isUnlocked = unlockedLevels.includes(i);
            const isCurrent = i === this.currentLevel;

            if (isCurrent) {
                btn.classList.add('current');
            } else if (isUnlocked) {
                btn.classList.add('unlocked');
            } else {
                btn.classList.add('locked');
                btn.disabled = true;
            }

            btn.innerHTML = `
                <span class="level-number">${i}</span>
                <span class="level-status">${isCurrent ? '当前' : (isUnlocked ? '已解锁' : '🔒')}</span>
            `;

            if (isUnlocked) {
                const handleLevelSelect = (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    this.selectLevel(i);
                };
                btn.addEventListener('click', handleLevelSelect);
                btn.addEventListener('touchend', handleLevelSelect);
            }

            levelGrid.appendChild(btn);
        }
    }

    // 选择关卡
    selectLevel(level) {
        this.currentLevel = level;
        this.renderLevelGrid();
        this.showMessage(`已选择第 ${level} 关`, '🎯');
    }

    // 选择难度
    selectDifficulty(difficulty) {
        this.difficulty = difficulty;
        this.setDifficulty(difficulty);

        document.querySelectorAll('.difficulty-btn').forEach(btn => {
            btn.classList.remove('active');
            if (btn.dataset.difficulty === difficulty) {
                btn.classList.add('active');
            }
        });

        this.renderLevelGrid();
        const difficultyNames = { easy: '简单', medium: '中等', hard: '高阶' };
        const unlockedCount = this.getUnlockedLevels().length;
        this.showMessage(`${difficultyNames[difficulty]}难度：已解锁 ${unlockedCount} 关`, '🎯');
    }

    // 初始化
    init() {
        this.setDifficulty('medium');
        this.renderLevelGrid();
        this.bindEvents();
        this.showScreen('startScreen');
    }

    // 绑定事件
    bindEvents() {
        document.getElementById('startBtn').addEventListener('click', () => {
            this.initWeatherAudio();
            this.showScreen('gameScreen');
            this.loadLevel(this.currentLevel);
            this.gameState = 'playing';
            this.startGameLoop();
        });

        document.getElementById('nextLevelBtn').addEventListener('click', () => this.nextLevel());
        document.getElementById('replayBtn').addEventListener('click', () => this.restartLevel());
        document.getElementById('playAgainBtn').addEventListener('click', () => this.resetGame());
        document.getElementById('backToLevelsBtn').addEventListener('click', () => this.backToLevels());
        document.getElementById('backToLevelsFromCompleteBtn').addEventListener('click', () => this.backToLevels());

        document.querySelectorAll('.difficulty-btn').forEach(btn => {
            const handleDifficultySelect = (e) => {
                e.preventDefault();
                e.stopPropagation();
                const difficulty = btn.dataset.difficulty;
                this.selectDifficulty(difficulty);
            };
            btn.addEventListener('click', handleDifficultySelect);
            btn.addEventListener('touchend', handleDifficultySelect);
        });

        this.canvas.addEventListener('click', (e) => {
            if (this.gameState === 'playing') this.handleCanvasClick(e);
        });

        this.setupTouchEvents();
        this.bindPuzzleEvents();

        // 窗口大小变化时自适应canvas
        window.addEventListener('resize', () => {
            if (this.gameState === 'playing' || this.gameState === 'puzzle' || this.gameState === 'healing') {
                this.adaptCanvasSize();
            }
        });
    }

    // 返回关卡选择页面
    backToLevels() {
        this.gameState = 'start';
        if (this.animationFrame) {
            cancelAnimationFrame(this.animationFrame);
        }
        this.stopWeatherMusic();
        this.showScreen('startScreen');
        this.renderLevelGrid();
    }

    // 设置移动端触摸事件
    setupTouchEvents() {
        let touchStartX = 0;
        let touchStartY = 0;
        let touchStartTime = 0;

        this.canvas.addEventListener('touchstart', (e) => {
            if (this.gameState !== 'playing') return;
            const touch = e.touches[0];
            touchStartX = touch.clientX;
            touchStartY = touch.clientY;
            touchStartTime = Date.now();
            this.showTouchFeedback(touchStartX, touchStartY);
        }, { passive: false });

        this.canvas.addEventListener('touchend', (e) => {
            if (this.gameState !== 'playing') return;
            const touch = e.changedTouches[0];
            const touchEndX = touch.clientX;
            const touchEndY = touch.clientY;
            const touchDuration = Date.now() - touchStartTime;

            const deltaX = Math.abs(touchEndX - touchStartX);
            const deltaY = Math.abs(touchEndY - touchStartY);

            if (touchDuration < 300 && deltaX < 10 && deltaY < 10) {
                e.preventDefault();
                const rect = this.canvas.getBoundingClientRect();
                const scaleX = this.canvas.width / rect.width;
                const scaleY = this.canvas.height / rect.height;
                const x = Math.floor((touchEndX - rect.left) * scaleX / this.tileSize);
                const y = Math.floor((touchEndY - rect.top) * scaleY / this.tileSize);
                this.handleGridClick(x, y);
            }
        }, { passive: false });

        this.canvas.addEventListener('touchmove', (e) => {
            e.preventDefault();
        }, { passive: false });
    }

    // 显示触摸反馈效果
    showTouchFeedback(clientX, clientY) {
        const rect = this.canvas.getBoundingClientRect();
        const scaleX = this.canvas.width / rect.width;
        const scaleY = this.canvas.height / rect.height;
        const x = Math.floor((clientX - rect.left) * scaleX / this.tileSize);
        const y = Math.floor((clientY - rect.top) * scaleY / this.tileSize);

        if (x >= 0 && x < this.gridWidth && y >= 0 && y < this.gridHeight) {
            for (let i = 0; i < 4; i++) {
                this.particles.push({
                    x: x * this.tileSize + this.tileSize / 2,
                    y: y * this.tileSize + this.tileSize / 2,
                    vx: (Math.random() - 0.5) * 2,
                    vy: (Math.random() - 0.5) * 2,
                    life: 15,
                    color: 'rgba(102, 187, 106, 0.6)',
                    size: Math.random() * 4 + 2
                });
            }
        }
    }

    // 处理格子点击
    handleGridClick(x, y) {
        if (x < 0 || x >= this.gridWidth || y < 0 || y >= this.gridHeight) return;

        // 检查谜题
        if (this.currentLevelData.puzzles) {
            const puzzle = this.currentLevelData.puzzles.find(p =>
                p.x === x && p.y === y && !p.solved
            );
            if (puzzle && this.isAdjacent(this.doctor.x, this.doctor.y, x, y)) {
                this.pendingMove = { x, y };
                this.showPuzzleModal(puzzle);
                return;
            }
        }

        if (this.isValidMove(x, y)) {
            this.moveDoctor(x, y);
        }
    }

    bindPuzzleEvents() {
        document.getElementById('closePuzzleBtn').addEventListener('click', () => this.hidePuzzleModal());
        document.getElementById('hintBtn').addEventListener('click', () => this.showHint());

        const playBtn = document.getElementById('playAudioBtn');
        if (playBtn) {
            playBtn.addEventListener('click', () => this.playPuzzleAudio());
        }
    }

    // 播放题目语音
    playPuzzleAudio() {
        if (!this.currentPuzzle || !this.currentPuzzle.audioText) return;
        if (!window.speechSynthesis) {
            console.log('浏览器不支持语音合成');
            return;
        }

        if (window.speechSynthesis.paused) {
            window.speechSynthesis.resume();
        }

        window.speechSynthesis.cancel();

        const utterance = new SpeechSynthesisUtterance(this.currentPuzzle.audioText);
        utterance.lang = 'zh-CN';
        utterance.rate = 0.9;
        utterance.pitch = 1.1;
        utterance.volume = 1.0;

        if (window.speechSynthesis.getVoices) {
            const voices = window.speechSynthesis.getVoices();
            const zhVoice = voices.find(v => v.lang.includes('zh') || v.lang.includes('CN'));
            if (zhVoice) {
                utterance.voice = zhVoice;
            }
        }

        const playBtn = document.getElementById('playAudioBtn');
        if (playBtn) {
            playBtn.classList.add('playing');
            playBtn.querySelector('.play-text').textContent = '播放中...';
        }

        utterance.onend = () => {
            if (playBtn) {
                playBtn.classList.remove('playing');
                playBtn.querySelector('.play-text').textContent = '播放';
            }
        };

        window.speechSynthesis.speak(utterance);
    }

    // 处理画布点击
    handleCanvasClick(e) {
        const rect = this.canvas.getBoundingClientRect();
        const scaleX = this.canvas.width / rect.width;
        const scaleY = this.canvas.height / rect.height;
        const x = Math.floor((e.clientX - rect.left) * scaleX / this.tileSize);
        const y = Math.floor((e.clientY - rect.top) * scaleY / this.tileSize);
        this.handleGridClick(x, y);
    }

    // 检查是否相邻
    isAdjacent(x1, y1, x2, y2) {
        return Math.abs(x1 - x2) + Math.abs(y1 - y2) === 1;
    }

    // 检查是否有效移动
    isValidMove(x, y) {
        if (x < 0 || x >= this.gridWidth || y < 0 || y >= this.gridHeight) return false;

        // 只能移动到相邻格子
        if (!this.isAdjacent(this.doctor.x, this.doctor.y, x, y)) return false;

        const level = this.currentLevelData;
        if (level.walls.some(w => w.x === x && w.y === y)) return false;
        if (level.doors && level.doors.some(d => d.x === x && d.y === y && !d.opened)) return false;

        return true;
    }

    // 移动医生
    moveDoctor(x, y) {
        if (!this.isValidMove(x, y)) return;

        this.doctor.x = x;
        this.doctor.y = y;
        this.playSound('move');

        // 创建移动粒子效果
        for (let i = 0; i < 5; i++) {
            this.particles.push({
                x: x * this.tileSize + this.tileSize / 2,
                y: y * this.tileSize + this.tileSize / 2,
                vx: (Math.random() - 0.5) * 3,
                vy: (Math.random() - 0.5) * 3,
                life: 20,
                color: 'rgba(255, 255, 255, 0.8)',
                size: Math.random() * 3 + 2
            });
        }

        this.checkCollisions();
    }

    // 检查碰撞
    checkCollisions() {
        const level = this.currentLevelData;

        // 检查药片收集
        const pillIndex = level.pills.findIndex(p =>
            p.x === this.doctor.x && p.y === this.doctor.y && !p.collected
        );
        if (pillIndex !== -1) {
            level.pills[pillIndex].collected = true;
            this.pillsCollected++;
            this.playSound('collect_pill');
            this.createCollectionEffect(this.doctor.x, this.doctor.y, 'pill');
            this.updatePillDisplay();
            this.showMessage('获得药片！', '💊');

            // 药片收集够了，提示去找小兔子
            if (this.pillsCollected >= this.pillsNeeded) {
                this.showMessage('药片收集够了，快去救治小兔子！', '🐰');
            }
        }

        // 检查是否到达兔子处 - 必须走到兔子身边才能通关
        if (this.doctor.x === level.rabbit.x && this.doctor.y === level.rabbit.y) {
            if (this.pillsCollected >= this.pillsNeeded) {
                // 小兔子康复动画
                this.playSound('heal');
                this.healRabbit();
            } else {
                this.playSound('need_pills');
                this.showMessage(`还需要 ${this.pillsNeeded - this.pillsCollected} 个药片！`, '🐰');
            }
        }
    }

    // 小兔子康复动画
    healRabbit() {
        this.gameState = 'healing';
        this.rabbitHealed = true;
        this.rabbitJumpFrame = 0;

        // 语音播报
        this.speak('谢谢你医生，我感觉好多了');

        // 显示感谢消息
        this.showMessage('谢谢你，医生！我感觉好多啦！', '🐰');

        // 创建庆祝粒子效果
        for (let i = 0; i < 30; i++) {
            this.particles.push({
                x: this.rabbit.x * this.tileSize + this.tileSize / 2,
                y: this.rabbit.y * this.tileSize + this.tileSize / 2,
                vx: (Math.random() - 0.5) * 8,
                vy: (Math.random() - 0.5) * 8 - 3,
                life: 60,
                color: ['#FF69B4', '#FFD700', '#00CED1', '#FF6347'][Math.floor(Math.random() * 4)],
                size: Math.random() * 8 + 4
            });
        }

        // 显示康复弹窗
        const healPopup = document.getElementById('healPopup');
        healPopup.classList.remove('hidden');

        // 延迟后隐藏弹窗并显示关卡完成
        setTimeout(() => {
            healPopup.classList.add('hidden');
            this.levelComplete();
        }, 2500);
    }

    // 语音播报
    speak(text) {
        if (!window.speechSynthesis) {
            console.log('浏览器不支持语音合成');
            return;
        }

        window.speechSynthesis.cancel();

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'zh-CN';
        utterance.rate = 0.9;
        utterance.pitch = 1.1;
        utterance.volume = 1.0;

        if (window.speechSynthesis.getVoices) {
            const voices = window.speechSynthesis.getVoices();
            const zhVoice = voices.find(v => v.lang.includes('zh') || v.lang.includes('CN'));
            if (zhVoice) {
                utterance.voice = zhVoice;
            }
        }

        window.speechSynthesis.speak(utterance);
    }

    // 创建收集效果
    createCollectionEffect(x, y, type) {
        const colors = {
            pill: ['#E91E63', '#F48FB1', '#F8BBD9'],
            star: ['#FFD700', '#FFA000', '#FFECB3']
        };
        const colorList = colors[type] || colors.star;

        for (let i = 0; i < 12; i++) {
            this.particles.push({
                x: x * this.tileSize + this.tileSize / 2,
                y: y * this.tileSize + this.tileSize / 2,
                vx: (Math.random() - 0.5) * 6,
                vy: (Math.random() - 0.5) * 6 - 2,
                life: 40,
                color: colorList[Math.floor(Math.random() * colorList.length)],
                size: Math.random() * 6 + 3
            });
        }
    }

    // 更新药片显示
    updatePillDisplay() {
        document.getElementById('pillCount').textContent = this.pillsCollected;
    }

    // 显示消息
    showMessage(text, icon = '💝') {
        const messageBox = document.getElementById('messageBox');
        const messageText = document.getElementById('messageText');
        const messageIcon = document.getElementById('messageIcon');

        messageText.textContent = text;
        messageIcon.textContent = icon;
        messageBox.classList.remove('hidden');

        setTimeout(() => {
            messageBox.classList.add('hidden');
        }, 2000);
    }

    // 显示屏幕
    showScreen(screenId) {
        document.querySelectorAll('.screen').forEach(screen => screen.classList.add('hidden'));
        document.getElementById(screenId).classList.remove('hidden');
    }

    // 获取关卡配置
    getLevelConfigs() {
        return [
            { name: '森林入口', pillsNeeded: 2, wallCount: 3 },
            { name: '青青草地', pillsNeeded: 3, wallCount: 4 },
            { name: '小溪旁边', pillsNeeded: 3, wallCount: 5 },
            { name: '花丛小径', pillsNeeded: 4, wallCount: 6 },
            { name: '蘑菇森林', pillsNeeded: 4, wallCount: 7 },
            { name: '彩虹桥', pillsNeeded: 5, wallCount: 8 },
            { name: '蝴蝶花园', pillsNeeded: 5, wallCount: 9 },
            { name: '松鼠树屋', pillsNeeded: 6, wallCount: 10 },
            { name: '蒲公英田', pillsNeeded: 6, wallCount: 11 },
            { name: '水晶洞穴', pillsNeeded: 7, wallCount: 12 },
            { name: '星光草地', pillsNeeded: 7, wallCount: 13 },
            { name: '风之谷', pillsNeeded: 8, wallCount: 14 },
            { name: '月光湖', pillsNeeded: 8, wallCount: 15 },
            { name: '精灵森林', pillsNeeded: 9, wallCount: 16 },
            { name: '兔子小屋', pillsNeeded: 10, wallCount: 18 }
        ];
    }

    // 根据难度和关卡获取配置
    getDifficultyConfig(baseConfig, levelNum) {
        switch(this.difficulty) {
            case 'easy':
                // 简单难度：从只有不同颜色药片开始，逐步添加数学题、字母题
                return {
                    ...baseConfig,
                    pillsNeeded: Math.max(2, baseConfig.pillsNeeded - 1),
                    wallCount: Math.max(0, baseConfig.wallCount - 3),
                    // 关卡1-2：只有直接收集的药片（不同颜色）
                    // 关卡3-5：添加数学题
                    // 关卡6-8：添加颜色配对
                    // 关卡9+：添加字母题
                    hasPuzzles: levelNum >= 3,
                    puzzleCount: levelNum >= 3 ? Math.min(baseConfig.pillsNeeded, Math.max(1, Math.floor((levelNum - 2) / 2))) : 0,
                    hasMathPuzzles: levelNum >= 3,
                    hasColorPuzzles: levelNum >= 6,
                    hasLetterPuzzles: levelNum >= 9,
                    hasChinesePuzzles: false,
                    message: levelNum < 3 ? '收集不同颜色的药片救治小兔子！' :
                            levelNum < 6 ? '收集药片，解答数学题！' :
                            levelNum < 9 ? '收集药片，解答数学题和颜色配对！' :
                            '收集药片，解答各种题目！'
                };
            case 'medium':
                // 中等难度：从药片和数学题开始，逐步添加字母题、汉字题
                return {
                    ...baseConfig,
                    pillsNeeded: baseConfig.pillsNeeded,
                    wallCount: baseConfig.wallCount,
                    // 关卡1-3：药片 + 数学题
                    // 关卡4-6：添加颜色配对
                    // 关卡7-10：添加字母题
                    // 关卡11+：添加汉字题
                    hasPuzzles: true,
                    puzzleCount: Math.min(baseConfig.pillsNeeded, Math.max(1, Math.floor((levelNum + 1) / 2))),
                    hasMathPuzzles: true,
                    hasColorPuzzles: levelNum >= 4,
                    hasLetterPuzzles: levelNum >= 7,
                    hasChinesePuzzles: levelNum >= 11,
                    message: levelNum < 4 ? '收集药片，解答数学题！' :
                            levelNum < 7 ? '收集药片，解答数学题和颜色配对！' :
                            levelNum < 11 ? '收集药片，解答数学题、颜色配对和字母题！' :
                            '收集药片，解答各种题目！'
                };
            case 'hard':
                // 高阶难度：从药片、数学题和字母题开始，逐步添加汉字题
                return {
                    ...baseConfig,
                    pillsNeeded: baseConfig.pillsNeeded + 1,
                    wallCount: baseConfig.wallCount + 2,
                    // 关卡1-4：药片 + 数学题 + 颜色配对
                    // 关卡5-7：添加字母题
                    // 关卡8+：添加汉字题
                    hasPuzzles: true,
                    puzzleCount: Math.min(baseConfig.pillsNeeded + 1, Math.max(2, Math.floor((levelNum + 2) / 2))),
                    hasMathPuzzles: true,
                    hasColorPuzzles: true,
                    hasLetterPuzzles: levelNum >= 5,
                    hasChinesePuzzles: levelNum >= 8,
                    message: levelNum < 5 ? '收集药片，解答数学题和颜色配对！' :
                            levelNum < 8 ? '收集药片，解答数学题、颜色配对和字母题！' :
                            '收集药片，解答各种题目！'
                };
            default:
                return baseConfig;
        }
    }

    // 生成随机关卡
    generateRandomLevel(levelNum) {
        const levelConfigs = this.getLevelConfigs();
        const baseConfig = levelConfigs[Math.min(levelNum - 1, levelConfigs.length - 1)];
        const config = this.getDifficultyConfig(baseConfig, levelNum);

        // 医生起始位置（左下角）
        const doctorPos = { x: 0, y: this.gridHeight - 1 };

        // 兔子位置（右上角）
        const rabbitPos = { x: this.gridWidth - 1, y: 0 };

        // 创建统一的已占用位置集合
        const occupied = new Set([
            `${doctorPos.x},${doctorPos.y}`,
            `${rabbitPos.x},${rabbitPos.y}`
        ]);

        // 生成墙壁
        const walls = this.generateRandomWalls(config.wallCount, doctorPos, rabbitPos, occupied);
        walls.forEach(w => occupied.add(`${w.x},${w.y}`));

        // 创建关卡基础结构
        const level = {
            name: config.name,
            doctor: doctorPos,
            rabbit: rabbitPos,
            walls: walls,
            pills: [],
            puzzles: [],
            pillsNeeded: config.pillsNeeded,
            message: config.message
        };

        // 计算需要生成的药片数量
        const totalPillsNeeded = config.pillsNeeded;
        const puzzlePillCount = config.hasPuzzles ? Math.min(config.puzzleCount, totalPillsNeeded) : 0;
        const directPillCount = totalPillsNeeded - puzzlePillCount;

        // 生成直接收集的药片
        if (directPillCount > 0) {
            const directPills = this.generateRandomPills(directPillCount, occupied, 'direct');
            level.pills.push(...directPills);
            directPills.forEach(p => occupied.add(`${p.x},${p.y}`));
        }

        // 生成谜题药片
        if (puzzlePillCount > 0 && config.hasPuzzles) {
            const puzzlePills = this.generateRandomPills(puzzlePillCount, occupied, 'puzzle');
            level.pills.push(...puzzlePills);

            // 为每个谜题药片创建谜题
            puzzlePills.forEach(pill => {
                const puzzle = this.generatePuzzle(pill.x, pill.y, levelNum, config);
                level.puzzles.push(puzzle);
                occupied.add(`${pill.x},${pill.y}`);
            });
        }

        return level;
    }

    // 生成随机墙壁
    generateRandomWalls(count, doctorPos, rabbitPos, occupied) {
        const walls = [];
        let attempts = 0;
        const maxAttempts = 200;

        while (walls.length < count && attempts < maxAttempts) {
            attempts++;
            const x = Math.floor(Math.random() * this.gridWidth);
            const y = Math.floor(Math.random() * this.gridHeight);
            const key = `${x},${y}`;

            if (occupied.has(key)) continue;

            // 检查是否会阻挡路径
            walls.push({ x, y });
            if (this.hasPath(doctorPos, rabbitPos, walls)) {
                occupied.add(key);
            } else {
                walls.pop();
            }
        }

        return walls;
    }

    // 检查是否有路径
    hasPath(start, end, walls) {
        const queue = [start];
        const visited = new Set([`${start.x},${start.y}`]);
        const wallSet = new Set(walls.map(w => `${w.x},${w.y}`));

        while (queue.length > 0) {
            const current = queue.shift();
            if (current.x === end.x && current.y === end.y) return true;

            const directions = [[0, 1], [0, -1], [1, 0], [-1, 0]];
            for (const [dx, dy] of directions) {
                const nx = current.x + dx;
                const ny = current.y + dy;
                const key = `${nx},${ny}`;

                if (nx >= 0 && nx < this.gridWidth && ny >= 0 && ny < this.gridHeight &&
                    !visited.has(key) && !wallSet.has(key)) {
                    visited.add(key);
                    queue.push({ x: nx, y: ny });
                }
            }
        }

        return false;
    }

    // 生成随机药片
    generateRandomPills(count, occupied, type) {
        const pills = [];
        let attempts = 0;
        const maxAttempts = 100;

        while (pills.length < count && attempts < maxAttempts) {
            attempts++;
            const x = Math.floor(Math.random() * this.gridWidth);
            const y = Math.floor(Math.random() * this.gridHeight);
            const key = `${x},${y}`;

            if (occupied.has(key)) continue;

            pills.push({
                x, y,
                type: type,
                collected: false,
                color: this.getPillColor(pills.length)
            });
            occupied.add(key);
        }

        return pills;
    }

    // 获取药片颜色
    getPillColor(index) {
        const colors = ['#E91E63', '#2196F3', '#FF9800', '#9C27B0', '#00BCD4'];
        return colors[index % colors.length];
    }

    // 生成谜题
    generatePuzzle(x, y, levelNum, config) {
        const types = ['math'];
        if (config.hasColorPuzzles) types.push('color');
        if (config.hasLetterPuzzles) types.push('letter');
        if (config.hasChinesePuzzles) types.push('chinese');

        const type = types[Math.floor(Math.random() * types.length)];

        switch(type) {
            case 'math':
                return this.generateMathPuzzle(x, y, levelNum);
            case 'color':
                return this.generateColorPuzzle(x, y);
            case 'letter':
                return this.generateLetterPuzzle(x, y);
            case 'chinese':
                return this.generateChinesePuzzle(x, y);
            default:
                return this.generateMathPuzzle(x, y, levelNum);
        }
    }

    // 生成数学题
    generateMathPuzzle(x, y, levelNum) {
        const maxNum = levelNum <= 5 ? 5 : (levelNum <= 10 ? 8 : 10);
        const a = Math.floor(Math.random() * maxNum) + 1;
        const b = Math.floor(Math.random() * maxNum) + 1;
        const isAddition = Math.random() > 0.3 || a < b;

        let question, answer, options;

        if (isAddition) {
            question = `${a} + ${b} = ?`;
            answer = a + b;
        } else {
            const max = Math.max(a, b);
            const min = Math.min(a, b);
            question = `${max} - ${min} = ?`;
            answer = max - min;
        }

        options = this.generateOptions(answer, 0, maxNum * 2);

        // 生成语音文本，避免重复"等于几"，修复减号播报问题
        const audioQuestion = question.replace('+', '加').replace('-', '减').replace('=', '等于').replace('?', '几');

        return {
            x, y,
            type: 'math',
            question: question,
            answer: answer.toString(),
            options: options,
            audioText: audioQuestion,
            hint: `数一数：${isAddition ? `${'👆'.repeat(a)} + ${'👆'.repeat(b)}` : '从大的数开始减'}`,
            solved: false
        };
    }

    // 生成颜色配对题
    generateColorPuzzle(x, y) {
        const colors = [
            { name: '红色', value: 'red', emoji: '🔴' },
            { name: '蓝色', value: 'blue', emoji: '🔵' },
            { name: '绿色', value: 'green', emoji: '🟢' },
            { name: '黄色', value: 'yellow', emoji: '🟡' },
            { name: '紫色', value: 'purple', emoji: '🟣' }
        ];

        const targetColor = colors[Math.floor(Math.random() * colors.length)];
        const shuffled = [...colors].sort(() => Math.random() - 0.5);

        return {
            x, y,
            type: 'color',
            question: `找出 ${targetColor.emoji} ${targetColor.name}`,
            answer: targetColor.value,
            options: shuffled.map(c => ({ value: c.value, display: c.emoji, label: c.name })),
            audioText: `请找出，${targetColor.name}`,
            hint: `${targetColor.name}像${targetColor.name === '红色' ? '苹果' : targetColor.name === '蓝色' ? '天空' : targetColor.name === '绿色' ? '草地' : targetColor.name === '黄色' ? '香蕉' : '葡萄'}`,
            solved: false
        };
    }

    // 生成字母题
    generateLetterPuzzle(x, y) {
        const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        const letter = letters[Math.floor(Math.random() * letters.length)];
        const shuffled = [];

        while (shuffled.length < 3) {
            const randomLetter = letters[Math.floor(Math.random() * letters.length)];
            if (!shuffled.includes(randomLetter) && randomLetter !== letter) {
                shuffled.push(randomLetter);
            }
        }
        shuffled.push(letter);
        shuffled.sort(() => Math.random() - 0.5);

        return {
            x, y,
            type: 'letter',
            question: `找出字母 ${letter}`,
            answer: letter,
            options: shuffled.map(l => ({ value: l, display: l })),
            audioText: `请找出字母，${letter.split('').join(',')}`,
            hint: `字母 ${letter} 在字母表的第 ${letters.indexOf(letter) + 1} 个`,
            solved: false
        };
    }

    // 生成汉字题
    generateChinesePuzzle(x, y) {
        const characters = [
            { char: '日', hint: '太阳' },
            { char: '月', hint: '月亮' },
            { char: '水', hint: '喝水' },
            { char: '火', hint: '火焰' },
            { char: '木', hint: '树木' },
            { char: '土', hint: '土地' },
            { char: '山', hint: '大山' },
            { char: '石', hint: '石头' }
        ];

        const target = characters[Math.floor(Math.random() * characters.length)];
        const shuffled = [];

        while (shuffled.length < 3) {
            const randomChar = characters[Math.floor(Math.random() * characters.length)];
            if (!shuffled.includes(randomChar) && randomChar.char !== target.char) {
                shuffled.push(randomChar);
            }
        }
        shuffled.push(target);
        shuffled.sort(() => Math.random() - 0.5);

        return {
            x, y,
            type: 'chinese',
            question: `找出汉字 "${target.char}"`,
            answer: target.char,
            options: shuffled.map(c => ({ value: c.char, display: c.char, label: c.hint })),
            audioText: `请找出汉字，${target.char}`,
            hint: `这是${target.hint}的${target.char}`,
            solved: false
        };
    }

    // 生成选项
    generateOptions(correctAnswer, min, max) {
        const options = [correctAnswer];

        while (options.length < 3) {
            const wrong = Math.floor(Math.random() * (max - min + 1)) + min;
            if (!options.includes(wrong) && wrong >= 0) {
                options.push(wrong);
            }
        }

        return options.sort(() => Math.random() - 0.5).map(v => ({ value: v.toString(), display: v.toString() }));
    }

    // 加载关卡
    loadLevel(levelNum) {
        // 自适应canvas尺寸
        this.adaptCanvasSize();

        this.currentLevelData = this.generateRandomLevel(levelNum);
        const level = this.currentLevelData;

        this.doctor = { ...level.doctor };
        this.rabbit = { ...level.rabbit };
        this.pills = level.pills;
        this.walls = level.walls;
        this.puzzles = level.puzzles;
        this.particles = [];
        this.pillsCollected = 0;
        this.pillsNeeded = level.pillsNeeded;

        // 重置兔子康复状态
        this.rabbitHealed = false;
        this.rabbitJumpFrame = 0;

        // 随机天气
        this.setRandomWeather();

        this.updatePillDisplay();
        document.getElementById('pillsNeeded').textContent = this.pillsNeeded;
        document.getElementById('level').textContent = levelNum;

        if (level.message) {
            setTimeout(() => this.showMessage(level.message, '💝'), 500);
        }
    }

    // 设置随机天气
    setRandomWeather() {
        const weathers = [
            { type: 'sunny', name: '晴天', icon: '☀️', bg: '#87CEEB', particleColor: '#FFD700' },
            { type: 'cloudy', name: '多云', icon: '⛅', bg: '#B0C4DE', particleColor: '#D3D3D3' },
            { type: 'rainy', name: '下雨', icon: '🌧️', bg: '#778899', particleColor: '#4682B4' },
            { type: 'snowy', name: '下雪', icon: '❄️', bg: '#E6E6FA', particleColor: '#FFFFFF' },
            { type: 'windy', name: '大风', icon: '💨', bg: '#ADD8E6', particleColor: '#87CEEB' },
            { type: 'foggy', name: '有雾', icon: '🌫️', bg: '#D3D3D3', particleColor: '#C0C0C0' }
        ];

        this.currentWeather = weathers[Math.floor(Math.random() * weathers.length)];
        this.weatherEffects = [];

        // 更新天气显示
        const weatherDisplay = document.getElementById('weatherDisplay');
        if (weatherDisplay) {
            weatherDisplay.querySelector('.weather-icon').textContent = this.currentWeather.icon;
            weatherDisplay.querySelector('.weather-name').textContent = this.currentWeather.name;
        }

        // 初始化天气效果
        this.initWeatherEffects();

        // 播放天气背景音乐
        if (this.audioCtx) {
            this.playWeatherMusic(this.currentWeather.type);
        }
    }

    // 初始化天气效果
    initWeatherEffects() {
        if (!this.currentWeather) return;

        const count = 50;
        for (let i = 0; i < count; i++) {
            this.weatherEffects.push({
                x: Math.random() * this.canvas.width,
                y: Math.random() * this.canvas.height,
                speed: Math.random() * 2 + 1,
                size: Math.random() * 3 + 2,
                opacity: Math.random() * 0.5 + 0.3
            });
        }
    }

    // 绘制天气效果
    drawWeather() {
        if (!this.currentWeather) return;

        switch(this.currentWeather.type) {
            case 'rainy':
                this.drawRain();
                break;
            case 'snowy':
                this.drawSnow();
                break;
            case 'windy':
                this.drawWind();
                break;
            case 'foggy':
                this.drawFog();
                break;
            case 'sunny':
                this.drawSunshine();
                break;
            case 'cloudy':
                this.drawCloudy();
                break;
        }
    }

    // 绘制下雨
    drawRain() {
        this.ctx.strokeStyle = 'rgba(70, 130, 180, 0.6)';
        this.ctx.lineWidth = 2;

        this.weatherEffects.forEach(p => {
            this.ctx.beginPath();
            this.ctx.moveTo(p.x, p.y);
            this.ctx.lineTo(p.x - 2, p.y + 10);
            this.ctx.stroke();

            p.y += p.speed * 3;
            p.x -= 1;

            if (p.y > this.canvas.height) {
                p.y = -10;
                p.x = Math.random() * this.canvas.width;
            }
        });
    }

    // 绘制下雪
    drawSnow() {
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';

        this.weatherEffects.forEach(p => {
            this.ctx.beginPath();
            this.ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            this.ctx.fill();

            p.y += p.speed;
            p.x += Math.sin(p.y * 0.02) * 0.5;

            if (p.y > this.canvas.height) {
                p.y = -10;
                p.x = Math.random() * this.canvas.width;
            }
        });
    }

    // 绘制大风
    drawWind() {
        this.ctx.strokeStyle = 'rgba(135, 206, 235, 0.4)';
        this.ctx.lineWidth = 2;

        this.weatherEffects.forEach(p => {
            this.ctx.beginPath();
            this.ctx.moveTo(p.x, p.y);
            this.ctx.lineTo(p.x + 20, p.y - 5);
            this.ctx.stroke();

            p.x += p.speed * 2;

            if (p.x > this.canvas.width + 20) {
                p.x = -20;
                p.y = Math.random() * this.canvas.height;
            }
        });
    }

    // 绘制雾
    drawFog() {
        const gradient = this.ctx.createLinearGradient(0, 0, 0, this.canvas.height);
        gradient.addColorStop(0, 'rgba(200, 200, 200, 0.3)');
        gradient.addColorStop(0.5, 'rgba(200, 200, 200, 0.5)');
        gradient.addColorStop(1, 'rgba(200, 200, 200, 0.3)');

        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        this.weatherEffects.forEach(p => {
            this.ctx.fillStyle = `rgba(192, 192, 192, ${p.opacity * 0.3})`;
            this.ctx.beginPath();
            this.ctx.arc(p.x, p.y, p.size * 10, 0, Math.PI * 2);
            this.ctx.fill();

            p.x += 0.3;

            if (p.x > this.canvas.width + 50) {
                p.x = -50;
            }
        });
    }

    // 绘制晴天阳光效果
    drawSunshine() {
        const time = Date.now() * 0.001;
        const gradient = this.ctx.createRadialGradient(
            this.canvas.width * 0.8,
            this.canvas.height * 0.2,
            0,
            this.canvas.width * 0.8,
            this.canvas.height * 0.2,
            150
        );
        gradient.addColorStop(0, 'rgba(255, 215, 0, 0.15)');
        gradient.addColorStop(1, 'rgba(255, 215, 0, 0)');

        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // 阳光粒子
        this.weatherEffects.forEach(p => {
            const alpha = 0.3 + Math.sin(time + p.x * 0.01) * 0.2;
            this.ctx.fillStyle = `rgba(255, 215, 0, ${alpha})`;
            this.ctx.beginPath();
            this.ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            this.ctx.fill();

            p.y += 0.2;
            p.x += Math.sin(time + p.y * 0.01) * 0.3;

            if (p.y > this.canvas.height) {
                p.y = -10;
                p.x = Math.random() * this.canvas.width;
            }
        });
    }

    // 绘制多云效果
    drawCloudy() {
        const time = Date.now() * 0.0003;
        const cw = this.canvas.width;
        const ch = this.canvas.height;

        // 半透明云层遮罩
        this.ctx.fillStyle = 'rgba(200, 210, 220, 0.2)';
        this.ctx.fillRect(0, 0, cw, ch);

        // 绘制云朵
        const clouds = [
            { x: 0.15, y: 0.12, w: 0.25, h: 0.08, speed: 1 },
            { x: 0.55, y: 0.06, w: 0.30, h: 0.10, speed: 0.7 },
            { x: 0.35, y: 0.22, w: 0.20, h: 0.07, speed: 1.2 },
            { x: 0.75, y: 0.18, w: 0.22, h: 0.09, speed: 0.5 },
            { x: 0.05, y: 0.30, w: 0.18, h: 0.06, speed: 0.9 }
        ];

        clouds.forEach(cloud => {
            const cx = ((cloud.x + time * cloud.speed) % 1.4 - 0.2) * cw;
            const cy = cloud.y * ch;
            const w = cloud.w * cw;
            const h = cloud.h * ch;

            this.ctx.fillStyle = 'rgba(220, 225, 235, 0.55)';
            this.ctx.beginPath();
            this.ctx.ellipse(cx, cy, w * 0.5, h * 0.5, 0, 0, Math.PI * 2);
            this.ctx.fill();

            this.ctx.fillStyle = 'rgba(230, 235, 245, 0.45)';
            this.ctx.beginPath();
            this.ctx.ellipse(cx - w * 0.2, cy + h * 0.1, w * 0.35, h * 0.4, 0, 0, Math.PI * 2);
            this.ctx.fill();

            this.ctx.beginPath();
            this.ctx.ellipse(cx + w * 0.25, cy + h * 0.05, w * 0.3, h * 0.35, 0, 0, Math.PI * 2);
            this.ctx.fill();
        });
    }

    // ========== 天气背景音乐 (Web Audio API) ==========

    // 初始化音频上下文（需用户交互后调用）
    initWeatherAudio() {
        if (this.audioCtx) return;
        try {
            this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            this.weatherMusicGain = this.audioCtx.createGain();
            this.weatherMusicGain.gain.value = 0;
            this.weatherMusicGain.connect(this.audioCtx.destination);

            // 音效独立增益节点
            this.sfxGain = this.audioCtx.createGain();
            this.sfxGain.gain.value = 0.3;
            this.sfxGain.connect(this.audioCtx.destination);
        } catch (e) {
            console.log('Web Audio API 不可用');
        }
    }

    // 播放音效
    playSound(type) {
        if (!this.audioCtx) return;
        const ctx = this.audioCtx;
        const now = ctx.currentTime;
        const dest = this.sfxGain || ctx.destination;

        const createOsc = (oscType, freq, start, duration, gainVal = 0.15) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = oscType;
            osc.frequency.setValueAtTime(freq, now + start);
            gain.gain.setValueAtTime(gainVal, now + start);
            gain.gain.exponentialRampToValueAtTime(0.001, now + start + duration);
            osc.connect(gain);
            gain.connect(dest);
            osc.start(now + start);
            osc.stop(now + start + duration);
        };

        switch (type) {
            case 'move':
                createOsc('sine', 500, 0, 0.06, 0.05);
                createOsc('sine', 750, 0.02, 0.05, 0.03);
                break;
            case 'collect_pill':
                createOsc('sine', 660, 0, 0.12, 0.18);
                createOsc('sine', 990, 0.04, 0.15, 0.12);
                createOsc('triangle', 1320, 0.08, 0.2, 0.08);
                break;
            case 'puzzle_correct':
                createOsc('sine', 523, 0, 0.1, 0.2);
                createOsc('sine', 659, 0.1, 0.1, 0.2);
                createOsc('sine', 784, 0.2, 0.1, 0.2);
                createOsc('sine', 1047, 0.3, 0.3, 0.2);
                break;
            case 'puzzle_wrong':
                createOsc('square', 200, 0, 0.2, 0.06);
                createOsc('square', 150, 0.1, 0.25, 0.05);
                break;
            case 'heal':
                [523, 659, 784, 1047, 1319].forEach((freq, i) => {
                    createOsc('sine', freq, i * 0.1, 0.25, 0.12);
                });
                break;
            case 'level_complete':
                [523, 659, 784, 1047, 784, 1047].forEach((freq, i) => {
                    createOsc('sine', freq, i * 0.12, 0.2, 0.15);
                });
                break;
            case 'game_complete':
                [523, 659, 784, 1047, 1319, 1568, 1047, 1568].forEach((freq, i) => {
                    createOsc('sine', freq, i * 0.1, 0.25, 0.15);
                });
                break;
            case 'need_pills':
                createOsc('triangle', 300, 0, 0.15, 0.08);
                createOsc('triangle', 250, 0.1, 0.2, 0.06);
                break;
        }
    }

    // 创建白噪声缓冲区
    createNoiseBuffer(duration) {
        const sampleRate = this.audioCtx.sampleRate;
        const length = sampleRate * duration;
        const buffer = this.audioCtx.createBuffer(1, length, sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < length; i++) {
            data[i] = Math.random() * 2 - 1;
        }
        return buffer;
    }

    // 停止当前天气音乐
    stopWeatherMusic() {
        this.weatherMusicNodes.forEach(node => {
            try { node.stop(); } catch (e) { /* ignore */ }
            try { node.disconnect(); } catch (e) { /* ignore */ }
        });
        this.weatherMusicNodes = [];
    }

    // 播放天气背景音乐
    playWeatherMusic(type) {
        if (!this.audioCtx) return;
        this.stopWeatherMusic();

        // 如果音频上下文被暂停（浏览器自动播放策略），尝试恢复
        if (this.audioCtx.state === 'suspended') {
            this.audioCtx.resume();
        }

        // 淡入
        this.weatherMusicGain.gain.cancelScheduledValues(this.audioCtx.currentTime);
        this.weatherMusicGain.gain.setValueAtTime(0, this.audioCtx.currentTime);
        this.weatherMusicGain.gain.linearRampToValueAtTime(0.3, this.audioCtx.currentTime + 1);

        switch (type) {
            case 'sunny': this.playSunnyMusic(); break;
            case 'cloudy': this.playCloudyMusic(); break;
            case 'rainy': this.playRainyMusic(); break;
            case 'snowy': this.playSnowyMusic(); break;
            case 'windy': this.playWindyMusic(); break;
            case 'foggy': this.playFoggyMusic(); break;
        }
    }

    playSunnyMusic() {
        const ctx = this.audioCtx;
        // 温暖和弦：C4 + E4 + G4
        [261.63, 329.63, 392.00].forEach(freq => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.value = freq;
            gain.gain.value = 0.06;
            osc.connect(gain);
            gain.connect(this.weatherMusicGain);
            osc.start();
            this.weatherMusicNodes.push(osc);
        });
        // 鸟鸣般的高频装饰音
        const chirp = () => {
            if (!this.weatherMusicNodes.length) return;
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sine';
            const baseFreq = 1200 + Math.random() * 800;
            osc.frequency.setValueAtTime(baseFreq, ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(baseFreq * 1.3, ctx.currentTime + 0.1);
            gain.gain.setValueAtTime(0.03, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
            osc.connect(gain);
            gain.connect(this.weatherMusicGain);
            osc.start();
            osc.stop(ctx.currentTime + 0.3);
            setTimeout(chirp, 2000 + Math.random() * 4000);
        };
        setTimeout(chirp, 1000);
    }

    playCloudyMusic() {
        const ctx = this.audioCtx;
        // 低沉 pad：C3 + 低音 G3
        [130.81, 196.00].forEach(freq => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.value = freq;
            gain.gain.value = 0.07;
            // 缓慢 LFO 音量调制
            const lfo = ctx.createOscillator();
            const lfoGain = ctx.createGain();
            lfo.type = 'sine';
            lfo.frequency.value = 0.15;
            lfoGain.gain.value = 0.03;
            lfo.connect(lfoGain);
            lfoGain.connect(gain.gain);
            lfo.start();
            osc.connect(gain);
            gain.connect(this.weatherMusicGain);
            osc.start();
            this.weatherMusicNodes.push(osc, lfo);
        });
    }

    playRainyMusic() {
        const ctx = this.audioCtx;
        const noiseBuffer = this.createNoiseBuffer(4);
        // 持续白噪声 + 带通滤波模拟雨声
        const noise = ctx.createBufferSource();
        noise.buffer = noiseBuffer;
        noise.loop = true;
        const bp = ctx.createBiquadFilter();
        bp.type = 'bandpass';
        bp.frequency.value = 3000;
        bp.Q.value = 0.5;
        const noiseGain = ctx.createGain();
        noiseGain.gain.value = 0.15;
        noise.connect(bp);
        bp.connect(noiseGain);
        noiseGain.connect(this.weatherMusicGain);
        noise.start();
        this.weatherMusicNodes.push(noise);

        // 雨滴节奏音
        const drip = () => {
            if (!this.weatherMusicNodes.length) return;
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.value = 800 + Math.random() * 400;
            gain.gain.setValueAtTime(0.02, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
            osc.connect(gain);
            gain.connect(this.weatherMusicGain);
            osc.start();
            osc.stop(ctx.currentTime + 0.08);
            setTimeout(drip, 80 + Math.random() * 200);
        };
        setTimeout(drip, 500);
    }

    playSnowyMusic() {
        const ctx = this.audioCtx;
        // 高频柔和颤音
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.value = 600;
        gain.gain.value = 0.04;
        // 缓慢颤音
        const vibrato = ctx.createOscillator();
        const vibratoGain = ctx.createGain();
        vibrato.type = 'sine';
        vibrato.frequency.value = 2;
        vibratoGain.gain.value = 15;
        vibrato.connect(vibratoGain);
        vibratoGain.connect(osc.frequency);
        vibrato.start();
        osc.connect(gain);
        gain.connect(this.weatherMusicGain);
        osc.start();
        this.weatherMusicNodes.push(osc, vibrato);

        // 低音 pad 衬底
        const pad = ctx.createOscillator();
        const padGain = ctx.createGain();
        pad.type = 'sine';
        pad.frequency.value = 220;
        padGain.gain.value = 0.03;
        pad.connect(padGain);
        padGain.connect(this.weatherMusicGain);
        pad.start();
        this.weatherMusicNodes.push(pad);
    }

    playWindyMusic() {
        const ctx = this.audioCtx;
        const noiseBuffer = this.createNoiseBuffer(4);
        // 粉噪声模拟风声
        const noise = ctx.createBufferSource();
        noise.buffer = noiseBuffer;
        noise.loop = true;
        const lp = ctx.createBiquadFilter();
        lp.type = 'lowpass';
        lp.frequency.value = 800;
        lp.Q.value = 1;
        // LFO 调制滤波器频率产生风的起伏感
        const lfo = ctx.createOscillator();
        const lfoGain = ctx.createGain();
        lfo.type = 'sine';
        lfo.frequency.value = 0.3;
        lfoGain.gain.value = 400;
        lfo.connect(lfoGain);
        lfoGain.connect(lp.frequency);
        lfo.start();
        const noiseGain = ctx.createGain();
        noiseGain.gain.value = 0.12;
        noise.connect(lp);
        lp.connect(noiseGain);
        noiseGain.connect(this.weatherMusicGain);
        noise.start();
        this.weatherMusicNodes.push(noise, lfo);
    }

    playFoggyMusic() {
        const ctx = this.audioCtx;
        // 低频 drone + 大量泛音营造朦胧感
        [82.41, 110.00, 164.81].forEach(freq => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.value = freq;
            gain.gain.value = 0.04;
            // 缓慢音量漂浮
            const lfo = ctx.createOscillator();
            const lfoGain = ctx.createGain();
            lfo.type = 'sine';
            lfo.frequency.value = 0.08 + Math.random() * 0.05;
            lfoGain.gain.value = 0.02;
            lfo.connect(lfoGain);
            lfoGain.connect(gain.gain);
            lfo.start();
            osc.connect(gain);
            gain.connect(this.weatherMusicGain);
            osc.start();
            this.weatherMusicNodes.push(osc, lfo);
        });
    }

    // ========== 天气背景音乐结束 ==========

    // 显示谜题弹窗
    showPuzzleModal(puzzle) {
        this.currentPuzzle = puzzle;
        this.gameState = 'puzzle';

        const modal = document.getElementById('puzzleModal');
        const questionEl = document.getElementById('puzzleQuestion');
        const optionsEl = document.getElementById('puzzleOptions');
        const typeIcon = document.getElementById('puzzleTypeIcon');
        const hintText = document.getElementById('hintText');

        const typeIcons = {
            math: '🔢',
            color: '🎨',
            letter: '🔤',
            chinese: '中'
        };

        typeIcon.textContent = typeIcons[puzzle.type] || '❓';
        questionEl.textContent = puzzle.question;
        hintText.classList.add('hidden');
        hintText.textContent = '';

        optionsEl.innerHTML = '';
        puzzle.options.forEach(option => {
            const btn = document.createElement('button');
            btn.className = 'answer-option';
            btn.dataset.answer = option.value;
            btn.innerHTML = option.display;
            if (option.label) {
                btn.innerHTML += `<br><small>${option.label}</small>`;
            }
            btn.addEventListener('click', () => this.checkAnswer(option.value));
            optionsEl.appendChild(btn);
        });

        modal.classList.remove('hidden');

        // 自动播放语音
        setTimeout(() => this.playPuzzleAudio(), 300);
    }

    // 隐藏谜题弹窗
    hidePuzzleModal() {
        document.getElementById('puzzleModal').classList.add('hidden');
        this.gameState = 'playing';
        this.currentPuzzle = null;
        this.pendingMove = null;
    }

    // 检查答案
    checkAnswer(answer) {
        if (!this.currentPuzzle) return;

        const options = document.querySelectorAll('.answer-option');
        const correct = answer === this.currentPuzzle.answer;

        options.forEach(btn => {
            btn.disabled = true;
            if (btn.dataset.answer === this.currentPuzzle.answer) {
                btn.classList.add('correct');
            } else if (btn.dataset.answer === answer && !correct) {
                btn.classList.add('wrong');
            }
        });

        if (correct) {
            this.currentPuzzle.solved = true;
            this.playSound('puzzle_correct');

            // 找到对应的药片并收集
            const pill = this.pills.find(p =>
                p.x === this.currentPuzzle.x && p.y === this.currentPuzzle.y && !p.collected
            );
            if (pill) {
                pill.collected = true;
                this.pillsCollected++;
                this.createCollectionEffect(pill.x, pill.y, 'pill');
                this.updatePillDisplay();
            }

            if (this.pendingMove) {
                this.moveDoctor(this.pendingMove.x, this.pendingMove.y);
            }

            setTimeout(() => {
                this.hidePuzzleModal();
                this.showMessage('答对了！获得药片！', '💊');

                if (this.pillsCollected >= this.pillsNeeded) {
                    setTimeout(() => this.showMessage('药片收集够了，快去救治小兔子！', '🐰'), 1500);
                }
            }, 1000);
        } else {
            this.playSound('puzzle_wrong');
            setTimeout(() => {
                options.forEach(btn => {
                    btn.disabled = false;
                    btn.classList.remove('correct', 'wrong');
                });
            }, 1000);
        }
    }

    // 显示提示
    showHint() {
        if (!this.currentPuzzle) return;
        const hintText = document.getElementById('hintText');
        hintText.textContent = this.currentPuzzle.hint;
        hintText.classList.remove('hidden');
    }

    // 关卡完成
    levelComplete() {
        this.gameState = 'levelComplete';
        this.stopWeatherMusic();
        this.playSound('level_complete');
        this.showScreen('levelCompleteScreen');

        // 绘制全身蹦跳的小兔子
        this.drawFullRabbit();

        // 语音播报
        setTimeout(() => {
            this.speak('谢谢你医生，我感觉好多了');
        }, 500);

        if (this.currentLevel < this.maxLevels) {
            this.unlockLevel(this.currentLevel + 1);
        }
    }

    // 绘制全身蹦跳的小兔子（关卡完成页面）
    drawFullRabbit() {
        const canvas = document.getElementById('rabbitCanvas');
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        const width = canvas.width;
        const height = canvas.height;
        let frame = 0;

        const animate = () => {
            ctx.clearRect(0, 0, width, height);

            // 跳跃动画
            const jumpOffset = Math.sin(frame * 0.1) * 15;
            const squash = 1 + Math.sin(frame * 0.1) * 0.05;
            const stretch = 1 - Math.sin(frame * 0.1) * 0.05;

            ctx.save();
            ctx.translate(width / 2, height / 2 + jumpOffset);
            ctx.scale(stretch, squash);

            // 阴影
            ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
            ctx.beginPath();
            ctx.ellipse(0, 80 - jumpOffset, 40, 10, 0, 0, Math.PI * 2);
            ctx.fill();

            // 身体
            ctx.fillStyle = 'white';
            ctx.beginPath();
            ctx.ellipse(0, 30, 35, 45, 0, 0, Math.PI * 2);
            ctx.fill();

            // 头部
            ctx.fillStyle = 'white';
            ctx.beginPath();
            ctx.arc(0, -20, 30, 0, Math.PI * 2);
            ctx.fill();

            // 左耳朵
            ctx.fillStyle = 'white';
            ctx.beginPath();
            ctx.ellipse(-12, -60, 8, 25, -0.2, 0, Math.PI * 2);
            ctx.fill();

            // 右耳朵
            ctx.beginPath();
            ctx.ellipse(12, -60, 8, 25, 0.2, 0, Math.PI * 2);
            ctx.fill();

            // 耳朵内侧
            ctx.fillStyle = '#FFB6C1';
            ctx.beginPath();
            ctx.ellipse(-12, -60, 4, 18, -0.2, 0, Math.PI * 2);
            ctx.fill();

            ctx.beginPath();
            ctx.ellipse(12, -60, 4, 18, 0.2, 0, Math.PI * 2);
            ctx.fill();

            // 眼睛（开心）
            ctx.fillStyle = '#333';
            ctx.beginPath();
            ctx.arc(-10, -25, 4, 0, Math.PI * 2);
            ctx.arc(10, -25, 4, 0, Math.PI * 2);
            ctx.fill();

            // 眼睛高光
            ctx.fillStyle = 'white';
            ctx.beginPath();
            ctx.arc(-9, -26, 2, 0, Math.PI * 2);
            ctx.arc(11, -26, 2, 0, Math.PI * 2);
            ctx.fill();

            // 腮红
            ctx.fillStyle = '#FFB6C1';
            ctx.beginPath();
            ctx.arc(-18, -15, 6, 0, Math.PI * 2);
            ctx.arc(18, -15, 6, 0, Math.PI * 2);
            ctx.fill();

            // 微笑
            ctx.strokeStyle = '#333';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(0, -18, 12, 0.2, Math.PI - 0.2);
            ctx.stroke();

            // 鼻子
            ctx.fillStyle = '#FFB6C1';
            ctx.beginPath();
            ctx.arc(0, -20, 3, 0, Math.PI * 2);
            ctx.fill();

            // 前爪
            ctx.fillStyle = 'white';
            ctx.beginPath();
            ctx.ellipse(-25, 50, 8, 12, -0.3, 0, Math.PI * 2);
            ctx.fill();

            ctx.beginPath();
            ctx.ellipse(25, 50, 8, 12, 0.3, 0, Math.PI * 2);
            ctx.fill();

            // 后腿
            ctx.fillStyle = 'white';
            ctx.beginPath();
            ctx.ellipse(-20, 70, 12, 8, 0, 0, Math.PI * 2);
            ctx.fill();

            ctx.beginPath();
            ctx.ellipse(20, 70, 12, 8, 0, 0, Math.PI * 2);
            ctx.fill();

            // 尾巴
            ctx.fillStyle = 'white';
            ctx.beginPath();
            ctx.arc(0, 70, 10, 0, Math.PI * 2);
            ctx.fill();

            ctx.restore();

            // 爱心效果
            const heartCount = 6;
            for (let i = 0; i < heartCount; i++) {
                const angle = (frame * 0.05) + (i * Math.PI * 2 / heartCount);
                const radius = 60 + Math.sin(frame * 0.1 + i) * 10;
                const heartX = width / 2 + Math.cos(angle) * radius;
                const heartY = height / 2 + Math.sin(angle) * radius - 20;
                const heartSize = 15 + Math.sin(frame * 0.1 + i) * 5;
                const alpha = 0.5 + Math.sin(frame * 0.1 + i) * 0.3;

                ctx.fillStyle = `rgba(255, 105, 180, ${alpha})`;
                ctx.font = `${heartSize}px Arial`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText('❤️', heartX, heartY);
            }

            frame++;
            if (this.gameState === 'levelComplete') {
                requestAnimationFrame(animate);
            }
        };

        animate();
    }

    // 下一关
    nextLevel() {
        if (this.currentLevel < this.maxLevels) {
            this.currentLevel++;
            this.showScreen('gameScreen');
            this.loadLevel(this.currentLevel);
            this.gameState = 'playing';
        } else {
            this.gameComplete();
        }
    }

    // 重新开始关卡
    restartLevel() {
        this.showScreen('gameScreen');
        this.loadLevel(this.currentLevel);
        this.gameState = 'playing';
    }

    // 游戏完成
    gameComplete() {
        this.gameState = 'gameComplete';
        this.stopWeatherMusic();
        this.playSound('game_complete');
        document.getElementById('totalPills').textContent = this.pillsCollected;
        document.getElementById('healedRabbits').textContent = this.currentLevel;
        this.showScreen('gameCompleteScreen');
    }

    // 重置游戏
    resetGame() {
        this.currentLevel = 1;
        this.score = 0;
        this.difficultyProgress[this.difficulty] = [1];
        this.saveDifficultyProgress();
        this.renderLevelGrid();
        this.showScreen('gameScreen');
        this.loadLevel(1);
        this.gameState = 'playing';
    }

    // 游戏主循环
    startGameLoop() {
        const loop = (timestamp) => {
            if (this.gameState === 'playing' || this.gameState === 'puzzle' || this.gameState === 'healing') {
                this.update(timestamp);
                this.render();
            }
            this.animationFrame = requestAnimationFrame(loop);
        };
        this.animationFrame = requestAnimationFrame(loop);
    }

    // 更新游戏状态
    update(timestamp) {
        const deltaTime = timestamp - this.lastTime;
        this.lastTime = timestamp;

        // 更新粒子
        this.particles = this.particles.filter(p => {
            p.x += p.vx;
            p.y += p.vy;
            p.life--;
            p.vy += 0.1;
            return p.life > 0;
        });

        // 更新小兔子跳跃动画
        if (this.rabbitHealed) {
            this.rabbitJumpFrame += 0.15;
        }
    }

    // 渲染游戏
    render() {
        // 清空画布 - 根据天气设置背景色
        if (this.currentWeather) {
            this.ctx.fillStyle = this.currentWeather.bg;
        } else {
            this.ctx.fillStyle = '#E8F5E9';
        }
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // 绘制天气效果
        this.drawWeather();

        // 绘制网格
        this.drawGrid();

        // 绘制可到达格子高亮
        if (this.gameState === 'playing') {
            this.drawReachableCells();
        }

        // 绘制墙壁
        this.drawWalls();

        // 绘制药片
        this.drawPills();

        // 绘制兔子
        this.drawRabbit();

        // 绘制医生
        this.drawDoctor();

        // 绘制谜题标记
        this.drawPuzzleMarkers();

        // 绘制粒子
        this.drawParticles();
    }

    // 绘制网格
    drawGrid() {
        // 交替格子底色，让网格更清晰
        for (let x = 0; x < this.gridWidth; x++) {
            for (let y = 0; y < this.gridHeight; y++) {
                if ((x + y) % 2 === 0) {
                    this.ctx.fillStyle = 'rgba(200, 230, 201, 0.35)';
                } else {
                    this.ctx.fillStyle = 'rgba(232, 245, 233, 0.35)';
                }
                this.ctx.fillRect(x * this.tileSize, y * this.tileSize, this.tileSize, this.tileSize);
            }
        }

        // 网格线 - 使用半像素偏移确保线条锐利
        this.ctx.strokeStyle = 'rgba(76, 175, 80, 0.3)';
        this.ctx.lineWidth = 1;

        for (let x = 0; x <= this.gridWidth; x++) {
            const px = Math.round(x * this.tileSize) + 0.5;
            this.ctx.beginPath();
            this.ctx.moveTo(px, 0);
            this.ctx.lineTo(px, this.canvas.height);
            this.ctx.stroke();
        }

        for (let y = 0; y <= this.gridHeight; y++) {
            const py = Math.round(y * this.tileSize) + 0.5;
            this.ctx.beginPath();
            this.ctx.moveTo(0, py);
            this.ctx.lineTo(this.canvas.width, py);
            this.ctx.stroke();
        }

        // 外边框加粗
        this.ctx.strokeStyle = 'rgba(56, 142, 60, 0.5)';
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(0.5, 0.5, this.canvas.width - 1, this.canvas.height - 1);
    }

    // 绘制可到达格子高亮
    drawReachableCells() {
        const dx = this.doctor.x;
        const dy = this.doctor.y;
        const directions = [[0, -1], [0, 1], [-1, 0], [1, 0]];
        const level = this.currentLevelData;
        if (!level) return;

        directions.forEach(([ox, oy]) => {
            const nx = dx + ox;
            const ny = dy + oy;
            if (nx < 0 || nx >= this.gridWidth || ny < 0 || ny >= this.gridHeight) return;
            if (level.walls.some(w => w.x === nx && w.y === ny)) return;

            const pulse = Math.sin(Date.now() * 0.005) * 0.15 + 0.25;

            this.ctx.fillStyle = `rgba(102, 187, 106, ${pulse})`;
            this.ctx.fillRect(nx * this.tileSize + 2, ny * this.tileSize + 2, this.tileSize - 4, this.tileSize - 4);

            this.ctx.strokeStyle = `rgba(76, 175, 80, ${pulse + 0.2})`;
            this.ctx.lineWidth = 2;
            this.ctx.setLineDash([4, 4]);
            this.ctx.strokeRect(nx * this.tileSize + 6, ny * this.tileSize + 6, this.tileSize - 12, this.tileSize - 12);
            this.ctx.setLineDash([]);
        });
    }

    // 绘制墙壁
    drawWalls() {
        this.walls.forEach(wall => {
            const x = wall.x * this.tileSize;
            const y = wall.y * this.tileSize;
            const size = this.tileSize;

            // 树干
            this.ctx.fillStyle = '#8D6E63';
            this.ctx.fillRect(x + size * 0.2, y + size * 0.2, size * 0.6, size * 0.6);

            // 树叶
            this.ctx.fillStyle = '#66BB6A';
            this.ctx.beginPath();
            this.ctx.arc(x + size * 0.5, y + size * 0.3, size * 0.35, 0, Math.PI * 2);
            this.ctx.fill();

            this.ctx.beginPath();
            this.ctx.arc(x + size * 0.3, y + size * 0.5, size * 0.25, 0, Math.PI * 2);
            this.ctx.fill();

            this.ctx.beginPath();
            this.ctx.arc(x + size * 0.7, y + size * 0.5, size * 0.25, 0, Math.PI * 2);
            this.ctx.fill();
        });
    }

    // 绘制药片
    drawPills() {
        this.pills.forEach(pill => {
            if (pill.collected) return;

            const x = pill.x * this.tileSize + this.tileSize / 2;
            const y = pill.y * this.tileSize + this.tileSize / 2;
            const radius = this.tileSize * 0.25;

            // 药片光晕
            const gradient = this.ctx.createRadialGradient(x, y, 0, x, y, radius * 1.5);
            gradient.addColorStop(0, pill.color + '80');
            gradient.addColorStop(1, pill.color + '00');
            this.ctx.fillStyle = gradient;
            this.ctx.beginPath();
            this.ctx.arc(x, y, radius * 1.5, 0, Math.PI * 2);
            this.ctx.fill();

            // 药片主体
            this.ctx.fillStyle = pill.color;
            this.ctx.beginPath();
            this.ctx.ellipse(x, y, radius, radius * 0.6, 0, 0, Math.PI * 2);
            this.ctx.fill();

            // 药片高光
            this.ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
            this.ctx.beginPath();
            this.ctx.ellipse(x - radius * 0.3, y - radius * 0.2, radius * 0.3, radius * 0.2, -0.3, 0, Math.PI * 2);
            this.ctx.fill();

            // 药片上的十字
            this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
            this.ctx.lineWidth = 2;
            this.ctx.beginPath();
            this.ctx.moveTo(x - radius * 0.3, y);
            this.ctx.lineTo(x + radius * 0.3, y);
            this.ctx.moveTo(x, y - radius * 0.2);
            this.ctx.lineTo(x, y + radius * 0.2);
            this.ctx.stroke();
        });
    }

    // 绘制兔子
    drawRabbit() {
        const x = this.rabbit.x * this.tileSize;
        const y = this.rabbit.y * this.tileSize;
        const size = this.tileSize;

        // 如果小兔子康复了，添加跳跃动画偏移
        let jumpOffset = 0;
        if (this.rabbitHealed) {
            jumpOffset = Math.sin(this.rabbitJumpFrame) * size * 0.15;
        }

        // 床
        this.ctx.fillStyle = '#8D6E63';
        this.ctx.fillRect(x + size * 0.1, y + size * 0.5, size * 0.8, size * 0.4);

        // 被子
        this.ctx.fillStyle = this.rabbitHealed ? '#C8E6C9' : '#FFCDD2'; // 康复后被子变绿色
        this.ctx.fillRect(x + size * 0.1, y + size * 0.55, size * 0.8, size * 0.35);

        // 枕头
        this.ctx.fillStyle = 'white';
        this.ctx.beginPath();
        this.ctx.ellipse(x + size * 0.3, y + size * 0.45, size * 0.15, size * 0.1, 0, 0, Math.PI * 2);
        this.ctx.fill();

        // 兔子头（添加跳跃偏移）
        this.ctx.fillStyle = 'white';
        this.ctx.beginPath();
        this.ctx.arc(x + size * 0.5, y + size * 0.35 - jumpOffset, size * 0.2, 0, Math.PI * 2);
        this.ctx.fill();

        // 兔子耳朵（添加跳跃偏移）
        this.ctx.fillStyle = 'white';
        this.ctx.beginPath();
        this.ctx.ellipse(x + size * 0.4, y + size * 0.15 - jumpOffset, size * 0.06, size * 0.15, -0.2, 0, Math.PI * 2);
        this.ctx.fill();

        this.ctx.beginPath();
        this.ctx.ellipse(x + size * 0.6, y + size * 0.15 - jumpOffset, size * 0.06, size * 0.15, 0.2, 0, Math.PI * 2);
        this.ctx.fill();

        // 耳朵内侧（添加跳跃偏移）
        this.ctx.fillStyle = '#FFB6C1';
        this.ctx.beginPath();
        this.ctx.ellipse(x + size * 0.4, y + size * 0.15 - jumpOffset, size * 0.03, size * 0.1, -0.2, 0, Math.PI * 2);
        this.ctx.fill();

        this.ctx.beginPath();
        this.ctx.ellipse(x + size * 0.6, y + size * 0.15 - jumpOffset, size * 0.03, size * 0.1, 0.2, 0, Math.PI * 2);
        this.ctx.fill();

        if (this.rabbitHealed) {
            // 康复后：睁开的开心眼睛
            this.ctx.fillStyle = '#333';
            // 左眼
            this.ctx.beginPath();
            this.ctx.arc(x + size * 0.44, y + size * 0.33 - jumpOffset, size * 0.03, 0, Math.PI * 2);
            this.ctx.fill();
            // 右眼
            this.ctx.beginPath();
            this.ctx.arc(x + size * 0.56, y + size * 0.33 - jumpOffset, size * 0.03, 0, Math.PI * 2);
            this.ctx.fill();

            // 开心的微笑
            this.ctx.strokeStyle = '#333';
            this.ctx.lineWidth = 2;
            this.ctx.beginPath();
            this.ctx.arc(x + size * 0.5, y + size * 0.35 - jumpOffset, size * 0.08, 0.2, Math.PI - 0.2);
            this.ctx.stroke();

            // 腮红
            this.ctx.fillStyle = '#FFB6C1';
            this.ctx.beginPath();
            this.ctx.arc(x + size * 0.38, y + size * 0.35 - jumpOffset, size * 0.04, 0, Math.PI * 2);
            this.ctx.arc(x + size * 0.62, y + size * 0.35 - jumpOffset, size * 0.04, 0, Math.PI * 2);
            this.ctx.fill();

            // 爱心表情效果
            if (this.rabbitHealed) {
                // 绘制飘动的爱心
                const heartCount = 5;
                for (let i = 0; i < heartCount; i++) {
                    const heartPhase = this.rabbitJumpFrame + i * 1.5;
                    const heartX = x + size * (0.3 + i * 0.15) + Math.sin(heartPhase * 0.5) * size * 0.1;
                    const heartY = y + size * 0.1 - jumpOffset - (heartPhase % 5) * size * 0.08;
                    const heartAlpha = 1 - (heartPhase % 5) / 5;
                    const heartSize = size * 0.08 * (0.8 + Math.sin(heartPhase) * 0.2);

                    this.ctx.fillStyle = `rgba(255, 105, 180, ${heartAlpha})`;
                    this.ctx.font = `${heartSize * 2}px Arial`;
                    this.ctx.textAlign = 'center';
                    this.ctx.textBaseline = 'middle';
                    this.ctx.fillText('❤️', heartX, heartY);
                }
            }

            // 感谢文字气泡
            if (this.rabbitJumpFrame < 15) {
                const bubbleAlpha = Math.min(1, 1 - this.rabbitJumpFrame / 15);
                this.ctx.globalAlpha = bubbleAlpha;

                this.ctx.fillStyle = 'white';
                this.ctx.strokeStyle = '#E91E63';
                this.ctx.lineWidth = 2;
                this.ctx.beginPath();
                this.ctx.roundRect(x + size * 0.6, y + size * 0.05 - jumpOffset, size * 0.8, size * 0.25, 10);
                this.ctx.fill();
                this.ctx.stroke();

                // 气泡尾巴
                this.ctx.beginPath();
                this.ctx.moveTo(x + size * 0.65, y + size * 0.25 - jumpOffset);
                this.ctx.lineTo(x + size * 0.6, y + size * 0.35 - jumpOffset);
                this.ctx.lineTo(x + size * 0.7, y + size * 0.25 - jumpOffset);
                this.ctx.fill();
                this.ctx.stroke();

                // 文字
                this.ctx.fillStyle = '#E91E63';
                this.ctx.font = `bold ${size * 0.1}px Arial`;
                this.ctx.textAlign = 'center';
                this.ctx.textBaseline = 'middle';
                this.ctx.fillText('❤️ 谢谢医生!', x + size * 1.0, y + size * 0.175 - jumpOffset);

                this.ctx.globalAlpha = 1;
            }
        } else {
            // 生病状态：闭着的眼睛
            this.ctx.strokeStyle = '#333';
            this.ctx.lineWidth = 2;
            this.ctx.beginPath();
            this.ctx.moveTo(x + size * 0.42, y + size * 0.33);
            this.ctx.lineTo(x + size * 0.46, y + size * 0.33);
            this.ctx.moveTo(x + size * 0.54, y + size * 0.33);
            this.ctx.lineTo(x + size * 0.58, y + size * 0.33);
            this.ctx.stroke();

            // 鼻子
            this.ctx.fillStyle = '#FFB6C1';
            this.ctx.beginPath();
            this.ctx.arc(x + size * 0.5, y + size * 0.38, size * 0.03, 0, Math.PI * 2);
            this.ctx.fill();

            // 温度计
            this.ctx.fillStyle = '#E0E0E0';
            this.ctx.fillRect(x + size * 0.65, y + size * 0.25, size * 0.04, size * 0.2);
            this.ctx.fillStyle = '#EF5350';
            this.ctx.beginPath();
            this.ctx.arc(x + size * 0.67, y + size * 0.48, size * 0.04, 0, Math.PI * 2);
            this.ctx.fill();
        }
    }

    // 绘制医生
    drawDoctor() {
        const x = this.doctor.x * this.tileSize;
        const y = this.doctor.y * this.tileSize;
        const size = this.tileSize;

        // 阴影
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
        this.ctx.beginPath();
        this.ctx.ellipse(x + size * 0.5, y + size * 0.88, size * 0.3, size * 0.08, 0, 0, Math.PI * 2);
        this.ctx.fill();

        // 腿
        this.ctx.strokeStyle = '#37474F';
        this.ctx.lineWidth = size * 0.1;
        this.ctx.lineCap = 'round';
        this.ctx.beginPath();
        this.ctx.moveTo(x + size * 0.4, y + size * 0.85);
        this.ctx.lineTo(x + size * 0.38, y + size * 0.98);
        this.ctx.moveTo(x + size * 0.6, y + size * 0.85);
        this.ctx.lineTo(x + size * 0.62, y + size * 0.98);
        this.ctx.stroke();

        // 鞋子
        this.ctx.fillStyle = '#263238';
        this.ctx.beginPath();
        this.ctx.ellipse(x + size * 0.36, y + size * 0.98, size * 0.07, size * 0.04, 0, 0, Math.PI * 2);
        this.ctx.ellipse(x + size * 0.64, y + size * 0.98, size * 0.07, size * 0.04, 0, 0, Math.PI * 2);
        this.ctx.fill();

        // 身体（白大褂）
        const coatGrad = this.ctx.createLinearGradient(x, y + size * 0.4, x, y + size * 0.9);
        coatGrad.addColorStop(0, '#FFFFFF');
        coatGrad.addColorStop(1, '#F5F5F5');
        this.ctx.fillStyle = coatGrad;
        this.ctx.beginPath();
        this.ctx.moveTo(x + size * 0.28, y + size * 0.85);
        this.ctx.lineTo(x + size * 0.33, y + size * 0.45);
        this.ctx.lineTo(x + size * 0.67, y + size * 0.45);
        this.ctx.lineTo(x + size * 0.72, y + size * 0.85);
        this.ctx.closePath();
        this.ctx.fill();

        // 白大褂口袋
        this.ctx.strokeStyle = '#E0E0E0';
        this.ctx.lineWidth = 1;
        this.ctx.strokeRect(x + size * 0.6, y + size * 0.6, size * 0.08, size * 0.08);
        // 口袋里的笔
        this.ctx.fillStyle = '#E91E63';
        this.ctx.fillRect(x + size * 0.62, y + size * 0.57, size * 0.02, size * 0.06);
        this.ctx.fillStyle = '#2196F3';
        this.ctx.fillRect(x + size * 0.65, y + size * 0.58, size * 0.02, size * 0.05);

        // 白大褂纽扣
        this.ctx.fillStyle = '#B0BEC5';
        this.ctx.beginPath();
        this.ctx.arc(x + size * 0.5, y + size * 0.55, size * 0.02, 0, Math.PI * 2);
        this.ctx.arc(x + size * 0.5, y + size * 0.65, size * 0.02, 0, Math.PI * 2);
        this.ctx.fill();

        // 白大褂领口
        this.ctx.strokeStyle = '#90A4AE';
        this.ctx.lineWidth = 1.5;
        this.ctx.beginPath();
        this.ctx.moveTo(x + size * 0.42, y + size * 0.45);
        this.ctx.lineTo(x + size * 0.5, y + size * 0.53);
        this.ctx.lineTo(x + size * 0.58, y + size * 0.45);
        this.ctx.stroke();

        // 脖子
        this.ctx.fillStyle = '#FFCCBC';
        this.ctx.fillRect(x + size * 0.45, y + size * 0.38, size * 0.1, size * 0.1);

        // 头
        this.ctx.fillStyle = '#FFCCBC';
        this.ctx.beginPath();
        this.ctx.arc(x + size * 0.5, y + size * 0.28, size * 0.18, 0, Math.PI * 2);
        this.ctx.fill();

        // 头发
        this.ctx.fillStyle = '#5D4037';
        this.ctx.beginPath();
        this.ctx.arc(x + size * 0.5, y + size * 0.23, size * 0.19, Math.PI, 0);
        this.ctx.fill();
        // 头发侧边
        this.ctx.fillRect(x + size * 0.31, y + size * 0.2, size * 0.06, size * 0.1);
        this.ctx.fillRect(x + size * 0.63, y + size * 0.2, size * 0.06, size * 0.1);

        // 医生帽
        this.ctx.fillStyle = 'white';
        this.ctx.beginPath();
        this.ctx.ellipse(x + size * 0.5, y + size * 0.13, size * 0.16, size * 0.05, 0, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.fillRect(x + size * 0.35, y + size * 0.08, size * 0.3, size * 0.1);
        // 帽檐底部弧线
        this.ctx.fillStyle = '#F5F5F5';
        this.ctx.beginPath();
        this.ctx.ellipse(x + size * 0.5, y + size * 0.18, size * 0.16, size * 0.04, 0, 0, Math.PI * 2);
        this.ctx.fill();
        // 红十字标记
        this.ctx.fillStyle = '#E91E63';
        this.ctx.fillRect(x + size * 0.47, y + size * 0.06, size * 0.06, size * 0.12);
        this.ctx.fillRect(x + size * 0.44, y + size * 0.09, size * 0.12, size * 0.06);

        // 眼睛
        this.ctx.fillStyle = '#333';
        this.ctx.beginPath();
        this.ctx.arc(x + size * 0.43, y + size * 0.26, size * 0.035, 0, Math.PI * 2);
        this.ctx.arc(x + size * 0.57, y + size * 0.26, size * 0.035, 0, Math.PI * 2);
        this.ctx.fill();

        // 眼睛高光
        this.ctx.fillStyle = 'white';
        this.ctx.beginPath();
        this.ctx.arc(x + size * 0.42, y + size * 0.25, size * 0.015, 0, Math.PI * 2);
        this.ctx.arc(x + size * 0.56, y + size * 0.25, size * 0.015, 0, Math.PI * 2);
        this.ctx.fill();

        // 微笑
        this.ctx.strokeStyle = '#5D4037';
        this.ctx.lineWidth = 1.5;
        this.ctx.beginPath();
        this.ctx.arc(x + size * 0.5, y + size * 0.3, size * 0.07, 0.2, Math.PI - 0.2);
        this.ctx.stroke();

        // 眼镜
        this.ctx.strokeStyle = '#546E7A';
        this.ctx.lineWidth = 1.5;
        this.ctx.beginPath();
        this.ctx.arc(x + size * 0.43, y + size * 0.26, size * 0.055, 0, Math.PI * 2);
        this.ctx.stroke();
        this.ctx.beginPath();
        this.ctx.arc(x + size * 0.57, y + size * 0.26, size * 0.055, 0, Math.PI * 2);
        this.ctx.stroke();
        // 眼镜桥
        this.ctx.beginPath();
        this.ctx.moveTo(x + size * 0.485, y + size * 0.26);
        this.ctx.lineTo(x + size * 0.515, y + size * 0.26);
        this.ctx.stroke();

        // 听诊器
        this.ctx.strokeStyle = '#424242';
        this.ctx.lineWidth = 2.5;
        this.ctx.lineCap = 'round';
        this.ctx.beginPath();
        this.ctx.moveTo(x + size * 0.48, y + size * 0.43);
        this.ctx.quadraticCurveTo(x + size * 0.28, y + size * 0.5, x + size * 0.33, y + size * 0.62);
        this.ctx.stroke();

        // 听诊器头（金属圆盘）
        this.ctx.fillStyle = '#9E9E9E';
        this.ctx.beginPath();
        this.ctx.arc(x + size * 0.33, y + size * 0.65, size * 0.06, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.fillStyle = '#BDBDBD';
        this.ctx.beginPath();
        this.ctx.arc(x + size * 0.33, y + size * 0.64, size * 0.03, 0, Math.PI * 2);
        this.ctx.fill();

        // 手臂（白大褂袖子）
        this.ctx.strokeStyle = 'white';
        this.ctx.lineWidth = size * 0.1;
        this.ctx.lineCap = 'round';
        this.ctx.beginPath();
        this.ctx.moveTo(x + size * 0.33, y + size * 0.5);
        this.ctx.lineTo(x + size * 0.23, y + size * 0.7);
        this.ctx.moveTo(x + size * 0.67, y + size * 0.5);
        this.ctx.lineTo(x + size * 0.77, y + size * 0.7);
        this.ctx.stroke();

        // 手
        this.ctx.fillStyle = '#FFCCBC';
        this.ctx.beginPath();
        this.ctx.arc(x + size * 0.22, y + size * 0.72, size * 0.05, 0, Math.PI * 2);
        this.ctx.arc(x + size * 0.78, y + size * 0.72, size * 0.05, 0, Math.PI * 2);
        this.ctx.fill();

        // 手提医药箱（右手）
        this.ctx.fillStyle = '#795548';
        this.ctx.fillRect(x + size * 0.75, y + size * 0.68, size * 0.1, size * 0.08);
        this.ctx.fillStyle = '#5D4037';
        this.ctx.fillRect(x + size * 0.78, y + size * 0.66, size * 0.04, size * 0.03);
        // 医药箱红十字
        this.ctx.fillStyle = '#E91E63';
        this.ctx.fillRect(x + size * 0.79, y + size * 0.695, size * 0.02, size * 0.05);
        this.ctx.fillRect(x + size * 0.775, y + size * 0.71, size * 0.05, size * 0.02);
    }

    // 绘制谜题标记
    drawPuzzleMarkers() {
        if (!this.currentLevelData || !this.currentLevelData.puzzles) return;

        this.currentLevelData.puzzles.forEach(puzzle => {
            if (puzzle.solved) return;

            const x = puzzle.x * this.tileSize + this.tileSize / 2;
            const y = puzzle.y * this.tileSize + this.tileSize / 2;

            // 问号标记
            this.ctx.fillStyle = '#FF9800';
            this.ctx.beginPath();
            this.ctx.arc(x, y - this.tileSize * 0.15, this.tileSize * 0.12, 0, Math.PI * 2);
            this.ctx.fill();

            this.ctx.fillStyle = 'white';
            this.ctx.font = `bold ${this.tileSize * 0.15}px Arial`;
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            this.ctx.fillText('?', x, y - this.tileSize * 0.15);
        });
    }

    // 绘制粒子
    drawParticles() {
        this.particles.forEach(p => {
            this.ctx.fillStyle = p.color;
            this.ctx.beginPath();
            this.ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            this.ctx.fill();
        });
    }
}

// 启动游戏
document.addEventListener('DOMContentLoaded', () => {
    window.doctorGame = new DoctorGame();
});
