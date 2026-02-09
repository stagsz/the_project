import { v4 as uuidv4 } from 'uuid';
import supabase from '../utils/supabase.js';
import { broadcast, TOPICS } from './websocket.js';

// Active training sessions
const activeSessions = new Map();

/**
 * Training Simulator Service (Supabase Version)
 *
 * Simulates the federated learning workflow:
 * 1. Initialize training round
 * 2. Distribute model to devices (simulated)
 * 3. Local training on each device (simulated with progress)
 * 4. Collect model updates from devices
 * 5. Aggregate using FedAvg/FedProx
 * 6. Create new model version
 */

export async function startTrainingRound(roundId) {
  // Check if already running
  if (activeSessions.has(roundId)) {
    throw new Error('Training round is already running');
  }

  // Fetch training round with model info from Supabase
  const { data: rounds, error: roundError } = await supabase
    .from('training_rounds')
    .select(`
      *,
      models!training_rounds_model_id_fkey (
        name,
        architecture
      )
    `)
    .eq('id', roundId)
    .single();

  if (roundError || !rounds) {
    throw new Error('Training round not found');
  }

  const round = {
    ...rounds,
    model_name: rounds.models?.name,
    architecture: rounds.models?.architecture
  };

  const hyperparameters = round.hyperparameters || {};
  const privacyConfig = round.privacy_config || {};
  const devices = round.participating_devices || [];

  if (devices.length === 0) {
    throw new Error('No devices assigned to this training round');
  }

  // Create session tracker
  const session = {
    roundId,
    modelId: round.model_id,
    status: 'initializing',
    devices: devices.map(id => ({
      id,
      status: 'pending',
      progress: 0,
      epoch: 0,
      metrics: null
    })),
    hyperparameters,
    privacyConfig,
    aggregationMethod: round.aggregation_method,
    startTime: Date.now(),
    globalModel: generateInitialModel(),
    deviceModels: new Map()
  };

  activeSessions.set(roundId, session);

  // Run training asynchronously
  runTrainingWorkflow(session).catch(error => {
    console.error(`Training round ${roundId} failed:`, error);
    handleTrainingError(session, error);
  });

  return {
    roundId,
    status: 'started',
    devices: devices.length,
    hyperparameters
  };
}

async function runTrainingWorkflow(session) {
  const { roundId, devices, hyperparameters } = session;

  try {
    // Phase 1: Initialize
    session.status = 'distributing';
    broadcastProgress(session, 'Distributing model to devices...');

    await simulateDelay(1000);

    // Phase 2: Local Training on each device (sequential simulation)
    session.status = 'training';
    const localEpochs = hyperparameters.local_epochs || 5;

    for (let i = 0; i < devices.length; i++) {
      const device = devices[i];

      // Update device status
      device.status = 'training';
      await updateDeviceContribution(roundId, device.id, 'training');
      broadcastProgress(session, `Device ${i + 1}/${devices.length} training...`);

      // Simulate epochs
      for (let epoch = 1; epoch <= localEpochs; epoch++) {
        device.epoch = epoch;
        device.progress = Math.round((epoch / localEpochs) * 100);

        // Simulate training time per epoch (500ms - 1500ms)
        await simulateDelay(500 + Math.random() * 1000);

        // Calculate metrics for this epoch
        const epochMetrics = simulateEpochMetrics(epoch, localEpochs, device.id);
        device.metrics = epochMetrics;

        // Broadcast epoch progress
        broadcast(TOPICS.TRAINING(roundId), {
          type: 'device_progress',
          deviceId: device.id,
          epoch,
          totalEpochs: localEpochs,
          progress: device.progress,
          metrics: epochMetrics
        });
      }

      // Device finished training
      device.status = 'uploading';
      await updateDeviceContribution(roundId, device.id, 'uploading');
      broadcastProgress(session, `Device ${i + 1}/${devices.length} uploading model...`);

      await simulateDelay(300);

      // Generate local model update
      const localModel = generateLocalModel(session.globalModel, device.id, hyperparameters);
      session.deviceModels.set(device.id, localModel);

      // Mark as completed
      device.status = 'completed';
      const finalMetrics = device.metrics;
      const dataSamples = 500 + Math.floor(Math.random() * 1000);
      const trainingDuration = (Date.now() - session.startTime) / 1000;

      await updateDeviceContributionComplete(roundId, device.id, finalMetrics, dataSamples, trainingDuration);

      broadcast(TOPICS.TRAINING(roundId), {
        type: 'device_completed',
        deviceId: device.id,
        metrics: finalMetrics,
        dataSamples
      });
    }

    // Phase 3: Aggregation
    session.status = 'aggregating';
    await supabase
      .from('training_rounds')
      .update({ status: 'aggregating' })
      .eq('id', roundId);

    broadcastProgress(session, 'Aggregating model updates...');

    await simulateDelay(1500);

    // Perform FedAvg aggregation
    const aggregatedResult = performAggregation(session);

    // Phase 4: Finalize
    session.status = 'completed';

    // Update training round
    await supabase
      .from('training_rounds')
      .update({
        status: 'completed',
        result_metrics: aggregatedResult.metrics,
        completed_at: new Date().toISOString()
      })
      .eq('id', roundId);

    // Create new model version
    const versionId = await createModelVersion(session, aggregatedResult);

    // Log privacy budget
    await logPrivacyBudget(session);

    // Broadcast completion
    broadcast(TOPICS.TRAINING(roundId), {
      type: 'training_completed',
      roundId,
      metrics: aggregatedResult.metrics,
      versionId,
      duration: (Date.now() - session.startTime) / 1000
    });

    broadcastProgress(session, 'Training completed successfully!');

  } finally {
    // Cleanup
    activeSessions.delete(roundId);
  }
}

function simulateEpochMetrics(epoch, totalEpochs, deviceId) {
  // Simulate improving metrics over epochs
  const progress = epoch / totalEpochs;
  const deviceVariance = hashCode(deviceId) % 10 / 100; // Slight device-specific variance

  return {
    loss: 2.0 * Math.exp(-progress * 2) + 0.1 + Math.random() * 0.1,
    accuracy: 0.5 + progress * 0.4 + deviceVariance + Math.random() * 0.05,
    epoch,
    learning_rate: 0.01 * Math.pow(0.95, epoch - 1) // LR decay
  };
}

function generateInitialModel() {
  // Simulate initial model weights (simplified)
  return {
    layers: [
      { name: 'conv1', weights: randomArray(64), bias: randomArray(64) },
      { name: 'conv2', weights: randomArray(128), bias: randomArray(128) },
      { name: 'fc1', weights: randomArray(256), bias: randomArray(256) },
      { name: 'output', weights: randomArray(10), bias: randomArray(10) }
    ],
    version: '0.0.0'
  };
}

function generateLocalModel(globalModel, deviceId, hyperparameters) {
  // Simulate local model update (gradient descent result)
  const lr = hyperparameters.learning_rate || 0.01;
  const localEpochs = hyperparameters.local_epochs || 5;
  const deviceSeed = hashCode(deviceId);

  return {
    layers: globalModel.layers.map(layer => ({
      name: layer.name,
      // Simulate weight updates with some device-specific randomness
      weights: layer.weights.map((w, i) =>
        w - lr * localEpochs * (0.1 + 0.05 * Math.sin(deviceSeed + i))
      ),
      bias: layer.bias.map((b, i) =>
        b - lr * localEpochs * (0.05 + 0.02 * Math.cos(deviceSeed + i))
      )
    })),
    deviceId,
    dataSamples: 500 + Math.floor(Math.random() * 1000)
  };
}

function performAggregation(session) {
  const { aggregationMethod, deviceModels, globalModel } = session;

  // Get all device models
  const models = Array.from(deviceModels.values());
  const totalSamples = models.reduce((sum, m) => sum + m.dataSamples, 0);

  let aggregatedLayers;

  switch (aggregationMethod) {
    case 'weighted_fedavg':
      // Weighted by data samples
      aggregatedLayers = globalModel.layers.map((layer, layerIdx) => {
        const weightedWeights = layer.weights.map((_, i) => {
          return models.reduce((sum, model) => {
            const weight = model.dataSamples / totalSamples;
            return sum + weight * model.layers[layerIdx].weights[i];
          }, 0);
        });

        const weightedBias = layer.bias.map((_, i) => {
          return models.reduce((sum, model) => {
            const weight = model.dataSamples / totalSamples;
            return sum + weight * model.layers[layerIdx].bias[i];
          }, 0);
        });

        return { name: layer.name, weights: weightedWeights, bias: weightedBias };
      });
      break;

    case 'fedavg':
    default:
      // Simple average
      aggregatedLayers = globalModel.layers.map((layer, layerIdx) => {
        const avgWeights = layer.weights.map((_, i) => {
          return models.reduce((sum, model) => sum + model.layers[layerIdx].weights[i], 0) / models.length;
        });

        const avgBias = layer.bias.map((_, i) => {
          return models.reduce((sum, model) => sum + model.layers[layerIdx].bias[i], 0) / models.length;
        });

        return { name: layer.name, weights: avgWeights, bias: avgBias };
      });
  }

  // Calculate aggregated metrics
  const deviceMetrics = session.devices.map(d => d.metrics).filter(Boolean);
  const avgAccuracy = deviceMetrics.reduce((sum, m) => sum + m.accuracy, 0) / deviceMetrics.length;
  const avgLoss = deviceMetrics.reduce((sum, m) => sum + m.loss, 0) / deviceMetrics.length;

  return {
    model: { layers: aggregatedLayers },
    metrics: {
      accuracy: Math.round(avgAccuracy * 1000) / 1000,
      loss: Math.round(avgLoss * 1000) / 1000,
      f1_score: Math.round((avgAccuracy * 0.95 + 0.02) * 1000) / 1000,
      participating_devices: models.length,
      total_samples: totalSamples,
      aggregation_method: session.aggregationMethod
    }
  };
}

async function createModelVersion(session, aggregatedResult) {
  // Get last version
  const { data: lastVersions } = await supabase
    .from('model_versions')
    .select('version')
    .eq('model_id', session.modelId)
    .order('created_at', { ascending: false })
    .limit(1);

  const newVersion = incrementVersion(lastVersions?.[0]?.version || '0.0.0');
  const versionId = uuidv4();

  await supabase
    .from('model_versions')
    .insert({
      id: versionId,
      model_id: session.modelId,
      version: newVersion,
      metrics: aggregatedResult.metrics,
      weights: { aggregated: true, layers_count: aggregatedResult.model.layers.length },
      training_round_id: session.roundId,
      notes: `Aggregated from ${session.devices.length} devices using ${session.aggregationMethod}`
    });

  return versionId;
}

async function logPrivacyBudget(session) {
  const epsilon = session.privacyConfig.epsilon || 1.0;

  // Get cumulative epsilon for this model
  const { data: lastLogs } = await supabase
    .from('privacy_budget_logs')
    .select('cumulative_epsilon')
    .eq('model_id', session.modelId)
    .order('timestamp', { ascending: false })
    .limit(1);

  const cumulativeEpsilon = (lastLogs?.[0]?.cumulative_epsilon || 0) + epsilon;

  await supabase
    .from('privacy_budget_logs')
    .insert({
      id: uuidv4(),
      model_id: session.modelId,
      training_round_id: session.roundId,
      epsilon_consumed: epsilon,
      cumulative_epsilon: cumulativeEpsilon,
      budget_limit: 10.0 // Default budget
    });
}

async function updateDeviceContribution(roundId, deviceId, status) {
  await supabase
    .from('device_training_contributions')
    .update({ status })
    .eq('training_round_id', roundId)
    .eq('device_id', deviceId);
}

async function updateDeviceContributionComplete(roundId, deviceId, metrics, samples, duration) {
  await supabase
    .from('device_training_contributions')
    .update({
      status: 'completed',
      local_metrics: metrics,
      data_samples_count: samples,
      training_duration_seconds: duration,
      upload_timestamp: new Date().toISOString()
    })
    .eq('training_round_id', roundId)
    .eq('device_id', deviceId);
}

async function handleTrainingError(session, error) {
  const { roundId } = session;

  // Update round status
  await supabase
    .from('training_rounds')
    .update({
      status: 'failed',
      error_message: error.message
    })
    .eq('id', roundId);

  // Update device contributions
  await supabase
    .from('device_training_contributions')
    .update({
      status: 'failed',
      error_message: error.message
    })
    .eq('training_round_id', roundId)
    .neq('status', 'completed');

  // Broadcast error
  broadcast(TOPICS.TRAINING(roundId), {
    type: 'training_failed',
    roundId,
    error: error.message
  });

  activeSessions.delete(roundId);
}

function broadcastProgress(session, message) {
  const completedDevices = session.devices.filter(d => d.status === 'completed').length;
  const totalProgress = Math.round((completedDevices / session.devices.length) * 100);

  broadcast(TOPICS.TRAINING(session.roundId), {
    type: 'progress',
    status: session.status,
    message,
    completedDevices,
    totalDevices: session.devices.length,
    progress: totalProgress,
    devices: session.devices.map(d => ({
      id: d.id,
      status: d.status,
      progress: d.progress,
      epoch: d.epoch
    }))
  });
}

// Helper functions
function simulateDelay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function randomArray(size) {
  return Array.from({ length: size }, () => (Math.random() - 0.5) * 0.1);
}

function hashCode(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash = hash & hash;
  }
  return Math.abs(hash);
}

function incrementVersion(version) {
  const parts = version.split('.').map(Number);
  parts[2]++;
  return parts.join('.');
}

// Public API
export function getTrainingStatus(roundId) {
  const session = activeSessions.get(roundId);
  if (!session) {
    return null;
  }

  return {
    roundId,
    status: session.status,
    startTime: session.startTime,
    elapsed: Date.now() - session.startTime,
    devices: session.devices.map(d => ({
      id: d.id,
      status: d.status,
      progress: d.progress,
      epoch: d.epoch,
      metrics: d.metrics
    }))
  };
}

export async function cancelTrainingRound(roundId) {
  const session = activeSessions.get(roundId);
  if (session) {
    session.status = 'cancelled';
    activeSessions.delete(roundId);

    await supabase
      .from('training_rounds')
      .update({ status: 'cancelled' })
      .eq('id', roundId);

    await supabase
      .from('device_training_contributions')
      .update({ status: 'failed' })
      .eq('training_round_id', roundId)
      .neq('status', 'completed');

    broadcast(TOPICS.TRAINING(roundId), {
      type: 'training_cancelled',
      roundId
    });

    return true;
  }
  return false;
}

export function isTrainingActive(roundId) {
  return activeSessions.has(roundId);
}
