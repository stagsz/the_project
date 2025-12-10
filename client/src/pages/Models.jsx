import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Brain, Plus, Search, Filter, Zap, GitBranch, AlertCircle } from 'lucide-react'
import Modal from '../components/Modal'

const typeColors = {
  classification: 'bg-violet-100 text-violet-700 dark:bg-violet-900/50 dark:text-violet-400',
  regression: 'bg-sky-100 text-sky-700 dark:bg-sky-900/50 dark:text-sky-400',
  anomaly_detection: 'bg-orange-100 text-orange-700 dark:bg-orange-900/50 dark:text-orange-400',
  object_detection: 'bg-pink-100 text-pink-700 dark:bg-pink-900/50 dark:text-pink-400'
}

const statusColors = {
  draft: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
  active: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-400',
  deprecated: 'bg-rose-100 text-rose-700 dark:bg-rose-900/50 dark:text-rose-400'
}

const modelTypes = [
  { value: 'classification', label: 'Classification' },
  { value: 'regression', label: 'Regression' },
  { value: 'anomaly_detection', label: 'Anomaly Detection' },
  { value: 'object_detection', label: 'Object Detection' }
]

const useCases = [
  { value: 'predictive_maintenance', label: 'Predictive Maintenance' },
  { value: 'quality_control', label: 'Quality Control' },
  { value: 'energy_optimization', label: 'Energy Optimization' },
  { value: 'process_optimization', label: 'Process Optimization' },
  { value: 'anomaly_detection', label: 'Anomaly Detection' }
]

export default function Models() {
  const [models, setModels] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [newModel, setNewModel] = useState({
    name: '',
    description: '',
    model_type: 'classification',
    target_use_case: 'predictive_maintenance'
  })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchModels()
  }, [])

  async function fetchModels() {
    try {
      const res = await fetch('/api/models')
      const data = await res.json()
      setModels(data.models || [])
    } catch (error) {
      console.error('Failed to fetch models:', error)
    } finally {
      setLoading(false)
    }
  }

  async function handleCreateModel(e) {
    e.preventDefault()
    setError('')
    setSubmitting(true)

    try {
      const res = await fetch('/api/models', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newModel)
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error?.message || 'Failed to create model')
      }

      setShowCreateModal(false)
      setNewModel({
        name: '',
        description: '',
        model_type: 'classification',
        target_use_case: 'predictive_maintenance'
      })
      fetchModels()
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  const filteredModels = models.filter(m =>
    m.name.toLowerCase().includes(filter.toLowerCase())
  )

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
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Models</h1>
          <p className="text-gray-500 dark:text-gray-400">Manage your machine learning models</p>
        </div>
        <button onClick={() => setShowCreateModal(true)} className="btn-primary">
          <Plus className="w-4 h-4 mr-2" />
          Create Model
        </button>
      </div>

      <div className="card p-4">
        <div className="flex items-center gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search models..."
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="input pl-10"
            />
          </div>
          <button className="btn-secondary">
            <Filter className="w-4 h-4 mr-2" />
            Filters
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredModels.map((model) => (
          <Link
            key={model.id}
            to={`/models/${model.id}`}
            className="card-hover p-4"
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-violet-100 dark:bg-violet-900/50 rounded-lg flex items-center justify-center">
                  <Brain className="w-5 h-5 text-violet-600 dark:text-violet-400" />
                </div>
                <div>
                  <h3 className="font-medium text-gray-900 dark:text-white">{model.name}</h3>
                  <span className={`badge ${typeColors[model.model_type]}`}>
                    {model.model_type?.replace('_', ' ')}
                  </span>
                </div>
              </div>
              <span className={`badge ${statusColors[model.status]}`}>
                {model.status}
              </span>
            </div>

            <p className="text-sm text-gray-500 dark:text-gray-400 mb-3 line-clamp-2">
              {model.description || 'No description'}
            </p>

            <div className="flex items-center justify-between text-sm text-gray-500">
              <div className="flex items-center gap-1">
                <GitBranch className="w-4 h-4" />
                <span>{model.version_count || 0} versions</span>
              </div>
              {model.deployed_version && (
                <div className="flex items-center gap-1 text-emerald-600">
                  <Zap className="w-4 h-4" />
                  <span>v{model.deployed_version}</span>
                </div>
              )}
            </div>
          </Link>
        ))}
      </div>

      {filteredModels.length === 0 && (
        <div className="card p-12 text-center">
          <Brain className="w-12 h-12 mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No models found</h3>
          <p className="text-gray-500 mb-4">Create your first machine learning model.</p>
          <button onClick={() => setShowCreateModal(true)} className="btn-primary">
            <Plus className="w-4 h-4 mr-2" />
            Create Model
          </button>
        </div>
      )}

      {/* Create Model Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Create New Model"
        size="md"
      >
        <form onSubmit={handleCreateModel} className="space-y-4">
          {error && (
            <div className="flex items-center gap-2 p-3 bg-rose-50 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400 rounded-lg">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <span className="text-sm">{error}</span>
            </div>
          )}

          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Model Name *
            </label>
            <input
              id="name"
              type="text"
              value={newModel.name}
              onChange={(e) => setNewModel({ ...newModel, name: e.target.value })}
              className="input"
              placeholder="e.g., Equipment Failure Predictor"
              required
            />
          </div>

          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Description
            </label>
            <textarea
              id="description"
              value={newModel.description}
              onChange={(e) => setNewModel({ ...newModel, description: e.target.value })}
              className="input min-h-[80px]"
              placeholder="Describe what this model does..."
              rows={3}
            />
          </div>

          <div>
            <label htmlFor="model_type" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Model Type *
            </label>
            <select
              id="model_type"
              value={newModel.model_type}
              onChange={(e) => setNewModel({ ...newModel, model_type: e.target.value })}
              className="input"
              required
            >
              {modelTypes.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="target_use_case" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Target Use Case *
            </label>
            <select
              id="target_use_case"
              value={newModel.target_use_case}
              onChange={(e) => setNewModel({ ...newModel, target_use_case: e.target.value })}
              className="input"
              required
            >
              {useCases.map((uc) => (
                <option key={uc.value} value={uc.value}>
                  {uc.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={() => setShowCreateModal(false)}
              className="btn-secondary"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="btn-primary"
            >
              {submitting ? 'Creating...' : 'Create Model'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
