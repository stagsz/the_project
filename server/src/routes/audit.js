import { Router } from 'express';
import supabase from '../utils/supabase.js';

const router = Router();

// GET /api/audit/logs - Get audit logs
router.get('/logs', async (req, res) => {
  try {
    const { user_id, action, entity_type, from, to, limit = 100, offset = 0 } = req.query;

    let query = supabase
      .from('audit_logs')
      .select('*, users(name, email)')
      .order('timestamp', { ascending: false })
      .range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1);

    if (user_id) query = query.eq('user_id', user_id);
    if (action) query = query.eq('action', action);
    if (entity_type) query = query.eq('entity_type', entity_type);
    if (from) query = query.gte('timestamp', from);
    if (to) query = query.lte('timestamp', to);

    const { data: logs, error } = await query;

    if (error) throw error;

    // Get total count
    let countQuery = supabase
      .from('audit_logs')
      .select('*', { count: 'exact', head: true });

    if (user_id) countQuery = countQuery.eq('user_id', user_id);
    if (action) countQuery = countQuery.eq('action', action);
    if (entity_type) countQuery = countQuery.eq('entity_type', entity_type);
    if (from) countQuery = countQuery.gte('timestamp', from);
    if (to) countQuery = countQuery.lte('timestamp', to);

    const { count } = await countQuery;

    res.json({
      logs: (logs || []).map(l => ({
        ...l,
        user_name: l.users?.name || null,
        user_email: l.users?.email || null,
        users: undefined,
        old_values: l.old_values || null,
        new_values: l.new_values || null
      })),
      total: count || 0
    });
  } catch (error) {
    console.error('List audit logs error:', error);
    res.status(500).json({ error: { message: 'Failed to list audit logs', code: 'LIST_ERROR' } });
  }
});

// GET /api/audit/logs/:id - Get audit log details
router.get('/logs/:id', async (req, res) => {
  try {
    const { data: log, error } = await supabase
      .from('audit_logs')
      .select('*, users(name, email)')
      .eq('id', req.params.id)
      .single();

    if (error || !log) {
      return res.status(404).json({ error: { message: 'Audit log not found', code: 'NOT_FOUND' } });
    }

    res.json({
      log: {
        ...log,
        user_name: log.users?.name || null,
        user_email: log.users?.email || null,
        users: undefined,
        old_values: log.old_values || null,
        new_values: log.new_values || null
      }
    });
  } catch (error) {
    console.error('Get audit log error:', error);
    res.status(500).json({ error: { message: 'Failed to get audit log', code: 'GET_ERROR' } });
  }
});

// GET /api/audit/summary - Get audit summary (for dashboard)
router.get('/summary', async (req, res) => {
  try {
    const { days = 7 } = req.query;

    const daysAgo = new Date(Date.now() - parseInt(days) * 24 * 60 * 60 * 1000).toISOString();

    // Get all logs in the time period
    const { data: allLogs } = await supabase
      .from('audit_logs')
      .select('action, entity_type, user_id')
      .gte('timestamp', daysAgo);

    // Group by action
    const byActionCounts = {};
    (allLogs || []).forEach(l => {
      byActionCounts[l.action] = (byActionCounts[l.action] || 0) + 1;
    });
    const byAction = Object.entries(byActionCounts)
      .map(([action, count]) => ({ action, count }))
      .sort((a, b) => b.count - a.count);

    // Group by entity type
    const byEntityCounts = {};
    (allLogs || []).forEach(l => {
      byEntityCounts[l.entity_type] = (byEntityCounts[l.entity_type] || 0) + 1;
    });
    const byEntity = Object.entries(byEntityCounts)
      .map(([entity_type, count]) => ({ entity_type, count }))
      .sort((a, b) => b.count - a.count);

    // Get top users
    const userCounts = {};
    (allLogs || []).forEach(l => {
      if (l.user_id) {
        userCounts[l.user_id] = (userCounts[l.user_id] || 0) + 1;
      }
    });

    const topUserIds = Object.entries(userCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([id]) => id);

    let byUser = [];
    if (topUserIds.length > 0) {
      const { data: users } = await supabase
        .from('users')
        .select('id, name, email')
        .in('id', topUserIds);

      byUser = (users || []).map(u => ({
        name: u.name,
        email: u.email,
        count: userCounts[u.id] || 0
      })).sort((a, b) => b.count - a.count);
    }

    // Get recent activity
    const { data: recent } = await supabase
      .from('audit_logs')
      .select('*, users(name)')
      .order('timestamp', { ascending: false })
      .limit(10);

    res.json({
      by_action: byAction,
      by_user: byUser,
      by_entity: byEntity,
      recent: (recent || []).map(l => ({
        ...l,
        user_name: l.users?.name || null,
        users: undefined,
        old_values: l.old_values || null,
        new_values: l.new_values || null
      }))
    });
  } catch (error) {
    console.error('Get audit summary error:', error);
    res.status(500).json({ error: { message: 'Failed to get audit summary', code: 'GET_ERROR' } });
  }
});

export default router;
