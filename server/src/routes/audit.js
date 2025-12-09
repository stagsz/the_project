import { Router } from 'express';
import db from '../utils/db.js';

const router = Router();

// GET /api/audit/logs - Get audit logs
router.get('/logs', (req, res) => {
  try {
    const { user_id, action, entity_type, from, to, limit = 100, offset = 0 } = req.query;

    let query = `
      SELECT al.*, u.name as user_name, u.email as user_email
      FROM audit_logs al
      LEFT JOIN users u ON al.user_id = u.id
      WHERE 1=1
    `;
    const params = [];

    if (user_id) { query += ' AND al.user_id = ?'; params.push(user_id); }
    if (action) { query += ' AND al.action = ?'; params.push(action); }
    if (entity_type) { query += ' AND al.entity_type = ?'; params.push(entity_type); }
    if (from) { query += ' AND al.timestamp >= ?'; params.push(from); }
    if (to) { query += ' AND al.timestamp <= ?'; params.push(to); }

    query += ' ORDER BY al.timestamp DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));

    const logs = db.prepare(query).all(...params);

    // Get total count
    let countQuery = 'SELECT COUNT(*) as count FROM audit_logs WHERE 1=1';
    const countParams = [];
    if (user_id) { countQuery += ' AND user_id = ?'; countParams.push(user_id); }
    if (action) { countQuery += ' AND action = ?'; countParams.push(action); }
    if (entity_type) { countQuery += ' AND entity_type = ?'; countParams.push(entity_type); }
    if (from) { countQuery += ' AND timestamp >= ?'; countParams.push(from); }
    if (to) { countQuery += ' AND timestamp <= ?'; countParams.push(to); }

    const { count } = db.prepare(countQuery).get(...countParams);

    res.json({
      logs: logs.map(l => ({
        ...l,
        old_values: l.old_values ? JSON.parse(l.old_values) : null,
        new_values: l.new_values ? JSON.parse(l.new_values) : null
      })),
      total: count
    });
  } catch (error) {
    console.error('List audit logs error:', error);
    res.status(500).json({ error: { message: 'Failed to list audit logs', code: 'LIST_ERROR' } });
  }
});

// GET /api/audit/logs/:id - Get audit log details
router.get('/logs/:id', (req, res) => {
  try {
    const log = db.prepare(`
      SELECT al.*, u.name as user_name, u.email as user_email
      FROM audit_logs al
      LEFT JOIN users u ON al.user_id = u.id
      WHERE al.id = ?
    `).get(req.params.id);

    if (!log) {
      return res.status(404).json({ error: { message: 'Audit log not found', code: 'NOT_FOUND' } });
    }

    res.json({
      log: {
        ...log,
        old_values: log.old_values ? JSON.parse(log.old_values) : null,
        new_values: log.new_values ? JSON.parse(log.new_values) : null
      }
    });
  } catch (error) {
    console.error('Get audit log error:', error);
    res.status(500).json({ error: { message: 'Failed to get audit log', code: 'GET_ERROR' } });
  }
});

// GET /api/audit/summary - Get audit summary (for dashboard)
router.get('/summary', (req, res) => {
  try {
    const { days = 7 } = req.query;

    // Actions by type
    const byAction = db.prepare(`
      SELECT action, COUNT(*) as count
      FROM audit_logs
      WHERE timestamp > datetime('now', '-${parseInt(days)} days')
      GROUP BY action
      ORDER BY count DESC
    `).all();

    // Actions by user
    const byUser = db.prepare(`
      SELECT u.name, u.email, COUNT(*) as count
      FROM audit_logs al
      JOIN users u ON al.user_id = u.id
      WHERE al.timestamp > datetime('now', '-${parseInt(days)} days')
      GROUP BY al.user_id
      ORDER BY count DESC
      LIMIT 10
    `).all();

    // Actions by entity type
    const byEntity = db.prepare(`
      SELECT entity_type, COUNT(*) as count
      FROM audit_logs
      WHERE timestamp > datetime('now', '-${parseInt(days)} days')
      GROUP BY entity_type
      ORDER BY count DESC
    `).all();

    // Recent activity
    const recent = db.prepare(`
      SELECT al.*, u.name as user_name
      FROM audit_logs al
      LEFT JOIN users u ON al.user_id = u.id
      ORDER BY al.timestamp DESC
      LIMIT 10
    `).all();

    res.json({
      by_action: byAction,
      by_user: byUser,
      by_entity: byEntity,
      recent: recent.map(l => ({
        ...l,
        old_values: l.old_values ? JSON.parse(l.old_values) : null,
        new_values: l.new_values ? JSON.parse(l.new_values) : null
      }))
    });
  } catch (error) {
    console.error('Get audit summary error:', error);
    res.status(500).json({ error: { message: 'Failed to get audit summary', code: 'GET_ERROR' } });
  }
});

export default router;
