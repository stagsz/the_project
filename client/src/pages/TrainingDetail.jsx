import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, Activity, Server, CheckCircle, XCircle, Clock } from 'lucide-react'

export default function TrainingDetail() {
  const { id } = useParams()
  const [round, setRound] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchRound()
  }, [id])

  async function fetchRound() {
    try {
      const res = await fetch(`/api/training/rounds/${id}`)
      const data = await res.json()
      setRound(data.round)
    } catch (error) {
      console.error('Failed to fetch training round:', error)
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

  if (!round) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Training round not found</h2>
        <Link to="/training" className="text-blue-600 hover:underline mt-2 inline-block">
          Back to training
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link to="/training" className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800">
          <ArrowLeft className="w-5 h-5 text-gray-500" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Training Round {round.round_number}
          </h1>
          <p className="text-gray-500">{round.model_name}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="card p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Round Details</h2>
            <dl className="grid grid-cols-2 gap-4">
              <div>
                <dt className="text-sm text-gray-500">Status</dt>
                <dd className="text-gray-900 dark:text-white capitalize">{round.status?.replace('_', ' ')}</dd>
              </div>
              <div>
                <dt className="text-sm text-gray-500">Aggregation</dt>
                <dd className="text-gray-900 dark:text-white">{round.aggregation_method}</dd>
              </div>
              <div>
                <dt className="text-sm text-gray-500">Started</dt>
                <dd className="text-gray-900 dark:text-white">
                  {round.started_at ? new Date(round.started_at).toLocaleString() : '-'}
                </dd>
              </div>
              <div>
                <dt className="text-sm text-gray-500">Completed</dt>
                <dd className="text-gray-900 dark:text-white">
                  {round.completed_at ? new Date(round.completed_at).toLocaleString() : '-'}
                </dd>
              </div>
            </dl>
          </div>

          <div className="card p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Device Contributions</h2>
            <div className="space-y-2">
              {round.contributions?.map((contrib) => (
                <div key={contrib.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Server className="w-4 h-4 text-gray-500" />
                    <span className="text-gray-900 dark:text-white">{contrib.device_name}</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-sm text-gray-500">
                      {contrib.data_samples_count || 0} samples
                    </span>
                    {contrib.status === 'completed' ? (
                      <CheckCircle className="w-4 h-4 text-emerald-500" />
                    ) : contrib.status === 'failed' ? (
                      <XCircle className="w-4 h-4 text-rose-500" />
                    ) : (
                      <Clock className="w-4 h-4 text-amber-500" />
                    )}
                  </div>
                </div>
              )) || (
                <p className="text-gray-500">No contributions yet</p>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="card p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Hyperparameters</h2>
            <dl className="space-y-2">
              <div className="flex justify-between">
                <dt className="text-sm text-gray-500">Learning Rate</dt>
                <dd className="text-sm font-mono text-gray-900 dark:text-white">
                  {round.hyperparameters?.learning_rate || 0.01}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-sm text-gray-500">Batch Size</dt>
                <dd className="text-sm font-mono text-gray-900 dark:text-white">
                  {round.hyperparameters?.batch_size || 32}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-sm text-gray-500">Local Epochs</dt>
                <dd className="text-sm font-mono text-gray-900 dark:text-white">
                  {round.hyperparameters?.local_epochs || 5}
                </dd>
              </div>
            </dl>
          </div>

          <div className="card p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Actions</h2>
            <div className="space-y-2">
              {round.status === 'in_progress' && (
                <>
                  <button className="btn-secondary w-full">Pause</button>
                  <button className="btn-danger w-full">Cancel</button>
                </>
              )}
              {round.status === 'completed' && (
                <button className="btn-primary w-full">View Results</button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
