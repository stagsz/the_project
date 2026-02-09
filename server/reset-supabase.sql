-- Drop all tables in reverse order (to handle foreign keys)
DROP TABLE IF EXISTS ai_logs CASCADE;
DROP TABLE IF EXISTS privacy_budget_logs CASCADE;
DROP TABLE IF EXISTS audit_logs CASCADE;
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS model_deployments CASCADE;
DROP TABLE IF EXISTS quality_inspections CASCADE;
DROP TABLE IF EXISTS maintenance_predictions CASCADE;
DROP TABLE IF EXISTS anomalies CASCADE;
DROP TABLE IF EXISTS device_training_contributions CASCADE;
DROP TABLE IF EXISTS training_rounds CASCADE;
DROP TABLE IF EXISTS model_versions CASCADE;
DROP TABLE IF EXISTS models CASCADE;
DROP TABLE IF EXISTS device_metrics CASCADE;
DROP TABLE IF EXISTS devices CASCADE;
DROP TABLE IF EXISTS device_groups CASCADE;
DROP TABLE IF EXISTS facilities CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Now run the schema creation (from supabase-schema.sql)
-- Copy and paste the content of supabase-schema.sql below this line
