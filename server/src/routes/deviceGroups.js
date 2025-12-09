import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import db from '../utils/db.js';

const router = Router();

// GET /api/device-groups - List device groups
router.get('/', (req, res) => {
  try {
    const { facility } = req.query;

    let query = `
      SELECT dg.*, f.name as facility_name,
        (SELECT COUNT(*) FROM devices d WHERE d.device_group_id = dg.id AND d.is_active = 1) as device_count,
        (SELECT COUNT(*) FROM devices d WHERE d.device_group_id = dg.id AND d.status = 'online') as online_count
      FROM device_groups dg
      LEFT JOIN facilities f ON dg.facility_id = f.id
    `;
    const params = [];

    if (facility) {
      query += ' WHERE dg.facility_id = ?';
      params.push(facility);
    }

    query += ' ORDER BY dg.name';

    const groups = db.prepare(query).all(...params);
    res.json({ groups });
  } catch (error) {
    console.error('List device groups error:', error);
    res.status(500).json({ error: { message: 'Failed to list device groups', code: 'LIST_ERROR' } });
  }
});

// POST /api/device-groups - Create device group
router.post('/', (req, res) => {
  try {
    const { facility_id, name, description, equipment_type, zone } = req.body;

    if (!name) {
      return res.status(400).json({ error: { message: 'Name is required', code: 'VALIDATION_ERROR' } });
    }

    const id = uuidv4();
    db.prepare(`
      INSERT INTO device_groups (id, facility_id, name, description, equipment_type, zone)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(id, facility_id, name, description, equipment_type, zone);

    const group = db.prepare('SELECT * FROM device_groups WHERE id = ?').get(id);
    res.status(201).json({ group });
  } catch (error) {
    console.error('Create device group error:', error);
    res.status(500).json({ error: { message: 'Failed to create device group', code: 'CREATE_ERROR' } });
  }
});

// GET /api/device-groups/:id - Get device group details
router.get('/:id', (req, res) => {
  try {
    const group = db.prepare(`
      SELECT dg.*, f.name as facility_name
      FROM device_groups dg
      LEFT JOIN facilities f ON dg.facility_id = f.id
      WHERE dg.id = ?
    `).get(req.params.id);

    if (!group) {
      return res.status(404).json({ error: { message: 'Device group not found', code: 'NOT_FOUND' } });
    }

    const devices = db.prepare(`
      SELECT * FROM devices WHERE device_group_id = ? AND is_active = 1
    `).all(req.params.id);

    res.json({
      group: {
        ...group,
        devices: devices.map(d => ({
          ...d,
          capabilities: JSON.parse(d.capabilities || '{}')
        }))
      }
    });
  } catch (error) {
    console.error('Get device group error:', error);
    res.status(500).json({ error: { message: 'Failed to get device group', code: 'GET_ERROR' } });
  }
});

// PUT /api/device-groups/:id - Update device group
router.put('/:id', (req, res) => {
  try {
    const { facility_id, name, description, equipment_type, zone } = req.body;

    const updates = [];
    const params = [];

    if (facility_id !== undefined) { updates.push('facility_id = ?'); params.push(facility_id); }
    if (name) { updates.push('name = ?'); params.push(name); }
    if (description !== undefined) { updates.push('description = ?'); params.push(description); }
    if (equipment_type) { updates.push('equipment_type = ?'); params.push(equipment_type); }
    if (zone !== undefined) { updates.push('zone = ?'); params.push(zone); }

    updates.push('updated_at = datetime("now")');
    params.push(req.params.id);

    db.prepare(`UPDATE device_groups SET ${updates.join(', ')} WHERE id = ?`).run(...params);

    const group = db.prepare('SELECT * FROM device_groups WHERE id = ?').get(req.params.id);
    res.json({ group });
  } catch (error) {
    console.error('Update device group error:', error);
    res.status(500).json({ error: { message: 'Failed to update device group', code: 'UPDATE_ERROR' } });
  }
});

// DELETE /api/device-groups/:id - Delete device group
router.delete('/:id', (req, res) => {
  try {
    // Check if group has devices
    const deviceCount = db.prepare('SELECT COUNT(*) as count FROM devices WHERE device_group_id = ? AND is_active = 1').get(req.params.id);
    if (deviceCount.count > 0) {
      return res.status(400).json({ error: { message: 'Cannot delete group with active devices', code: 'HAS_DEVICES' } });
    }

    db.prepare('DELETE FROM device_groups WHERE id = ?').run(req.params.id);
    res.json({ message: 'Device group deleted' });
  } catch (error) {
    console.error('Delete device group error:', error);
    res.status(500).json({ error: { message: 'Failed to delete device group', code: 'DELETE_ERROR' } });
  }
});

export default router;
