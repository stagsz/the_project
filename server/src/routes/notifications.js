import { Router } from 'express';
import supabase from '../utils/supabase.js';

const router = Router();

// GET /api/notifications - List notifications
router.get('/', async (req, res) => {
  try {
    const { user_id, unread_only, type, limit = 50, offset = 0 } = req.query;

    let query = supabase
      .from('notifications')
      .select('*')
      .order('created_at', { ascending: false })
      .range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1);

    if (user_id) query = query.eq('user_id', user_id);
    if (unread_only === 'true') query = query.eq('is_read', false);
    if (type) query = query.eq('type', type);

    const { data: notifications, error } = await query;

    if (error) throw error;

    // Get unread count
    let countQuery = supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('is_read', false);

    if (user_id) countQuery = countQuery.eq('user_id', user_id);

    const { count: unreadCount } = await countQuery;

    res.json({
      notifications: (notifications || []).map(n => ({
        ...n,
        data: n.data || {}
      })),
      unread_count: unreadCount || 0
    });
  } catch (error) {
    console.error('List notifications error:', error);
    res.status(500).json({ error: { message: 'Failed to list notifications', code: 'LIST_ERROR' } });
  }
});

// PUT /api/notifications/:id/read - Mark as read
router.put('/:id/read', async (req, res) => {
  try {
    await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', req.params.id);

    const { data: notification } = await supabase
      .from('notifications')
      .select('*')
      .eq('id', req.params.id)
      .single();

    res.json({
      notification: {
        ...notification,
        data: notification.data || {}
      }
    });
  } catch (error) {
    console.error('Mark read error:', error);
    res.status(500).json({ error: { message: 'Failed to mark notification as read', code: 'UPDATE_ERROR' } });
  }
});

// PUT /api/notifications/read-all - Mark all as read
router.put('/read-all', async (req, res) => {
  try {
    const { user_id } = req.body;

    let query = supabase
      .from('notifications')
      .update({ is_read: true });

    if (user_id) {
      query = query.eq('user_id', user_id);
    }

    const { error } = await query;

    if (error) throw error;

    res.json({ message: 'All notifications marked as read' });
  } catch (error) {
    console.error('Mark all read error:', error);
    res.status(500).json({ error: { message: 'Failed to mark all as read', code: 'UPDATE_ERROR' } });
  }
});

// DELETE /api/notifications/:id - Delete notification
router.delete('/:id', async (req, res) => {
  try {
    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('id', req.params.id);

    if (error) throw error;

    res.json({ message: 'Notification deleted' });
  } catch (error) {
    console.error('Delete notification error:', error);
    res.status(500).json({ error: { message: 'Failed to delete notification', code: 'DELETE_ERROR' } });
  }
});

export default router;
