import { useState } from 'react'
import { BarChart3, Download, Calendar, Filter } from 'lucide-react'

const reportTypes = [
  { id: 'training-performance', name: 'Training Performance', description: 'Training metrics and convergence over time' },
  { id: 'device-participation', name: 'Device Participation', description: 'Device participation rates in training rounds' },
  { id: 'model-comparison', name: 'Model Comparison', description: 'Compare performance across model versions' },
  { id: 'anomaly-frequency', name: 'Anomaly Frequency', description: 'Anomaly detection frequency analysis' },
  { id: 'maintenance-costs', name: 'Maintenance Costs', description: 'Maintenance cost projections and history' },
  { id: 'quality-summary', name: 'Quality Summary', description: 'Quality inspection metrics and trends' },
  { id: 'privacy-budget', name: 'Privacy Budget', description: 'Differential privacy budget consumption' }
]

export default function Reports() {
  const [selectedReport, setSelectedReport] = useState(null)
  const [loading, setLoading] = useState(false)
  const [reportData, setReportData] = useState(null)

  async function generateReport(reportType) {
    setLoading(true)
    setSelectedReport(reportType)
    try {
      const res = await fetch(`/api/reports/${reportType}`)
      const data = await res.json()
      setReportData(data)
    } catch (error) {
      console.error('Failed to generate report:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Reports</h1>
        <p className="text-gray-500 dark:text-gray-400">Generate and export analytics reports</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {reportTypes.map((report) => (
          <button
            key={report.id}
            onClick={() => generateReport(report.id)}
            className={`card-hover p-4 text-left ${selectedReport === report.id ? 'ring-2 ring-blue-500' : ''}`}
          >
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/50 rounded-lg flex items-center justify-center flex-shrink-0">
                <BarChart3 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h3 className="font-medium text-gray-900 dark:text-white">{report.name}</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">{report.description}</p>
              </div>
            </div>
          </button>
        ))}
      </div>

      {loading && (
        <div className="card p-12 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-gray-500 mt-4">Generating report...</p>
        </div>
      )}

      {reportData && !loading && (
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              {reportTypes.find(r => r.id === selectedReport)?.name}
            </h2>
            <button className="btn-secondary">
              <Download className="w-4 h-4 mr-2" />
              Export
            </button>
          </div>
          <pre className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg overflow-auto text-sm font-mono">
            {JSON.stringify(reportData, null, 2)}
          </pre>
        </div>
      )}
    </div>
  )
}
