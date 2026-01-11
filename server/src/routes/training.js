import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import supabase from '../utils/supabase.js';
import {
  startTrainingRound,
  getTrainingStatus,
  cancelTrainingRound,
  isTrainingActive
} from '../services/trainingSimulator.js';

const router = Router();

// GET /api/training/rounds - List training rounds
router.get('/rounds', async (req, res) => {
  try {
    const { model_id, status, limit = 50, offset = 0 } = req.query;

    let query = supabase
      .from('training_rounds')
      .select('*, models(name, model_type)')
      .order('created_at', { ascending: false })
      .range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1);

    if (model_id) query = query.eq('model_id', model_id);
    if (status) query = query.eq('status', status);

    const { data: rounds, error } = await query;

    if (error) throw error;

    res.json({
      rounds: (rounds || []).map(r => ({
        ...r,
        model_name: r.models?.name || null,
        model_type: r.models?.model_type || null,
        models: undefined,
        target_devices: r.target_devices || [],
        participating_devices: r.participating_devices || [],
        hyperparameters: r.hyperparameters || {},
        privacy_config: r.privacy_config || {},
        result_metrics: r.result_metrics || {}
      }))
    });
  } catch (error) {
    console.error('List training rounds error:', error);
    res.status(500).json({ error: { message: 'Failed to list training rounds', code: 'LIST_ERROR' } });
  }
});

// POST /api/training/rounds - Start new training round
router.post('/rounds', async (req, res) => {
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
    const { data: lastRoundData } = await supabase
      .from('training_rounds')
      .select('round_number')
      .eq('model_id', model_id)
      .order('round_number', { ascending: false })
      .limit(1)
      .single();

    const roundNumber = (lastRoundData?.round_number || 0) + 1;

    const id = uuidv4();
    const { error: insertError } = await supabase
      .from('training_rounds')
      .insert({
        id,
        model_id,
        round_number: roundNumber,
        target_devices: target_devices || [],
        hyperparameters,
        privacy_config,
        aggregation_method,
        created_by,
        status: 'in_progress',
        started_at: new Date().toISOString()
      });

    if (insertError) throw insertError;

    // Get devices for training
    let devices = [...(target_devices || [])];
    if (devices.length === 0) {
      // Get all online devices
      const { data: onlineDevices } = await supabase
        .from('devices')
        .select('id')
        .eq('status', 'online')
        .eq('is_active', true);
      devices = (onlineDevices || []).map(d => d.id);
    }

    // If still no devices, get any active devices
    if (devices.length === 0) {
      const { data: activeDevices } = await supabase
        .from('devices')
        .select('id')
        .eq('is_active', true)
        .limit(5);
      devices = (activeDevices || []).map(d => d.id);
    }

    // Create device training contributions
    for (const deviceId of devices) {
      await supabase
        .from('device_training_contributions')
        .insert({
          id: uuidv4(),
          training_round_id: id,
          device_id: deviceId,
          status: 'pending'
        });
    }

    // Update participating devices
    await supabase
      .from('training_rounds')
      .update({ participating_devices: devices })
      .eq('id', id);

    const { data: round } = await supabase
      .from('training_rounds')
      .select('*')
      .eq('id', id)
      .single();

    // Start the actual training simulation
    try {
      await startTrainingRound(id);
    } catch (trainError) {
      console.error('Training start error:', trainError);
      // Training will continue in background, don't fail the request
    }

    res.status(201).json({
      round: {
        ...round,
        target_devices: round.target_devices || [],
        participating_devices: devices,
        hyperparameters: round.hyperparameters || {},
        privacy_config: round.privacy_config || {},
        result_metrics: round.result_metrics || {}
      },
      message: 'Training round started. Subscribe to WebSocket topic for real-time updates.'
    });
  } catch (error) {
    console.error('Create training round error:', error);
    res.status(500).json({ error: { message: 'Failed to create training round', code: 'CREATE_ERROR' } });
  }
});

// GET /api/training/rounds/:id - Get training round details
router.get('/rounds/:id', async (req, res) => {
  try {
    const { data: round, error } = await supabase
      .from('training_rounds')
      .select('*, models(name, model_type)')
      .eq('id', req.params.id)
      .single();

    if (error || !round) {
      return res.status(404).json({ error: { message: 'Training round not found', code: 'NOT_FOUND' } });
    }

    const { data: contributions } = await supabase
      .from('device_training_contributions')
      .select('*, devices(name, device_uid)')
      .eq('training_round_id', req.params.id);

    res.json({
      round: {
        ...round,
        model_name: round.models?.name || null,
        model_type: round.models?.model_type || null,
        models: undefined,
        target_devices: round.target_devices || [],
        participating_devices: round.participating_devices || [],
        hyperparameters: round.hyperparameters || {},
        privacy_config: round.privacy_config || {},
        result_metrics: round.result_metrics || {},
        contributions: (contributions || []).map(c => ({
          ...c,
          device_name: c.devices?.name || null,
          device_uid: c.devices?.device_uid || null,
          devices: undefined,
          local_metrics: c.local_metrics || {}
        }))
      }
    });
  } catch (error) {
    console.error('Get training round error:', error);
    res.status(500).json({ error: { message: 'Failed to get training round', code: 'GET_ERROR' } });
  }
});

// PUT /api/training/rounds/:id - Update training round (pause/resume)
router.put('/rounds/:id', async (req, res) => {
  try {
    const { status } = req.body;

    if (!['pending', 'in_progress', 'cancelled'].includes(status)) {
      return res.status(400).json({ error: { message: 'Invalid status', code: 'VALIDATION_ERROR' } });
    }

    await supabase
      .from('training_rounds')
      .update({ status })
      .eq('id', req.params.id);

    const { data: round } = await supabase
      .from('training_rounds')
      .select('*')
      .eq('id', req.params.id)
      .single();

    res.json({
      round: {
        ...round,
        target_devices: round.target_devices || [],
        participating_devices: round.participating_devices || [],
        hyperparameters: round.hyperparameters || {},
        privacy_config: round.privacy_config || {},
        result_metrics: round.result_metrics || {}
      }
    });
  } catch (error) {
    console.error('Update training round error:', error);
    res.status(500).json({ error: { message: 'Failed to update training round', code: 'UPDATE_ERROR' } });
  }
});

// DELETE /api/training/rounds/:id - Cancel training round
router.delete('/rounds/:id', async (req, res) => {
  try {
    // Cancel active training if running
    const wasCancelled = cancelTrainingRound(req.params.id);

    if (!wasCancelled) {
      // Not actively running, just update DB
      await supabase
        .from('training_rounds')
        .update({ status: 'cancelled' })
        .eq('id', req.params.id);

      await supabase
        .from('device_training_contributions')
        .update({ status: 'failed' })
        .eq('training_round_id', req.params.id)
        .neq('status', 'completed');
    }

    res.json({ message: 'Training round cancelled' });
  } catch (error) {
    console.error('Cancel training round error:', error);
    res.status(500).json({ error: { message: 'Failed to cancel training round', code: 'CANCEL_ERROR' } });
  }
});

// GET /api/training/rounds/:id/status - Get real-time training status
router.get('/rounds/:id/status', async (req, res) => {
  try {
    // Check if training is actively running
    const liveStatus = getTrainingStatus(req.params.id);

    if (liveStatus) {
      return res.json({
        isActive: true,
        ...liveStatus
      });
    }

    // Get from database
    const { data: round, error } = await supabase
      .from('training_rounds')
      .select('status, started_at, completed_at')
      .eq('id', req.params.id)
      .single();

    if (error || !round) {
      return res.status(404).json({ error: { message: 'Training round not found', code: 'NOT_FOUND' } });
    }

    res.json({
      isActive: false,
      roundId: req.params.id,
      status: round.status,
      startedAt: round.started_at,
      completedAt: round.completed_at
    });
  } catch (error) {
    console.error('Get training status error:', error);
    res.status(500).json({ error: { message: 'Failed to get training status', code: 'STATUS_ERROR' } });
  }
});

// GET /api/training/rounds/:id/contributions - Get device contributions
router.get('/rounds/:id/contributions', async (req, res) => {
  try {
    const { data: contributions, error } = await supabase
      .from('device_training_contributions')
      .select('*, devices(name, device_uid, type)')
      .eq('training_round_id', req.params.id)
      .order('upload_timestamp', { ascending: false });

    if (error) throw error;

    res.json({
      contributions: (contributions || []).map(c => ({
        ...c,
        device_name: c.devices?.name || null,
        device_uid: c.devices?.device_uid || null,
        device_type: c.devices?.type || null,
        devices: undefined,
        local_metrics: c.local_metrics || {}
      }))
    });
  } catch (error) {
    console.error('Get contributions error:', error);
    res.status(500).json({ error: { message: 'Failed to get contributions', code: 'GET_ERROR' } });
  }
});

// POST /api/training/rounds/:id/aggregate - Trigger aggregation
router.post('/rounds/:id/aggregate', async (req, res) => {
  try {
    // Update round status to aggregating
    await supabase
      .from('training_rounds')
      .update({ status: 'aggregating' })
      .eq('id', req.params.id);

    const { data: round } = await supabase
      .from('training_rounds')
      .select('*')
      .eq('id', req.params.id)
      .single();

    const { data: contributions } = await supabase
      .from('device_training_contributions')
      .select('*')
      .eq('training_round_id', req.params.id)
      .eq('status', 'completed');

    // Simulate aggregation (in real system, this would aggregate model weights)
    const aggregatedMetrics = {
      accuracy: 0.85 + Math.random() * 0.1,
      loss: 0.2 + Math.random() * 0.1,
      f1_score: 0.83 + Math.random() * 0.1,
      participating_devices: (contributions || []).length,
      total_samples: (contributions || []).reduce((sum, c) => sum + (c.data_samples_count || 0), 0)
    };

    // Update round as completed
    await supabase
      .from('training_rounds')
      .update({
        status: 'completed',
        result_metrics: aggregatedMetrics,
        completed_at: new Date().toISOString()
      })
      .eq('id', req.params.id);

    // Get last version
    const { data: lastVersion } = await supabase
      .from('model_versions')
      .select('version')
      .eq('model_id', round.model_id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    const newVersion = incrementVersion(lastVersion?.version || '0.0.0');

    // Create new model version
    const versionId = uuidv4();
    await supabase
      .from('model_versions')
      .insert({
        id: versionId,
        model_id: round.model_id,
        version: newVersion,
        metrics: aggregatedMetrics,
        training_round_id: req.params.id,
        notes: `Aggregated from training round ${round.round_number}`
      });

    // Log privacy budget
    const privacyConfig = round.privacy_config || {};
    await supabase
      .from('privacy_budget_logs')
      .insert({
        id: uuidv4(),
        model_id: round.model_id,
        training_round_id: req.params.id,
        epsilon_consumed: privacyConfig.epsilon || 1.0,
        cumulative_epsilon: privacyConfig.epsilon || 1.0,
        budget_limit: 10.0
      });

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
router.get('/rounds/:id/metrics', async (req, res) => {
  try {
    const { data: contributions, error } = await supabase
      .from('device_training_contributions')
      .select('*, devices(name)')
      .eq('training_round_id', req.params.id)
      .eq('status', 'completed')
      .order('upload_timestamp');

    if (error) throw error;

    const metrics = (contributions || []).map(c => ({
      device: c.devices?.name || 'Unknown',
      timestamp: c.upload_timestamp,
      ...(c.local_metrics || {})
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
