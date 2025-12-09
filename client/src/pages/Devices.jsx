import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Server, Plus, Search, Filter, Wifi, WifiOff, AlertTriangle } from 'lucide-react'

const statusColors = {
  online: 'bg-emerald-500',
  offline: 'bg-rose-500',
  warning: 'bg-amber-500',
  error: 'bg-rose-600',
  maintenance: 'bg-slate-500'
}

const statusLabels = {
  online: 'Online',
  offline: 'Offline',
  warning: 'Warning',
  error: 'Error',
  maintenance: 'Maintenance'
}

export default function Devices() {
  const [devices, setDevices] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('')

  useEffect(() => {
    fetchDevices()
  }, [])

  async function fetchDevices() {
    try {
      const res = await fetch('/api/devices')
      const data = await res.json()
      setDevices(data.devices || [])
    } catch (error) {
      console.error('Failed to fetch devices:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredDevices = devices.filter(d =>
    d.name.toLowerCase().includes(filter.toLowerCase()) ||
    d.device_uid.toLowerCase().includes(filter.toLowerCase())
  )

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
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Devices</h1>
          <p className="text-gray-500 dark:text-gray-400">Manage your edge device fleet</p>
        </div>
        <button className="btn-primary">
          <Plus className="w-4 h-4 mr-2" />
          Add Device
        </button>
      </div>

      {/* Filters */}
      <div className="card p-4">
        <div className="flex items-center gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search devices..."
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

      {/* Device Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredDevices.map((device) => (
          <Link
            key={device.id}
            to={`/devices/${device.id}`}
            className="card-hover p-4"
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center">
                  <Server className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                </div>
                <div>
                  <h3 className="font-medium text-gray-900 dark:text-white">{device.name}</h3>
                  <p className="text-xs text-gray-500 font-mono">{device.device_uid}</p>
                </div>
              </div>
              <div className={`w-2.5 h-2.5 rounded-full ${statusColors[device.status]}`} />
            </div>

            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <span className="text-gray-500">Status</span>
                <p className="text-gray-900 dark:text-white">{statusLabels[device.status]}</p>
              </div>
              <div>
                <span className="text-gray-500">Type</span>
                <p className="text-gray-900 dark:text-white capitalize">{device.type?.replace('_', ' ')}</p>
              </div>
            </div>

            {device.last_heartbeat && (
              <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                <span className="text-xs text-gray-500">
                  Last heartbeat: {new Date(device.last_heartbeat).toLocaleString()}
                </span>
              </div>
            )}
          </Link>
        ))}
      </div>

      {filteredDevices.length === 0 && (
        <div className="card p-12 text-center">
          <Server className="w-12 h-12 mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No devices found</h3>
          <p className="text-gray-500 mb-4">Get started by adding your first edge device.</p>
          <button className="btn-primary">
            <Plus className="w-4 h-4 mr-2" />
            Add Device
          </button>
        </div>
      )}
    </div>
  )
}
