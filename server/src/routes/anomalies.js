import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import supabase from '../utils/supabase.js';

const router = Router();

// GET /api/anomalies - List anomalies
router.get('/', async (req, res) => {
  try {
    const { device_id, status, severity, type, limit = 50, offset = 0 } = req.query;

    let query = supabase
      .from('anomalies')
      .select('*, devices(name, device_uid)')
      .order('detected_at', { ascending: false })
      .range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1);

    if (device_id) query = query.eq('device_id', device_id);
    if (status) query = query.eq('status', status);
    if (severity) query = query.eq('severity', severity);
    if (type) query = query.eq('anomaly_type', type);

    const { data: anomalies, error } = await query;

    if (error) throw error;

    // Get total count
    let countQuery = supabase
      .from('anomalies')
      .select('*', { count: 'exact', head: true });

    if (device_id) countQuery = countQuery.eq('device_id', device_id);
    if (status) countQuery = countQuery.eq('status', status);
    if (severity) countQuery = countQuery.eq('severity', severity);
    if (type) countQuery = countQuery.eq('anomaly_type', type);

    const { count } = await countQuery;

    res.json({
      anomalies: (anomalies || []).map(a => ({
        ...a,
        device_name: a.devices?.name || null,
        device_uid: a.devices?.device_uid || null,
        devices: undefined,
        sensor_data: a.sensor_data || {}
      })),
      total: count || 0
    });
  } catch (error) {
    console.error('List anomalies error:', error);
    res.status(500).json({ error: { message: 'Failed to list anomalies', code: 'LIST_ERROR' } });
  }
});

// GET /api/anomalies/:id - Get anomaly details
router.get('/:id', async (req, res) => {
  try {
    const { data: anomaly, error } = await supabase
      .from('anomalies')
      .select('*, devices(name, device_uid, type, device_group_id, device_groups(name, facility_id, facilities(name)))')
      .eq('id', req.params.id)
      .single();

    if (error || !anomaly) {
      return res.status(404).json({ error: { message: 'Anomaly not found', code: 'NOT_FOUND' } });
    }

    // Get related anomalies from same device
    const { data: relatedAnomalies } = await supabase
      .from('anomalies')
      .select('id, anomaly_type, severity, status, detected_at')
      .eq('device_id', anomaly.device_id)
      .neq('id', req.params.id)
      .order('detected_at', { ascending: false })
      .limit(5);

    res.json({
      anomaly: {
        ...anomaly,
        device_name: anomaly.devices?.name || null,
        device_uid: anomaly.devices?.device_uid || null,
        device_type: anomaly.devices?.type || null,
        group_name: anomaly.devices?.device_groups?.name || null,
        facility_name: anomaly.devices?.device_groups?.facilities?.name || null,
        devices: undefined,
        sensor_data: anomaly.sensor_data || {},
        related_anomalies: relatedAnomalies || []
      }
    });
  } catch (error) {
    console.error('Get anomaly error:', error);
    res.status(500).json({ error: { message: 'Failed to get anomaly', code: 'GET_ERROR' } });
  }
});

// PUT /api/anomalies/:id - Update anomaly status
router.put('/:id', async (req, res) => {
  try {
    const { status, resolution_notes, resolved_by } = req.body;

    const updates = {};

    if (status) updates.status = status;
    if (resolution_notes !== undefined) updates.resolution_notes = resolution_notes;
    if (resolved_by) updates.resolved_by = resolved_by;

    if (status === 'resolved' || status === 'false_alarm') {
      updates.resolved_at = new Date().toISOString();
    }

    const { error: updateError } = await supabase
      .from('anomalies')
      .update(updates)
      .eq('id', req.params.id);

    if (updateError) throw updateError;

    const { data: anomaly } = await supabase
      .from('anomalies')
      .select('*')
      .eq('id', req.params.id)
      .single();

    res.json({
      anomaly: {
        ...anomaly,
        sensor_data: anomaly.sensor_data || {}
      }
    });
  } catch (error) {
    console.error('Update anomaly error:', error);
    res.status(500).json({ error: { message: 'Failed to update anomaly', code: 'UPDATE_ERROR' } });
  }
});

// POST /api/anomalies/:id/acknowledge - Acknowledge anomaly
router.post('/:id/acknowledge', async (req, res) => {
  try {
    const { user_id } = req.body;

    await supabase
      .from('anomalies')
      .update({ status: 'acknowledged' })
      .eq('id', req.params.id)
      .eq('status', 'new');

    // Create audit log
    await supabase
      .from('audit_logs')
      .insert({
        id: uuidv4(),
        user_id,
        action: 'acknowledge_anomaly',
        entity_type: 'anomaly',
        entity_id: req.params.id,
        new_values: { status: 'acknowledged' }
      });

    const { data: anomaly } = await supabase
      .from('anomalies')
      .select('*')
      .eq('id', req.params.id)
      .single();

    res.json({
      anomaly: {
        ...anomaly,
        sensor_data: anomaly.sensor_data || {}
      },
      message: 'Anomaly acknowledged'
    });
  } catch (error) {
    console.error('Acknowledge anomaly error:', error);
    res.status(500).json({ error: { message: 'Failed to acknowledge anomaly', code: 'ACKNOWLEDGE_ERROR' } });
  }
});

// POST /api/anomalies/:id/resolve - Resolve anomaly
router.post('/:id/resolve', async (req, res) => {
  try {
    const { user_id, resolution_notes, mark_as_false_alarm = false } = req.body;

    const status = mark_as_false_alarm ? 'false_alarm' : 'resolved';

    await supabase
      .from('anomalies')
      .update({
        status,
        resolved_at: new Date().toISOString(),
        resolved_by: user_id,
        resolution_notes
      })
      .eq('id', req.params.id);

    const { data: anomaly } = await supabase
      .from('anomalies')
      .select('*')
      .eq('id', req.params.id)
      .single();

    res.json({
      anomaly: {
        ...anomaly,
        sensor_data: anomaly.sensor_data || {}
      },
      message: mark_as_false_alarm ? 'Anomaly marked as false alarm' : 'Anomaly resolved'
    });
  } catch (error) {
    console.error('Resolve anomaly error:', error);
    res.status(500).json({ error: { message: 'Failed to resolve anomaly', code: 'RESOLVE_ERROR' } });
  }
});

export default router;
