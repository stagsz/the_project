  -- FedLearn Industrial - Supabase Schema
  -- Run this in Supabase SQL Editor to create all tables

  -- Users table
  CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT CHECK(role IN ('admin', 'operator', 'viewer')) DEFAULT 'viewer',
    avatar_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    last_login TIMESTAMPTZ,
    preferences JSONB DEFAULT '{}'::jsonb,
    notification_settings JSONB DEFAULT '{}'::jsonb
  );

  -- Facilities table
  CREATE TABLE IF NOT EXISTS facilities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    location TEXT,
    timezone TEXT DEFAULT 'UTC',
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
  );

  -- Device groups table
  CREATE TABLE IF NOT EXISTS device_groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    facility_id UUID REFERENCES facilities(id),
    name TEXT NOT NULL,
    description TEXT,
    equipment_type TEXT CHECK(equipment_type IN ('sensor', 'controller', 'gateway', 'compute_node')),
    zone TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
  );

  -- Devices table
  CREATE TABLE IF NOT EXISTS devices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    device_group_id UUID REFERENCES device_groups(id),
    device_uid TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    type TEXT CHECK(type IN ('edge_compute', 'sensor_gateway', 'plc', 'camera', 'simulated')),
    status TEXT CHECK(status IN ('online', 'offline', 'warning', 'error', 'maintenance')) DEFAULT 'offline',
    ip_address TEXT,
    firmware_version TEXT,
    capabilities JSONB DEFAULT '{}'::jsonb,
    last_heartbeat TIMESTAMPTZ,
    is_simulated BOOLEAN DEFAULT false,
    dataset_path TEXT,
    is_active BOOLEAN DEFAULT true,
    registered_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
  );

  -- Device metrics table
  CREATE TABLE IF NOT EXISTS device_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    device_id UUID REFERENCES devices(id),
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    cpu_usage NUMERIC,
    memory_usage NUMERIC,
    temperature_celsius NUMERIC,
    network_latency_ms NUMERIC,
    error_count INTEGER DEFAULT 0,
    sensor_readings JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
  );

  -- Models table
  CREATE TABLE IF NOT EXISTS models (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    model_type TEXT CHECK(model_type IN ('classification', 'regression', 'anomaly_detection', 'object_detection')),
    architecture JSONB DEFAULT '{}'::jsonb,
    input_schema JSONB DEFAULT '{}'::jsonb,
    output_schema JSONB DEFAULT '{}'::jsonb,
    target_use_case TEXT CHECK(target_use_case IN ('predictive_maintenance', 'quality_inspection', 'process_optimization')),
    status TEXT CHECK(status IN ('draft', 'active', 'deprecated')) DEFAULT 'draft',
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
  );

  -- Model versions table
  CREATE TABLE IF NOT EXISTS model_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    model_id UUID REFERENCES models(id),
    version TEXT NOT NULL,
    weights JSONB DEFAULT '{}'::jsonb,
    metrics JSONB DEFAULT '{}'::jsonb,
    training_round_id UUID,
    is_deployed BOOLEAN DEFAULT false,
    deployment_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    notes TEXT
  );

  -- Training rounds table
  CREATE TABLE IF NOT EXISTS training_rounds (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    model_id UUID REFERENCES models(id),
    status TEXT CHECK(status IN ('pending', 'in_progress', 'aggregating', 'completed', 'failed', 'cancelled')) DEFAULT 'pending',
    round_number INTEGER,
    target_devices JSONB DEFAULT '[]'::jsonb,
    participating_devices JSONB DEFAULT '[]'::jsonb,
    hyperparameters JSONB DEFAULT '{}'::jsonb,
    privacy_config JSONB DEFAULT '{}'::jsonb,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    aggregation_method TEXT CHECK(aggregation_method IN ('fedavg', 'weighted_fedavg')) DEFAULT 'fedavg',
    result_metrics JSONB DEFAULT '{}'::jsonb,
    error_message TEXT,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
  );

  -- Device training contributions table
  CREATE TABLE IF NOT EXISTS device_training_contributions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    training_round_id UUID REFERENCES training_rounds(id),
    device_id UUID REFERENCES devices(id),
    status TEXT CHECK(status IN ('pending', 'training', 'uploading', 'completed', 'failed')) DEFAULT 'pending',
    local_metrics JSONB DEFAULT '{}'::jsonb,
    data_samples_count INTEGER DEFAULT 0,
    training_duration_seconds NUMERIC,
    upload_timestamp TIMESTAMPTZ,
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
  );

  -- Anomalies table
  CREATE TABLE IF NOT EXISTS anomalies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    device_id UUID REFERENCES devices(id),
    model_version_id UUID REFERENCES model_versions(id),
    anomaly_type TEXT CHECK(anomaly_type IN ('sensor_drift', 'equipment_failure', 'quality_defect', 'process_deviation')),
    severity TEXT CHECK(severity IN ('info', 'warning', 'critical')) DEFAULT 'info',
    detected_at TIMESTAMPTZ DEFAULT NOW(),
    sensor_data JSONB DEFAULT '{}'::jsonb,
    confidence_score NUMERIC,
    description TEXT,
    ai_explanation TEXT,
    status TEXT CHECK(status IN ('new', 'acknowledged', 'investigating', 'resolved', 'false_alarm')) DEFAULT 'new',
    resolved_at TIMESTAMPTZ,
    resolved_by UUID REFERENCES users(id),
    resolution_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
  );

  -- Maintenance predictions table
  CREATE TABLE IF NOT EXISTS maintenance_predictions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    device_id UUID REFERENCES devices(id),
    model_version_id UUID REFERENCES model_versions(id),
    component TEXT,
    prediction_type TEXT CHECK(prediction_type IN ('failure', 'degradation', 'replacement_needed')),
    predicted_date TIMESTAMPTZ,
    confidence_score NUMERIC,
    risk_level TEXT CHECK(risk_level IN ('low', 'medium', 'high', 'critical')),
    recommended_action TEXT,
    estimated_cost NUMERIC,
    status TEXT CHECK(status IN ('pending', 'scheduled', 'completed', 'dismissed')) DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
  );

  -- Quality inspections table
  CREATE TABLE IF NOT EXISTS quality_inspections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    device_id UUID REFERENCES devices(id),
    model_version_id UUID REFERENCES model_versions(id),
    inspection_timestamp TIMESTAMPTZ DEFAULT NOW(),
    result TEXT CHECK(result IN ('pass', 'fail', 'warning')),
    defect_type TEXT,
    confidence_score NUMERIC,
    image_reference TEXT,
    human_override BOOLEAN DEFAULT false,
    override_result TEXT,
    override_by UUID REFERENCES users(id),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
  );

  -- Model deployments table
  CREATE TABLE IF NOT EXISTS model_deployments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    model_version_id UUID REFERENCES model_versions(id),
    device_group_id UUID REFERENCES device_groups(id),
    deployment_type TEXT CHECK(deployment_type IN ('full', 'canary', 'a_b_test')) DEFAULT 'full',
    status TEXT CHECK(status IN ('pending', 'rolling_out', 'deployed', 'rolling_back', 'failed')) DEFAULT 'pending',
    target_device_count INTEGER DEFAULT 0,
    successful_device_count INTEGER DEFAULT 0,
    failed_device_count INTEGER DEFAULT 0,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    rollback_version_id UUID REFERENCES model_versions(id),
    deployed_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
  );

  -- Notifications table
  CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    type TEXT CHECK(type IN ('training_complete', 'device_offline', 'anomaly_detected', 'deployment_status', 'maintenance_alert')),
    title TEXT NOT NULL,
    message TEXT,
    severity TEXT CHECK(severity IN ('info', 'warning', 'error')) DEFAULT 'info',
    data JSONB DEFAULT '{}'::jsonb,
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
  );

  -- Audit logs table
  CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    action TEXT CHECK(action IN ('create', 'update', 'delete', 'deploy', 'start_training', 'acknowledge_anomaly')),
    entity_type TEXT,
    entity_id UUID,
    old_values JSONB,
    new_values JSONB,
    ip_address TEXT,
    timestamp TIMESTAMPTZ DEFAULT NOW()
  );

  -- Privacy budget logs table
  CREATE TABLE IF NOT EXISTS privacy_budget_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    model_id UUID REFERENCES models(id),
    training_round_id UUID REFERENCES training_rounds(id),
    epsilon_consumed NUMERIC,
    cumulative_epsilon NUMERIC,
    budget_limit NUMERIC,
    timestamp TIMESTAMPTZ DEFAULT NOW()
  );

  -- AI Response Logs table
  CREATE TABLE IF NOT EXISTS ai_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    query_type TEXT CHECK(query_type IN ('query', 'insights', 'explain_anomaly', 'recommendations', 'analyze_training')),
    query_text TEXT,
    response_text TEXT,
    device_id UUID REFERENCES devices(id),
    anomaly_id UUID REFERENCES anomalies(id),
    training_round_id UUID REFERENCES training_rounds(id),
    device_name TEXT,
    device_type TEXT,
    user_id UUID,
    created_at TIMESTAMPTZ DEFAULT NOW()
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
  CREATE INDEX IF NOT EXISTS idx_ai_logs_created ON ai_logs(created_at);
  CREATE INDEX IF NOT EXISTS idx_ai_logs_device ON ai_logs(device_id);
  CREATE INDEX IF NOT EXISTS idx_ai_logs_query_type ON ai_logs(query_type);

  -- Enable Row Level Security (RLS) - optional but recommended
  -- ALTER TABLE users ENABLE ROW LEVEL SECURITY;
  -- ALTER TABLE devices ENABLE ROW LEVEL SECURITY;
  -- ... add policies as needed
