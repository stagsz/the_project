import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Activity, Plus, Play, Pause, CheckCircle, XCircle, Clock } from 'lucide-react'

const statusColors = {
  pending: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
  in_progress: 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-400',
  aggregating: 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-400',
  completed: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-400',
  failed: 'bg-rose-100 text-rose-700 dark:bg-rose-900/50 dark:text-rose-400',
  cancelled: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
}

export default function Training() {
  const [rounds, setRounds] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchRounds()
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
        <button className="btn-primary">
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
            <button className="btn-primary">
              <Plus className="w-4 h-4 mr-2" />
              Start Training
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
