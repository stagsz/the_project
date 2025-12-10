import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import db from '../utils/db.js';

const router = Router();

// Setup multer for dataset uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(process.cwd(), 'datasets');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'dataset-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB limit
  fileFilter: (req, file, cb) => {
    const allowedExtensions = ['.csv', '.json', '.parquet'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedExtensions.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Only CSV, JSON, and Parquet files are allowed'));
    }
  }
});

// GET /api/devices - List devices
router.get('/', (req, res) => {
  try {
    const { group, status, facility, limit = 100, offset = 0 } = req.query;

    let query = `
      SELECT d.*, dg.name as group_name, dg.zone, f.name as facility_name
      FROM devices d
      LEFT JOIN device_groups dg ON d.device_group_id = dg.id
      LEFT JOIN facilities f ON dg.facility_id = f.id
      WHERE d.is_active = 1
    `;
    const params = [];

    if (group) {
      query += ' AND d.device_group_id = ?';
      params.push(group);
    }
    if (status) {
      query += ' AND d.status = ?';
      params.push(status);
    }
    if (facility) {
      query += ' AND dg.facility_id = ?';
      params.push(facility);
    }

    query += ' ORDER BY d.name LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));

    const devices = db.prepare(query).all(...params);

    // Parse JSON fields
    const parsedDevices = devices.map(d => ({
      ...d,
      capabilities: JSON.parse(d.capabilities || '{}')
    }));

    // Get total count
    let countQuery = 'SELECT COUNT(*) as count FROM devices d WHERE d.is_active = 1';
    const countParams = [];
    if (group) { countQuery += ' AND d.device_group_id = ?'; countParams.push(group); }
    if (status) { countQuery += ' AND d.status = ?'; countParams.push(status); }

    const { count } = db.prepare(countQuery).get(...countParams);

    res.json({ devices: parsedDevices, total: count });
  } catch (error) {
    console.error('List devices error:', error);
    res.status(500).json({ error: { message: 'Failed to list devices', code: 'LIST_ERROR' } });
  }
});

// POST /api/devices - Register device
router.post('/', (req, res) => {
  try {
    const { device_group_id, device_uid, name, type, ip_address, firmware_version, capabilities, is_simulated = false } = req.body;

    if (!device_uid || !name || !type) {
      return res.status(400).json({ error: { message: 'device_uid, name, and type are required', code: 'VALIDATION_ERROR' } });
    }

    const existingDevice = db.prepare('SELECT id FROM devices WHERE device_uid = ?').get(device_uid);
    if (existingDevice) {
      return res.status(409).json({ error: { message: 'Device with this UID already exists', code: 'DEVICE_EXISTS' } });
    }

    const id = uuidv4();
    db.prepare(`
      INSERT INTO devices (id, device_group_id, device_uid, name, type, ip_address, firmware_version, capabilities, is_simulated, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'offline')
    `).run(id, device_group_id, device_uid, name, type, ip_address, firmware_version, JSON.stringify(capabilities || {}), is_simulated ? 1 : 0);

    const device = db.prepare('SELECT * FROM devices WHERE id = ?').get(id);
    res.status(201).json({
      device: {
        ...device,
        capabilities: JSON.parse(device.capabilities || '{}')
      }
    });
  } catch (error) {
    console.error('Register device error:', error);
    res.status(500).json({ error: { message: 'Failed to register device', code: 'CREATE_ERROR' } });
  }
});

// POST /api/devices/simulated - Create simulated device with dataset upload
router.post('/simulated', upload.single('dataset'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: { message: 'Dataset file is required', code: 'VALIDATION_ERROR' } });
    }

    // Parse device data from request body
    const deviceData = JSON.parse(req.body.device);
    const { device_group_id, device_uid, name, type, ip_address, firmware_version, capabilities } = deviceData;

    if (!device_uid || !name || !type) {
      // Clean up uploaded file if validation fails
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ error: { message: 'device_uid, name, and type are required', code: 'VALIDATION_ERROR' } });
    }

    // Check if device already exists
    const existingDevice = db.prepare('SELECT id FROM devices WHERE device_uid = ?').get(device_uid);
    if (existingDevice) {
      fs.unlinkSync(req.file.path);
      return res.status(409).json({ error: { message: 'Device with this UID already exists', code: 'DEVICE_EXISTS' } });
    }

    // Create device with dataset reference
    const id = uuidv4();
    const datasetPath = path.relative(process.cwd(), req.file.path);
    
    db.prepare(`
      INSERT INTO devices (id, device_group_id, device_uid, name, type, ip_address, firmware_version, capabilities, is_simulated, status, dataset_path)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, 'offline', ?)
    `).run(
      id,
      device_group_id || null,
      device_uid,
      name,
      type,
      ip_address || null,
      firmware_version || '1.0.0',
      JSON.stringify(capabilities || {}),
      datasetPath
    );

    const device = db.prepare('SELECT * FROM devices WHERE id = ?').get(id);
    
    res.status(201).json({
      device: {
        ...device,
        capabilities: JSON.parse(device.capabilities || '{}')
      },
      dataset: {
        filename: req.file.originalname,
        path: datasetPath,
        size: req.file.size,
        mimetype: req.file.mimetype
      }
    });
  } catch (error) {
    console.error('Create simulated device error:', error);
    // Clean up uploaded file on error
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({ error: { message: 'Failed to create simulated device', code: 'CREATE_ERROR' } });
  }
});

// GET /api/devices/:id - Get device details
router.get('/:id', (req, res) => {
  try {
    const device = db.prepare(`
      SELECT d.*, dg.name as group_name, dg.zone, f.name as facility_name
      FROM devices d
      LEFT JOIN device_groups dg ON d.device_group_id = dg.id
      LEFT JOIN facilities f ON dg.facility_id = f.id
      WHERE d.id = ?
    `).get(req.params.id);

    if (!device) {
      return res.status(404).json({ error: { message: 'Device not found', code: 'NOT_FOUND' } });
    }

    // Get recent metrics
    const metrics = db.prepare(`
      SELECT * FROM device_metrics
      WHERE device_id = ?
      ORDER BY timestamp DESC
      LIMIT 10
    `).all(req.params.id);

    res.json({
      device: {
        ...device,
        capabilities: JSON.parse(device.capabilities || '{}'),
        recent_metrics: metrics.map(m => ({
          ...m,
          sensor_readings: JSON.parse(m.sensor_readings || '{}')
        }))
      }
    });
  } catch (error) {
    console.error('Get device error:', error);
    res.status(500).json({ error: { message: 'Failed to get device', code: 'GET_ERROR' } });
  }
});

// PUT /api/devices/:id - Update device
router.put('/:id', (req, res) => {
  try {
    const { name, device_group_id, ip_address, firmware_version, capabilities, status } = req.body;

    const updates = [];
    const params = [];

    if (name) { updates.push('name = ?'); params.push(name); }
    if (device_group_id !== undefined) { updates.push('device_group_id = ?'); params.push(device_group_id); }
    if (ip_address !== undefined) { updates.push('ip_address = ?'); params.push(ip_address); }
    if (firmware_version) { updates.push('firmware_version = ?'); params.push(firmware_version); }
    if (capabilities) { updates.push('capabilities = ?'); params.push(JSON.stringify(capabilities)); }
    if (status) { updates.push('status = ?'); params.push(status); }

    updates.push('updated_at = datetime("now")');
    params.push(req.params.id);

    db.prepare(`UPDATE devices SET ${updates.join(', ')} WHERE id = ?`).run(...params);

    const device = db.prepare('SELECT * FROM devices WHERE id = ?').get(req.params.id);
    res.json({
      device: {
        ...device,
        capabilities: JSON.parse(device.capabilities || '{}')
      }
    });
  } catch (error) {
    console.error('Update device error:', error);
    res.status(500).json({ error: { message: 'Failed to update device', code: 'UPDATE_ERROR' } });
  }
});

// DELETE /api/devices/:id - Decommission device
router.delete('/:id', (req, res) => {
  try {
    db.prepare('UPDATE devices SET is_active = 0, status = "offline", updated_at = datetime("now") WHERE id = ?').run(req.params.id);
    res.json({ message: 'Device decommissioned' });
  } catch (error) {
    console.error('Delete device error:', error);
    res.status(500).json({ error: { message: 'Failed to decommission device', code: 'DELETE_ERROR' } });
  }
});

// POST /api/devices/:id/heartbeat - Device heartbeat
router.post('/:id/heartbeat', (req, res) => {
  try {
    const { cpu_usage, memory_usage, temperature_celsius, network_latency_ms, error_count, sensor_readings } = req.body;

    // Update device status and last heartbeat
    db.prepare(`
      UPDATE devices
      SET status = 'online', last_heartbeat = datetime('now'), updated_at = datetime('now')
      WHERE id = ?
    `).run(req.params.id);

    // Record metrics
    const metricsId = uuidv4();
    db.prepare(`
      INSERT INTO device_metrics (id, device_id, cpu_usage, memory_usage, temperature_celsius, network_latency_ms, error_count, sensor_readings)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      metricsId,
      req.params.id,
      cpu_usage,
      memory_usage,
      temperature_celsius,
      network_latency_ms,
      error_count || 0,
      JSON.stringify(sensor_readings || {})
    );

    res.json({ message: 'Heartbeat received', metrics_id: metricsId });
  } catch (error) {
    console.error('Heartbeat error:', error);
    res.status(500).json({ error: { message: 'Failed to process heartbeat', code: 'HEARTBEAT_ERROR' } });
  }
});

// GET /api/devices/:id/metrics - Get device metrics history
router.get('/:id/metrics', (req, res) => {
  try {
    const { limit = 100, offset = 0, from, to } = req.query;

    let query = 'SELECT * FROM device_metrics WHERE device_id = ?';
    const params = [req.params.id];

    if (from) { query += ' AND timestamp >= ?'; params.push(from); }
    if (to) { query += ' AND timestamp <= ?'; params.push(to); }

    query += ' ORDER BY timestamp DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));

    const metrics = db.prepare(query).all(...params);

    res.json({
      metrics: metrics.map(m => ({
        ...m,
        sensor_readings: JSON.parse(m.sensor_readings || '{}')
      }))
    });
  } catch (error) {
    console.error('Get metrics error:', error);
    res.status(500).json({ error: { message: 'Failed to get metrics', code: 'GET_ERROR' } });
  }
});

// POST /api/devices/bulk - Bulk device operations
router.post('/bulk', (req, res) => {
  try {
    const { operation, device_ids, data } = req.body;

    if (!operation || !device_ids || !Array.isArray(device_ids)) {
      return res.status(400).json({ error: { message: 'operation and device_ids are required', code: 'VALIDATION_ERROR' } });
    }

    let affected = 0;

    switch (operation) {
      case 'update_status':
        const stmt = db.prepare('UPDATE devices SET status = ?, updated_at = datetime("now") WHERE id = ?');
        for (const id of device_ids) {
          stmt.run(data.status, id);
          affected++;
        }
        break;
      case 'update_firmware':
        const fwStmt = db.prepare('UPDATE devices SET firmware_version = ?, updated_at = datetime("now") WHERE id = ?');
        for (const id of device_ids) {
          fwStmt.run(data.firmware_version, id);
          affected++;
        }
        break;
      case 'decommission':
        const decommStmt = db.prepare('UPDATE devices SET is_active = 0, status = "offline", updated_at = datetime("now") WHERE id = ?');
        for (const id of device_ids) {
          decommStmt.run(id);
          affected++;
        }
        break;
      default:
        return res.status(400).json({ error: { message: 'Unknown operation', code: 'UNKNOWN_OPERATION' } });
    }

    res.json({ message: 'Bulk operation completed', affected });
  } catch (error) {
    console.error('Bulk operation error:', error);
    res.status(500).json({ error: { message: 'Failed to perform bulk operation', code: 'BULK_ERROR' } });
  }
});

export default router;
