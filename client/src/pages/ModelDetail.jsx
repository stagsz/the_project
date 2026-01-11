import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, Brain, GitBranch, Zap, Play, AlertCircle, Download } from 'lucide-react'
import Modal from '../components/Modal'

export default function ModelDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [model, setModel] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showDeployModal, setShowDeployModal] = useState(false)
  const [showDeprecateModal, setShowDeprecateModal] = useState(false)
  const [showMetricsModal, setShowMetricsModal] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)
  const [actionError, setActionError] = useState('')
  const [actionSuccess, setActionSuccess] = useState('')

  useEffect(() => {
    fetchModel()
  }, [id])

  async function fetchModel() {
    try {
      const res = await fetch(`/api/models/${id}`)
      const data = await res.json()
      setModel(data.model)
    } catch (error) {
      console.error('Failed to fetch model:', error)
    } finally {
      setLoading(false)
    }
  }

  function handleStartTraining() {
    // Navigate to training page with this model pre-selected
    navigate(`/training?model=${id}`)
  }

  async function handleDeploy() {
    if (!model.versions || model.versions.length === 0) {
      setActionError('No versions available to deploy')
      return
    }

    setActionLoading(true)
    setActionError('')
    
    try {
      const latestVersion = model.versions[0]
      const res = await fetch(`/api/models/${id}/deploy`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          version_id: latestVersion.id,
          deployment_type: 'full'
        })
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error?.message || 'Failed to deploy model')
      }

      setActionSuccess('Model deployed successfully')
      setShowDeployModal(false)
      fetchModel() // Refresh model data
    } catch (error) {
      setActionError(error.message)
    } finally {
      setActionLoading(false)
    }
  }

  function handleExport() {
    // Export model metadata as JSON
    const modelData = {
      id: model.id,
      name: model.name,
      description: model.description,
      model_type: model.model_type,
      target_use_case: model.target_use_case,
      architecture: model.architecture,
      versions: model.versions
    }
    
    const dataStr = JSON.stringify(modelData, null, 2)
    const dataBlob = new Blob([dataStr], { type: 'application/json' })
    const url = URL.createObjectURL(dataBlob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${model.name.replace(/\s+/g, '-').toLowerCase()}-model.json`
    link.click()
    URL.revokeObjectURL(url)
    
    setActionSuccess('Model exported successfully')
  }

  function handleViewMetrics() {
    setShowMetricsModal(true)
  }

  async function handleDeprecate() {
    setActionLoading(true)
    setActionError('')
    
    try {
      const res = await fetch(`/api/models/${id}`, {
        method: 'DELETE'
      })

      if (!res.ok) {
        throw new Error('Failed to deprecate model')
      }

      navigate('/models')
    } catch (error) {
      setActionError(error.message)
    } finally {
      setActionLoading(false)
      setShowDeprecateModal(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!model) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Model not found</h2>
        <Link to="/models" className="text-blue-600 hover:underline mt-2 inline-block">
          Back to models
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link to="/models" className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800">
          <ArrowLeft className="w-5 h-5 text-gray-500" />
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{model.name}</h1>
          <p className="text-gray-500">{model.description}</p>
        </div>
        <button onClick={handleStartTraining} className="btn-primary">
          <Play className="w-4 h-4 mr-2" />
          Start Training
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="card p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Model Information</h2>
            <dl className="grid grid-cols-2 gap-4">
              <div>
                <dt className="text-sm text-gray-500">Type</dt>
                <dd className="text-gray-900 dark:text-white capitalize">{model.model_type?.replace('_', ' ')}</dd>
              </div>
              <div>
                <dt className="text-sm text-gray-500">Status</dt>
                <dd className="text-gray-900 dark:text-white capitalize">{model.status}</dd>
              </div>
              <div>
                <dt className="text-sm text-gray-500">Use Case</dt>
                <dd className="text-gray-900 dark:text-white capitalize">{model.target_use_case?.replace('_', ' ')}</dd>
              </div>
              <div>
                <dt className="text-sm text-gray-500">Created</dt>
                <dd className="text-gray-900 dark:text-white">{new Date(model.created_at).toLocaleDateString()}</dd>
              </div>
            </dl>
          </div>

          <div className="card p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Versions</h2>
            <div className="space-y-2">
              {model.versions?.map((version) => (
                <div key={version.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div className="flex items-center gap-3">
                    <GitBranch className="w-4 h-4 text-gray-500" />
                    <span className="font-mono text-gray-900 dark:text-white">v{version.version}</span>
                    {version.is_deployed && (
                      <span className="badge-success">Deployed</span>
                    )}
                  </div>
                  <span className="text-sm text-gray-500">
                    {new Date(version.created_at).toLocaleDateString()}
                  </span>
                </div>
              )) || (
                <p className="text-gray-500">No versions yet</p>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          {/* Action Messages */}
          {actionSuccess && (
            <div className="bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 p-3 rounded-lg text-sm">
              {actionSuccess}
            </div>
          )}
          {actionError && (
            <div className="bg-rose-50 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400 p-3 rounded-lg text-sm flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {actionError}
            </div>
          )}

          <div className="card p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Actions</h2>
            <div className="space-y-2">
              <button
                onClick={() => setShowDeployModal(true)}
                className="btn-primary w-full"
              >
                Deploy Model
              </button>
              <button
                onClick={handleExport}
                className="btn-secondary w-full"
              >
                <Download className="w-4 h-4 mr-2" />
                Export
              </button>
              <button
                onClick={handleViewMetrics}
                className="btn-secondary w-full"
              >
                View Metrics
              </button>
              <button
                onClick={() => setShowDeprecateModal(true)}
                className="btn-danger w-full"
              >
                Deprecate
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Deploy Confirmation Modal */}
      <Modal
        isOpen={showDeployModal}
        onClose={() => setShowDeployModal(false)}
        title="Deploy Model"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-gray-600 dark:text-gray-300">
            Deploy the latest version of <strong>{model.name}</strong> to all active devices?
          </p>
          
          {actionError && (
            <div className="flex items-center gap-2 p-3 bg-rose-50 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400 rounded-lg text-sm">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {actionError}
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              onClick={() => setShowDeployModal(false)}
              disabled={actionLoading}
              className="btn-secondary"
            >
              Cancel
            </button>
            <button
              onClick={handleDeploy}
              disabled={actionLoading}
              className="btn-primary"
            >
              {actionLoading ? 'Deploying...' : 'Deploy'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Deprecate Confirmation Modal */}
      <Modal
        isOpen={showDeprecateModal}
        onClose={() => setShowDeprecateModal(false)}
        title="Deprecate Model"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-gray-600 dark:text-gray-300">
            Are you sure you want to deprecate <strong>{model.name}</strong>? This will mark it as deprecated and prevent future deployments.
          </p>
          
          {actionError && (
            <div className="flex items-center gap-2 p-3 bg-rose-50 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400 rounded-lg text-sm">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {actionError}
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              onClick={() => setShowDeprecateModal(false)}
              disabled={actionLoading}
              className="btn-secondary"
            >
              Cancel
            </button>
            <button
              onClick={handleDeprecate}
              disabled={actionLoading}
              className="btn-danger"
            >
              {actionLoading ? 'Deprecating...' : 'Deprecate'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Metrics Modal */}
      <Modal
        isOpen={showMetricsModal}
        onClose={() => setShowMetricsModal(false)}
        title="Model Metrics"
        size="md"
      >
        <div className="space-y-4">
          {model.recent_training && model.recent_training.length > 0 ? (
            <div className="space-y-3">
              {model.recent_training.map((training, idx) => (
                <div key={training.id || idx} className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      Round #{training.round_number}
                    </span>
                    <span className={`badge ${
                      training.status === 'completed' ? 'badge-success' :
                      training.status === 'failed' ? 'badge-danger' :
                      'badge-warning'
                    }`}>
                      {training.status}
                    </span>
                  </div>
                  {training.result_metrics && Object.keys(training.result_metrics).length > 0 && (
                    <dl className="grid grid-cols-2 gap-2 text-sm">
                      {Object.entries(training.result_metrics).map(([key, value]) => (
                        <div key={key}>
                          <dt className="text-gray-500 capitalize">{key.replace('_', ' ')}</dt>
                          <dd className="text-gray-900 dark:text-white font-medium">
                            {typeof value === 'number' ? value.toFixed(4) : value}
                          </dd>
                        </div>
                      ))}
                    </dl>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500">
              No training metrics available
            </div>
          )}
          
          <div className="flex justify-end pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              onClick={() => setShowMetricsModal(false)}
              className="btn-secondary"
            >
              Close
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
