import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

console.log('🔄 Resetting and seeding Supabase database...\n');

async function resetAndSeed() {
  try {
    // Note: Supabase JS client doesn't support DROP TABLE directly
    // You need to run the SQL in the Supabase dashboard
    console.log('⚠️  This script can only seed data, not drop/recreate tables.');
    console.log('Please run complete-supabase-setup.sql in Supabase SQL Editor first.\n');
    console.log('Attempting to seed data...\n');

    // Check if user already exists
    const { data: existingUser } = await supabase
      .from('users')
      .select('id, email')
      .eq('email', 'admin@fedlearn.io')
      .single();

    if (existingUser) {
      console.log('✓ Admin user already exists:', existingUser.email);
    } else {
      // Insert admin user
      const { data: newUser, error: userError } = await supabase
        .from('users')
        .insert({
          email: 'admin@fedlearn.io',
          name: 'System Admin',
          password_hash: 'admin123',
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
    }

    // Check if facility exists
    const { data: existingFacility } = await supabase
      .from('facilities')
      .select('id, name')
      .limit(1)
      .single();

    if (existingFacility) {
      console.log('✓ Facility already exists:', existingFacility.name);
    } else {
      // Insert facility
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

      // Insert device group
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
    console.log('\nLogin credentials:');
    console.log('  Email: admin@fedlearn.io');
    console.log('  Password: admin123');

  } catch (err) {
    console.error('\n💥 Failed:', err.message);
    console.error('\n📝 Next steps:');
    console.error('1. Go to: https://supabase.com/dashboard/project/thixtbbgxoahsizjnspf');
    console.error('2. Open SQL Editor');
    console.error('3. Run the contents of complete-supabase-setup.sql');
    console.error('4. Then run this script again');
    process.exit(1);
  }
}

resetAndSeed();
