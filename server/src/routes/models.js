import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import db from '../utils/db.js';

const router = Router();

// GET /api/models - List models
router.get('/', (req, res) => {
  try {
    const { status, type } = req.query;

    let query = `
      SELECT m.*,
        (SELECT COUNT(*) FROM model_versions mv WHERE mv.model_id = m.id) as version_count,
        (SELECT mv.version FROM model_versions mv WHERE mv.model_id = m.id AND mv.is_deployed = 1 LIMIT 1) as deployed_version
      FROM models m
      WHERE 1=1
    `;
    const params = [];

    if (status) { query += ' AND m.status = ?'; params.push(status); }
    if (type) { query += ' AND m.model_type = ?'; params.push(type); }

    query += ' ORDER BY m.updated_at DESC';

    const models = db.prepare(query).all(...params);

    res.json({
      models: models.map(m => ({
        ...m,
        architecture: JSON.parse(m.architecture || '{}'),
        input_schema: JSON.parse(m.input_schema || '{}'),
        output_schema: JSON.parse(m.output_schema || '{}')
      }))
    });
  } catch (error) {
    console.error('List models error:', error);
    res.status(500).json({ error: { message: 'Failed to list models', code: 'LIST_ERROR' } });
  }
});

// POST /api/models - Create model definition
router.post('/', (req, res) => {
  try {
    const { name, description, model_type, architecture, input_schema, output_schema, target_use_case, created_by } = req.body;

    if (!name || !model_type) {
      return res.status(400).json({ error: { message: 'name and model_type are required', code: 'VALIDATION_ERROR' } });
    }

    const id = uuidv4();
    db.prepare(`
      INSERT INTO models (id, name, description, model_type, architecture, input_schema, output_schema, target_use_case, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id, name, description, model_type,
      JSON.stringify(architecture || {}),
      JSON.stringify(input_schema || {}),
      JSON.stringify(output_schema || {}),
      target_use_case, created_by
    );

    // Create initial version
    const versionId = uuidv4();
    db.prepare(`
      INSERT INTO model_versions (id, model_id, version, weights, metrics, notes)
      VALUES (?, ?, '0.1.0', '{}', '{}', 'Initial version')
    `).run(versionId, id);

    const model = db.prepare('SELECT * FROM models WHERE id = ?').get(id);
    res.status(201).json({
      model: {
        ...model,
        architecture: JSON.parse(model.architecture || '{}'),
        input_schema: JSON.parse(model.input_schema || '{}'),
        output_schema: JSON.parse(model.output_schema || '{}')
      }
    });
  } catch (error) {
    console.error('Create model error:', error);
    res.status(500).json({ error: { message: 'Failed to create model', code: 'CREATE_ERROR' } });
  }
});

// GET /api/models/:id - Get model details
router.get('/:id', (req, res) => {
  try {
    const model = db.prepare('SELECT * FROM models WHERE id = ?').get(req.params.id);

    if (!model) {
      return res.status(404).json({ error: { message: 'Model not found', code: 'NOT_FOUND' } });
    }

    const versions = db.prepare(`
      SELECT * FROM model_versions WHERE model_id = ? ORDER BY created_at DESC
    `).all(req.params.id);

    const recentTraining = db.prepare(`
      SELECT * FROM training_rounds WHERE model_id = ? ORDER BY created_at DESC LIMIT 5
    `).all(req.params.id);

    res.json({
      model: {
        ...model,
        architecture: JSON.parse(model.architecture || '{}'),
        input_schema: JSON.parse(model.input_schema || '{}'),
        output_schema: JSON.parse(model.output_schema || '{}'),
        versions: versions.map(v => ({
          ...v,
          weights: JSON.parse(v.weights || '{}'),
          metrics: JSON.parse(v.metrics || '{}')
        })),
        recent_training: recentTraining.map(t => ({
          ...t,
          hyperparameters: JSON.parse(t.hyperparameters || '{}'),
          privacy_config: JSON.parse(t.privacy_config || '{}'),
          result_metrics: JSON.parse(t.result_metrics || '{}')
        }))
      }
    });
  } catch (error) {
    console.error('Get model error:', error);
    res.status(500).json({ error: { message: 'Failed to get model', code: 'GET_ERROR' } });
  }
});

// PUT /api/models/:id - Update model
router.put('/:id', (req, res) => {
  try {
    const { name, description, architecture, input_schema, output_schema, status } = req.body;

    const updates = [];
    const params = [];

    if (name) { updates.push('name = ?'); params.push(name); }
    if (description !== undefined) { updates.push('description = ?'); params.push(description); }
    if (architecture) { updates.push('architecture = ?'); params.push(JSON.stringify(architecture)); }
    if (input_schema) { updates.push('input_schema = ?'); params.push(JSON.stringify(input_schema)); }
    if (output_schema) { updates.push('output_schema = ?'); params.push(JSON.stringify(output_schema)); }
    if (status) { updates.push('status = ?'); params.push(status); }

    updates.push('updated_at = datetime("now")');
    params.push(req.params.id);

    db.prepare(`UPDATE models SET ${updates.join(', ')} WHERE id = ?`).run(...params);

    const model = db.prepare('SELECT * FROM models WHERE id = ?').get(req.params.id);
    res.json({
      model: {
        ...model,
        architecture: JSON.parse(model.architecture || '{}'),
        input_schema: JSON.parse(model.input_schema || '{}'),
        output_schema: JSON.parse(model.output_schema || '{}')
      }
    });
  } catch (error) {
    console.error('Update model error:', error);
    res.status(500).json({ error: { message: 'Failed to update model', code: 'UPDATE_ERROR' } });
  }
});

// DELETE /api/models/:id - Deprecate model
router.delete('/:id', (req, res) => {
  try {
    db.prepare('UPDATE models SET status = "deprecated", updated_at = datetime("now") WHERE id = ?').run(req.params.id);
    res.json({ message: 'Model deprecated' });
  } catch (error) {
    console.error('Delete model error:', error);
    res.status(500).json({ error: { message: 'Failed to deprecate model', code: 'DELETE_ERROR' } });
  }
});

// GET /api/models/:id/versions - List model versions
router.get('/:id/versions', (req, res) => {
  try {
    const versions = db.prepare(`
      SELECT mv.*, tr.round_number, tr.status as training_status
      FROM model_versions mv
      LEFT JOIN training_rounds tr ON mv.training_round_id = tr.id
      WHERE mv.model_id = ?
      ORDER BY mv.created_at DESC
    `).all(req.params.id);

    res.json({
      versions: versions.map(v => ({
        ...v,
        weights: JSON.parse(v.weights || '{}'),
        metrics: JSON.parse(v.metrics || '{}')
      }))
    });
  } catch (error) {
    console.error('List versions error:', error);
    res.status(500).json({ error: { message: 'Failed to list versions', code: 'LIST_ERROR' } });
  }
});

// GET /api/models/:id/versions/:versionId - Get specific version
router.get('/:id/versions/:versionId', (req, res) => {
  try {
    const version = db.prepare('SELECT * FROM model_versions WHERE id = ? AND model_id = ?').get(req.params.versionId, req.params.id);

    if (!version) {
      return res.status(404).json({ error: { message: 'Version not found', code: 'NOT_FOUND' } });
    }

    res.json({
      version: {
        ...version,
        weights: JSON.parse(version.weights || '{}'),
        metrics: JSON.parse(version.metrics || '{}')
      }
    });
  } catch (error) {
    console.error('Get version error:', error);
    res.status(500).json({ error: { message: 'Failed to get version', code: 'GET_ERROR' } });
  }
});

// POST /api/models/:id/versions - Create new version
router.post('/:id/versions', (req, res) => {
  try {
    const { version, weights, metrics, training_round_id, notes } = req.body;

    if (!version) {
      return res.status(400).json({ error: { message: 'version is required', code: 'VALIDATION_ERROR' } });
    }

    const id = uuidv4();
    db.prepare(`
      INSERT INTO model_versions (id, model_id, version, weights, metrics, training_round_id, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(id, req.params.id, version, JSON.stringify(weights || {}), JSON.stringify(metrics || {}), training_round_id, notes);

    const modelVersion = db.prepare('SELECT * FROM model_versions WHERE id = ?').get(id);
    res.status(201).json({
      version: {
        ...modelVersion,
        weights: JSON.parse(modelVersion.weights || '{}'),
        metrics: JSON.parse(modelVersion.metrics || '{}')
      }
    });
  } catch (error) {
    console.error('Create version error:', error);
    res.status(500).json({ error: { message: 'Failed to create version', code: 'CREATE_ERROR' } });
  }
});

// POST /api/models/:id/deploy - Deploy model version
router.post('/:id/deploy', (req, res) => {
  try {
    const { version_id, device_group_id, deployment_type = 'full', deployed_by } = req.body;

    if (!version_id) {
      return res.status(400).json({ error: { message: 'version_id is required', code: 'VALIDATION_ERROR' } });
    }

    // Get target device count
    let deviceCount = 0;
    if (device_group_id) {
      const result = db.prepare('SELECT COUNT(*) as count FROM devices WHERE device_group_id = ? AND is_active = 1').get(device_group_id);
      deviceCount = result.count;
    } else {
      const result = db.prepare('SELECT COUNT(*) as count FROM devices WHERE is_active = 1').get();
      deviceCount = result.count;
    }

    // Create deployment record
    const deploymentId = uuidv4();
    db.prepare(`
      INSERT INTO model_deployments (id, model_version_id, device_group_id, deployment_type, target_device_count, deployed_by, started_at)
      VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
    `).run(deploymentId, version_id, device_group_id, deployment_type, deviceCount, deployed_by);

    // Mark version as deployed
    db.prepare('UPDATE model_versions SET is_deployed = 1, deployment_count = deployment_count + 1 WHERE id = ?').run(version_id);

    // Update model status to active
    db.prepare('UPDATE models SET status = "active", updated_at = datetime("now") WHERE id = ?').run(req.params.id);

    // Simulate deployment completion
    db.prepare(`
      UPDATE model_deployments
      SET status = 'deployed', successful_device_count = ?, completed_at = datetime('now')
      WHERE id = ?
    `).run(deviceCount, deploymentId);

    const deployment = db.prepare('SELECT * FROM model_deployments WHERE id = ?').get(deploymentId);
    res.json({ deployment, message: 'Model deployed successfully' });
  } catch (error) {
    console.error('Deploy model error:', error);
    res.status(500).json({ error: { message: 'Failed to deploy model', code: 'DEPLOY_ERROR' } });
  }
});

// POST /api/models/:id/rollback - Rollback to previous version
router.post('/:id/rollback', (req, res) => {
  try {
    const { version_id, deployed_by } = req.body;

    if (!version_id) {
      return res.status(400).json({ error: { message: 'version_id is required', code: 'VALIDATION_ERROR' } });
    }

    // Get current deployed version
    const currentVersion = db.prepare('SELECT id FROM model_versions WHERE model_id = ? AND is_deployed = 1').get(req.params.id);

    // Unmark current version
    if (currentVersion) {
      db.prepare('UPDATE model_versions SET is_deployed = 0 WHERE id = ?').run(currentVersion.id);
    }

    // Mark rollback version as deployed
    db.prepare('UPDATE model_versions SET is_deployed = 1, deployment_count = deployment_count + 1 WHERE id = ?').run(version_id);

    // Create deployment record for rollback
    const deploymentId = uuidv4();
    db.prepare(`
      INSERT INTO model_deployments (id, model_version_id, deployment_type, status, rollback_version_id, deployed_by, started_at, completed_at)
      VALUES (?, ?, 'full', 'deployed', ?, ?, datetime('now'), datetime('now'))
    `).run(deploymentId, version_id, currentVersion?.id, deployed_by);

    res.json({ message: 'Rollback successful', deployment_id: deploymentId });
  } catch (error) {
    console.error('Rollback model error:', error);
    res.status(500).json({ error: { message: 'Failed to rollback model', code: 'ROLLBACK_ERROR' } });
  }
});

export default router;
