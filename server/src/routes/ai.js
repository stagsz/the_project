import { Router } from 'express';
import { readFileSync, existsSync } from 'fs';
import { v4 as uuidv4 } from 'uuid';
import supabase from '../utils/supabase.js';

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

// Helper function to log AI responses
async function logAIResponse(queryType, queryText, responseText, options = {}) {
  try {
    await supabase
      .from('ai_logs')
      .insert({
        id: uuidv4(),
        query_type: queryType,
        query_text: queryText.substring(0, 500),
        response_text: responseText.substring(0, 2000),
        device_id: options.device_id || null,
        anomaly_id: options.anomaly_id || null,
        training_round_id: options.training_round_id || null,
        device_name: options.device_name || null,
        device_type: options.device_type || null,
        user_id: options.user_id || null,
        created_at: new Date().toISOString()
      });
  } catch (error) {
    console.error('Failed to log AI response:', error);
    // Don't throw - logging failure shouldn't break the API
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
    const { count: totalDevices } = await supabase
      .from('devices')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true);

    const { count: onlineDevices } = await supabase
      .from('devices')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true)
      .eq('status', 'online');

    const { count: offlineDevices } = await supabase
      .from('devices')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true)
      .eq('status', 'offline');

    const { count: errorDevices } = await supabase
      .from('devices')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true)
      .eq('status', 'error');

    const { count: totalModels } = await supabase
      .from('models')
      .select('*', { count: 'exact', head: true });

    const { count: activeModels } = await supabase
      .from('models')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'active');

    // Get recent anomalies
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data: recentAnomalies } = await supabase
      .from('anomalies')
      .select('anomaly_type, severity')
      .gte('detected_at', yesterday);

    // Group anomalies
    const anomalyGroups = {};
    (recentAnomalies || []).forEach(a => {
      const key = `${a.anomaly_type}-${a.severity}`;
      anomalyGroups[key] = (anomalyGroups[key] || 0) + 1;
    });

    // Get training status
    const lastWeek = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const { data: trainingRounds } = await supabase
      .from('training_rounds')
      .select('status')
      .gte('created_at', lastWeek);

    const trainingStatus = {};
    (trainingRounds || []).forEach(t => {
      trainingStatus[t.status] = (trainingStatus[t.status] || 0) + 1;
    });

    const context = `
Current System Status:
- Devices: ${totalDevices || 0} total (${onlineDevices || 0} online, ${offlineDevices || 0} offline, ${errorDevices || 0} error)
- Models: ${totalModels || 0} total (${activeModels || 0} active)
- Recent Anomalies (24h): ${JSON.stringify(anomalyGroups)}
- Training Rounds (7d): ${JSON.stringify(trainingStatus)}
    `;

    const systemPrompt = `You are an AI assistant for FedLearn Industrial, a federated learning platform for industrial IoT.
You help operators understand system status, troubleshoot issues, and optimize operations.
Use ISO 8601 date format, 24-hour time, and SI units in your responses.
Be concise and focus on actionable insights.

Current context:
${context}`;

    const response = await callClaude(query, systemPrompt);

    // Log AI response
    await logAIResponse('query', query, response.content);

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
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { count: anomalyCount } = await supabase
      .from('anomalies')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'new')
      .gte('detected_at', yesterday);

    const { data: offlineDevices } = await supabase
      .from('devices')
      .select('name, last_heartbeat')
      .eq('status', 'offline')
      .eq('is_active', true)
      .order('last_heartbeat', { ascending: false })
      .limit(5);

    const { count: pendingMaintenance } = await supabase
      .from('maintenance_predictions')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending')
      .in('risk_level', ['high', 'critical']);

    const lastWeek = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const { count: completedTraining } = await supabase
      .from('training_rounds')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'completed')
      .gte('created_at', lastWeek);

    const { count: failedTraining } = await supabase
      .from('training_rounds')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'failed')
      .gte('created_at', lastWeek);

    const prompt = `Based on the following system data, provide 3-5 brief, actionable insights for system operators:

- Unacknowledged anomalies in last 24h: ${anomalyCount || 0}
- Offline devices: ${(offlineDevices || []).map(d => d.name).join(', ') || 'None'}
- High/critical pending maintenance: ${pendingMaintenance || 0}
- Training rounds (7d): ${completedTraining || 0} completed, ${failedTraining || 0} failed

Format as a JSON array of objects with 'title', 'description', and 'priority' (high/medium/low) fields.`;

    const response = await callClaude(prompt);

    let insights = [];
    if (!response.mock && !response.error) {
      try {
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
      if ((anomalyCount || 0) > 0) {
        insights.push({
          title: 'Unacknowledged Anomalies',
          description: `There are ${anomalyCount} anomalies that need attention.`,
          priority: (anomalyCount || 0) > 5 ? 'high' : 'medium'
        });
      }
      if ((offlineDevices || []).length > 0) {
        insights.push({
          title: 'Offline Devices',
          description: `${offlineDevices.length} devices are currently offline.`,
          priority: 'medium'
        });
      }
      if ((pendingMaintenance || 0) > 0) {
        insights.push({
          title: 'Pending Maintenance',
          description: `${pendingMaintenance} high-priority maintenance items pending.`,
          priority: 'high'
        });
      }
    }

    // Log AI response
    await logAIResponse('insights', prompt, response.content);

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

    const { data: anomaly, error } = await supabase
      .from('anomalies')
      .select('*, devices(name, type)')
      .eq('id', anomaly_id)
      .single();

    if (error || !anomaly) {
      return res.status(404).json({ error: { message: 'Anomaly not found', code: 'NOT_FOUND' } });
    }

    // Get recent metrics for context
    const { data: recentMetrics } = await supabase
      .from('device_metrics')
      .select('*')
      .eq('device_id', anomaly.device_id)
      .lte('timestamp', anomaly.detected_at)
      .order('timestamp', { ascending: false })
      .limit(10);

    const sensorData = anomaly.sensor_data || {};

    const prompt = `Analyze this industrial anomaly and provide a brief explanation and recommended actions:

Device: ${anomaly.devices?.name || 'Unknown'} (${anomaly.devices?.type || 'Unknown'})
Anomaly Type: ${anomaly.anomaly_type}
Severity: ${anomaly.severity}
Detected: ${anomaly.detected_at}
Confidence: ${((anomaly.confidence_score || 0) * 100).toFixed(1)}%
Sensor Data: ${JSON.stringify(sensorData)}
Description: ${anomaly.description || 'No description'}

Recent Metrics:
${(recentMetrics || []).map(m => `- CPU: ${m.cpu_usage?.toFixed(1)}%, Temp: ${m.temperature_celsius?.toFixed(1)}C, Errors: ${m.error_count}`).join('\n')}

Provide:
1. Likely root cause
2. Potential impact if not addressed
3. Recommended immediate actions
4. Preventive measures`;

    const response = await callClaude(prompt);

    // Store explanation in anomaly
    await supabase
      .from('anomalies')
      .update({ ai_explanation: response.content })
      .eq('id', anomaly_id);

    // Log AI response with device and anomaly info
    await logAIResponse('explain_anomaly', prompt, response.content, {
      device_id: anomaly.device_id,
      device_name: anomaly.devices?.name,
      device_type: anomaly.devices?.type,
      anomaly_id
    });

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
    const { data: trainingData } = await supabase
      .from('training_rounds')
      .select('result_metrics, models(name, model_type)')
      .eq('status', 'completed');

    // Group by model
    const modelPerformance = {};
    (trainingData || []).forEach(t => {
      const modelName = t.models?.name || 'Unknown';
      const modelType = t.models?.model_type || 'Unknown';
      if (!modelPerformance[modelName]) {
        modelPerformance[modelName] = {
          model_type: modelType,
          accuracies: [],
          count: 0
        };
      }
      modelPerformance[modelName].count++;
      if (t.result_metrics?.accuracy) {
        modelPerformance[modelName].accuracies.push(t.result_metrics.accuracy);
      }
    });

    const trainingPerformance = Object.entries(modelPerformance).map(([name, data]) => ({
      model_name: name,
      model_type: data.model_type,
      avg_accuracy: data.accuracies.length > 0
        ? data.accuracies.reduce((a, b) => a + b, 0) / data.accuracies.length
        : 0,
      round_count: data.count
    }));

    // Get device participation rates
    const { data: contributionData } = await supabase
      .from('device_training_contributions')
      .select('status, devices(name, type)');

    const deviceStats = {};
    (contributionData || []).forEach(c => {
      const deviceName = c.devices?.name || 'Unknown';
      if (!deviceStats[deviceName]) {
        deviceStats[deviceName] = { type: c.devices?.type, successful: 0, total: 0 };
      }
      deviceStats[deviceName].total++;
      if (c.status === 'completed') deviceStats[deviceName].successful++;
    });

    const participationRates = Object.entries(deviceStats)
      .map(([name, data]) => ({
        name,
        type: data.type,
        successful: data.successful,
        total: data.total
      }))
      .sort((a, b) => (a.successful / a.total) - (b.successful / b.total))
      .slice(0, 5);

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

    // Log AI response
    await logAIResponse('recommendations', prompt, response.content);

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

    const { data: round, error } = await supabase
      .from('training_rounds')
      .select('*, models(name, model_type)')
      .eq('id', training_round_id)
      .single();

    if (error || !round) {
      return res.status(404).json({ error: { message: 'Training round not found', code: 'NOT_FOUND' } });
    }

    const { data: contributions } = await supabase
      .from('device_training_contributions')
      .select('*, devices(name)')
      .eq('training_round_id', training_round_id);

    const hyperparameters = round.hyperparameters || {};
    const resultMetrics = round.result_metrics || {};

    const prompt = `Analyze this federated learning training round:

Model: ${round.models?.name || 'Unknown'} (${round.models?.model_type || 'Unknown'})
Round: ${round.round_number}
Status: ${round.status}
Hyperparameters: learning_rate=${hyperparameters.learning_rate}, batch_size=${hyperparameters.batch_size}, epochs=${hyperparameters.local_epochs}
Final Metrics: accuracy=${resultMetrics.accuracy?.toFixed(4)}, loss=${resultMetrics.loss?.toFixed(4)}

Device Contributions:
${(contributions || []).map(c => {
  const metrics = c.local_metrics || {};
  return `- ${c.devices?.name || 'Unknown'}: ${c.status}, samples=${c.data_samples_count}, loss=${metrics.loss?.toFixed(4) || 'N/A'}`;
}).join('\n')}

Provide:
1. Training quality assessment
2. Device contribution analysis
3. Hyperparameter recommendations for next round
4. Potential issues to address`;

    const response = await callClaude(prompt);

    // Log AI response with training info
    await logAIResponse('analyze_training', prompt, response.content, {
      training_round_id
    });

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

// GET /api/ai/logs - Get all AI response logs
router.get('/logs', async (req, res) => {
  try {
    const { device_id, query_type, limit = 50, offset = 0 } = req.query;

    let query = supabase
      .from('ai_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1);

    if (device_id) query = query.eq('device_id', device_id);
    if (query_type) query = query.eq('query_type', query_type);

    const { data: logs, error } = await query;

    if (error) throw error;

    // Get total count
    let countQuery = supabase
      .from('ai_logs')
      .select('*', { count: 'exact', head: true });

    if (device_id) countQuery = countQuery.eq('device_id', device_id);
    if (query_type) countQuery = countQuery.eq('query_type', query_type);

    const { count } = await countQuery;

    res.json({
      logs: logs || [],
      total: count || 0,
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
  } catch (error) {
    console.error('Get logs error:', error);
    res.status(500).json({ error: { message: 'Failed to get logs', code: 'GET_ERROR' } });
  }
});

// GET /api/ai/logs/:id - Get specific AI log
router.get('/logs/:id', async (req, res) => {
  try {
    const { data: log, error } = await supabase
      .from('ai_logs')
      .select('*')
      .eq('id', req.params.id)
      .single();

    if (error || !log) {
      return res.status(404).json({ error: { message: 'Log not found', code: 'NOT_FOUND' } });
    }

    res.json({ log });
  } catch (error) {
    console.error('Get log error:', error);
    res.status(500).json({ error: { message: 'Failed to get log', code: 'GET_ERROR' } });
  }
});

// GET /api/ai/logs/device/:deviceId - Get AI logs for specific device
router.get('/logs/device/:deviceId', async (req, res) => {
  try {
    const { limit = 50, offset = 0 } = req.query;

    const { data: logs, error } = await supabase
      .from('ai_logs')
      .select('*')
      .eq('device_id', req.params.deviceId)
      .order('created_at', { ascending: false })
      .range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1);

    if (error) throw error;

    const { count } = await supabase
      .from('ai_logs')
      .select('*', { count: 'exact', head: true })
      .eq('device_id', req.params.deviceId);

    res.json({
      logs: logs || [],
      total: count || 0,
      deviceId: req.params.deviceId,
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
  } catch (error) {
    console.error('Get device logs error:', error);
    res.status(500).json({ error: { message: 'Failed to get device logs', code: 'GET_ERROR' } });
  }
});

export default router;
