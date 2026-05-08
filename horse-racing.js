class HorseRacingGame {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');

        // 画布尺寸
        this.canvas.width = 800;
        this.canvas.height = 500;

        // 游戏状态: start, selecting, countdown, racing, puzzle, finished
        this.gameState = 'start';
        this.selectedHorse = null;

        // 赛道配置
        this.trackCount = 3;
        this.trackColors = ['#9B59B6', '#3498DB', '#E74C3C'];
        this.trackNames = ['紫悦', '蓝蓝', '小红'];
        this.trackEmojis = ['🦄', '🐎', '🏇'];

        // 马匹
        this.horses = [
            { id: 'purple', progress: 0, speed: 0.3, baseSpeed: 0.3, speedLevel: 0, maxSpeedLevel: 5, color: '#9B59B6', name: '紫悦', emoji: '🦄', y: 0 },
            { id: 'blue', progress: 0, speed: 0.3, baseSpeed: 0.3, speedLevel: 0, maxSpeedLevel: 5, color: '#3498DB', name: '蓝蓝', emoji: '🐎', y: 0 },
            { id: 'red', progress: 0, speed: 0.3, baseSpeed: 0.3, speedLevel: 0, maxSpeedLevel: 5, color: '#E74C3C', name: '小红', emoji: '🏇', y: 0 }
        ];

        // 比赛配置
        this.raceLength = 100;
        this.puzzleInterval = 25;
        this.lastPuzzleAt = 0;
        this.questionsAnswered = 0;
        this.correctAnswers = 0;
        this.boostCount = 0;
        this.totalScore = 0;

        // 连击系统
        this.combo = 0;
        this.maxCombo = 0;

        // 当前题目
        this.currentPuzzle = null;
        this.answerChecked = false;
        this.wrongAttempts = 0;
        this.maxWrongAttempts = 2;

        // 动画
        this.animationFrame = 0;
        this.horseAnimFrame = [0, 0, 0];
        this.particles = [];
        this.cloudOffset = 0;

        // 比赛结果
        this.raceResults = [];
        this.raceStartTime = 0;
        this.raceFinishTime = 0;

        // 音频
        this.audioCtx = null;
        this.audioInitialized = false;

        // 汉字数据库
        this.chineseCharacters = [
            { char: '猫', emoji: '🐱', name: '小猫' },
            { char: '狗', emoji: '🐶', name: '小狗' },
            { char: '鸟', emoji: '🐦', name: '小鸟' },
            { char: '鱼', emoji: '🐟', name: '小鱼' },
            { char: '花', emoji: '🌸', name: '花朵' },
            { char: '树', emoji: '🌳', name: '大树' },
            { char: '日', emoji: '☀️', name: '太阳' },
            { char: '月', emoji: '🌙', name: '月亮' },
            { char: '星', emoji: '⭐', name: '星星' },
            { char: '水', emoji: '💧', name: '水滴' },
            { char: '火', emoji: '🔥', name: '火焰' },
            { char: '山', emoji: '⛰️', name: '大山' },
            { char: '云', emoji: '☁️', name: '白云' },
            { char: '雨', emoji: '🌧️', name: '下雨' },
            { char: '果', emoji: '🍎', name: '苹果' },
            { char: '手', emoji: '✋', name: '小手' },
            { char: '口', emoji: '👄', name: '嘴巴' },
            { char: '目', emoji: '👁️', name: '眼睛' }
        ];

        // 关卡系统
        this.currentLevel = 1;
        this.maxLevel = 8;
        this.levelProgress = this.loadLevelProgress();

        this.levelConfigs = {
            1: {
                name: '初出茅庐',
                desc: '第1关：简单加法（5以内）',
                puzzleTypes: ['math'],
                mathRange: 5,
                mathOps: ['add'],
                puzzleInterval: 30,
                aiDifficulty: 0.8,
                trackLength: 100,
                letterRange: 0,
                chineseCount: 0
            },
            2: {
                name: '小试牛刀',
                desc: '第2关：加减法（10以内）',
                puzzleTypes: ['math'],
                mathRange: 10,
                mathOps: ['add', 'sub'],
                puzzleInterval: 28,
                aiDifficulty: 0.85,
                trackLength: 100,
                letterRange: 0,
                chineseCount: 0
            },
            3: {
                name: '字母冒险',
                desc: '第3关：加减法 + 字母认读',
                puzzleTypes: ['math', 'letter'],
                mathRange: 10,
                mathOps: ['add', 'sub'],
                puzzleInterval: 25,
                aiDifficulty: 0.9,
                trackLength: 110,
                letterRange: 10,
                chineseCount: 0
            },
            4: {
                name: '博学多才',
                desc: '第4关：数学 + 字母 + 汉字',
                puzzleTypes: ['math', 'letter', 'chinese'],
                mathRange: 10,
                mathOps: ['add', 'sub'],
                puzzleInterval: 22,
                aiDifficulty: 0.95,
                trackLength: 120,
                letterRange: 15,
                chineseCount: 10
            },
            5: {
                name: '飞速前进',
                desc: '第5关：大数运算 + 更多挑战',
                puzzleTypes: ['math', 'letter', 'chinese'],
                mathRange: 15,
                mathOps: ['add', 'sub'],
                puzzleInterval: 20,
                aiDifficulty: 1.0,
                trackLength: 130,
                letterRange: 20,
                chineseCount: 14
            },
            6: {
                name: '风驰电掣',
                desc: '第6关：高速竞赛',
                puzzleTypes: ['math', 'letter', 'chinese'],
                mathRange: 20,
                mathOps: ['add', 'sub'],
                puzzleInterval: 18,
                aiDifficulty: 1.05,
                trackLength: 140,
                letterRange: 26,
                chineseCount: 18
            },
            7: {
                name: '终极挑战',
                desc: '第7关：全部题型 + 高难度',
                puzzleTypes: ['math', 'letter', 'chinese'],
                mathRange: 20,
                mathOps: ['add', 'sub'],
                puzzleInterval: 16,
                aiDifficulty: 1.1,
                trackLength: 150,
                letterRange: 26,
                chineseCount: 18
            },
            8: {
                name: '冠军之路',
                desc: '第8关：大师级挑战！',
                puzzleTypes: ['math', 'letter', 'chinese'],
                mathRange: 25,
                mathOps: ['add', 'sub'],
                puzzleInterval: 15,
                aiDifficulty: 1.15,
                trackLength: 160,
                letterRange: 26,
                chineseCount: 18
            }
        };

        // 资源加载器
        this.assetLoader = new AssetLoader();
        this.assetsReady = false;

        this.init();
    }

    init() {
        this.setupCanvas();
        this.bindEvents();
        this.calculateTrackPositions();
        this.renderLevelGrid();
        this.loadAssets();
        this.gameLoop();
    }

    async loadAssets() {
        const manifest = {
            images: {
                'horse-purple': 'assets/images/horse/horse-purple.svg',
                'horse-blue': 'assets/images/horse/horse-blue.svg',
                'horse-red': 'assets/images/horse/horse-red.svg',
                cloud: 'assets/images/horse/cloud.svg',
                tree: 'assets/images/horse/tree.svg',
                flowers: 'assets/images/horse/flowers.svg',
            },
            sounds: {
                gallop: 'assets/sounds/horse/gallop.wav',
                boost: 'assets/sounds/shared/collect.wav',
                correct: 'assets/sounds/shared/correct.wav',
                wrong: 'assets/sounds/shared/wrong.wav',
                countdown: 'assets/sounds/horse/countdown.wav',
                go: 'assets/sounds/horse/go.wav',
                cheer: 'assets/sounds/horse/cheer.wav',
                finish: 'assets/sounds/shared/level-complete.wav',
                levelup: 'assets/sounds/shared/level-complete.wav',
            }
        };
        try {
            await this.assetLoader.loadAll(manifest);
            this.assetsReady = true;
        } catch (e) {
            console.warn('资源加载失败，使用降级渲染', e);
        }
    }

    setupCanvas() {
        const container = this.canvas.parentElement;
        const maxWidth = Math.min(800, window.innerWidth - 40);
        const scale = maxWidth / 800;
        this.canvas.style.width = maxWidth + 'px';
        this.canvas.style.height = (500 * scale) + 'px';
        this.scale = scale;
    }

    calculateTrackPositions() {
        const trackHeight = this.canvas.height / this.trackCount;
        this.horses.forEach((horse, i) => {
            horse.y = trackHeight * i + trackHeight / 2;
            horse.trackHeight = trackHeight;
        });
    }

    // === 关卡系统 ===

    loadLevelProgress() {
        try {
            const saved = localStorage.getItem('horseRacingLevelProgress');
            if (saved) return JSON.parse(saved);
        } catch (e) {}
        return { unlockedLevels: [1], highestLevel: 1, levelScores: {} };
    }

    saveLevelProgress() {
        try {
            localStorage.setItem('horseRacingLevelProgress', JSON.stringify(this.levelProgress));
        } catch (e) {}
    }

    unlockNextLevel() {
        const nextLevel = this.currentLevel + 1;
        if (nextLevel <= this.maxLevel && !this.levelProgress.unlockedLevels.includes(nextLevel)) {
            this.levelProgress.unlockedLevels.push(nextLevel);
            this.levelProgress.highestLevel = Math.max(this.levelProgress.highestLevel, nextLevel);
            this.saveLevelProgress();
            return true;
        }
        return false;
    }

    renderLevelGrid() {
        const levelGrid = document.getElementById('levelGrid');
        if (!levelGrid) return;
        levelGrid.innerHTML = '';
        const unlocked = this.levelProgress.unlockedLevels;
        for (let i = 1; i <= this.maxLevel; i++) {
            const btn = document.createElement('button');
            btn.className = 'level-btn';
            const isUnlocked = unlocked.includes(i);
            const isCurrent = i === this.currentLevel;
            if (isCurrent) btn.classList.add('current');
            else if (isUnlocked) btn.classList.add('unlocked');
            else btn.classList.add('locked');
            const star = this.levelProgress.levelScores[i] ? '⭐' : '';
            btn.innerHTML = `<span class="level-number">${i}</span>
                <span class="level-status">${isCurrent ? '当前' : (isUnlocked ? star || '已解锁' : '🔒')}</span>`;
            if (isUnlocked) {
                btn.addEventListener('click', () => this.selectLevel(i));
                btn.addEventListener('touchend', (e) => { e.preventDefault(); this.selectLevel(i); });
            } else {
                btn.disabled = true;
            }
            levelGrid.appendChild(btn);
        }
        const cfg = this.levelConfigs[this.currentLevel];
        document.getElementById('levelDesc').textContent = cfg.desc;
    }

    selectLevel(level) {
        this.currentLevel = level;
        this.renderLevelGrid();
        this.showMessage(`已选择: ${this.levelConfigs[level].name}`, '🎯');
    }

    // === 音频系统 ===

    initAudio() {
        if (this.audioInitialized) return;
        try {
            this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            this.audioInitialized = true;
        } catch (e) {
            console.log('Web Audio API 不可用');
        }
    }

    playSound(type) {
        // 优先使用音频文件
        if (this.assetLoader.playSound(type, 0.5)) return;
        // 降级到 Web Audio 合成
        if (!this.audioCtx) return;
        const ctx = this.audioCtx;
        const now = ctx.currentTime;

        const createOsc = (oscType, freq, start, duration, gainVal = 0.15) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = oscType;
            osc.frequency.setValueAtTime(freq, now + start);
            gain.gain.setValueAtTime(gainVal, now + start);
            gain.gain.exponentialRampToValueAtTime(0.001, now + start + duration);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(now + start);
            osc.stop(now + start + duration);
        };

        switch (type) {
            case 'gallop': {
                const playerHorse = this.horses.find(h => h.id === this.selectedHorse);
                const freqBoost = playerHorse ? playerHorse.speedLevel * 30 : 0;
                createOsc('sine', 200 + freqBoost, 0, 0.05, 0.03);
                createOsc('sine', 300 + freqBoost, 0.05, 0.05, 0.03);
                break;
            }
            case 'boost':
                createOsc('sine', 523, 0, 0.1, 0.15);
                createOsc('sine', 659, 0.08, 0.1, 0.12);
                createOsc('sine', 784, 0.16, 0.15, 0.1);
                break;
            case 'correct':
                createOsc('sine', 523, 0, 0.1, 0.2);
                createOsc('sine', 659, 0.1, 0.1, 0.2);
                createOsc('sine', 784, 0.2, 0.2, 0.2);
                break;
            case 'wrong':
                createOsc('square', 200, 0, 0.2, 0.08);
                break;
            case 'finish':
                [523, 659, 784, 1047].forEach((freq, i) => {
                    createOsc('sine', freq, i * 0.15, 0.2, 0.15);
                });
                break;
            case 'countdown':
                createOsc('sine', 440, 0, 0.15, 0.1);
                break;
            case 'go':
                createOsc('sine', 880, 0, 0.3, 0.2);
                break;
            case 'cheer': {
                const bufferSize = Math.floor(ctx.sampleRate * 1.5);
                const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
                const data = buffer.getChannelData(0);
                for (let j = 0; j < bufferSize; j++) {
                    data[j] = (Math.random() * 2 - 1) * Math.exp(-j / (ctx.sampleRate * 0.5)) * 0.1;
                }
                const source = ctx.createBufferSource();
                source.buffer = buffer;
                const cheerGain = ctx.createGain();
                cheerGain.gain.setValueAtTime(0.08, now);
                cheerGain.gain.exponentialRampToValueAtTime(0.001, now + 1.5);
                source.connect(cheerGain);
                cheerGain.connect(ctx.destination);
                source.start(now);
                break;
            }
            case 'levelup':
                [523, 659, 784, 880, 1047].forEach((freq, i) => {
                    createOsc('sine', freq, i * 0.12, 0.25, 0.12);
                });
                break;
        }
    }

    // === 事件绑定 ===

    bindEvents() {
        document.querySelectorAll('.horse-option').forEach(opt => {
            opt.addEventListener('click', () => this.selectHorse(opt.dataset.horse));
            opt.addEventListener('touchend', (e) => {
                e.preventDefault();
                this.selectHorse(opt.dataset.horse);
            });
        });

        document.getElementById('startBtn').addEventListener('click', () => this.startRace());
        document.getElementById('closePuzzleBtn').addEventListener('click', () => this.closePuzzle());
        document.getElementById('hintBtn').addEventListener('click', () => this.showHint());
        document.getElementById('playAudioBtn').addEventListener('click', () => this.playPuzzleAudio());
        document.getElementById('raceAgainBtn').addEventListener('click', () => this.resetRace());
        document.getElementById('backToSelectBtn').addEventListener('click', () => this.backToSelect());

        document.getElementById('puzzleOptions').addEventListener('click', (e) => {
            if (e.target.classList.contains('answer-option')) {
                this.checkAnswer(e.target.dataset.answer);
            }
        });
    }

    selectHorse(horseId) {
        this.initAudio();
        this.selectedHorse = horseId;

        document.querySelectorAll('.horse-option').forEach(opt => {
            opt.classList.remove('selected');
            if (opt.dataset.horse === horseId) {
                opt.classList.add('selected');
            }
        });

        document.getElementById('startBtn').disabled = false;
        this.showMessage(`你选择了${this.horses.find(h => h.id === horseId).name}！`, '🐴');
    }

    startRace() {
        if (!this.selectedHorse) return;

        // 应用关卡配置
        const cfg = this.levelConfigs[this.currentLevel];
        this.puzzleInterval = cfg.puzzleInterval;
        this.raceLength = cfg.trackLength;

        this.gameState = 'countdown';
        document.getElementById('startScreen').classList.remove('active');
        document.getElementById('gameScreen').classList.add('active');

        this.countdownAndStart();
    }

    countdownAndStart() {
        let count = 3;
        const countdownInterval = setInterval(() => {
            if (count > 0) {
                this.showCountdown(count);
                this.playSound('countdown');
                count--;
            } else {
                clearInterval(countdownInterval);
                this.showCountdown('开始！');
                this.playSound('go');
                setTimeout(() => {
                    this.gameState = 'racing';
                    this.raceStartTime = Date.now();
                }, 500);
            }
        }, 800);
    }

    showCountdown(text) {
        this.countdownText = text;
        this.countdownTime = Date.now();
    }

    // === 题目生成 ===

    generatePuzzle() {
        const cfg = this.levelConfigs[this.currentLevel];
        const types = cfg.puzzleTypes;
        const type = types[Math.floor(Math.random() * types.length)];

        if (type === 'math') {
            return this.generateMathPuzzle(cfg.mathRange, cfg.mathOps);
        } else if (type === 'letter') {
            return this.generateLetterPuzzle(cfg.letterRange);
        } else {
            return this.generateChinesePuzzle(cfg.chineseCount);
        }
    }

    generateMathPuzzle(range = 10, ops = ['add', 'sub']) {
        const isAdd = ops.includes('add') && (!ops.includes('sub') || Math.random() > 0.4);
        let a, b, answer, question, audioText;

        if (isAdd) {
            a = Math.floor(Math.random() * (range - 1)) + 1;
            b = Math.floor(Math.random() * (range - a)) + 1;
            question = `${a} + ${b} = ?`;
            answer = String(a + b);
            audioText = `${a}加${b}等于多少？`;
        } else {
            a = Math.floor(Math.random() * (range - 1)) + 2;
            b = Math.floor(Math.random() * (a - 1)) + 1;
            question = `${a} - ${b} = ?`;
            answer = String(a - b);
            audioText = `${a}减${b}等于多少？`;
        }

        const ans = parseInt(answer);
        const options = [answer];
        while (options.length < 4) {
            const offset = Math.floor(Math.random() * 3) + 1;
            const opt = Math.random() > 0.5 ? ans + offset : Math.max(0, ans - offset);
            if (!options.includes(String(opt))) {
                options.push(String(opt));
            }
        }
        options.sort(() => Math.random() - 0.5);

        return { type: 'math', question, answer, options, audioText };
    }

    generateLetterPuzzle(letterRange = 10) {
        const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        const maxIndex = Math.min(letterRange, 24);
        const letterIndex = Math.floor(Math.random() * maxIndex) + 1;
        const letter = letters[letterIndex];
        const types = ['next', 'prev', 'identify'];
        const type = types[Math.floor(Math.random() * types.length)];

        let question, answer, options, audioText;

        if (type === 'next') {
            question = `${letter} 后面是什么字母？`;
            answer = letters[letterIndex + 1];
            options = [letters[letterIndex], answer, letters[letterIndex + 2], letters[letterIndex - 1]];
            audioText = `字母${letter}，后面是什么字母？`;
        } else if (type === 'prev') {
            question = `${letter} 前面是什么字母？`;
            answer = letters[letterIndex - 1];
            options = [answer, letters[letterIndex], letters[letterIndex + 1], letters[letterIndex + 2]];
            audioText = `字母${letter}，前面是什么字母？`;
        } else {
            question = `哪个是字母 ${letter}？`;
            answer = letter;
            options = [letters[letterIndex - 1], answer, letters[letterIndex + 1], letters[letterIndex + 2]];
            audioText = `哪个是字母${letter}？`;
        }

        options = [...new Set(options)].slice(0, 4);
        while (options.length < 4) {
            const randLetter = letters[Math.floor(Math.random() * 26)];
            if (!options.includes(randLetter)) options.push(randLetter);
        }
        options.sort(() => Math.random() - 0.5);

        return { type: 'letter', question, answer, options, audioText };
    }

    generateChinesePuzzle(chineseCount = 18) {
        const chars = this.chineseCharacters.slice(0, Math.max(4, chineseCount));
        const charData = chars[Math.floor(Math.random() * chars.length)];
        const otherChars = chars
            .filter(c => c.char !== charData.char)
            .sort(() => Math.random() - 0.5)
            .slice(0, 3);

        const options = [charData.char, ...otherChars.map(c => c.char)];
        options.sort(() => Math.random() - 0.5);

        return {
            type: 'chinese',
            question: '这是什么字？',
            emoji: charData.emoji,
            answer: charData.char,
            options,
            audioText: `这是什么字？这是${charData.name}的${charData.char}字。`
        };
    }

    showPuzzle() {
        const puzzle = this.generatePuzzle();
        this.currentPuzzle = puzzle;
        this.answerChecked = false;
        this.wrongAttempts = 0;
        this.gameState = 'puzzle';

        const modal = document.getElementById('puzzleModal');
        const questionEl = document.getElementById('puzzleQuestion');
        const typeIconEl = document.getElementById('puzzleTypeIcon');
        const optionsContainer = document.getElementById('puzzleOptions');
        const hintTextEl = document.getElementById('hintText');

        const icons = { math: '🔢', letter: '🔤', chinese: '🀄' };
        typeIconEl.textContent = icons[puzzle.type];

        if (puzzle.type === 'chinese') {
            questionEl.innerHTML = `<div class="chinese-emoji">${puzzle.emoji}</div><div class="chinese-question">${puzzle.question}</div>`;
        } else {
            questionEl.textContent = puzzle.question;
        }

        optionsContainer.innerHTML = '';
        puzzle.options.forEach(option => {
            const btn = document.createElement('button');
            btn.className = 'answer-option';
            btn.dataset.answer = option;
            btn.textContent = option;
            optionsContainer.appendChild(btn);
        });

        hintTextEl.classList.add('hidden');
        document.getElementById('hintBtn').disabled = false;
        document.getElementById('hintBtn').textContent = '💡 提示';

        const playBtn = document.getElementById('playAudioBtn');
        playBtn.classList.remove('playing');
        playBtn.querySelector('.play-text').textContent = '播放';

        modal.classList.add('active');

        setTimeout(() => this.playPuzzleAudio(), 300);
    }

    closePuzzle() {
        if (window.speechSynthesis) {
            window.speechSynthesis.cancel();
        }
        document.getElementById('puzzleModal').classList.remove('active');
        this.gameState = 'racing';
        this.currentPuzzle = null;
        this.answerChecked = false;
        // 更新 lastPuzzleAt，避免关闭弹窗后立即再次触发题目
        const playerHorse = this.horses.find(h => h.id === this.selectedHorse);
        if (playerHorse) {
            this.lastPuzzleAt = Math.floor(playerHorse.progress / this.puzzleInterval) * this.puzzleInterval;
        }
    }

    playPuzzleAudio() {
        if (!this.currentPuzzle || !this.currentPuzzle.audioText) return;
        if (!window.speechSynthesis) return;

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
            if (zhVoice) utterance.voice = zhVoice;
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

        utterance.onerror = () => {
            if (playBtn) {
                playBtn.classList.remove('playing');
                playBtn.querySelector('.play-text').textContent = '播放';
            }
        };

        window.speechSynthesis.speak(utterance);
    }

    checkAnswer(answer) {
        if (!this.currentPuzzle || this.answerChecked) return;
        const correctAnswer = this.currentPuzzle.answer;
        const isCorrect = answer === correctAnswer;
        const buttons = document.querySelectorAll('.answer-option');

        if (isCorrect) {
            this.answerChecked = true;

            // 高亮正确答案，禁用所有按钮
            buttons.forEach(btn => {
                btn.disabled = true;
                if (btn.dataset.answer === correctAnswer) {
                    btn.classList.add('correct');
                }
            });

            this.questionsAnswered++;
            this.correctAnswers++;
            this.boostCount++;
            this.totalScore += 10;
            this.combo++;
            this.maxCombo = Math.max(this.maxCombo, this.combo);
            this.playSound('correct');

            const playerHorse = this.horses.find(h => h.id === this.selectedHorse);
            if (playerHorse && playerHorse.speedLevel < playerHorse.maxSpeedLevel) {
                playerHorse.speedLevel++;
            }
            if (this.combo >= 3 && playerHorse && playerHorse.speedLevel < playerHorse.maxSpeedLevel) {
                playerHorse.speedLevel++;
            }

            this.playSound('boost');

            this.showFloatingScore('+10 ⚡');

            let msg = '太棒了！加速！⚡';
            if (this.combo === 2) msg = '连对2题! 🔥';
            else if (this.combo === 3) msg = '三连击! 🔥🔥';
            else if (this.combo >= 5) msg = '超级连击! 🔥🔥🔥';
            this.showMessage(msg, '🎉');

            this.updateStats();

            // 延迟关闭弹窗，让用户看到答对动效
            setTimeout(() => {
                // 关闭弹窗后再创建粒子（此时 canvas 可见）
                if (playerHorse) {
                    const trackLeft = 50;
                    const trackRight = this.canvas.width - 50;
                    const trackWidth = trackRight - trackLeft;
                    const hx = trackLeft + (playerHorse.progress / this.raceLength) * trackWidth;
                    const hy = playerHorse.y;
                    this.createParticles(hx, hy, '#FFD700');
                    this.createParticles(hx, hy, '#FF6B9D');
                }
                this.closePuzzle();
            }, 300);
        } else {
            this.wrongAttempts++;

            if (this.wrongAttempts >= this.maxWrongAttempts) {
                this.answerChecked = true;
                buttons.forEach(btn => {
                    btn.disabled = true;
                    if (btn.dataset.answer === correctAnswer) {
                        btn.classList.add('correct');
                    } else if (btn.dataset.answer === answer) {
                        btn.classList.add('wrong');
                    }
                });

                this.questionsAnswered++;
                this.combo = 0;
                this.playSound('wrong');
                this.showMessage('正确答案是: ' + correctAnswer, '💭');

                setTimeout(() => {
                    this.closePuzzle();
                }, 1200);
            } else {
                const wrongBtn = document.querySelector(`.answer-option[data-answer="${answer}"]`);
                if (wrongBtn) {
                    wrongBtn.classList.add('wrong');
                    wrongBtn.disabled = true;
                }

                this.combo = 0;
                this.playSound('wrong');

                const remaining = this.maxWrongAttempts - this.wrongAttempts;
                this.showMessage(`答错了！还有 ${remaining} 次机会~`, '💭');
            }
        }
    }

    showFloatingScore(text) {
        const floater = document.createElement('div');
        floater.textContent = text;
        floater.style.cssText = `position:fixed; top:100px; left:50%; transform:translateX(-50%);
            font-size:28px; font-weight:bold; color:#FFD700; z-index:200;
            animation: floatUp 1s ease forwards; pointer-events:none;
            text-shadow: 0 2px 4px rgba(0,0,0,0.3);`;
        document.body.appendChild(floater);
        setTimeout(() => floater.remove(), 1000);
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
                    hint = `💡 伸出${num1}根手指，再伸出${num2}根，数一数！`;
                } else {
                    hint = `💡 伸出${num1}根手指，弯下${num2}根，看看剩几根？`;
                }
            }
        } else if (this.currentPuzzle.type === 'letter') {
            hint = '💡 唱一唱字母歌：A B C D E...';
        } else if (this.currentPuzzle.type === 'chinese') {
            const charData = this.chineseCharacters.find(c => c.char === this.currentPuzzle.answer);
            if (charData) {
                hint = `💡 这是"${charData.name}"的${charData.emoji}字`;
            }
        }

        hintTextEl.textContent = hint;
        hintTextEl.classList.remove('hidden');
        hintBtn.disabled = true;
        hintBtn.textContent = '✓ 已显示';
    }

    updateStats() {
        const questionsEl = document.getElementById('questionsAnswered');
        if (questionsEl) questionsEl.textContent = this.questionsAnswered;

        const boostEl = document.getElementById('boostCount');
        if (boostEl) boostEl.textContent = this.boostCount;

        const correctEl = document.getElementById('correctCount');
        if (correctEl) correctEl.textContent = this.correctAnswers;

        const scoreEl = document.getElementById('score');
        if (scoreEl) scoreEl.textContent = this.totalScore;

        const playerHorse = this.horses.find(h => h.id === this.selectedHorse);
        const speedEl = document.getElementById('speedLevel');
        if (speedEl && playerHorse) {
            speedEl.textContent = playerHorse.speedLevel;
        }
        const comboEl = document.getElementById('comboCount');
        if (comboEl) {
            comboEl.textContent = this.combo;
        }
    }

    // === 游戏主循环 ===

    update(dt) {
        if (this.gameState !== 'racing') return;

        this.animationFrame++;
        this.cloudOffset += 0.2;

        const cfg = this.levelConfigs[this.currentLevel];

        this.horses.forEach((horse, i) => {
            if (horse.progress >= this.raceLength) return;

            // 基础速度 + 随机变化
            let speed = horse.speed + (Math.random() - 0.5) * 0.1;

            // 阶梯式永久加速
            if (horse.speedLevel > 0) {
                speed += horse.speedLevel * 0.15;
            }

            // 玩家的马稍微慢一点增加悬念
            if (horse.id === this.selectedHorse) {
                speed *= 0.95;
            } else {
                // AI马按关卡难度调整
                const aiMult = cfg.aiDifficulty;
                speed *= aiMult;
                if (Math.random() < 0.01) speed += Math.random() * 0.3;
            }

            horse.progress += speed * dt;
            if (horse.progress > this.raceLength) horse.progress = this.raceLength;

            // 动画帧（随速度加快）
            const animSpeed = 0.1 + horse.speedLevel * 0.05;
            this.horseAnimFrame[i] = (this.horseAnimFrame[i] + animSpeed) % 4;

            // 马蹄声
            if (this.animationFrame % 30 === 0 && horse.progress < this.raceLength) {
                this.playSound('gallop');
            }

            // 风粒子
            if (horse.speedLevel >= 2 && this.animationFrame % Math.max(2, 6 - horse.speedLevel) === 0) {
                const trackLeft = 50;
                const trackRight = this.canvas.width - 50;
                const trackWidth = trackRight - trackLeft;
                const hx = trackLeft + (horse.progress / this.raceLength) * trackWidth;
                this.particles.push({
                    x: hx - 20,
                    y: horse.y + (Math.random() - 0.5) * 20,
                    vx: -(1 + horse.speedLevel * 0.5),
                    vy: 0,
                    life: 15,
                    color: 'rgba(255,255,255,0.5)',
                    size: 2
                });
            }
        });

        // 限制粒子数量
        if (this.particles.length > 100) {
            this.particles = this.particles.slice(-80);
        }

        // 检查是否遇到题目
        const playerHorse = this.horses.find(h => h.id === this.selectedHorse);
        if (playerHorse && playerHorse.progress > this.lastPuzzleAt + this.puzzleInterval && playerHorse.progress < this.raceLength) {
            this.lastPuzzleAt = Math.floor(playerHorse.progress / this.puzzleInterval) * this.puzzleInterval;
            this.showPuzzle();
        }

        // 检查比赛结束
        const finishedHorses = this.horses.filter(h => h.progress >= this.raceLength);
        if (finishedHorses.length > 0 && this.raceResults.length < this.horses.length) {
            finishedHorses.forEach(horse => {
                if (!this.raceResults.find(r => r.id === horse.id)) {
                    this.raceResults.push({
                        ...horse,
                        rank: this.raceResults.length + 1,
                        finishTime: Date.now() - this.raceStartTime
                    });
                }
            });

            if (finishedHorses.some(h => h.id === this.selectedHorse)) {
                this.playSound('finish');
                this.playSound('cheer');
                this.createConfetti();
            }
        }

        // 所有马都到达终点
        if (this.raceResults.length === this.horses.length && this.gameState === 'racing') {
            this.gameState = 'finished';
            this.raceFinishTime = Date.now();
            setTimeout(() => this.showResults(), 1000);
        }

        // 更新显示
        const playerProgress = playerHorse ? playerHorse.progress : 0;
        const progressPct = Math.min(100, Math.floor((playerProgress / this.raceLength) * 100));
        document.getElementById('raceProgress').textContent = progressPct + '%';
        const progressFill = document.getElementById('progressFill');
        if (progressFill) progressFill.style.width = progressPct + '%';
    }

    draw() {
        const ctx = this.ctx;
        const w = this.canvas.width;
        const h = this.canvas.height;

        ctx.clearRect(0, 0, w, h);

        // 每帧重置 canvas 状态，防止状态泄漏
        ctx.globalAlpha = 1.0;
        ctx.globalCompositeOperation = 'source-over';
        ctx.setLineDash([]);

        this.drawBackground(ctx, w, h);
        this.drawDecorations(ctx, w, h);
        this.drawTracks(ctx, w, h);
        this.drawHorses(ctx, w, h);

        if (this.countdownText && Date.now() - this.countdownTime < 800) {
            this.drawCountdown(ctx, w, h);
        }

        this.drawParticles(ctx);
    }

    drawBackground(ctx, w, h) {
        // 天空渐变
        const skyGrad = ctx.createLinearGradient(0, 0, 0, h);
        skyGrad.addColorStop(0, '#87CEEB');
        skyGrad.addColorStop(1, '#E0F7FA');
        ctx.fillStyle = skyGrad;
        ctx.fillRect(0, 0, w, h);

        // 草地
        const grassY = h * 0.85;
        const grassGrad = ctx.createLinearGradient(0, grassY, 0, h);
        grassGrad.addColorStop(0, '#90EE90');
        grassGrad.addColorStop(1, '#228B22');
        ctx.fillStyle = grassGrad;
        ctx.fillRect(0, grassY, w, h - grassY);

        // 云朵（缓慢飘动）
        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        const c1 = (100 + this.cloudOffset * 0.3) % (w + 100) - 50;
        const c2 = (300 + this.cloudOffset * 0.5) % (w + 100) - 50;
        const c3 = (600 + this.cloudOffset * 0.2) % (w + 100) - 50;
        this.drawCloud(ctx, c1, 50, 30);
        this.drawCloud(ctx, c2, 80, 25);
        this.drawCloud(ctx, c3, 40, 35);
    }

    drawCloud(ctx, x, y, size) {
        const img = this.assetLoader.getImage('cloud');
        if (img) {
            ctx.drawImage(img, x - size, y - size, size * 3, size * 2);
            return;
        }
        // 降级
        ctx.beginPath();
        ctx.arc(x, y, size, 0, Math.PI * 2);
        ctx.arc(x + size * 0.8, y - size * 0.3, size * 0.7, 0, Math.PI * 2);
        ctx.arc(x + size * 1.5, y, size * 0.8, 0, Math.PI * 2);
        ctx.fill();
    }

    drawDecorations(ctx, w, h) {
        const grassY = h * 0.85;

        // 树木 - 优先使用 sprite
        const treeImg = this.assetLoader.getImage('tree');
        const flowerImg = this.assetLoader.getImage('flowers');
        const treePositions = [60, 200, 400, 550, 700];
        treePositions.forEach(tx => {
            if (treeImg) {
                ctx.drawImage(treeImg, tx - 20, grassY - 20, 40, 45);
            } else {
                // 降级
                ctx.fillStyle = '#8B4513';
                ctx.fillRect(tx - 3, grassY + 5, 6, 20);
                ctx.fillStyle = '#228B22';
                ctx.beginPath();
                ctx.moveTo(tx - 15, grassY + 8);
                ctx.lineTo(tx, grassY - 15);
                ctx.lineTo(tx + 15, grassY + 8);
                ctx.fill();
            }
        });

        // 花朵
        if (flowerImg) {
            for (let fx = 30; fx < w; fx += 70) {
                const fy = grassY + 10 + Math.sin(fx * 0.1) * 3;
                ctx.drawImage(flowerImg, fx - 8, fy - 8, 16, 16);
            }
        } else {
            // 降级
            const flowerColors = ['#FF69B4', '#FFD700', '#FF6347', '#DA70D6', '#87CEEB'];
            for (let fx = 30; fx < w; fx += 70) {
                const color = flowerColors[Math.floor(fx / 70) % flowerColors.length];
                const fy = grassY + 15 + Math.sin(fx * 0.1) * 3;
                ctx.fillStyle = color;
                ctx.beginPath();
                ctx.arc(fx, fy, 4, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = '#FFD700';
                ctx.beginPath();
                ctx.arc(fx, fy, 1.5, 0, Math.PI * 2);
                ctx.fill();
            }
        }
    }

    drawTracks(ctx, w, h) {
        const trackHeight = h / this.trackCount;
        const trackLeft = 50;
        const trackRight = w - 50;
        const trackWidth = trackRight - trackLeft;

        this.horses.forEach((horse, i) => {
            const y = trackHeight * i;

            ctx.fillStyle = this.trackColors[i] + '33';
            ctx.fillRect(0, y, w, trackHeight);

            ctx.strokeStyle = this.trackColors[i] + '66';
            ctx.lineWidth = 2;
            ctx.setLineDash([10, 10]);
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(w, y);
            ctx.stroke();
            ctx.setLineDash([]);

            ctx.strokeStyle = this.trackColors[i];
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(trackLeft, y + trackHeight / 2);
            ctx.lineTo(trackRight, y + trackHeight / 2);
            ctx.stroke();

            // 终点线
            ctx.strokeStyle = '#000';
            ctx.lineWidth = 3;
            ctx.setLineDash([5, 5]);
            ctx.beginPath();
            ctx.moveTo(trackRight - 5, y);
            ctx.lineTo(trackRight - 5, y + trackHeight);
            ctx.stroke();
            ctx.setLineDash([]);

            ctx.fillStyle = this.trackColors[i];
            ctx.font = 'bold 16px Arial';
            ctx.textAlign = 'left';
            ctx.textBaseline = 'middle';
            ctx.fillText(horse.name, 10, y + trackHeight / 2 + 5);
        });
    }

    drawHorses(ctx, w, h) {
        // 每帧开始时重置 canvas 状态
        ctx.globalAlpha = 1.0;
        ctx.globalCompositeOperation = 'source-over';

        const trackLeft = 50;
        const trackRight = w - 50;
        const trackWidth = trackRight - trackLeft;

        this.horses.forEach((horse, i) => {
            const x = trackLeft + (horse.progress / this.raceLength) * trackWidth;
            const y = horse.y;
            const bounce = Math.sin(this.horseAnimFrame[i] * 2) * 4;

            // 保存当前状态，确保每匹马绘制独立
            ctx.save();

            // 速度拖尾
            if (horse.speedLevel > 0) {
                for (let t = 1; t <= horse.speedLevel; t++) {
                    const alpha = 0.3 - (t * 0.05);
                    const trailX = x - t * 12;
                    ctx.strokeStyle = `rgba(255, 215, 0, ${Math.max(0.05, alpha)})`;
                    ctx.lineWidth = 3 - t * 0.4;
                    ctx.beginPath();
                    ctx.moveTo(trailX - 10, y);
                    ctx.lineTo(trailX - 20, y);
                    ctx.stroke();
                }
            }

            // 加速光环
            if (horse.speedLevel > 0) {
                ctx.fillStyle = `rgba(255, 215, 0, ${Math.min(0.4, horse.speedLevel * 0.1)})`;
                ctx.beginPath();
                ctx.arc(x, y, 30, 0, Math.PI * 2);
                ctx.fill();
            }

            // 绘制小马（朝右 = 终点方向）
            ctx.globalAlpha = 1.0;
            ctx.globalCompositeOperation = 'source-over';
            ctx.save();
            const horseImg = this.assetLoader.getImage(`horse-${horse.id}`);
            if (horseImg) {
                const imgSize = 50;
                ctx.drawImage(horseImg, x - imgSize / 2, y + bounce - imgSize / 2, imgSize, imgSize);
            } else {
                // 降级: emoji 渲染
                ctx.translate(x, y + bounce);
                ctx.scale(-1, 1);  // 水平翻转，让马头朝右
                ctx.font = '40px Arial';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(horse.emoji, 0, 0);
            }
            ctx.restore();

            // 方向指示箭头（朝右 = 终点方向，马头已朝右）
            ctx.save();
            ctx.globalAlpha = 0.7;
            ctx.fillStyle = horse.color;
            ctx.beginPath();
            ctx.moveTo(x + 20, y + bounce);
            ctx.lineTo(x + 27, y + bounce - 5);
            ctx.lineTo(x + 27, y + bounce + 5);
            ctx.closePath();
            ctx.fill();
            ctx.restore();

            // 玩家的马光环
            if (horse.id === this.selectedHorse) {
                ctx.strokeStyle = '#FFD700';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.arc(x, y + bounce, 25, 0, Math.PI * 2);
                ctx.stroke();
            }

            // 恢复状态，确保每匹马独立
            ctx.restore();
        });

        // 绘制完成后重置状态
        ctx.globalAlpha = 1.0;
    }

    drawCountdown(ctx, w, h) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(0, 0, w, h);

        ctx.fillStyle = '#FFD700';
        ctx.font = 'bold 80px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(this.countdownText, w / 2, h / 2);
    }

    drawParticles(ctx) {
        this.particles = this.particles.filter(p => p.life > 0);
        this.particles.forEach(p => {
            ctx.fillStyle = p.color;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fill();
            p.x += p.vx;
            p.y += p.vy;
            p.life--;
        });
    }

    createParticles(x, y, color) {
        for (let i = 0; i < 10; i++) {
            this.particles.push({
                x, y,
                vx: (Math.random() - 0.5) * 4,
                vy: (Math.random() - 0.5) * 4,
                life: 30,
                color,
                size: Math.random() * 4 + 2
            });
        }
    }

    createConfetti() {
        const colors = ['#FF6B9D', '#FFD700', '#87CEEB', '#90EE90', '#FF6347', '#DA70D6'];
        for (let i = 0; i < 50; i++) {
            this.particles.push({
                x: Math.random() * this.canvas.width,
                y: -10,
                vx: (Math.random() - 0.5) * 3,
                vy: Math.random() * 2 + 1,
                life: 120,
                color: colors[Math.floor(Math.random() * colors.length)],
                size: Math.random() * 4 + 2
            });
        }
    }

    // === 结果与重置 ===

    showResults() {
        const playerResult = this.raceResults.find(r => r.id === this.selectedHorse);
        const playerRank = playerResult ? playerResult.rank : this.raceResults.length;

        let title, encouragement;
        if (playerRank === 1) {
            title = '🏆 恭喜夺冠！';
            encouragement = '你太厉害了！继续挑战下一关吧！';
            this.totalScore += 50;
        } else if (playerRank === 2) {
            title = '🥈 第二名！';
            encouragement = '很棒！下次一定能拿第一！';
            this.totalScore += 30;
        } else {
            title = '🥉 第三名';
            encouragement = '加油！多练习会越来越好的！';
            this.totalScore += 20;
        }

        // 解锁下一关
        let unlockedNew = false;
        if (playerRank <= 2) {
            unlockedNew = this.unlockNextLevel();
        }

        // 保存关卡分数
        this.levelProgress.levelScores[this.currentLevel] = Math.max(
            this.levelProgress.levelScores[this.currentLevel] || 0, this.totalScore
        );
        this.saveLevelProgress();

        if (unlockedNew) {
            title += ' 🆕新关卡解锁！';
            this.playSound('levelup');
        }

        document.getElementById('resultTitle').textContent = title;
        document.getElementById('encouragement').textContent = encouragement;

        const resultsContainer = document.getElementById('raceResults');
        resultsContainer.innerHTML = '';
        this.raceResults.forEach(result => {
            const item = document.createElement('div');
            item.className = 'result-item' + (result.id === this.selectedHorse ? ' my-horse' : '');
            item.innerHTML = `
                <div class="result-rank">${result.rank}</div>
                <div class="result-horse">${result.emoji}</div>
                <div class="result-name">${result.name}${result.id === this.selectedHorse ? ' (你)' : ''}</div>
                <div class="result-time">${(result.finishTime / 1000).toFixed(1)}秒</div>
            `;
            resultsContainer.appendChild(item);
        });

        // 显示关卡和连击信息
        const levelInfoEl = document.getElementById('resultLevelInfo');
        if (levelInfoEl) {
            levelInfoEl.textContent = `关卡: ${this.levelConfigs[this.currentLevel].name} | 最高连击: ${this.maxCombo}`;
        }

        document.getElementById('gameScreen').classList.remove('active');
        document.getElementById('raceCompleteScreen').classList.add('active');

        if (window.auth.getUserId()) {
            saveGameProgress_();
        }
    }

    resetRace() {
        this.horses.forEach(horse => {
            horse.progress = 0;
            horse.speedLevel = 0;
        });
        this.raceResults = [];
        this.lastPuzzleAt = 0;
        this.questionsAnswered = 0;
        this.correctAnswers = 0;
        this.boostCount = 0;
        this.combo = 0;
        this.maxCombo = 0;
        this.particles = [];

        // 应用关卡配置
        const cfg = this.levelConfigs[this.currentLevel];
        this.puzzleInterval = cfg.puzzleInterval;
        this.raceLength = cfg.trackLength;

        document.getElementById('raceCompleteScreen').classList.remove('active');
        document.getElementById('gameScreen').classList.add('active');

        this.gameState = 'countdown';
        this.countdownAndStart();
    }

    backToSelect() {
        this.horses.forEach(horse => {
            horse.progress = 0;
            horse.speedLevel = 0;
        });
        this.raceResults = [];
        this.lastPuzzleAt = 0;
        this.questionsAnswered = 0;
        this.correctAnswers = 0;
        this.boostCount = 0;
        this.combo = 0;
        this.maxCombo = 0;
        this.particles = [];

        document.getElementById('raceCompleteScreen').classList.remove('active');
        document.getElementById('gameScreen').classList.remove('active');
        document.getElementById('startScreen').classList.add('active');

        this.gameState = 'start';
        this.renderLevelGrid();
    }

    showMessage(text, emoji) {
        const existingMsg = document.querySelector('.game-message');
        if (existingMsg) existingMsg.remove();

        const msg = document.createElement('div');
        msg.className = 'game-message';
        msg.innerHTML = `${emoji || '💡'} ${text}`;
        msg.style.cssText = `
            position: fixed;
            top: 80px;
            left: 50%;
            transform: translateX(-50%);
            background: rgba(255, 255, 255, 0.95);
            padding: 10px 20px;
            border-radius: 20px;
            box-shadow: 0 3px 15px rgba(0,0,0,0.2);
            z-index: 100;
            font-size: 16px;
            animation: fadeInOut 2s ease;
        `;

        document.body.appendChild(msg);
        setTimeout(() => msg.remove(), 2000);
    }

    gameLoop() {
        const now = Date.now();
        if (!this.lastTime) this.lastTime = now;
        const dt = Math.min((now - this.lastTime) / 16.67, 3);
        this.lastTime = now;

        this.update(dt);
        this.draw();

        requestAnimationFrame(() => this.gameLoop());
    }
}
