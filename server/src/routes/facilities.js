import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import supabase from '../utils/supabase.js';

const router = Router();

// GET /api/facilities - List all facilities
router.get('/', async (req, res) => {
  try {
    const { data: facilities, error } = await supabase
      .from('facilities')
      .select('*')
      .eq('is_active', true)
      .order('name');

    if (error) throw error;

    // Get counts for each facility
    const facilitiesWithCounts = await Promise.all(
      facilities.map(async (f) => {
        const { count: groupCount } = await supabase
          .from('device_groups')
          .select('*', { count: 'exact', head: true })
          .eq('facility_id', f.id);

        const { data: groups } = await supabase
          .from('device_groups')
          .select('id')
          .eq('facility_id', f.id);

        const groupIds = groups?.map(g => g.id) || [];
        let deviceCount = 0;
        if (groupIds.length > 0) {
          const { count } = await supabase
            .from('devices')
            .select('*', { count: 'exact', head: true })
            .in('device_group_id', groupIds);
          deviceCount = count || 0;
        }

        return {
          ...f,
          group_count: groupCount || 0,
          device_count: deviceCount
        };
      })
    );

    res.json({ facilities: facilitiesWithCounts });
  } catch (error) {
    console.error('List facilities error:', error);
    res.status(500).json({ error: { message: 'Failed to list facilities', code: 'LIST_ERROR' } });
  }
});

// POST /api/facilities - Create facility
router.post('/', async (req, res) => {
  try {
    const { name, location, timezone = 'UTC', description } = req.body;

    if (!name) {
      return res.status(400).json({ error: { message: 'Name is required', code: 'VALIDATION_ERROR' } });
    }

    const id = uuidv4();
    const { error: insertError } = await supabase
      .from('facilities')
      .insert({ id, name, location, timezone, description });

    if (insertError) throw insertError;

    const { data: facility, error: fetchError } = await supabase
      .from('facilities')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError) throw fetchError;

    res.status(201).json({ facility });
  } catch (error) {
    console.error('Create facility error:', error);
    res.status(500).json({ error: { message: 'Failed to create facility', code: 'CREATE_ERROR' } });
  }
});

// GET /api/facilities/:id - Get facility details
router.get('/:id', async (req, res) => {
  try {
    const { data: facility, error } = await supabase
      .from('facilities')
      .select('*')
      .eq('id', req.params.id)
      .single();

    if (error || !facility) {
      return res.status(404).json({ error: { message: 'Facility not found', code: 'NOT_FOUND' } });
    }

    // Get groups for this facility
    const { data: groups } = await supabase
      .from('device_groups')
      .select('*')
      .eq('facility_id', req.params.id);

    // Get device counts for each group
    const groupsWithCounts = await Promise.all(
      (groups || []).map(async (g) => {
        const { count } = await supabase
          .from('devices')
          .select('*', { count: 'exact', head: true })
          .eq('device_group_id', g.id);
        return { ...g, device_count: count || 0 };
      })
    );

    // Calculate totals
    const groupCount = groups?.length || 0;
    const deviceCount = groupsWithCounts.reduce((acc, g) => acc + g.device_count, 0);

    res.json({
      facility: {
        ...facility,
        group_count: groupCount,
        device_count: deviceCount,
        groups: groupsWithCounts
      }
    });
  } catch (error) {
    console.error('Get facility error:', error);
    res.status(500).json({ error: { message: 'Failed to get facility', code: 'GET_ERROR' } });
  }
});

// PUT /api/facilities/:id - Update facility
router.put('/:id', async (req, res) => {
  try {
    const { name, location, timezone, description, is_active } = req.body;

    const updates = { updated_at: new Date().toISOString() };

    if (name) updates.name = name;
    if (location !== undefined) updates.location = location;
    if (timezone) updates.timezone = timezone;
    if (description !== undefined) updates.description = description;
    if (is_active !== undefined) updates.is_active = is_active;

    const { error: updateError } = await supabase
      .from('facilities')
      .update(updates)
      .eq('id', req.params.id);

    if (updateError) throw updateError;

    const { data: facility, error: fetchError } = await supabase
      .from('facilities')
      .select('*')
      .eq('id', req.params.id)
      .single();

    if (fetchError) throw fetchError;

    res.json({ facility });
  } catch (error) {
    console.error('Update facility error:', error);
    res.status(500).json({ error: { message: 'Failed to update facility', code: 'UPDATE_ERROR' } });
  }
});

// DELETE /api/facilities/:id - Deactivate facility
router.delete('/:id', async (req, res) => {
  try {
    const { error } = await supabase
      .from('facilities')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('id', req.params.id);

    if (error) throw error;

    res.json({ message: 'Facility deactivated' });
  } catch (error) {
    console.error('Delete facility error:', error);
    res.status(500).json({ error: { message: 'Failed to deactivate facility', code: 'DELETE_ERROR' } });
  }
});

export default router;
