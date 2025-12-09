import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync, mkdirSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const dbDir = join(__dirname, '../../db');
const dbPath = join(dbDir, 'fedlearn.db');

// Ensure db directory exists
if (!existsSync(dbDir)) {
  mkdirSync(dbDir, { recursive: true });
}

const db = new Database(dbPath);

// Enable foreign keys
db.pragma('foreign_keys = ON');

console.log('Initializing FedLearn Industrial Database...');

// Create tables
db.exec(`
  -- Users table
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT CHECK(role IN ('admin', 'operator', 'viewer')) DEFAULT 'viewer',
    avatar_url TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    last_login TEXT,
    preferences TEXT DEFAULT '{}',
    notification_settings TEXT DEFAULT '{}'
  );

  -- Facilities table
  CREATE TABLE IF NOT EXISTS facilities (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    location TEXT,
    timezone TEXT DEFAULT 'UTC',
    description TEXT,
    is_active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  );

  -- Device groups table
  CREATE TABLE IF NOT EXISTS device_groups (
    id TEXT PRIMARY KEY,
    facility_id TEXT REFERENCES facilities(id),
    name TEXT NOT NULL,
    description TEXT,
    equipment_type TEXT CHECK(equipment_type IN ('sensor', 'controller', 'gateway', 'compute_node')),
    zone TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  );

  -- Devices table
  CREATE TABLE IF NOT EXISTS devices (
    id TEXT PRIMARY KEY,
    device_group_id TEXT REFERENCES device_groups(id),
    device_uid TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    type TEXT CHECK(type IN ('edge_compute', 'sensor_gateway', 'plc', 'camera')),
    status TEXT CHECK(status IN ('online', 'offline', 'warning', 'error', 'maintenance')) DEFAULT 'offline',
    ip_address TEXT,
    firmware_version TEXT,
    capabilities TEXT DEFAULT '{}',
    last_heartbeat TEXT,
    is_simulated INTEGER DEFAULT 0,
    is_active INTEGER DEFAULT 1,
    registered_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  );

  -- Device metrics table
  CREATE TABLE IF NOT EXISTS device_metrics (
    id TEXT PRIMARY KEY,
    device_id TEXT REFERENCES devices(id),
    timestamp TEXT DEFAULT (datetime('now')),
    cpu_usage REAL,
    memory_usage REAL,
    temperature_celsius REAL,
    network_latency_ms REAL,
    error_count INTEGER DEFAULT 0,
    sensor_readings TEXT DEFAULT '{}',
    created_at TEXT DEFAULT (datetime('now'))
  );

  -- Models table
  CREATE TABLE IF NOT EXISTS models (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    model_type TEXT CHECK(model_type IN ('classification', 'regression', 'anomaly_detection', 'object_detection')),
    architecture TEXT DEFAULT '{}',
    input_schema TEXT DEFAULT '{}',
    output_schema TEXT DEFAULT '{}',
    target_use_case TEXT CHECK(target_use_case IN ('predictive_maintenance', 'quality_inspection', 'process_optimization')),
    status TEXT CHECK(status IN ('draft', 'active', 'deprecated')) DEFAULT 'draft',
    created_by TEXT REFERENCES users(id),
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  );

  -- Model versions table
  CREATE TABLE IF NOT EXISTS model_versions (
    id TEXT PRIMARY KEY,
    model_id TEXT REFERENCES models(id),
    version TEXT NOT NULL,
    weights TEXT DEFAULT '{}',
    metrics TEXT DEFAULT '{}',
    training_round_id TEXT,
    is_deployed INTEGER DEFAULT 0,
    deployment_count INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    notes TEXT
  );

  -- Training rounds table
  CREATE TABLE IF NOT EXISTS training_rounds (
    id TEXT PRIMARY KEY,
    model_id TEXT REFERENCES models(id),
    status TEXT CHECK(status IN ('pending', 'in_progress', 'aggregating', 'completed', 'failed', 'cancelled')) DEFAULT 'pending',
    round_number INTEGER,
    target_devices TEXT DEFAULT '[]',
    participating_devices TEXT DEFAULT '[]',
    hyperparameters TEXT DEFAULT '{}',
    privacy_config TEXT DEFAULT '{}',
    started_at TEXT,
    completed_at TEXT,
    aggregation_method TEXT CHECK(aggregation_method IN ('fedavg', 'weighted_fedavg')) DEFAULT 'fedavg',
    result_metrics TEXT DEFAULT '{}',
    error_message TEXT,
    created_by TEXT REFERENCES users(id),
    created_at TEXT DEFAULT (datetime('now'))
  );

  -- Device training contributions table
  CREATE TABLE IF NOT EXISTS device_training_contributions (
    id TEXT PRIMARY KEY,
    training_round_id TEXT REFERENCES training_rounds(id),
    device_id TEXT REFERENCES devices(id),
    status TEXT CHECK(status IN ('pending', 'training', 'uploading', 'completed', 'failed')) DEFAULT 'pending',
    local_metrics TEXT DEFAULT '{}',
    data_samples_count INTEGER DEFAULT 0,
    training_duration_seconds REAL,
    upload_timestamp TEXT,
    error_message TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );

  -- Anomalies table
  CREATE TABLE IF NOT EXISTS anomalies (
    id TEXT PRIMARY KEY,
    device_id TEXT REFERENCES devices(id),
    model_version_id TEXT REFERENCES model_versions(id),
    anomaly_type TEXT CHECK(anomaly_type IN ('sensor_drift', 'equipment_failure', 'quality_defect', 'process_deviation')),
    severity TEXT CHECK(severity IN ('info', 'warning', 'critical')) DEFAULT 'info',
    detected_at TEXT DEFAULT (datetime('now')),
    sensor_data TEXT DEFAULT '{}',
    confidence_score REAL,
    description TEXT,
    ai_explanation TEXT,
    status TEXT CHECK(status IN ('new', 'acknowledged', 'investigating', 'resolved', 'false_alarm')) DEFAULT 'new',
    resolved_at TEXT,
    resolved_by TEXT REFERENCES users(id),
    resolution_notes TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );

  -- Maintenance predictions table
  CREATE TABLE IF NOT EXISTS maintenance_predictions (
    id TEXT PRIMARY KEY,
    device_id TEXT REFERENCES devices(id),
    model_version_id TEXT REFERENCES model_versions(id),
    component TEXT,
    prediction_type TEXT CHECK(prediction_type IN ('failure', 'degradation', 'replacement_needed')),
    predicted_date TEXT,
    confidence_score REAL,
    risk_level TEXT CHECK(risk_level IN ('low', 'medium', 'high', 'critical')),
    recommended_action TEXT,
    estimated_cost REAL,
    status TEXT CHECK(status IN ('pending', 'scheduled', 'completed', 'dismissed')) DEFAULT 'pending',
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  );

  -- Quality inspections table
  CREATE TABLE IF NOT EXISTS quality_inspections (
    id TEXT PRIMARY KEY,
    device_id TEXT REFERENCES devices(id),
    model_version_id TEXT REFERENCES model_versions(id),
    inspection_timestamp TEXT DEFAULT (datetime('now')),
    result TEXT CHECK(result IN ('pass', 'fail', 'warning')),
    defect_type TEXT,
    confidence_score REAL,
    image_reference TEXT,
    human_override INTEGER DEFAULT 0,
    override_result TEXT,
    override_by TEXT REFERENCES users(id),
    notes TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );

  -- Model deployments table
  CREATE TABLE IF NOT EXISTS model_deployments (
    id TEXT PRIMARY KEY,
    model_version_id TEXT REFERENCES model_versions(id),
    device_group_id TEXT REFERENCES device_groups(id),
    deployment_type TEXT CHECK(deployment_type IN ('full', 'canary', 'a_b_test')) DEFAULT 'full',
    status TEXT CHECK(status IN ('pending', 'rolling_out', 'deployed', 'rolling_back', 'failed')) DEFAULT 'pending',
    target_device_count INTEGER DEFAULT 0,
    successful_device_count INTEGER DEFAULT 0,
    failed_device_count INTEGER DEFAULT 0,
    started_at TEXT,
    completed_at TEXT,
    rollback_version_id TEXT REFERENCES model_versions(id),
    deployed_by TEXT REFERENCES users(id),
    created_at TEXT DEFAULT (datetime('now'))
  );

  -- Notifications table
  CREATE TABLE IF NOT EXISTS notifications (
    id TEXT PRIMARY KEY,
    user_id TEXT REFERENCES users(id),
    type TEXT CHECK(type IN ('training_complete', 'device_offline', 'anomaly_detected', 'deployment_status', 'maintenance_alert')),
    title TEXT NOT NULL,
    message TEXT,
    severity TEXT CHECK(severity IN ('info', 'warning', 'error')) DEFAULT 'info',
    data TEXT DEFAULT '{}',
    is_read INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
  );

  -- Audit logs table
  CREATE TABLE IF NOT EXISTS audit_logs (
    id TEXT PRIMARY KEY,
    user_id TEXT REFERENCES users(id),
    action TEXT CHECK(action IN ('create', 'update', 'delete', 'deploy', 'start_training', 'acknowledge_anomaly')),
    entity_type TEXT,
    entity_id TEXT,
    old_values TEXT,
    new_values TEXT,
    ip_address TEXT,
    timestamp TEXT DEFAULT (datetime('now'))
  );

  -- Privacy budget logs table
  CREATE TABLE IF NOT EXISTS privacy_budget_logs (
    id TEXT PRIMARY KEY,
    model_id TEXT REFERENCES models(id),
    training_round_id TEXT REFERENCES training_rounds(id),
    epsilon_consumed REAL,
    cumulative_epsilon REAL,
    budget_limit REAL,
    timestamp TEXT DEFAULT (datetime('now'))
  );

  -- Create indexes for performance
  CREATE INDEX IF NOT EXISTS idx_devices_status ON devices(status);
  CREATE INDEX IF NOT EXISTS idx_devices_group ON devices(device_group_id);
  CREATE INDEX IF NOT EXISTS idx_device_metrics_device ON device_metrics(device_id);
  CREATE INDEX IF NOT EXISTS idx_device_metrics_timestamp ON device_metrics(timestamp);
  CREATE INDEX IF NOT EXISTS idx_models_status ON models(status);
  CREATE INDEX IF NOT EXISTS idx_model_versions_model ON model_versions(model_id);
  CREATE INDEX IF NOT EXISTS idx_training_rounds_model ON training_rounds(model_id);
  CREATE INDEX IF NOT EXISTS idx_training_rounds_status ON training_rounds(status);
  CREATE INDEX IF NOT EXISTS idx_anomalies_device ON anomalies(device_id);
  CREATE INDEX IF NOT EXISTS idx_anomalies_status ON anomalies(status);
  CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
  CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp);
`);

console.log('Database tables created successfully.');

// Insert default admin user
const { v4: uuidv4 } = await import('uuid');

const adminExists = db.prepare('SELECT id FROM users WHERE email = ?').get('admin@fedlearn.io');
if (!adminExists) {
  // Simple password hash for demo (in production, use bcrypt)
  const passwordHash = 'admin123'; // Demo password

  db.prepare(`
    INSERT INTO users (id, email, name, password_hash, role, preferences)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(
    uuidv4(),
    'admin@fedlearn.io',
    'System Admin',
    passwordHash,
    'admin',
    JSON.stringify({
      theme: 'light',
      units: 'SI',
      timezone: 'UTC',
      dateFormat: 'YYYY-MM-DD',
      timeFormat: '24h'
    })
  );
  console.log('Default admin user created (admin@fedlearn.io / admin123)');
}

// Insert default facility
const facilityExists = db.prepare('SELECT id FROM facilities LIMIT 1').get();
if (!facilityExists) {
  const facilityId = uuidv4();
  db.prepare(`
    INSERT INTO facilities (id, name, location, timezone, description)
    VALUES (?, ?, ?, ?, ?)
  `).run(
    facilityId,
    'Main Manufacturing Plant',
    'Building A, Industrial Zone',
    'UTC',
    'Primary manufacturing facility for federated learning deployment'
  );
  console.log('Default facility created');

  // Insert default device group
  const groupId = uuidv4();
  db.prepare(`
    INSERT INTO device_groups (id, facility_id, name, description, equipment_type, zone)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(
    groupId,
    facilityId,
    'Production Line 1',
    'Primary production line with edge compute nodes',
    'compute_node',
    'Zone A'
  );
  console.log('Default device group created');
}

console.log('Database initialization complete!');
db.close();
