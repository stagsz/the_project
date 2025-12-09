import { Router } from 'express';
import db from '../utils/db.js';

const router = Router();

// GET /api/notifications - List notifications
router.get('/', (req, res) => {
  try {
    const { user_id, unread_only, type, limit = 50, offset = 0 } = req.query;

    let query = 'SELECT * FROM notifications WHERE 1=1';
    const params = [];

    if (user_id) { query += ' AND user_id = ?'; params.push(user_id); }
    if (unread_only === 'true') { query += ' AND is_read = 0'; }
    if (type) { query += ' AND type = ?'; params.push(type); }

    query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));

    const notifications = db.prepare(query).all(...params);

    // Get unread count
    let countQuery = 'SELECT COUNT(*) as count FROM notifications WHERE is_read = 0';
    const countParams = [];
    if (user_id) { countQuery += ' AND user_id = ?'; countParams.push(user_id); }
    const { count: unreadCount } = db.prepare(countQuery).get(...countParams);

    res.json({
      notifications: notifications.map(n => ({
        ...n,
        data: JSON.parse(n.data || '{}')
      })),
      unread_count: unreadCount
    });
  } catch (error) {
    console.error('List notifications error:', error);
    res.status(500).json({ error: { message: 'Failed to list notifications', code: 'LIST_ERROR' } });
  }
});

// PUT /api/notifications/:id/read - Mark as read
router.put('/:id/read', (req, res) => {
  try {
    db.prepare('UPDATE notifications SET is_read = 1 WHERE id = ?').run(req.params.id);

    const notification = db.prepare('SELECT * FROM notifications WHERE id = ?').get(req.params.id);
    res.json({
      notification: {
        ...notification,
        data: JSON.parse(notification.data || '{}')
      }
    });
  } catch (error) {
    console.error('Mark read error:', error);
    res.status(500).json({ error: { message: 'Failed to mark notification as read', code: 'UPDATE_ERROR' } });
  }
});

// PUT /api/notifications/read-all - Mark all as read
router.put('/read-all', (req, res) => {
  try {
    const { user_id } = req.body;

    let query = 'UPDATE notifications SET is_read = 1';
    const params = [];

    if (user_id) {
      query += ' WHERE user_id = ?';
      params.push(user_id);
    }

    const result = db.prepare(query).run(...params);

    res.json({ message: 'All notifications marked as read', updated: result.changes });
  } catch (error) {
    console.error('Mark all read error:', error);
    res.status(500).json({ error: { message: 'Failed to mark all as read', code: 'UPDATE_ERROR' } });
  }
});

// DELETE /api/notifications/:id - Delete notification
router.delete('/:id', (req, res) => {
  try {
    db.prepare('DELETE FROM notifications WHERE id = ?').run(req.params.id);
    res.json({ message: 'Notification deleted' });
  } catch (error) {
    console.error('Delete notification error:', error);
    res.status(500).json({ error: { message: 'Failed to delete notification', code: 'DELETE_ERROR' } });
  }
});

export default router;
