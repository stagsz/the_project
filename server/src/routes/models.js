import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import supabase from '../utils/supabase.js';

const router = Router();

// GET /api/models - List models
router.get('/', async (req, res) => {
  try {
    const { status, type } = req.query;

    let query = supabase.from('models').select('*').order('updated_at', { ascending: false });

    if (status) query = query.eq('status', status);
    if (type) query = query.eq('model_type', type);

    const { data: models, error } = await query;

    if (error) throw error;

    // Get version counts and deployed versions
    const modelsWithCounts = await Promise.all(
      (models || []).map(async (m) => {
        const { count: versionCount } = await supabase
          .from('model_versions')
          .select('*', { count: 'exact', head: true })
          .eq('model_id', m.id);

        const { data: deployedVersionData } = await supabase
          .from('model_versions')
          .select('version')
          .eq('model_id', m.id)
          .eq('is_deployed', true)
          .limit(1)
          .single();

        return {
          ...m,
          architecture: m.architecture || {},
          input_schema: m.input_schema || {},
          output_schema: m.output_schema || {},
          version_count: versionCount || 0,
          deployed_version: deployedVersionData?.version || null
        };
      })
    );

    res.json({ models: modelsWithCounts });
  } catch (error) {
    console.error('List models error:', error);
    res.status(500).json({ error: { message: 'Failed to list models', code: 'LIST_ERROR' } });
  }
});

// POST /api/models - Create model definition
router.post('/', async (req, res) => {
  try {
    const { name, description, model_type, architecture, input_schema, output_schema, target_use_case, created_by } = req.body;

    if (!name || !model_type) {
      return res.status(400).json({ error: { message: 'name and model_type are required', code: 'VALIDATION_ERROR' } });
    }

    const id = uuidv4();
    const { error: insertError } = await supabase
      .from('models')
      .insert({
        id,
        name,
        description,
        model_type,
        architecture: architecture || {},
        input_schema: input_schema || {},
        output_schema: output_schema || {},
        target_use_case,
        created_by
      });

    if (insertError) throw insertError;

    // Create initial version
    const versionId = uuidv4();
    const { error: versionError } = await supabase
      .from('model_versions')
      .insert({
        id: versionId,
        model_id: id,
        version: '0.1.0',
        weights: {},
        metrics: {},
        notes: 'Initial version'
      });

    if (versionError) throw versionError;

    const { data: model, error: fetchError } = await supabase
      .from('models')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError) throw fetchError;

    res.status(201).json({
      model: {
        ...model,
        architecture: model.architecture || {},
        input_schema: model.input_schema || {},
        output_schema: model.output_schema || {}
      }
    });
  } catch (error) {
    console.error('Create model error:', error);
    res.status(500).json({ error: { message: 'Failed to create model', code: 'CREATE_ERROR' } });
  }
});

// GET /api/models/:id - Get model details
router.get('/:id', async (req, res) => {
  try {
    const { data: model, error } = await supabase
      .from('models')
      .select('*')
      .eq('id', req.params.id)
      .single();

    if (error || !model) {
      return res.status(404).json({ error: { message: 'Model not found', code: 'NOT_FOUND' } });
    }

    const { data: versions } = await supabase
      .from('model_versions')
      .select('*')
      .eq('model_id', req.params.id)
      .order('created_at', { ascending: false });

    const { data: recentTraining } = await supabase
      .from('training_rounds')
      .select('*')
      .eq('model_id', req.params.id)
      .order('created_at', { ascending: false })
      .limit(5);

    res.json({
      model: {
        ...model,
        architecture: model.architecture || {},
        input_schema: model.input_schema || {},
        output_schema: model.output_schema || {},
        versions: (versions || []).map(v => ({
          ...v,
          weights: v.weights || {},
          metrics: v.metrics || {}
        })),
        recent_training: (recentTraining || []).map(t => ({
          ...t,
          hyperparameters: t.hyperparameters || {},
          privacy_config: t.privacy_config || {},
          result_metrics: t.result_metrics || {}
        }))
      }
    });
  } catch (error) {
    console.error('Get model error:', error);
    res.status(500).json({ error: { message: 'Failed to get model', code: 'GET_ERROR' } });
  }
});

// PUT /api/models/:id - Update model
router.put('/:id', async (req, res) => {
  try {
    const { name, description, architecture, input_schema, output_schema, status } = req.body;

    const updates = { updated_at: new Date().toISOString() };

    if (name) updates.name = name;
    if (description !== undefined) updates.description = description;
    if (architecture) updates.architecture = architecture;
    if (input_schema) updates.input_schema = input_schema;
    if (output_schema) updates.output_schema = output_schema;
    if (status) updates.status = status;

    const { error: updateError } = await supabase
      .from('models')
      .update(updates)
      .eq('id', req.params.id);

    if (updateError) throw updateError;

    const { data: model, error: fetchError } = await supabase
      .from('models')
      .select('*')
      .eq('id', req.params.id)
      .single();

    if (fetchError) throw fetchError;

    res.json({
      model: {
        ...model,
        architecture: model.architecture || {},
        input_schema: model.input_schema || {},
        output_schema: model.output_schema || {}
      }
    });
  } catch (error) {
    console.error('Update model error:', error);
    res.status(500).json({ error: { message: 'Failed to update model', code: 'UPDATE_ERROR' } });
  }
});

// DELETE /api/models/:id - Deprecate model
router.delete('/:id', async (req, res) => {
  try {
    const { error } = await supabase
      .from('models')
      .update({ status: 'deprecated', updated_at: new Date().toISOString() })
      .eq('id', req.params.id);

    if (error) throw error;

    res.json({ message: 'Model deprecated' });
  } catch (error) {
    console.error('Delete model error:', error);
    res.status(500).json({ error: { message: 'Failed to deprecate model', code: 'DELETE_ERROR' } });
  }
});

// GET /api/models/:id/versions - List model versions
router.get('/:id/versions', async (req, res) => {
  try {
    const { data: versions, error } = await supabase
      .from('model_versions')
      .select('*, training_rounds(round_number, status)')
      .eq('model_id', req.params.id)
      .order('created_at', { ascending: false });

    if (error) throw error;

    res.json({
      versions: (versions || []).map(v => ({
        ...v,
        weights: v.weights || {},
        metrics: v.metrics || {},
        round_number: v.training_rounds?.round_number || null,
        training_status: v.training_rounds?.status || null,
        training_rounds: undefined
      }))
    });
  } catch (error) {
    console.error('List versions error:', error);
    res.status(500).json({ error: { message: 'Failed to list versions', code: 'LIST_ERROR' } });
  }
});

// GET /api/models/:id/versions/:versionId - Get specific version
router.get('/:id/versions/:versionId', async (req, res) => {
  try {
    const { data: version, error } = await supabase
      .from('model_versions')
      .select('*')
      .eq('id', req.params.versionId)
      .eq('model_id', req.params.id)
      .single();

    if (error || !version) {
      return res.status(404).json({ error: { message: 'Version not found', code: 'NOT_FOUND' } });
    }

    res.json({
      version: {
        ...version,
        weights: version.weights || {},
        metrics: version.metrics || {}
      }
    });
  } catch (error) {
    console.error('Get version error:', error);
    res.status(500).json({ error: { message: 'Failed to get version', code: 'GET_ERROR' } });
  }
});

// POST /api/models/:id/versions - Create new version
router.post('/:id/versions', async (req, res) => {
  try {
    const { version, weights, metrics, training_round_id, notes } = req.body;

    if (!version) {
      return res.status(400).json({ error: { message: 'version is required', code: 'VALIDATION_ERROR' } });
    }

    const id = uuidv4();
    const { error: insertError } = await supabase
      .from('model_versions')
      .insert({
        id,
        model_id: req.params.id,
        version,
        weights: weights || {},
        metrics: metrics || {},
        training_round_id,
        notes
      });

    if (insertError) throw insertError;

    const { data: modelVersion, error: fetchError } = await supabase
      .from('model_versions')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError) throw fetchError;

    res.status(201).json({
      version: {
        ...modelVersion,
        weights: modelVersion.weights || {},
        metrics: modelVersion.metrics || {}
      }
    });
  } catch (error) {
    console.error('Create version error:', error);
    res.status(500).json({ error: { message: 'Failed to create version', code: 'CREATE_ERROR' } });
  }
});

// POST /api/models/:id/deploy - Deploy model version
router.post('/:id/deploy', async (req, res) => {
  try {
    const { version_id, device_group_id, deployment_type = 'full', deployed_by } = req.body;

    if (!version_id) {
      return res.status(400).json({ error: { message: 'version_id is required', code: 'VALIDATION_ERROR' } });
    }

    // Get target device count
    let deviceCount = 0;
    if (device_group_id) {
      const { count } = await supabase
        .from('devices')
        .select('*', { count: 'exact', head: true })
        .eq('device_group_id', device_group_id)
        .eq('is_active', true);
      deviceCount = count || 0;
    } else {
      const { count } = await supabase
        .from('devices')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true);
      deviceCount = count || 0;
    }

    // Create deployment record
    const deploymentId = uuidv4();
    const { error: deployError } = await supabase
      .from('model_deployments')
      .insert({
        id: deploymentId,
        model_version_id: version_id,
        device_group_id,
        deployment_type,
        target_device_count: deviceCount,
        deployed_by,
        started_at: new Date().toISOString()
      });

    if (deployError) throw deployError;

    // Mark version as deployed
    await supabase
      .from('model_versions')
      .update({ is_deployed: true })
      .eq('id', version_id);

    // Increment deployment count
    const { data: currentVersion } = await supabase
      .from('model_versions')
      .select('deployment_count')
      .eq('id', version_id)
      .single();

    await supabase
      .from('model_versions')
      .update({ deployment_count: (currentVersion?.deployment_count || 0) + 1 })
      .eq('id', version_id);

    // Update model status to active
    await supabase
      .from('models')
      .update({ status: 'active', updated_at: new Date().toISOString() })
      .eq('id', req.params.id);

    // Simulate deployment completion
    await supabase
      .from('model_deployments')
      .update({
        status: 'deployed',
        successful_device_count: deviceCount,
        completed_at: new Date().toISOString()
      })
      .eq('id', deploymentId);

    const { data: deployment } = await supabase
      .from('model_deployments')
      .select('*')
      .eq('id', deploymentId)
      .single();

    res.json({ deployment, message: 'Model deployed successfully' });
  } catch (error) {
    console.error('Deploy model error:', error);
    res.status(500).json({ error: { message: 'Failed to deploy model', code: 'DEPLOY_ERROR' } });
  }
});

// POST /api/models/:id/rollback - Rollback to previous version
router.post('/:id/rollback', async (req, res) => {
  try {
    const { version_id, deployed_by } = req.body;

    if (!version_id) {
      return res.status(400).json({ error: { message: 'version_id is required', code: 'VALIDATION_ERROR' } });
    }

    // Get current deployed version
    const { data: currentVersion } = await supabase
      .from('model_versions')
      .select('id')
      .eq('model_id', req.params.id)
      .eq('is_deployed', true)
      .single();

    // Unmark current version
    if (currentVersion) {
      await supabase
        .from('model_versions')
        .update({ is_deployed: false })
        .eq('id', currentVersion.id);
    }

    // Mark rollback version as deployed
    await supabase
      .from('model_versions')
      .update({ is_deployed: true })
      .eq('id', version_id);

    // Increment deployment count
    const { data: targetVersion } = await supabase
      .from('model_versions')
      .select('deployment_count')
      .eq('id', version_id)
      .single();

    await supabase
      .from('model_versions')
      .update({ deployment_count: (targetVersion?.deployment_count || 0) + 1 })
      .eq('id', version_id);

    // Create deployment record for rollback
    const deploymentId = uuidv4();
    await supabase
      .from('model_deployments')
      .insert({
        id: deploymentId,
        model_version_id: version_id,
        deployment_type: 'full',
        status: 'deployed',
        rollback_version_id: currentVersion?.id,
        deployed_by,
        started_at: new Date().toISOString(),
        completed_at: new Date().toISOString()
      });

    res.json({ message: 'Rollback successful', deployment_id: deploymentId });
  } catch (error) {
    console.error('Rollback model error:', error);
    res.status(500).json({ error: { message: 'Failed to rollback model', code: 'ROLLBACK_ERROR' } });
  }
});

export default router;
