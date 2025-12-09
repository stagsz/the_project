import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import db from '../utils/db.js';

const router = Router();

const DEVICE_TYPES = ['edge_compute', 'sensor_gateway', 'plc', 'camera'];
const DEVICE_PREFIXES = ['EC', 'SG', 'PLC', 'CAM'];

// POST /api/simulation/devices - Create simulated devices
router.post('/devices', (req, res) => {
  try {
    const { count = 5, device_group_id, type } = req.body;

    const createdDevices = [];
    const stmt = db.prepare(`
      INSERT INTO devices (id, device_group_id, device_uid, name, type, status, ip_address, firmware_version, capabilities, is_simulated)
      VALUES (?, ?, ?, ?, ?, 'online', ?, ?, ?, 1)
    `);

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

      stmt.run(id, device_group_id, uid, name, deviceType, ip, firmware, JSON.stringify(capabilities));
      createdDevices.push({ id, uid, name, type: deviceType });
    }

    res.status(201).json({ devices: createdDevices, count: createdDevices.length });
  } catch (error) {
    console.error('Create simulated devices error:', error);
    res.status(500).json({ error: { message: 'Failed to create simulated devices', code: 'CREATE_ERROR' } });
  }
});

// POST /api/simulation/metrics - Generate simulated metrics
router.post('/metrics', (req, res) => {
  try {
    const { device_id, count = 10, interval_minutes = 5 } = req.body;

    // If no device_id specified, generate for all simulated devices
    let devices;
    if (device_id) {
      devices = [{ id: device_id }];
    } else {
      devices = db.prepare('SELECT id FROM devices WHERE is_simulated = 1 AND is_active = 1').all();
    }

    const createdMetrics = [];
    const stmt = db.prepare(`
      INSERT INTO device_metrics (id, device_id, timestamp, cpu_usage, memory_usage, temperature_celsius, network_latency_ms, error_count, sensor_readings)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

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

        stmt.run(
          id,
          device.id,
          timestamp.toISOString(),
          cpuBase + Math.random() * 10 - 5,
          memBase + Math.random() * 10 - 5,
          tempBase + Math.random() * 5 - 2.5,
          latencyBase + Math.random() * 10 - 5,
          errorCount,
          JSON.stringify(sensorReadings)
        );

        createdMetrics.push({ id, device_id: device.id, timestamp: timestamp.toISOString() });
      }

      // Update device last heartbeat
      db.prepare('UPDATE devices SET last_heartbeat = datetime("now"), status = "online" WHERE id = ?').run(device.id);
    }

    res.status(201).json({ metrics: createdMetrics, count: createdMetrics.length });
  } catch (error) {
    console.error('Generate simulated metrics error:', error);
    res.status(500).json({ error: { message: 'Failed to generate simulated metrics', code: 'CREATE_ERROR' } });
  }
});

// POST /api/simulation/training - Simulate training contribution
router.post('/training', (req, res) => {
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
      devices = db.prepare(`
        SELECT d.id FROM devices d
        JOIN device_training_contributions dtc ON d.id = dtc.device_id
        WHERE dtc.training_round_id = ? AND dtc.status = 'pending'
      `).all(training_round_id);
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

      db.prepare(`
        UPDATE device_training_contributions
        SET status = 'completed',
            local_metrics = ?,
            data_samples_count = ?,
            training_duration_seconds = ?,
            upload_timestamp = datetime('now')
        WHERE training_round_id = ? AND device_id = ?
      `).run(
        JSON.stringify(localMetrics),
        samples,
        duration,
        training_round_id,
        device.id
      );

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
router.post('/anomaly', (req, res) => {
  try {
    const { device_id, anomaly_type, severity = 'warning' } = req.body;

    // If no device_id, pick a random device
    let targetDevice;
    if (device_id) {
      targetDevice = db.prepare('SELECT id, name FROM devices WHERE id = ?').get(device_id);
    } else {
      targetDevice = db.prepare('SELECT id, name FROM devices WHERE is_active = 1 ORDER BY RANDOM() LIMIT 1').get();
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
    db.prepare(`
      INSERT INTO anomalies (id, device_id, anomaly_type, severity, sensor_data, confidence_score, description)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      targetDevice.id,
      selectedType,
      severity,
      JSON.stringify(sensorData),
      0.7 + Math.random() * 0.25,
      descriptions[selectedType]
    );

    const anomaly = db.prepare('SELECT * FROM anomalies WHERE id = ?').get(id);

    res.status(201).json({
      anomaly: {
        ...anomaly,
        sensor_data: JSON.parse(anomaly.sensor_data || '{}'),
        device_name: targetDevice.name
      }
    });
  } catch (error) {
    console.error('Inject anomaly error:', error);
    res.status(500).json({ error: { message: 'Failed to inject anomaly', code: 'CREATE_ERROR' } });
  }
});

// DELETE /api/simulation/reset - Reset all simulated data
router.delete('/reset', (req, res) => {
  try {
    const { keep_devices = false } = req.query;

    // Delete simulated anomalies
    const anomalyResult = db.prepare(`
      DELETE FROM anomalies WHERE device_id IN (SELECT id FROM devices WHERE is_simulated = 1)
    `).run();

    // Delete simulated metrics
    const metricsResult = db.prepare(`
      DELETE FROM device_metrics WHERE device_id IN (SELECT id FROM devices WHERE is_simulated = 1)
    `).run();

    // Delete simulated training contributions
    const contribResult = db.prepare(`
      DELETE FROM device_training_contributions WHERE device_id IN (SELECT id FROM devices WHERE is_simulated = 1)
    `).run();

    let devicesDeleted = 0;
    if (!keep_devices) {
      const deviceResult = db.prepare('DELETE FROM devices WHERE is_simulated = 1').run();
      devicesDeleted = deviceResult.changes;
    }

    res.json({
      message: 'Simulation data reset',
      deleted: {
        anomalies: anomalyResult.changes,
        metrics: metricsResult.changes,
        contributions: contribResult.changes,
        devices: devicesDeleted
      }
    });
  } catch (error) {
    console.error('Reset simulation error:', error);
    res.status(500).json({ error: { message: 'Failed to reset simulation', code: 'RESET_ERROR' } });
  }
});

export default router;
