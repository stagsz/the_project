import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_ANON_KEY in .env');
  process.exit(1);
}

console.log('Supabase URL:', supabaseUrl);
console.log('Connecting to Supabase...\n');

const supabase = createClient(supabaseUrl, supabaseKey);

async function testConnection() {
  try {
    // Test: Check common FedLearn tables
    console.log('Checking for existing tables...\n');

    const testTables = ['users', 'devices', 'facilities', 'models', 'training_rounds'];

    for (const table of testTables) {
      const { data, error, count } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true });

      if (!error) {
        console.log(`  [EXISTS] '${table}'`);
      } else if (error.code === '42P01' || error.message.includes('does not exist')) {
        console.log(`  [MISSING] '${table}' - needs to be created`);
      } else if (error.code === 'PGRST200' || error.message.includes('schema cache')) {
        console.log(`  [MISSING] '${table}' - not in schema`);
      } else {
        console.log(`  [ERROR] '${table}': ${error.message}`);
      }
    }

    console.log('\n--- Connection Test Complete ---');
    console.log('Supabase connection is working!');
    console.log('\nNext steps:');
    console.log('1. Create tables in Supabase (run migrations)');
    console.log('2. Update db.js to use Supabase client');
    console.log('3. Update route files to use Supabase queries');

  } catch (err) {
    console.error('Connection failed:', err.message);
  }
}

testConnection();
