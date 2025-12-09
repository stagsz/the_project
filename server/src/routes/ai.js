import { Router } from 'express';
import { readFileSync, existsSync } from 'fs';
import db from '../utils/db.js';

const router = Router();

// Helper function to get API key
function getApiKey() {
  const keyPath = process.env.ANTHROPIC_API_KEY_PATH || '/tmp/api-key';
  if (existsSync(keyPath)) {
    try {
      return readFileSync(keyPath, 'utf-8').trim();
    } catch (e) {
      console.error('Failed to read API key:', e);
    }
  }
  return process.env.ANTHROPIC_API_KEY || null;
}

// Helper function to call Claude API
async function callClaude(prompt, systemPrompt = null) {
  const apiKey = getApiKey();

  if (!apiKey) {
    // Return mock response if no API key
    return {
      content: 'AI insights are not available. Please configure your API key.',
      mock: true
    };
  }

  try {
    const { default: Anthropic } = await import('@anthropic-ai/sdk');
    const client = new Anthropic({ apiKey });

    const messages = [{ role: 'user', content: prompt }];

    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      system: systemPrompt || 'You are an AI assistant for an industrial federated learning platform. Provide concise, technical insights.',
      messages
    });

    return {
      content: response.content[0].text,
      mock: false
    };
  } catch (error) {
    console.error('Claude API error:', error);
    return {
      content: 'Failed to get AI response. Please try again later.',
      error: true
    };
  }
}

// POST /api/ai/query - Natural language query about system
router.post('/query', async (req, res) => {
  try {
    const { query } = req.body;

    if (!query) {
      return res.status(400).json({ error: { message: 'query is required', code: 'VALIDATION_ERROR' } });
    }

    // Gather context
    const deviceStats = db.prepare(`
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN status = 'online' THEN 1 ELSE 0 END) as online,
        SUM(CASE WHEN status = 'offline' THEN 1 ELSE 0 END) as offline,
        SUM(CASE WHEN status = 'error' THEN 1 ELSE 0 END) as error
      FROM devices WHERE is_active = 1
    `).get();

    const modelStats = db.prepare(`
      SELECT COUNT(*) as total,
        SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active
      FROM models
    `).get();

    const recentAnomalies = db.prepare(`
      SELECT anomaly_type, severity, COUNT(*) as count
      FROM anomalies
      WHERE detected_at > datetime('now', '-24 hours')
      GROUP BY anomaly_type, severity
    `).all();

    const trainingStatus = db.prepare(`
      SELECT status, COUNT(*) as count
      FROM training_rounds
      WHERE created_at > datetime('now', '-7 days')
      GROUP BY status
    `).all();

    const context = `
Current System Status:
- Devices: ${deviceStats.total} total (${deviceStats.online} online, ${deviceStats.offline} offline, ${deviceStats.error} error)
- Models: ${modelStats.total} total (${modelStats.active} active)
- Recent Anomalies (24h): ${JSON.stringify(recentAnomalies)}
- Training Rounds (7d): ${JSON.stringify(trainingStatus)}
    `;

    const systemPrompt = `You are an AI assistant for FedLearn Industrial, a federated learning platform for industrial IoT.
You help operators understand system status, troubleshoot issues, and optimize operations.
Use ISO 8601 date format, 24-hour time, and SI units in your responses.
Be concise and focus on actionable insights.

Current context:
${context}`;

    const response = await callClaude(query, systemPrompt);

    res.json({ response: response.content, mock: response.mock });
  } catch (error) {
    console.error('AI query error:', error);
    res.status(500).json({ error: { message: 'Failed to process query', code: 'AI_ERROR' } });
  }
});

// GET /api/ai/insights - Get AI-generated insights
router.get('/insights', async (req, res) => {
  try {
    // Gather system data for insights
    const anomalyCount = db.prepare(`
      SELECT COUNT(*) as count FROM anomalies
      WHERE status = 'new' AND detected_at > datetime('now', '-24 hours')
    `).get();

    const offlineDevices = db.prepare(`
      SELECT name, last_heartbeat FROM devices
      WHERE status = 'offline' AND is_active = 1
      ORDER BY last_heartbeat DESC LIMIT 5
    `).all();

    const pendingMaintenance = db.prepare(`
      SELECT COUNT(*) as count FROM maintenance_predictions
      WHERE status = 'pending' AND risk_level IN ('high', 'critical')
    `).get();

    const recentTrainingSuccess = db.prepare(`
      SELECT
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
        SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed
      FROM training_rounds
      WHERE created_at > datetime('now', '-7 days')
    `).get();

    const prompt = `Based on the following system data, provide 3-5 brief, actionable insights for system operators:

- Unacknowledged anomalies in last 24h: ${anomalyCount.count}
- Offline devices: ${offlineDevices.map(d => d.name).join(', ') || 'None'}
- High/critical pending maintenance: ${pendingMaintenance.count}
- Training rounds (7d): ${recentTrainingSuccess.completed} completed, ${recentTrainingSuccess.failed} failed

Format as a JSON array of objects with 'title', 'description', and 'priority' (high/medium/low) fields.`;

    const response = await callClaude(prompt);

    let insights = [];
    if (!response.mock && !response.error) {
      try {
        // Try to parse JSON from response
        const jsonMatch = response.content.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          insights = JSON.parse(jsonMatch[0]);
        }
      } catch (e) {
        insights = [{
          title: 'System Status',
          description: response.content,
          priority: 'medium'
        }];
      }
    } else {
      // Generate basic insights without AI
      if (anomalyCount.count > 0) {
        insights.push({
          title: 'Unacknowledged Anomalies',
          description: `There are ${anomalyCount.count} anomalies that need attention.`,
          priority: anomalyCount.count > 5 ? 'high' : 'medium'
        });
      }
      if (offlineDevices.length > 0) {
        insights.push({
          title: 'Offline Devices',
          description: `${offlineDevices.length} devices are currently offline.`,
          priority: 'medium'
        });
      }
      if (pendingMaintenance.count > 0) {
        insights.push({
          title: 'Pending Maintenance',
          description: `${pendingMaintenance.count} high-priority maintenance items pending.`,
          priority: 'high'
        });
      }
    }

    res.json({ insights, mock: response.mock });
  } catch (error) {
    console.error('Get insights error:', error);
    res.status(500).json({ error: { message: 'Failed to get insights', code: 'AI_ERROR' } });
  }
});

// POST /api/ai/explain-anomaly - Get AI explanation for anomaly
router.post('/explain-anomaly', async (req, res) => {
  try {
    const { anomaly_id } = req.body;

    if (!anomaly_id) {
      return res.status(400).json({ error: { message: 'anomaly_id is required', code: 'VALIDATION_ERROR' } });
    }

    const anomaly = db.prepare(`
      SELECT a.*, d.name as device_name, d.type as device_type
      FROM anomalies a
      JOIN devices d ON a.device_id = d.id
      WHERE a.id = ?
    `).get(anomaly_id);

    if (!anomaly) {
      return res.status(404).json({ error: { message: 'Anomaly not found', code: 'NOT_FOUND' } });
    }

    // Get recent metrics for context
    const recentMetrics = db.prepare(`
      SELECT * FROM device_metrics
      WHERE device_id = ? AND timestamp <= ?
      ORDER BY timestamp DESC LIMIT 10
    `).all(anomaly.device_id, anomaly.detected_at);

    const sensorData = JSON.parse(anomaly.sensor_data || '{}');

    const prompt = `Analyze this industrial anomaly and provide a brief explanation and recommended actions:

Device: ${anomaly.device_name} (${anomaly.device_type})
Anomaly Type: ${anomaly.anomaly_type}
Severity: ${anomaly.severity}
Detected: ${anomaly.detected_at}
Confidence: ${(anomaly.confidence_score * 100).toFixed(1)}%
Sensor Data: ${JSON.stringify(sensorData)}
Description: ${anomaly.description || 'No description'}

Recent Metrics:
${recentMetrics.map(m => `- CPU: ${m.cpu_usage?.toFixed(1)}%, Temp: ${m.temperature_celsius?.toFixed(1)}C, Errors: ${m.error_count}`).join('\n')}

Provide:
1. Likely root cause
2. Potential impact if not addressed
3. Recommended immediate actions
4. Preventive measures`;

    const response = await callClaude(prompt);

    // Store explanation in anomaly
    db.prepare('UPDATE anomalies SET ai_explanation = ? WHERE id = ?').run(response.content, anomaly_id);

    res.json({
      explanation: response.content,
      anomaly_id,
      mock: response.mock
    });
  } catch (error) {
    console.error('Explain anomaly error:', error);
    res.status(500).json({ error: { message: 'Failed to explain anomaly', code: 'AI_ERROR' } });
  }
});

// GET /api/ai/recommendations - Get optimization recommendations
router.get('/recommendations', async (req, res) => {
  try {
    // Gather training performance data
    const trainingPerformance = db.prepare(`
      SELECT m.name as model_name, m.model_type,
        AVG(json_extract(tr.result_metrics, '$.accuracy')) as avg_accuracy,
        COUNT(*) as round_count
      FROM training_rounds tr
      JOIN models m ON tr.model_id = m.id
      WHERE tr.status = 'completed'
      GROUP BY m.id
    `).all();

    // Get device participation rates
    const participationRates = db.prepare(`
      SELECT d.name, d.type,
        COUNT(CASE WHEN dtc.status = 'completed' THEN 1 END) as successful,
        COUNT(*) as total
      FROM device_training_contributions dtc
      JOIN devices d ON dtc.device_id = d.id
      GROUP BY d.id
      ORDER BY successful * 1.0 / total ASC
      LIMIT 5
    `).all();

    const prompt = `Based on the following federated learning performance data, provide 3-5 optimization recommendations:

Model Performance:
${trainingPerformance.map(m => `- ${m.model_name} (${m.model_type}): ${(m.avg_accuracy * 100).toFixed(1)}% avg accuracy, ${m.round_count} rounds`).join('\n')}

Lowest Participation Devices:
${participationRates.map(d => `- ${d.name}: ${d.successful}/${d.total} successful (${(d.successful / d.total * 100).toFixed(0)}%)`).join('\n')}

Format as JSON array with 'category', 'recommendation', and 'expected_impact' fields.`;

    const response = await callClaude(prompt);

    let recommendations = [];
    if (!response.mock && !response.error) {
      try {
        const jsonMatch = response.content.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          recommendations = JSON.parse(jsonMatch[0]);
        }
      } catch (e) {
        recommendations = [{
          category: 'General',
          recommendation: response.content,
          expected_impact: 'Variable'
        }];
      }
    }

    res.json({ recommendations, mock: response.mock });
  } catch (error) {
    console.error('Get recommendations error:', error);
    res.status(500).json({ error: { message: 'Failed to get recommendations', code: 'AI_ERROR' } });
  }
});

// POST /api/ai/analyze-training - Analyze training performance
router.post('/analyze-training', async (req, res) => {
  try {
    const { training_round_id } = req.body;

    if (!training_round_id) {
      return res.status(400).json({ error: { message: 'training_round_id is required', code: 'VALIDATION_ERROR' } });
    }

    const round = db.prepare(`
      SELECT tr.*, m.name as model_name, m.model_type
      FROM training_rounds tr
      JOIN models m ON tr.model_id = m.id
      WHERE tr.id = ?
    `).get(training_round_id);

    if (!round) {
      return res.status(404).json({ error: { message: 'Training round not found', code: 'NOT_FOUND' } });
    }

    const contributions = db.prepare(`
      SELECT dtc.*, d.name as device_name
      FROM device_training_contributions dtc
      JOIN devices d ON dtc.device_id = d.id
      WHERE dtc.training_round_id = ?
    `).all(training_round_id);

    const hyperparameters = JSON.parse(round.hyperparameters || '{}');
    const resultMetrics = JSON.parse(round.result_metrics || '{}');

    const prompt = `Analyze this federated learning training round:

Model: ${round.model_name} (${round.model_type})
Round: ${round.round_number}
Status: ${round.status}
Hyperparameters: learning_rate=${hyperparameters.learning_rate}, batch_size=${hyperparameters.batch_size}, epochs=${hyperparameters.local_epochs}
Final Metrics: accuracy=${resultMetrics.accuracy?.toFixed(4)}, loss=${resultMetrics.loss?.toFixed(4)}

Device Contributions:
${contributions.map(c => {
  const metrics = JSON.parse(c.local_metrics || '{}');
  return `- ${c.device_name}: ${c.status}, samples=${c.data_samples_count}, loss=${metrics.loss?.toFixed(4) || 'N/A'}`;
}).join('\n')}

Provide:
1. Training quality assessment
2. Device contribution analysis
3. Hyperparameter recommendations for next round
4. Potential issues to address`;

    const response = await callClaude(prompt);

    res.json({
      analysis: response.content,
      training_round_id,
      mock: response.mock
    });
  } catch (error) {
    console.error('Analyze training error:', error);
    res.status(500).json({ error: { message: 'Failed to analyze training', code: 'AI_ERROR' } });
  }
});

export default router;
