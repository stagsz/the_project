import { useState, useEffect } from 'react'
import { Wrench, Plus, Filter, Search, Calendar, AlertTriangle } from 'lucide-react'

const riskColors = {
  low: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-400',
  medium: 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-400',
  high: 'bg-orange-100 text-orange-700 dark:bg-orange-900/50 dark:text-orange-400',
  critical: 'bg-rose-100 text-rose-700 dark:bg-rose-900/50 dark:text-rose-400'
}

export default function Maintenance() {
  const [predictions, setPredictions] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchPredictions()
  }, [])

  async function fetchPredictions() {
    try {
      const res = await fetch('/api/maintenance/predictions')
      const data = await res.json()
      setPredictions(data.predictions || [])
    } catch (error) {
      console.error('Failed to fetch predictions:', error)
    } finally {
      setLoading(false)
    }
  }

  async function generatePredictions() {
    try {
      await fetch('/api/maintenance/generate-predictions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })
      fetchPredictions()
    } catch (error) {
      console.error('Failed to generate predictions:', error)
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
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Maintenance</h1>
          <p className="text-gray-500 dark:text-gray-400">Predictive maintenance and scheduling</p>
        </div>
        <button onClick={generatePredictions} className="btn-primary">
          <Plus className="w-4 h-4 mr-2" />
          Generate Predictions
        </button>
      </div>

      <div className="card overflow-hidden">
        <table className="table">
          <thead>
            <tr>
              <th>Device</th>
              <th>Component</th>
              <th>Type</th>
              <th>Risk Level</th>
              <th>Predicted Date</th>
              <th>Est. Cost</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {predictions.map((pred) => (
              <tr key={pred.id}>
                <td>{pred.device_name}</td>
                <td>{pred.component}</td>
                <td className="capitalize">{pred.prediction_type?.replace('_', ' ')}</td>
                <td>
                  <span className={`badge ${riskColors[pred.risk_level]}`}>
                    {pred.risk_level}
                  </span>
                </td>
                <td>{new Date(pred.predicted_date).toLocaleDateString()}</td>
                <td>${pred.estimated_cost?.toLocaleString()}</td>
                <td className="capitalize">{pred.status}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {predictions.length === 0 && (
          <div className="p-12 text-center">
            <Wrench className="w-12 h-12 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No predictions</h3>
            <p className="text-gray-500 mb-4">Generate maintenance predictions based on device data.</p>
            <button onClick={generatePredictions} className="btn-primary">
              <Plus className="w-4 h-4 mr-2" />
              Generate Predictions
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
