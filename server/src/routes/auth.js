import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import db from '../utils/db.js';

const router = Router();

// POST /api/auth/register - Create new user
router.post('/register', (req, res) => {
  try {
    const { email, name, password, role = 'viewer' } = req.body;

    if (!email || !name || !password) {
      return res.status(400).json({ error: { message: 'Email, name, and password are required', code: 'VALIDATION_ERROR' } });
    }

    const existingUser = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
    if (existingUser) {
      return res.status(409).json({ error: { message: 'User with this email already exists', code: 'USER_EXISTS' } });
    }

    const id = uuidv4();
    const preferences = JSON.stringify({
      theme: 'light',
      units: 'SI',
      timezone: 'UTC',
      dateFormat: 'YYYY-MM-DD',
      timeFormat: '24h'
    });

    db.prepare(`
      INSERT INTO users (id, email, name, password_hash, role, preferences)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(id, email, name, password, role, preferences);

    const user = db.prepare('SELECT id, email, name, role, created_at, preferences FROM users WHERE id = ?').get(id);

    res.status(201).json({
      user: {
        ...user,
        preferences: JSON.parse(user.preferences || '{}')
      }
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ error: { message: 'Failed to register user', code: 'REGISTER_ERROR' } });
  }
});

// POST /api/auth/login - User login
router.post('/login', (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: { message: 'Email and password are required', code: 'VALIDATION_ERROR' } });
    }

    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);

    if (!user || user.password_hash !== password) {
      return res.status(401).json({ error: { message: 'Invalid credentials', code: 'INVALID_CREDENTIALS' } });
    }

    // Update last login
    db.prepare("UPDATE users SET last_login = datetime('now') WHERE id = ?").run(user.id);

    // Simple token (in production, use JWT)
    const token = Buffer.from(`${user.id}:${Date.now()}`).toString('base64');

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        avatar_url: user.avatar_url,
        preferences: JSON.parse(user.preferences || '{}'),
        notification_settings: JSON.parse(user.notification_settings || '{}')
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: { message: 'Failed to login', code: 'LOGIN_ERROR' } });
  }
});

// POST /api/auth/logout - User logout
router.post('/logout', (req, res) => {
  res.json({ message: 'Logged out successfully' });
});

// GET /api/auth/me - Get current user
router.get('/me', (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: { message: 'No token provided', code: 'NO_TOKEN' } });
    }

    const token = authHeader.substring(7);
    const decoded = Buffer.from(token, 'base64').toString('utf-8');
    const [userId] = decoded.split(':');

    const user = db.prepare('SELECT id, email, name, role, avatar_url, created_at, last_login, preferences, notification_settings FROM users WHERE id = ?').get(userId);

    if (!user) {
      return res.status(401).json({ error: { message: 'Invalid token', code: 'INVALID_TOKEN' } });
    }

    res.json({
      user: {
        ...user,
        preferences: JSON.parse(user.preferences || '{}'),
        notification_settings: JSON.parse(user.notification_settings || '{}')
      }
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: { message: 'Failed to get user', code: 'GET_USER_ERROR' } });
  }
});

// PUT /api/auth/profile - Update profile
router.put('/profile', (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: { message: 'No token provided', code: 'NO_TOKEN' } });
    }

    const token = authHeader.substring(7);
    const decoded = Buffer.from(token, 'base64').toString('utf-8');
    const [userId] = decoded.split(':');

    const { name, avatar_url, preferences, notification_settings } = req.body;

    const updates = [];
    const params = [];

    if (name) {
      updates.push('name = ?');
      params.push(name);
    }
    if (avatar_url !== undefined) {
      updates.push('avatar_url = ?');
      params.push(avatar_url);
    }
    if (preferences) {
      updates.push('preferences = ?');
      params.push(JSON.stringify(preferences));
    }
    if (notification_settings) {
      updates.push('notification_settings = ?');
      params.push(JSON.stringify(notification_settings));
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: { message: 'No updates provided', code: 'NO_UPDATES' } });
    }

    params.push(userId);
    db.prepare(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`).run(...params);

    const user = db.prepare('SELECT id, email, name, role, avatar_url, created_at, last_login, preferences, notification_settings FROM users WHERE id = ?').get(userId);

    res.json({
      user: {
        ...user,
        preferences: JSON.parse(user.preferences || '{}'),
        notification_settings: JSON.parse(user.notification_settings || '{}')
      }
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: { message: 'Failed to update profile', code: 'UPDATE_ERROR' } });
  }
});

export default router;
