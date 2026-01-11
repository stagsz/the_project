import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import supabase from '../utils/supabase.js';

const router = Router();

const DEVICE_TYPES = ['edge_compute', 'sensor_gateway', 'plc', 'camera'];
const DEVICE_PREFIXES = ['EC', 'SG', 'PLC', 'CAM'];

// POST /api/simulation/devices - Create simulated devices
router.post('/devices', async (req, res) => {
  try {
    const { count = 5, device_group_id, type } = req.body;

    const createdDevices = [];

    for (let i = 0; i < count; i++) {
      const deviceType = type || DEVICE_TYPES[Math.floor(Math.random() * DEVICE_TYPES.length)];
      const prefix = DEVICE_PREFIXES[DEVICE_TYPES.indexOf(deviceType)];
      const id = uuidv4();
      const uid = `${prefix}-SIM-${Date.now()}-${i.toString().padStart(3, '0')}`;
      const name = `Simulated ${deviceType.replace('_', ' ')} ${i + 1}`;
      const ip = `192.168.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`;
      const firmware = `${Math.floor(Math.random() * 3) + 1}.${Math.floor(Math.random() * 10)}.${Math.floor(Math.random() * 100)}`;

      const capabilities = {
        compute_power: Math.floor(Math.random() * 100) + 10,
        memory_gb: Math.pow(2, Math.floor(Math.random() * 4) + 1),
        sensors: deviceType === 'sensor_gateway' ? ['temperature', 'pressure', 'vibration'] : [],
        protocols: ['mqtt', 'http']
      };

      await supabase
        .from('devices')
        .insert({
          id,
          device_group_id,
          device_uid: uid,
          name,
          type: deviceType,
          status: 'online',
          ip_address: ip,
          firmware_version: firmware,
          capabilities,
          is_simulated: true
        });

      createdDevices.push({ id, uid, name, type: deviceType });
    }

    res.status(201).json({ devices: createdDevices, count: createdDevices.length });
  } catch (error) {
    console.error('Create simulated devices error:', error);
    res.status(500).json({ error: { message: 'Failed to create simulated devices', code: 'CREATE_ERROR' } });
  }
});

// POST /api/simulation/metrics - Generate simulated metrics
router.post('/metrics', async (req, res) => {
  try {
    const { device_id, count = 10, interval_minutes = 5 } = req.body;

    // If no device_id specified, generate for all simulated devices
    let devices;
    if (device_id) {
      devices = [{ id: device_id }];
    } else {
      const { data } = await supabase
        .from('devices')
        .select('id')
        .eq('is_simulated', true)
        .eq('is_active', true);
      devices = data || [];
    }

    const createdMetrics = [];
    const now = new Date();

    for (const device of devices) {
      for (let i = 0; i < count; i++) {
        const timestamp = new Date(now.getTime() - (i * interval_minutes * 60 * 1000));
        const id = uuidv4();

        const cpuBase = 30 + Math.random() * 40;
        const memBase = 40 + Math.random() * 30;
        const tempBase = 35 + Math.random() * 25;
        const latencyBase = 5 + Math.random() * 45;
        const errorCount = Math.random() > 0.95 ? Math.floor(Math.random() * 5) : 0;

        const sensorReadings = {
          temperature: 20 + Math.random() * 30,
          pressure: 100 + Math.random() * 20,
          vibration: Math.random() * 10,
          humidity: 30 + Math.random() * 40
        };

        await supabase
          .from('device_metrics')
          .insert({
            id,
            device_id: device.id,
            timestamp: timestamp.toISOString(),
            cpu_usage: cpuBase + Math.random() * 10 - 5,
            memory_usage: memBase + Math.random() * 10 - 5,
            temperature_celsius: tempBase + Math.random() * 5 - 2.5,
            network_latency_ms: latencyBase + Math.random() * 10 - 5,
            error_count: errorCount,
            sensor_readings: sensorReadings
          });

        createdMetrics.push({ id, device_id: device.id, timestamp: timestamp.toISOString() });
      }

      // Update device last heartbeat
      await supabase
        .from('devices')
        .update({ last_heartbeat: new Date().toISOString(), status: 'online' })
        .eq('id', device.id);
    }

    res.status(201).json({ metrics: createdMetrics, count: createdMetrics.length });
  } catch (error) {
    console.error('Generate simulated metrics error:', error);
    res.status(500).json({ error: { message: 'Failed to generate simulated metrics', code: 'CREATE_ERROR' } });
  }
});

// POST /api/simulation/training - Simulate training contribution
router.post('/training', async (req, res) => {
  try {
    const { training_round_id, device_id } = req.body;

    if (!training_round_id) {
      return res.status(400).json({ error: { message: 'training_round_id is required', code: 'VALIDATION_ERROR' } });
    }

    // Get devices to simulate for
    let devices;
    if (device_id) {
      devices = [{ id: device_id }];
    } else {
      const { data } = await supabase
        .from('device_training_contributions')
        .select('device_id')
        .eq('training_round_id', training_round_id)
        .eq('status', 'pending');

      devices = (data || []).map(d => ({ id: d.device_id }));
    }

    const updatedContributions = [];

    for (const device of devices) {
      // Simulate training
      const duration = 10 + Math.random() * 50; // 10-60 seconds
      const samples = 100 + Math.floor(Math.random() * 900); // 100-1000 samples
      const localMetrics = {
        loss: 0.5 - Math.random() * 0.3,
        accuracy: 0.7 + Math.random() * 0.25,
        samples_per_second: samples / duration
      };

      await supabase
        .from('device_training_contributions')
        .update({
          status: 'completed',
          local_metrics: localMetrics,
          data_samples_count: samples,
          training_duration_seconds: duration,
          upload_timestamp: new Date().toISOString()
        })
        .eq('training_round_id', training_round_id)
        .eq('device_id', device.id);

      updatedContributions.push({
        device_id: device.id,
        local_metrics: localMetrics,
        samples,
        duration
      });
    }

    res.json({ contributions: updatedContributions, count: updatedContributions.length });
  } catch (error) {
    console.error('Simulate training error:', error);
    res.status(500).json({ error: { message: 'Failed to simulate training', code: 'SIMULATE_ERROR' } });
  }
});

// POST /api/simulation/anomaly - Inject simulated anomaly
router.post('/anomaly', async (req, res) => {
  try {
    const { device_id, anomaly_type, severity = 'warning' } = req.body;

    // If no device_id, pick a random device
    let targetDevice;
    if (device_id) {
      const { data } = await supabase
        .from('devices')
        .select('id, name')
        .eq('id', device_id)
        .single();
      targetDevice = data;
    } else {
      const { data } = await supabase
        .from('devices')
        .select('id, name')
        .eq('is_active', true)
        .limit(1);
      targetDevice = data?.[0];
    }

    if (!targetDevice) {
      return res.status(404).json({ error: { message: 'No device found', code: 'NOT_FOUND' } });
    }

    const anomalyTypes = ['sensor_drift', 'equipment_failure', 'quality_defect', 'process_deviation'];
    const selectedType = anomaly_type || anomalyTypes[Math.floor(Math.random() * anomalyTypes.length)];

    const descriptions = {
      sensor_drift: 'Temperature sensor readings deviating from expected range',
      equipment_failure: 'Motor vibration exceeding normal parameters',
      quality_defect: 'Product dimension outside tolerance limits',
      process_deviation: 'Process cycle time significantly longer than baseline'
    };

    const sensorData = {
      temperature: 45 + Math.random() * 30,
      pressure: 110 + Math.random() * 50,
      vibration: 5 + Math.random() * 10,
      cycle_time: 30 + Math.random() * 20
    };

    const id = uuidv4();
    await supabase
      .from('anomalies')
      .insert({
        id,
        device_id: targetDevice.id,
        anomaly_type: selectedType,
        severity,
        sensor_data: sensorData,
        confidence_score: 0.7 + Math.random() * 0.25,
        description: descriptions[selectedType]
      });

    const { data: anomaly } = await supabase
      .from('anomalies')
      .select('*')
      .eq('id', id)
      .single();

    res.status(201).json({
      anomaly: {
        ...anomaly,
        sensor_data: anomaly.sensor_data || {},
        device_name: targetDevice.name
      }
    });
  } catch (error) {
    console.error('Inject anomaly error:', error);
    res.status(500).json({ error: { message: 'Failed to inject anomaly', code: 'CREATE_ERROR' } });
  }
});

// DELETE /api/simulation/reset - Reset all simulated data
router.delete('/reset', async (req, res) => {
  try {
    const { keep_devices = false } = req.query;

    // Get simulated device IDs
    const { data: simulatedDevices } = await supabase
      .from('devices')
      .select('id')
      .eq('is_simulated', true);

    const deviceIds = (simulatedDevices || []).map(d => d.id);

    let anomaliesDeleted = 0;
    let metricsDeleted = 0;
    let contribDeleted = 0;
    let devicesDeleted = 0;

    if (deviceIds.length > 0) {
      // Delete simulated anomalies
      const { count: anomalyCount } = await supabase
        .from('anomalies')
        .delete()
        .in('device_id', deviceIds)
        .select('*', { count: 'exact', head: true });
      anomaliesDeleted = anomalyCount || 0;

      // Actually delete them
      await supabase.from('anomalies').delete().in('device_id', deviceIds);

      // Delete simulated metrics
      await supabase.from('device_metrics').delete().in('device_id', deviceIds);

      // Delete simulated training contributions
      await supabase.from('device_training_contributions').delete().in('device_id', deviceIds);

      if (!keep_devices) {
        // Delete simulated devices
        const { error } = await supabase
          .from('devices')
          .delete()
          .eq('is_simulated', true);

        if (!error) {
          devicesDeleted = deviceIds.length;
        }
      }
    }

    res.json({
      message: 'Simulation data reset',
      deleted: {
        anomalies: anomaliesDeleted,
        metrics: metricsDeleted,
        contributions: contribDeleted,
        devices: devicesDeleted
      }
    });
  } catch (error) {
    console.error('Reset simulation error:', error);
    res.status(500).json({ error: { message: 'Failed to reset simulation', code: 'RESET_ERROR' } });
  }
});

export default router;
