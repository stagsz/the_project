import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, Brain, GitBranch, Zap, Play } from 'lucide-react'

export default function ModelDetail() {
  const { id } = useParams()
  const [model, setModel] = useState(null)
  const [loading, setLoading] = useState(true)

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
        <button className="btn-primary">
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
          <div className="card p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Actions</h2>
            <div className="space-y-2">
              <button className="btn-primary w-full">Deploy Model</button>
              <button className="btn-secondary w-full">Export</button>
              <button className="btn-secondary w-full">View Metrics</button>
              <button className="btn-danger w-full">Deprecate</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
