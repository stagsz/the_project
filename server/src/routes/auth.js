import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import supabase from '../utils/supabase.js';

const router = Router();

// POST /api/auth/register - Create new user
router.post('/register', async (req, res) => {
  try {
    const { email, name, password, role = 'viewer' } = req.body;

    if (!email || !name || !password) {
      return res.status(400).json({ error: { message: 'Email, name, and password are required', code: 'VALIDATION_ERROR' } });
    }

    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .single();

    if (existingUser) {
      return res.status(409).json({ error: { message: 'User with this email already exists', code: 'USER_EXISTS' } });
    }

    const id = uuidv4();
    const preferences = {
      theme: 'light',
      units: 'SI',
      timezone: 'UTC',
      dateFormat: 'YYYY-MM-DD',
      timeFormat: '24h'
    };

    const { error: insertError } = await supabase
      .from('users')
      .insert({
        id,
        email,
        name,
        password_hash: password,
        role,
        preferences
      });

    if (insertError) {
      throw insertError;
    }

    const { data: user, error: fetchError } = await supabase
      .from('users')
      .select('id, email, name, role, created_at, preferences')
      .eq('id', id)
      .single();

    if (fetchError) {
      throw fetchError;
    }

    res.status(201).json({
      user: {
        ...user,
        preferences: user.preferences || {}
      }
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ error: { message: 'Failed to register user', code: 'REGISTER_ERROR' } });
  }
});

// POST /api/auth/login - User login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: { message: 'Email and password are required', code: 'VALIDATION_ERROR' } });
    }

    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single();

    if (error || !user || user.password_hash !== password) {
      return res.status(401).json({ error: { message: 'Invalid credentials', code: 'INVALID_CREDENTIALS' } });
    }

    // Update last login
    await supabase
      .from('users')
      .update({ last_login: new Date().toISOString() })
      .eq('id', user.id);

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
        preferences: user.preferences || {},
        notification_settings: user.notification_settings || {}
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
router.get('/me', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: { message: 'No token provided', code: 'NO_TOKEN' } });
    }

    const token = authHeader.substring(7);
    const decoded = Buffer.from(token, 'base64').toString('utf-8');
    const [userId] = decoded.split(':');

    const { data: user, error } = await supabase
      .from('users')
      .select('id, email, name, role, avatar_url, created_at, last_login, preferences, notification_settings')
      .eq('id', userId)
      .single();

    if (error || !user) {
      return res.status(401).json({ error: { message: 'Invalid token', code: 'INVALID_TOKEN' } });
    }

    res.json({
      user: {
        ...user,
        preferences: user.preferences || {},
        notification_settings: user.notification_settings || {}
      }
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: { message: 'Failed to get user', code: 'GET_USER_ERROR' } });
  }
});

// PUT /api/auth/profile - Update profile
router.put('/profile', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: { message: 'No token provided', code: 'NO_TOKEN' } });
    }

    const token = authHeader.substring(7);
    const decoded = Buffer.from(token, 'base64').toString('utf-8');
    const [userId] = decoded.split(':');

    const { name, avatar_url, preferences, notification_settings } = req.body;

    const updates = {};

    if (name) updates.name = name;
    if (avatar_url !== undefined) updates.avatar_url = avatar_url;
    if (preferences) updates.preferences = preferences;
    if (notification_settings) updates.notification_settings = notification_settings;

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: { message: 'No updates provided', code: 'NO_UPDATES' } });
    }

    const { error: updateError } = await supabase
      .from('users')
      .update(updates)
      .eq('id', userId);

    if (updateError) {
      throw updateError;
    }

    const { data: user, error: fetchError } = await supabase
      .from('users')
      .select('id, email, name, role, avatar_url, created_at, last_login, preferences, notification_settings')
      .eq('id', userId)
      .single();

    if (fetchError) {
      throw fetchError;
    }

    res.json({
      user: {
        ...user,
        preferences: user.preferences || {},
        notification_settings: user.notification_settings || {}
      }
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: { message: 'Failed to update profile', code: 'UPDATE_ERROR' } });
  }
});

export default router;
