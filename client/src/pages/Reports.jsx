import { useState } from 'react'
import { BarChart3, Download, Calendar, FileText, TrendingUp, Users, AlertTriangle, Wrench, CheckCircle, Shield } from 'lucide-react'
import { format, subDays } from 'date-fns'
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts'

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899']

const reportTypes = [
  { id: 'training-performance', name: 'Training Performance', description: 'Training metrics and convergence over time', icon: TrendingUp },
  { id: 'device-participation', name: 'Device Participation', description: 'Device participation rates in training rounds', icon: Users },
  { id: 'model-comparison', name: 'Model Comparison', description: 'Compare performance across model versions', icon: BarChart3 },
  { id: 'anomaly-frequency', name: 'Anomaly Frequency', description: 'Anomaly detection frequency analysis', icon: AlertTriangle },
  { id: 'maintenance-costs', name: 'Maintenance Costs', description: 'Maintenance cost projections and history', icon: Wrench },
  { id: 'quality-summary', name: 'Quality Summary', description: 'Quality inspection metrics and trends', icon: CheckCircle },
  { id: 'privacy-budget', name: 'Privacy Budget', description: 'Differential privacy budget consumption', icon: Shield }
]

export default function Reports() {
  const [selectedReport, setSelectedReport] = useState(null)
  const [loading, setLoading] = useState(false)
  const [reportData, setReportData] = useState(null)
  const [dateRange, setDateRange] = useState({
    from: format(subDays(new Date(), 30), 'yyyy-MM-dd'),
    to: format(new Date(), 'yyyy-MM-dd')
  })

  async function generateReport(reportType) {
    setLoading(true)
    setSelectedReport(reportType)
    try {
      const params = new URLSearchParams({
        from: dateRange.from,
        to: dateRange.to
      })
      const res = await fetch(`/api/reports/${reportType}?${params}`)
      const data = await res.json()
      setReportData(data)
    } catch (error) {
      console.error('Failed to generate report:', error)
    } finally {
      setLoading(false)
    }
  }

  function exportToCSV() {
    if (!reportData) return

    let csvContent = ''
    const data = reportData.data || []

    if (data.length > 0) {
      // Headers
      csvContent += Object.keys(data[0]).join(',') + '\n'
      // Data rows
      data.forEach(row => {
        csvContent += Object.values(row).map(v => `"${v ?? ''}"`).join(',') + '\n'
      })
    }

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `${selectedReport}-${dateRange.from}-to-${dateRange.to}.csv`
    link.click()
  }

  function renderChart() {
    if (!reportData) return null

    switch (selectedReport) {
      case 'training-performance':
        return <TrainingPerformanceChart data={reportData.data || []} />
      case 'device-participation':
        return <DeviceParticipationChart data={reportData.data || []} />
      case 'model-comparison':
        return <ModelComparisonChart data={reportData.data || []} />
      case 'anomaly-frequency':
        return <AnomalyFrequencyChart data={reportData} />
      case 'maintenance-costs':
        return <MaintenanceCostsChart data={reportData} />
      case 'quality-summary':
        return <QualitySummaryChart data={reportData} />
      case 'privacy-budget':
        return <PrivacyBudgetChart data={reportData} />
      default:
        return <pre className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg overflow-auto text-sm">{JSON.stringify(reportData, null, 2)}</pre>
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Reports</h1>
          <p className="text-gray-500 dark:text-gray-400">Generate and export analytics reports</p>
        </div>
      </div>

      {/* Date Range Filters */}
      <div className="card p-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-gray-400" />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Date Range:</span>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={dateRange.from}
              onChange={(e) => setDateRange({ ...dateRange, from: e.target.value })}
              className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500"
            />
            <span className="text-gray-500">to</span>
            <input
              type="date"
              value={dateRange.to}
              onChange={(e) => setDateRange({ ...dateRange, to: e.target.value })}
              className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setDateRange({ from: format(subDays(new Date(), 7), 'yyyy-MM-dd'), to: format(new Date(), 'yyyy-MM-dd') })}
              className="px-3 py-1.5 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600"
            >
              Last 7 days
            </button>
            <button
              onClick={() => setDateRange({ from: format(subDays(new Date(), 30), 'yyyy-MM-dd'), to: format(new Date(), 'yyyy-MM-dd') })}
              className="px-3 py-1.5 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600"
            >
              Last 30 days
            </button>
            <button
              onClick={() => setDateRange({ from: format(subDays(new Date(), 90), 'yyyy-MM-dd'), to: format(new Date(), 'yyyy-MM-dd') })}
              className="px-3 py-1.5 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600"
            >
              Last 90 days
            </button>
          </div>
        </div>
      </div>

      {/* Report Type Selection */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {reportTypes.map((report) => {
          const Icon = report.icon
          return (
            <button
              key={report.id}
              onClick={() => generateReport(report.id)}
              className={`card p-4 text-left transition-all hover:shadow-md ${
                selectedReport === report.id ? 'ring-2 ring-blue-500 bg-blue-50 dark:bg-blue-900/20' : ''
              }`}
            >
              <div className="flex items-start gap-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                  selectedReport === report.id
                    ? 'bg-blue-500 text-white'
                    : 'bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400'
                }`}>
                  <Icon className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-medium text-gray-900 dark:text-white">{report.name}</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{report.description}</p>
                </div>
              </div>
            </button>
          )
        })}
      </div>

      {/* Loading State */}
      {loading && (
        <div className="card p-12 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-gray-500 mt-4">Generating report...</p>
        </div>
      )}

      {/* Report Results */}
      {reportData && !loading && (
        <div className="card p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                {reportTypes.find(r => r.id === selectedReport)?.name}
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                {dateRange.from} to {dateRange.to}
              </p>
            </div>
            <div className="flex gap-2">
              <button onClick={exportToCSV} className="btn-secondary">
                <Download className="w-4 h-4 mr-2" />
                Export CSV
              </button>
              <button onClick={() => generateReport(selectedReport)} className="btn-primary">
                Refresh
              </button>
            </div>
          </div>

          {renderChart()}
        </div>
      )}

      {/* Empty State */}
      {!selectedReport && !loading && (
        <div className="card p-12 text-center">
          <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Select a Report</h3>
          <p className="text-gray-500">Choose a report type above to generate analytics</p>
        </div>
      )}
    </div>
  )
}

// Training Performance Chart Component
function TrainingPerformanceChart({ data }) {
  if (data.length === 0) {
    return <EmptyChart message="No training data available for this period" />
  }

  return (
    <div className="space-y-6">
      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
            <XAxis dataKey="period" tick={{ fontSize: 12 }} />
            <YAxis yAxisId="left" tick={{ fontSize: 12 }} />
            <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12 }} />
            <Tooltip
              contentStyle={{ backgroundColor: 'var(--tooltip-bg, #1f2937)', border: 'none', borderRadius: '8px' }}
              labelStyle={{ color: 'var(--tooltip-label, #9ca3af)' }}
            />
            <Legend />
            <Line yAxisId="left" type="monotone" dataKey="avg_accuracy" stroke="#10b981" strokeWidth={2} name="Avg Accuracy" dot={{ r: 4 }} />
            <Line yAxisId="right" type="monotone" dataKey="avg_loss" stroke="#ef4444" strokeWidth={2} name="Avg Loss" dot={{ r: 4 }} />
            <Line yAxisId="left" type="monotone" dataKey="rounds" stroke="#3b82f6" strokeWidth={2} name="Rounds" dot={{ r: 4 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <div className="grid grid-cols-3 gap-4">
        <StatCard label="Total Rounds" value={data.reduce((sum, d) => sum + (d.rounds || 0), 0)} />
        <StatCard label="Avg Accuracy" value={`${(data.reduce((sum, d) => sum + (d.avg_accuracy || 0), 0) / data.length * 100).toFixed(1)}%`} />
        <StatCard label="Total Samples" value={data.reduce((sum, d) => sum + (d.total_samples || 0), 0).toLocaleString()} />
      </div>
    </div>
  )
}

// Device Participation Chart Component
function DeviceParticipationChart({ data }) {
  if (data.length === 0) {
    return <EmptyChart message="No device participation data available" />
  }

  const chartData = data.slice(0, 10).map(d => ({
    name: d.name?.substring(0, 15) || 'Unknown',
    successful: d.successful || 0,
    failed: d.failed || 0,
    rate: parseFloat(d.participation_rate) || 0
  }))

  return (
    <div className="space-y-6">
      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
            <XAxis type="number" tick={{ fontSize: 12 }} />
            <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 11 }} />
            <Tooltip />
            <Legend />
            <Bar dataKey="successful" fill="#10b981" name="Successful" stackId="a" />
            <Bar dataKey="failed" fill="#ef4444" name="Failed" stackId="a" />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="grid grid-cols-3 gap-4">
        <StatCard label="Total Devices" value={data.length} />
        <StatCard label="Avg Participation Rate" value={`${(data.reduce((sum, d) => sum + parseFloat(d.participation_rate || 0), 0) / data.length).toFixed(1)}%`} />
        <StatCard label="Total Contributions" value={data.reduce((sum, d) => sum + (d.total || 0), 0)} />
      </div>
    </div>
  )
}

// Model Comparison Chart Component
function ModelComparisonChart({ data }) {
  if (data.length === 0) {
    return <EmptyChart message="No model versions to compare" />
  }

  const chartData = data.map(d => ({
    version: d.version || 'N/A',
    accuracy: (d.accuracy || 0) * 100,
    loss: d.loss || 0,
    deployments: d.deployment_count || 0
  }))

  return (
    <div className="space-y-6">
      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
            <XAxis dataKey="version" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip />
            <Legend />
            <Bar dataKey="accuracy" fill="#3b82f6" name="Accuracy %" />
            <Bar dataKey="deployments" fill="#10b981" name="Deployments" />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 dark:bg-gray-800">
            <tr>
              <th className="px-4 py-2 text-left">Version</th>
              <th className="px-4 py-2 text-left">Model</th>
              <th className="px-4 py-2 text-right">Accuracy</th>
              <th className="px-4 py-2 text-right">Loss</th>
              <th className="px-4 py-2 text-right">Deployments</th>
              <th className="px-4 py-2 text-center">Deployed</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {data.map((row, idx) => (
              <tr key={idx}>
                <td className="px-4 py-2 font-mono">{row.version}</td>
                <td className="px-4 py-2">{row.model_name}</td>
                <td className="px-4 py-2 text-right">{row.accuracy ? `${(row.accuracy * 100).toFixed(1)}%` : 'N/A'}</td>
                <td className="px-4 py-2 text-right">{row.loss?.toFixed(4) || 'N/A'}</td>
                <td className="px-4 py-2 text-right">{row.deployment_count}</td>
                <td className="px-4 py-2 text-center">
                  {row.is_deployed ? (
                    <span className="px-2 py-0.5 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 rounded-full text-xs">Active</span>
                  ) : (
                    <span className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded-full text-xs">No</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// Anomaly Frequency Chart Component
function AnomalyFrequencyChart({ data }) {
  const timeData = data.data || []
  const byType = data.summary?.by_type || []
  const bySeverity = data.summary?.by_severity || []

  if (timeData.length === 0 && byType.length === 0) {
    return <EmptyChart message="No anomaly data available for this period" />
  }

  return (
    <div className="space-y-6">
      {timeData.length > 0 && (
        <div className="h-64">
          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Anomalies Over Time</h3>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={timeData}>
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis dataKey="period" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Area type="monotone" dataKey="count" fill="#f59e0b" stroke="#f59e0b" fillOpacity={0.3} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
      <div className="grid grid-cols-2 gap-6">
        {byType.length > 0 && (
          <div>
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">By Type</h3>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={byType} dataKey="count" nameKey="anomaly_type" cx="50%" cy="50%" outerRadius={70} label={({ anomaly_type, count }) => `${anomaly_type}: ${count}`}>
                    {byType.map((_, idx) => <Cell key={idx} fill={COLORS[idx % COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
        {bySeverity.length > 0 && (
          <div>
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">By Severity</h3>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={bySeverity} dataKey="count" nameKey="severity" cx="50%" cy="50%" outerRadius={70} label={({ severity, count }) => `${severity}: ${count}`}>
                    {bySeverity.map((entry, idx) => (
                      <Cell key={idx} fill={entry.severity === 'critical' ? '#ef4444' : entry.severity === 'high' ? '#f59e0b' : entry.severity === 'medium' ? '#3b82f6' : '#10b981'} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// Maintenance Costs Chart Component
function MaintenanceCostsChart({ data }) {
  const costData = data.data || []
  const byStatus = data.by_status || []

  if (costData.length === 0 && byStatus.length === 0) {
    return <EmptyChart message="No maintenance cost data available" />
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-4 gap-4">
        {byStatus.map((s, idx) => (
          <StatCard
            key={idx}
            label={s.status?.charAt(0).toUpperCase() + s.status?.slice(1) || 'Unknown'}
            value={`$${(s.total_cost || 0).toLocaleString()}`}
            sublabel={`${s.count} items`}
          />
        ))}
      </div>
      {costData.length > 0 && (
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={costData}>
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis dataKey="risk_level" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip formatter={(value) => `$${value.toLocaleString()}`} />
              <Legend />
              <Bar dataKey="total_cost" fill="#3b82f6" name="Total Cost" />
              <Bar dataKey="avg_cost" fill="#10b981" name="Avg Cost" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}

// Quality Summary Chart Component
function QualitySummaryChart({ data }) {
  const summary = data.summary || {}
  const defects = data.defects || []

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-5 gap-4">
        <StatCard label="Total Inspections" value={summary.total || 0} />
        <StatCard label="Passed" value={summary.passed || 0} className="text-emerald-600" />
        <StatCard label="Failed" value={summary.failed || 0} className="text-rose-600" />
        <StatCard label="Warnings" value={summary.warning || 0} className="text-amber-600" />
        <StatCard label="Pass Rate" value={`${summary.pass_rate || 0}%`} />
      </div>
      {defects.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Defects by Type</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={defects} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis type="number" tick={{ fontSize: 12 }} />
                <YAxis dataKey="defect_type" type="category" width={120} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="count" fill="#ef4444" name="Count" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
      {defects.length === 0 && summary.total > 0 && (
        <div className="text-center py-8 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg">
          <CheckCircle className="w-12 h-12 text-emerald-500 mx-auto mb-2" />
          <p className="text-emerald-700 dark:text-emerald-400 font-medium">No defects recorded!</p>
        </div>
      )}
    </div>
  )
}

// Privacy Budget Chart Component
function PrivacyBudgetChart({ data }) {
  const logs = data.logs || []
  const byModel = data.by_model || []

  if (logs.length === 0 && byModel.length === 0) {
    return <EmptyChart message="No privacy budget data available" />
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-4">
        {byModel.map((m, idx) => (
          <div key={idx} className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <p className="text-sm text-gray-500">{m.name}</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{m.total_epsilon?.toFixed(3) || 0}</p>
            <div className="mt-2">
              <div className="flex justify-between text-xs text-gray-500 mb-1">
                <span>Budget Used</span>
                <span>{m.budget_limit ? `${((m.total_epsilon / m.budget_limit) * 100).toFixed(1)}%` : 'N/A'}</span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div
                  className="bg-blue-500 h-2 rounded-full"
                  style={{ width: `${Math.min((m.total_epsilon / (m.budget_limit || 1)) * 100, 100)}%` }}
                />
              </div>
            </div>
          </div>
        ))}
      </div>
      {logs.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-800">
              <tr>
                <th className="px-4 py-2 text-left">Model</th>
                <th className="px-4 py-2 text-left">Round</th>
                <th className="px-4 py-2 text-right">Epsilon Consumed</th>
                <th className="px-4 py-2 text-right">Cumulative</th>
                <th className="px-4 py-2 text-left">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {logs.slice(0, 20).map((log, idx) => (
                <tr key={idx}>
                  <td className="px-4 py-2">{log.model_name}</td>
                  <td className="px-4 py-2">Round {log.round_number || 'N/A'}</td>
                  <td className="px-4 py-2 text-right font-mono">{log.epsilon_consumed?.toFixed(4)}</td>
                  <td className="px-4 py-2 text-right font-mono">{log.cumulative_epsilon?.toFixed(4)}</td>
                  <td className="px-4 py-2 text-gray-500">{log.timestamp ? new Date(log.timestamp).toLocaleString() : 'N/A'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// Stat Card Helper Component
function StatCard({ label, value, sublabel, className = '' }) {
  return (
    <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
      <p className="text-sm text-gray-500">{label}</p>
      <p className={`text-2xl font-bold text-gray-900 dark:text-white ${className}`}>{value}</p>
      {sublabel && <p className="text-xs text-gray-400 mt-1">{sublabel}</p>}
    </div>
  )
}

// Empty Chart Helper Component
function EmptyChart({ message }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-gray-500">
      <BarChart3 className="w-12 h-12 mb-3 opacity-50" />
      <p>{message}</p>
    </div>
  )
}
