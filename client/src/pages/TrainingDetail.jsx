import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, Activity, Server, CheckCircle, XCircle, Clock, Play, Pause, StopCircle, RefreshCw } from 'lucide-react'
import TrainingProgressChart from '../components/TrainingProgressChart'
import Tooltip from '../components/Tooltip'

const statusColors = {
  pending: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
  in_progress: 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-400',
  aggregating: 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-400',
  completed: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-400',
  failed: 'bg-rose-100 text-rose-700 dark:bg-rose-900/50 dark:text-rose-400',
  cancelled: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
}

export default function TrainingDetail() {
  const { id } = useParams()
  const [round, setRound] = useState(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
    fetchRound()
  }, [id])

  // Set up polling for live updates when training is in progress
  useEffect(() => {
    if (round?.status === 'in_progress' || round?.status === 'aggregating') {
      const interval = setInterval(() => {
        fetchRound(true) // Silent refresh
      }, 3000) // Poll every 3 seconds

      return () => clearInterval(interval)
    }
  }, [round?.status])

  async function fetchRound(silent = false) {
    try {
      if (!silent) setLoading(true)
      setRefreshing(true)

      const res = await fetch(`/api/training/rounds/${id}`)
      const data = await res.json()
      setRound(data.round)
    } catch (error) {
      console.error('Failed to fetch training round:', error)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  async function handleAction(action) {
    try {
      await fetch(`/api/training/rounds/${id}/${action}`, {
        method: 'POST'
      })
      fetchRound()
    } catch (error) {
      console.error(`Failed to ${action} training:`, error)
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

  // Parse JSON fields
  const hyperparameters = typeof round.hyperparameters === 'string'
    ? JSON.parse(round.hyperparameters || '{}')
    : round.hyperparameters || {}

  const privacyConfig = typeof round.privacy_config === 'string'
    ? JSON.parse(round.privacy_config || '{}')
    : round.privacy_config || {}

  const resultMetrics = typeof round.result_metrics === 'string'
    ? JSON.parse(round.result_metrics || '{}')
    : round.result_metrics || {}

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link to="/training" className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800">
            <ArrowLeft className="w-5 h-5 text-gray-500" />
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                Training Round {round.round_number}
              </h1>
              <span className={`badge ${statusColors[round.status]}`}>
                {round.status?.replace('_', ' ')}
              </span>
              {refreshing && (
                <RefreshCw className="w-4 h-4 text-gray-400 animate-spin" />
              )}
            </div>
            <p className="text-gray-500">{round.model_name}</p>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="flex items-center gap-2">
          {round.status === 'in_progress' && (
            <>
              <button
                onClick={() => handleAction('pause')}
                className="btn-secondary"
              >
                <Pause className="w-4 h-4 mr-2" />
                Pause
              </button>
              <button
                onClick={() => handleAction('cancel')}
                className="btn-danger"
              >
                <StopCircle className="w-4 h-4 mr-2" />
                Cancel
              </button>
            </>
          )}
          {round.status === 'pending' && (
            <button
              onClick={() => handleAction('start')}
              className="btn-primary"
            >
              <Play className="w-4 h-4 mr-2" />
              Start Training
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content - Training Progress Chart */}
        <div className="lg:col-span-2 space-y-6">
          <div className="card p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <Activity className="w-5 h-5 text-blue-500" />
              Training Progress
            </h2>
            <TrainingProgressChart
              roundId={id}
              status={round.status}
              contributions={round.contributions || []}
              resultMetrics={resultMetrics}
              hyperparameters={hyperparameters}
            />
          </div>

          {/* Device Contributions */}
          <div className="card p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Device Contributions
            </h2>
            <div className="space-y-2">
              {round.contributions?.length > 0 ? (
                round.contributions.map((contrib) => {
                  const localMetrics = typeof contrib.local_metrics === 'string'
                    ? JSON.parse(contrib.local_metrics || '{}')
                    : contrib.local_metrics || {}

                  return (
                    <div
                      key={contrib.id}
                      className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <Server className="w-5 h-5 text-gray-500" />
                        <div>
                          <span className="text-gray-900 dark:text-white font-medium">
                            {contrib.device_name}
                          </span>
                          <p className="text-xs text-gray-500">
                            {contrib.data_samples_count || 0} samples
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        {localMetrics.loss && (
                          <div className="text-right">
                            <p className="text-xs text-gray-500">Loss</p>
                            <p className="text-sm font-mono text-gray-900 dark:text-white">
                              {localMetrics.loss.toFixed(4)}
                            </p>
                          </div>
                        )}
                        {localMetrics.accuracy && (
                          <div className="text-right">
                            <p className="text-xs text-gray-500">Accuracy</p>
                            <p className="text-sm font-mono text-gray-900 dark:text-white">
                              {(localMetrics.accuracy * 100).toFixed(1)}%
                            </p>
                          </div>
                        )}
                        <div className="w-8 flex justify-center">
                          {contrib.status === 'completed' ? (
                            <CheckCircle className="w-5 h-5 text-emerald-500" />
                          ) : contrib.status === 'failed' ? (
                            <XCircle className="w-5 h-5 text-rose-500" />
                          ) : (
                            <Clock className="w-5 h-5 text-amber-500 animate-pulse" />
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })
              ) : (
                <p className="text-gray-500 text-center py-4">No device contributions yet</p>
              )}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Round Details */}
          <div className="card p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Round Details
            </h2>
            <dl className="space-y-3">
              <div className="flex justify-between">
                <dt className="text-sm text-gray-500">Model</dt>
                <dd className="text-sm text-gray-900 dark:text-white">{round.model_name}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-sm text-gray-500">Aggregation</dt>
                <dd className="text-sm text-gray-900 dark:text-white uppercase">{round.aggregation_method}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-sm text-gray-500">Devices</dt>
                <dd className="text-sm text-gray-900 dark:text-white">
                  {round.contributions?.length || 0} participating
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-sm text-gray-500">Started</dt>
                <dd className="text-sm text-gray-900 dark:text-white">
                  {round.started_at ? new Date(round.started_at).toLocaleString() : '-'}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-sm text-gray-500">Completed</dt>
                <dd className="text-sm text-gray-900 dark:text-white">
                  {round.completed_at ? new Date(round.completed_at).toLocaleString() : '-'}
                </dd>
              </div>
            </dl>
          </div>

          {/* Hyperparameters */}
          <div className="card p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Hyperparameters
            </h2>
            <dl className="space-y-2">
              <div className="flex justify-between">
                <dt className="text-sm text-gray-500">Learning Rate</dt>
                <dd className="text-sm font-mono text-gray-900 dark:text-white">
                  {hyperparameters.learning_rate || 0.01}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-sm text-gray-500">Batch Size</dt>
                <dd className="text-sm font-mono text-gray-900 dark:text-white">
                  {hyperparameters.batch_size || 32}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-sm text-gray-500">Local Epochs</dt>
                <dd className="text-sm font-mono text-gray-900 dark:text-white">
                  {hyperparameters.local_epochs || 5}
                </dd>
              </div>
            </dl>
          </div>

          {/* Privacy Config */}
          <div className="card p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Privacy Settings
            </h2>
            <dl className="space-y-2">
              <div className="flex justify-between">
                <dt className="text-sm text-gray-500">Epsilon</dt>
                <dd className="text-sm font-mono text-gray-900 dark:text-white">
                  {privacyConfig.epsilon || 1.0}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-sm text-gray-500">Delta</dt>
                <dd className="text-sm font-mono text-gray-900 dark:text-white">
                  {privacyConfig.delta || 0.00001}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-sm text-gray-500">Noise Multiplier</dt>
                <dd className="text-sm font-mono text-gray-900 dark:text-white">
                  {privacyConfig.noise_multiplier || 1.1}
                </dd>
              </div>
            </dl>
          </div>

          {/* Final Results (if completed) */}
          {round.status === 'completed' && Object.keys(resultMetrics).length > 0 && (
            <div className="card p-6 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800">
              <h2 className="text-lg font-semibold text-emerald-800 dark:text-emerald-300 mb-4">
                Final Results
              </h2>
              <dl className="space-y-2">
                {resultMetrics.accuracy && (
                  <div className="flex justify-between">
                    <dt className="text-sm text-emerald-700 dark:text-emerald-400">Accuracy</dt>
                    <dd className="text-sm font-mono text-emerald-900 dark:text-emerald-200">
                      {(resultMetrics.accuracy * 100).toFixed(2)}%
                    </dd>
                  </div>
                )}
                {resultMetrics.loss && (
                  <div className="flex justify-between">
                    <dt className="text-sm text-emerald-700 dark:text-emerald-400">Final Loss</dt>
                    <dd className="text-sm font-mono text-emerald-900 dark:text-emerald-200">
                      {resultMetrics.loss.toFixed(4)}
                    </dd>
                  </div>
                )}
                {resultMetrics.f1_score && (
                  <div className="flex justify-between">
                    <dt className="text-sm text-emerald-700 dark:text-emerald-400">F1 Score</dt>
                    <dd className="text-sm font-mono text-emerald-900 dark:text-emerald-200">
                      {resultMetrics.f1_score.toFixed(4)}
                    </dd>
                  </div>
                )}
              </dl>
            </div>
          )}

          {/* Error Message (if failed) */}
          {round.status === 'failed' && (
            <div className="card p-6 bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800">
              <h2 className="text-lg font-semibold text-rose-800 dark:text-rose-300 mb-4 flex items-center gap-2">
                <XCircle className="w-5 h-5" />
                Training Failed
              </h2>
              <div className="space-y-3">
                <p className="text-sm text-rose-700 dark:text-rose-400">
                  {round.error_message || 'No devices assigned to this training round'}
                </p>
                <div className="p-3 bg-rose-100 dark:bg-rose-900/40 rounded-lg">
                  <p className="text-xs font-medium text-rose-800 dark:text-rose-300 mb-2">Common causes:</p>
                  <ul className="text-xs text-rose-700 dark:text-rose-400 space-y-1 list-disc list-inside">
                    <li>No devices are online or active</li>
                    <li>Selected devices don't have dataset files</li>
                    <li>Model architecture incompatible with device data</li>
                    <li>Training parameters too aggressive (high learning rate)</li>
                  </ul>
                </div>
                <div className="pt-2">
                  <p className="text-xs text-rose-600 dark:text-rose-400 mb-2">To fix this:</p>
                  <ol className="text-xs text-rose-700 dark:text-rose-400 space-y-1 list-decimal list-inside">
                    <li>Go to <strong>Devices</strong> and ensure devices are online</li>
                    <li>Make sure simulated devices have dataset files uploaded</li>
                    <li>Try starting a new training round with different devices</li>
                  </ol>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
