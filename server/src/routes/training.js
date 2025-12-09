import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import db from '../utils/db.js';

const router = Router();

// GET /api/training/rounds - List training rounds
router.get('/rounds', (req, res) => {
  try {
    const { model_id, status, limit = 50, offset = 0 } = req.query;

    let query = `
      SELECT tr.*, m.name as model_name, m.model_type
      FROM training_rounds tr
      JOIN models m ON tr.model_id = m.id
      WHERE 1=1
    `;
    const params = [];

    if (model_id) { query += ' AND tr.model_id = ?'; params.push(model_id); }
    if (status) { query += ' AND tr.status = ?'; params.push(status); }

    query += ' ORDER BY tr.created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));

    const rounds = db.prepare(query).all(...params);

    res.json({
      rounds: rounds.map(r => ({
        ...r,
        target_devices: JSON.parse(r.target_devices || '[]'),
        participating_devices: JSON.parse(r.participating_devices || '[]'),
        hyperparameters: JSON.parse(r.hyperparameters || '{}'),
        privacy_config: JSON.parse(r.privacy_config || '{}'),
        result_metrics: JSON.parse(r.result_metrics || '{}')
      }))
    });
  } catch (error) {
    console.error('List training rounds error:', error);
    res.status(500).json({ error: { message: 'Failed to list training rounds', code: 'LIST_ERROR' } });
  }
});

// POST /api/training/rounds - Start new training round
router.post('/rounds', (req, res) => {
  try {
    const {
      model_id,
      target_devices,
      hyperparameters = { learning_rate: 0.01, batch_size: 32, local_epochs: 5 },
      privacy_config = { epsilon: 1.0, delta: 1e-5, noise_multiplier: 1.1 },
      aggregation_method = 'fedavg',
      created_by
    } = req.body;

    if (!model_id) {
      return res.status(400).json({ error: { message: 'model_id is required', code: 'VALIDATION_ERROR' } });
    }

    // Get next round number
    const lastRound = db.prepare('SELECT MAX(round_number) as max_round FROM training_rounds WHERE model_id = ?').get(model_id);
    const roundNumber = (lastRound.max_round || 0) + 1;

    const id = uuidv4();
    db.prepare(`
      INSERT INTO training_rounds (id, model_id, round_number, target_devices, hyperparameters, privacy_config, aggregation_method, created_by, status, started_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'in_progress', datetime('now'))
    `).run(
      id, model_id, roundNumber,
      JSON.stringify(target_devices || []),
      JSON.stringify(hyperparameters),
      JSON.stringify(privacy_config),
      aggregation_method,
      created_by
    );

    // Create device training contributions
    const devices = target_devices || [];
    if (devices.length === 0) {
      // Get all online devices
      const onlineDevices = db.prepare('SELECT id FROM devices WHERE status = "online" AND is_active = 1').all();
      devices.push(...onlineDevices.map(d => d.id));
    }

    const contribStmt = db.prepare(`
      INSERT INTO device_training_contributions (id, training_round_id, device_id, status)
      VALUES (?, ?, ?, 'pending')
    `);

    for (const deviceId of devices) {
      contribStmt.run(uuidv4(), id, deviceId);
    }

    // Update participating devices
    db.prepare('UPDATE training_rounds SET participating_devices = ? WHERE id = ?').run(JSON.stringify(devices), id);

    const round = db.prepare('SELECT * FROM training_rounds WHERE id = ?').get(id);

    res.status(201).json({
      round: {
        ...round,
        target_devices: JSON.parse(round.target_devices || '[]'),
        participating_devices: JSON.parse(round.participating_devices || '[]'),
        hyperparameters: JSON.parse(round.hyperparameters || '{}'),
        privacy_config: JSON.parse(round.privacy_config || '{}'),
        result_metrics: JSON.parse(round.result_metrics || '{}')
      }
    });
  } catch (error) {
    console.error('Create training round error:', error);
    res.status(500).json({ error: { message: 'Failed to create training round', code: 'CREATE_ERROR' } });
  }
});

// GET /api/training/rounds/:id - Get training round details
router.get('/rounds/:id', (req, res) => {
  try {
    const round = db.prepare(`
      SELECT tr.*, m.name as model_name, m.model_type
      FROM training_rounds tr
      JOIN models m ON tr.model_id = m.id
      WHERE tr.id = ?
    `).get(req.params.id);

    if (!round) {
      return res.status(404).json({ error: { message: 'Training round not found', code: 'NOT_FOUND' } });
    }

    const contributions = db.prepare(`
      SELECT dtc.*, d.name as device_name, d.device_uid
      FROM device_training_contributions dtc
      JOIN devices d ON dtc.device_id = d.id
      WHERE dtc.training_round_id = ?
    `).all(req.params.id);

    res.json({
      round: {
        ...round,
        target_devices: JSON.parse(round.target_devices || '[]'),
        participating_devices: JSON.parse(round.participating_devices || '[]'),
        hyperparameters: JSON.parse(round.hyperparameters || '{}'),
        privacy_config: JSON.parse(round.privacy_config || '{}'),
        result_metrics: JSON.parse(round.result_metrics || '{}'),
        contributions: contributions.map(c => ({
          ...c,
          local_metrics: JSON.parse(c.local_metrics || '{}')
        }))
      }
    });
  } catch (error) {
    console.error('Get training round error:', error);
    res.status(500).json({ error: { message: 'Failed to get training round', code: 'GET_ERROR' } });
  }
});

// PUT /api/training/rounds/:id - Update training round (pause/resume)
router.put('/rounds/:id', (req, res) => {
  try {
    const { status } = req.body;

    if (!['pending', 'in_progress', 'cancelled'].includes(status)) {
      return res.status(400).json({ error: { message: 'Invalid status', code: 'VALIDATION_ERROR' } });
    }

    db.prepare('UPDATE training_rounds SET status = ? WHERE id = ?').run(status, req.params.id);

    const round = db.prepare('SELECT * FROM training_rounds WHERE id = ?').get(req.params.id);
    res.json({
      round: {
        ...round,
        target_devices: JSON.parse(round.target_devices || '[]'),
        participating_devices: JSON.parse(round.participating_devices || '[]'),
        hyperparameters: JSON.parse(round.hyperparameters || '{}'),
        privacy_config: JSON.parse(round.privacy_config || '{}'),
        result_metrics: JSON.parse(round.result_metrics || '{}')
      }
    });
  } catch (error) {
    console.error('Update training round error:', error);
    res.status(500).json({ error: { message: 'Failed to update training round', code: 'UPDATE_ERROR' } });
  }
});

// DELETE /api/training/rounds/:id - Cancel training round
router.delete('/rounds/:id', (req, res) => {
  try {
    db.prepare('UPDATE training_rounds SET status = "cancelled" WHERE id = ?').run(req.params.id);
    db.prepare('UPDATE device_training_contributions SET status = "failed" WHERE training_round_id = ? AND status != "completed"').run(req.params.id);
    res.json({ message: 'Training round cancelled' });
  } catch (error) {
    console.error('Cancel training round error:', error);
    res.status(500).json({ error: { message: 'Failed to cancel training round', code: 'CANCEL_ERROR' } });
  }
});

// GET /api/training/rounds/:id/contributions - Get device contributions
router.get('/rounds/:id/contributions', (req, res) => {
  try {
    const contributions = db.prepare(`
      SELECT dtc.*, d.name as device_name, d.device_uid, d.type as device_type
      FROM device_training_contributions dtc
      JOIN devices d ON dtc.device_id = d.id
      WHERE dtc.training_round_id = ?
      ORDER BY dtc.upload_timestamp DESC
    `).all(req.params.id);

    res.json({
      contributions: contributions.map(c => ({
        ...c,
        local_metrics: JSON.parse(c.local_metrics || '{}')
      }))
    });
  } catch (error) {
    console.error('Get contributions error:', error);
    res.status(500).json({ error: { message: 'Failed to get contributions', code: 'GET_ERROR' } });
  }
});

// POST /api/training/rounds/:id/aggregate - Trigger aggregation
router.post('/rounds/:id/aggregate', (req, res) => {
  try {
    // Update round status to aggregating
    db.prepare('UPDATE training_rounds SET status = "aggregating" WHERE id = ?').run(req.params.id);

    const round = db.prepare('SELECT * FROM training_rounds WHERE id = ?').get(req.params.id);
    const contributions = db.prepare(`
      SELECT * FROM device_training_contributions
      WHERE training_round_id = ? AND status = 'completed'
    `).all(req.params.id);

    // Simulate aggregation (in real system, this would aggregate model weights)
    const aggregatedMetrics = {
      accuracy: 0.85 + Math.random() * 0.1,
      loss: 0.2 + Math.random() * 0.1,
      f1_score: 0.83 + Math.random() * 0.1,
      participating_devices: contributions.length,
      total_samples: contributions.reduce((sum, c) => sum + (c.data_samples_count || 0), 0)
    };

    // Update round as completed
    db.prepare(`
      UPDATE training_rounds
      SET status = 'completed', result_metrics = ?, completed_at = datetime('now')
      WHERE id = ?
    `).run(JSON.stringify(aggregatedMetrics), req.params.id);

    // Create new model version
    const versionId = uuidv4();
    const lastVersion = db.prepare(`
      SELECT version FROM model_versions WHERE model_id = ? ORDER BY created_at DESC LIMIT 1
    `).get(round.model_id);

    const newVersion = incrementVersion(lastVersion?.version || '0.0.0');

    db.prepare(`
      INSERT INTO model_versions (id, model_id, version, metrics, training_round_id, notes)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      versionId,
      round.model_id,
      newVersion,
      JSON.stringify(aggregatedMetrics),
      req.params.id,
      `Aggregated from training round ${round.round_number}`
    );

    // Log privacy budget
    const privacyConfig = JSON.parse(round.privacy_config || '{}');
    db.prepare(`
      INSERT INTO privacy_budget_logs (id, model_id, training_round_id, epsilon_consumed, cumulative_epsilon, budget_limit)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      uuidv4(),
      round.model_id,
      req.params.id,
      privacyConfig.epsilon || 1.0,
      privacyConfig.epsilon || 1.0, // Would accumulate in real system
      10.0 // Default budget limit
    );

    res.json({
      message: 'Aggregation completed',
      version_id: versionId,
      version: newVersion,
      metrics: aggregatedMetrics
    });
  } catch (error) {
    console.error('Aggregate error:', error);
    res.status(500).json({ error: { message: 'Failed to aggregate', code: 'AGGREGATE_ERROR' } });
  }
});

// GET /api/training/rounds/:id/metrics - Get round metrics over time
router.get('/rounds/:id/metrics', (req, res) => {
  try {
    const contributions = db.prepare(`
      SELECT dtc.*, d.name as device_name
      FROM device_training_contributions dtc
      JOIN devices d ON dtc.device_id = d.id
      WHERE dtc.training_round_id = ? AND dtc.status = 'completed'
      ORDER BY dtc.upload_timestamp
    `).all(req.params.id);

    const metrics = contributions.map(c => ({
      device: c.device_name,
      timestamp: c.upload_timestamp,
      ...JSON.parse(c.local_metrics || '{}')
    }));

    res.json({ metrics });
  } catch (error) {
    console.error('Get metrics error:', error);
    res.status(500).json({ error: { message: 'Failed to get metrics', code: 'GET_ERROR' } });
  }
});

// Helper function to increment semver
function incrementVersion(version) {
  const parts = version.split('.').map(Number);
  parts[2]++; // Increment patch version
  return parts.join('.');
}

export default router;
