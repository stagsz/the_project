import supabase from './src/utils/supabase.js';

console.log('🌱 Seeding Supabase with default data...\n');

async function seedData() {
  try {
    // Check if admin user already exists
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('email', 'admin@fedlearn.io')
      .single();

    if (existingUser) {
      console.log('✓ Admin user already exists');
    } else {
      // Create admin user
      const { data: newUser, error: userError } = await supabase
        .from('users')
        .insert({
          email: 'admin@fedlearn.io',
          name: 'System Admin',
          password_hash: 'admin123', // Demo password (plaintext for dev)
          role: 'admin',
          preferences: {
            theme: 'light',
            units: 'SI',
            timezone: 'UTC',
            dateFormat: 'YYYY-MM-DD',
            timeFormat: '24h'
          }
        })
        .select()
        .single();

      if (userError) {
        console.error('✗ Failed to create admin user:', userError.message);
        throw userError;
      }

      console.log('✓ Created admin user:', newUser.email);
      console.log('  ID:', newUser.id);
      console.log('  Login: admin@fedlearn.io / admin123');
    }

    // Check if facility already exists
    const { data: existingFacilities } = await supabase
      .from('facilities')
      .select('id')
      .limit(1);

    if (existingFacilities && existingFacilities.length > 0) {
      console.log('✓ Facility already exists');
    } else {
      // Create default facility
      const { data: newFacility, error: facilityError } = await supabase
        .from('facilities')
        .insert({
          name: 'Main Manufacturing Plant',
          location: 'Building A, Industrial Zone',
          timezone: 'UTC',
          description: 'Primary manufacturing facility for federated learning deployment'
        })
        .select()
        .single();

      if (facilityError) {
        console.error('✗ Failed to create facility:', facilityError.message);
        throw facilityError;
      }

      console.log('✓ Created facility:', newFacility.name);
      console.log('  ID:', newFacility.id);

      // Create default device group
      const { data: newGroup, error: groupError } = await supabase
        .from('device_groups')
        .insert({
          facility_id: newFacility.id,
          name: 'Production Line 1',
          description: 'Primary production line with edge compute nodes',
          equipment_type: 'compute_node',
          zone: 'Zone A'
        })
        .select()
        .single();

      if (groupError) {
        console.error('✗ Failed to create device group:', groupError.message);
        throw groupError;
      }

      console.log('✓ Created device group:', newGroup.name);
      console.log('  ID:', newGroup.id);
    }

    console.log('\n✅ Seeding complete!');
    console.log('\nYou can now log in with:');
    console.log('  Email: admin@fedlearn.io');
    console.log('  Password: admin123');

  } catch (err) {
    console.error('\n💥 Seeding failed:', err.message);
    process.exit(1);
  }
}

seedData();
