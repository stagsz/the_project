import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import supabase from '../utils/supabase.js';

const router = Router();

// GET /api/maintenance/predictions - List maintenance predictions
router.get('/predictions', async (req, res) => {
  try {
    const { device_id, status, risk_level, limit = 50, offset = 0 } = req.query;

    let query = supabase
      .from('maintenance_predictions')
      .select('*, devices(name, device_uid)')
      .order('predicted_date', { ascending: true })
      .range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1);

    if (device_id) query = query.eq('device_id', device_id);
    if (status) query = query.eq('status', status);
    if (risk_level) query = query.eq('risk_level', risk_level);

    const { data: predictions, error } = await query;

    if (error) throw error;

    res.json({
      predictions: (predictions || []).map(p => ({
        ...p,
        device_name: p.devices?.name || null,
        device_uid: p.devices?.device_uid || null,
        devices: undefined
      }))
    });
  } catch (error) {
    console.error('List predictions error:', error);
    res.status(500).json({ error: { message: 'Failed to list predictions', code: 'LIST_ERROR' } });
  }
});

// GET /api/maintenance/predictions/:id - Get prediction details
router.get('/predictions/:id', async (req, res) => {
  try {
    const { data: prediction, error } = await supabase
      .from('maintenance_predictions')
      .select('*, devices(name, device_uid, type, device_group_id, device_groups(name, facility_id, facilities(name)))')
      .eq('id', req.params.id)
      .single();

    if (error || !prediction) {
      return res.status(404).json({ error: { message: 'Prediction not found', code: 'NOT_FOUND' } });
    }

    // Get device health history
    const { data: recentMetrics } = await supabase
      .from('device_metrics')
      .select('timestamp, cpu_usage, memory_usage, temperature_celsius, error_count')
      .eq('device_id', prediction.device_id)
      .order('timestamp', { ascending: false })
      .limit(20);

    res.json({
      prediction: {
        ...prediction,
        device_name: prediction.devices?.name || null,
        device_uid: prediction.devices?.device_uid || null,
        device_type: prediction.devices?.type || null,
        group_name: prediction.devices?.device_groups?.name || null,
        facility_name: prediction.devices?.device_groups?.facilities?.name || null,
        devices: undefined,
        device_health_history: recentMetrics || []
      }
    });
  } catch (error) {
    console.error('Get prediction error:', error);
    res.status(500).json({ error: { message: 'Failed to get prediction', code: 'GET_ERROR' } });
  }
});

// PUT /api/maintenance/predictions/:id - Update prediction status
router.put('/predictions/:id', async (req, res) => {
  try {
    const { status, recommended_action, estimated_cost } = req.body;

    const updates = { updated_at: new Date().toISOString() };

    if (status) updates.status = status;
    if (recommended_action !== undefined) updates.recommended_action = recommended_action;
    if (estimated_cost !== undefined) updates.estimated_cost = estimated_cost;

    const { error: updateError } = await supabase
      .from('maintenance_predictions')
      .update(updates)
      .eq('id', req.params.id);

    if (updateError) throw updateError;

    const { data: prediction } = await supabase
      .from('maintenance_predictions')
      .select('*')
      .eq('id', req.params.id)
      .single();

    res.json({ prediction });
  } catch (error) {
    console.error('Update prediction error:', error);
    res.status(500).json({ error: { message: 'Failed to update prediction', code: 'UPDATE_ERROR' } });
  }
});

// POST /api/maintenance/schedule - Schedule maintenance
router.post('/schedule', async (req, res) => {
  try {
    const { prediction_id, scheduled_date, notes } = req.body;

    if (!prediction_id) {
      return res.status(400).json({ error: { message: 'prediction_id is required', code: 'VALIDATION_ERROR' } });
    }

    // Update prediction status to scheduled
    await supabase
      .from('maintenance_predictions')
      .update({
        status: 'scheduled',
        predicted_date: scheduled_date || new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', prediction_id);

    const { data: prediction } = await supabase
      .from('maintenance_predictions')
      .select('*, devices(name)')
      .eq('id', prediction_id)
      .single();

    // Create notification for admins and operators
    const { data: users } = await supabase
      .from('users')
      .select('id')
      .in('role', ['admin', 'operator']);

    for (const user of users || []) {
      await supabase
        .from('notifications')
        .insert({
          id: uuidv4(),
          user_id: user.id,
          type: 'maintenance_alert',
          title: `Maintenance Scheduled: ${prediction.devices?.name || 'Unknown'}`,
          message: `${prediction.component} maintenance scheduled for ${scheduled_date || 'soon'}`,
          severity: 'info',
          data: { prediction_id, device_id: prediction.device_id }
        });
    }

    res.json({ prediction, message: 'Maintenance scheduled' });
  } catch (error) {
    console.error('Schedule maintenance error:', error);
    res.status(500).json({ error: { message: 'Failed to schedule maintenance', code: 'SCHEDULE_ERROR' } });
  }
});

// GET /api/maintenance/history - Get maintenance history
router.get('/history', async (req, res) => {
  try {
    const { device_id, from, to, limit = 100, offset = 0 } = req.query;

    let query = supabase
      .from('maintenance_predictions')
      .select('*, devices(name, device_uid)')
      .eq('status', 'completed')
      .order('updated_at', { ascending: false })
      .range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1);

    if (device_id) query = query.eq('device_id', device_id);
    if (from) query = query.gte('updated_at', from);
    if (to) query = query.lte('updated_at', to);

    const { data: history, error } = await query;

    if (error) throw error;

    res.json({
      history: (history || []).map(h => ({
        ...h,
        device_name: h.devices?.name || null,
        device_uid: h.devices?.device_uid || null,
        devices: undefined
      }))
    });
  } catch (error) {
    console.error('Get history error:', error);
    res.status(500).json({ error: { message: 'Failed to get history', code: 'GET_ERROR' } });
  }
});

// POST /api/maintenance/generate-predictions - Generate maintenance predictions (simulation)
router.post('/generate-predictions', async (req, res) => {
  try {
    const { data: devices } = await supabase
      .from('devices')
      .select('id, name, type')
      .eq('is_active', true);

    const components = ['Motor', 'Bearing', 'Seal', 'Filter', 'Belt', 'Pump', 'Compressor'];
    const actions = [
      'Replace worn component',
      'Perform preventive maintenance',
      'Inspect and lubricate',
      'Clean and calibrate',
      'Check alignment'
    ];

    const createdPredictions = [];

    for (const device of devices || []) {
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

      await supabase
        .from('maintenance_predictions')
        .insert({
          id,
          device_id: device.id,
          component,
          prediction_type: predictionType,
          predicted_date: predictedDate,
          confidence_score: confidence,
          risk_level: riskLevel,
          recommended_action: action,
          estimated_cost: cost
        });

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
