import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import db from '../utils/db.js';

const router = Router();

// GET /api/maintenance/predictions - List maintenance predictions
router.get('/predictions', (req, res) => {
  try {
    const { device_id, status, risk_level, limit = 50, offset = 0 } = req.query;

    let query = `
      SELECT mp.*, d.name as device_name, d.device_uid
      FROM maintenance_predictions mp
      JOIN devices d ON mp.device_id = d.id
      WHERE 1=1
    `;
    const params = [];

    if (device_id) { query += ' AND mp.device_id = ?'; params.push(device_id); }
    if (status) { query += ' AND mp.status = ?'; params.push(status); }
    if (risk_level) { query += ' AND mp.risk_level = ?'; params.push(risk_level); }

    query += ' ORDER BY mp.predicted_date ASC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));

    const predictions = db.prepare(query).all(...params);

    res.json({ predictions });
  } catch (error) {
    console.error('List predictions error:', error);
    res.status(500).json({ error: { message: 'Failed to list predictions', code: 'LIST_ERROR' } });
  }
});

// GET /api/maintenance/predictions/:id - Get prediction details
router.get('/predictions/:id', (req, res) => {
  try {
    const prediction = db.prepare(`
      SELECT mp.*, d.name as device_name, d.device_uid, d.type as device_type,
             dg.name as group_name, f.name as facility_name
      FROM maintenance_predictions mp
      JOIN devices d ON mp.device_id = d.id
      LEFT JOIN device_groups dg ON d.device_group_id = dg.id
      LEFT JOIN facilities f ON dg.facility_id = f.id
      WHERE mp.id = ?
    `).get(req.params.id);

    if (!prediction) {
      return res.status(404).json({ error: { message: 'Prediction not found', code: 'NOT_FOUND' } });
    }

    // Get device health history
    const recentMetrics = db.prepare(`
      SELECT timestamp, cpu_usage, memory_usage, temperature_celsius, error_count
      FROM device_metrics
      WHERE device_id = ?
      ORDER BY timestamp DESC
      LIMIT 20
    `).all(prediction.device_id);

    res.json({
      prediction: {
        ...prediction,
        device_health_history: recentMetrics
      }
    });
  } catch (error) {
    console.error('Get prediction error:', error);
    res.status(500).json({ error: { message: 'Failed to get prediction', code: 'GET_ERROR' } });
  }
});

// PUT /api/maintenance/predictions/:id - Update prediction status
router.put('/predictions/:id', (req, res) => {
  try {
    const { status, recommended_action, estimated_cost } = req.body;

    const updates = [];
    const params = [];

    if (status) { updates.push('status = ?'); params.push(status); }
    if (recommended_action !== undefined) { updates.push('recommended_action = ?'); params.push(recommended_action); }
    if (estimated_cost !== undefined) { updates.push('estimated_cost = ?'); params.push(estimated_cost); }

    updates.push('updated_at = datetime("now")');
    params.push(req.params.id);

    db.prepare(`UPDATE maintenance_predictions SET ${updates.join(', ')} WHERE id = ?`).run(...params);

    const prediction = db.prepare('SELECT * FROM maintenance_predictions WHERE id = ?').get(req.params.id);
    res.json({ prediction });
  } catch (error) {
    console.error('Update prediction error:', error);
    res.status(500).json({ error: { message: 'Failed to update prediction', code: 'UPDATE_ERROR' } });
  }
});

// POST /api/maintenance/schedule - Schedule maintenance
router.post('/schedule', (req, res) => {
  try {
    const { prediction_id, scheduled_date, notes } = req.body;

    if (!prediction_id) {
      return res.status(400).json({ error: { message: 'prediction_id is required', code: 'VALIDATION_ERROR' } });
    }

    // Update prediction status to scheduled
    db.prepare(`
      UPDATE maintenance_predictions
      SET status = 'scheduled', predicted_date = ?, updated_at = datetime('now')
      WHERE id = ?
    `).run(scheduled_date || new Date().toISOString(), prediction_id);

    const prediction = db.prepare(`
      SELECT mp.*, d.name as device_name
      FROM maintenance_predictions mp
      JOIN devices d ON mp.device_id = d.id
      WHERE mp.id = ?
    `).get(prediction_id);

    // Create notification
    const users = db.prepare('SELECT id FROM users WHERE role IN ("admin", "operator")').all();
    const notifStmt = db.prepare(`
      INSERT INTO notifications (id, user_id, type, title, message, severity, data)
      VALUES (?, ?, 'maintenance_alert', ?, ?, 'info', ?)
    `);

    for (const user of users) {
      notifStmt.run(
        uuidv4(),
        user.id,
        'maintenance_alert',
        `Maintenance Scheduled: ${prediction.device_name}`,
        `${prediction.component} maintenance scheduled for ${scheduled_date || 'soon'}`,
        JSON.stringify({ prediction_id, device_id: prediction.device_id })
      );
    }

    res.json({ prediction, message: 'Maintenance scheduled' });
  } catch (error) {
    console.error('Schedule maintenance error:', error);
    res.status(500).json({ error: { message: 'Failed to schedule maintenance', code: 'SCHEDULE_ERROR' } });
  }
});

// GET /api/maintenance/history - Get maintenance history
router.get('/history', (req, res) => {
  try {
    const { device_id, from, to, limit = 100, offset = 0 } = req.query;

    let query = `
      SELECT mp.*, d.name as device_name, d.device_uid
      FROM maintenance_predictions mp
      JOIN devices d ON mp.device_id = d.id
      WHERE mp.status = 'completed'
    `;
    const params = [];

    if (device_id) { query += ' AND mp.device_id = ?'; params.push(device_id); }
    if (from) { query += ' AND mp.updated_at >= ?'; params.push(from); }
    if (to) { query += ' AND mp.updated_at <= ?'; params.push(to); }

    query += ' ORDER BY mp.updated_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));

    const history = db.prepare(query).all(...params);

    res.json({ history });
  } catch (error) {
    console.error('Get history error:', error);
    res.status(500).json({ error: { message: 'Failed to get history', code: 'GET_ERROR' } });
  }
});

// POST /api/maintenance/generate-predictions - Generate maintenance predictions (simulation)
router.post('/generate-predictions', (req, res) => {
  try {
    const devices = db.prepare('SELECT id, name, type FROM devices WHERE is_active = 1').all();
    const components = ['Motor', 'Bearing', 'Seal', 'Filter', 'Belt', 'Pump', 'Compressor'];
    const actions = [
      'Replace worn component',
      'Perform preventive maintenance',
      'Inspect and lubricate',
      'Clean and calibrate',
      'Check alignment'
    ];

    const createdPredictions = [];
    const stmt = db.prepare(`
      INSERT INTO maintenance_predictions (id, device_id, component, prediction_type, predicted_date, confidence_score, risk_level, recommended_action, estimated_cost)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (const device of devices) {
      // 30% chance to generate a prediction for each device
      if (Math.random() > 0.3) continue;

      const component = components[Math.floor(Math.random() * components.length)];
      const types = ['failure', 'degradation', 'replacement_needed'];
      const riskLevels = ['low', 'medium', 'high', 'critical'];

      const id = uuidv4();
      const predictionType = types[Math.floor(Math.random() * types.length)];
      const daysOut = Math.floor(Math.random() * 60) + 1;
      const predictedDate = new Date(Date.now() + daysOut * 24 * 60 * 60 * 1000).toISOString();
      const confidence = 0.6 + Math.random() * 0.35;
      const riskLevel = riskLevels[Math.floor(Math.random() * riskLevels.length)];
      const action = actions[Math.floor(Math.random() * actions.length)];
      const cost = Math.floor(Math.random() * 5000) + 100;

      stmt.run(id, device.id, component, predictionType, predictedDate, confidence, riskLevel, action, cost);

      createdPredictions.push({
        id,
        device_name: device.name,
        component,
        prediction_type: predictionType,
        risk_level: riskLevel
      });
    }

    res.json({ predictions: createdPredictions, count: createdPredictions.length });
  } catch (error) {
    console.error('Generate predictions error:', error);
    res.status(500).json({ error: { message: 'Failed to generate predictions', code: 'GENERATE_ERROR' } });
  }
});

export default router;
