import { useState, useEffect } from 'react'
import { CheckCircle2, XCircle, AlertTriangle, Plus, Filter, Search, HelpCircle } from 'lucide-react'
import Tooltip, { QUALITY_TOOLTIPS } from '../components/Tooltip'

const resultColors = {
  pass: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-400',
  fail: 'bg-rose-100 text-rose-700 dark:bg-rose-900/50 dark:text-rose-400',
  warning: 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-400'
}

export default function Quality() {
  const [inspections, setInspections] = useState([])
  const [metrics, setMetrics] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchData()
  }, [])

  async function fetchData() {
    try {
      const [inspRes, metricsRes] = await Promise.all([
        fetch('/api/quality/inspections'),
        fetch('/api/quality/metrics')
      ])
      const inspData = await inspRes.json()
      const metricsData = await metricsRes.json()
      setInspections(inspData.inspections || [])
      setMetrics(metricsData.metrics)
    } catch (error) {
      console.error('Failed to fetch quality data:', error)
    } finally {
      setLoading(false)
    }
  }

  async function generateInspections() {
    try {
      console.log('[Quality] Generating inspections...');
      const response = await fetch('/api/quality/generate-inspections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ count: 20 })
      })
      
      console.log('[Quality] Response status:', response.status);
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error('[Quality] API Error:', errorData);
        alert(`Failed to generate inspections: ${errorData.error?.message || 'Unknown error'}`);
        return;
      }
      
      const data = await response.json();
      console.log('[Quality] Generated inspections:', data);
      alert(`Successfully generated ${data.count} inspections!`);
      fetchData()
    } catch (error) {
      console.error('[Quality] Failed to generate inspections:', error)
      alert(`Error: ${error.message}`);
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
          <Tooltip content={QUALITY_TOOLTIPS.pageOverview.content}>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Quality</h1>
          </Tooltip>
          <p className="text-gray-500 dark:text-gray-400">Quality inspection management</p>
        </div>
        <Tooltip content={QUALITY_TOOLTIPS.generateInspections.content}>
          <button onClick={generateInspections} className="btn-primary">
            <Plus className="w-4 h-4 mr-2" />
            Generate Inspections
          </button>
        </Tooltip>
      </div>

      {metrics && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="card p-4">
            <Tooltip content={QUALITY_TOOLTIPS.totalInspections.content}>
              <p className="text-sm text-gray-500">Total Inspections</p>
            </Tooltip>
            <p className="metric-value text-gray-900 dark:text-white">{metrics.total}</p>
          </div>
          <div className="card p-4">
            <Tooltip content={QUALITY_TOOLTIPS.passRate.content}>
              <p className="text-sm text-gray-500">Pass Rate</p>
            </Tooltip>
            <p className="metric-value text-emerald-600">{metrics.pass_rate}%</p>
          </div>
          <div className="card p-4">
            <Tooltip content={QUALITY_TOOLTIPS.failedCount.content}>
              <p className="text-sm text-gray-500">Failed</p>
            </Tooltip>
            <p className="metric-value text-rose-600">{metrics.failed}</p>
          </div>
          <div className="card p-4">
            <Tooltip content={QUALITY_TOOLTIPS.overridesCount.content}>
              <p className="text-sm text-gray-500">Overrides</p>
            </Tooltip>
            <p className="metric-value text-gray-900 dark:text-white">{metrics.overrides}</p>
          </div>
        </div>
      )}

      <div className="card overflow-hidden">
        <table className="table">
          <thead>
            <tr>
              <th>
                <Tooltip content={QUALITY_TOOLTIPS.deviceColumn.content}>
                  <span>Device</span>
                </Tooltip>
              </th>
              <th>
                <Tooltip content={QUALITY_TOOLTIPS.resultColumn.content}>
                  <span>Result</span>
                </Tooltip>
              </th>
              <th>
                <Tooltip content={QUALITY_TOOLTIPS.defectType.content}>
                  <span>Defect Type</span>
                </Tooltip>
              </th>
              <th>
                <Tooltip content={QUALITY_TOOLTIPS.confidenceScore.content}>
                  <span>Confidence</span>
                </Tooltip>
              </th>
              <th>
                <Tooltip content={QUALITY_TOOLTIPS.humanOverride.content}>
                  <span>Override</span>
                </Tooltip>
              </th>
              <th>
                <Tooltip content={QUALITY_TOOLTIPS.timestamp.content}>
                  <span>Timestamp</span>
                </Tooltip>
              </th>
            </tr>
          </thead>
          <tbody>
            {inspections.map((insp) => (
              <tr key={insp.id}>
                <td>{insp.device_name}</td>
                <td>
                  <span className={`badge ${resultColors[insp.result]}`}>
                    {insp.result}
                  </span>
                </td>
                <td className="capitalize">{insp.defect_type || '-'}</td>
                <td>{(insp.confidence_score * 100).toFixed(1)}%</td>
                <td>
                  {insp.human_override ? (
                    <span className="badge-warning">Yes</span>
                  ) : (
                    <span className="text-gray-400">-</span>
                  )}
                </td>
                <td>{new Date(insp.inspection_timestamp).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {inspections.length === 0 && (
          <div className="p-12 text-center">
            <CheckCircle2 className="w-12 h-12 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No inspections</h3>
            <p className="text-gray-500 mb-4">Generate quality inspection data for testing.</p>
            <button onClick={generateInspections} className="btn-primary">
              <Plus className="w-4 h-4 mr-2" />
              Generate Inspections
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
