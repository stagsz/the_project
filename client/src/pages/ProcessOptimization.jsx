import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  Factory,
  Gauge,
  TrendingUp,
  Zap,
  Target,
  Play,
  Settings,
  Thermometer,
  Droplets,
  Wind,
  DollarSign,
  BarChart3,
  RefreshCw,
  ChevronRight,
  AlertTriangle,
  CheckCircle
} from 'lucide-react'
import Modal from '../components/Modal'

export default function ProcessOptimization() {
  const [units, setUnits] = useState([])
  const [selectedUnit, setSelectedUnit] = useState(null)
  const [oeeData, setOeeData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [optimizing, setOptimizing] = useState(false)
  const [simulating, setSimulating] = useState(false)
  const [optimizationResult, setOptimizationResult] = useState(null)
  const [simulationResult, setSimulationResult] = useState(null)
  const [showOptimizeModal, setShowOptimizeModal] = useState(false)
  const [showSimulateModal, setShowSimulateModal] = useState(false)
  const [simulationParams, setSimulationParams] = useState({
    temperature: 180,
    pressure: 5,
    flow_rate: 50
  })
  const [optimizationObjective, setOptimizationObjective] = useState('multi_objective')

  useEffect(() => {
    fetchUnits()
  }, [])

  useEffect(() => {
    if (selectedUnit) {
      fetchOeeData(selectedUnit.id)
    }
  }, [selectedUnit])

  async function fetchUnits() {
    try {
      const res = await fetch('/api/process/units')
      const data = await res.json()
      setUnits(data.units || [])
      if (data.units?.length > 0) {
        setSelectedUnit(data.units[0])
      }
    } catch (error) {
      console.error('Failed to fetch units:', error)
    } finally {
      setLoading(false)
    }
  }

  async function fetchOeeData(unitId) {
    try {
      const res = await fetch(`/api/process/oee/${unitId}?limit=7`)
      const data = await res.json()
      setOeeData(data)
    } catch (error) {
      console.error('Failed to fetch OEE:', error)
    }
  }

  async function runOptimization() {
    if (!selectedUnit) return
    setOptimizing(true)
    setOptimizationResult(null)

    try {
      const res = await fetch('/api/process/optimize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          process_unit_id: selectedUnit.id,
          objective: optimizationObjective
        })
      })
      const data = await res.json()
      setOptimizationResult(data)
    } catch (error) {
      console.error('Optimization failed:', error)
    } finally {
      setOptimizing(false)
    }
  }

  async function runSimulation() {
    if (!selectedUnit) return
    setSimulating(true)
    setSimulationResult(null)

    try {
      const res = await fetch('/api/process/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          process_unit_id: selectedUnit.id,
          simulation_type: 'what_if',
          input_parameters: simulationParams
        })
      })
      const data = await res.json()
      setSimulationResult(data)
    } catch (error) {
      console.error('Simulation failed:', error)
    } finally {
      setSimulating(false)
    }
  }

  const oeeClassification = (score) => {
    if (score >= 85) return { label: 'World Class', color: 'text-emerald-600', bg: 'bg-emerald-100 dark:bg-emerald-900/50' }
    if (score >= 65) return { label: 'Good', color: 'text-blue-600', bg: 'bg-blue-100 dark:bg-blue-900/50' }
    if (score >= 40) return { label: 'Average', color: 'text-amber-600', bg: 'bg-amber-100 dark:bg-amber-900/50' }
    return { label: 'Low', color: 'text-rose-600', bg: 'bg-rose-100 dark:bg-rose-900/50' }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Process Optimization</h1>
          <p className="text-gray-500 dark:text-gray-400">Optimize production line performance and efficiency</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setShowSimulateModal(true)}
            disabled={!selectedUnit}
            className="btn-secondary"
          >
            <Play className="w-4 h-4 mr-2" />
            Simulate
          </button>
          <button
            onClick={() => setShowOptimizeModal(true)}
            disabled={!selectedUnit}
            className="btn-primary"
          >
            <Target className="w-4 h-4 mr-2" />
            Optimize
          </button>
        </div>
      </div>

      {/* Unit Selector */}
      {units.length > 0 && (
        <div className="card p-4">
          <div className="flex items-center gap-4">
            <Factory className="w-5 h-5 text-gray-500" />
            <select
              value={selectedUnit?.id || ''}
              onChange={(e) => setSelectedUnit(units.find(u => u.id === e.target.value))}
              className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {units.map(unit => (
                <option key={unit.id} value={unit.id}>
                  {unit.name} - {unit.unit_type.replace('_', ' ')}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* OEE Overview */}
      {oeeData && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="card p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">OEE Score</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white">
                  {oeeData.summary?.average_oee?.toFixed(1) || 0}%
                </p>
              </div>
              <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${oeeClassification(oeeData.summary?.average_oee || 0).bg}`}>
                <Gauge className={`w-6 h-6 ${oeeClassification(oeeData.summary?.average_oee || 0).color}`} />
              </div>
            </div>
            <p className={`mt-2 text-sm font-medium ${oeeClassification(oeeData.summary?.average_oee || 0).color}`}>
              {oeeClassification(oeeData.summary?.average_oee || 0).label}
            </p>
          </div>

          <div className="card p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Availability</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white">
                  {oeeData.summary?.average_availability?.toFixed(1) || 0}%
                </p>
              </div>
              <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/50 rounded-lg flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
            <p className="mt-2 text-sm text-gray-500">Uptime vs planned</p>
          </div>

          <div className="card p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Performance</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white">
                  {oeeData.summary?.average_performance?.toFixed(1) || 0}%
                </p>
              </div>
              <div className="w-12 h-12 bg-violet-100 dark:bg-violet-900/50 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-violet-600 dark:text-violet-400" />
              </div>
            </div>
            <p className="mt-2 text-sm text-gray-500">Speed efficiency</p>
          </div>

          <div className="card p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Quality</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white">
                  {oeeData.summary?.average_quality?.toFixed(1) || 0}%
                </p>
              </div>
              <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-900/50 rounded-lg flex items-center justify-center">
                <Target className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
              </div>
            </div>
            <p className="mt-2 text-sm text-gray-500">Good units ratio</p>
          </div>
        </div>
      )}

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Process Parameters */}
        <div className="card p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/50 rounded-lg flex items-center justify-center">
              <Settings className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            Current Parameters
          </h2>

          {selectedUnit?.current_parameters ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div className="flex items-center gap-3">
                  <Thermometer className="w-5 h-5 text-rose-500" />
                  <span className="text-gray-700 dark:text-gray-300">Temperature</span>
                </div>
                <span className="font-mono font-medium text-gray-900 dark:text-white">
                  {selectedUnit.current_parameters.temperature?.toFixed(1) || '--'} °C
                </span>
              </div>

              <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div className="flex items-center gap-3">
                  <Gauge className="w-5 h-5 text-blue-500" />
                  <span className="text-gray-700 dark:text-gray-300">Pressure</span>
                </div>
                <span className="font-mono font-medium text-gray-900 dark:text-white">
                  {selectedUnit.current_parameters.pressure?.toFixed(2) || '--'} bar
                </span>
              </div>

              <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div className="flex items-center gap-3">
                  <Wind className="w-5 h-5 text-cyan-500" />
                  <span className="text-gray-700 dark:text-gray-300">Flow Rate</span>
                </div>
                <span className="font-mono font-medium text-gray-900 dark:text-white">
                  {selectedUnit.current_parameters.flow_rate?.toFixed(1) || '--'} m³/h
                </span>
              </div>

              <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div className="flex items-center gap-3">
                  <Zap className="w-5 h-5 text-amber-500" />
                  <span className="text-gray-700 dark:text-gray-300">Power</span>
                </div>
                <span className="font-mono font-medium text-gray-900 dark:text-white">
                  {selectedUnit.current_parameters.power_consumption?.toFixed(1) || '--'} kW
                </span>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <Settings className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No current parameter data available</p>
            </div>
          )}
        </div>

        {/* Setpoint Configuration */}
        <div className="card p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-100 dark:bg-emerald-900/50 rounded-lg flex items-center justify-center">
              <Target className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            Setpoint Configuration
          </h2>

          {selectedUnit?.setpoint_config ? (
            <div className="space-y-4">
              <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <p className="text-sm text-gray-500 mb-2">Active Configuration</p>
                <p className="font-medium text-gray-900 dark:text-white">{selectedUnit.setpoint_config.name}</p>
                {selectedUnit.setpoint_config.product_code && (
                  <p className="text-sm text-gray-500">Product: {selectedUnit.setpoint_config.product_code}</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-rose-50 dark:bg-rose-900/30 rounded-lg">
                  <p className="text-xs text-rose-600 dark:text-rose-400">Temperature SP</p>
                  <p className="font-mono font-medium text-rose-700 dark:text-rose-300">
                    {selectedUnit.setpoint_config.temperature_sp} °C
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Range: {selectedUnit.setpoint_config.temperature_min} - {selectedUnit.setpoint_config.temperature_max}
                  </p>
                </div>

                <div className="p-3 bg-blue-50 dark:bg-blue-900/30 rounded-lg">
                  <p className="text-xs text-blue-600 dark:text-blue-400">Pressure SP</p>
                  <p className="font-mono font-medium text-blue-700 dark:text-blue-300">
                    {selectedUnit.setpoint_config.pressure_sp} bar
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Range: {selectedUnit.setpoint_config.pressure_min} - {selectedUnit.setpoint_config.pressure_max}
                  </p>
                </div>

                <div className="p-3 bg-cyan-50 dark:bg-cyan-900/30 rounded-lg col-span-2">
                  <p className="text-xs text-cyan-600 dark:text-cyan-400">Flow SP</p>
                  <p className="font-mono font-medium text-cyan-700 dark:text-cyan-300">
                    {selectedUnit.setpoint_config.flow_sp} m³/h
                  </p>
                </div>
              </div>

              <div className="pt-3 border-t border-gray-200 dark:border-gray-700">
                <p className="text-sm text-gray-500 mb-2">Optimization Weights</p>
                <div className="flex gap-2">
                  <span className="px-2 py-1 text-xs bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-400 rounded">
                    Quality: {(selectedUnit.setpoint_config.weight_quality * 100).toFixed(0)}%
                  </span>
                  <span className="px-2 py-1 text-xs bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-400 rounded">
                    Energy: {(selectedUnit.setpoint_config.weight_energy * 100).toFixed(0)}%
                  </span>
                  <span className="px-2 py-1 text-xs bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-400 rounded">
                    Throughput: {(selectedUnit.setpoint_config.weight_throughput * 100).toFixed(0)}%
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <Target className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No setpoint configuration found</p>
              <button className="mt-3 btn-primary text-sm">
                Create Configuration
              </button>
            </div>
          )}
        </div>
      </div>

      {/* OEE History */}
      {oeeData?.records?.length > 0 && (
        <div className="card p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-3">
            <div className="w-10 h-10 bg-violet-100 dark:bg-violet-900/50 rounded-lg flex items-center justify-center">
              <BarChart3 className="w-5 h-5 text-violet-600 dark:text-violet-400" />
            </div>
            OEE History (Last 7 Days)
          </h2>

          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Shift</th>
                  <th>OEE</th>
                  <th>Availability</th>
                  <th>Performance</th>
                  <th>Quality</th>
                  <th>Units Produced</th>
                </tr>
              </thead>
              <tbody>
                {oeeData.records.map((record) => (
                  <tr key={record.id}>
                    <td className="font-medium">{record.shift_date}</td>
                    <td>Shift {record.shift_number}</td>
                    <td>
                      <span className={`font-medium ${oeeClassification(record.oee_score * 100).color}`}>
                        {(record.oee_score * 100).toFixed(1)}%
                      </span>
                    </td>
                    <td>{(record.availability_rate * 100).toFixed(1)}%</td>
                    <td>{(record.performance_rate * 100).toFixed(1)}%</td>
                    <td>{(record.quality_rate * 100).toFixed(1)}%</td>
                    <td>{record.good_units} / {record.total_units_produced}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Optimize Modal */}
      <Modal
        isOpen={showOptimizeModal}
        onClose={() => {
          setShowOptimizeModal(false)
          setOptimizationResult(null)
        }}
        title="Run Optimization"
        size="lg"
      >
        <div className="space-y-4">
          <div className="p-4 bg-blue-50 dark:bg-blue-900/30 rounded-lg">
            <div className="flex items-center gap-3">
              <Target className="w-6 h-6 text-blue-600" />
              <div>
                <p className="font-medium text-blue-900 dark:text-blue-300">AI-Powered Optimization</p>
                <p className="text-sm text-blue-700 dark:text-blue-400">
                  Find optimal setpoints based on current conditions and objectives
                </p>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Optimization Objective
            </label>
            <select
              value={optimizationObjective}
              onChange={(e) => setOptimizationObjective(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            >
              <option value="multi_objective">Multi-Objective (Balanced)</option>
              <option value="minimize_energy">Minimize Energy</option>
              <option value="maximize_yield">Maximize Yield</option>
              <option value="maximize_oee">Maximize OEE</option>
            </select>
          </div>

          {optimizationResult && (
            <div className="space-y-4 pt-4 border-t border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-2 text-emerald-600">
                <CheckCircle className="w-5 h-5" />
                <span className="font-medium">Optimization Complete</span>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <p className="text-sm text-gray-500 mb-2">Current Values</p>
                  <div className="space-y-1 text-sm">
                    <p>Temp: <span className="font-mono">{optimizationResult.current_values?.temperature}°C</span></p>
                    <p>Pressure: <span className="font-mono">{optimizationResult.current_values?.pressure} bar</span></p>
                    <p>Flow: <span className="font-mono">{optimizationResult.current_values?.flow} m³/h</span></p>
                  </div>
                </div>

                <div className="p-4 bg-emerald-50 dark:bg-emerald-900/30 rounded-lg">
                  <p className="text-sm text-emerald-600 dark:text-emerald-400 mb-2">Recommended</p>
                  <div className="space-y-1 text-sm">
                    <p>Temp: <span className="font-mono font-medium">{optimizationResult.recommended_setpoints?.temperature}°C</span></p>
                    <p>Pressure: <span className="font-mono font-medium">{optimizationResult.recommended_setpoints?.pressure} bar</span></p>
                    <p>Flow: <span className="font-mono font-medium">{optimizationResult.recommended_setpoints?.flow} m³/h</span></p>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between p-4 bg-blue-50 dark:bg-blue-900/30 rounded-lg">
                <div>
                  <p className="text-sm text-blue-600 dark:text-blue-400">Predicted Improvement</p>
                  <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">
                    +{optimizationResult.predicted_improvement}%
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-500">Confidence</p>
                  <p className="font-medium text-gray-900 dark:text-white">{optimizationResult.confidence}%</p>
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              onClick={() => {
                setShowOptimizeModal(false)
                setOptimizationResult(null)
              }}
              className="btn-secondary"
            >
              Close
            </button>
            <button
              onClick={runOptimization}
              disabled={optimizing}
              className="btn-primary"
            >
              {optimizing ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Optimizing...
                </>
              ) : (
                <>
                  <Target className="w-4 h-4 mr-2" />
                  {optimizationResult ? 'Run Again' : 'Run Optimization'}
                </>
              )}
            </button>
          </div>
        </div>
      </Modal>

      {/* Simulate Modal */}
      <Modal
        isOpen={showSimulateModal}
        onClose={() => {
          setShowSimulateModal(false)
          setSimulationResult(null)
        }}
        title="Digital Twin Simulation"
        size="lg"
      >
        <div className="space-y-4">
          <div className="p-4 bg-violet-50 dark:bg-violet-900/30 rounded-lg">
            <div className="flex items-center gap-3">
              <Play className="w-6 h-6 text-violet-600" />
              <div>
                <p className="font-medium text-violet-900 dark:text-violet-300">What-If Analysis</p>
                <p className="text-sm text-violet-700 dark:text-violet-400">
                  Simulate process outcomes with different parameters
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Temperature (°C)
              </label>
              <input
                type="number"
                value={simulationParams.temperature}
                onChange={(e) => setSimulationParams({ ...simulationParams, temperature: parseFloat(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Pressure (bar)
              </label>
              <input
                type="number"
                step="0.1"
                value={simulationParams.pressure}
                onChange={(e) => setSimulationParams({ ...simulationParams, pressure: parseFloat(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Flow Rate (m³/h)
              </label>
              <input
                type="number"
                value={simulationParams.flow_rate}
                onChange={(e) => setSimulationParams({ ...simulationParams, flow_rate: parseFloat(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              />
            </div>
          </div>

          {simulationResult && (
            <div className="space-y-4 pt-4 border-t border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-2 text-emerald-600">
                <CheckCircle className="w-5 h-5" />
                <span className="font-medium">Simulation Complete ({simulationResult.simulation_time_ms}ms)</span>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Factory className="w-4 h-4 text-gray-500" />
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Throughput</p>
                  </div>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {simulationResult.predictions?.throughput?.value} {simulationResult.predictions?.throughput?.unit}
                  </p>
                  <p className="text-sm text-gray-500">
                    {simulationResult.predictions?.throughput?.vs_design}% of design capacity
                  </p>
                </div>

                <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Target className="w-4 h-4 text-emerald-500" />
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Quality</p>
                  </div>
                  <p className="text-2xl font-bold text-emerald-600">
                    {simulationResult.predictions?.quality?.value}%
                  </p>
                  <p className="text-sm text-gray-500">
                    {simulationResult.predictions?.quality?.classification}
                  </p>
                </div>

                <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Zap className="w-4 h-4 text-amber-500" />
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Energy</p>
                  </div>
                  <p className="text-2xl font-bold text-amber-600">
                    {simulationResult.predictions?.energy?.value} {simulationResult.predictions?.energy?.unit}
                  </p>
                  <p className="text-sm text-gray-500">
                    {simulationResult.predictions?.energy?.per_unit} kWh/unit
                  </p>
                </div>

                <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <DollarSign className="w-4 h-4 text-blue-500" />
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Cost</p>
                  </div>
                  <p className="text-2xl font-bold text-blue-600">
                    ${simulationResult.predictions?.cost?.per_unit}/unit
                  </p>
                  <p className="text-sm text-gray-500">
                    Total: ${simulationResult.predictions?.cost?.total}
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              onClick={() => {
                setShowSimulateModal(false)
                setSimulationResult(null)
              }}
              className="btn-secondary"
            >
              Close
            </button>
            <button
              onClick={runSimulation}
              disabled={simulating}
              className="btn-primary"
            >
              {simulating ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Simulating...
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 mr-2" />
                  {simulationResult ? 'Run Again' : 'Run Simulation'}
                </>
              )}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
