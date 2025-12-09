import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import db from '../utils/db.js';

const router = Router();

// GET /api/quality/inspections - List quality inspections
router.get('/inspections', (req, res) => {
  try {
    const { device_id, result, defect_type, limit = 50, offset = 0 } = req.query;

    let query = `
      SELECT qi.*, d.name as device_name, d.device_uid
      FROM quality_inspections qi
      JOIN devices d ON qi.device_id = d.id
      WHERE 1=1
    `;
    const params = [];

    if (device_id) { query += ' AND qi.device_id = ?'; params.push(device_id); }
    if (result) { query += ' AND qi.result = ?'; params.push(result); }
    if (defect_type) { query += ' AND qi.defect_type = ?'; params.push(defect_type); }

    query += ' ORDER BY qi.inspection_timestamp DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));

    const inspections = db.prepare(query).all(...params);

    res.json({ inspections });
  } catch (error) {
    console.error('List inspections error:', error);
    res.status(500).json({ error: { message: 'Failed to list inspections', code: 'LIST_ERROR' } });
  }
});

// GET /api/quality/inspections/:id - Get inspection details
router.get('/inspections/:id', (req, res) => {
  try {
    const inspection = db.prepare(`
      SELECT qi.*, d.name as device_name, d.device_uid, d.type as device_type,
             dg.name as group_name, f.name as facility_name,
             u.name as override_by_name
      FROM quality_inspections qi
      JOIN devices d ON qi.device_id = d.id
      LEFT JOIN device_groups dg ON d.device_group_id = dg.id
      LEFT JOIN facilities f ON dg.facility_id = f.id
      LEFT JOIN users u ON qi.override_by = u.id
      WHERE qi.id = ?
    `).get(req.params.id);

    if (!inspection) {
      return res.status(404).json({ error: { message: 'Inspection not found', code: 'NOT_FOUND' } });
    }

    res.json({ inspection });
  } catch (error) {
    console.error('Get inspection error:', error);
    res.status(500).json({ error: { message: 'Failed to get inspection', code: 'GET_ERROR' } });
  }
});

// POST /api/quality/inspections/:id/override - Human override result
router.post('/inspections/:id/override', (req, res) => {
  try {
    const { override_result, override_by, notes } = req.body;

    if (!override_result) {
      return res.status(400).json({ error: { message: 'override_result is required', code: 'VALIDATION_ERROR' } });
    }

    db.prepare(`
      UPDATE quality_inspections
      SET human_override = 1, override_result = ?, override_by = ?, notes = ?
      WHERE id = ?
    `).run(override_result, override_by, notes, req.params.id);

    const inspection = db.prepare('SELECT * FROM quality_inspections WHERE id = ?').get(req.params.id);
    res.json({ inspection, message: 'Override applied' });
  } catch (error) {
    console.error('Override inspection error:', error);
    res.status(500).json({ error: { message: 'Failed to override inspection', code: 'OVERRIDE_ERROR' } });
  }
});

// GET /api/quality/metrics - Get quality metrics summary
router.get('/metrics', (req, res) => {
  try {
    const { device_id, from, to } = req.query;

    let whereClause = '1=1';
    const params = [];

    if (device_id) { whereClause += ' AND device_id = ?'; params.push(device_id); }
    if (from) { whereClause += ' AND inspection_timestamp >= ?'; params.push(from); }
    if (to) { whereClause += ' AND inspection_timestamp <= ?'; params.push(to); }

    const total = db.prepare(`SELECT COUNT(*) as count FROM quality_inspections WHERE ${whereClause}`).get(...params);
    const passed = db.prepare(`SELECT COUNT(*) as count FROM quality_inspections WHERE ${whereClause} AND result = 'pass'`).get(...params);
    const failed = db.prepare(`SELECT COUNT(*) as count FROM quality_inspections WHERE ${whereClause} AND result = 'fail'`).get(...params);
    const warning = db.prepare(`SELECT COUNT(*) as count FROM quality_inspections WHERE ${whereClause} AND result = 'warning'`).get(...params);
    const overrides = db.prepare(`SELECT COUNT(*) as count FROM quality_inspections WHERE ${whereClause} AND human_override = 1`).get(...params);

    const avgConfidence = db.prepare(`SELECT AVG(confidence_score) as avg FROM quality_inspections WHERE ${whereClause}`).get(...params);

    // Get defect distribution
    const defects = db.prepare(`
      SELECT defect_type, COUNT(*) as count
      FROM quality_inspections
      WHERE ${whereClause} AND defect_type IS NOT NULL
      GROUP BY defect_type
      ORDER BY count DESC
    `).all(...params);

    res.json({
      metrics: {
        total: total.count,
        passed: passed.count,
        failed: failed.count,
        warning: warning.count,
        overrides: overrides.count,
        pass_rate: total.count > 0 ? (passed.count / total.count * 100).toFixed(2) : 0,
        average_confidence: avgConfidence.avg?.toFixed(4) || 0,
        defect_distribution: defects
      }
    });
  } catch (error) {
    console.error('Get metrics error:', error);
    res.status(500).json({ error: { message: 'Failed to get metrics', code: 'GET_ERROR' } });
  }
});

// GET /api/quality/trends - Get quality trends over time
router.get('/trends', (req, res) => {
  try {
    const { device_id, interval = 'day', limit = 30 } = req.query;

    let dateFormat;
    switch (interval) {
      case 'hour':
        dateFormat = '%Y-%m-%d %H:00:00';
        break;
      case 'week':
        dateFormat = '%Y-%W';
        break;
      case 'month':
        dateFormat = '%Y-%m';
        break;
      default:
        dateFormat = '%Y-%m-%d';
    }

    let query = `
      SELECT
        strftime('${dateFormat}', inspection_timestamp) as period,
        COUNT(*) as total,
        SUM(CASE WHEN result = 'pass' THEN 1 ELSE 0 END) as passed,
        SUM(CASE WHEN result = 'fail' THEN 1 ELSE 0 END) as failed,
        AVG(confidence_score) as avg_confidence
      FROM quality_inspections
    `;
    const params = [];

    if (device_id) {
      query += ' WHERE device_id = ?';
      params.push(device_id);
    }

    query += ` GROUP BY period ORDER BY period DESC LIMIT ?`;
    params.push(parseInt(limit));

    const trends = db.prepare(query).all(...params);

    res.json({
      trends: trends.map(t => ({
        ...t,
        pass_rate: t.total > 0 ? (t.passed / t.total * 100).toFixed(2) : 0
      }))
    });
  } catch (error) {
    console.error('Get trends error:', error);
    res.status(500).json({ error: { message: 'Failed to get trends', code: 'GET_ERROR' } });
  }
});

// POST /api/quality/generate-inspections - Generate simulated inspections
router.post('/generate-inspections', (req, res) => {
  try {
    const { count = 20 } = req.body;

    const devices = db.prepare('SELECT id FROM devices WHERE type = "camera" OR is_active = 1').all();
    if (devices.length === 0) {
      return res.status(400).json({ error: { message: 'No devices available', code: 'NO_DEVICES' } });
    }

    const defectTypes = ['scratch', 'dent', 'discoloration', 'misalignment', 'dimension_error', null];
    const results = ['pass', 'pass', 'pass', 'pass', 'fail', 'warning']; // Weighted towards pass

    const createdInspections = [];
    const stmt = db.prepare(`
      INSERT INTO quality_inspections (id, device_id, inspection_timestamp, result, defect_type, confidence_score, image_reference)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    for (let i = 0; i < count; i++) {
      const device = devices[Math.floor(Math.random() * devices.length)];
      const result = results[Math.floor(Math.random() * results.length)];
      const defect = result === 'fail' ? defectTypes[Math.floor(Math.random() * (defectTypes.length - 1))] : null;
      const timestamp = new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString();
      const confidence = 0.7 + Math.random() * 0.28;
      const imageRef = `inspection_${Date.now()}_${i}.jpg`;

      const id = uuidv4();
      stmt.run(id, device.id, timestamp, result, defect, confidence, imageRef);

      createdInspections.push({ id, result, defect_type: defect });
    }

    res.json({ inspections: createdInspections, count: createdInspections.length });
  } catch (error) {
    console.error('Generate inspections error:', error);
    res.status(500).json({ error: { message: 'Failed to generate inspections', code: 'GENERATE_ERROR' } });
  }
});

export default router;
