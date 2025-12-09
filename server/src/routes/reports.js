import { Router } from 'express';
import db from '../utils/db.js';

const router = Router();

// GET /api/reports/training-performance - Training metrics over time
router.get('/training-performance', (req, res) => {
  try {
    const { model_id, from, to, interval = 'day' } = req.query;

    let dateFormat;
    switch (interval) {
      case 'hour': dateFormat = '%Y-%m-%d %H:00:00'; break;
      case 'week': dateFormat = '%Y-%W'; break;
      case 'month': dateFormat = '%Y-%m'; break;
      default: dateFormat = '%Y-%m-%d';
    }

    let query = `
      SELECT
        strftime('${dateFormat}', tr.completed_at) as period,
        COUNT(*) as rounds,
        AVG(json_extract(tr.result_metrics, '$.accuracy')) as avg_accuracy,
        AVG(json_extract(tr.result_metrics, '$.loss')) as avg_loss,
        SUM(json_extract(tr.result_metrics, '$.total_samples')) as total_samples
      FROM training_rounds tr
      WHERE tr.status = 'completed'
    `;
    const params = [];

    if (model_id) { query += ' AND tr.model_id = ?'; params.push(model_id); }
    if (from) { query += ' AND tr.completed_at >= ?'; params.push(from); }
    if (to) { query += ' AND tr.completed_at <= ?'; params.push(to); }

    query += ' GROUP BY period ORDER BY period ASC';

    const data = db.prepare(query).all(...params);
    res.json({ data });
  } catch (error) {
    console.error('Training performance error:', error);
    res.status(500).json({ error: { message: 'Failed to get report', code: 'REPORT_ERROR' } });
  }
});

// GET /api/reports/device-participation - Device participation rates
router.get('/device-participation', (req, res) => {
  try {
    const { from, to, limit = 50 } = req.query;

    let query = `
      SELECT
        d.id, d.name, d.type, dg.name as group_name,
        COUNT(CASE WHEN dtc.status = 'completed' THEN 1 END) as successful,
        COUNT(CASE WHEN dtc.status = 'failed' THEN 1 END) as failed,
        COUNT(*) as total,
        SUM(dtc.data_samples_count) as total_samples
      FROM devices d
      LEFT JOIN device_training_contributions dtc ON d.id = dtc.device_id
      LEFT JOIN device_groups dg ON d.device_group_id = dg.id
      WHERE d.is_active = 1
    `;
    const params = [];

    if (from) { query += ' AND dtc.created_at >= ?'; params.push(from); }
    if (to) { query += ' AND dtc.created_at <= ?'; params.push(to); }

    query += ' GROUP BY d.id ORDER BY successful DESC LIMIT ?';
    params.push(parseInt(limit));

    const data = db.prepare(query).all(...params);

    res.json({
      data: data.map(d => ({
        ...d,
        participation_rate: d.total > 0 ? (d.successful / d.total * 100).toFixed(2) : 0
      }))
    });
  } catch (error) {
    console.error('Device participation error:', error);
    res.status(500).json({ error: { message: 'Failed to get report', code: 'REPORT_ERROR' } });
  }
});

// GET /api/reports/model-comparison - Compare model versions
router.get('/model-comparison', (req, res) => {
  try {
    const { model_id } = req.query;

    let query = `
      SELECT
        mv.id, mv.version, mv.created_at, mv.is_deployed, mv.deployment_count,
        json_extract(mv.metrics, '$.accuracy') as accuracy,
        json_extract(mv.metrics, '$.loss') as loss,
        json_extract(mv.metrics, '$.f1_score') as f1_score,
        m.name as model_name
      FROM model_versions mv
      JOIN models m ON mv.model_id = m.id
    `;
    const params = [];

    if (model_id) {
      query += ' WHERE mv.model_id = ?';
      params.push(model_id);
    }

    query += ' ORDER BY mv.created_at DESC';

    const data = db.prepare(query).all(...params);
    res.json({ data });
  } catch (error) {
    console.error('Model comparison error:', error);
    res.status(500).json({ error: { message: 'Failed to get report', code: 'REPORT_ERROR' } });
  }
});

// GET /api/reports/anomaly-frequency - Anomaly frequency analysis
router.get('/anomaly-frequency', (req, res) => {
  try {
    const { from, to, interval = 'day' } = req.query;

    let dateFormat;
    switch (interval) {
      case 'hour': dateFormat = '%Y-%m-%d %H:00:00'; break;
      case 'week': dateFormat = '%Y-%W'; break;
      case 'month': dateFormat = '%Y-%m'; break;
      default: dateFormat = '%Y-%m-%d';
    }

    let query = `
      SELECT
        strftime('${dateFormat}', detected_at) as period,
        anomaly_type,
        severity,
        COUNT(*) as count
      FROM anomalies
      WHERE 1=1
    `;
    const params = [];

    if (from) { query += ' AND detected_at >= ?'; params.push(from); }
    if (to) { query += ' AND detected_at <= ?'; params.push(to); }

    query += ' GROUP BY period, anomaly_type, severity ORDER BY period ASC';

    const data = db.prepare(query).all(...params);

    // Summary by type
    const byType = db.prepare(`
      SELECT anomaly_type, COUNT(*) as count
      FROM anomalies
      ${from || to ? 'WHERE ' + (from ? 'detected_at >= ?' : '') + (from && to ? ' AND ' : '') + (to ? 'detected_at <= ?' : '') : ''}
      GROUP BY anomaly_type
    `).all(...(from && to ? [from, to] : from ? [from] : to ? [to] : []));

    // Summary by severity
    const bySeverity = db.prepare(`
      SELECT severity, COUNT(*) as count
      FROM anomalies
      ${from || to ? 'WHERE ' + (from ? 'detected_at >= ?' : '') + (from && to ? ' AND ' : '') + (to ? 'detected_at <= ?' : '') : ''}
      GROUP BY severity
    `).all(...(from && to ? [from, to] : from ? [from] : to ? [to] : []));

    res.json({ data, summary: { by_type: byType, by_severity: bySeverity } });
  } catch (error) {
    console.error('Anomaly frequency error:', error);
    res.status(500).json({ error: { message: 'Failed to get report', code: 'REPORT_ERROR' } });
  }
});

// GET /api/reports/maintenance-costs - Maintenance cost projections
router.get('/maintenance-costs', (req, res) => {
  try {
    const { from, to } = req.query;

    let query = `
      SELECT
        mp.risk_level,
        mp.prediction_type,
        COUNT(*) as count,
        SUM(mp.estimated_cost) as total_cost,
        AVG(mp.estimated_cost) as avg_cost
      FROM maintenance_predictions mp
      WHERE 1=1
    `;
    const params = [];

    if (from) { query += ' AND mp.created_at >= ?'; params.push(from); }
    if (to) { query += ' AND mp.created_at <= ?'; params.push(to); }

    query += ' GROUP BY mp.risk_level, mp.prediction_type';

    const data = db.prepare(query).all(...params);

    // Total by status
    const byStatus = db.prepare(`
      SELECT status, COUNT(*) as count, SUM(estimated_cost) as total_cost
      FROM maintenance_predictions
      GROUP BY status
    `).all();

    res.json({ data, by_status: byStatus });
  } catch (error) {
    console.error('Maintenance costs error:', error);
    res.status(500).json({ error: { message: 'Failed to get report', code: 'REPORT_ERROR' } });
  }
});

// GET /api/reports/quality-summary - Quality metrics summary
router.get('/quality-summary', (req, res) => {
  try {
    const { from, to, device_id } = req.query;

    let whereClause = '1=1';
    const params = [];

    if (from) { whereClause += ' AND inspection_timestamp >= ?'; params.push(from); }
    if (to) { whereClause += ' AND inspection_timestamp <= ?'; params.push(to); }
    if (device_id) { whereClause += ' AND device_id = ?'; params.push(device_id); }

    const summary = db.prepare(`
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN result = 'pass' THEN 1 ELSE 0 END) as passed,
        SUM(CASE WHEN result = 'fail' THEN 1 ELSE 0 END) as failed,
        SUM(CASE WHEN result = 'warning' THEN 1 ELSE 0 END) as warning,
        SUM(CASE WHEN human_override = 1 THEN 1 ELSE 0 END) as overrides,
        AVG(confidence_score) as avg_confidence
      FROM quality_inspections
      WHERE ${whereClause}
    `).get(...params);

    const byDefect = db.prepare(`
      SELECT defect_type, COUNT(*) as count
      FROM quality_inspections
      WHERE ${whereClause} AND defect_type IS NOT NULL
      GROUP BY defect_type
      ORDER BY count DESC
    `).all(...params);

    res.json({
      summary: {
        ...summary,
        pass_rate: summary.total > 0 ? (summary.passed / summary.total * 100).toFixed(2) : 0
      },
      defects: byDefect
    });
  } catch (error) {
    console.error('Quality summary error:', error);
    res.status(500).json({ error: { message: 'Failed to get report', code: 'REPORT_ERROR' } });
  }
});

// GET /api/reports/privacy-budget - Privacy budget consumption
router.get('/privacy-budget', (req, res) => {
  try {
    const { model_id } = req.query;

    let query = `
      SELECT
        pbl.*, m.name as model_name, tr.round_number
      FROM privacy_budget_logs pbl
      JOIN models m ON pbl.model_id = m.id
      LEFT JOIN training_rounds tr ON pbl.training_round_id = tr.id
    `;
    const params = [];

    if (model_id) {
      query += ' WHERE pbl.model_id = ?';
      params.push(model_id);
    }

    query += ' ORDER BY pbl.timestamp DESC LIMIT 100';

    const logs = db.prepare(query).all(...params);

    // Get cumulative by model
    const byModel = db.prepare(`
      SELECT
        m.id, m.name,
        SUM(pbl.epsilon_consumed) as total_epsilon,
        MAX(pbl.budget_limit) as budget_limit,
        COUNT(*) as training_rounds
      FROM privacy_budget_logs pbl
      JOIN models m ON pbl.model_id = m.id
      GROUP BY m.id
    `).all();

    res.json({ logs, by_model: byModel });
  } catch (error) {
    console.error('Privacy budget error:', error);
    res.status(500).json({ error: { message: 'Failed to get report', code: 'REPORT_ERROR' } });
  }
});

// GET /api/reports/export - Export report as PDF (mock)
router.get('/export', (req, res) => {
  try {
    const { report_type, format = 'pdf' } = req.query;

    // In a real implementation, this would generate an actual PDF
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
