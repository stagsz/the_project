import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const dbDir = join(__dirname, '../../db');
const dbPath = join(dbDir, 'fedlearn.db');

console.log('Starting database migration...');

const db = new Database(dbPath);

// Enable foreign keys
db.pragma('foreign_keys = ON');

try {
  // Check if dataset_path column exists
  const columns = db.prepare("PRAGMA table_info(devices)").all();
  const hasDatasetPath = columns.some(col => col.name === 'dataset_path');
  
  if (!hasDatasetPath) {
    console.log('Adding dataset_path column to devices table...');
    db.exec('ALTER TABLE devices ADD COLUMN dataset_path TEXT');
    console.log('✓ Added dataset_path column');
  } else {
    console.log('✓ dataset_path column already exists');
  }

  // Update device type CHECK constraint to include 'simulated'
  // SQLite doesn't support modifying CHECK constraints directly
  // We need to recreate the table
  console.log('Updating device type constraint to include simulated...');
  
  db.exec(`
    -- Create temporary table with updated constraint
    CREATE TABLE devices_new (
      id TEXT PRIMARY KEY,
      device_group_id TEXT REFERENCES device_groups(id),
      device_uid TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      type TEXT CHECK(type IN ('edge_compute', 'sensor_gateway', 'plc', 'camera', 'simulated')),
      status TEXT CHECK(status IN ('online', 'offline', 'warning', 'error', 'maintenance')) DEFAULT 'offline',
      ip_address TEXT,
      firmware_version TEXT,
      capabilities TEXT DEFAULT '{}',
      last_heartbeat TEXT,
      is_simulated INTEGER DEFAULT 0,
      dataset_path TEXT,
      is_active INTEGER DEFAULT 1,
      registered_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );
    
    -- Copy existing data
    INSERT INTO devices_new SELECT
      id, device_group_id, device_uid, name, type, status,
      ip_address, firmware_version, capabilities, last_heartbeat,
      is_simulated, dataset_path, is_active, registered_at, updated_at
    FROM devices;
    
    -- Drop old table
    DROP TABLE devices;
    
    -- Rename new table
    ALTER TABLE devices_new RENAME TO devices;
    
    -- Recreate indexes
    CREATE INDEX IF NOT EXISTS idx_devices_status ON devices(status);
    CREATE INDEX IF NOT EXISTS idx_devices_group ON devices(device_group_id);
  `);
  
  console.log('✓ Device type constraint updated to include simulated');

  // Update models table target_use_case constraint
  console.log('Updating models table target_use_case constraint...');
  
  db.exec(`
    -- Create temporary models table with updated constraint
    CREATE TABLE models_new (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      model_type TEXT CHECK(model_type IN ('classification', 'regression', 'anomaly_detection', 'object_detection')),
      architecture TEXT DEFAULT '{}',
      input_schema TEXT DEFAULT '{}',
      output_schema TEXT DEFAULT '{}',
      target_use_case TEXT CHECK(target_use_case IN ('predictive_maintenance', 'quality_control', 'quality_inspection', 'process_optimization', 'energy_optimization', 'anomaly_detection')),
      status TEXT CHECK(status IN ('draft', 'active', 'deprecated')) DEFAULT 'draft',
      created_by TEXT REFERENCES users(id),
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );
    
    -- Copy existing data
    INSERT INTO models_new SELECT * FROM models;
    
    -- Drop old table
    DROP TABLE models;
    
    -- Rename new table
    ALTER TABLE models_new RENAME TO models;
    
    -- Recreate indexes
    CREATE INDEX IF NOT EXISTS idx_models_status ON models(status);
  `);
  
  console.log('✓ Models target_use_case constraint updated');
  console.log('\nMigration completed successfully!');
  
} catch (error) {
  console.error('Migration failed:', error);
  console.error('Error details:', error.message);
  process.exit(1);
} finally {
  db.close();
}