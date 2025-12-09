import { useState, useEffect } from 'react'
import { AlertTriangle, CheckCircle, Eye, Filter, Search } from 'lucide-react'

const severityColors = {
  info: 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-400',
  warning: 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-400',
  critical: 'bg-rose-100 text-rose-700 dark:bg-rose-900/50 dark:text-rose-400'
}

const statusColors = {
  new: 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-400',
  acknowledged: 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-400',
  investigating: 'bg-violet-100 text-violet-700 dark:bg-violet-900/50 dark:text-violet-400',
  resolved: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-400',
  false_alarm: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
}

export default function Anomalies() {
  const [anomalies, setAnomalies] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('')

  useEffect(() => {
    fetchAnomalies()
  }, [])

  async function fetchAnomalies() {
    try {
      const res = await fetch('/api/anomalies')
      const data = await res.json()
      setAnomalies(data.anomalies || [])
    } catch (error) {
      console.error('Failed to fetch anomalies:', error)
    } finally {
      setLoading(false)
    }
  }

  async function acknowledgeAnomaly(id) {
    try {
      await fetch(`/api/anomalies/${id}/acknowledge`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      })
      fetchAnomalies()
    } catch (error) {
      console.error('Failed to acknowledge anomaly:', error)
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
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Anomalies</h1>
        <p className="text-gray-500 dark:text-gray-400">Monitor and manage detected anomalies</p>
      </div>

      <div className="card p-4">
        <div className="flex items-center gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search anomalies..."
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

      <div className="card overflow-hidden">
        <table className="table">
          <thead>
            <tr>
              <th>Type</th>
              <th>Device</th>
              <th>Severity</th>
              <th>Status</th>
              <th>Detected</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {anomalies.map((anomaly) => (
              <tr key={anomaly.id}>
                <td className="capitalize">{anomaly.anomaly_type?.replace('_', ' ')}</td>
                <td>{anomaly.device_name}</td>
                <td>
                  <span className={`badge ${severityColors[anomaly.severity]}`}>
                    {anomaly.severity}
                  </span>
                </td>
                <td>
                  <span className={`badge ${statusColors[anomaly.status]}`}>
                    {anomaly.status?.replace('_', ' ')}
                  </span>
                </td>
                <td>{new Date(anomaly.detected_at).toLocaleString()}</td>
                <td>
                  <div className="flex items-center gap-2">
                    <button className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded" title="View Details">
                      <Eye className="w-4 h-4 text-gray-500" />
                    </button>
                    {anomaly.status === 'new' && (
                      <button
                        onClick={() => acknowledgeAnomaly(anomaly.id)}
                        className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                        title="Acknowledge"
                      >
                        <CheckCircle className="w-4 h-4 text-gray-500" />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {anomalies.length === 0 && (
          <div className="p-12 text-center">
            <AlertTriangle className="w-12 h-12 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No anomalies</h3>
            <p className="text-gray-500">All systems are operating normally.</p>
          </div>
        )}
      </div>
    </div>
  )
}
