import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import db from '../utils/db.js';

const router = Router();

// GET /api/facilities - List all facilities
router.get('/', (req, res) => {
  try {
    const facilities = db.prepare(`
      SELECT f.*,
        (SELECT COUNT(*) FROM device_groups dg WHERE dg.facility_id = f.id) as group_count,
        (SELECT COUNT(*) FROM devices d
         JOIN device_groups dg ON d.device_group_id = dg.id
         WHERE dg.facility_id = f.id) as device_count
      FROM facilities f
      WHERE f.is_active = 1
      ORDER BY f.name
    `).all();

    res.json({ facilities });
  } catch (error) {
    console.error('List facilities error:', error);
    res.status(500).json({ error: { message: 'Failed to list facilities', code: 'LIST_ERROR' } });
  }
});

// POST /api/facilities - Create facility
router.post('/', (req, res) => {
  try {
    const { name, location, timezone = 'UTC', description } = req.body;

    if (!name) {
      return res.status(400).json({ error: { message: 'Name is required', code: 'VALIDATION_ERROR' } });
    }

    const id = uuidv4();
    db.prepare(`
      INSERT INTO facilities (id, name, location, timezone, description)
      VALUES (?, ?, ?, ?, ?)
    `).run(id, name, location, timezone, description);

    const facility = db.prepare('SELECT * FROM facilities WHERE id = ?').get(id);
    res.status(201).json({ facility });
  } catch (error) {
    console.error('Create facility error:', error);
    res.status(500).json({ error: { message: 'Failed to create facility', code: 'CREATE_ERROR' } });
  }
});

// GET /api/facilities/:id - Get facility details
router.get('/:id', (req, res) => {
  try {
    const facility = db.prepare(`
      SELECT f.*,
        (SELECT COUNT(*) FROM device_groups dg WHERE dg.facility_id = f.id) as group_count,
        (SELECT COUNT(*) FROM devices d
         JOIN device_groups dg ON d.device_group_id = dg.id
         WHERE dg.facility_id = f.id) as device_count
      FROM facilities f
      WHERE f.id = ?
    `).get(req.params.id);

    if (!facility) {
      return res.status(404).json({ error: { message: 'Facility not found', code: 'NOT_FOUND' } });
    }

    const groups = db.prepare(`
      SELECT dg.*,
        (SELECT COUNT(*) FROM devices d WHERE d.device_group_id = dg.id) as device_count
      FROM device_groups dg
      WHERE dg.facility_id = ?
    `).all(req.params.id);

    res.json({ facility: { ...facility, groups } });
  } catch (error) {
    console.error('Get facility error:', error);
    res.status(500).json({ error: { message: 'Failed to get facility', code: 'GET_ERROR' } });
  }
});

// PUT /api/facilities/:id - Update facility
router.put('/:id', (req, res) => {
  try {
    const { name, location, timezone, description, is_active } = req.body;

    const updates = [];
    const params = [];

    if (name) { updates.push('name = ?'); params.push(name); }
    if (location !== undefined) { updates.push('location = ?'); params.push(location); }
    if (timezone) { updates.push('timezone = ?'); params.push(timezone); }
    if (description !== undefined) { updates.push('description = ?'); params.push(description); }
    if (is_active !== undefined) { updates.push('is_active = ?'); params.push(is_active ? 1 : 0); }

    updates.push('updated_at = datetime("now")');
    params.push(req.params.id);

    db.prepare(`UPDATE facilities SET ${updates.join(', ')} WHERE id = ?`).run(...params);

    const facility = db.prepare('SELECT * FROM facilities WHERE id = ?').get(req.params.id);
    res.json({ facility });
  } catch (error) {
    console.error('Update facility error:', error);
    res.status(500).json({ error: { message: 'Failed to update facility', code: 'UPDATE_ERROR' } });
  }
});

// DELETE /api/facilities/:id - Deactivate facility
router.delete('/:id', (req, res) => {
  try {
    db.prepare('UPDATE facilities SET is_active = 0, updated_at = datetime("now") WHERE id = ?').run(req.params.id);
    res.json({ message: 'Facility deactivated' });
  } catch (error) {
    console.error('Delete facility error:', error);
    res.status(500).json({ error: { message: 'Failed to deactivate facility', code: 'DELETE_ERROR' } });
  }
});

export default router;
