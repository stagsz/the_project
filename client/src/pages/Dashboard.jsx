import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  Server,
  Brain,
  Activity,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  TrendingUp,
  Zap
} from 'lucide-react'

export default function Dashboard() {
  const [stats, setStats] = useState({
    devices: { total: 0, online: 0, offline: 0, warning: 0, error: 0 },
    models: { total: 0, active: 0 },
    training: { active: 0, completed: 0 },
    anomalies: { new: 0, critical: 0 }
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchDashboardData()
  }, [])

  async function fetchDashboardData() {
    try {
      // Fetch devices
      const devicesRes = await fetch('/api/devices')
      const devicesData = await devicesRes.json()

      // Fetch models
      const modelsRes = await fetch('/api/models')
      const modelsData = await modelsRes.json()

      // Fetch training rounds
      const trainingRes = await fetch('/api/training/rounds?limit=100')
      const trainingData = await trainingRes.json()

      // Fetch anomalies
      const anomaliesRes = await fetch('/api/anomalies?status=new&limit=100')
      const anomaliesData = await anomaliesRes.json()

      const devices = devicesData.devices || []
      const models = modelsData.models || []
      const rounds = trainingData.rounds || []
      const anomalies = anomaliesData.anomalies || []

      setStats({
        devices: {
          total: devices.length,
          online: devices.filter(d => d.status === 'online').length,
          offline: devices.filter(d => d.status === 'offline').length,
          warning: devices.filter(d => d.status === 'warning').length,
          error: devices.filter(d => d.status === 'error').length
        },
        models: {
          total: models.length,
          active: models.filter(m => m.status === 'active').length
        },
        training: {
          active: rounds.filter(r => r.status === 'in_progress').length,
          completed: rounds.filter(r => r.status === 'completed').length
        },
        anomalies: {
          new: anomalies.length,
          critical: anomalies.filter(a => a.severity === 'critical').length
        }
      })
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error)
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
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
        <p className="text-gray-500 dark:text-gray-400">Overview of your federated learning platform</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Devices */}
        <Link to="/devices" className="card-hover p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Total Devices</p>
              <p className="metric-value text-gray-900 dark:text-white">{stats.devices.total}</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/50 rounded-lg flex items-center justify-center">
              <Server className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
          <div className="mt-4 flex items-center gap-4 text-sm">
            <span className="flex items-center gap-1 text-emerald-600">
              <CheckCircle className="w-4 h-4" />
              {stats.devices.online} online
            </span>
            <span className="flex items-center gap-1 text-rose-600">
              <XCircle className="w-4 h-4" />
              {stats.devices.offline} offline
            </span>
          </div>
        </Link>

        {/* Models */}
        <Link to="/models" className="card-hover p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">ML Models</p>
              <p className="metric-value text-gray-900 dark:text-white">{stats.models.total}</p>
            </div>
            <div className="w-12 h-12 bg-violet-100 dark:bg-violet-900/50 rounded-lg flex items-center justify-center">
              <Brain className="w-6 h-6 text-violet-600 dark:text-violet-400" />
            </div>
          </div>
          <div className="mt-4 flex items-center gap-2 text-sm text-emerald-600">
            <Zap className="w-4 h-4" />
            {stats.models.active} active
          </div>
        </Link>

        {/* Training */}
        <Link to="/training" className="card-hover p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Training Rounds</p>
              <p className="metric-value text-gray-900 dark:text-white">{stats.training.active}</p>
            </div>
            <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-900/50 rounded-lg flex items-center justify-center">
              <Activity className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
            </div>
          </div>
          <div className="mt-4 flex items-center gap-2 text-sm text-gray-500">
            <TrendingUp className="w-4 h-4" />
            {stats.training.completed} completed
          </div>
        </Link>

        {/* Anomalies */}
        <Link to="/anomalies" className="card-hover p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">New Anomalies</p>
              <p className="metric-value text-gray-900 dark:text-white">{stats.anomalies.new}</p>
            </div>
            <div className="w-12 h-12 bg-amber-100 dark:bg-amber-900/50 rounded-lg flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-amber-600 dark:text-amber-400" />
            </div>
          </div>
          <div className="mt-4 flex items-center gap-2 text-sm text-rose-600">
            <Clock className="w-4 h-4" />
            {stats.anomalies.critical} critical
          </div>
        </Link>
      </div>

      {/* Quick Actions */}
      <div className="card p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link
            to="/training"
            className="flex items-center gap-3 p-4 bg-blue-50 dark:bg-blue-900/30 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors"
          >
            <Activity className="w-5 h-5 text-blue-600" />
            <span className="text-sm font-medium text-blue-700 dark:text-blue-400">Start Training Round</span>
          </Link>
          <Link
            to="/devices"
            className="flex items-center gap-3 p-4 bg-emerald-50 dark:bg-emerald-900/30 rounded-lg hover:bg-emerald-100 dark:hover:bg-emerald-900/50 transition-colors"
          >
            <Server className="w-5 h-5 text-emerald-600" />
            <span className="text-sm font-medium text-emerald-700 dark:text-emerald-400">Add New Device</span>
          </Link>
          <Link
            to="/anomalies"
            className="flex items-center gap-3 p-4 bg-amber-50 dark:bg-amber-900/30 rounded-lg hover:bg-amber-100 dark:hover:bg-amber-900/50 transition-colors"
          >
            <AlertTriangle className="w-5 h-5 text-amber-600" />
            <span className="text-sm font-medium text-amber-700 dark:text-amber-400">Review Anomalies</span>
          </Link>
        </div>
      </div>

      {/* System Status */}
      <div className="card p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">System Status</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 bg-emerald-500 rounded-full animate-pulse"></div>
              <span className="text-sm text-gray-700 dark:text-gray-300">API Server</span>
            </div>
            <span className="text-sm text-emerald-600">Operational</span>
          </div>
          <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 bg-emerald-500 rounded-full animate-pulse"></div>
              <span className="text-sm text-gray-700 dark:text-gray-300">WebSocket</span>
            </div>
            <span className="text-sm text-emerald-600">Connected</span>
          </div>
          <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 bg-emerald-500 rounded-full animate-pulse"></div>
              <span className="text-sm text-gray-700 dark:text-gray-300">Database</span>
            </div>
            <span className="text-sm text-emerald-600">Healthy</span>
          </div>
          <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 bg-amber-500 rounded-full"></div>
              <span className="text-sm text-gray-700 dark:text-gray-300">AI Service</span>
            </div>
            <span className="text-sm text-amber-600">Check API Key</span>
          </div>
        </div>
      </div>
    </div>
  )
}
