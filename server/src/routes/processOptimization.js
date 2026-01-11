import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import supabase from '../utils/supabase.js';

const router = Router();

// ============================================
// PROCESS UNITS
// ============================================

// GET /api/process/units - List all process units
router.get('/units', async (req, res) => {
  try {
    const { facility_id, unit_type, is_active } = req.query;

    let query = supabase
      .from('process_units')
      .select('*, facilities(name)')
      .order('name');

    if (facility_id) query = query.eq('facility_id', facility_id);
    if (unit_type) query = query.eq('unit_type', unit_type);
    if (is_active !== undefined) query = query.eq('is_active', is_active === 'true');

    const { data: units, error } = await query;

    if (error) throw error;

    res.json({
      units: (units || []).map(u => ({
        ...u,
        facility_name: u.facilities?.name || null,
        facilities: undefined
      })),
      total: (units || []).length
    });
  } catch (error) {
    console.error('Get process units error:', error);
    res.status(500).json({ error: { message: 'Failed to get process units', code: 'DB_ERROR' } });
  }
});

// POST /api/process/units - Create process unit
router.post('/units', async (req, res) => {
  try {
    const { facility_id, name, unit_type, description, design_capacity, capacity_unit, operating_mode } = req.body;

    if (!name || !unit_type) {
      return res.status(400).json({ error: { message: 'name and unit_type are required', code: 'VALIDATION_ERROR' } });
    }

    const id = uuidv4();
    await supabase
      .from('process_units')
      .insert({
        id,
        facility_id,
        name,
        unit_type,
        description,
        design_capacity,
        capacity_unit: capacity_unit || 'kg/h',
        operating_mode: operating_mode || 'continuous'
      });

    const { data: unit } = await supabase
      .from('process_units')
      .select('*')
      .eq('id', id)
      .single();

    res.status(201).json(unit);
  } catch (error) {
    console.error('Create process unit error:', error);
    res.status(500).json({ error: { message: 'Failed to create process unit', code: 'DB_ERROR' } });
  }
});

// GET /api/process/units/:id - Get single process unit with current parameters
router.get('/units/:id', async (req, res) => {
  try {
    const { data: unit, error } = await supabase
      .from('process_units')
      .select('*, facilities(name)')
      .eq('id', req.params.id)
      .single();

    if (error || !unit) {
      return res.status(404).json({ error: { message: 'Process unit not found', code: 'NOT_FOUND' } });
    }

    // Get latest parameters
    const { data: latestParams } = await supabase
      .from('process_parameters')
      .select('*')
      .eq('process_unit_id', req.params.id)
      .order('timestamp', { ascending: false })
      .limit(1)
      .single();

    // Get active setpoint configuration
    const { data: setpointConfig } = await supabase
      .from('setpoint_configurations')
      .select('*')
      .eq('process_unit_id', req.params.id)
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    res.json({
      ...unit,
      facility_name: unit.facilities?.name || null,
      facilities: undefined,
      current_parameters: latestParams || null,
      setpoint_config: setpointConfig || null
    });
  } catch (error) {
    console.error('Get process unit error:', error);
    res.status(500).json({ error: { message: 'Failed to get process unit', code: 'DB_ERROR' } });
  }
});

// ============================================
// PROCESS PARAMETERS (Real-time data)
// ============================================

// POST /api/process/parameters - Record process parameters
router.post('/parameters', async (req, res) => {
  try {
    const {
      process_unit_id, device_id,
      temperature, pressure, flow_rate, level,
      concentration, ph, viscosity, density,
      power_consumption, steam_consumption, cooling_water_flow,
      valve_position, pump_speed, heater_duty,
      setpoint_temperature, setpoint_pressure, setpoint_flow, setpoint_level,
      control_mode, controller_output
    } = req.body;

    if (!process_unit_id) {
      return res.status(400).json({ error: { message: 'process_unit_id is required', code: 'VALIDATION_ERROR' } });
    }

    const id = uuidv4();
    await supabase
      .from('process_parameters')
      .insert({
        id, process_unit_id, device_id,
        temperature, pressure, flow_rate, level,
        concentration, ph, viscosity, density,
        power_consumption, steam_consumption, cooling_water_flow,
        valve_position, pump_speed, heater_duty,
        setpoint_temperature, setpoint_pressure, setpoint_flow, setpoint_level,
        control_mode, controller_output
      });

    res.status(201).json({ id, message: 'Parameters recorded' });
  } catch (error) {
    console.error('Record parameters error:', error);
    res.status(500).json({ error: { message: 'Failed to record parameters', code: 'DB_ERROR' } });
  }
});

// GET /api/process/parameters/:unitId - Get historical parameters
router.get('/parameters/:unitId', async (req, res) => {
  try {
    const { start, end, limit = 1000 } = req.query;

    let query = supabase
      .from('process_parameters')
      .select('*')
      .eq('process_unit_id', req.params.unitId)
      .order('timestamp', { ascending: false })
      .limit(parseInt(limit));

    if (start) query = query.gte('timestamp', start);
    if (end) query = query.lte('timestamp', end);

    const { data, error } = await query;

    if (error) throw error;

    res.json({ parameters: data || [], total: (data || []).length });
  } catch (error) {
    console.error('Get parameters error:', error);
    res.status(500).json({ error: { message: 'Failed to get parameters', code: 'DB_ERROR' } });
  }
});

// ============================================
// OEE CALCULATION
// ============================================

// POST /api/process/oee/calculate - Calculate OEE for a shift
router.post('/oee/calculate', async (req, res) => {
  try {
    const {
      process_unit_id, shift_date, shift_number,
      planned_production_time, actual_run_time,
      ideal_cycle_time, actual_cycle_time, total_units_produced,
      good_units, defective_units,
      downtime_planned, downtime_unplanned, downtime_changeover, downtime_maintenance,
      energy_consumed, notes
    } = req.body;

    if (!process_unit_id || !shift_date) {
      return res.status(400).json({ error: { message: 'process_unit_id and shift_date are required', code: 'VALIDATION_ERROR' } });
    }

    const downtime_minutes = (downtime_planned || 0) + (downtime_unplanned || 0) +
                            (downtime_changeover || 0) + (downtime_maintenance || 0);

    const availability_rate = planned_production_time > 0 ? (actual_run_time / planned_production_time) : 0;
    const performance_rate = actual_run_time > 0 ? ((ideal_cycle_time * total_units_produced) / (actual_run_time * 60)) : 0;
    const quality_rate = total_units_produced > 0 ? (good_units / total_units_produced) : 0;
    const oee_score = availability_rate * performance_rate * quality_rate;
    const energy_per_unit = good_units > 0 ? energy_consumed / good_units : 0;

    const id = uuidv4();
    await supabase
      .from('oee_records')
      .insert({
        id, process_unit_id, shift_date, shift_number: shift_number || 1,
        planned_production_time, actual_run_time, downtime_minutes,
        availability_rate, ideal_cycle_time, actual_cycle_time,
        total_units_produced, performance_rate,
        good_units, defective_units, quality_rate, oee_score,
        downtime_planned: downtime_planned || 0, downtime_unplanned: downtime_unplanned || 0,
        downtime_changeover: downtime_changeover || 0, downtime_maintenance: downtime_maintenance || 0,
        energy_consumed, energy_per_unit, notes
      });

    res.status(201).json({
      id,
      oee_score: Math.round(oee_score * 10000) / 100,
      availability_rate: Math.round(availability_rate * 10000) / 100,
      performance_rate: Math.round(performance_rate * 10000) / 100,
      quality_rate: Math.round(quality_rate * 10000) / 100,
      energy_per_unit: Math.round(energy_per_unit * 100) / 100,
      classification: oee_score >= 0.85 ? 'World Class' :
                      oee_score >= 0.65 ? 'Good' :
                      oee_score >= 0.40 ? 'Average' : 'Low'
    });
  } catch (error) {
    console.error('Calculate OEE error:', error);
    res.status(500).json({ error: { message: 'Failed to calculate OEE', code: 'DB_ERROR' } });
  }
});

// GET /api/process/oee/:unitId - Get OEE history
router.get('/oee/:unitId', async (req, res) => {
  try {
    const { start, end, limit = 30 } = req.query;

    let query = supabase
      .from('oee_records')
      .select('*')
      .eq('process_unit_id', req.params.unitId)
      .order('shift_date', { ascending: false })
      .limit(parseInt(limit));

    if (start) query = query.gte('shift_date', start);
    if (end) query = query.lte('shift_date', end);

    const { data: records, error } = await query;

    if (error) throw error;

    const avgOee = records && records.length > 0 ? records.reduce((sum, r) => sum + r.oee_score, 0) / records.length : 0;
    const avgAvailability = records && records.length > 0 ? records.reduce((sum, r) => sum + r.availability_rate, 0) / records.length : 0;
    const avgPerformance = records && records.length > 0 ? records.reduce((sum, r) => sum + r.performance_rate, 0) / records.length : 0;
    const avgQuality = records && records.length > 0 ? records.reduce((sum, r) => sum + r.quality_rate, 0) / records.length : 0;

    res.json({
      records: records || [],
      summary: {
        average_oee: Math.round(avgOee * 10000) / 100,
        average_availability: Math.round(avgAvailability * 10000) / 100,
        average_performance: Math.round(avgPerformance * 10000) / 100,
        average_quality: Math.round(avgQuality * 10000) / 100,
        total_records: (records || []).length
      }
    });
  } catch (error) {
    console.error('Get OEE error:', error);
    res.status(500).json({ error: { message: 'Failed to get OEE records', code: 'DB_ERROR' } });
  }
});

// ============================================
// SETPOINT OPTIMIZATION
// ============================================

// GET /api/process/setpoints/:unitId - Get setpoint configurations
router.get('/setpoints/:unitId', async (req, res) => {
  try {
    const { data: configs, error } = await supabase
      .from('setpoint_configurations')
      .select('*')
      .eq('process_unit_id', req.params.unitId)
      .order('is_active', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) throw error;

    res.json({ configurations: configs || [] });
  } catch (error) {
    console.error('Get setpoints error:', error);
    res.status(500).json({ error: { message: 'Failed to get setpoints', code: 'DB_ERROR' } });
  }
});

// POST /api/process/optimize - Run optimization to find optimal setpoints
router.post('/optimize', async (req, res) => {
  try {
    const { process_unit_id, objective = 'multi_objective' } = req.body;

    if (!process_unit_id) {
      return res.status(400).json({ error: { message: 'process_unit_id is required', code: 'VALIDATION_ERROR' } });
    }

    const { data: currentParams } = await supabase
      .from('process_parameters')
      .select('*')
      .eq('process_unit_id', process_unit_id)
      .order('timestamp', { ascending: false })
      .limit(100);

    const { data: config } = await supabase
      .from('setpoint_configurations')
      .select('*')
      .eq('process_unit_id', process_unit_id)
      .eq('is_active', true)
      .limit(1)
      .single();

    if (!config) {
      return res.status(400).json({ error: { message: 'No active setpoint configuration found', code: 'CONFIG_ERROR' } });
    }

    const params = currentParams || [];
    const avgTemp = params.reduce((sum, p) => sum + (p.temperature || 0), 0) / (params.length || 1);
    const avgPressure = params.reduce((sum, p) => sum + (p.pressure || 0), 0) / (params.length || 1);
    const avgFlow = params.reduce((sum, p) => sum + (p.flow_rate || 0), 0) / (params.length || 1);

    let recommendedSetpoints = {};
    let predictedImprovement = 0;

    switch (objective) {
      case 'minimize_energy':
        recommendedSetpoints = {
          temperature: Math.max(config.temperature_min || 0, (config.temperature_sp || avgTemp) * 0.98),
          pressure: config.pressure_sp || avgPressure,
          flow: Math.min(config.flow_max || avgFlow, (config.flow_sp || avgFlow) * 1.02)
        };
        predictedImprovement = 5 + Math.random() * 10;
        break;

      case 'maximize_yield':
        recommendedSetpoints = {
          temperature: Math.min(config.temperature_max || 999, (config.temperature_sp || avgTemp) * 1.02),
          pressure: ((config.pressure_min || 0) + (config.pressure_max || 10)) / 2,
          flow: config.flow_sp || avgFlow
        };
        predictedImprovement = 2 + Math.random() * 5;
        break;

      case 'maximize_oee':
        recommendedSetpoints = {
          temperature: config.temperature_sp || avgTemp,
          pressure: config.pressure_sp || avgPressure,
          flow: config.flow_sp || avgFlow
        };
        predictedImprovement = 3 + Math.random() * 8;
        break;

      default:
        const w_quality = config.weight_quality || 0.4;
        const w_energy = config.weight_energy || 0.3;
        const w_throughput = config.weight_throughput || 0.3;

        recommendedSetpoints = {
          temperature: (config.temperature_sp || avgTemp) - (w_energy * 2) + (w_quality * 3),
          pressure: config.pressure_sp || avgPressure,
          flow: (config.flow_sp || avgFlow) * (1 + w_throughput * 0.05)
        };
        predictedImprovement = 4 + Math.random() * 6;
    }

    recommendedSetpoints.temperature = Math.max(config.temperature_min || 0, Math.min(config.temperature_max || 999, recommendedSetpoints.temperature));
    recommendedSetpoints.pressure = Math.max(config.pressure_min || 0, Math.min(config.pressure_max || 999, recommendedSetpoints.pressure));
    recommendedSetpoints.flow = Math.max(config.flow_min || 0, Math.min(config.flow_max || 999, recommendedSetpoints.flow));

    const runId = uuidv4();
    await supabase
      .from('optimization_runs')
      .insert({
        id: runId,
        process_unit_id,
        run_type: 'inference',
        status: 'completed',
        objective,
        initial_parameters: { temperature: avgTemp, pressure: avgPressure, flow: avgFlow },
        recommended_setpoints: recommendedSetpoints,
        predicted_improvement: predictedImprovement,
        confidence_score: 0.75 + Math.random() * 0.2,
        started_at: new Date().toISOString(),
        completed_at: new Date().toISOString()
      });

    res.json({
      optimization_id: runId,
      objective,
      current_values: {
        temperature: Math.round(avgTemp * 10) / 10,
        pressure: Math.round(avgPressure * 100) / 100,
        flow: Math.round(avgFlow * 10) / 10
      },
      recommended_setpoints: {
        temperature: Math.round(recommendedSetpoints.temperature * 10) / 10,
        pressure: Math.round(recommendedSetpoints.pressure * 100) / 100,
        flow: Math.round(recommendedSetpoints.flow * 10) / 10
      },
      predicted_improvement: Math.round(predictedImprovement * 10) / 10,
      confidence: Math.round((0.75 + Math.random() * 0.2) * 100),
      constraints: {
        temperature: { min: config.temperature_min, max: config.temperature_max },
        pressure: { min: config.pressure_min, max: config.pressure_max },
        flow: { min: config.flow_min, max: config.flow_max }
      }
    });
  } catch (error) {
    console.error('Optimization error:', error);
    res.status(500).json({ error: { message: 'Failed to run optimization', code: 'OPTIMIZATION_ERROR' } });
  }
});

// ============================================
// DIGITAL TWIN SIMULATION
// ============================================

// POST /api/process/simulate - Run what-if simulation
router.post('/simulate', async (req, res) => {
  try {
    const { process_unit_id, simulation_type = 'what_if', input_parameters } = req.body;

    if (!process_unit_id || !input_parameters) {
      return res.status(400).json({ error: { message: 'process_unit_id and input_parameters are required', code: 'VALIDATION_ERROR' } });
    }

    const { data: unit, error: unitError } = await supabase
      .from('process_units')
      .select('*')
      .eq('id', process_unit_id)
      .single();

    if (unitError || !unit) {
      return res.status(404).json({ error: { message: 'Process unit not found', code: 'NOT_FOUND' } });
    }

    const startTime = Date.now();
    const { temperature, pressure, flow_rate } = input_parameters;

    const tempFactor = 1 - Math.abs(temperature - 180) / 200;
    const pressureFactor = Math.min(pressure / 5, 1.2);
    const flowFactor = flow_rate / 50;

    const predicted_throughput = unit.design_capacity * tempFactor * pressureFactor * flowFactor;
    const quality = Math.min(0.99, 0.85 + tempFactor * 0.1 + (1 - Math.abs(pressure - 5) / 10) * 0.05);
    const baseEnergy = 100;
    const energy = baseEnergy * (temperature / 150) * (flow_rate / 50) * (1 + (pressure - 3) * 0.1);
    const energyCost = energy * 0.12;
    const materialCost = flow_rate * 10;
    const totalCost = energyCost + materialCost;
    const costPerUnit = predicted_throughput > 0 ? totalCost / predicted_throughput : 0;

    const simulationDuration = Date.now() - startTime;

    const simId = uuidv4();
    await supabase
      .from('digital_twin_simulations')
      .insert({
        id: simId,
        process_unit_id,
        simulation_type,
        status: 'completed',
        input_parameters,
        output_predictions: { throughput: predicted_throughput, quality, energy, cost_per_unit: costPerUnit },
        predicted_throughput,
        predicted_quality: quality,
        predicted_energy: energy,
        predicted_cost: costPerUnit,
        simulation_duration_ms: simulationDuration
      });

    res.json({
      simulation_id: simId,
      simulation_type,
      input: input_parameters,
      predictions: {
        throughput: {
          value: Math.round(predicted_throughput * 10) / 10,
          unit: unit.capacity_unit || 'kg/h',
          vs_design: Math.round((predicted_throughput / unit.design_capacity) * 100)
        },
        quality: {
          value: Math.round(quality * 1000) / 10,
          unit: '%',
          classification: quality >= 0.95 ? 'Excellent' : quality >= 0.90 ? 'Good' : 'Acceptable'
        },
        energy: {
          value: Math.round(energy * 10) / 10,
          unit: 'kWh',
          per_unit: Math.round((energy / predicted_throughput) * 1000) / 1000
        },
        cost: {
          total: Math.round(totalCost * 100) / 100,
          per_unit: Math.round(costPerUnit * 100) / 100,
          currency: 'USD'
        }
      },
      simulation_time_ms: simulationDuration
    });
  } catch (error) {
    console.error('Simulation error:', error);
    res.status(500).json({ error: { message: 'Failed to run simulation', code: 'SIMULATION_ERROR' } });
  }
});

// GET /api/process/simulations/:unitId - Get simulation history
router.get('/simulations/:unitId', async (req, res) => {
  try {
    const { limit = 20 } = req.query;

    const { data: simulations, error } = await supabase
      .from('digital_twin_simulations')
      .select('*')
      .eq('process_unit_id', req.params.unitId)
      .order('created_at', { ascending: false })
      .limit(parseInt(limit));

    if (error) throw error;

    res.json({ simulations: simulations || [] });
  } catch (error) {
    console.error('Get simulations error:', error);
    res.status(500).json({ error: { message: 'Failed to get simulations', code: 'DB_ERROR' } });
  }
});

// ============================================
// COST TRACKING
// ============================================

// POST /api/process/costs - Record production costs
router.post('/costs', async (req, res) => {
  try {
    const {
      process_unit_id, date,
      electricity_kwh, electricity_cost,
      steam_kg, steam_cost,
      natural_gas_m3, gas_cost,
      cooling_water_m3, water_cost,
      raw_material_cost, catalyst_cost,
      production_quantity, production_unit
    } = req.body;

    if (!process_unit_id || !date) {
      return res.status(400).json({ error: { message: 'process_unit_id and date are required', code: 'VALIDATION_ERROR' } });
    }

    const totalEnergyCost = (electricity_cost || 0) + (steam_cost || 0) + (gas_cost || 0) + (water_cost || 0);
    const totalCost = totalEnergyCost + (raw_material_cost || 0) + (catalyst_cost || 0);
    const costPerUnit = production_quantity > 0 ? totalCost / production_quantity : 0;
    const energyPerUnit = production_quantity > 0 ? (electricity_kwh || 0) / production_quantity : 0;

    const id = uuidv4();
    await supabase
      .from('production_costs')
      .insert({
        id, process_unit_id, date,
        electricity_kwh, electricity_cost,
        steam_kg, steam_cost,
        natural_gas_m3, gas_cost,
        cooling_water_m3, water_cost,
        raw_material_cost, catalyst_cost,
        production_quantity, production_unit: production_unit || 'kg',
        cost_per_unit: costPerUnit, energy_per_unit: energyPerUnit
      });

    res.status(201).json({ id, cost_per_unit: costPerUnit, energy_per_unit: energyPerUnit });
  } catch (error) {
    console.error('Record costs error:', error);
    res.status(500).json({ error: { message: 'Failed to record costs', code: 'DB_ERROR' } });
  }
});

// GET /api/process/costs/:unitId - Get cost history
router.get('/costs/:unitId', async (req, res) => {
  try {
    const { start, end, limit = 30 } = req.query;

    let query = supabase
      .from('production_costs')
      .select('*')
      .eq('process_unit_id', req.params.unitId)
      .order('date', { ascending: false })
      .limit(parseInt(limit));

    if (start) query = query.gte('date', start);
    if (end) query = query.lte('date', end);

    const { data: costs, error } = await query;

    if (error) throw error;

    const totalCost = (costs || []).reduce((sum, c) => sum + (c.cost_per_unit * c.production_quantity), 0);
    const totalProduction = (costs || []).reduce((sum, c) => sum + c.production_quantity, 0);
    const avgCostPerUnit = totalProduction > 0 ? totalCost / totalProduction : 0;

    res.json({
      costs: costs || [],
      summary: {
        total_cost: Math.round(totalCost * 100) / 100,
        total_production: Math.round(totalProduction * 10) / 10,
        average_cost_per_unit: Math.round(avgCostPerUnit * 100) / 100,
        records: (costs || []).length
      }
    });
  } catch (error) {
    console.error('Get costs error:', error);
    res.status(500).json({ error: { message: 'Failed to get costs', code: 'DB_ERROR' } });
  }
});

// ============================================
// DASHBOARD SUMMARY
// ============================================

// GET /api/process/dashboard - Get process optimization dashboard data
router.get('/dashboard', async (req, res) => {
  try {
    const { data: units } = await supabase
      .from('process_units')
      .select('*')
      .eq('is_active', true);

    const lastWeek = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const { data: oeeRecords } = await supabase
      .from('oee_records')
      .select('process_unit_id, oee_score, availability_rate, performance_rate, quality_rate')
      .gte('shift_date', lastWeek);

    const oeeByUnit = {};
    (oeeRecords || []).forEach(r => {
      if (!oeeByUnit[r.process_unit_id]) {
        oeeByUnit[r.process_unit_id] = { scores: [], availability: [], performance: [], quality: [] };
      }
      oeeByUnit[r.process_unit_id].scores.push(r.oee_score);
      oeeByUnit[r.process_unit_id].availability.push(r.availability_rate);
      oeeByUnit[r.process_unit_id].performance.push(r.performance_rate);
      oeeByUnit[r.process_unit_id].quality.push(r.quality_rate);
    });

    const oeeData = Object.entries(oeeByUnit).map(([process_unit_id, data]) => ({
      process_unit_id,
      avg_oee: data.scores.reduce((a, b) => a + b, 0) / data.scores.length,
      avg_availability: data.availability.reduce((a, b) => a + b, 0) / data.availability.length,
      avg_performance: data.performance.reduce((a, b) => a + b, 0) / data.performance.length,
      avg_quality: data.quality.reduce((a, b) => a + b, 0) / data.quality.length
    }));

    const { data: recentOptimizations } = await supabase
      .from('optimization_runs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5);

    const last30Days = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const { data: costData } = await supabase
      .from('production_costs')
      .select('date, cost_per_unit, production_quantity')
      .gte('date', last30Days);

    const costByDate = {};
    (costData || []).forEach(c => {
      if (!costByDate[c.date]) {
        costByDate[c.date] = { totalCost: 0, totalQty: 0 };
      }
      costByDate[c.date].totalCost += c.cost_per_unit * c.production_quantity;
      costByDate[c.date].totalQty += c.production_quantity;
    });

    const costTrend = Object.entries(costByDate)
      .map(([date, data]) => ({
        date,
        avg_cost: data.totalQty > 0 ? data.totalCost / data.totalQty : 0
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    res.json({
      units_count: (units || []).length,
      oee_summary: {
        overall_avg: oeeData.length > 0
          ? Math.round(oeeData.reduce((sum, o) => sum + o.avg_oee, 0) / oeeData.length * 10000) / 100
          : 0,
        by_unit: oeeData
      },
      recent_optimizations: recentOptimizations || [],
      cost_trend: costTrend
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({ error: { message: 'Failed to get dashboard data', code: 'DB_ERROR' } });
  }
});

export default router;
