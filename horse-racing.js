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
        this.trackColors = ['#9B59B6', '#3498DB', '#E74C3C']; // 紫, 蓝, 红
        this.trackNames = ['紫悦', '蓝蓝', '小红'];
        this.trackEmojis = ['🦄', '🐎', '🏇'];

        // 马匹位置 (0-100%, 赛道位置)
        this.horses = [
            { id: 'purple', progress: 0, speed: 0.3, baseSpeed: 0.3, boost: 0, color: '#9B59B6', name: '紫悦', emoji: '🦄', y: 0 },
            { id: 'blue', progress: 0, speed: 0.3, baseSpeed: 0.3, boost: 0, color: '#3498DB', name: '蓝蓝', emoji: '🐎', y: 0 },
            { id: 'red', progress: 0, speed: 0.3, baseSpeed: 0.3, boost: 0, color: '#E74C3C', name: '小红', emoji: '🏇', y: 0 }
        ];

        // 比赛配置
        this.raceLength = 100; // 100%
        this.puzzleInterval = 15; // 每15%进度遇到题目
        this.lastPuzzleAt = 0;
        this.questionsAnswered = 0;
        this.correctAnswers = 0;
        this.boostCount = 0;
        this.totalScore = 0;

        // 当前题目
        this.currentPuzzle = null;

        // 动画
        this.animationFrame = 0;
        this.horseAnimFrame = [0, 0, 0];
        this.particles = [];

        // 比赛结果
        this.raceResults = [];
        this.raceStartTime = 0;
        this.raceFinishTime = 0;

        // 音频
        this.audioCtx = null;
        this.audioInitialized = false;

        // 汉字数据库（适合4岁儿童）
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

        this.init();
    }

    init() {
        this.setupCanvas();
        this.bindEvents();
        this.calculateTrackPositions();
        this.gameLoop();
    }

    setupCanvas() {
        // 适应屏幕
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
        if (!this.audioCtx) return;
        const ctx = this.audioCtx;
        const now = ctx.currentTime;

        const createOsc = (type, freq, start, duration, gainVal = 0.15) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = type;
            osc.frequency.setValueAtTime(freq, now + start);
            gain.gain.setValueAtTime(gainVal, now + start);
            gain.gain.exponentialRampToValueAtTime(0.001, now + start + duration);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(now + start);
            osc.stop(now + start + duration);
        };

        switch (type) {
            case 'gallop':
                createOsc('sine', 200, 0, 0.05, 0.03);
                createOsc('sine', 300, 0.05, 0.05, 0.03);
                break;
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
        }
    }

    bindEvents() {
        // 马匹选择
        document.querySelectorAll('.horse-option').forEach(opt => {
            opt.addEventListener('click', () => this.selectHorse(opt.dataset.horse));
            opt.addEventListener('touchend', (e) => {
                e.preventDefault();
                this.selectHorse(opt.dataset.horse);
            });
        });

        // 开始按钮
        document.getElementById('startBtn').addEventListener('click', () => this.startRace());

        // 题目相关
        document.getElementById('closePuzzleBtn').addEventListener('click', () => this.closePuzzle());
        document.getElementById('hintBtn').addEventListener('click', () => this.showHint());
        document.getElementById('playAudioBtn').addEventListener('click', () => this.playPuzzleAudio());

        // 再跑一次
        document.getElementById('raceAgainBtn').addEventListener('click', () => this.resetRace());
        document.getElementById('backToSelectBtn').addEventListener('click', () => this.backToSelect());

        // 答案选项委托
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

    generatePuzzle() {
        const types = ['math', 'letter', 'chinese'];
        const type = types[Math.floor(Math.random() * types.length)];

        let puzzle;
        if (type === 'math') {
            puzzle = this.generateMathPuzzle();
        } else if (type === 'letter') {
            puzzle = this.generateLetterPuzzle();
        } else {
            puzzle = this.generateChinesePuzzle();
        }

        return puzzle;
    }

    generateMathPuzzle() {
        const isAdd = Math.random() > 0.4;
        let a, b, answer, question, audioText;

        if (isAdd) {
            a = Math.floor(Math.random() * 9) + 1;
            b = Math.floor(Math.random() * (10 - a)) + 1;
            question = `${a} + ${b} = ?`;
            answer = String(a + b);
            audioText = `${a}加${b}等于多少？`;
        } else {
            a = Math.floor(Math.random() * 9) + 2;
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

        return {
            type: 'math',
            question,
            answer,
            options,
            audioText
        };
    }

    generateLetterPuzzle() {
        const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        const letterIndex = Math.floor(Math.random() * 10) + 1;
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
        options.sort(() => Math.random() - 0.5);

        return {
            type: 'letter',
            question,
            answer,
            options,
            audioText
        };
    }

    generateChinesePuzzle() {
        const charData = this.chineseCharacters[Math.floor(Math.random() * this.chineseCharacters.length)];
        const otherChars = this.chineseCharacters
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
        if (!this.currentPuzzle) return;

        const isCorrect = answer === this.currentPuzzle.answer;
        const buttons = document.querySelectorAll('.answer-option');

        buttons.forEach(btn => {
            if (btn.dataset.answer === this.currentPuzzle.answer) {
                btn.classList.add('correct');
            } else if (btn.dataset.answer === answer) {
                btn.classList.add('wrong');
            }
            btn.disabled = true;
        });

        this.questionsAnswered++;

        if (isCorrect) {
            this.correctAnswers++;
            this.boostCount++;
            this.totalScore += 10;
            this.playSound('correct');

            // 给玩家的马加速
            const playerHorse = this.horses.find(h => h.id === this.selectedHorse);
            if (playerHorse) {
                playerHorse.boost += 3;
                this.playSound('boost');
            }

            this.showMessage('太棒了！加速！⚡', '🎉');
            this.updateStats();
        } else {
            this.playSound('wrong');
            this.showMessage('再想想看~', '💭');
        }

        setTimeout(() => {
            this.closePuzzle();
        }, 1500);
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
        document.getElementById('questionsAnswered').textContent = this.questionsAnswered;
        document.getElementById('boostCount').textContent = this.boostCount;
        document.getElementById('correctCount').textContent = this.correctAnswers;
        document.getElementById('score').textContent = this.totalScore;
    }

    update(dt) {
        if (this.gameState !== 'racing') return;

        this.animationFrame++;

        // 更新马匹位置
        this.horses.forEach((horse, i) => {
            if (horse.progress >= this.raceLength) return;

            // 基础速度 + 随机变化
            let speed = horse.speed + (Math.random() - 0.5) * 0.1;

            // 加速效果
            if (horse.boost > 0) {
                speed += 0.5;
                horse.boost -= 0.02;
                if (horse.boost < 0) horse.boost = 0;
            }

            // 玩家的马稍微慢一点增加悬念
            if (horse.id === this.selectedHorse) {
                speed *= 0.95;
            } else {
                // AI马随机加速
                if (Math.random() < 0.01) speed += Math.random() * 0.3;
            }

            horse.progress += speed * dt;
            if (horse.progress > this.raceLength) horse.progress = this.raceLength;

            // 动画帧
            this.horseAnimFrame[i] = (this.horseAnimFrame[i] + 0.1) % 4;

            // 马蹄声
            if (this.animationFrame % 30 === 0 && horse.progress < this.raceLength) {
                this.playSound('gallop');
            }
        });

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
        document.getElementById('raceProgress').textContent = Math.floor(playerProgress) + '%';
    }

    draw() {
        const ctx = this.ctx;
        const w = this.canvas.width;
        const h = this.canvas.height;

        // 清空画布
        ctx.clearRect(0, 0, w, h);

        // 绘制背景
        this.drawBackground(ctx, w, h);

        // 绘制赛道
        this.drawTracks(ctx, w, h);

        // 绘制马匹
        this.drawHorses(ctx, w, h);

        // 绘制倒计时
        if (this.countdownText && Date.now() - this.countdownTime < 800) {
            this.drawCountdown(ctx, w, h);
        }

        // 绘制粒子
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

        // 云朵
        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        this.drawCloud(ctx, 100, 50, 30);
        this.drawCloud(ctx, 300, 80, 25);
        this.drawCloud(ctx, 600, 40, 35);
    }

    drawCloud(ctx, x, y, size) {
        ctx.beginPath();
        ctx.arc(x, y, size, 0, Math.PI * 2);
        ctx.arc(x + size * 0.8, y - size * 0.3, size * 0.7, 0, Math.PI * 2);
        ctx.arc(x + size * 1.5, y, size * 0.8, 0, Math.PI * 2);
        ctx.fill();
    }

    drawTracks(ctx, w, h) {
        const trackHeight = h / this.trackCount;
        const trackLeft = 50;
        const trackRight = w - 50;
        const trackWidth = trackRight - trackLeft;

        this.horses.forEach((horse, i) => {
            const y = trackHeight * i;

            // 赛道背景
            ctx.fillStyle = this.trackColors[i] + '33';
            ctx.fillRect(0, y, w, trackHeight);

            // 赛道分隔线
            ctx.strokeStyle = this.trackColors[i] + '66';
            ctx.lineWidth = 2;
            ctx.setLineDash([10, 10]);
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(w, y);
            ctx.stroke();
            ctx.setLineDash([]);

            // 赛道线
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

            // 赛道标签
            ctx.fillStyle = this.trackColors[i];
            ctx.font = 'bold 16px Arial';
            ctx.fillText(horse.name, 10, y + trackHeight / 2 + 5);
        });
    }

    drawHorses(ctx, w, h) {
        const trackLeft = 50;
        const trackRight = w - 50;
        const trackWidth = trackRight - trackLeft;

        this.horses.forEach((horse, i) => {
            const x = trackLeft + (horse.progress / this.raceLength) * trackWidth;
            const y = horse.y;

            // 加速特效
            if (horse.boost > 0) {
                ctx.fillStyle = `rgba(255, 215, 0, ${horse.boost / 10})`;
                ctx.beginPath();
                ctx.arc(x, y, 30, 0, Math.PI * 2);
                ctx.fill();
            }

            // 绘制可爱的小马（用emoji + 简单图形）
            ctx.font = '40px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';

            // 轻微上下跳动
            const bounce = Math.sin(this.horseAnimFrame[i]) * 3;

            ctx.fillText(horse.emoji, x, y + bounce);

            // 如果是玩家的马，添加光环
            if (horse.id === this.selectedHorse) {
                ctx.strokeStyle = '#FFD700';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.arc(x, y + bounce, 25, 0, Math.PI * 2);
                ctx.stroke();
            }
        });
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

    showResults() {
        const playerResult = this.raceResults.find(r => r.id === this.selectedHorse);
        const playerRank = playerResult ? playerResult.rank : this.raceResults.length;

        let title, encouragement;
        if (playerRank === 1) {
            title = '🏆 恭喜夺冠！';
            encouragement = '你太厉害了！紫悦为你骄傲！';
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

        document.getElementById('resultTitle').textContent = title;
        document.getElementById('encouragement').textContent = encouragement;

        // 显示排名
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

        document.getElementById('gameScreen').classList.remove('active');
        document.getElementById('raceCompleteScreen').classList.add('active');

        // 保存进度
        if (window.auth.getUserId()) {
            saveGameProgress_();
        }
    }

    resetRace() {
        this.horses.forEach(horse => {
            horse.progress = 0;
            horse.boost = 0;
        });
        this.raceResults = [];
        this.lastPuzzleAt = 0;
        this.questionsAnswered = 0;
        this.correctAnswers = 0;
        this.boostCount = 0;
        this.particles = [];

        document.getElementById('raceCompleteScreen').classList.remove('active');
        document.getElementById('gameScreen').classList.add('active');

        this.gameState = 'countdown';
        this.countdownAndStart();
    }

    backToSelect() {
        this.horses.forEach(horse => {
            horse.progress = 0;
            horse.boost = 0;
        });
        this.raceResults = [];
        this.lastPuzzleAt = 0;
        this.questionsAnswered = 0;
        this.correctAnswers = 0;
        this.boostCount = 0;
        this.particles = [];

        document.getElementById('raceCompleteScreen').classList.remove('active');
        document.getElementById('gameScreen').classList.remove('active');
        document.getElementById('startScreen').classList.add('active');

        this.gameState = 'start';
    }

    showMessage(text, emoji) {
        // 简单消息提示
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
        const dt = Math.min((now - this.lastTime) / 16.67, 3); // 归一化到60fps
        this.lastTime = now;

        this.update(dt);
        this.draw();

        requestAnimationFrame(() => this.gameLoop());
    }
}
