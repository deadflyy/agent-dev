class SlackingGame {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');

        this.canvas.width = 900;
        this.canvas.height = 600;

        this.gameState = 'menu';
        this.role = null;
        this.teacherScore = 0;
        this.studentScore = 0;
        this.round = 1;
        this.maxRounds = 10;

        this.currentPhase = 'select';
        this.playerChoice = null;
        this.aiChoice = null;
        this.roundResult = null;

        this.mouseX = 0;
        this.mouseY = 0;

        this.teacherMoves = this.generateTeacherMoves();
        this.studentMoves = this.generateStudentMoves();

        this.currentOptions = [];
        this.animationTexts = [];
        this.particles = [];

        this.teacherAnim = { frame: 0, state: 'idle', expression: 'normal' };
        this.studentAnim = { frame: 0, state: 'idle', expression: 'normal' };

        this.resultTimer = 0;
        this.nextRoundBtn = { x: 0, y: 0, width: 160, height: 50, visible: false };

        this.teacherImg = new Image();
        this.teacherImg.src = '老师.jpg';
        this.teacherImgLoaded = false;
        this.teacherImg.onload = () => { this.teacherImgLoaded = true; };

        // Round history
        this.history = [];

        // AI learning: track player move frequency
        this.playerMoveHistory = [];

        // Card animation state
        this.cardAnims = [0, 0, 0];
        this.selectedCard = -1;
        this.revealAnim = 0;

        // Blackboard texts
        this.blackboardTexts = [
            '今日课程：高级划水学概论',
            '今日课程：摸鱼工程导论',
            '今日课程：反侦察战术基础',
            '今日课程：课堂生存心理学',
            '今日课程：带薪休假的艺术',
            '今日课程：论如何优雅地走神',
            '今日课程：表情管理与伪装术',
            '今日课程：桌面隐藏学原理'
        ];
        this.currentBlackboard = this.blackboardTexts[0];

        // Difficulty
        this.difficulty = 'normal'; // easy, normal, hard

        // Audio
        this.audioCtx = null;

        // Screen shake
        this.shakeTimer = 0;
        this.shakeIntensity = 0;

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
            case 'select':
                osc.type = 'sine';
                osc.frequency.setValueAtTime(500, now);
                osc.frequency.exponentialRampToValueAtTime(700, now + 0.1);
                gain.gain.setValueAtTime(0.1, now);
                gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
                osc.start(now);
                osc.stop(now + 0.15);
                break;
            case 'reveal':
                osc.type = 'triangle';
                osc.frequency.setValueAtTime(400, now);
                osc.frequency.setValueAtTime(600, now + 0.1);
                osc.frequency.setValueAtTime(500, now + 0.2);
                gain.gain.setValueAtTime(0.12, now);
                gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
                osc.start(now);
                osc.stop(now + 0.3);
                break;
            case 'win':
                osc.type = 'square';
                [523, 659, 784, 1047].forEach((freq, i) => {
                    osc.frequency.setValueAtTime(freq, now + i * 0.1);
                });
                gain.gain.setValueAtTime(0.1, now);
                gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
                osc.start(now);
                osc.stop(now + 0.5);
                break;
            case 'lose':
                osc.type = 'sawtooth';
                osc.frequency.setValueAtTime(300, now);
                osc.frequency.exponentialRampToValueAtTime(100, now + 0.4);
                gain.gain.setValueAtTime(0.1, now);
                gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
                osc.start(now);
                osc.stop(now + 0.4);
                break;
            case 'counter':
                osc.type = 'square';
                osc.frequency.setValueAtTime(800, now);
                osc.frequency.exponentialRampToValueAtTime(200, now + 0.15);
                gain.gain.setValueAtTime(0.15, now);
                gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
                osc.start(now);
                osc.stop(now + 0.15);
                break;
        }
    }

    generateTeacherMoves() {
        return [
            // 任务转移型：让学生自主忙起来，老师"巡视监督"
            { id: 1, name: '小组讨论', surface: '分组讨论课题，巡视指导', desc: '学生讨论得热火朝天，我在讲台刷购物车', teacherSlack: 18, studentPressure: 14, color: '#1abc9c', emoji: '🗣️', rarity: 'common' },
            { id: 2, name: '学生互评', surface: '互相批改作业，培养合作', desc: '学生忙着互改，我假装翻教案实则看小说', teacherSlack: 20, studentPressure: 10, color: '#2ecc71', emoji: '📝', rarity: 'common' },
            { id: 3, name: '分组竞赛', surface: '各组抢答比赛，激发学习', desc: '学生抢得头破血流，我在旁边当裁判玩消消乐', teacherSlack: 16, studentPressure: 15, color: '#1abc9c', emoji: '🏆', rarity: 'common' },
            { id: 4, name: '学生讲课', surface: '小明上台讲题，锻炼表达', desc: '学生讲得满头大汗，我在后排闭目养神', teacherSlack: 26, studentPressure: 8, color: '#9b59b6', emoji: '🎤', rarity: 'legendary' },
            { id: 5, name: '课堂展示', surface: '各组上台展示PPT', desc: '学生忙着演示，我端着茶杯假装点评', teacherSlack: 22, studentPressure: 10, color: '#e67e22', emoji: '📊', rarity: 'rare' },
            { id: 6, name: '角色扮演', surface: '分组表演课文情景剧', desc: '学生演得卖力，我在台下拍照发朋友圈', teacherSlack: 21, studentPressure: 9, color: '#9b59b6', emoji: '🎭', rarity: 'common' },
            { id: 7, name: '课堂辩论', surface: '正反方展开激烈辩论', desc: '学生辩得面红耳赤，我假装记分其实在追剧', teacherSlack: 19, studentPressure: 12, color: '#e67e22', emoji: '⚖️', rarity: 'common' },
            { id: 8, name: '同伴教学', surface: '优生帮差生一对一辅导', desc: '学生互教互学，我坐在讲台后面打盹', teacherSlack: 24, studentPressure: 6, color: '#2ecc71', emoji: '🤝', rarity: 'rare' },
            { id: 9, name: '自主探究', surface: '分组查阅资料完成报告', desc: '学生翻书翻得飞起，我用教案挡着手机追番', teacherSlack: 23, studentPressure: 7, color: '#3498db', emoji: '🔍', rarity: 'rare' },
            { id: 10, name: '课堂接龙', surface: '单词/成语接龙游戏', desc: '学生接得不亦乐乎，我在旁边计时玩俄罗斯方块', teacherSlack: 15, studentPressure: 13, color: '#f39c12', emoji: '🔗', rarity: 'common' },
            // 形式教学型：走正规流程，趁学生忙时摸鱼
            { id: 11, name: '课堂默写', surface: '默写单词/古诗，严格监考', desc: '宣布默写后坐回讲台，批改"上次作业"（刷朋友圈）', teacherSlack: 14, studentPressure: 16, color: '#e74c3c', emoji: '✍️', rarity: 'common' },
            { id: 12, name: '随堂测验', surface: '5分钟小测检验学习成果', desc: '发完卷子就坐下来，开始研究今晚吃什么', teacherSlack: 16, studentPressure: 15, color: '#e74c3c', emoji: '📋', rarity: 'common' },
            { id: 13, name: '点名提问', surface: '随机点名回答问题', desc: '点了三个人回答，趁他们思考时刷了两条短视频', teacherSlack: 13, studentPressure: 17, color: '#3498db', emoji: '👆', rarity: 'common' },
            { id: 14, name: '课堂听写', surface: '听写20个重点词汇', desc: '念完单词让学生自己对答案，我开始研究股票', teacherSlack: 15, studentPressure: 14, color: '#2ecc71', emoji: '👂', rarity: 'common' },
            { id: 15, name: '背诵检查', surface: '逐个检查课文背诵', desc: '叫学生排队背诵，趁等待时间把购物车清了', teacherSlack: 12, studentPressure: 18, color: '#f39c12', emoji: '📖', rarity: 'common' },
            { id: 16, name: '课堂练习', surface: '做练习册第15-20页', desc: '布置完练习就低头，批改"昨天的作业"（看小说）', teacherSlack: 20, studentPressure: 8, color: '#e67e22', emoji: '📚', rarity: 'common' },
            { id: 17, name: '当堂作业', surface: '限时完成当堂作业', desc: '设置好倒计时，趁学生奋笔疾书时补个妆', teacherSlack: 18, studentPressure: 11, color: '#9b59b6', emoji: '⏰', rarity: 'common' },
            { id: 18, name: '填空练习', surface: '做课后填空题巩固知识', desc: '学生埋头做题，我对着窗户发呆思考人生', teacherSlack: 17, studentPressure: 10, color: '#1abc9c', emoji: '📄', rarity: 'common' },
            { id: 19, name: '抄写笔记', surface: '把板书完整抄到笔记本', desc: '学生抄得手酸，我趁机把快递查了、外卖点了', teacherSlack: 22, studentPressure: 6, color: '#3498db', emoji: '📓', rarity: 'common' },
            { id: 20, name: '公式默写', surface: '默写本章所有公式', desc: '学生绞尽脑汁回忆公式，我在讲桌下面偷偷斗地主', teacherSlack: 14, studentPressure: 15, color: '#e74c3c', emoji: '🔢', rarity: 'common' },
            // 多媒体型：放视频/PPT，老师"监督"实则休息
            { id: 21, name: '放纪录片', surface: '播放教学纪录片45分钟', desc: '按下播放键，往后一靠开始享受人生', teacherSlack: 25, studentPressure: 4, color: '#e67e22', emoji: '🎬', rarity: 'rare' },
            { id: 22, name: 'PPT讲座', surface: '播放精心制作的PPT', desc: '按着空格键翻页，其实每页都是网上下的模板', teacherSlack: 17, studentPressure: 10, color: '#9b59b6', emoji: '💻', rarity: 'common' },
            { id: 23, name: '听力训练', surface: '播放英语听力材料', desc: '戴上耳机假装在监听质量，其实在听歌', teacherSlack: 19, studentPressure: 9, color: '#1abc9c', emoji: '🎧', rarity: 'common' },
            { id: 24, name: '视频教学', surface: '播放名师讲解视频', desc: '名师替我讲课，我在后排喝咖啡看新闻', teacherSlack: 23, studentPressure: 5, color: '#3498db', emoji: '📺', rarity: 'rare' },
            { id: 25, name: '录音跟读', surface: '播放录音让学生跟读', desc: '录音机代替我领读，我在黑板旁边站着发呆', teacherSlack: 16, studentPressure: 11, color: '#2ecc71', emoji: '🔊', rarity: 'common' },
            { id: 26, name: '幻灯复习', surface: '用PPT复习上节课内容', desc: '翻着去年的旧PPT，学生看得认真，我闲得发慌', teacherSlack: 18, studentPressure: 8, color: '#f39c12', emoji: '📽️', rarity: 'common' },
            { id: 27, name: '图片赏析', surface: '展示图片引导分析讨论', desc: '投屏几张图让学生讨论，我趁机去走廊透气', teacherSlack: 20, studentPressure: 7, color: '#e67e22', emoji: '🖼️', rarity: 'common' },
            { id: 28, name: '网课资源', surface: '播放优质网课片段', desc: '打开网课视频，学生学习，我学习如何摸鱼', teacherSlack: 24, studentPressure: 4, color: '#9b59b6', emoji: '🌐', rarity: 'rare' },
            // 看起来很忙型：老师表面忙碌实则划水
            { id: 29, name: '批改作业', surface: '当堂批改上次作业', desc: '拿着红笔画圈圈，其实每本都只看名字打个勾', teacherSlack: 21, studentPressure: 7, color: '#e74c3c', emoji: '✏️', rarity: 'common' },
            { id: 30, name: '整理教案', surface: '整理下节课的教案资料', desc: '翻着文件夹表情严肃，其实是在整理购物清单', teacherSlack: 19, studentPressure: 5, color: '#34495e', emoji: '📁', rarity: 'common' },
            { id: 31, name: '巡视课堂', surface: '在教室走道来回巡视', desc: '踱着步子看似关注，其实是在刷计步器排名', teacherSlack: 15, studentPressure: 12, color: '#1abc9c', emoji: '🚶', rarity: 'common' },
            { id: 32, name: '答疑解惑', surface: '走到学生身边一对一答疑', desc: '蹲在学生旁边讲了两句，剩下的时间在看窗外', teacherSlack: 13, studentPressure: 14, color: '#2ecc71', emoji: '💡', rarity: 'common' },
            { id: 33, name: '板书设计', surface: '在黑板上画思维导图', desc: '画了半天框架图，学生以为是高深知识，其实是涂鸦', teacherSlack: 16, studentPressure: 9, color: '#f39c12', emoji: '🎨', rarity: 'common' },
            { id: 34, name: '教具准备', surface: '准备实验器材和教具', desc: '翻箱倒柜找教具，其实是在找藏起来的零食', teacherSlack: 14, studentPressure: 8, color: '#e67e22', emoji: '🧪', rarity: 'common' },
            { id: 35, name: '课间答疑', surface: '下课后留在教室答疑', desc: '坐在讲台前等学生来问，其实趁机补觉', teacherSlack: 11, studentPressure: 6, color: '#3498db', emoji: '❓', rarity: 'common' },
            { id: 36, name: '写板书', surface: '工工整整写满一黑板', desc: '抄了一黑板笔记，字迹工整内容空洞，纯粹练字', teacherSlack: 18, studentPressure: 10, color: '#9b59b6', emoji: '🖊️', rarity: 'common' },
            // 布置任务型：给学生布置大量任务，自己轻松
            { id: 37, name: '布置作业', surface: '布置课后练习巩固', desc: '把整章习题划为作业，学生做到天荒地老，我准时下班', teacherSlack: 20, studentPressure: 13, color: '#e74c3c', emoji: '📕', rarity: 'common' },
            { id: 38, name: '预习任务', surface: '布置下节课预习内容', desc: '让学生提前预习三章，下节课我继续划水', teacherSlack: 22, studentPressure: 6, color: '#2ecc71', emoji: '📗', rarity: 'common' },
            { id: 39, name: '抄写任务', surface: '每个知识点抄三遍', desc: '抄写量管够，学生抄到手软，我趁机喝茶', teacherSlack: 17, studentPressure: 14, color: '#f39c12', emoji: '🍵', rarity: 'common' },
            { id: 40, name: '复习计划', surface: '制定详细复习计划表', desc: '列了一张超长复习清单，学生看到就头大，我轻松了', teacherSlack: 19, studentPressure: 11, color: '#1abc9c', emoji: '📅', rarity: 'common' },
            { id: 41, name: '试卷练习', surface: '发一套模拟试卷练习', desc: '发完试卷就坐下，学生做到下课，我玩到下课', teacherSlack: 23, studentPressure: 9, color: '#e67e22', emoji: '📃', rarity: 'rare' },
            { id: 42, name: '课外阅读', surface: '推荐课外阅读并写读后感', desc: '推荐了500页的书，读后感下周交，这周我自由了', teacherSlack: 21, studentPressure: 7, color: '#9b59b6', emoji: '📚', rarity: 'common' },
            // 高级伪装型：看起来超级正经，实际在摸鱼
            { id: 43, name: '课堂记录', surface: '认真记录每位学生表现', desc: '拿着本子写写画画，其实是在列周末出游计划', teacherSlack: 16, studentPressure: 10, color: '#3498db', emoji: '📒', rarity: 'common' },
            { id: 44, name: '教学反思', surface: '在教案上写教学反思', desc: '表情凝重地写反思，其实是在写段子准备发微博', teacherSlack: 18, studentPressure: 5, color: '#2ecc71', emoji: '🤔', rarity: 'common' },
            { id: 45, name: '家长沟通', surface: '回复家长消息了解情况', desc: '对着手机打字表情认真，其实在群里抢红包', teacherSlack: 15, studentPressure: 8, color: '#e74c3c', emoji: '📱', rarity: 'common' },
            { id: 46, name: '成绩分析', surface: '分析上次考试成绩', desc: '对着成绩单皱眉，其实是在研究双色球走势图', teacherSlack: 17, studentPressure: 9, color: '#f39c12', emoji: '📈', rarity: 'common' },
            { id: 47, name: '教研讨论', surface: '和其他老师微信讨论教学', desc: '在教师群里聊得火热，其实是在聊昨晚的综艺', teacherSlack: 14, studentPressure: 6, color: '#1abc9c', emoji: '💬', rarity: 'common' },
            { id: 48, name: '作业批改', surface: '认真逐一批改作业', desc: '红笔飞舞看似勤快，其实全打了"阅"字', teacherSlack: 20, studentPressure: 8, color: '#9b59b6', emoji: '📝', rarity: 'common' },
            { id: 49, name: '课堂总结', surface: '做本节课详细总结', desc: '总结了三分钟就完了，剩下时间让学生"自由复习"', teacherSlack: 19, studentPressure: 10, color: '#e67e22', emoji: '📌', rarity: 'common' },
            { id: 50, name: '大师级划水', surface: '全程激情授课45分钟', desc: '声情并茂讲了5分钟，剩下40分钟全在做练习"巩固"', teacherSlack: 28, studentPressure: 12, color: '#FFD700', emoji: '👑', rarity: 'legendary' }
        ];
    }

    generateStudentMoves() {
        return [
            // 笔记伪装型：看起来在认真学习，实际在做别的
            { id: 1, name: '认真记笔记', surface: '奋笔疾书记板书', desc: '其实抄了三页歌词，本子上一个知识点没有', studentSlack: 20, counterPressure: 3, color: '#e74c3c', emoji: '📝', rarity: 'common' },
            { id: 2, name: '课本标注', surface: '用荧光笔画重点', desc: '荧光笔画了一堆，全是装饰花纹和小涂鸦', studentSlack: 18, counterPressure: 2, color: '#f39c12', emoji: '🖍️', rarity: 'common' },
            { id: 3, name: '错题整理', surface: '认真整理错题本', desc: '抄了三道题就开始画漫画小人了', studentSlack: 19, counterPressure: 3, color: '#2ecc71', emoji: '📓', rarity: 'common' },
            { id: 4, name: '做练习题', surface: '埋头做课后练习', desc: '写了两题就开始在草稿纸上画迷宫', studentSlack: 17, counterPressure: 4, color: '#3498db', emoji: '✏️', rarity: 'common' },
            { id: 5, name: '查阅资料', surface: '翻课本查找相关内容', desc: '课本翻得哗哗响，其实在看夹在里面的漫画', studentSlack: 21, counterPressure: 2, color: '#9b59b6', emoji: '📖', rarity: 'common' },
            { id: 6, name: '工整抄写', surface: '一笔一划抄写板书', desc: '字写得特别工整，速度极慢，一节课抄了三行', studentSlack: 16, counterPressure: 5, color: '#e67e22', emoji: '✍️', rarity: 'common' },
            { id: 7, name: '画思维导图', surface: '画知识框架思维导图', desc: '画了一棵漂亮的树，上面挂的全是零食名称', studentSlack: 20, counterPressure: 2, color: '#1abc9c', emoji: '🌳', rarity: 'common' },
            { id: 8, name: '演算过程', surface: '在草稿纸上演算', desc: '演算了半天，算的是今晚游戏几点上线', studentSlack: 18, counterPressure: 3, color: '#e74c3c', emoji: '🔢', rarity: 'common' },
            // 互动伪装型：看起来在积极参与，实际在敷衍
            { id: 9, name: '认真听讲', surface: '目不转睛盯着黑板', desc: '眼神放空，脑子里在循环播放昨晚的洗脑神曲', studentSlack: 23, counterPressure: 1, color: '#3498db', emoji: '👀', rarity: 'rare' },
            { id: 10, name: '点头回应', surface: '老师讲课频频点头', desc: '点了十分钟的头，一个字也没听进去', studentSlack: 22, counterPressure: 1, color: '#2ecc71', emoji: '😊', rarity: 'common' },
            { id: 11, name: '举手回答', surface: '积极举手回答问题', desc: '站起来说了句"我觉得这道题很有趣"就坐下了', studentSlack: 8, counterPressure: 15, color: '#f39c12', emoji: '✋', rarity: 'rare' },
            { id: 12, name: '小组讨论', surface: '热烈参与小组讨论', desc: '讨论了三分钟学习，剩下七分钟在聊八卦', studentSlack: 15, counterPressure: 8, color: '#9b59b6', emoji: '🗣️', rarity: 'common' },
            { id: 13, name: '翻书查找', surface: '翻书查找老师提问的答案', desc: '翻了三遍目录，其实根本不知道在找什么', studentSlack: 14, counterPressure: 6, color: '#e67e22', emoji: '📚', rarity: 'common' },
            { id: 14, name: '做思考状', surface: '皱眉托腮认真思考', desc: '表情很到位，其实在想中午吃什么', studentSlack: 24, counterPressure: 1, color: '#1abc9c', emoji: '🤔', rarity: 'rare' },
            { id: 15, name: '抄同学答案', surface: '低头认真写作业', desc: '眼神往旁边瞟，抄了个寂寞——同学写的也是错的', studentSlack: 16, counterPressure: 7, color: '#e74c3c', emoji: '👀', rarity: 'common' },
            { id: 16, name: '假装查字典', surface: '翻字典查生词', desc: '字典翻了半天，其实在看成语接龙那一页', studentSlack: 19, counterPressure: 3, color: '#3498db', emoji: '📕', rarity: 'common' },
            // 工具伪装型：用课本/文具做掩护
            { id: 17, name: '课本夹小说', surface: '认真阅读课本', desc: '课本里夹着网络小说，翻一页课本看十页小说', studentSlack: 21, counterPressure: 4, color: '#9b59b6', emoji: '📖', rarity: 'common' },
            { id: 18, name: '桌肚玩手机', surface: '低头认真做题', desc: '手伸进桌肚刷短视频，头低着不是因为勤奋', studentSlack: 20, counterPressure: 6, color: '#e74c3c', emoji: '📱', rarity: 'common' },
            { id: 19, name: '文具拆装', surface: '研究文具构造原理', desc: '圆珠笔拆了装装了拆，美其名曰"物理探究"', studentSlack: 17, counterPressure: 3, color: '#2ecc71', emoji: '🔧', rarity: 'common' },
            { id: 20, name: '橡皮雕刻', surface: '用橡皮练习精细操作', desc: '橡皮上刻了一幅清明上河图，技术是练出来了', studentSlack: 19, counterPressure: 2, color: '#f39c12', emoji: '🎨', rarity: 'common' },
            { id: 21, name: '转笔练习', surface: '手指灵活度训练', desc: '转笔转了二十分钟，掉地上捡了十五次', studentSlack: 16, counterPressure: 2, color: '#e67e22', emoji: '🖊️', rarity: 'common' },
            { id: 22, name: '尺子测量', surface: '用尺子测量课本数据', desc: '量完了课本量桌子，量完了桌子量同桌的头', studentSlack: 15, counterPressure: 3, color: '#1abc9c', emoji: '📏', rarity: 'common' },
            { id: 23, name: '胶带艺术', surface: '用胶带修复破损课本', desc: '课本没修好，手指倒是被缠成了木乃伊', studentSlack: 18, counterPressure: 2, color: '#3498db', emoji: '🩹', rarity: 'common' },
            { id: 24, name: '纸飞机工程', surface: '折纸练习几何思维', desc: '折了十二架纸飞机，一架比一架飞得远', studentSlack: 17, counterPressure: 4, color: '#9b59b6', emoji: '✈️', rarity: 'common' },
            // 姿态伪装型：保持标准姿势，灵魂已经出窍
            { id: 25, name: '标准坐姿', surface: '端坐如钟目视前方', desc: '身体坐得笔直，灵魂已经在马尔代夫度假了', studentSlack: 25, counterPressure: 1, color: '#FFD700', emoji: '🧘', rarity: 'legendary' },
            { id: 26, name: '托腮听课', surface: '托腮专注听讲', desc: '手托着腮帮子，其实在偷偷打瞌睡', studentSlack: 22, counterPressure: 1, color: '#2ecc71', emoji: '😴', rarity: 'rare' },
            { id: 27, name: '低头看书', surface: '低头认真阅读课文', desc: '头低着五分钟没动，口水都快流到书上了', studentSlack: 23, counterPressure: 2, color: '#3498db', emoji: '💤', rarity: 'rare' },
            { id: 28, name: '看黑板发呆', surface: '目视黑板认真听课', desc: '盯着黑板看了十分钟，问在讲什么一问三不知', studentSlack: 24, counterPressure: 1, color: '#e67e22', emoji: '😑', rarity: 'rare' },
            { id: 29, name: '奋笔疾书', surface: '快速书写答案', desc: '写得飞快，其实是在练签名设计', studentSlack: 19, counterPressure: 3, color: '#e74c3c', emoji: '✍️', rarity: 'common' },
            { id: 30, name: '翻页看书', surface: '有节奏地翻阅课本', desc: '翻页速度比看书速度快十倍，纯粹翻着玩', studentSlack: 18, counterPressure: 2, color: '#1abc9c', emoji: '📄', rarity: 'common' },
            // 高效摸鱼型：短时间内完成"任务"然后摸鱼
            { id: 31, name: '速战速决', surface: '快速完成课堂练习', desc: '五分钟写完（全蒙的），剩下四十分钟自由活动', studentSlack: 16, counterPressure: 8, color: '#f39c12', emoji: '⚡', rarity: 'common' },
            { id: 32, name: '抄完就躺', surface: '抄完笔记开始复习', desc: '抄完最后一行就把本子立起来挡着开始玩', studentSlack: 20, counterPressure: 3, color: '#9b59b6', emoji: '📝', rarity: 'common' },
            { id: 33, name: '提前交卷', surface: '自信地提前交作业', desc: '写了个名字就交了，答案全靠缘分', studentSlack: 14, counterPressure: 10, color: '#e74c3c', emoji: '🏃', rarity: 'common' },
            { id: 34, name: '选择题全C', surface: '认真涂答题卡', desc: '全部选C，三秒搞定，开始发呆', studentSlack: 15, counterPressure: 7, color: '#2ecc71', emoji: '🎰', rarity: 'common' },
            { id: 35, name: '借同学抄', surface: '和同学讨论答案', desc: '讨论了两分钟，抄了二十分钟', studentSlack: 17, counterPressure: 5, color: '#3498db', emoji: '🤝', rarity: 'common' },
            { id: 36, name: '先写名字', surface: '认真填写试卷信息', desc: '名字写了五分钟（在设计艺术签名），然后就不想写了', studentSlack: 13, counterPressure: 4, color: '#e67e22', emoji: '✒️', rarity: 'common' },
            // 社交伪装型：借社交之名行摸鱼之实
            { id: 37, name: '传纸条问问题', surface: '传纸条向同学请教', desc: '纸条上写的不是问题，是"中午去哪吃"', studentSlack: 17, counterPressure: 5, color: '#9b59b6', emoji: '💌', rarity: 'common' },
            { id: 38, name: '借文具', surface: '向同学借橡皮/尺子', desc: '借个橡皮聊了五分钟，橡皮还没拿到手', studentSlack: 14, counterPressure: 4, color: '#1abc9c', emoji: '✏️', rarity: 'common' },
            { id: 39, name: '帮同学讲题', surface: '耐心给同学讲解', desc: '讲着讲着就变成了聊天，题还没讲完人先笑趴了', studentSlack: 12, counterPressure: 10, color: '#2ecc71', emoji: '💡', rarity: 'common' },
            { id: 40, name: '组内分工', surface: '和组员讨论分工方案', desc: '分了十分钟的工，结果谁也没干活', studentSlack: 16, counterPressure: 6, color: '#f39c12', emoji: '📋', rarity: 'common' },
            { id: 41, name: '借书查资料', surface: '去图书角查阅参考书', desc: '走到图书角翻了两本漫画，又走回来了', studentSlack: 18, counterPressure: 3, color: '#e67e22', emoji: '📚', rarity: 'common' },
            { id: 42, name: '请教老师', surface: '举手向老师请教问题', desc: '走到讲台问了个百度能搜到的问题，消耗了五分钟', studentSlack: 10, counterPressure: 12, color: '#3498db', emoji: '🙋', rarity: 'common' },
            // 感官伪装型：利用五感做掩护
            { id: 43, name: '耳机听课', surface: '戴耳机听英语听力', desc: '耳机里放的是周杰伦，英语听力听了寂寞', studentSlack: 22, counterPressure: 4, color: '#e74c3c', emoji: '🎧', rarity: 'rare' },
            { id: 44, name: '吃提神糖', surface: '吃薄荷糖提神醒脑', desc: '薄荷糖含了五颗，提神效果没感觉到，倒是挺好吃', studentSlack: 15, counterPressure: 2, color: '#2ecc71', emoji: '🍬', rarity: 'common' },
            { id: 45, name: '闻书香气', surface: '翻阅课本感受书香', desc: '翻了三页就开始数书上有几个插图了', studentSlack: 19, counterPressure: 1, color: '#9b59b6', emoji: '👃', rarity: 'common' },
            { id: 46, name: '看窗外找灵感', surface: '望向窗外思考问题', desc: '看了五分钟的云，给每朵云都取了名字', studentSlack: 23, counterPressure: 1, color: '#1abc9c', emoji: '☁️', rarity: 'rare' },
            { id: 47, name: '闭眼回忆', surface: '闭眼回忆知识点', desc: '闭上眼三秒就睡着了，被同桌戳醒假装在冥想', studentSlack: 21, counterPressure: 3, color: '#f39c12', emoji: '😴', rarity: 'common' },
            { id: 48, name: '深呼吸放松', surface: '深呼吸调整学习状态', desc: '深呼吸了十次，越呼吸越困', studentSlack: 20, counterPressure: 1, color: '#e67e22', emoji: '🌬️', rarity: 'common' },
            // 终极伪装型
            { id: 49, name: '假装很忙', surface: '翻书+写字+画图一气呵成', desc: '动作行云流水，看起来超级忙，其实全是无意义操作', studentSlack: 25, counterPressure: 2, color: '#FFD700', emoji: '🎭', rarity: 'legendary' },
            { id: 50, name: '学霸附体', surface: '全程专注投入学习', desc: '维持学霸人设一整节课，下课后灵魂出窍原地瘫倒', studentSlack: 26, counterPressure: 3, color: '#FFD700', emoji: '👑', rarity: 'legendary' }
        ];
    }

    getRandomOptions(role) {
        const moves = role === 'teacher' ? this.teacherMoves : this.studentMoves;
        const shuffled = [...moves].sort(() => Math.random() - 0.5);
        return shuffled.slice(0, 3);
    }

    getAIChoice() {
        const aiMoves = this.role === 'teacher' ? this.studentMoves : this.teacherMoves;
        const aiIsTeacher = this.role === 'student';

        // Difficulty-based AI intelligence
        let smartChance = 0.2;
        if (this.difficulty === 'easy') smartChance = 0.1;
        if (this.difficulty === 'hard') smartChance = 0.5;

        // Smart AI: learn from player patterns
        if (Math.random() < smartChance && this.playerMoveHistory.length >= 2) {
            // Find player's most used stat range
            const playerMoves = this.playerMoveHistory.slice(-5);
            const avgSlack = playerMoves.reduce((sum, m) => {
                return sum + (this.role === 'teacher' ? m.teacherSlack : m.studentSlack);
            }, 0) / playerMoves.length;

            // Counter-pick: find AI move that best counters the predicted play style
            if (avgSlack > 18) {
                // Player favors high-slack moves, pick high-pressure/counter moves
                const counterMoves = aiMoves.filter(m =>
                    aiIsTeacher ? m.studentPressure >= 12 : m.counterPressure >= 8
                );
                if (counterMoves.length > 0) {
                    this.playSound('counter');
                    return counterMoves[Math.floor(Math.random() * counterMoves.length)];
                }
            }
        }

        // Default: random
        return aiMoves[Math.floor(Math.random() * aiMoves.length)];
    }

    init() {
        this.bindEvents();
        this.gameLoop();
    }

    bindEvents() {
        this.canvas.addEventListener('mousemove', (e) => {
            const rect = this.canvas.getBoundingClientRect();
            const scaleX = this.canvas.width / rect.width;
            const scaleY = this.canvas.height / rect.height;
            this.mouseX = (e.clientX - rect.left) * scaleX;
            this.mouseY = (e.clientY - rect.top) * scaleY;
        });

        this.canvas.addEventListener('click', (e) => {
            this.initAudio();
            if (this.gameState === 'playing' && this.currentPhase === 'select') {
                this.handleClick();
            } else if (this.gameState === 'playing' && this.currentPhase === 'reveal') {
                this.handleNextRoundClick();
            }
        });

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            this.initAudio();
            if (this.gameState === 'playing' && this.currentPhase === 'select') {
                if (e.code === 'Digit1' || e.code === 'Numpad1') this.selectCard(0);
                if (e.code === 'Digit2' || e.code === 'Numpad2') this.selectCard(1);
                if (e.code === 'Digit3' || e.code === 'Numpad3') this.selectCard(2);
            }
            if (this.gameState === 'playing' && this.currentPhase === 'reveal') {
                if (e.code === 'Space' || e.code === 'Enter') {
                    e.preventDefault();
                    this.goToNextRound();
                }
            }
        });

        document.getElementById('studentBtn').addEventListener('click', () => {
            this.initAudio();
            this.startGame('student');
        });

        document.getElementById('teacherBtn').addEventListener('click', () => {
            this.initAudio();
            this.startGame('teacher');
        });

        document.getElementById('restartBtn').addEventListener('click', () => {
            this.resetGame();
            document.getElementById('resultOverlay').classList.add('hidden');
            document.getElementById('gameOverlay').classList.remove('hidden');
        });

        // Difficulty selection
        document.querySelectorAll('.btn-diff').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.difficulty = e.target.dataset.diff;
                document.querySelectorAll('.btn-diff').forEach(b => {
                    b.style.background = 'transparent';
                    b.style.color = b.style.borderColor;
                });
                e.target.style.background = e.target.style.borderColor;
                e.target.style.color = '#fff';
            });
        });
    }

    selectCard(index) {
        if (index < 0 || index >= this.currentOptions.length) return;
        this.playerChoice = this.currentOptions[index];
        this.aiChoice = this.getAIChoice();
        this.selectedCard = index;
        this.playerMoveHistory.push(this.playerChoice);
        this.resolveRound();
    }

    startGame(role) {
        this.role = role;
        this.gameState = 'playing';
        this.teacherScore = 0;
        this.studentScore = 0;
        this.round = 1;
        this.currentPhase = 'select';
        this.playerChoice = null;
        this.aiChoice = null;
        this.roundResult = null;
        this.animationTexts = [];
        this.particles = [];
        this.history = [];
        this.playerMoveHistory = [];
        this.currentOptions = this.getRandomOptions(role);
        this.nextRoundBtn.visible = false;
        this.selectedCard = -1;
        this.revealAnim = 0;
        this.cardAnims = [0, 0, 0];

        // Random blackboard text
        this.currentBlackboard = this.blackboardTexts[Math.floor(Math.random() * this.blackboardTexts.length)];

        document.getElementById('gameOverlay').classList.add('hidden');
        document.getElementById('resultOverlay').classList.add('hidden');

        this.updateUI();
    }

    resetGame() {
        this.gameState = 'menu';
        this.role = null;
        this.teacherScore = 0;
        this.studentScore = 0;
        this.round = 1;
        this.currentPhase = 'select';
        this.playerChoice = null;
        this.aiChoice = null;
        this.roundResult = null;
        this.animationTexts = [];
        this.particles = [];
        this.history = [];
        this.playerMoveHistory = [];
        this.currentOptions = [];
        this.nextRoundBtn.visible = false;
        this.selectedCard = -1;

        this.updateUI();
    }

    handleClick() {
        for (let i = 0; i < this.currentOptions.length; i++) {
            const card = this.getOptionRect(i);
            if (this.mouseX >= card.x && this.mouseX <= card.x + card.width &&
                this.mouseY >= card.y && this.mouseY <= card.y + card.height) {
                this.selectCard(i);
                break;
            }
        }
    }

    handleNextRoundClick() {
        const btn = this.nextRoundBtn;
        if (btn.visible &&
            this.mouseX >= btn.x && this.mouseX <= btn.x + btn.width &&
            this.mouseY >= btn.y && this.mouseY <= btn.y + btn.height) {
            this.goToNextRound();
        }
    }

    resolveRound() {
        this.currentPhase = 'reveal';
        this.resultTimer = 0;
        this.revealAnim = 0;

        let teacherSlack = 0;
        let studentSlack = 0;

        const teacherMove = this.role === 'teacher' ? this.playerChoice : this.aiChoice;
        const studentMove = this.role === 'student' ? this.playerChoice : this.aiChoice;

        teacherSlack = Math.max(0, teacherMove.teacherSlack - studentMove.counterPressure);
        studentSlack = Math.max(0, studentMove.studentSlack - teacherMove.studentPressure);

        this.teacherScore += teacherSlack;
        this.studentScore += studentSlack;

        this.roundResult = {
            teacherMove: teacherMove,
            studentMove: studentMove,
            teacherSlack: teacherSlack,
            studentSlack: studentSlack
        };

        // Save to history
        this.history.push({
            round: this.round,
            teacherMove: teacherMove,
            studentMove: studentMove,
            teacherSlack: teacherSlack,
            studentSlack: studentSlack
        });

        this.teacherAnim.state = 'action';
        this.studentAnim.state = 'action';

        // Set expressions based on result
        if (teacherSlack > studentSlack) {
            this.teacherAnim.expression = 'happy';
            this.studentAnim.expression = 'sad';
        } else if (studentSlack > teacherSlack) {
            this.teacherAnim.expression = 'sad';
            this.studentAnim.expression = 'happy';
        } else {
            this.teacherAnim.expression = 'surprised';
            this.studentAnim.expression = 'surprised';
        }

        this.animationTexts.push({
            text: `${teacherMove.emoji} 老师${teacherMove.name}！`,
            x: 200,
            y: 275,
            life: 3000,
            color: teacherMove.color,
            size: 18
        });
        this.animationTexts.push({
            text: `"${teacherMove.surface}"`,
            x: 200,
            y: 295,
            life: 3000,
            color: 'rgba(255,255,255,0.6)',
            size: 12
        });

        this.animationTexts.push({
            text: `${studentMove.emoji} 学生${studentMove.name}！`,
            x: 720,
            y: 275,
            life: 3000,
            color: studentMove.color,
            size: 18
        });
        this.animationTexts.push({
            text: `"${studentMove.surface}"`,
            x: 720,
            y: 295,
            life: 3000,
            color: 'rgba(255,255,255,0.6)',
            size: 12
        });

        if (teacherSlack > 0) {
            this.animationTexts.push({
                text: `+${teacherSlack}划水值`,
                x: 200,
                y: 330,
                life: 3000,
                color: '#e74c3c',
                size: 20,
                isScore: true
            });
            this.createParticles(200, 310, teacherMove.color, 15);
        } else {
            this.animationTexts.push({
                text: `被反制了!`,
                x: 200,
                y: 330,
                life: 3000,
                color: '#95a5a6',
                size: 16,
                isScore: true
            });
        }

        if (studentSlack > 0) {
            this.animationTexts.push({
                text: `+${studentSlack}划水值`,
                x: 720,
                y: 330,
                life: 3000,
                color: '#3498db',
                size: 20,
                isScore: true
            });
            this.createParticles(720, 310, studentMove.color, 15);
        } else {
            this.animationTexts.push({
                text: `被反制了!`,
                x: 720,
                y: 330,
                life: 3000,
                color: '#95a5a6',
                size: 16,
                isScore: true
            });
        }

        this.playSound('reveal');

        this.nextRoundBtn.visible = true;
        this.nextRoundBtn.x = this.canvas.width / 2 - 80;
        this.nextRoundBtn.y = this.canvas.height - 80;

        this.updateUI();
    }

    goToNextRound() {
        this.teacherAnim.state = 'idle';
        this.teacherAnim.expression = 'normal';
        this.studentAnim.state = 'idle';
        this.studentAnim.expression = 'normal';
        this.nextRoundBtn.visible = false;
        this.selectedCard = -1;
        this.revealAnim = 0;

        if (this.round >= this.maxRounds) {
            this.endGame();
        } else {
            this.round++;
            this.currentPhase = 'select';
            this.playerChoice = null;
            this.aiChoice = null;
            this.roundResult = null;
            this.currentOptions = this.getRandomOptions(this.role);
            this.animationTexts = [];
            this.particles = [];
            this.cardAnims = [0, 0, 0];

            // Change blackboard text every 3 rounds
            if (this.round % 3 === 1) {
                this.currentBlackboard = this.blackboardTexts[Math.floor(Math.random() * this.blackboardTexts.length)];
            }

            this.updateUI();
        }
    }

    endGame() {
        this.gameState = 'result';

        const resultTitle = document.getElementById('resultTitle');
        const resultText = document.getElementById('resultText');

        if (this.role === 'teacher') {
            if (this.teacherScore > this.studentScore) {
                resultTitle.textContent = '划水大师！';
                resultText.textContent = `你作为老师划水 ${this.teacherScore} 分，学生只划了 ${this.studentScore} 分！`;
                this.playSound('win');
            } else if (this.teacherScore < this.studentScore) {
                resultTitle.textContent = '学生太狡猾了！';
                resultText.textContent = `你划水 ${this.teacherScore} 分，但学生划了 ${this.studentScore} 分！`;
                this.playSound('lose');
            } else {
                resultTitle.textContent = '旗鼓相当！';
                resultText.textContent = `双方都是划水高手，都划了 ${this.teacherScore} 分！`;
            }
        } else {
            if (this.studentScore > this.teacherScore) {
                resultTitle.textContent = '划水之王！';
                resultText.textContent = `你作为学生划水 ${this.studentScore} 分，老师只划了 ${this.teacherScore} 分！`;
                this.playSound('win');
            } else if (this.studentScore < this.teacherScore) {
                resultTitle.textContent = '老师太会了！';
                resultText.textContent = `你划水 ${this.studentScore} 分，但老师划了 ${this.teacherScore} 分！`;
                this.playSound('lose');
            } else {
                resultTitle.textContent = '旗鼓相当！';
                resultText.textContent = `双方都是划水高手，都划了 ${this.studentScore} 分！`;
            }
        }

        document.getElementById('resultOverlay').classList.remove('hidden');
    }

    getOptionRect(index) {
        const cardWidth = 240;
        const cardHeight = 105;
        const spacing = 12;
        const totalHeight = cardHeight * 3 + spacing * 2;
        const startY = (this.canvas.height - totalHeight) / 2 + 10;
        const startX = (this.canvas.width - cardWidth) / 2;

        return {
            x: startX,
            y: startY + index * (cardHeight + spacing),
            width: cardWidth,
            height: cardHeight
        };
    }

    update(dt) {
        if (this.gameState !== 'playing') return;

        if (this.shakeTimer > 0) this.shakeTimer -= dt;

        this.animationTexts = this.animationTexts.filter(t => {
            t.life -= dt;
            t.y -= 0.5;
            return t.life > 0;
        });

        this.particles = this.particles.filter(p => {
            p.life -= dt;
            p.x += p.vx;
            p.y += p.vy;
            p.vy += 0.05;
            return p.life > 0;
        });

        this.teacherAnim.frame += 0.1;
        this.studentAnim.frame += 0.1;

        // Card hover animation
        for (let i = 0; i < 3; i++) {
            const card = this.getOptionRect(i);
            const isHovered = this.mouseX >= card.x && this.mouseX <= card.x + card.width &&
                this.mouseY >= card.y && this.mouseY <= card.y + card.height;
            if (isHovered && this.currentPhase === 'select') {
                this.cardAnims[i] = Math.min(1, (this.cardAnims[i] || 0) + 0.1);
            } else {
                this.cardAnims[i] = Math.max(0, (this.cardAnims[i] || 0) - 0.08);
            }
        }

        // Reveal animation counter
        if (this.currentPhase === 'reveal') {
            this.revealAnim = Math.min(1, (this.revealAnim || 0) + 0.03);
        }
    }

    draw() {
        this.drawBackground();

        if (this.gameState === 'playing') {
            this.drawTeacher();
            this.drawStudent();
            this.drawDesk();

            if (this.currentPhase === 'select') {
                this.drawOptions();
            } else if (this.currentPhase === 'reveal') {
                this.drawReveal();
                this.drawHistory();
            }

            this.drawAnimationTexts();
            this.drawParticles();
            this.drawNextRoundBtn();
        }

        this.drawUI();
    }

    drawBackground() {
        const ctx = this.ctx;
        const w = this.canvas.width;
        const h = this.canvas.height;

        const gradient = ctx.createLinearGradient(0, 0, 0, h);
        gradient.addColorStop(0, '#FFE4B5');
        gradient.addColorStop(0.5, '#FFF8DC');
        gradient.addColorStop(1, '#F5DEB3');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, w, h);

        // Floor
        ctx.fillStyle = 'rgba(139, 90, 43, 0.1)';
        for (let i = 0; i < h; i += 40) {
            ctx.fillRect(0, i + 300, w, 2);
        }

        // Window
        ctx.fillStyle = '#87CEEB';
        ctx.beginPath();
        ctx.roundRect(20, 50, 50, 70, 3);
        ctx.fill();
        ctx.strokeStyle = '#8B4513';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.roundRect(20, 50, 50, 70, 3);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(45, 50);
        ctx.lineTo(45, 120);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(20, 85);
        ctx.lineTo(70, 85);
        ctx.stroke();
        // Sun through window
        ctx.fillStyle = '#FFD700';
        ctx.beginPath();
        ctx.arc(35, 65, 8, 0, Math.PI * 2);
        ctx.fill();

        // Clock
        ctx.fillStyle = '#FFF';
        ctx.beginPath();
        ctx.arc(840, 80, 25, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 2;
        ctx.stroke();
        // Clock hands
        const now = new Date();
        const minuteAngle = (now.getMinutes() / 60) * Math.PI * 2 - Math.PI / 2;
        const hourAngle = ((now.getHours() % 12) / 12) * Math.PI * 2 - Math.PI / 2;
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(840, 80);
        ctx.lineTo(840 + Math.cos(hourAngle) * 12, 80 + Math.sin(hourAngle) * 12);
        ctx.stroke();
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(840, 80);
        ctx.lineTo(840 + Math.cos(minuteAngle) * 18, 80 + Math.sin(minuteAngle) * 18);
        ctx.stroke();

        // Chalkboard
        ctx.fillStyle = '#2F4F4F';
        ctx.beginPath();
        ctx.roundRect(100, 30, 700, 110, 10);
        ctx.fill();

        ctx.fillStyle = '#3C6E6E';
        ctx.beginPath();
        ctx.roundRect(110, 40, 680, 90, 8);
        ctx.fill();

        ctx.strokeStyle = '#8B4513';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.roundRect(100, 30, 700, 110, 10);
        ctx.stroke();

        // Chalkboard text (dynamic)
        ctx.fillStyle = '#F0F8FF';
        ctx.font = 'bold 22px "Microsoft YaHei", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(this.currentBlackboard, w / 2, 75);
        ctx.font = '14px "Microsoft YaHei", sans-serif';
        ctx.fillStyle = '#B0C4DE';
        ctx.fillText('（老师和学生都在研究这个课题）', w / 2, 105);

        // Chalk tray
        ctx.fillStyle = '#8B4513';
        ctx.fillRect(100, 140, 700, 8);

        // Chalk dust particles
        ctx.fillStyle = 'rgba(255,255,255,0.15)';
        for (let i = 0; i < 5; i++) {
            const dx = 150 + (Date.now() / 50 + i * 130) % 600;
            const dy = 145 + Math.sin(Date.now() / 1000 + i) * 3;
            ctx.beginPath();
            ctx.arc(dx, dy, 1.5, 0, Math.PI * 2);
            ctx.fill();
        }

        // Difficulty indicator
        const diffLabels = { easy: '简单', normal: '普通', hard: '困难' };
        const diffColors = { easy: '#2ecc71', normal: '#f39c12', hard: '#e74c3c' };
        ctx.fillStyle = diffColors[this.difficulty] || '#f39c12';
        ctx.font = '12px "Microsoft YaHei"';
        ctx.textAlign = 'right';
        ctx.fillText(`难度: ${diffLabels[this.difficulty] || '普通'}`, w - 20, h - 10);
    }

    drawTeacher() {
        const ctx = this.ctx;
        const x = 200;
        const y = 340;
        const anim = this.teacherAnim;

        ctx.save();
        ctx.translate(x, y);

        let bounceY = 0;
        if (anim.state === 'action') {
            bounceY = Math.sin(anim.frame * 3) * 6;
        } else {
            bounceY = Math.sin(anim.frame) * 2;
        }

        if (this.teacherImgLoaded) {
            const imgWidth = 140;
            const imgHeight = 175;
            ctx.drawImage(this.teacherImg, -imgWidth / 2, -imgHeight + 50 + bounceY, imgWidth, imgHeight);

            // Expression overlay for photo
            if (anim.expression === 'happy') {
                ctx.fillStyle = 'rgba(46, 204, 113, 0.15)';
                ctx.fillRect(-imgWidth / 2, -imgHeight + 50 + bounceY, imgWidth, imgHeight);
            } else if (anim.expression === 'sad') {
                ctx.fillStyle = 'rgba(231, 76, 60, 0.15)';
                ctx.fillRect(-imgWidth / 2, -imgHeight + 50 + bounceY, imgWidth, imgHeight);
            }
        } else {
            // Draw teacher character
            const ty = bounceY;

            // Body
            ctx.fillStyle = '#4682B4';
            ctx.beginPath();
            ctx.roundRect(-35, -40 + ty, 70, 100, 12);
            ctx.fill();

            // Head
            ctx.fillStyle = '#FFE4C4';
            ctx.beginPath();
            ctx.arc(0, -55 + ty, 22, 0, Math.PI * 2);
            ctx.fill();

            // Hair
            ctx.fillStyle = '#333';
            ctx.beginPath();
            ctx.arc(0, -60 + ty, 22, Math.PI * 1.1, Math.PI * 1.9);
            ctx.fill();

            // Glasses
            ctx.strokeStyle = '#333';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.roundRect(-14, -60 + ty, 10, 8, 2);
            ctx.stroke();
            ctx.beginPath();
            ctx.roundRect(4, -60 + ty, 10, 8, 2);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(-4, -56 + ty);
            ctx.lineTo(4, -56 + ty);
            ctx.stroke();

            // Expression
            if (anim.expression === 'happy') {
                ctx.strokeStyle = '#333';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.arc(0, -48 + ty, 6, 0, Math.PI);
                ctx.stroke();
            } else if (anim.expression === 'sad') {
                ctx.strokeStyle = '#333';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.arc(0, -42 + ty, 6, Math.PI, Math.PI * 2);
                ctx.stroke();
            } else {
                ctx.strokeStyle = '#333';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(-4, -48 + ty);
                ctx.lineTo(4, -48 + ty);
                ctx.stroke();
            }

            // Label
            ctx.fillStyle = '#2F4F4F';
            ctx.font = 'bold 14px "Microsoft YaHei"';
            ctx.textAlign = 'center';
            ctx.fillText('老师', 0, 80);
        }

        ctx.restore();
    }

    drawStudent() {
        const ctx = this.ctx;
        const x = 720;
        const y = 340;
        const anim = this.studentAnim;

        ctx.save();
        ctx.translate(x, y);

        let bounceY = 0;
        let headTilt = 0;
        if (anim.state === 'action') {
            bounceY = Math.sin(anim.frame * 3) * 6;
            headTilt = Math.sin(anim.frame * 2) * 0.15;
        } else {
            bounceY = Math.sin(anim.frame * 0.8) * 2;
        }

        // Shadow
        ctx.fillStyle = 'rgba(0,0,0,0.1)';
        ctx.beginPath();
        ctx.ellipse(0, 100, 25, 6, 0, 0, Math.PI * 2);
        ctx.fill();

        // Body (uniform)
        ctx.fillStyle = '#4169E1';
        ctx.beginPath();
        ctx.roundRect(-30, -20 + bounceY, 60, 75, 12);
        ctx.fill();

        // Collar
        ctx.fillStyle = '#DC143C';
        ctx.beginPath();
        ctx.moveTo(0, -15 + bounceY);
        ctx.lineTo(-12, 15 + bounceY);
        ctx.lineTo(0, 25 + bounceY);
        ctx.lineTo(12, 15 + bounceY);
        ctx.fill();

        // Arms
        const armSwing = anim.state === 'action' ? Math.sin(anim.frame * 4) * 0.3 : 0;
        ctx.fillStyle = '#4169E1';
        ctx.save();
        ctx.translate(-35, -5 + bounceY);
        ctx.rotate(-0.2 + armSwing);
        ctx.beginPath();
        ctx.roundRect(0, 0, 15, 40, 8);
        ctx.fill();
        ctx.fillStyle = '#FFE4C4';
        ctx.beginPath();
        ctx.arc(7, 42, 7, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        ctx.fillStyle = '#4169E1';
        ctx.save();
        ctx.translate(20, -5 + bounceY);
        ctx.rotate(0.2 - armSwing);
        ctx.beginPath();
        ctx.roundRect(0, 0, 15, 40, 8);
        ctx.fill();
        ctx.fillStyle = '#FFE4C4';
        ctx.beginPath();
        ctx.arc(7, 42, 7, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        // Head
        ctx.save();
        ctx.translate(0, -50 + bounceY);
        ctx.rotate(headTilt);

        // Face
        ctx.fillStyle = '#FFE4C4';
        ctx.beginPath();
        ctx.arc(0, 0, 26, 0, Math.PI * 2);
        ctx.fill();

        // Hair
        ctx.fillStyle = '#8B4513';
        ctx.beginPath();
        ctx.arc(0, -5, 28, Math.PI * 0.8, Math.PI * 0.2);
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(-20, -15);
        ctx.quadraticCurveTo(-10, -5, 0, -12);
        ctx.quadraticCurveTo(10, -5, 20, -15);
        ctx.fill();

        // Eyes
        ctx.fillStyle = '#FFF';
        ctx.beginPath();
        ctx.ellipse(-10, 2, 9, 11, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(10, 2, 9, 11, 0, 0, Math.PI * 2);
        ctx.fill();

        // Iris
        ctx.fillStyle = '#4169E1';
        ctx.beginPath();
        ctx.arc(-10, 2, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(10, 2, 6, 0, Math.PI * 2);
        ctx.fill();

        // Pupil
        ctx.fillStyle = '#000';
        ctx.beginPath();
        ctx.arc(-10, 2, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(10, 2, 3, 0, Math.PI * 2);
        ctx.fill();

        // Eye highlights
        ctx.fillStyle = '#FFF';
        ctx.beginPath();
        ctx.arc(-8, 0, 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(12, 0, 2, 0, Math.PI * 2);
        ctx.fill();

        // Blink animation
        const blinkCycle = (Date.now() % 4000);
        if (blinkCycle > 3800 && blinkCycle < 3950) {
            ctx.fillStyle = '#FFE4C4';
            ctx.fillRect(-19, -8, 38, 16);
        }

        // Expression
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 2;
        ctx.beginPath();
        if (anim.expression === 'happy') {
            ctx.arc(0, 15, 6, 0, Math.PI);
        } else if (anim.expression === 'sad') {
            ctx.arc(0, 20, 6, Math.PI, Math.PI * 2);
        } else if (anim.expression === 'surprised') {
            ctx.arc(0, 16, 5, 0, Math.PI * 2);
        } else {
            ctx.moveTo(-4, 15);
            ctx.quadraticCurveTo(0, 18, 4, 15);
        }
        ctx.stroke();

        // Blush
        ctx.fillStyle = 'rgba(255, 182, 193, 0.5)';
        ctx.beginPath();
        ctx.arc(-18, 10, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(18, 10, 6, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore(); // head

        // Legs
        ctx.fillStyle = '#191970';
        ctx.beginPath();
        ctx.roundRect(-22, 55, 16, 45, 6);
        ctx.fill();
        ctx.beginPath();
        ctx.roundRect(6, 55, 16, 45, 6);
        ctx.fill();

        // Shoes
        ctx.fillStyle = '#FFF';
        ctx.beginPath();
        ctx.ellipse(-14, 105, 14, 7, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(14, 105, 14, 7, 0, 0, Math.PI * 2);
        ctx.fill();

        // Label
        ctx.fillStyle = '#4169E1';
        ctx.font = 'bold 13px "Microsoft YaHei"';
        ctx.textAlign = 'center';
        ctx.fillText('学生代表', 0, 130);

        ctx.restore();
    }

    drawDesk() {
        const ctx = this.ctx;

        // Teacher podium
        ctx.fillStyle = '#6B3410';
        ctx.fillRect(130, 360, 140, 90);
        ctx.fillStyle = '#8B4513';
        ctx.fillRect(135, 365, 130, 80);
        ctx.fillStyle = '#A0522D';
        ctx.fillRect(125, 355, 150, 15);
        ctx.strokeStyle = '#DEB887';
        ctx.lineWidth = 2;
        ctx.strokeRect(140, 375, 120, 60);

        // Books on podium
        ctx.fillStyle = '#4682B4';
        ctx.fillRect(150, 345, 25, 15);
        ctx.fillStyle = '#2ECC71';
        ctx.fillRect(178, 348, 20, 12);

        // Student desk
        ctx.fillStyle = '#DEB887';
        ctx.fillRect(660, 380, 120, 15);
        ctx.fillStyle = '#8B4513';
        ctx.fillRect(670, 395, 15, 50);
        ctx.fillRect(755, 395, 15, 50);

        // Books on desk
        ctx.fillStyle = '#4682B4';
        ctx.fillRect(680, 365, 30, 20);
        ctx.fillStyle = '#DC143C';
        ctx.fillRect(715, 368, 25, 18);
        // Pencil
        ctx.fillStyle = '#FFD700';
        ctx.fillRect(745, 370, 3, 15);
    }

    drawOptions() {
        const ctx = this.ctx;
        const options = this.currentOptions;
        const title = this.role === 'teacher' ? '选择你的划水方式' : '选择你的应对方式';

        ctx.fillStyle = '#2F4F4F';
        ctx.font = 'bold 20px "Microsoft YaHei", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(title, 450, 165);

        // Hint for keyboard
        ctx.fillStyle = '#888';
        ctx.font = '12px "Microsoft YaHei"';
        ctx.fillText('按 1/2/3 快速选择', 450, 185);

        options.forEach((option, index) => {
            const card = this.getOptionRect(index);
            const isHovered = this.mouseX >= card.x && this.mouseX <= card.x + card.width &&
                this.mouseY >= card.y && this.mouseY <= card.y + card.height;
            const hoverAnim = this.cardAnims[index] || 0;

            ctx.save();

            // Hover scale
            if (hoverAnim > 0) {
                const cx = card.x + card.width / 2;
                const cy = card.y + card.height / 2;
                const scale = 1 + hoverAnim * 0.03;
                ctx.translate(cx, cy);
                ctx.scale(scale, scale);
                ctx.translate(-cx, -cy);
            }

            // Shadow
            if (isHovered) {
                ctx.fillStyle = 'rgba(0,0,0,0.2)';
                ctx.beginPath();
                ctx.roundRect(card.x + 3, card.y + 3, card.width, card.height, 12);
                ctx.fill();
            }

            // Card background
            ctx.fillStyle = isHovered ? option.color : this.hexToRgba(option.color, 0.92);
            ctx.beginPath();
            ctx.roundRect(card.x, card.y, card.width, card.height, 12);
            ctx.fill();

            // Rarity border glow
            const rarityColors = { common: '#aaa', rare: '#3498db', legendary: '#FFD700' };
            ctx.strokeStyle = isHovered ? '#FFF' : (rarityColors[option.rarity] || '#FFF');
            ctx.lineWidth = isHovered ? 3 : 2;
            ctx.beginPath();
            ctx.roundRect(card.x, card.y, card.width, card.height, 12);
            ctx.stroke();

            // Rarity badge
            if (option.rarity !== 'common') {
                const badgeText = option.rarity === 'rare' ? '稀有' : '传说';
                ctx.fillStyle = rarityColors[option.rarity];
                ctx.font = 'bold 10px "Microsoft YaHei"';
                ctx.textAlign = 'right';
                ctx.fillText(badgeText, card.x + card.width - 10, card.y + 16);
            }

            // Emoji
            ctx.font = 'bold 24px Arial';
            ctx.textAlign = 'left';
            ctx.fillText(option.emoji, card.x + 15, card.y + 35);

            // Name
            ctx.fillStyle = '#FFF';
            ctx.font = 'bold 18px "Microsoft YaHei", sans-serif';
            ctx.textAlign = 'left';
            ctx.fillText(option.name, card.x + 50, card.y + 33);

            // Surface (what it looks like - the disguise)
            ctx.font = '12px "Microsoft YaHei", sans-serif';
            ctx.fillStyle = 'rgba(255,255,255,0.85)';
            ctx.fillText(option.surface, card.x + 50, card.y + 50);

            // Desc (real behavior - shown smaller as hint)
            ctx.font = '11px "Microsoft YaHei", sans-serif';
            ctx.fillStyle = 'rgba(255,255,255,0.5)';
            const descPreview = option.desc.length > 20 ? option.desc.slice(0, 20) + '...' : option.desc;
            ctx.fillText(descPreview, card.x + 50, card.y + 66);

            // Stats
            ctx.font = 'bold 13px "Microsoft YaHei", sans-serif';
            ctx.fillStyle = '#FFF';
            if (this.role === 'teacher') {
                ctx.fillText(`划水+${option.teacherSlack}  |  施压+${option.studentPressure}`,
                    card.x + 50, card.y + 84);
            } else {
                ctx.fillText(`划水+${option.studentSlack}  |  反制+${option.counterPressure}`,
                    card.x + 50, card.y + 84);
            }

            // Key hint
            ctx.fillStyle = 'rgba(255,255,255,0.5)';
            ctx.font = 'bold 16px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(`${index + 1}`, card.x + 22, card.y + card.height - 10);

            ctx.restore();
        });
    }

    drawReveal() {
        const ctx = this.ctx;
        if (!this.roundResult) return;

        const { teacherMove, studentMove, teacherSlack, studentSlack } = this.roundResult;

        // Animated reveal
        const progress = this.revealAnim || 0;

        // Teacher choice bubble
        ctx.save();
        ctx.globalAlpha = Math.min(1, progress * 2);
        const teacherOffset = (1 - Math.min(1, progress * 2)) * 30;
        this.drawActionBubble(200, 145 - teacherOffset, teacherMove, '老师', teacherSlack, '#e74c3c', 'left');
        ctx.restore();

        // Student choice bubble
        ctx.save();
        ctx.globalAlpha = Math.min(1, Math.max(0, progress - 0.2) * 2);
        const studentOffset = (1 - Math.min(1, Math.max(0, progress - 0.2) * 2)) * 30;
        this.drawActionBubble(720, 145 - studentOffset, studentMove, '学生', studentSlack, '#3498db', 'right');
        ctx.restore();

        // VS with scale animation
        ctx.save();
        const vsScale = progress > 0.4 ? Math.min(1, (progress - 0.4) * 3) : 0;
        ctx.translate(450, 155);
        ctx.scale(vsScale, vsScale);
        ctx.fillStyle = '#FFD700';
        ctx.font = 'bold 28px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('VS', 0, 0);
        ctx.restore();
    }

    drawActionBubble(x, y, move, role, slack, scoreColor, direction) {
        const ctx = this.ctx;
        const w = 240;
        const h = 120;
        const bx = direction === 'left' ? x : x - w;
        const by = y;

        // Bubble shadow
        ctx.fillStyle = 'rgba(0,0,0,0.15)';
        ctx.beginPath();
        ctx.roundRect(bx + 3, by + 3, w, h, 12);
        ctx.fill();

        ctx.fillStyle = move.color;
        ctx.beginPath();
        ctx.roundRect(bx, by, w, h, 12);
        ctx.fill();

        ctx.strokeStyle = '#FFF';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.roundRect(bx, by, w, h, 12);
        ctx.stroke();

        // Triangle pointer
        ctx.fillStyle = move.color;
        ctx.beginPath();
        if (direction === 'left') {
            ctx.moveTo(bx + 20, by + h);
            ctx.lineTo(bx + 30, by + h + 12);
            ctx.lineTo(bx + 40, by + h);
        } else {
            ctx.moveTo(bx + w - 40, by + h);
            ctx.lineTo(bx + w - 30, by + h + 12);
            ctx.lineTo(bx + w - 20, by + h);
        }
        ctx.fill();

        // Line 1: emoji + name
        ctx.fillStyle = '#FFF';
        ctx.font = 'bold 15px "Microsoft YaHei", sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText(`${move.emoji} ${move.name}`, bx + 12, by + 24);

        // Line 2: surface (what it looks like)
        ctx.font = '11px "Microsoft YaHei", sans-serif';
        ctx.fillStyle = 'rgba(255,255,255,0.6)';
        ctx.fillText(`表面: ${move.surface}`, bx + 12, by + 42);

        // Line 3: desc (what's really happening)
        ctx.fillStyle = 'rgba(255,255,255,0.9)';
        ctx.fillText(`实际: ${move.desc}`, bx + 12, by + 58);

        // Divider line
        ctx.strokeStyle = 'rgba(255,255,255,0.3)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(bx + 12, by + 68);
        ctx.lineTo(bx + w - 12, by + 68);
        ctx.stroke();

        // Line 4: score
        ctx.font = 'bold 15px Arial';
        ctx.fillStyle = scoreColor;
        if (slack > 0) {
            ctx.fillText(`实际划水 +${slack}`, bx + 12, by + 90);
        } else {
            ctx.fillStyle = '#95a5a6';
            ctx.fillText('被完全反制！', bx + 12, by + 90);
        }

        // VS label
        ctx.fillStyle = 'rgba(255,255,255,0.5)';
        ctx.font = '10px "Microsoft YaHei"';
        ctx.fillText(`${role}`, bx + 12, by + 108);
    }

    drawHistory() {
        if (this.history.length <= 1) return;

        const ctx = this.ctx;
        const startX = 20;
        const startY = this.canvas.height - 120;
        const entryH = 16;

        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.beginPath();
        ctx.roundRect(startX - 5, startY - 18, 200, Math.min(this.history.length, 5) * entryH + 25, 6);
        ctx.fill();

        ctx.fillStyle = '#FFF';
        ctx.font = 'bold 11px "Microsoft YaHei"';
        ctx.textAlign = 'left';
        ctx.fillText('回合记录', startX, startY - 5);

        const recentHistory = this.history.slice(-5);
        recentHistory.forEach((h, i) => {
            ctx.font = '10px "Microsoft YaHei"';
            ctx.fillStyle = 'rgba(255,255,255,0.7)';
            ctx.fillText(
                `R${h.round}: ${h.teacherMove.emoji}${h.teacherMove.name} vs ${h.studentMove.emoji}${h.studentMove.name}`,
                startX, startY + 8 + i * entryH
            );
            ctx.fillStyle = '#e74c3c';
            ctx.fillText(`${h.teacherSlack}`, startX + 160, startY + 8 + i * entryH);
            ctx.fillStyle = '#3498db';
            ctx.fillText(`${h.studentSlack}`, startX + 180, startY + 8 + i * entryH);
        });
    }

    drawNextRoundBtn() {
        if (!this.nextRoundBtn.visible) return;

        const ctx = this.ctx;
        const btn = this.nextRoundBtn;
        const isHovered = this.mouseX >= btn.x && this.mouseX <= btn.x + btn.width &&
            this.mouseY >= btn.y && this.mouseY <= btn.y + btn.height;

        // Pulse animation
        const pulse = Math.sin(Date.now() * 0.004) * 2;

        if (isHovered) {
            ctx.fillStyle = 'rgba(0,0,0,0.2)';
            ctx.beginPath();
            ctx.roundRect(btn.x + 3, btn.y + 3, btn.width, btn.height, 10);
            ctx.fill();
        }

        ctx.fillStyle = isHovered ? '#27ae60' : '#2ecc71';
        ctx.beginPath();
        ctx.roundRect(btn.x - pulse, btn.y - pulse / 2, btn.width + pulse * 2, btn.height + pulse, 10);
        ctx.fill();

        ctx.strokeStyle = '#FFF';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.roundRect(btn.x - pulse, btn.y - pulse / 2, btn.width + pulse * 2, btn.height + pulse, 10);
        ctx.stroke();

        ctx.fillStyle = '#FFF';
        ctx.font = 'bold 18px "Microsoft YaHei", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('下一轮 ➡', btn.x + btn.width / 2, btn.y + btn.height / 2 + 6);

        // Space hint
        ctx.fillStyle = 'rgba(255,255,255,0.5)';
        ctx.font = '11px "Microsoft YaHei"';
        ctx.fillText('或按 空格键', btn.x + btn.width / 2, btn.y + btn.height + 16);
    }

    drawAnimationTexts() {
        this.animationTexts.forEach(t => {
            this.ctx.fillStyle = t.color;
            this.ctx.font = `bold ${t.size || 16}px "Microsoft YaHei", sans-serif`;
            this.ctx.textAlign = 'center';

            const alpha = Math.min(1, t.life / 500);
            this.ctx.globalAlpha = alpha;

            // Score text bounce
            if (t.isScore && t.life > 2500) {
                const scale = 1 + (3000 - t.life) / 500 * 0.3;
                this.ctx.save();
                this.ctx.translate(t.x, t.y);
                this.ctx.scale(scale, scale);
                this.ctx.fillText(t.text, 0, 0);
                this.ctx.restore();
            } else {
                this.ctx.fillText(t.text, t.x, t.y);
            }
        });
        this.ctx.globalAlpha = 1;
    }

    drawParticles() {
        this.particles.forEach(p => {
            this.ctx.fillStyle = p.color;
            this.ctx.globalAlpha = p.life / 1000;
            this.ctx.beginPath();
            this.ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            this.ctx.fill();
        });
        this.ctx.globalAlpha = 1;
    }

    drawUI() {
        if (this.gameState === 'playing') {
            this.ctx.fillStyle = '#2F4F4F';
            this.ctx.font = '14px "Microsoft YaHei", sans-serif';
            this.ctx.textAlign = 'left';

            if (this.currentPhase === 'select') {
                this.ctx.fillText('点击卡片或按 1/2/3 选择你的划水手段', 20, this.canvas.height - 20);
            } else if (this.currentPhase === 'reveal') {
                this.ctx.fillText('点击"下一轮"或按空格键继续', 20, this.canvas.height - 20);
            }
        }
    }

    createParticles(x, y, color, count) {
        for (let i = 0; i < count; i++) {
            const angle = (Math.PI * 2 / count) * i + Math.random() * 0.5;
            const speed = 2 + Math.random() * 4;
            this.particles.push({
                x: x,
                y: y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed - 2,
                life: 800 + Math.random() * 400,
                color: color,
                size: 3 + Math.random() * 5
            });
        }
    }

    hexToRgba(hex, alpha) {
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }

    updateUI() {
        document.getElementById('teacherScore').textContent = this.teacherScore;
        document.getElementById('studentScore').textContent = this.studentScore;
        document.getElementById('roundNum').textContent = `${this.round}/${this.maxRounds}`;
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
    new SlackingGame();
});
