import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, Server, Activity, Thermometer, Cpu, HardDrive } from 'lucide-react'

export default function DeviceDetail() {
  const { id } = useParams()
  const [device, setDevice] = useState(null)
  const [loading, setLoading] = useState(true)

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
          <div className="card p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Actions</h2>
            <div className="space-y-2">
              <button className="btn-secondary w-full">Send Heartbeat</button>
              <button className="btn-secondary w-full">View Metrics</button>
              <button className="btn-secondary w-full">Configure</button>
              <button className="btn-danger w-full">Decommission</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
