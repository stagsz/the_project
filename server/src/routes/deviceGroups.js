import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import supabase from '../utils/supabase.js';

const router = Router();

// GET /api/device-groups - List device groups
router.get('/', async (req, res) => {
  try {
    const { facility } = req.query;

    let query = supabase
      .from('device_groups')
      .select('*, facilities(name)')
      .order('name');

    if (facility) {
      query = query.eq('facility_id', facility);
    }

    const { data: groups, error } = await query;

    if (error) throw error;

    // Get device counts for each group
    const groupsWithCounts = await Promise.all(
      (groups || []).map(async (g) => {
        const { count: deviceCount } = await supabase
          .from('devices')
          .select('*', { count: 'exact', head: true })
          .eq('device_group_id', g.id)
          .eq('is_active', true);

        const { count: onlineCount } = await supabase
          .from('devices')
          .select('*', { count: 'exact', head: true })
          .eq('device_group_id', g.id)
          .eq('status', 'online');

        return {
          ...g,
          facility_name: g.facilities?.name || null,
          device_count: deviceCount || 0,
          online_count: onlineCount || 0,
          facilities: undefined
        };
      })
    );

    res.json({ groups: groupsWithCounts });
  } catch (error) {
    console.error('List device groups error:', error);
    res.status(500).json({ error: { message: 'Failed to list device groups', code: 'LIST_ERROR' } });
  }
});

// POST /api/device-groups - Create device group
router.post('/', async (req, res) => {
  try {
    const { facility_id, name, description, equipment_type, zone } = req.body;

    if (!name) {
      return res.status(400).json({ error: { message: 'Name is required', code: 'VALIDATION_ERROR' } });
    }

    const id = uuidv4();
    const { error: insertError } = await supabase
      .from('device_groups')
      .insert({ id, facility_id, name, description, equipment_type, zone });

    if (insertError) throw insertError;

    const { data: group, error: fetchError } = await supabase
      .from('device_groups')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError) throw fetchError;

    res.status(201).json({ group });
  } catch (error) {
    console.error('Create device group error:', error);
    res.status(500).json({ error: { message: 'Failed to create device group', code: 'CREATE_ERROR' } });
  }
});

// GET /api/device-groups/:id - Get device group details
router.get('/:id', async (req, res) => {
  try {
    const { data: group, error } = await supabase
      .from('device_groups')
      .select('*, facilities(name)')
      .eq('id', req.params.id)
      .single();

    if (error || !group) {
      return res.status(404).json({ error: { message: 'Device group not found', code: 'NOT_FOUND' } });
    }

    // Get devices in this group
    const { data: devices } = await supabase
      .from('devices')
      .select('*')
      .eq('device_group_id', req.params.id)
      .eq('is_active', true);

    res.json({
      group: {
        ...group,
        facility_name: group.facilities?.name || null,
        facilities: undefined,
        devices: (devices || []).map(d => ({
          ...d,
          capabilities: d.capabilities || {}
        }))
      }
    });
  } catch (error) {
    console.error('Get device group error:', error);
    res.status(500).json({ error: { message: 'Failed to get device group', code: 'GET_ERROR' } });
  }
});

// PUT /api/device-groups/:id - Update device group
router.put('/:id', async (req, res) => {
  try {
    const { facility_id, name, description, equipment_type, zone } = req.body;

    const updates = { updated_at: new Date().toISOString() };

    if (facility_id !== undefined) updates.facility_id = facility_id;
    if (name) updates.name = name;
    if (description !== undefined) updates.description = description;
    if (equipment_type) updates.equipment_type = equipment_type;
    if (zone !== undefined) updates.zone = zone;

    const { error: updateError } = await supabase
      .from('device_groups')
      .update(updates)
      .eq('id', req.params.id);

    if (updateError) throw updateError;

    const { data: group, error: fetchError } = await supabase
      .from('device_groups')
      .select('*')
      .eq('id', req.params.id)
      .single();

    if (fetchError) throw fetchError;

    res.json({ group });
  } catch (error) {
    console.error('Update device group error:', error);
    res.status(500).json({ error: { message: 'Failed to update device group', code: 'UPDATE_ERROR' } });
  }
});

// DELETE /api/device-groups/:id - Delete device group
router.delete('/:id', async (req, res) => {
  try {
    // Check if group has devices
    const { count } = await supabase
      .from('devices')
      .select('*', { count: 'exact', head: true })
      .eq('device_group_id', req.params.id)
      .eq('is_active', true);

    if (count > 0) {
      return res.status(400).json({ error: { message: 'Cannot delete group with active devices', code: 'HAS_DEVICES' } });
    }

    const { error } = await supabase
      .from('device_groups')
      .delete()
      .eq('id', req.params.id);

    if (error) throw error;

    res.json({ message: 'Device group deleted' });
  } catch (error) {
    console.error('Delete device group error:', error);
    res.status(500).json({ error: { message: 'Failed to delete device group', code: 'DELETE_ERROR' } });
  }
});

export default router;
