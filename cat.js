class CatGame {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        
        // 游戏配置
        this.tileSize = 60;
        this.gridWidth = 8;
        this.gridHeight = 8;
        this.canvas.width = this.gridWidth * this.tileSize;
        this.canvas.height = this.gridHeight * this.tileSize;
        
        // 游戏状态
        this.gameState = 'start';
        this.currentLevel = 1;
        this.maxLevels = 15;
        this.score = 0;
        this.levelScore = 0;
        this.starsCollected = 0;

        // 难度设置 (easy, medium, hard)
        this.difficulty = 'medium';

        // 关卡进度 (记录已通关的关卡)
        this.unlockedLevels = this.loadUnlockedLevels();
        
        // 游戏对象
        this.cat = { x: 0, y: 0, targetX: 0, targetY: 0, moving: false };
        this.currentLevelData = null;
        this.particles = [];
        
        // 动画
        this.animationFrame = 0;
        this.catBounce = 0;
        
        // 当前谜题
        this.currentPuzzle = null;
        this.pendingMove = null;
        
        // 颜色主题
        this.colors = {
            background: '#FFF5F7',
            grid: '#FFE4EC',
            cat: '#FF9EB5',
            star: '#FFD700',
            doorRed: '#FF9AA2',
            doorBlue: '#A2D2FF',
            doorGreen: '#B5EAD7',
            doorYellow: '#FFDAC1',
            wall: '#E8D5E0',
            path: '#FFF0F5',
            mathPuzzle: '#E8F4FD',
            letterPuzzle: '#F0FFF0',
            chinesePuzzle: '#FFF0E6'
        };
        
        // 汉字数据库（适合4岁儿童的简单汉字，仅使用单字）
        this.chineseCharacters = [
            { char: '猫', emoji: '🐱', name: '小猫' },
            { char: '狗', emoji: '🐶', name: '小狗' },
            { char: '鸟', emoji: '🐦', name: '小鸟' },
            { char: '鱼', emoji: '🐟', name: '小鱼' },
            { char: '花', emoji: '🌸', name: '花朵' },
            { char: '树', emoji: '🌳', name: '大树' },
            { char: '草', emoji: '🌿', name: '小草' },
            { char: '日', emoji: '☀️', name: '太阳' },
            { char: '月', emoji: '🌙', name: '月亮' },
            { char: '星', emoji: '⭐', name: '星星' },
            { char: '水', emoji: '💧', name: '水滴' },
            { char: '火', emoji: '🔥', name: '火焰' },
            { char: '山', emoji: '⛰️', name: '大山' },
            { char: '云', emoji: '☁️', name: '白云' },
            { char: '雨', emoji: '🌧️', name: '下雨' },
            { char: '雪', emoji: '❄️', name: '雪花' },
            { char: '果', emoji: '🍎', name: '苹果' },
            { char: '瓜', emoji: '�', name: '西瓜' },
            { char: '米', emoji: '�', name: '米饭' },
            { char: '面', emoji: '�', name: '面条' },
            { char: '手', emoji: '✋', name: '小手' },
            { char: '足', emoji: '🦶', name: '小脚' },
            { char: '目', emoji: '👁️', name: '眼睛' },
            { char: '口', emoji: '👄', name: '嘴巴' }
        ];
        
        this.init();
    }

    // 从本地存储加载已解锁关卡
    loadUnlockedLevels() {
        try {
            const saved = localStorage.getItem('catGameUnlockedLevels');
            if (saved) {
                return JSON.parse(saved);
            }
        } catch (e) {
            console.log('无法读取本地存储');
        }
        // 默认只解锁第一关
        return [1];
    }

    // 保存已解锁关卡到本地存储
    saveUnlockedLevels() {
        try {
            localStorage.setItem('catGameUnlockedLevels', JSON.stringify(this.unlockedLevels));
        } catch (e) {
            console.log('无法保存到本地存储');
        }
    }

    // 解锁新关卡
    unlockLevel(level) {
        if (!this.unlockedLevels.includes(level)) {
            this.unlockedLevels.push(level);
            this.unlockedLevels.sort((a, b) => a - b);
            this.saveUnlockedLevels();
        }
    }

    // 设置难度
    setDifficulty(difficulty) {
        this.difficulty = difficulty;
        // 根据难度调整网格大小
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
    }

    // 渲染关卡选择网格
    renderLevelGrid() {
        const levelGrid = document.getElementById('levelGrid');
        if (!levelGrid) return;

        levelGrid.innerHTML = '';

        for (let i = 1; i <= this.maxLevels; i++) {
            const btn = document.createElement('button');
            btn.className = 'level-btn';
            btn.dataset.level = i;

            const isUnlocked = this.unlockedLevels.includes(i);
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
                // 同时支持点击和触摸事件
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

    init() {
        this.bindEvents();
        this.startScreen();
        this.gameLoop();
    }
    
    // 根据难度调整关卡配置
    getDifficultyMultiplier() {
        switch(this.difficulty) {
            case 'easy': return 0.6;
            case 'hard': return 1.5;
            default: return 1.0;
        }
    }

    // 生成随机关卡
    generateRandomLevel(levelNum) {
        const levelConfigs = this.getLevelConfigs();
        const baseConfig = levelConfigs[Math.min(levelNum - 1, levelConfigs.length - 1)];

        // 根据难度调整配置
        const multiplier = this.getDifficultyMultiplier();
        const config = {
            ...baseConfig,
            starCount: Math.max(1, Math.floor(baseConfig.starCount * multiplier)),
            wallCount: Math.floor(baseConfig.wallCount * multiplier),
            doorCount: baseConfig.doorCount ? Math.max(1, Math.floor(baseConfig.doorCount * multiplier)) : 0,
            mathPuzzleCount: baseConfig.mathPuzzleCount ? Math.max(1, Math.floor(baseConfig.mathPuzzleCount * multiplier)) : 0,
            letterPuzzleCount: baseConfig.letterPuzzleCount ? Math.max(1, Math.floor(baseConfig.letterPuzzleCount * multiplier)) : 0,
            chinesePuzzleCount: baseConfig.chinesePuzzleCount ? Math.max(1, Math.floor(baseConfig.chinesePuzzleCount * multiplier)) : 0
        };

        // 随机生成猫咪起始位置（在边缘）
        const catPos = this.getRandomEdgePosition();

        // 随机生成家的位置（在对面边缘）
        const homePos = this.getOppositeEdgePosition(catPos);

        // 创建统一的已占用位置集合 - 这是关键！确保所有元素不会重叠
        const occupied = new Set([
            `${catPos.x},${catPos.y}`,
            `${homePos.x},${homePos.y}`
        ]);

        // 先生成墙壁（墙壁是固定的障碍物）
        const walls = this.generateRandomWalls(config.wallCount, catPos, homePos, occupied);
        walls.forEach(w => occupied.add(`${w.x},${w.y}`));

        // 生成关卡基础结构
        const level = {
            name: config.name,
            cat: catPos,
            home: homePos,
            walls: walls,
            stars: [],
            doors: [],
            keys: [],
            puzzles: [],
            message: config.message
        };

        // 生成星星（使用统一的occupied集合）
        if (config.starCount > 0) {
            level.stars = this.generateRandomStars(config.starCount, occupied);
            level.stars.forEach(s => occupied.add(`${s.x},${s.y}`));
        }

        // 生成门和钥匙
        if (config.hasKeys && config.doorCount > 0) {
            const doorKeyPairs = this.generateRandomDoorsAndKeys(config.doorCount, occupied);
            level.doors = doorKeyPairs.doors;
            level.keys = doorKeyPairs.keys;
            level.doors.forEach(d => occupied.add(`${d.x},${d.y}`));
            level.keys.forEach(k => occupied.add(`${k.x},${k.y}`));
        }

        // 生成数学题
        if (config.hasMathPuzzles && config.mathPuzzleCount > 0) {
            const mathPuzzles = this.generateMathPuzzles(config.mathPuzzleCount, occupied);
            level.puzzles = level.puzzles.concat(mathPuzzles);
            mathPuzzles.forEach(p => occupied.add(`${p.x},${p.y}`));
        }

        // 生成字母题
        if (config.hasLetterPuzzles && config.letterPuzzleCount > 0) {
            const letterPuzzles = this.generateLetterPuzzles(config.letterPuzzleCount, occupied);
            level.puzzles = level.puzzles.concat(letterPuzzles);
            letterPuzzles.forEach(p => occupied.add(`${p.x},${p.y}`));
        }

        // 生成汉字题
        if (config.hasChinesePuzzles && config.chinesePuzzleCount > 0) {
            const chinesePuzzles = this.generateChinesePuzzles(config.chinesePuzzleCount, occupied);
            level.puzzles = level.puzzles.concat(chinesePuzzles);
            chinesePuzzles.forEach(p => occupied.add(`${p.x},${p.y}`));
        }

        return level;
    }
    
    // 获取关卡配置
    getLevelConfigs() {
        return [
            // 1-2关：基础操作
            { name: "花园探险", starCount: 2, wallCount: 0, hasKeys: false, hasMathPuzzles: false, hasLetterPuzzles: false, hasChinesePuzzles: false, message: "点击地面移动小猫咪，收集星星！" },
            { name: "迷宫小径", starCount: 3, wallCount: 6, hasKeys: false, hasMathPuzzles: false, hasLetterPuzzles: false, hasChinesePuzzles: false, message: "绕开障碍物，找到回家的路！" },
            
            // 3-4关：颜色门
            { name: "彩虹之门", starCount: 2, wallCount: 0, doorCount: 1, hasKeys: true, hasMathPuzzles: false, hasLetterPuzzles: false, hasChinesePuzzles: false, message: "找到钥匙，打开对应颜色的门！" },
            { name: "钥匙迷宫", starCount: 3, wallCount: 8, doorCount: 2, hasKeys: true, hasMathPuzzles: false, hasLetterPuzzles: false, hasChinesePuzzles: false, message: "收集所有钥匙才能通过！" },
            
            // 5-7关：数学入门
            { name: "数字花园", starCount: 2, wallCount: 6, hasKeys: false, mathPuzzleCount: 2, hasMathPuzzles: true, hasLetterPuzzles: false, hasChinesePuzzles: false, message: "答对数学题才能通过哦！" },
            { name: "数学小达人", starCount: 3, wallCount: 10, doorCount: 2, hasKeys: true, mathPuzzleCount: 3, hasMathPuzzles: true, hasLetterPuzzles: false, hasChinesePuzzles: false, message: "解开数学题，打开魔法门！" },
            { name: "加法乐园", starCount: 3, wallCount: 8, hasKeys: false, mathPuzzleCount: 4, hasMathPuzzles: true, hasLetterPuzzles: false, hasChinesePuzzles: false, message: "十以内加法练习！" },
            
            // 8-10关：字母认知
            { name: "字母森林", starCount: 3, wallCount: 8, hasKeys: false, letterPuzzleCount: 3, hasMathPuzzles: false, hasLetterPuzzles: true, hasChinesePuzzles: false, message: "认识字母，帮助小猫咪！" },
            { name: "ABC乐园", starCount: 3, wallCount: 10, doorCount: 2, hasKeys: true, letterPuzzleCount: 3, hasMathPuzzles: false, hasLetterPuzzles: true, hasChinesePuzzles: false, message: "字母顺序大挑战！" },
            { name: "字母城堡", starCount: 4, wallCount: 12, hasKeys: false, letterPuzzleCount: 4, hasMathPuzzles: false, hasLetterPuzzles: true, hasChinesePuzzles: false, message: "找出正确的字母！" },
            
            // 11-13关：汉字认知
            { name: "汉字王国", starCount: 3, wallCount: 8, hasKeys: false, chinesePuzzleCount: 3, hasMathPuzzles: false, hasLetterPuzzles: false, hasChinesePuzzles: true, message: "看图识字，认识汉字！" },
            { name: "文字森林", starCount: 3, wallCount: 10, doorCount: 2, hasKeys: true, chinesePuzzleCount: 3, hasMathPuzzles: false, hasLetterPuzzles: false, hasChinesePuzzles: true, message: "找到正确的汉字！" },
            { name: "汉字城堡", starCount: 4, wallCount: 12, hasKeys: false, chinesePuzzleCount: 4, hasMathPuzzles: false, hasLetterPuzzles: false, hasChinesePuzzles: true, message: "汉字大挑战！" },
            
            // 14-15关：综合挑战
            { name: "智慧大挑战", starCount: 4, wallCount: 12, doorCount: 2, hasKeys: true, mathPuzzleCount: 2, letterPuzzleCount: 2, hasMathPuzzles: true, hasLetterPuzzles: true, hasChinesePuzzles: false, message: "数学和字母都难不倒你！" },
            { name: "终极挑战", starCount: 5, wallCount: 14, doorCount: 3, hasKeys: true, mathPuzzleCount: 2, letterPuzzleCount: 2, chinesePuzzleCount: 2, hasMathPuzzles: true, hasLetterPuzzles: true, hasChinesePuzzles: true, message: "最后的挑战！运用所有学到的知识！" }
        ];
    }
    
    // 获取随机边缘位置
    getRandomEdgePosition() {
        const edges = [
            // 上边缘
            ...Array.from({ length: this.gridWidth }, (_, i) => ({ x: i, y: 0 })),
            // 下边缘
            ...Array.from({ length: this.gridWidth }, (_, i) => ({ x: i, y: this.gridHeight - 1 })),
            // 左边缘
            ...Array.from({ length: this.gridHeight - 2 }, (_, i) => ({ x: 0, y: i + 1 })),
            // 右边缘
            ...Array.from({ length: this.gridHeight - 2 }, (_, i) => ({ x: this.gridWidth - 1, y: i + 1 }))
        ];
        return edges[Math.floor(Math.random() * edges.length)];
    }
    
    // 获取对面边缘位置
    getOppositeEdgePosition(pos) {
        if (pos.y === 0) return { x: Math.floor(Math.random() * this.gridWidth), y: this.gridHeight - 1 };
        if (pos.y === this.gridHeight - 1) return { x: Math.floor(Math.random() * this.gridWidth), y: 0 };
        if (pos.x === 0) return { x: this.gridWidth - 1, y: Math.floor(Math.random() * this.gridHeight) };
        return { x: 0, y: Math.floor(Math.random() * this.gridHeight) };
    }
    
    // 生成随机星星 - 使用统一的occupied集合
    generateRandomStars(count, occupied) {
        const stars = [];
        let attempts = 0;
        const maxAttempts = 200;
        
        while (stars.length < count && attempts < maxAttempts) {
            const x = Math.floor(Math.random() * this.gridWidth);
            const y = Math.floor(Math.random() * this.gridHeight);
            const key = `${x},${y}`;
            
            if (!occupied.has(key)) {
                stars.push({ x, y, collected: false });
                occupied.add(key);
            }
            attempts++;
        }
        return stars;
    }
    
    // 生成随机墙壁 - 使用统一的occupied集合
    generateRandomWalls(count, catPos, homePos, occupied) {
        const walls = [];
        let attempts = 0;
        const maxAttempts = 200;
        
        while (walls.length < count && attempts < maxAttempts) {
            const x = Math.floor(Math.random() * this.gridWidth);
            const y = Math.floor(Math.random() * this.gridHeight);
            const key = `${x},${y}`;
            
            // 避免在猫咪和家附近生成墙壁
            const distToCat = Math.abs(x - catPos.x) + Math.abs(y - catPos.y);
            const distToHome = Math.abs(x - homePos.x) + Math.abs(y - homePos.y);
            
            if (!occupied.has(key) && distToCat > 1 && distToHome > 1) {
                walls.push({ x, y });
                occupied.add(key);
            }
            attempts++;
        }
        return walls;
    }
    
    // 生成随机门和钥匙 - 使用统一的occupied集合
    generateRandomDoorsAndKeys(count, occupied) {
        const colors = ['red', 'blue', 'green', 'yellow'];
        const doors = [];
        const keys = [];
        
        for (let i = 0; i < count; i++) {
            const color = colors[i % colors.length];
            
            // 生成门位置
            let doorPos;
            let attempts = 0;
            do {
                doorPos = {
                    x: Math.floor(Math.random() * this.gridWidth),
                    y: Math.floor(Math.random() * this.gridHeight)
                };
                attempts++;
            } while (occupied.has(`${doorPos.x},${doorPos.y}`) && attempts < 100);
            
            if (attempts < 100) {
                doors.push({ x: doorPos.x, y: doorPos.y, color, open: false });
                occupied.add(`${doorPos.x},${doorPos.y}`);
                
                // 生成对应钥匙
                let keyPos;
                attempts = 0;
                do {
                    keyPos = {
                        x: Math.floor(Math.random() * this.gridWidth),
                        y: Math.floor(Math.random() * this.gridHeight)
                    };
                    attempts++;
                } while (occupied.has(`${keyPos.x},${keyPos.y}`) && attempts < 100);
                
                if (attempts < 100) {
                    keys.push({ x: keyPos.x, y: keyPos.y, color, collected: false });
                    occupied.add(`${keyPos.x},${keyPos.y}`);
                }
            }
        }
        
        return { doors, keys };
    }
    
    // 生成数学题 - 使用统一的occupied集合
    generateMathPuzzles(count, occupied) {
        const puzzles = [];
        let attempts = 0;
        const maxAttempts = 200;

        const mathTemplates = [
            { min: 1, max: 5, type: 'add' },
            { min: 2, max: 5, type: 'add' },
            { min: 1, max: 4, type: 'add' },
            { min: 3, max: 5, type: 'add' },
            { min: 2, max: 6, type: 'add' },
            { min: 1, max: 3, type: 'sub' },
            { min: 2, max: 4, type: 'sub' },
            { min: 3, max: 5, type: 'sub' }
        ];

        while (puzzles.length < count && attempts < maxAttempts) {
            const x = Math.floor(Math.random() * this.gridWidth);
            const y = Math.floor(Math.random() * this.gridHeight);
            const key = `${x},${y}`;

            if (!occupied.has(key)) {
                const template = mathTemplates[Math.floor(Math.random() * mathTemplates.length)];
                let question, answer, options, audioText;

                if (template.type === 'add') {
                    const a = Math.floor(Math.random() * (template.max - template.min + 1)) + template.min;
                    const b = Math.floor(Math.random() * (template.max - template.min + 1)) + template.min;
                    question = `${a} + ${b} = ?`;
                    answer = String(a + b);
                    audioText = `${a}加${b}等于多少？`;
                } else {
                    const a = Math.floor(Math.random() * (template.max - template.min + 1)) + template.min + 2;
                    const b = Math.floor(Math.random() * (template.min + 1)) + 1;
                    question = `${a} - ${b} = ?`;
                    answer = String(a - b);
                    audioText = `${a}减${b}等于多少？`;
                }

                // 生成选项
                const ans = parseInt(answer);
                options = [String(ans)];
                while (options.length < 3) {
                    const offset = Math.floor(Math.random() * 3) + 1;
                    const opt = Math.random() > 0.5 ? ans + offset : Math.max(0, ans - offset);
                    if (!options.includes(String(opt))) {
                        options.push(String(opt));
                    }
                }
                options.sort(() => Math.random() - 0.5);

                puzzles.push({
                    x, y, type: 'math', solved: false,
                    question, answer, options, audioText
                });
                occupied.add(key);
            }
            attempts++;
        }
        return puzzles;
    }
    
    // 生成字母题 - 使用统一的occupied集合
    generateLetterPuzzles(count, occupied) {
        const puzzles = [];
        let attempts = 0;
        const maxAttempts = 200;

        const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        const letterTemplates = [
            { type: 'next', question: (l) => `${l} 后面是什么字母？`, audio: (l) => `字母，${l}，后面是什么字母？` },
            { type: 'prev', question: (l) => `${l} 前面是什么字母？`, audio: (l) => `字母，${l}，前面是什么字母？` },
            { type: 'identify', question: (l) => `哪个是字母 ${l}？`, audio: (l) => `哪个是字母，${l}？` }
        ];

        while (puzzles.length < count && attempts < maxAttempts) {
            const x = Math.floor(Math.random() * this.gridWidth);
            const y = Math.floor(Math.random() * this.gridHeight);
            const key = `${x},${y}`;

            if (!occupied.has(key)) {
                const template = letterTemplates[Math.floor(Math.random() * letterTemplates.length)];
                const letterIndex = Math.floor(Math.random() * 5) + 1; // B到F
                const letter = letters[letterIndex];

                let answer, options;

                if (template.type === 'next') {
                    answer = letters[letterIndex + 1];
                    options = [letters[letterIndex], answer, letters[letterIndex + 2]];
                } else if (template.type === 'prev') {
                    answer = letters[letterIndex - 1];
                    options = [answer, letters[letterIndex], letters[letterIndex + 1]];
                } else {
                    answer = letter;
                    options = [letters[letterIndex - 1], answer, letters[letterIndex + 1]];
                }

                options.sort(() => Math.random() - 0.5);

                puzzles.push({
                    x, y, type: 'letter', solved: false,
                    question: template.question(letter),
                    answer, options,
                    audioText: template.audio(letter)
                });
                occupied.add(key);
            }
            attempts++;
        }
        return puzzles;
    }

    // 生成汉字题 - 使用统一的occupied集合
    generateChinesePuzzles(count, occupied) {
        const puzzles = [];
        let attempts = 0;
        const maxAttempts = 200;

        // 随机选择汉字
        const shuffledChars = [...this.chineseCharacters].sort(() => Math.random() - 0.5);
        let charIndex = 0;

        while (puzzles.length < count && charIndex < shuffledChars.length && attempts < maxAttempts) {
            const x = Math.floor(Math.random() * this.gridWidth);
            const y = Math.floor(Math.random() * this.gridHeight);
            const key = `${x},${y}`;

            if (!occupied.has(key)) {
                const charData = shuffledChars[charIndex];

                // 生成干扰选项
                const otherChars = this.chineseCharacters
                    .filter(c => c.char !== charData.char)
                    .sort(() => Math.random() - 0.5)
                    .slice(0, 2);

                const options = [charData.char, ...otherChars.map(c => c.char)];
                options.sort(() => Math.random() - 0.5);

                puzzles.push({
                    x, y, type: 'chinese', solved: false,
                    question: `这是什么字？`,
                    emoji: charData.emoji,
                    answer: charData.char,
                    options,
                    audioText: `这是什么字？这是${charData.name}的${charData.char}字。`
                });
                occupied.add(key);
                charIndex++;
            }
            attempts++;
        }
        return puzzles;
    }
    
    bindEvents() {
        document.getElementById('startBtn').addEventListener('click', () => this.startGame());
        document.getElementById('nextLevelBtn').addEventListener('click', () => this.nextLevel());
        document.getElementById('replayBtn').addEventListener('click', () => this.restartLevel());
        document.getElementById('playAgainBtn').addEventListener('click', () => this.resetGame());

        // 难度选择按钮 - 同时支持点击和触摸
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

        // 鼠标点击事件
        this.canvas.addEventListener('click', (e) => {
            if (this.gameState === 'playing') this.handleCanvasClick(e);
        });

        // 优化移动端触摸体验
        this.setupTouchEvents();

        this.bindPuzzleEvents();
    }

    // 选择难度
    selectDifficulty(difficulty) {
        this.difficulty = difficulty;
        this.setDifficulty(difficulty);

        // 更新UI
        document.querySelectorAll('.difficulty-btn').forEach(btn => {
            btn.classList.remove('active');
            if (btn.dataset.difficulty === difficulty) {
                btn.classList.add('active');
            }
        });

        // 显示提示
        const difficultyNames = { easy: '简单', medium: '中等', hard: '高阶' };
        this.showMessage(`已选择${difficultyNames[difficulty]}难度`, '🎯');
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

            // 显示触摸反馈
            this.showTouchFeedback(touchStartX, touchStartY);
        }, { passive: false });

        this.canvas.addEventListener('touchend', (e) => {
            if (this.gameState !== 'playing') return;

            const touch = e.changedTouches[0];
            const touchEndX = touch.clientX;
            const touchEndY = touch.clientY;
            const touchDuration = Date.now() - touchStartTime;

            // 计算触摸偏移
            const deltaX = Math.abs(touchEndX - touchStartX);
            const deltaY = Math.abs(touchEndY - touchStartY);

            // 如果是短触摸且偏移小，视为点击
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

        // 防止触摸时的页面滚动
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

        // 创建触摸反馈粒子效果
        if (x >= 0 && x < this.gridWidth && y >= 0 && y < this.gridHeight) {
            for (let i = 0; i < 4; i++) {
                this.particles.push({
                    x: x * this.tileSize + this.tileSize / 2,
                    y: y * this.tileSize + this.tileSize / 2,
                    vx: (Math.random() - 0.5) * 2,
                    vy: (Math.random() - 0.5) * 2,
                    life: 15,
                    color: 'rgba(255, 158, 181, 0.6)',
                    size: Math.random() * 4 + 2
                });
            }
        }
    }

    // 处理格子点击（统一处理鼠标和触摸）
    handleGridClick(x, y) {
        // 检查边界
        if (x < 0 || x >= this.gridWidth || y < 0 || y >= this.gridHeight) return;

        // 检查谜题
        if (this.currentLevelData.puzzles) {
            const puzzle = this.currentLevelData.puzzles.find(p =>
                p.x === x && p.y === y && !p.solved
            );
            if (puzzle && this.isAdjacent(this.cat.x, this.cat.y, x, y)) {
                this.pendingMove = { x, y };
                this.showPuzzleModal(puzzle);
                return;
            }
        }

        if (this.isValidMove(x, y)) {
            this.moveCat(x, y);
        }
    }

    bindPuzzleEvents() {
        document.getElementById('closePuzzleBtn').addEventListener('click', () => this.hidePuzzleModal());
        document.getElementById('hintBtn').addEventListener('click', () => this.showHint());

        // 绑定播放按钮事件
        const playBtn = document.getElementById('playAudioBtn');
        if (playBtn) {
            playBtn.addEventListener('click', () => this.playPuzzleAudio());
        }
    }

    // 播放题目语音
    playPuzzleAudio() {
        if (!this.currentPuzzle || !this.currentPuzzle.audioText) return;

        // 检查浏览器是否支持语音合成
        if (!window.speechSynthesis) {
            console.log('浏览器不支持语音合成');
            return;
        }

        // 停止当前播放的语音
        window.speechSynthesis.cancel();

        // 创建语音合成实例
        const utterance = new SpeechSynthesisUtterance(this.currentPuzzle.audioText);

        // 设置语音参数
        utterance.lang = 'zh-CN';
        utterance.rate = 0.9; // 稍慢一点，适合儿童
        utterance.pitch = 1.1; // 稍高一点，更亲切
        utterance.volume = 1.0;

        // 更新按钮状态
        const playBtn = document.getElementById('playAudioBtn');
        if (playBtn) {
            playBtn.classList.add('playing');
            playBtn.querySelector('.play-text').textContent = '播放中...';
        }

        // 语音结束回调
        utterance.onend = () => {
            if (playBtn) {
                playBtn.classList.remove('playing');
                playBtn.querySelector('.play-text').textContent = '播放';
            }
        };

        // 语音错误回调
        utterance.onerror = (event) => {
            console.log('语音播放错误:', event.error);
            if (playBtn) {
                playBtn.classList.remove('playing');
                playBtn.querySelector('.play-text').textContent = '播放';
            }
        };

        // 播放语音
        window.speechSynthesis.speak(utterance);
    }
    
    handleCanvasClick(e) {
        const rect = this.canvas.getBoundingClientRect();
        const x = Math.floor((e.clientX - rect.left) / this.tileSize);
        const y = Math.floor((e.clientY - rect.top) / this.tileSize);
        
        // 检查谜题
        if (this.currentLevelData.puzzles) {
            const puzzle = this.currentLevelData.puzzles.find(p => 
                p.x === x && p.y === y && !p.solved
            );
            if (puzzle && this.isAdjacent(this.cat.x, this.cat.y, x, y)) {
                this.pendingMove = { x, y };
                this.showPuzzleModal(puzzle);
                return;
            }
        }
        
        if (this.isValidMove(x, y)) {
            this.moveCat(x, y);
        }
    }
    
    isAdjacent(x1, y1, x2, y2) {
        return Math.abs(x1 - x2) + Math.abs(y1 - y2) === 1;
    }
    
    isValidMove(x, y) {
        if (x < 0 || x >= this.gridWidth || y < 0 || y >= this.gridHeight) return false;
        
        const level = this.currentLevelData;
        
        // 检查墙壁
        if (level.walls?.some(w => w.x === x && w.y === y)) return false;
        
        // 检查门
        if (level.doors?.some(d => d.x === x && d.y === y && !d.open)) return false;
        
        // 检查谜题
        if (level.puzzles?.some(p => p.x === x && p.y === y && !p.solved)) return false;
        
        // 只能移动到相邻格子
        if (Math.abs(x - this.cat.x) + Math.abs(y - this.cat.y) !== 1) return false;
        
        return true;
    }
    
    showPuzzleModal(puzzle) {
        this.currentPuzzle = puzzle;
        this.gameState = 'puzzle';
        
        const modal = document.getElementById('puzzleModal');
        const questionEl = document.getElementById('puzzleQuestion');
        const typeIconEl = document.getElementById('puzzleTypeIcon');
        const optionsContainer = document.getElementById('puzzleOptions');
        const hintTextEl = document.getElementById('hintText');
        const puzzleBody = document.querySelector('.puzzle-body');
        
        // 设置类型图标
        const icons = { math: '🔢', letter: '🔤', chinese: '🀄' };
        typeIconEl.textContent = icons[puzzle.type];
        
        // 汉字题特殊处理 - 显示emoji
        if (puzzle.type === 'chinese') {
            questionEl.innerHTML = `<div class="chinese-emoji">${puzzle.emoji}</div><div class="chinese-question">${puzzle.question}</div>`;
        } else {
            questionEl.textContent = puzzle.question;
        }
        
        // 设置选项
        optionsContainer.innerHTML = '';
        puzzle.options.forEach(option => {
            const btn = document.createElement('button');
            btn.className = 'answer-option';
            btn.dataset.answer = option;
            btn.textContent = option;
            btn.addEventListener('click', (e) => this.checkAnswer(e.target.dataset.answer));
            optionsContainer.appendChild(btn);
        });
        
        hintTextEl.classList.add('hidden');
        document.getElementById('hintBtn').disabled = false;
        document.getElementById('hintBtn').textContent = '💡 提示';

        // 重置播放按钮状态
        const playBtn = document.getElementById('playAudioBtn');
        if (playBtn) {
            playBtn.classList.remove('playing');
            playBtn.querySelector('.play-text').textContent = '播放';
        }

        modal.classList.remove('hidden');

        // 延迟自动播放语音，让用户有时间看到弹窗
        setTimeout(() => {
            this.playPuzzleAudio();
        }, 300);
    }
    
    hidePuzzleModal() {
        // 停止语音播放
        if (window.speechSynthesis) {
            window.speechSynthesis.cancel();
        }

        document.getElementById('puzzleModal').classList.add('hidden');
        this.gameState = 'playing';
        this.currentPuzzle = null;
        this.pendingMove = null;
    }
    
    checkAnswer(answer) {
        if (!this.currentPuzzle) return;
        
        const isCorrect = answer === this.currentPuzzle.answer;
        
        if (isCorrect) {
            this.currentPuzzle.solved = true;
            this.createParticles(this.currentPuzzle.x, this.currentPuzzle.y, 'success');
            
            const messages = ['🎉 答对了！真聪明！', '⭐ 太棒了！', '🌟 你真厉害！'];
            this.showMessage(messages[Math.floor(Math.random() * messages.length)], '🎉');
            
            if (this.pendingMove) {
                this.moveCat(this.pendingMove.x, this.pendingMove.y);
            }
            
            this.hidePuzzleModal();
            this.score += 5;
            this.updateScore();
        } else {
            this.showMessage('😅 再想想看~', '💭');
            const modal = document.querySelector('.puzzle-content');
            modal.style.animation = 'shake 0.5s ease';
            setTimeout(() => modal.style.animation = '', 500);
        }
    }
    
    showHint() {
        if (!this.currentPuzzle) return;
        
        const hintTextEl = document.getElementById('hintText');
        const hintBtn = document.getElementById('hintBtn');
        
        let hint = '';
        if (this.currentPuzzle.type === 'math') {
            const match = this.currentPuzzle.question.match(/(\d+)\s*([+-])\s*(\d+)/);
            if (match) {
                const num1 = parseInt(match[1]);
                const operator = match[2];
                const num2 = parseInt(match[3]);
                
                if (operator === '+') {
                    hint = `💡 伸出${num1}根手指，再伸出${num2}根手指，数一数总共有几根？`;
                } else {
                    hint = `💡 伸出${num1}根手指，弯下${num2}根手指，看看还剩几根？`;
                }
            }
        } else if (this.currentPuzzle.type === 'letter') {
            hint = `💡 唱一唱字母歌：A B C D E...`;
        } else if (this.currentPuzzle.type === 'chinese') {
            const charData = this.chineseCharacters.find(c => c.char === this.currentPuzzle.answer);
            hint = `💡 这是"${charData.name}"的${charData.emoji}字`;
        }
        
        hintTextEl.textContent = hint;
        hintTextEl.classList.remove('hidden');
        hintBtn.disabled = true;
        hintBtn.textContent = '✓ 已显示';
    }
    
    moveCat(x, y) {
        this.cat.x = x;
        this.cat.y = y;
        this.cat.moving = true;
        
        this.checkCollection();
        this.checkWin();
        
        setTimeout(() => this.cat.moving = false, 200);
    }
    
    checkCollection() {
        const level = this.currentLevelData;
        
        // 检查星星
        level.stars?.forEach(star => {
            if (star.x === this.cat.x && star.y === this.cat.y && !star.collected) {
                star.collected = true;
                this.levelScore++;
                this.score++;
                this.starsCollected++;
                this.updateScore();
                this.createParticles(this.cat.x, this.cat.y, 'star');
                this.showMessage('⭐ 收集到星星！', '⭐');
            }
        });
        
        // 检查钥匙
        level.keys?.forEach(key => {
            if (key.x === this.cat.x && key.y === this.cat.y && !key.collected) {
                key.collected = true;
                this.createParticles(this.cat.x, this.cat.y, 'key');
                this.showMessage(`🗝️ 找到${this.getColorName(key.color)}钥匙！`, '🗝️');
                
                level.doors?.forEach(door => {
                    if (door.color === key.color) door.open = true;
                });
            }
        });
    }
    
    getColorName(color) {
        const names = { red: '红色', blue: '蓝色', green: '绿色', yellow: '黄色' };
        return names[color] || color;
    }
    
    checkWin() {
        if (this.cat.x === this.currentLevelData.home.x && 
            this.cat.y === this.currentLevelData.home.y) {
            this.createParticles(this.cat.x, this.cat.y, 'win');
            setTimeout(() => this.levelComplete(), 500);
        }
    }
    
    createParticles(x, y, type) {
        const colors = {
            star: ['#FFD700', '#FFA500', '#FF6347'],
            key: ['#FF69B4', '#DA70D6', '#BA55D3'],
            win: ['#FF69B4', '#FFD700', '#00CED1', '#98FB98'],
            success: ['#00FF00', '#32CD32', '#90EE90', '#98FB98']
        };
        
        const particleColors = colors[type] || colors.star;
        
        for (let i = 0; i < 8; i++) {
            this.particles.push({
                x: x * this.tileSize + this.tileSize / 2,
                y: y * this.tileSize + this.tileSize / 2,
                vx: (Math.random() - 0.5) * 4,
                vy: (Math.random() - 0.5) * 4,
                life: 30,
                color: particleColors[Math.floor(Math.random() * particleColors.length)],
                size: Math.random() * 6 + 3
            });
        }
    }
    
    showMessage(text, icon) {
        const messageBox = document.getElementById('messageBox');
        document.getElementById('messageText').textContent = text;
        document.getElementById('messageIcon').textContent = icon;
        messageBox.classList.remove('hidden');
        
        setTimeout(() => messageBox.classList.add('hidden'), 1500);
    }
    
    startScreen() {
        this.showScreen('startScreen');
        this.renderLevelGrid();
    }
    
    startGame() {
        this.currentLevel = 1;
        this.score = 0;
        this.starsCollected = 0;
        this.loadLevel(this.currentLevel);
        this.showScreen('gameScreen');
        this.gameState = 'playing';
        this.updateScore();
    }
    
    loadLevel(levelNum) {
        // 生成随机关卡
        this.currentLevelData = this.generateRandomLevel(levelNum);
        
        // 重置猫咪位置
        this.cat.x = this.currentLevelData.cat.x;
        this.cat.y = this.currentLevelData.cat.y;
        this.cat.moving = false;
        
        this.levelScore = 0;
        
        // 显示关卡消息
        if (this.currentLevelData.message) {
            setTimeout(() => this.showMessage(this.currentLevelData.message, '💝'), 500);
        }
        
        document.getElementById('level').textContent = levelNum;
    }
    
    levelComplete() {
        this.gameState = 'levelComplete';
        const starsEarned = this.calculateLevelStars();
        this.updateLevelCompleteScreen(starsEarned);

        // 解锁下一关
        if (this.currentLevel < this.maxLevels) {
            this.unlockLevel(this.currentLevel + 1);
        }

        this.showScreen('levelCompleteScreen');
    }
    
    calculateLevelStars() {
        const level = this.currentLevelData;
        let stars = 1;
        
        if (level.stars && this.levelScore >= level.stars.length) stars++;
        
        if (level.puzzles) {
            const solvedPuzzles = level.puzzles.filter(p => p.solved).length;
            if (solvedPuzzles >= level.puzzles.length) stars++;
        } else {
            stars++;
        }
        
        return Math.min(stars, 3);
    }
    
    updateLevelCompleteScreen(stars) {
        const starElements = document.querySelectorAll('.stars-earned .star');
        starElements.forEach((el, index) => {
            if (index < stars) {
                el.classList.add('earned');
                el.textContent = '⭐';
            } else {
                el.classList.remove('earned');
                el.textContent = '⚫';
            }
        });
        
        const encouragements = ['继续加油！', '做得不错！', '太棒了！完美！'];
        document.querySelector('.encouragement').textContent = 
            `${encouragements[stars - 1]} 小猫咪很开心！`;
    }
    
    nextLevel() {
        if (this.currentLevel < this.maxLevels) {
            this.currentLevel++;
            this.loadLevel(this.currentLevel);
            this.showScreen('gameScreen');
            this.gameState = 'playing';
        } else {
            this.gameComplete();
        }
    }
    
    restartLevel() {
        this.loadLevel(this.currentLevel);
        this.showScreen('gameScreen');
        this.gameState = 'playing';
    }
    
    gameComplete() {
        this.gameState = 'gameComplete';
        document.getElementById('finalScore').textContent = this.score;
        document.getElementById('totalStars').textContent = this.starsCollected;
        this.showScreen('gameCompleteScreen');
    }
    
    resetGame() {
        this.currentLevel = 1;
        this.score = 0;
        this.starsCollected = 0;
        // 重置关卡进度
        this.unlockedLevels = [1];
        this.saveUnlockedLevels();
        this.renderLevelGrid();
        this.loadLevel(1);
        this.showScreen('gameScreen');
        this.gameState = 'playing';
        this.updateScore();
    }
    
    showScreen(screenId) {
        document.querySelectorAll('.screen').forEach(screen => screen.classList.add('hidden'));
        document.getElementById(screenId).classList.remove('hidden');
    }
    
    updateScore() {
        document.getElementById('score').textContent = this.score;
    }
    
    gameLoop() {
        this.update();
        this.draw();
        requestAnimationFrame(() => this.gameLoop());
    }
    
    update() {
        this.animationFrame++;
        this.catBounce = Math.sin(this.animationFrame * 0.1) * 3;
        
        for (let i = this.particles.length - 1; i >= 0; i--) {
            let p = this.particles[i];
            p.x += p.vx;
            p.y += p.vy;
            p.life--;
            p.vy += 0.1;
            
            if (p.life <= 0) this.particles.splice(i, 1);
        }
    }
    
    draw() {
        this.ctx.fillStyle = this.colors.background;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        if (this.gameState !== 'playing' && this.gameState !== 'puzzle') return;
        
        const level = this.currentLevelData;
        if (!level) return;
        
        this.drawGrid();
        
        level.walls?.forEach(wall => this.drawWall(wall.x, wall.y));
        level.puzzles?.forEach(puzzle => this.drawPuzzle(puzzle.x, puzzle.y, puzzle.type, puzzle.solved));
        level.doors?.forEach(door => this.drawDoor(door.x, door.y, door.color, door.open));
        
        this.drawHome(level.home.x, level.home.y);
        
        level.stars?.forEach(star => {
            if (!star.collected) this.drawStar(star.x, star.y);
        });
        
        level.keys?.forEach(key => {
            if (!key.collected) this.drawKey(key.x, key.y, key.color);
        });
        
        this.drawCat();
        this.drawParticles();
    }
    
    drawGrid() {
        this.ctx.strokeStyle = this.colors.grid;
        this.ctx.lineWidth = 1;
        
        for (let x = 0; x <= this.gridWidth; x++) {
            this.ctx.beginPath();
            this.ctx.moveTo(x * this.tileSize, 0);
            this.ctx.lineTo(x * this.tileSize, this.canvas.height);
            this.ctx.stroke();
        }
        
        for (let y = 0; y <= this.gridHeight; y++) {
            this.ctx.beginPath();
            this.ctx.moveTo(0, y * this.tileSize);
            this.ctx.lineTo(this.canvas.width, y * this.tileSize);
            this.ctx.stroke();
        }
    }
    
    drawWall(x, y) {
        const px = x * this.tileSize;
        const py = y * this.tileSize;
        
        this.ctx.fillStyle = this.colors.wall;
        this.ctx.fillRect(px + 2, py + 2, this.tileSize - 4, this.tileSize - 4);
        
        this.ctx.fillStyle = '#FFB6C1';
        const centerX = px + this.tileSize / 2;
        const centerY = py + this.tileSize / 2;
        
        for (let i = 0; i < 4; i++) {
            const angle = (i * Math.PI) / 2;
            const petalX = centerX + Math.cos(angle) * 8;
            const petalY = centerY + Math.sin(angle) * 8;
            this.ctx.beginPath();
            this.ctx.arc(petalX, petalY, 5, 0, Math.PI * 2);
            this.ctx.fill();
        }
        
        this.ctx.fillStyle = '#FFD700';
        this.ctx.beginPath();
        this.ctx.arc(centerX, centerY, 4, 0, Math.PI * 2);
        this.ctx.fill();
    }
    
    drawPuzzle(x, y, type, solved) {
        const px = x * this.tileSize;
        const py = y * this.tileSize;
        
        if (solved) {
            this.ctx.fillStyle = this.colors.path;
            this.ctx.fillRect(px + 2, py + 2, this.tileSize - 4, this.tileSize - 4);
            
            this.ctx.fillStyle = '#00FF00';
            this.ctx.font = '24px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            this.ctx.fillText('✓', px + this.tileSize / 2, py + this.tileSize / 2);
        } else {
            const bgColors = {
                math: this.colors.mathPuzzle,
                letter: this.colors.letterPuzzle,
                chinese: this.colors.chinesePuzzle
            };
            const borderColors = { math: '#4A90E2', letter: '#7ED321', chinese: '#FF9500' };
            const icons = { math: '🔢', letter: '🔤', chinese: '🀄' };
            
            this.ctx.fillStyle = bgColors[type];
            this.ctx.fillRect(px + 2, py + 2, this.tileSize - 4, this.tileSize - 4);
            
            this.ctx.strokeStyle = borderColors[type];
            this.ctx.lineWidth = 3;
            this.ctx.strokeRect(px + 4, py + 4, this.tileSize - 8, this.tileSize - 8);
            
            this.ctx.font = '28px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            this.ctx.fillText(icons[type], px + this.tileSize / 2, py + this.tileSize / 2);
            
            this.ctx.fillStyle = '#FF6B6B';
            this.ctx.font = 'bold 14px Arial';
            this.ctx.fillText('?', px + this.tileSize - 12, py + 15);
        }
    }
    
    drawDoor(x, y, color, open) {
        const px = x * this.tileSize;
        const py = y * this.tileSize;
        const centerX = px + this.tileSize / 2;
        const centerY = py + this.tileSize / 2;

        const colors = {
            red: { main: '#FF6B6B', dark: '#E55A5A', light: '#FF8787' },
            blue: { main: '#4A90E2', dark: '#3A7BC8', light: '#6BA5E7' },
            green: { main: '#7ED321', dark: '#6ABF1A', light: '#9BE04D' },
            yellow: { main: '#F5A623', dark: '#E09000', light: '#FFC447' }
        };

        const c = colors[color] || colors.red;

        if (open) {
            // 打开的门 - 半透明效果
            this.ctx.fillStyle = c.main + '30';
            this.ctx.fillRect(px + 8, py + 8, this.tileSize - 16, this.tileSize - 16);

            // 打开的门图标
            this.ctx.fillStyle = c.main;
            this.ctx.font = 'bold 16px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            this.ctx.fillText('🔓', centerX, centerY);
        } else {
            // 绘制门锁外框（圆角矩形）
            const framePadding = 4;
            const frameWidth = this.tileSize - framePadding * 2;
            const frameHeight = this.tileSize - framePadding * 2;

            // 外框阴影
            this.ctx.fillStyle = 'rgba(0,0,0,0.2)';
            this.roundRect(px + framePadding + 2, py + framePadding + 2, frameWidth, frameHeight, 8);
            this.ctx.fill();

            // 外框主体
            const gradient = this.ctx.createLinearGradient(px, py, px, py + this.tileSize);
            gradient.addColorStop(0, c.light);
            gradient.addColorStop(0.5, c.main);
            gradient.addColorStop(1, c.dark);
            this.ctx.fillStyle = gradient;
            this.roundRect(px + framePadding, py + framePadding, frameWidth, frameHeight, 8);
            this.ctx.fill();

            // 外框边框
            this.ctx.strokeStyle = c.dark;
            this.ctx.lineWidth = 2;
            this.roundRect(px + framePadding, py + framePadding, frameWidth, frameHeight, 8);
            this.ctx.stroke();

            // 绘制锁孔（钥匙孔形状）
            const lockX = centerX;
            const lockY = centerY - 2;

            // 锁孔上半部分（圆形）
            this.ctx.fillStyle = '#2C3E50';
            this.ctx.beginPath();
            this.ctx.arc(lockX, lockY - 3, 7, 0, Math.PI * 2);
            this.ctx.fill();

            // 锁孔下半部分（梯形）
            this.ctx.beginPath();
            this.ctx.moveTo(lockX - 4, lockY + 2);
            this.ctx.lineTo(lockX + 4, lockY + 2);
            this.ctx.lineTo(lockX + 3, lockY + 12);
            this.ctx.lineTo(lockX - 3, lockY + 12);
            this.ctx.closePath();
            this.ctx.fill();

            // 锁孔高光
            this.ctx.fillStyle = '#5D6D7E';
            this.ctx.beginPath();
            this.ctx.arc(lockX - 2, lockY - 5, 2, 0, Math.PI * 2);
            this.ctx.fill();

            // 绘制锁钩（顶部半圆）
            this.ctx.strokeStyle = '#BDC3C7';
            this.ctx.lineWidth = 4;
            this.ctx.lineCap = 'round';
            this.ctx.beginPath();
            this.ctx.arc(centerX, py + 12, 10, Math.PI, 0);
            this.ctx.stroke();

            // 锁钩内侧阴影
            this.ctx.strokeStyle = '#95A5A6';
            this.ctx.lineWidth = 2;
            this.ctx.beginPath();
            this.ctx.arc(centerX, py + 12, 8, Math.PI, 0);
            this.ctx.stroke();
        }
    }

    // 绘制圆角矩形辅助方法
    roundRect(x, y, width, height, radius) {
        this.ctx.beginPath();
        this.ctx.moveTo(x + radius, y);
        this.ctx.lineTo(x + width - radius, y);
        this.ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
        this.ctx.lineTo(x + width, y + height - radius);
        this.ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
        this.ctx.lineTo(x + radius, y + height);
        this.ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
        this.ctx.lineTo(x, y + radius);
        this.ctx.quadraticCurveTo(x, y, x + radius, y);
        this.ctx.closePath();
    }
    
    drawHome(x, y) {
        const px = x * this.tileSize;
        const py = y * this.tileSize;
        
        this.ctx.fillStyle = '#FFE4B5';
        this.ctx.fillRect(px + 5, py + 15, this.tileSize - 10, this.tileSize - 20);
        
        this.ctx.fillStyle = '#FF6B6B';
        this.ctx.beginPath();
        this.ctx.moveTo(px + 5, py + 15);
        this.ctx.lineTo(px + this.tileSize / 2, py + 2);
        this.ctx.lineTo(px + this.tileSize - 5, py + 15);
        this.ctx.closePath();
        this.ctx.fill();
        
        this.ctx.fillStyle = '#8B4513';
        this.ctx.fillRect(px + 20, py + 30, 20, this.tileSize - 35);
        
        this.ctx.fillStyle = '#FF69B4';
        this.ctx.font = '16px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('🏠', px + this.tileSize / 2, py + this.tileSize / 2 + 5);
    }
    
    drawStar(x, y) {
        const px = x * this.tileSize + this.tileSize / 2;
        const py = y * this.tileSize + this.tileSize / 2;
        const bounce = Math.sin(this.animationFrame * 0.15) * 3;
        
        this.ctx.font = '30px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText('⭐', px, py + bounce);
    }
    
    drawKey(x, y, color) {
        const px = x * this.tileSize + this.tileSize / 2;
        const py = y * this.tileSize + this.tileSize / 2;
        const bounce = Math.sin(this.animationFrame * 0.12) * 2;
        const keyY = py + bounce;

        const colors = {
            red: { main: '#FF6B6B', dark: '#E55A5A', light: '#FF8787' },
            blue: { main: '#4A90E2', dark: '#3A7BC8', light: '#6BA5E7' },
            green: { main: '#7ED321', dark: '#6ABF1A', light: '#9BE04D' },
            yellow: { main: '#F5A623', dark: '#E09000', light: '#FFC447' }
        };

        const c = colors[color] || colors.red;

        // 绘制钥匙阴影
        this.ctx.fillStyle = 'rgba(0,0,0,0.15)';
        this.drawKeyShape(px + 2, keyY + 2, c.dark);
        this.ctx.fill();

        // 绘制钥匙主体
        const gradient = this.ctx.createLinearGradient(px - 15, keyY - 15, px + 15, keyY + 15);
        gradient.addColorStop(0, c.light);
        gradient.addColorStop(0.5, c.main);
        gradient.addColorStop(1, c.dark);
        this.ctx.fillStyle = gradient;
        this.drawKeyShape(px, keyY, c.main);
        this.ctx.fill();

        // 绘制钥匙边框
        this.ctx.strokeStyle = c.dark;
        this.ctx.lineWidth = 1.5;
        this.drawKeyShape(px, keyY, c.main);
        this.ctx.stroke();

        // 绘制钥匙高光
        this.ctx.fillStyle = 'rgba(255,255,255,0.4)';
        this.ctx.beginPath();
        this.ctx.ellipse(px - 5, keyY - 8, 4, 6, -0.3, 0, Math.PI * 2);
        this.ctx.fill();
    }

    // 绘制钥匙形状辅助方法
    drawKeyShape(cx, cy, color) {
        this.ctx.beginPath();

        // 钥匙头部（圆形）
        const headRadius = 10;
        this.ctx.arc(cx - 8, cy, headRadius, 0, Math.PI * 2);

        // 钥匙杆
        this.ctx.rect(cx - 8, cy - 3, 20, 6);

        // 钥匙齿（三个小矩形）
        this.ctx.rect(cx + 8, cy - 1, 4, 6);
        this.ctx.rect(cx + 12, cy - 3, 3, 5);
        this.ctx.rect(cx + 15, cy - 1, 3, 4);

        this.ctx.closePath();
    }
    
    drawCat() {
        const px = this.cat.x * this.tileSize + this.tileSize / 2;
        const py = this.cat.y * this.tileSize + this.tileSize / 2 + this.catBounce;
        
        this.ctx.fillStyle = 'rgba(0,0,0,0.1)';
        this.ctx.beginPath();
        this.ctx.ellipse(px, py + 20, 18, 8, 0, 0, Math.PI * 2);
        this.ctx.fill();
        
        this.ctx.fillStyle = this.colors.cat;
        this.ctx.beginPath();
        this.ctx.arc(px, py, 20, 0, Math.PI * 2);
        this.ctx.fill();
        
        // 耳朵
        this.ctx.beginPath();
        this.ctx.moveTo(px - 15, py - 10);
        this.ctx.lineTo(px - 20, py - 25);
        this.ctx.lineTo(px - 5, py - 18);
        this.ctx.closePath();
        this.ctx.fill();
        
        this.ctx.beginPath();
        this.ctx.moveTo(px + 15, py - 10);
        this.ctx.lineTo(px + 20, py - 25);
        this.ctx.lineTo(px + 5, py - 18);
        this.ctx.closePath();
        this.ctx.fill();
        
        // 耳朵内部
        this.ctx.fillStyle = '#FFB6C1';
        this.ctx.beginPath();
        this.ctx.moveTo(px - 13, py - 12);
        this.ctx.lineTo(px - 17, py - 20);
        this.ctx.lineTo(px - 8, py - 16);
        this.ctx.closePath();
        this.ctx.fill();
        
        this.ctx.beginPath();
        this.ctx.moveTo(px + 13, py - 12);
        this.ctx.lineTo(px + 17, py - 20);
        this.ctx.lineTo(px + 8, py - 16);
        this.ctx.closePath();
        this.ctx.fill();
        
        // 眼睛
        this.ctx.fillStyle = '#333';
        this.ctx.beginPath();
        this.ctx.arc(px - 7, py - 3, 4, 0, Math.PI * 2);
        this.ctx.arc(px + 7, py - 3, 4, 0, Math.PI * 2);
        this.ctx.fill();
        
        // 眼睛高光
        this.ctx.fillStyle = '#FFF';
        this.ctx.beginPath();
        this.ctx.arc(px - 8, py - 5, 2, 0, Math.PI * 2);
        this.ctx.arc(px + 6, py - 5, 2, 0, Math.PI * 2);
        this.ctx.fill();
        
        // 鼻子
        this.ctx.fillStyle = '#FF69B4';
        this.ctx.beginPath();
        this.ctx.arc(px, py + 3, 3, 0, Math.PI * 2);
        this.ctx.fill();
        
        // 嘴巴
        this.ctx.strokeStyle = '#333';
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        this.ctx.arc(px - 5, py + 8, 5, 0, Math.PI);
        this.ctx.stroke();
        this.ctx.beginPath();
        this.ctx.arc(px + 5, py + 8, 5, 0, Math.PI);
        this.ctx.stroke();
        
        // 胡须
        this.ctx.strokeStyle = '#999';
        this.ctx.lineWidth = 1;
        this.ctx.beginPath();
        this.ctx.moveTo(px - 20, py + 2);
        this.ctx.lineTo(px - 30, py);
        this.ctx.moveTo(px - 20, py + 6);
        this.ctx.lineTo(px - 30, py + 8);
        this.ctx.moveTo(px + 20, py + 2);
        this.ctx.lineTo(px + 30, py);
        this.ctx.moveTo(px + 20, py + 6);
        this.ctx.lineTo(px + 30, py + 8);
        this.ctx.stroke();
    }
    
    drawParticles() {
        for (let p of this.particles) {
            this.ctx.fillStyle = p.color;
            this.ctx.globalAlpha = p.life / 30;
            this.ctx.beginPath();
            this.ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            this.ctx.fill();
            this.ctx.globalAlpha = 1;
        }
    }
}

window.addEventListener('load', () => new CatGame());
