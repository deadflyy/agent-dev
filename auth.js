const API_BASE = '';

class Auth {
  constructor() {
    this.currentUser = null;
    const saved = localStorage.getItem('gameUser');
    if (saved) {
      this.currentUser = JSON.parse(saved);
    }
  }

  async register(username, password) {
    const res = await fetch(`${API_BASE}/api/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    return res.json();
  }

  async login(username, password) {
    const res = await fetch(`${API_BASE}/api/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    const data = await res.json();
    if (data.success) {
      this.currentUser = { id: data.userId, username: data.username };
      localStorage.setItem('gameUser', JSON.stringify(this.currentUser));
    }
    return data;
  }

  logout() {
    this.currentUser = null;
    localStorage.removeItem('gameUser');
  }

  getUserId() {
    return this.currentUser ? this.currentUser.id : null;
  }

  getUsername() {
    return this.currentUser ? this.currentUser.username : null;
  }
}

window.GameProgress = class GameProgress {
  constructor(gameName) {
    this.gameName = gameName;
    this.auth = window.auth;
  }

  async load() {
    const userId = this.auth.getUserId();
    if (!userId) return null;

    const res = await fetch(`${API_BASE}/api/progress/${this.gameName}?userId=${userId}`);
    const data = await res.json();
    if (data.success && data.progress) {
      return JSON.parse(data.progress.progress);
    }
    return null;
  }

  async save(progress) {
    const userId = this.auth.getUserId();
    if (!userId) return false;

    const res = await fetch(`${API_BASE}/api/progress/${this.gameName}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId,
        progress,
        level: progress.level || 1,
        score: progress.score || 0
      })
    });
    const data = await res.json();
    return data.success;
  }
};

window.auth = new Auth();