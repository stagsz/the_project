import { Router } from 'express';
import supabase from '../utils/supabase.js';

const router = Router();

// GET /api/reports/training-performance - Training metrics over time
router.get('/training-performance', async (req, res) => {
  try {
    const { model_id, from, to, interval = 'day' } = req.query;

    let query = supabase
      .from('training_rounds')
      .select('completed_at, result_metrics')
      .eq('status', 'completed')
      .not('completed_at', 'is', null);

    if (model_id) query = query.eq('model_id', model_id);
    if (from) query = query.gte('completed_at', from);
    if (to) query = query.lte('completed_at', to);

    const { data: rounds, error } = await query;

    if (error) throw error;

    // Group by period in JavaScript
    const groupByPeriod = (timestamp) => {
      const date = new Date(timestamp);
      switch (interval) {
        case 'hour':
          return date.toISOString().slice(0, 13) + ':00:00';
        case 'week':
          const weekNum = Math.ceil(date.getDate() / 7);
          return `${date.getFullYear()}-W${weekNum.toString().padStart(2, '0')}`;
        case 'month':
          return date.toISOString().slice(0, 7);
        default:
          return date.toISOString().slice(0, 10);
      }
    };

    const periodData = {};
    (rounds || []).forEach(r => {
      const period = groupByPeriod(r.completed_at);
      if (!periodData[period]) {
        periodData[period] = { rounds: 0, accuracies: [], losses: [], samples: 0 };
      }
      periodData[period].rounds++;
      if (r.result_metrics?.accuracy) periodData[period].accuracies.push(r.result_metrics.accuracy);
      if (r.result_metrics?.loss) periodData[period].losses.push(r.result_metrics.loss);
      if (r.result_metrics?.total_samples) periodData[period].samples += r.result_metrics.total_samples;
    });

    const data = Object.entries(periodData)
      .map(([period, d]) => ({
        period,
        rounds: d.rounds,
        avg_accuracy: d.accuracies.length > 0 ? d.accuracies.reduce((a, b) => a + b, 0) / d.accuracies.length : null,
        avg_loss: d.losses.length > 0 ? d.losses.reduce((a, b) => a + b, 0) / d.losses.length : null,
        total_samples: d.samples
      }))
      .sort((a, b) => a.period.localeCompare(b.period));

    res.json({ data });
  } catch (error) {
    console.error('Training performance error:', error);
    res.status(500).json({ error: { message: 'Failed to get report', code: 'REPORT_ERROR' } });
  }
});

// GET /api/reports/device-participation - Device participation rates
router.get('/device-participation', async (req, res) => {
  try {
    const { from, to, limit = 50 } = req.query;

    const { data: devices } = await supabase
      .from('devices')
      .select('id, name, type, device_groups(name)')
      .eq('is_active', true);

    const deviceResults = await Promise.all(
      (devices || []).slice(0, parseInt(limit)).map(async (device) => {
        let query = supabase
          .from('device_training_contributions')
          .select('status, data_samples_count')
          .eq('device_id', device.id);

        if (from) query = query.gte('created_at', from);
        if (to) query = query.lte('created_at', to);

        const { data: contributions } = await query;

        const successful = (contributions || []).filter(c => c.status === 'completed').length;
        const failed = (contributions || []).filter(c => c.status === 'failed').length;
        const total = (contributions || []).length;
        const totalSamples = (contributions || []).reduce((sum, c) => sum + (c.data_samples_count || 0), 0);

        return {
          id: device.id,
          name: device.name,
          type: device.type,
          group_name: device.device_groups?.name || null,
          successful,
          failed,
          total,
          total_samples: totalSamples,
          participation_rate: total > 0 ? (successful / total * 100).toFixed(2) : 0
        };
      })
    );

    res.json({
      data: deviceResults.sort((a, b) => b.successful - a.successful)
    });
  } catch (error) {
    console.error('Device participation error:', error);
    res.status(500).json({ error: { message: 'Failed to get report', code: 'REPORT_ERROR' } });
  }
});

// GET /api/reports/model-comparison - Compare model versions
router.get('/model-comparison', async (req, res) => {
  try {
    const { model_id } = req.query;

    let query = supabase
      .from('model_versions')
      .select('*, models(name)')
      .order('created_at', { ascending: false });

    if (model_id) query = query.eq('model_id', model_id);

    const { data: versions, error } = await query;

    if (error) throw error;

    res.json({
      data: (versions || []).map(v => ({
        id: v.id,
        version: v.version,
        created_at: v.created_at,
        is_deployed: v.is_deployed,
        deployment_count: v.deployment_count,
        accuracy: v.metrics?.accuracy || null,
        loss: v.metrics?.loss || null,
        f1_score: v.metrics?.f1_score || null,
        model_name: v.models?.name || null
      }))
    });
  } catch (error) {
    console.error('Model comparison error:', error);
    res.status(500).json({ error: { message: 'Failed to get report', code: 'REPORT_ERROR' } });
  }
});

// GET /api/reports/anomaly-frequency - Anomaly frequency analysis
router.get('/anomaly-frequency', async (req, res) => {
  try {
    const { from, to, interval = 'day' } = req.query;

    let query = supabase
      .from('anomalies')
      .select('detected_at, anomaly_type, severity');

    if (from) query = query.gte('detected_at', from);
    if (to) query = query.lte('detected_at', to);

    const { data: anomalies, error } = await query;

    if (error) throw error;

    const groupByPeriod = (timestamp) => {
      const date = new Date(timestamp);
      switch (interval) {
        case 'hour':
          return date.toISOString().slice(0, 13) + ':00:00';
        case 'week':
          const weekNum = Math.ceil(date.getDate() / 7);
          return `${date.getFullYear()}-W${weekNum.toString().padStart(2, '0')}`;
        case 'month':
          return date.toISOString().slice(0, 7);
        default:
          return date.toISOString().slice(0, 10);
      }
    };

    // Group by period, type, severity
    const periodData = {};
    const byType = {};
    const bySeverity = {};

    (anomalies || []).forEach(a => {
      const period = groupByPeriod(a.detected_at);
      const key = `${period}|${a.anomaly_type}|${a.severity}`;
      periodData[key] = (periodData[key] || 0) + 1;
      byType[a.anomaly_type] = (byType[a.anomaly_type] || 0) + 1;
      bySeverity[a.severity] = (bySeverity[a.severity] || 0) + 1;
    });

    const data = Object.entries(periodData).map(([key, count]) => {
      const [period, anomaly_type, severity] = key.split('|');
      return { period, anomaly_type, severity, count };
    }).sort((a, b) => a.period.localeCompare(b.period));

    res.json({
      data,
      summary: {
        by_type: Object.entries(byType).map(([anomaly_type, count]) => ({ anomaly_type, count })),
        by_severity: Object.entries(bySeverity).map(([severity, count]) => ({ severity, count }))
      }
    });
  } catch (error) {
    console.error('Anomaly frequency error:', error);
    res.status(500).json({ error: { message: 'Failed to get report', code: 'REPORT_ERROR' } });
  }
});

// GET /api/reports/maintenance-costs - Maintenance cost projections
router.get('/maintenance-costs', async (req, res) => {
  try {
    const { from, to } = req.query;

    let query = supabase
      .from('maintenance_predictions')
      .select('risk_level, prediction_type, status, estimated_cost');

    if (from) query = query.gte('created_at', from);
    if (to) query = query.lte('created_at', to);

    const { data: predictions, error } = await query;

    if (error) throw error;

    // Group by risk level and prediction type
    const grouped = {};
    const byStatus = {};

    (predictions || []).forEach(p => {
      const key = `${p.risk_level}|${p.prediction_type}`;
      if (!grouped[key]) {
        grouped[key] = { count: 0, total_cost: 0 };
      }
      grouped[key].count++;
      grouped[key].total_cost += p.estimated_cost || 0;

      byStatus[p.status] = byStatus[p.status] || { count: 0, total_cost: 0 };
      byStatus[p.status].count++;
      byStatus[p.status].total_cost += p.estimated_cost || 0;
    });

    const data = Object.entries(grouped).map(([key, d]) => {
      const [risk_level, prediction_type] = key.split('|');
      return {
        risk_level,
        prediction_type,
        count: d.count,
        total_cost: d.total_cost,
        avg_cost: d.count > 0 ? d.total_cost / d.count : 0
      };
    });

    res.json({
      data,
      by_status: Object.entries(byStatus).map(([status, d]) => ({
        status,
        count: d.count,
        total_cost: d.total_cost
      }))
    });
  } catch (error) {
    console.error('Maintenance costs error:', error);
    res.status(500).json({ error: { message: 'Failed to get report', code: 'REPORT_ERROR' } });
  }
});

// GET /api/reports/quality-summary - Quality metrics summary
router.get('/quality-summary', async (req, res) => {
  try {
    const { from, to, device_id } = req.query;

    let query = supabase
      .from('quality_inspections')
      .select('result, human_override, confidence_score, defect_type');

    if (from) query = query.gte('inspection_timestamp', from);
    if (to) query = query.lte('inspection_timestamp', to);
    if (device_id) query = query.eq('device_id', device_id);

    const { data: inspections, error } = await query;

    if (error) throw error;

    const total = (inspections || []).length;
    const passed = (inspections || []).filter(i => i.result === 'pass').length;
    const failed = (inspections || []).filter(i => i.result === 'fail').length;
    const warning = (inspections || []).filter(i => i.result === 'warning').length;
    const overrides = (inspections || []).filter(i => i.human_override).length;
    const avgConfidence = total > 0
      ? (inspections || []).reduce((sum, i) => sum + (i.confidence_score || 0), 0) / total
      : 0;

    // Defect distribution
    const defectCounts = {};
    (inspections || []).filter(i => i.defect_type).forEach(i => {
      defectCounts[i.defect_type] = (defectCounts[i.defect_type] || 0) + 1;
    });

    const defects = Object.entries(defectCounts)
      .map(([defect_type, count]) => ({ defect_type, count }))
      .sort((a, b) => b.count - a.count);

    res.json({
      summary: {
        total,
        passed,
        failed,
        warning,
        overrides,
        avg_confidence: avgConfidence,
        pass_rate: total > 0 ? (passed / total * 100).toFixed(2) : 0
      },
      defects
    });
  } catch (error) {
    console.error('Quality summary error:', error);
    res.status(500).json({ error: { message: 'Failed to get report', code: 'REPORT_ERROR' } });
  }
});

// GET /api/reports/privacy-budget - Privacy budget consumption
router.get('/privacy-budget', async (req, res) => {
  try {
    const { model_id } = req.query;

    let query = supabase
      .from('privacy_budget_logs')
      .select('*, models(name), training_rounds(round_number)')
      .order('timestamp', { ascending: false })
      .limit(100);

    if (model_id) query = query.eq('model_id', model_id);

    const { data: logs, error } = await query;

    if (error) throw error;

    // Get cumulative by model
    const { data: allLogs } = await supabase
      .from('privacy_budget_logs')
      .select('model_id, epsilon_consumed, budget_limit, models(name)');

    const modelStats = {};
    (allLogs || []).forEach(l => {
      if (!modelStats[l.model_id]) {
        modelStats[l.model_id] = {
          id: l.model_id,
          name: l.models?.name || 'Unknown',
          total_epsilon: 0,
          budget_limit: l.budget_limit || 0,
          training_rounds: 0
        };
      }
      modelStats[l.model_id].total_epsilon += l.epsilon_consumed || 0;
      modelStats[l.model_id].training_rounds++;
    });

    res.json({
      logs: (logs || []).map(l => ({
        ...l,
        model_name: l.models?.name || null,
        round_number: l.training_rounds?.round_number || null,
        models: undefined,
        training_rounds: undefined
      })),
      by_model: Object.values(modelStats)
    });
  } catch (error) {
    console.error('Privacy budget error:', error);
    res.status(500).json({ error: { message: 'Failed to get report', code: 'REPORT_ERROR' } });
  }
});

// GET /api/reports/export - Export report as PDF (mock)
router.get('/export', async (req, res) => {
  try {
    const { report_type, format = 'pdf' } = req.query;

    res.json({
      message: 'Report export initiated',
      report_type,
      format,
      download_url: `/api/reports/download/${Date.now()}.${format}`,
      status: 'pending'
    });
  } catch (error) {
    console.error('Export error:', error);
    res.status(500).json({ error: { message: 'Failed to export report', code: 'EXPORT_ERROR' } });
  }
});

export default router;
