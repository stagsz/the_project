import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import supabase from '../utils/supabase.js';

const router = Router();

// GET /api/quality/inspections - List quality inspections
router.get('/inspections', async (req, res) => {
  try {
    const { device_id, result, defect_type, limit = 50, offset = 0 } = req.query;

    let query = supabase
      .from('quality_inspections')
      .select('*, devices(name, device_uid)')
      .order('inspection_timestamp', { ascending: false })
      .range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1);

    if (device_id) query = query.eq('device_id', device_id);
    if (result) query = query.eq('result', result);
    if (defect_type) query = query.eq('defect_type', defect_type);

    const { data: inspections, error } = await query;

    if (error) throw error;

    res.json({
      inspections: (inspections || []).map(i => ({
        ...i,
        device_name: i.devices?.name || null,
        device_uid: i.devices?.device_uid || null,
        devices: undefined
      }))
    });
  } catch (error) {
    console.error('List inspections error:', error);
    res.status(500).json({ error: { message: 'Failed to list inspections', code: 'LIST_ERROR' } });
  }
});

// GET /api/quality/inspections/:id - Get inspection details
router.get('/inspections/:id', async (req, res) => {
  try {
    const { data: inspection, error } = await supabase
      .from('quality_inspections')
      .select('*, devices(name, device_uid, type, device_group_id, device_groups(name, facility_id, facilities(name))), users:override_by(name)')
      .eq('id', req.params.id)
      .single();

    if (error || !inspection) {
      return res.status(404).json({ error: { message: 'Inspection not found', code: 'NOT_FOUND' } });
    }

    res.json({
      inspection: {
        ...inspection,
        device_name: inspection.devices?.name || null,
        device_uid: inspection.devices?.device_uid || null,
        device_type: inspection.devices?.type || null,
        group_name: inspection.devices?.device_groups?.name || null,
        facility_name: inspection.devices?.device_groups?.facilities?.name || null,
        override_by_name: inspection.users?.name || null,
        devices: undefined,
        users: undefined
      }
    });
  } catch (error) {
    console.error('Get inspection error:', error);
    res.status(500).json({ error: { message: 'Failed to get inspection', code: 'GET_ERROR' } });
  }
});

// POST /api/quality/inspections/:id/override - Human override result
router.post('/inspections/:id/override', async (req, res) => {
  try {
    const { override_result, override_by, notes } = req.body;

    if (!override_result) {
      return res.status(400).json({ error: { message: 'override_result is required', code: 'VALIDATION_ERROR' } });
    }

    await supabase
      .from('quality_inspections')
      .update({
        human_override: true,
        override_result,
        override_by,
        notes
      })
      .eq('id', req.params.id);

    const { data: inspection } = await supabase
      .from('quality_inspections')
      .select('*')
      .eq('id', req.params.id)
      .single();

    res.json({ inspection, message: 'Override applied' });
  } catch (error) {
    console.error('Override inspection error:', error);
    res.status(500).json({ error: { message: 'Failed to override inspection', code: 'OVERRIDE_ERROR' } });
  }
});

// GET /api/quality/metrics - Get quality metrics summary
router.get('/metrics', async (req, res) => {
  try {
    const { device_id, from, to } = req.query;

    // Build base query filters
    let baseQuery = supabase.from('quality_inspections').select('*', { count: 'exact', head: true });
    let passedQuery = supabase.from('quality_inspections').select('*', { count: 'exact', head: true }).eq('result', 'pass');
    let failedQuery = supabase.from('quality_inspections').select('*', { count: 'exact', head: true }).eq('result', 'fail');
    let warningQuery = supabase.from('quality_inspections').select('*', { count: 'exact', head: true }).eq('result', 'warning');
    let overridesQuery = supabase.from('quality_inspections').select('*', { count: 'exact', head: true }).eq('human_override', true);

    if (device_id) {
      baseQuery = baseQuery.eq('device_id', device_id);
      passedQuery = passedQuery.eq('device_id', device_id);
      failedQuery = failedQuery.eq('device_id', device_id);
      warningQuery = warningQuery.eq('device_id', device_id);
      overridesQuery = overridesQuery.eq('device_id', device_id);
    }
    if (from) {
      baseQuery = baseQuery.gte('inspection_timestamp', from);
      passedQuery = passedQuery.gte('inspection_timestamp', from);
      failedQuery = failedQuery.gte('inspection_timestamp', from);
      warningQuery = warningQuery.gte('inspection_timestamp', from);
      overridesQuery = overridesQuery.gte('inspection_timestamp', from);
    }
    if (to) {
      baseQuery = baseQuery.lte('inspection_timestamp', to);
      passedQuery = passedQuery.lte('inspection_timestamp', to);
      failedQuery = failedQuery.lte('inspection_timestamp', to);
      warningQuery = warningQuery.lte('inspection_timestamp', to);
      overridesQuery = overridesQuery.lte('inspection_timestamp', to);
    }

    const [totalResult, passedResult, failedResult, warningResult, overridesResult] = await Promise.all([
      baseQuery,
      passedQuery,
      failedQuery,
      warningQuery,
      overridesQuery
    ]);

    const total = totalResult.count || 0;
    const passed = passedResult.count || 0;
    const failed = failedResult.count || 0;
    const warning = warningResult.count || 0;
    const overrides = overridesResult.count || 0;

    // Get average confidence
    let confidenceQuery = supabase.from('quality_inspections').select('confidence_score');
    if (device_id) confidenceQuery = confidenceQuery.eq('device_id', device_id);
    if (from) confidenceQuery = confidenceQuery.gte('inspection_timestamp', from);
    if (to) confidenceQuery = confidenceQuery.lte('inspection_timestamp', to);

    const { data: confidenceData } = await confidenceQuery;
    const avgConfidence = confidenceData && confidenceData.length > 0
      ? confidenceData.reduce((sum, c) => sum + (c.confidence_score || 0), 0) / confidenceData.length
      : 0;

    // Get defect distribution
    let defectQuery = supabase.from('quality_inspections').select('defect_type').not('defect_type', 'is', null);
    if (device_id) defectQuery = defectQuery.eq('device_id', device_id);
    if (from) defectQuery = defectQuery.gte('inspection_timestamp', from);
    if (to) defectQuery = defectQuery.lte('inspection_timestamp', to);

    const { data: defectData } = await defectQuery;

    // Count defects by type
    const defectCounts = {};
    (defectData || []).forEach(d => {
      defectCounts[d.defect_type] = (defectCounts[d.defect_type] || 0) + 1;
    });

    const defects = Object.entries(defectCounts)
      .map(([defect_type, count]) => ({ defect_type, count }))
      .sort((a, b) => b.count - a.count);

    res.json({
      metrics: {
        total,
        passed,
        failed,
        warning,
        overrides,
        pass_rate: total > 0 ? (passed / total * 100).toFixed(2) : 0,
        average_confidence: avgConfidence.toFixed(4),
        defect_distribution: defects
      }
    });
  } catch (error) {
    console.error('Get metrics error:', error);
    res.status(500).json({ error: { message: 'Failed to get metrics', code: 'GET_ERROR' } });
  }
});

// GET /api/quality/trends - Get quality trends over time
router.get('/trends', async (req, res) => {
  try {
    const { device_id, interval = 'day', limit = 30 } = req.query;

    // Supabase doesn't have strftime, so we'll need to process in JS
    let query = supabase
      .from('quality_inspections')
      .select('inspection_timestamp, result, confidence_score')
      .order('inspection_timestamp', { ascending: false })
      .limit(parseInt(limit) * 100); // Get more records to aggregate

    if (device_id) query = query.eq('device_id', device_id);

    const { data: inspections, error } = await query;

    if (error) throw error;

    // Group by period
    const groupByPeriod = (timestamp) => {
      const date = new Date(timestamp);
      switch (interval) {
        case 'hour':
          return `${date.toISOString().slice(0, 13)}:00:00`;
        case 'week':
          const weekNum = Math.ceil(date.getDate() / 7);
          return `${date.getFullYear()}-W${weekNum.toString().padStart(2, '0')}`;
        case 'month':
          return date.toISOString().slice(0, 7);
        default: // day
          return date.toISOString().slice(0, 10);
      }
    };

    const periodData = {};
    (inspections || []).forEach(i => {
      const period = groupByPeriod(i.inspection_timestamp);
      if (!periodData[period]) {
        periodData[period] = { total: 0, passed: 0, failed: 0, confidenceSum: 0 };
      }
      periodData[period].total++;
      if (i.result === 'pass') periodData[period].passed++;
      if (i.result === 'fail') periodData[period].failed++;
      periodData[period].confidenceSum += i.confidence_score || 0;
    });

    const trends = Object.entries(periodData)
      .map(([period, data]) => ({
        period,
        total: data.total,
        passed: data.passed,
        failed: data.failed,
        avg_confidence: data.total > 0 ? data.confidenceSum / data.total : 0,
        pass_rate: data.total > 0 ? (data.passed / data.total * 100).toFixed(2) : 0
      }))
      .sort((a, b) => b.period.localeCompare(a.period))
      .slice(0, parseInt(limit));

    res.json({ trends });
  } catch (error) {
    console.error('Get trends error:', error);
    res.status(500).json({ error: { message: 'Failed to get trends', code: 'GET_ERROR' } });
  }
});

// POST /api/quality/generate-inspections - Generate simulated inspections
router.post('/generate-inspections', async (req, res) => {
  try {
    const { count = 20 } = req.body;

    const { data: devices } = await supabase
      .from('devices')
      .select('id')
      .or('type.eq.camera,is_active.eq.true');

    if (!devices || devices.length === 0) {
      return res.status(400).json({ error: { message: 'No devices available', code: 'NO_DEVICES' } });
    }

    const defectTypes = ['scratch', 'dent', 'discoloration', 'misalignment', 'dimension_error', null];
    const results = ['pass', 'pass', 'pass', 'pass', 'fail', 'warning']; // Weighted towards pass

    const createdInspections = [];

    for (let i = 0; i < count; i++) {
      const device = devices[Math.floor(Math.random() * devices.length)];
      const result = results[Math.floor(Math.random() * results.length)];
      const defect = result === 'fail' ? defectTypes[Math.floor(Math.random() * (defectTypes.length - 1))] : null;
      const timestamp = new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString();
      const confidence = 0.7 + Math.random() * 0.28;
      const imageRef = `inspection_${Date.now()}_${i}.jpg`;

      const id = uuidv4();
      await supabase
        .from('quality_inspections')
        .insert({
          id,
          device_id: device.id,
          inspection_timestamp: timestamp,
          result,
          defect_type: defect,
          confidence_score: confidence,
          image_reference: imageRef
        });

      createdInspections.push({ id, result, defect_type: defect });
    }

    res.json({ inspections: createdInspections, count: createdInspections.length });
  } catch (error) {
    console.error('Generate inspections error:', error);
    res.status(500).json({ error: { message: 'Failed to generate inspections', code: 'GENERATE_ERROR' } });
  }
});

export default router;
