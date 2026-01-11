import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const dbPath = join(__dirname, '../../db/fedlearn.db');
const db = new Database(dbPath);

console.log('Adding Process Optimization tables...');

db.exec(`
  -- Process Units table (reactors, columns, heat exchangers, etc.)
  CREATE TABLE IF NOT EXISTS process_units (
    id TEXT PRIMARY KEY,
    facility_id TEXT REFERENCES facilities(id),
    name TEXT NOT NULL,
    unit_type TEXT CHECK(unit_type IN ('reactor', 'distillation_column', 'heat_exchanger', 'compressor', 'pump', 'furnace', 'separator', 'mixer', 'storage_tank', 'conveyor', 'injection_molder', 'extruder', 'other')) NOT NULL,
    description TEXT,
    design_capacity REAL,
    capacity_unit TEXT DEFAULT 'kg/h',
    operating_mode TEXT CHECK(operating_mode IN ('continuous', 'batch', 'semi_batch')) DEFAULT 'continuous',
    is_active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  );

  -- Process Parameters table (real-time sensor readings)
  CREATE TABLE IF NOT EXISTS process_parameters (
    id TEXT PRIMARY KEY,
    process_unit_id TEXT REFERENCES process_units(id),
    device_id TEXT REFERENCES devices(id),
    timestamp TEXT DEFAULT (datetime('now')),

    -- Process variables (PV)
    temperature REAL,
    temperature_unit TEXT DEFAULT 'C',
    pressure REAL,
    pressure_unit TEXT DEFAULT 'bar',
    flow_rate REAL,
    flow_unit TEXT DEFAULT 'm3/h',
    level REAL,
    level_unit TEXT DEFAULT '%',

    -- Quality variables
    concentration REAL,
    ph REAL,
    viscosity REAL,
    density REAL,

    -- Energy
    power_consumption REAL,
    steam_consumption REAL,
    cooling_water_flow REAL,

    -- Control outputs (MV - Manipulated Variables)
    valve_position REAL,
    pump_speed REAL,
    heater_duty REAL,

    -- Setpoints (SP)
    setpoint_temperature REAL,
    setpoint_pressure REAL,
    setpoint_flow REAL,
    setpoint_level REAL,

    -- Control loop status
    control_mode TEXT CHECK(control_mode IN ('auto', 'manual', 'cascade', 'ratio')) DEFAULT 'auto',
    controller_output REAL,

    created_at TEXT DEFAULT (datetime('now'))
  );

  -- Setpoint Configurations table (optimal setpoints per product/recipe)
  CREATE TABLE IF NOT EXISTS setpoint_configurations (
    id TEXT PRIMARY KEY,
    process_unit_id TEXT REFERENCES process_units(id),
    name TEXT NOT NULL,
    product_code TEXT,
    recipe_id TEXT,

    -- Optimal setpoints
    temperature_sp REAL,
    pressure_sp REAL,
    flow_sp REAL,
    level_sp REAL,

    -- Constraints
    temperature_min REAL,
    temperature_max REAL,
    pressure_min REAL,
    pressure_max REAL,
    flow_min REAL,
    flow_max REAL,

    -- Performance targets
    target_yield REAL,
    target_quality REAL,
    target_energy_consumption REAL,

    -- Optimization weights
    weight_quality REAL DEFAULT 0.4,
    weight_energy REAL DEFAULT 0.3,
    weight_throughput REAL DEFAULT 0.3,

    is_active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  );

  -- OEE Records table (Overall Equipment Effectiveness)
  CREATE TABLE IF NOT EXISTS oee_records (
    id TEXT PRIMARY KEY,
    process_unit_id TEXT REFERENCES process_units(id),
    shift_date TEXT NOT NULL,
    shift_number INTEGER DEFAULT 1,

    -- Availability
    planned_production_time REAL,
    actual_run_time REAL,
    downtime_minutes REAL,
    availability_rate REAL,

    -- Performance
    ideal_cycle_time REAL,
    actual_cycle_time REAL,
    total_units_produced INTEGER,
    performance_rate REAL,

    -- Quality
    good_units INTEGER,
    defective_units INTEGER,
    quality_rate REAL,

    -- OEE calculation
    oee_score REAL,

    -- Downtime breakdown
    downtime_planned REAL DEFAULT 0,
    downtime_unplanned REAL DEFAULT 0,
    downtime_changeover REAL DEFAULT 0,
    downtime_maintenance REAL DEFAULT 0,

    -- Energy metrics
    energy_consumed REAL,
    energy_per_unit REAL,

    notes TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );

  -- Process Optimization Runs table (RL training/inference)
  CREATE TABLE IF NOT EXISTS optimization_runs (
    id TEXT PRIMARY KEY,
    process_unit_id TEXT REFERENCES process_units(id),
    model_id TEXT REFERENCES models(id),

    run_type TEXT CHECK(run_type IN ('training', 'inference', 'simulation')) DEFAULT 'inference',
    status TEXT CHECK(status IN ('pending', 'running', 'completed', 'failed')) DEFAULT 'pending',

    -- Optimization objectives
    objective TEXT CHECK(objective IN ('maximize_yield', 'minimize_energy', 'maximize_oee', 'minimize_cost', 'multi_objective')) DEFAULT 'multi_objective',

    -- Initial state
    initial_parameters TEXT DEFAULT '{}',

    -- Recommended actions
    recommended_setpoints TEXT DEFAULT '{}',

    -- Results
    predicted_improvement REAL,
    actual_improvement REAL,
    confidence_score REAL,

    -- RL metrics
    reward_achieved REAL,
    episodes_completed INTEGER,

    started_at TEXT,
    completed_at TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );

  -- Digital Twin Simulations table
  CREATE TABLE IF NOT EXISTS digital_twin_simulations (
    id TEXT PRIMARY KEY,
    process_unit_id TEXT REFERENCES process_units(id),

    simulation_type TEXT CHECK(simulation_type IN ('what_if', 'optimization', 'failure_prediction', 'capacity_planning')) DEFAULT 'what_if',
    status TEXT CHECK(status IN ('pending', 'running', 'completed', 'failed')) DEFAULT 'pending',

    -- Input scenario
    input_parameters TEXT DEFAULT '{}',

    -- Simulation results
    output_predictions TEXT DEFAULT '{}',

    -- KPIs predicted
    predicted_throughput REAL,
    predicted_quality REAL,
    predicted_energy REAL,
    predicted_cost REAL,

    simulation_duration_ms INTEGER,

    created_by TEXT REFERENCES users(id),
    created_at TEXT DEFAULT (datetime('now'))
  );

  -- Cost Tracking table
  CREATE TABLE IF NOT EXISTS production_costs (
    id TEXT PRIMARY KEY,
    process_unit_id TEXT REFERENCES process_units(id),
    date TEXT NOT NULL,

    -- Energy costs
    electricity_kwh REAL,
    electricity_cost REAL,
    steam_kg REAL,
    steam_cost REAL,
    natural_gas_m3 REAL,
    gas_cost REAL,
    cooling_water_m3 REAL,
    water_cost REAL,

    -- Material costs
    raw_material_cost REAL,
    catalyst_cost REAL,

    -- Production output
    production_quantity REAL,
    production_unit TEXT DEFAULT 'kg',

    -- Calculated metrics
    cost_per_unit REAL,
    energy_per_unit REAL,

    created_at TEXT DEFAULT (datetime('now'))
  );

  -- Create indexes
  CREATE INDEX IF NOT EXISTS idx_process_params_unit ON process_parameters(process_unit_id);
  CREATE INDEX IF NOT EXISTS idx_process_params_timestamp ON process_parameters(timestamp);
  CREATE INDEX IF NOT EXISTS idx_oee_unit_date ON oee_records(process_unit_id, shift_date);
  CREATE INDEX IF NOT EXISTS idx_optimization_runs_unit ON optimization_runs(process_unit_id);
  CREATE INDEX IF NOT EXISTS idx_production_costs_unit_date ON production_costs(process_unit_id, date);
`);

console.log('Process optimization tables created successfully.');

// Insert sample process unit
const { v4: uuidv4 } = await import('uuid');

const unitExists = db.prepare('SELECT id FROM process_units LIMIT 1').get();
if (!unitExists) {
  const facility = db.prepare('SELECT id FROM facilities LIMIT 1').get();
  if (facility) {
    const unitId = uuidv4();
    db.prepare(`
      INSERT INTO process_units (id, facility_id, name, unit_type, description, design_capacity, operating_mode)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      unitId,
      facility.id,
      'Reactor R-101',
      'reactor',
      'Primary production reactor with temperature and pressure control',
      1000,
      'continuous'
    );

    // Insert sample setpoint configuration
    db.prepare(`
      INSERT INTO setpoint_configurations (id, process_unit_id, name, product_code, temperature_sp, pressure_sp, flow_sp, temperature_min, temperature_max, pressure_min, pressure_max)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      uuidv4(),
      unitId,
      'Standard Operation',
      'PROD-001',
      180,  // 180°C
      5.0,  // 5 bar
      50,   // 50 m3/h
      150,  // min temp
      200,  // max temp
      3.0,  // min pressure
      8.0   // max pressure
    );

    console.log('Sample process unit and configuration created');
  }
}

console.log('Process optimization migration complete!');
db.close();
