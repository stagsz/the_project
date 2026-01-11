import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import supabase from '../utils/supabase.js';

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
router.get('/', async (req, res) => {
  try {
    const { group, status, facility, limit = 100, offset = 0 } = req.query;

    let query = supabase
      .from('devices')
      .select('*, device_groups(name, zone, facility_id, facilities(name))')
      .eq('is_active', true)
      .order('name')
      .range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1);

    if (group) {
      query = query.eq('device_group_id', group);
    }
    if (status) {
      query = query.eq('status', status);
    }

    const { data: devices, error } = await query;

    if (error) throw error;

    // Filter by facility if needed and transform data
    let filteredDevices = devices || [];
    if (facility) {
      filteredDevices = filteredDevices.filter(d => d.device_groups?.facility_id === facility);
    }

    const parsedDevices = filteredDevices.map(d => ({
      ...d,
      group_name: d.device_groups?.name || null,
      zone: d.device_groups?.zone || null,
      facility_name: d.device_groups?.facilities?.name || null,
      capabilities: d.capabilities || {},
      device_groups: undefined
    }));

    // Get total count
    let countQuery = supabase
      .from('devices')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true);

    if (group) countQuery = countQuery.eq('device_group_id', group);
    if (status) countQuery = countQuery.eq('status', status);

    const { count } = await countQuery;

    res.json({ devices: parsedDevices, total: count || 0 });
  } catch (error) {
    console.error('List devices error:', error);
    res.status(500).json({ error: { message: 'Failed to list devices', code: 'LIST_ERROR' } });
  }
});

// POST /api/devices - Register device
router.post('/', async (req, res) => {
  try {
    const { device_group_id, device_uid, name, type, ip_address, firmware_version, capabilities, is_simulated = false } = req.body;

    if (!device_uid || !name || !type) {
      return res.status(400).json({ error: { message: 'device_uid, name, and type are required', code: 'VALIDATION_ERROR' } });
    }

    const { data: existingDevice } = await supabase
      .from('devices')
      .select('id')
      .eq('device_uid', device_uid)
      .single();

    if (existingDevice) {
      return res.status(409).json({ error: { message: 'Device with this UID already exists', code: 'DEVICE_EXISTS' } });
    }

    const id = uuidv4();
    const { error: insertError } = await supabase
      .from('devices')
      .insert({
        id,
        device_group_id,
        device_uid,
        name,
        type,
        ip_address,
        firmware_version,
        capabilities: capabilities || {},
        is_simulated,
        status: 'offline'
      });

    if (insertError) throw insertError;

    const { data: device, error: fetchError } = await supabase
      .from('devices')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError) throw fetchError;

    res.status(201).json({
      device: {
        ...device,
        capabilities: device.capabilities || {}
      }
    });
  } catch (error) {
    console.error('Register device error:', error);
    res.status(500).json({ error: { message: 'Failed to register device', code: 'CREATE_ERROR' } });
  }
});

// POST /api/devices/simulated - Create simulated device with dataset upload
router.post('/simulated', upload.single('dataset'), async (req, res) => {
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
    const { data: existingDevice } = await supabase
      .from('devices')
      .select('id')
      .eq('device_uid', device_uid)
      .single();

    if (existingDevice) {
      fs.unlinkSync(req.file.path);
      return res.status(409).json({ error: { message: 'Device with this UID already exists', code: 'DEVICE_EXISTS' } });
    }

    // Create device with dataset reference
    const id = uuidv4();
    const datasetPath = path.relative(process.cwd(), req.file.path);

    const { error: insertError } = await supabase
      .from('devices')
      .insert({
        id,
        device_group_id: device_group_id || null,
        device_uid,
        name,
        type,
        ip_address: ip_address || null,
        firmware_version: firmware_version || '1.0.0',
        capabilities: capabilities || {},
        is_simulated: true,
        status: 'offline',
        dataset_path: datasetPath
      });

    if (insertError) throw insertError;

    const { data: device, error: fetchError } = await supabase
      .from('devices')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError) throw fetchError;

    res.status(201).json({
      device: {
        ...device,
        capabilities: device.capabilities || {}
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
router.get('/:id', async (req, res) => {
  try {
    const { data: device, error } = await supabase
      .from('devices')
      .select('*, device_groups(name, zone, facilities(name))')
      .eq('id', req.params.id)
      .single();

    if (error || !device) {
      return res.status(404).json({ error: { message: 'Device not found', code: 'NOT_FOUND' } });
    }

    // Get recent metrics
    const { data: metrics } = await supabase
      .from('device_metrics')
      .select('*')
      .eq('device_id', req.params.id)
      .order('timestamp', { ascending: false })
      .limit(10);

    res.json({
      device: {
        ...device,
        group_name: device.device_groups?.name || null,
        zone: device.device_groups?.zone || null,
        facility_name: device.device_groups?.facilities?.name || null,
        capabilities: device.capabilities || {},
        device_groups: undefined,
        recent_metrics: (metrics || []).map(m => ({
          ...m,
          sensor_readings: m.sensor_readings || {}
        }))
      }
    });
  } catch (error) {
    console.error('Get device error:', error);
    res.status(500).json({ error: { message: 'Failed to get device', code: 'GET_ERROR' } });
  }
});

// PUT /api/devices/:id - Update device
router.put('/:id', async (req, res) => {
  try {
    const { name, device_group_id, ip_address, firmware_version, capabilities, status } = req.body;

    const updates = { updated_at: new Date().toISOString() };

    if (name) updates.name = name;
    if (device_group_id !== undefined) updates.device_group_id = device_group_id;
    if (ip_address !== undefined) updates.ip_address = ip_address;
    if (firmware_version) updates.firmware_version = firmware_version;
    if (capabilities) updates.capabilities = capabilities;
    if (status) updates.status = status;

    const { error: updateError } = await supabase
      .from('devices')
      .update(updates)
      .eq('id', req.params.id);

    if (updateError) throw updateError;

    const { data: device, error: fetchError } = await supabase
      .from('devices')
      .select('*')
      .eq('id', req.params.id)
      .single();

    if (fetchError) throw fetchError;

    res.json({
      device: {
        ...device,
        capabilities: device.capabilities || {}
      }
    });
  } catch (error) {
    console.error('Update device error:', error);
    res.status(500).json({ error: { message: 'Failed to update device', code: 'UPDATE_ERROR' } });
  }
});

// DELETE /api/devices/:id - Decommission device
router.delete('/:id', async (req, res) => {
  try {
    // Check if device exists first
    const { data: device, error: checkError } = await supabase
      .from('devices')
      .select('id')
      .eq('id', req.params.id)
      .single();

    if (checkError || !device) {
      return res.status(404).json({ error: { message: 'Device not found', code: 'NOT_FOUND' } });
    }

    const { error } = await supabase
      .from('devices')
      .update({ is_active: false, status: 'offline', updated_at: new Date().toISOString() })
      .eq('id', req.params.id);

    if (error) throw error;

    res.json({ message: 'Device decommissioned' });
  } catch (error) {
    console.error('Delete device error:', error);
    res.status(500).json({ error: { message: 'Failed to decommission device', code: 'DELETE_ERROR' } });
  }
});

// POST /api/devices/:id/heartbeat - Device heartbeat
router.post('/:id/heartbeat', async (req, res) => {
  try {
    const { cpu_usage, memory_usage, temperature_celsius, network_latency_ms, error_count, sensor_readings } = req.body;

    // Update device status and last heartbeat
    const { error: updateError } = await supabase
      .from('devices')
      .update({
        status: 'online',
        last_heartbeat: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', req.params.id);

    if (updateError) throw updateError;

    // Record metrics
    const metricsId = uuidv4();
    const { error: metricsError } = await supabase
      .from('device_metrics')
      .insert({
        id: metricsId,
        device_id: req.params.id,
        cpu_usage,
        memory_usage,
        temperature_celsius,
        network_latency_ms,
        error_count: error_count || 0,
        sensor_readings: sensor_readings || {}
      });

    if (metricsError) throw metricsError;

    res.json({ message: 'Heartbeat received', metrics_id: metricsId });
  } catch (error) {
    console.error('Heartbeat error:', error);
    res.status(500).json({ error: { message: 'Failed to process heartbeat', code: 'HEARTBEAT_ERROR' } });
  }
});

// GET /api/devices/:id/metrics - Get device metrics history
router.get('/:id/metrics', async (req, res) => {
  try {
    const { limit = 100, offset = 0, from, to } = req.query;

    let query = supabase
      .from('device_metrics')
      .select('*')
      .eq('device_id', req.params.id)
      .order('timestamp', { ascending: false })
      .range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1);

    if (from) {
      query = query.gte('timestamp', from);
    }
    if (to) {
      query = query.lte('timestamp', to);
    }

    const { data: metrics, error } = await query;

    if (error) throw error;

    res.json({
      metrics: (metrics || []).map(m => ({
        ...m,
        sensor_readings: m.sensor_readings || {}
      }))
    });
  } catch (error) {
    console.error('Get metrics error:', error);
    res.status(500).json({ error: { message: 'Failed to get metrics', code: 'GET_ERROR' } });
  }
});

// POST /api/devices/bulk - Bulk device operations
router.post('/bulk', async (req, res) => {
  try {
    const { operation, device_ids, data } = req.body;

    if (!operation || !device_ids || !Array.isArray(device_ids)) {
      return res.status(400).json({ error: { message: 'operation and device_ids are required', code: 'VALIDATION_ERROR' } });
    }

    let affected = 0;

    switch (operation) {
      case 'update_status':
        for (const id of device_ids) {
          const { error } = await supabase
            .from('devices')
            .update({ status: data.status, updated_at: new Date().toISOString() })
            .eq('id', id);
          if (!error) affected++;
        }
        break;
      case 'update_firmware':
        for (const id of device_ids) {
          const { error } = await supabase
            .from('devices')
            .update({ firmware_version: data.firmware_version, updated_at: new Date().toISOString() })
            .eq('id', id);
          if (!error) affected++;
        }
        break;
      case 'decommission':
        for (const id of device_ids) {
          const { error } = await supabase
            .from('devices')
            .update({ is_active: false, status: 'offline', updated_at: new Date().toISOString() })
            .eq('id', id);
          if (!error) affected++;
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
