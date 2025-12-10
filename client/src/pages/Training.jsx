import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Activity, Plus, Play, Pause, AlertCircle } from 'lucide-react'
import Modal from '../components/Modal'

const statusColors = {
  pending: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
  in_progress: 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-400',
  aggregating: 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-400',
  completed: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-400',
  failed: 'bg-rose-100 text-rose-700 dark:bg-rose-900/50 dark:text-rose-400',
  cancelled: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
}

const aggregationMethods = [
  { value: 'fedavg', label: 'FedAvg - Federated Averaging' },
  { value: 'fedprox', label: 'FedProx - Proximal Federated' },
  { value: 'scaffold', label: 'SCAFFOLD - Control Variates' }
]

export default function Training() {
  const [rounds, setRounds] = useState([])
  const [models, setModels] = useState([])
  const [devices, setDevices] = useState([])
  const [loading, setLoading] = useState(true)
  const [showStartModal, setShowStartModal] = useState(false)
  const [trainingConfig, setTrainingConfig] = useState({
    model_id: '',
    target_devices: [],
    hyperparameters: {
      learning_rate: 0.01,
      batch_size: 32,
      local_epochs: 5
    },
    privacy_config: {
      epsilon: 1.0,
      delta: 0.00001,
      noise_multiplier: 1.1
    },
    aggregation_method: 'fedavg'
  })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchRounds()
    fetchModels()
    fetchDevices()
  }, [])

  async function fetchRounds() {
    try {
      const res = await fetch('/api/training/rounds')
      const data = await res.json()
      setRounds(data.rounds || [])
    } catch (error) {
      console.error('Failed to fetch training rounds:', error)
    } finally {
      setLoading(false)
    }
  }

  async function fetchModels() {
    try {
      const res = await fetch('/api/models')
      const data = await res.json()
      setModels(data.models || [])
    } catch (error) {
      console.error('Failed to fetch models:', error)
    }
  }

  async function fetchDevices() {
    try {
      const res = await fetch('/api/devices?status=online')
      const data = await res.json()
      setDevices(data.devices || [])
    } catch (error) {
      console.error('Failed to fetch devices:', error)
    }
  }

  async function handleStartTraining(e) {
    e.preventDefault()
    setError('')
    setSubmitting(true)

    try {
      if (!trainingConfig.model_id) {
        throw new Error('Please select a model')
      }

      const res = await fetch('/api/training/rounds', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(trainingConfig)
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error?.message || 'Failed to start training')
      }

      setShowStartModal(false)
      setTrainingConfig({
        model_id: '',
        target_devices: [],
        hyperparameters: {
          learning_rate: 0.01,
          batch_size: 32,
          local_epochs: 5
        },
        privacy_config: {
          epsilon: 1.0,
          delta: 0.00001,
          noise_multiplier: 1.1
        },
        aggregation_method: 'fedavg'
      })
      fetchRounds()
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  function toggleDeviceSelection(deviceId) {
    setTrainingConfig(prev => ({
      ...prev,
      target_devices: prev.target_devices.includes(deviceId)
        ? prev.target_devices.filter(id => id !== deviceId)
        : [...prev.target_devices, deviceId]
    }))
  }

  function selectAllDevices() {
    setTrainingConfig(prev => ({
      ...prev,
      target_devices: devices.map(d => d.id)
    }))
  }

  function clearDeviceSelection() {
    setTrainingConfig(prev => ({
      ...prev,
      target_devices: []
    }))
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
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Training</h1>
          <p className="text-gray-500 dark:text-gray-400">Manage federated training rounds</p>
        </div>
        <button onClick={() => setShowStartModal(true)} className="btn-primary">
          <Plus className="w-4 h-4 mr-2" />
          Start Training
        </button>
      </div>

      <div className="card overflow-hidden">
        <table className="table">
          <thead>
            <tr>
              <th>Round</th>
              <th>Model</th>
              <th>Status</th>
              <th>Devices</th>
              <th>Started</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {rounds.map((round) => (
              <tr key={round.id}>
                <td>
                  <Link to={`/training/${round.id}`} className="text-blue-600 hover:underline">
                    Round {round.round_number}
                  </Link>
                </td>
                <td>{round.model_name}</td>
                <td>
                  <span className={`badge ${statusColors[round.status]}`}>
                    {round.status.replace('_', ' ')}
                  </span>
                </td>
                <td>{round.participating_devices?.length || 0} devices</td>
                <td>
                  {round.started_at ? new Date(round.started_at).toLocaleString() : '-'}
                </td>
                <td>
                  <div className="flex items-center gap-2">
                    {round.status === 'in_progress' && (
                      <button className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded">
                        <Pause className="w-4 h-4 text-gray-500" />
                      </button>
                    )}
                    <Link
                      to={`/training/${round.id}`}
                      className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                    >
                      <Activity className="w-4 h-4 text-gray-500" />
                    </Link>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {rounds.length === 0 && (
          <div className="p-12 text-center">
            <Activity className="w-12 h-12 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No training rounds</h3>
            <p className="text-gray-500 mb-4">Start your first federated training round.</p>
            <button onClick={() => setShowStartModal(true)} className="btn-primary">
              <Plus className="w-4 h-4 mr-2" />
              Start Training
            </button>
          </div>
        )}
      </div>

      {/* Start Training Modal */}
      <Modal
        isOpen={showStartModal}
        onClose={() => setShowStartModal(false)}
        title="Start Training Round"
        size="lg"
      >
        <form onSubmit={handleStartTraining} className="space-y-6">
          {error && (
            <div className="flex items-center gap-2 p-3 bg-rose-50 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400 rounded-lg">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <span className="text-sm">{error}</span>
            </div>
          )}

          {/* Model Selection */}
          <div>
            <label htmlFor="model_id" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Model *
            </label>
            <select
              id="model_id"
              value={trainingConfig.model_id}
              onChange={(e) => setTrainingConfig({ ...trainingConfig, model_id: e.target.value })}
              className="input"
              required
            >
              <option value="">-- Select Model --</option>
              {models.map((model) => (
                <option key={model.id} value={model.id}>
                  {model.name} ({model.model_type})
                </option>
              ))}
            </select>
          </div>

          {/* Device Selection */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Target Devices
              </label>
              <div className="flex gap-2">
                <button type="button" onClick={selectAllDevices} className="text-xs text-blue-600 hover:underline">
                  Select All
                </button>
                <button type="button" onClick={clearDeviceSelection} className="text-xs text-gray-500 hover:underline">
                  Clear
                </button>
              </div>
            </div>
            <p className="text-xs text-gray-500 mb-2">
              {trainingConfig.target_devices.length > 0
                ? `${trainingConfig.target_devices.length} device(s) selected`
                : 'Leave empty to use all online devices'}
            </p>
            <div className="max-h-40 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-lg p-2 space-y-1">
              {devices.length === 0 ? (
                <p className="text-sm text-gray-500 p-2">No online devices available</p>
              ) : (
                devices.map((device) => (
                  <label
                    key={device.id}
                    className="flex items-center gap-2 p-2 hover:bg-gray-50 dark:hover:bg-gray-800 rounded cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={trainingConfig.target_devices.includes(device.id)}
                      onChange={() => toggleDeviceSelection(device.id)}
                      className="rounded text-blue-600"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">{device.name}</span>
                    <span className="text-xs text-gray-500 font-mono">{device.device_uid}</span>
                  </label>
                ))
              )}
            </div>
          </div>

          {/* Hyperparameters */}
          <div>
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Hyperparameters</h4>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label htmlFor="learning_rate" className="block text-xs text-gray-500 mb-1">
                  Learning Rate
                </label>
                <input
                  id="learning_rate"
                  type="number"
                  step="0.001"
                  value={trainingConfig.hyperparameters.learning_rate}
                  onChange={(e) => setTrainingConfig({
                    ...trainingConfig,
                    hyperparameters: { ...trainingConfig.hyperparameters, learning_rate: parseFloat(e.target.value) }
                  })}
                  className="input"
                />
              </div>
              <div>
                <label htmlFor="batch_size" className="block text-xs text-gray-500 mb-1">
                  Batch Size
                </label>
                <input
                  id="batch_size"
                  type="number"
                  value={trainingConfig.hyperparameters.batch_size}
                  onChange={(e) => setTrainingConfig({
                    ...trainingConfig,
                    hyperparameters: { ...trainingConfig.hyperparameters, batch_size: parseInt(e.target.value) }
                  })}
                  className="input"
                />
              </div>
              <div>
                <label htmlFor="local_epochs" className="block text-xs text-gray-500 mb-1">
                  Local Epochs
                </label>
                <input
                  id="local_epochs"
                  type="number"
                  value={trainingConfig.hyperparameters.local_epochs}
                  onChange={(e) => setTrainingConfig({
                    ...trainingConfig,
                    hyperparameters: { ...trainingConfig.hyperparameters, local_epochs: parseInt(e.target.value) }
                  })}
                  className="input"
                />
              </div>
            </div>
          </div>

          {/* Privacy Configuration */}
          <div>
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Differential Privacy</h4>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label htmlFor="epsilon" className="block text-xs text-gray-500 mb-1">
                  Epsilon
                </label>
                <input
                  id="epsilon"
                  type="number"
                  step="0.1"
                  value={trainingConfig.privacy_config.epsilon}
                  onChange={(e) => setTrainingConfig({
                    ...trainingConfig,
                    privacy_config: { ...trainingConfig.privacy_config, epsilon: parseFloat(e.target.value) }
                  })}
                  className="input"
                />
              </div>
              <div>
                <label htmlFor="delta" className="block text-xs text-gray-500 mb-1">
                  Delta
                </label>
                <input
                  id="delta"
                  type="number"
                  step="0.000001"
                  value={trainingConfig.privacy_config.delta}
                  onChange={(e) => setTrainingConfig({
                    ...trainingConfig,
                    privacy_config: { ...trainingConfig.privacy_config, delta: parseFloat(e.target.value) }
                  })}
                  className="input"
                />
              </div>
              <div>
                <label htmlFor="noise_multiplier" className="block text-xs text-gray-500 mb-1">
                  Noise Multiplier
                </label>
                <input
                  id="noise_multiplier"
                  type="number"
                  step="0.1"
                  value={trainingConfig.privacy_config.noise_multiplier}
                  onChange={(e) => setTrainingConfig({
                    ...trainingConfig,
                    privacy_config: { ...trainingConfig.privacy_config, noise_multiplier: parseFloat(e.target.value) }
                  })}
                  className="input"
                />
              </div>
            </div>
          </div>

          {/* Aggregation Method */}
          <div>
            <label htmlFor="aggregation_method" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Aggregation Method
            </label>
            <select
              id="aggregation_method"
              value={trainingConfig.aggregation_method}
              onChange={(e) => setTrainingConfig({ ...trainingConfig, aggregation_method: e.target.value })}
              className="input"
            >
              {aggregationMethods.map((method) => (
                <option key={method.value} value={method.value}>
                  {method.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={() => setShowStartModal(false)}
              className="btn-secondary"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="btn-primary"
            >
              <Play className="w-4 h-4 mr-2" />
              {submitting ? 'Starting...' : 'Start Training'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
