import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, Server, Activity, Thermometer, Cpu, HardDrive, AlertCircle } from 'lucide-react'
import Modal from '../components/Modal'

export default function DeviceDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [device, setDevice] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showDecommissionModal, setShowDecommissionModal] = useState(false)
  const [showMetricsModal, setShowMetricsModal] = useState(false)
  const [showConfigModal, setShowConfigModal] = useState(false)
  const [metrics, setMetrics] = useState([])
  const [metricsLoading, setMetricsLoading] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)
  const [actionError, setActionError] = useState('')
  const [actionSuccess, setActionSuccess] = useState('')
  const [deviceGroups, setDeviceGroups] = useState([])
  const [configForm, setConfigForm] = useState({
    name: '',
    status: '',
    ip_address: '',
    firmware_version: '',
    device_group_id: ''
  })

  useEffect(() => {
    fetchDevice()
  }, [id])

  async function fetchDevice() {
    try {
      const res = await fetch(`/api/devices/${id}`)
      const data = await res.json()
      setDevice(data.device)
    } catch (error) {
      console.error('Failed to fetch device:', error)
    } finally {
      setLoading(false)
    }
  }

  async function handleSendHeartbeat() {
    setActionLoading(true)
    setActionError('')
    setActionSuccess('')
    
    try {
      const res = await fetch(`/api/devices/${id}/heartbeat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cpu_usage: Math.random() * 100,
          memory_usage: Math.random() * 100,
          temperature_celsius: 20 + Math.random() * 40,
          network_latency_ms: Math.random() * 100,
          error_count: 0
        })
      })

      if (!res.ok) {
        throw new Error('Failed to send heartbeat')
      }

      setActionSuccess('Heartbeat sent successfully')
      fetchDevice() // Refresh device data
    } catch (error) {
      setActionError(error.message)
    } finally {
      setActionLoading(false)
    }
  }

  async function handleViewMetrics() {
    setShowMetricsModal(true)
    setMetricsLoading(true)
    
    try {
      const res = await fetch(`/api/devices/${id}/metrics?limit=50`)
      const data = await res.json()
      setMetrics(data.metrics || [])
    } catch (error) {
      console.error('Failed to fetch metrics:', error)
      setMetrics([])
    } finally {
      setMetricsLoading(false)
    }
  }

  async function handleOpenConfig() {
    setShowConfigModal(true)
    setActionError('')

    // Pre-fill form with current device values
    setConfigForm({
      name: device.name || '',
      status: device.status || 'offline',
      ip_address: device.ip_address || '',
      firmware_version: device.firmware_version || '',
      device_group_id: device.device_group_id || ''
    })

    // Fetch device groups for dropdown
    try {
      const res = await fetch('/api/device-groups')
      const data = await res.json()
      setDeviceGroups(data.groups || [])
    } catch (error) {
      console.error('Failed to fetch device groups:', error)
    }
  }

  async function handleSaveConfig() {
    setActionLoading(true)
    setActionError('')

    try {
      const res = await fetch(`/api/devices/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: configForm.name,
          status: configForm.status,
          ip_address: configForm.ip_address,
          firmware_version: configForm.firmware_version,
          device_group_id: configForm.device_group_id || null
        })
      })

      if (!res.ok) {
        throw new Error('Failed to update device configuration')
      }

      setActionSuccess('Device configuration updated successfully')
      setShowConfigModal(false)
      fetchDevice() // Refresh device data
    } catch (error) {
      setActionError(error.message)
    } finally {
      setActionLoading(false)
    }
  }

  async function handleDecommission() {
    setActionLoading(true)
    setActionError('')
    
    try {
      const res = await fetch(`/api/devices/${id}`, {
        method: 'DELETE'
      })

      if (!res.ok) {
        throw new Error('Failed to decommission device')
      }

      navigate('/devices')
    } catch (error) {
      setActionError(error.message)
    } finally {
      setActionLoading(false)
      setShowDecommissionModal(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!device) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Device not found</h2>
        <Link to="/devices" className="text-blue-600 hover:underline mt-2 inline-block">
          Back to devices
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link to="/devices" className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800">
          <ArrowLeft className="w-5 h-5 text-gray-500" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{device.name}</h1>
          <p className="text-gray-500 font-mono text-sm">{device.device_uid}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="card p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Device Information</h2>
            <dl className="grid grid-cols-2 gap-4">
              <div>
                <dt className="text-sm text-gray-500">Status</dt>
                <dd className="text-gray-900 dark:text-white capitalize">{device.status}</dd>
              </div>
              <div>
                <dt className="text-sm text-gray-500">Type</dt>
                <dd className="text-gray-900 dark:text-white capitalize">{device.type?.replace('_', ' ')}</dd>
              </div>
              <div>
                <dt className="text-sm text-gray-500">IP Address</dt>
                <dd className="text-gray-900 dark:text-white font-mono">{device.ip_address || 'N/A'}</dd>
              </div>
              <div>
                <dt className="text-sm text-gray-500">Firmware</dt>
                <dd className="text-gray-900 dark:text-white font-mono">{device.firmware_version || 'N/A'}</dd>
              </div>
              <div>
                <dt className="text-sm text-gray-500">Group</dt>
                <dd className="text-gray-900 dark:text-white">{device.group_name || 'Unassigned'}</dd>
              </div>
              <div>
                <dt className="text-sm text-gray-500">Facility</dt>
                <dd className="text-gray-900 dark:text-white">{device.facility_name || 'N/A'}</dd>
              </div>
            </dl>
          </div>

          {device.recent_metrics?.length > 0 && (
            <div className="card p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Recent Metrics</h2>
              <div className="grid grid-cols-4 gap-4">
                <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div className="flex items-center gap-2 text-gray-500 mb-2">
                    <Cpu className="w-4 h-4" />
                    <span className="text-sm">CPU</span>
                  </div>
                  <p className="metric-value text-gray-900 dark:text-white">
                    {device.recent_metrics[0].cpu_usage?.toFixed(1)}%
                  </p>
                </div>
                <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div className="flex items-center gap-2 text-gray-500 mb-2">
                    <HardDrive className="w-4 h-4" />
                    <span className="text-sm">Memory</span>
                  </div>
                  <p className="metric-value text-gray-900 dark:text-white">
                    {device.recent_metrics[0].memory_usage?.toFixed(1)}%
                  </p>
                </div>
                <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div className="flex items-center gap-2 text-gray-500 mb-2">
                    <Thermometer className="w-4 h-4" />
                    <span className="text-sm">Temp</span>
                  </div>
                  <p className="metric-value text-gray-900 dark:text-white">
                    {device.recent_metrics[0].temperature_celsius?.toFixed(1)}C
                  </p>
                </div>
                <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div className="flex items-center gap-2 text-gray-500 mb-2">
                    <Activity className="w-4 h-4" />
                    <span className="text-sm">Latency</span>
                  </div>
                  <p className="metric-value text-gray-900 dark:text-white">
                    {device.recent_metrics[0].network_latency_ms?.toFixed(0)}ms
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="space-y-6">
          {/* Action Messages */}
          {actionSuccess && (
            <div className="bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 p-3 rounded-lg text-sm">
              {actionSuccess}
            </div>
          )}
          {actionError && (
            <div className="bg-rose-50 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400 p-3 rounded-lg text-sm flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {actionError}
            </div>
          )}

          <div className="card p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Actions</h2>
            <div className="space-y-2">
              <button
                onClick={handleSendHeartbeat}
                disabled={actionLoading}
                className="btn-secondary w-full"
              >
                {actionLoading ? 'Sending...' : 'Send Heartbeat'}
              </button>
              <button
                onClick={handleViewMetrics}
                className="btn-secondary w-full"
              >
                View Metrics
              </button>
              <button
                onClick={handleOpenConfig}
                className="btn-secondary w-full"
              >
                Configure
              </button>
              <button
                onClick={() => setShowDecommissionModal(true)}
                className="btn-danger w-full"
              >
                Decommission
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Decommission Confirmation Modal */}
      <Modal
        isOpen={showDecommissionModal}
        onClose={() => setShowDecommissionModal(false)}
        title="Decommission Device"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-gray-600 dark:text-gray-300">
            Are you sure you want to decommission <strong>{device.name}</strong>? This will mark the device as inactive and remove it from active monitoring.
          </p>
          
          {actionError && (
            <div className="flex items-center gap-2 p-3 bg-rose-50 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400 rounded-lg text-sm">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {actionError}
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              onClick={() => setShowDecommissionModal(false)}
              disabled={actionLoading}
              className="btn-secondary"
            >
              Cancel
            </button>
            <button
              onClick={handleDecommission}
              disabled={actionLoading}
              className="btn-danger"
            >
              {actionLoading ? 'Decommissioning...' : 'Decommission'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Metrics History Modal */}
      <Modal
        isOpen={showMetricsModal}
        onClose={() => setShowMetricsModal(false)}
        title="Metrics History"
        size="lg"
      >
        <div className="space-y-4">
          {metricsLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : metrics.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              No metrics data available
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 dark:bg-gray-800">
                  <tr>
                    <th className="px-4 py-2 text-left text-gray-600 dark:text-gray-400">Timestamp</th>
                    <th className="px-4 py-2 text-right text-gray-600 dark:text-gray-400">CPU %</th>
                    <th className="px-4 py-2 text-right text-gray-600 dark:text-gray-400">Memory %</th>
                    <th className="px-4 py-2 text-right text-gray-600 dark:text-gray-400">Temp °C</th>
                    <th className="px-4 py-2 text-right text-gray-600 dark:text-gray-400">Latency ms</th>
                    <th className="px-4 py-2 text-right text-gray-600 dark:text-gray-400">Errors</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {metrics.map((metric, idx) => (
                    <tr key={metric.id || idx} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                      <td className="px-4 py-2 text-gray-900 dark:text-white whitespace-nowrap">
                        {new Date(metric.timestamp).toLocaleString()}
                      </td>
                      <td className="px-4 py-2 text-right text-gray-900 dark:text-white">
                        {metric.cpu_usage?.toFixed(1) || 'N/A'}
                      </td>
                      <td className="px-4 py-2 text-right text-gray-900 dark:text-white">
                        {metric.memory_usage?.toFixed(1) || 'N/A'}
                      </td>
                      <td className="px-4 py-2 text-right text-gray-900 dark:text-white">
                        {metric.temperature_celsius?.toFixed(1) || 'N/A'}
                      </td>
                      <td className="px-4 py-2 text-right text-gray-900 dark:text-white">
                        {metric.network_latency_ms?.toFixed(0) || 'N/A'}
                      </td>
                      <td className="px-4 py-2 text-right text-gray-900 dark:text-white">
                        {metric.error_count || 0}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          
          <div className="flex justify-end pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              onClick={() => setShowMetricsModal(false)}
              className="btn-secondary"
            >
              Close
            </button>
          </div>
        </div>
      </Modal>

      {/* Configuration Modal */}
      <Modal
        isOpen={showConfigModal}
        onClose={() => setShowConfigModal(false)}
        title="Configure Device"
        size="md"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Device Name
            </label>
            <input
              type="text"
              value={configForm.name}
              onChange={(e) => setConfigForm({ ...configForm, name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Status
            </label>
            <select
              value={configForm.status}
              onChange={(e) => setConfigForm({ ...configForm, status: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="online">Online</option>
              <option value="offline">Offline</option>
              <option value="warning">Warning</option>
              <option value="error">Error</option>
              <option value="maintenance">Maintenance</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              IP Address
            </label>
            <input
              type="text"
              value={configForm.ip_address}
              onChange={(e) => setConfigForm({ ...configForm, ip_address: e.target.value })}
              placeholder="192.168.1.100"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Firmware Version
            </label>
            <input
              type="text"
              value={configForm.firmware_version}
              onChange={(e) => setConfigForm({ ...configForm, firmware_version: e.target.value })}
              placeholder="1.0.0"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Device Group
            </label>
            <select
              value={configForm.device_group_id}
              onChange={(e) => setConfigForm({ ...configForm, device_group_id: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Unassigned</option>
              {deviceGroups.map((group) => (
                <option key={group.id} value={group.id}>
                  {group.name} ({group.zone})
                </option>
              ))}
            </select>
          </div>

          {actionError && (
            <div className="flex items-center gap-2 p-3 bg-rose-50 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400 rounded-lg text-sm">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {actionError}
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              onClick={() => setShowConfigModal(false)}
              disabled={actionLoading}
              className="btn-secondary"
            >
              Cancel
            </button>
            <button
              onClick={handleSaveConfig}
              disabled={actionLoading}
              className="btn-primary"
            >
              {actionLoading ? 'Saving...' : 'Save Configuration'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
