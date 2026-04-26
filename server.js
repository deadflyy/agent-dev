const express = require('express');
const initSqlJs = require('sql.js');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'database.sqlite');

app.use(express.json());
app.use(cors());
app.use(express.static('.'));

let db = null;

async function initDB() {
  const SQL = await initSqlJs();
  
  try {
    if (fs.existsSync(DB_PATH)) {
      const buffer = fs.readFileSync(DB_PATH);
      db = new SQL.Database(buffer);
    } else {
      db = new SQL.Database();
    }
  } catch (e) {
    db = new SQL.Database();
  }
  
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);
  
  db.run(`CREATE TABLE IF NOT EXISTS game_progress (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    game_name TEXT NOT NULL,
    level INTEGER DEFAULT 1,
    score INTEGER DEFAULT 0,
    progress TEXT DEFAULT '{}',
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    UNIQUE(user_id, game_name)
  )`);
  
  saveDB();
}

function saveDB() {
  if (db) {
    const data = db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(DB_PATH, buffer);
  }
}

app.post('/api/register', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.json({ success: false, message: '请填写用户名和密码' });
  }
  
  const hashedPassword = bcrypt.hashSync(password, 10);
  
  try {
    db.run(`INSERT INTO users (username, password) VALUES (?, ?)`, [username, hashedPassword]);
    saveDB();
    const result = db.exec('SELECT last_insert_rowid() as id');
    res.json({ success: true, message: '注册成功', userId: result[0].values[0][0] });
  } catch (err) {
    if (err.message.includes('UNIQUE')) {
      return res.json({ success: false, message: '用户名已存在' });
    }
    return res.json({ success: false, message: '注册失败' });
  }
});

app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.json({ success: false, message: '请填写用户名和密码' });
  }
  
  try {
    const result = db.exec(`SELECT * FROM users WHERE username = '${username}'`);
    if (result.length === 0 || result[0].values.length === 0) {
      return res.json({ success: false, message: '用户不存在' });
    }
    
    const user = result[0].values[0];
    const userId = user[0];
    const userName = user[1];
    const hashedPassword = user[2];
    
    if (!bcrypt.compareSync(password, hashedPassword)) {
      return res.json({ success: false, message: '密码错误' });
    }
    
    res.json({ success: true, message: '登录成功', userId, username: userName });
  } catch (err) {
    return res.json({ success: false, message: '登录失败' });
  }
});

app.get('/api/progress/:gameName', (req, res) => {
  const { gameName } = req.params;
  const userId = req.query.userId;
  
  if (!userId) {
    return res.json({ success: false, message: '请先登录' });
  }
  
  try {
    const result = db.exec(`SELECT * FROM game_progress WHERE user_id = ${userId} AND game_name = '${gameName}'`);
    if (result.length === 0 || result[0].values.length === 0) {
      return res.json({ success: true, progress: null });
    }
    
    const progress = result[0].values[0];
    res.json({ success: true, progress: { level: progress[3], score: progress[4], progress: progress[5] } });
  } catch (err) {
    return res.json({ success: false, message: '获取进度失败' });
  }
});

app.post('/api/progress/:gameName', (req, res) => {
  const { gameName } = req.params;
  const { userId, level, score, progress } = req.body;
  
  if (!userId) {
    return res.json({ success: false, message: '请先登录' });
  }
  
  try {
    db.run(`INSERT OR REPLACE INTO game_progress (user_id, game_name, level, score, progress, updated_at)
      VALUES (?, ?, ?, ?, ?, datetime('now'))`, 
      [userId, gameName, level || 1, score || 0, JSON.stringify(progress || {})]);
    saveDB();
    res.json({ success: true, message: '进度已保存' });
  } catch (err) {
    return res.json({ success: false, message: '保存进度失败' });
  }
});

initDB().then(() => {
  app.listen(PORT, () => {
    console.log(`服务器运行在 http://localhost:${PORT}`);
  });
});