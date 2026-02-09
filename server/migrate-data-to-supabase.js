import Database from 'better-sqlite3';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import supabase from './src/utils/supabase.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const dbPath = join(__dirname, 'db/fedlearn.db');
const db = new Database(dbPath);

// Table migration order (respects foreign key dependencies)
const TABLES = [
  'users',
  'facilities',
  'devices',
  'device_groups',
  'device_group_members',
  'models',
  'training_rounds',
  'training_participants',
  'anomalies',
  'maintenance_schedules',
  'maintenance_history',
  'quality_inspections',
  'quality_metrics',
  'process_optimizations',
  'ai_queries',
  'notifications',
  'audit_log'
];

async function migrateTable(tableName) {
  try {
    console.log(`\n📦 Migrating ${tableName}...`);

    // Get all data from SQLite
    const rows = db.prepare(`SELECT * FROM ${tableName}`).all();

    if (rows.length === 0) {
      console.log(`   ✓ ${tableName} is empty (skipped)`);
      return { success: true, count: 0 };
    }

    console.log(`   Found ${rows.length} rows`);

    // Insert into Supabase in batches (Supabase has a limit)
    const BATCH_SIZE = 100;
    let inserted = 0;

    for (let i = 0; i < rows.length; i += BATCH_SIZE) {
      const batch = rows.slice(i, i + BATCH_SIZE);

      // Convert SQLite rows to Supabase format
      const formattedBatch = batch.map(row => {
        const formatted = { ...row };

        // Parse JSON strings back to objects
        Object.keys(formatted).forEach(key => {
          if (typeof formatted[key] === 'string') {
            try {
              // Try to parse as JSON if it looks like JSON
              if (formatted[key].startsWith('{') || formatted[key].startsWith('[')) {
                formatted[key] = JSON.parse(formatted[key]);
              }
            } catch {
              // Not JSON, keep as string
            }
          }
        });

        return formatted;
      });

      const { data, error } = await supabase
        .from(tableName)
        .insert(formattedBatch)
        .select();

      if (error) {
        console.error(`   ✗ Error inserting batch ${i / BATCH_SIZE + 1}:`, error.message);
        return { success: false, error: error.message, count: inserted };
      }

      inserted += data.length;
      console.log(`   Inserted batch ${i / BATCH_SIZE + 1} (${inserted}/${rows.length})`);
    }

    console.log(`   ✓ Migrated ${inserted} rows to ${tableName}`);
    return { success: true, count: inserted };

  } catch (err) {
    console.error(`   ✗ Failed to migrate ${tableName}:`, err.message);
    return { success: false, error: err.message, count: 0 };
  }
}

async function main() {
  console.log('🚀 Starting SQLite → Supabase data migration\n');
  console.log('Source: SQLite database at', dbPath);
  console.log('Target: Supabase project');

  const results = {
    successful: [],
    failed: [],
    totalRows: 0
  };

  for (const table of TABLES) {
    const result = await migrateTable(table);

    if (result.success) {
      results.successful.push({ table, count: result.count });
      results.totalRows += result.count;
    } else {
      results.failed.push({ table, error: result.error });
    }
  }

  console.log('\n' + '='.repeat(50));
  console.log('📊 Migration Summary');
  console.log('='.repeat(50));

  console.log(`\n✓ Successfully migrated ${results.successful.length} tables:`);
  results.successful.forEach(({ table, count }) => {
    console.log(`   ${table}: ${count} rows`);
  });

  if (results.failed.length > 0) {
    console.log(`\n✗ Failed to migrate ${results.failed.length} tables:`);
    results.failed.forEach(({ table, error }) => {
      console.log(`   ${table}: ${error}`);
    });
  }

  console.log(`\n📈 Total rows migrated: ${results.totalRows}`);

  db.close();
  console.log('\n✅ Migration complete!');
}

main().catch(err => {
  console.error('💥 Migration failed:', err);
  process.exit(1);
});
