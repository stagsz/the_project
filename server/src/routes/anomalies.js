import { Router } from 'express';
import db from '../utils/db.js';

const router = Router();

// GET /api/anomalies - List anomalies
router.get('/', (req, res) => {
  try {
    const { device_id, status, severity, type, limit = 50, offset = 0 } = req.query;

    let query = `
      SELECT a.*, d.name as device_name, d.device_uid
      FROM anomalies a
      JOIN devices d ON a.device_id = d.id
      WHERE 1=1
    `;
    const params = [];

    if (device_id) { query += ' AND a.device_id = ?'; params.push(device_id); }
    if (status) { query += ' AND a.status = ?'; params.push(status); }
    if (severity) { query += ' AND a.severity = ?'; params.push(severity); }
    if (type) { query += ' AND a.anomaly_type = ?'; params.push(type); }

    query += ' ORDER BY a.detected_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));

    const anomalies = db.prepare(query).all(...params);

    // Get total count
    let countQuery = 'SELECT COUNT(*) as count FROM anomalies WHERE 1=1';
    const countParams = [];
    if (device_id) { countQuery += ' AND device_id = ?'; countParams.push(device_id); }
    if (status) { countQuery += ' AND status = ?'; countParams.push(status); }
    if (severity) { countQuery += ' AND severity = ?'; countParams.push(severity); }
    if (type) { countQuery += ' AND anomaly_type = ?'; countParams.push(type); }

    const { count } = db.prepare(countQuery).get(...countParams);

    res.json({
      anomalies: anomalies.map(a => ({
        ...a,
        sensor_data: JSON.parse(a.sensor_data || '{}')
      })),
      total: count
    });
  } catch (error) {
    console.error('List anomalies error:', error);
    res.status(500).json({ error: { message: 'Failed to list anomalies', code: 'LIST_ERROR' } });
  }
});

// GET /api/anomalies/:id - Get anomaly details
router.get('/:id', (req, res) => {
  try {
    const anomaly = db.prepare(`
      SELECT a.*, d.name as device_name, d.device_uid, d.type as device_type,
             dg.name as group_name, f.name as facility_name
      FROM anomalies a
      JOIN devices d ON a.device_id = d.id
      LEFT JOIN device_groups dg ON d.device_group_id = dg.id
      LEFT JOIN facilities f ON dg.facility_id = f.id
      WHERE a.id = ?
    `).get(req.params.id);

    if (!anomaly) {
      return res.status(404).json({ error: { message: 'Anomaly not found', code: 'NOT_FOUND' } });
    }

    // Get related anomalies from same device
    const relatedAnomalies = db.prepare(`
      SELECT id, anomaly_type, severity, status, detected_at
      FROM anomalies
      WHERE device_id = ? AND id != ?
      ORDER BY detected_at DESC
      LIMIT 5
    `).all(anomaly.device_id, req.params.id);

    res.json({
      anomaly: {
        ...anomaly,
        sensor_data: JSON.parse(anomaly.sensor_data || '{}'),
        related_anomalies: relatedAnomalies
      }
    });
  } catch (error) {
    console.error('Get anomaly error:', error);
    res.status(500).json({ error: { message: 'Failed to get anomaly', code: 'GET_ERROR' } });
  }
});

// PUT /api/anomalies/:id - Update anomaly status
router.put('/:id', (req, res) => {
  try {
    const { status, resolution_notes, resolved_by } = req.body;

    const updates = [];
    const params = [];

    if (status) { updates.push('status = ?'); params.push(status); }
    if (resolution_notes !== undefined) { updates.push('resolution_notes = ?'); params.push(resolution_notes); }
    if (resolved_by) { updates.push('resolved_by = ?'); params.push(resolved_by); }

    if (status === 'resolved' || status === 'false_alarm') {
      updates.push('resolved_at = datetime("now")');
    }

    params.push(req.params.id);

    db.prepare(`UPDATE anomalies SET ${updates.join(', ')} WHERE id = ?`).run(...params);

    const anomaly = db.prepare('SELECT * FROM anomalies WHERE id = ?').get(req.params.id);
    res.json({
      anomaly: {
        ...anomaly,
        sensor_data: JSON.parse(anomaly.sensor_data || '{}')
      }
    });
  } catch (error) {
    console.error('Update anomaly error:', error);
    res.status(500).json({ error: { message: 'Failed to update anomaly', code: 'UPDATE_ERROR' } });
  }
});

// POST /api/anomalies/:id/acknowledge - Acknowledge anomaly
router.post('/:id/acknowledge', (req, res) => {
  try {
    const { user_id } = req.body;

    db.prepare(`
      UPDATE anomalies SET status = 'acknowledged' WHERE id = ? AND status = 'new'
    `).run(req.params.id);

    // Create audit log
    db.prepare(`
      INSERT INTO audit_logs (id, user_id, action, entity_type, entity_id, new_values)
      VALUES (?, ?, 'acknowledge_anomaly', 'anomaly', ?, '{"status": "acknowledged"}')
    `).run(require('uuid').v4(), user_id, req.params.id);

    const anomaly = db.prepare('SELECT * FROM anomalies WHERE id = ?').get(req.params.id);
    res.json({
      anomaly: {
        ...anomaly,
        sensor_data: JSON.parse(anomaly.sensor_data || '{}')
      },
      message: 'Anomaly acknowledged'
    });
  } catch (error) {
    console.error('Acknowledge anomaly error:', error);
    res.status(500).json({ error: { message: 'Failed to acknowledge anomaly', code: 'ACKNOWLEDGE_ERROR' } });
  }
});

// POST /api/anomalies/:id/resolve - Resolve anomaly
router.post('/:id/resolve', (req, res) => {
  try {
    const { user_id, resolution_notes, mark_as_false_alarm = false } = req.body;

    const status = mark_as_false_alarm ? 'false_alarm' : 'resolved';

    db.prepare(`
      UPDATE anomalies
      SET status = ?, resolved_at = datetime('now'), resolved_by = ?, resolution_notes = ?
      WHERE id = ?
    `).run(status, user_id, resolution_notes, req.params.id);

    const anomaly = db.prepare('SELECT * FROM anomalies WHERE id = ?').get(req.params.id);
    res.json({
      anomaly: {
        ...anomaly,
        sensor_data: JSON.parse(anomaly.sensor_data || '{}')
      },
      message: mark_as_false_alarm ? 'Anomaly marked as false alarm' : 'Anomaly resolved'
    });
  } catch (error) {
    console.error('Resolve anomaly error:', error);
    res.status(500).json({ error: { message: 'Failed to resolve anomaly', code: 'RESOLVE_ERROR' } });
  }
});

export default router;
