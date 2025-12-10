import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { Server, Plus, Search, Filter, AlertCircle, Upload, Database, FileSpreadsheet, CheckCircle2, X } from 'lucide-react'
import Modal from '../components/Modal'

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

const deviceTypes = [
  { value: 'edge_compute', label: 'Edge Compute' },
  { value: 'sensor_gateway', label: 'Sensor Gateway' },
  { value: 'plc', label: 'PLC' },
  { value: 'camera', label: 'Camera' },
  { value: 'simulated', label: 'Simulated Device (Dataset Upload)' }
]

export default function Devices() {
  const [devices, setDevices] = useState([])
  const [deviceGroups, setDeviceGroups] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('')
  const [showAddModal, setShowAddModal] = useState(false)
  const [newDevice, setNewDevice] = useState({
    name: '',
    device_uid: '',
    type: 'edge_compute',
    device_group_id: '',
    ip_address: '',
    firmware_version: '1.0.0'
  })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [uploadedFile, setUploadedFile] = useState(null)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [datasetPreview, setDatasetPreview] = useState(null)
  const fileInputRef = useRef(null)

  useEffect(() => {
    fetchDevices()
    fetchDeviceGroups()
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

  async function fetchDeviceGroups() {
    try {
      const res = await fetch('/api/device-groups')
      const data = await res.json()
      setDeviceGroups(data.groups || [])
    } catch (error) {
      console.error('Failed to fetch device groups:', error)
    }
  }

  function generateUID() {
    const prefix = newDevice.type === 'simulated' ? 'SIM' : deviceTypes.find(t => t.value === newDevice.type)?.value.substring(0, 2).toUpperCase() || 'DV'
    const timestamp = Date.now().toString(36).toUpperCase()
    const random = Math.random().toString(36).substring(2, 6).toUpperCase()
    return `${prefix}-${timestamp}-${random}`
  }

  function handleFileSelect(e) {
    const file = e.target.files[0]
    if (!file) return

    const validTypes = ['text/csv', 'application/json', 'application/vnd.apache.parquet']
    const validExtensions = ['.csv', '.json', '.parquet']
    const fileExtension = file.name.substring(file.name.lastIndexOf('.')).toLowerCase()

    if (!validExtensions.includes(fileExtension)) {
      setError('Please upload a CSV, JSON, or Parquet file')
      return
    }

    setUploadedFile(file)
    setError('')

    // Preview CSV files
    if (fileExtension === '.csv') {
      const reader = new FileReader()
      reader.onload = (event) => {
        const text = event.target.result
        const lines = text.split('\n').slice(0, 6) // Header + 5 rows
        const headers = lines[0].split(',').map(h => h.trim())
        const rows = lines.slice(1).map(line => line.split(',').map(c => c.trim()))
        setDatasetPreview({ headers, rows, totalRows: text.split('\n').length - 1 })
      }
      reader.readAsText(file)
    } else if (fileExtension === '.json') {
      const reader = new FileReader()
      reader.onload = (event) => {
        try {
          const data = JSON.parse(event.target.result)
          const records = Array.isArray(data) ? data : data.data || data.records || [data]
          const headers = Object.keys(records[0] || {})
          const rows = records.slice(0, 5).map(r => headers.map(h => String(r[h] || '')))
          setDatasetPreview({ headers, rows, totalRows: records.length })
        } catch {
          setDatasetPreview(null)
        }
      }
      reader.readAsText(file)
    } else {
      setDatasetPreview({ headers: ['Parquet file'], rows: [], totalRows: 'Unknown' })
    }
  }

  function clearUploadedFile() {
    setUploadedFile(null)
    setDatasetPreview(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  async function handleCreateDevice(e) {
    e.preventDefault()
    setError('')
    setSubmitting(true)

    try {
      // For simulated devices, require a dataset file
      if (newDevice.type === 'simulated' && !uploadedFile) {
        throw new Error('Please upload a dataset file for the simulated device')
      }

      const deviceData = {
        ...newDevice,
        device_uid: newDevice.device_uid || generateUID(),
        device_group_id: newDevice.device_group_id || null,
        is_simulated: newDevice.type === 'simulated'
      }

      // If simulated device with file, use FormData
      if (newDevice.type === 'simulated' && uploadedFile) {
        const formData = new FormData()
        formData.append('dataset', uploadedFile)
        formData.append('device', JSON.stringify(deviceData))

        const res = await fetch('/api/devices/simulated', {
          method: 'POST',
          body: formData
        })

        if (!res.ok) {
          const data = await res.json()
          throw new Error(data.error?.message || 'Failed to create simulated device')
        }
      } else {
        const res = await fetch('/api/devices', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(deviceData)
        })

        if (!res.ok) {
          const data = await res.json()
          throw new Error(data.error?.message || 'Failed to create device')
        }
      }

      setShowAddModal(false)
      setNewDevice({
        name: '',
        device_uid: '',
        type: 'edge_compute',
        device_group_id: '',
        ip_address: '',
        firmware_version: '1.0.0'
      })
      clearUploadedFile()
      fetchDevices()
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
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
        <button onClick={() => setShowAddModal(true)} className="btn-primary">
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
          <button onClick={() => setShowAddModal(true)} className="btn-primary">
            <Plus className="w-4 h-4 mr-2" />
            Add Device
          </button>
        </div>
      )}

      {/* Add Device Modal */}
      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Add New Device"
        size="md"
      >
        <form onSubmit={handleCreateDevice} className="space-y-4">
          {error && (
            <div className="flex items-center gap-2 p-3 bg-rose-50 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400 rounded-lg">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <span className="text-sm">{error}</span>
            </div>
          )}

          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Device Name *
            </label>
            <input
              id="name"
              type="text"
              value={newDevice.name}
              onChange={(e) => setNewDevice({ ...newDevice, name: e.target.value })}
              className="input"
              placeholder="e.g., Production Line Sensor 1"
              required
            />
          </div>

          <div>
            <label htmlFor="device_uid" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Device UID
            </label>
            <input
              id="device_uid"
              type="text"
              value={newDevice.device_uid}
              onChange={(e) => setNewDevice({ ...newDevice, device_uid: e.target.value })}
              className="input font-mono"
              placeholder="Leave blank to auto-generate"
            />
            <p className="mt-1 text-xs text-gray-500">Unique identifier for the device. Leave blank to auto-generate.</p>
          </div>

          <div>
            <label htmlFor="type" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Device Type *
            </label>
            <select
              id="type"
              value={newDevice.type}
              onChange={(e) => {
                setNewDevice({ ...newDevice, type: e.target.value })
                if (e.target.value !== 'simulated') {
                  clearUploadedFile()
                }
              }}
              className="input"
              required
            >
              {deviceTypes.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>

          {/* Dataset Upload Section - Only for Simulated Devices */}
          {newDevice.type === 'simulated' && (
            <div className="space-y-3">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Dataset File *
              </label>

              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
                <div className="flex items-start gap-2">
                  <Database className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-blue-700 dark:text-blue-300">
                    <p className="font-medium">Upload your training data</p>
                    <p className="text-blue-600 dark:text-blue-400">Supported formats: CSV, JSON, Parquet</p>
                  </div>
                </div>
              </div>

              {!uploadedFile ? (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6 text-center cursor-pointer hover:border-blue-500 dark:hover:border-blue-400 transition-colors"
                >
                  <Upload className="w-8 h-8 mx-auto text-gray-400 mb-2" />
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Click to upload or drag and drop
                  </p>
                  <p className="text-xs text-gray-500 mt-1">CSV, JSON, or Parquet (max 100MB)</p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv,.json,.parquet"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                </div>
              ) : (
                <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-emerald-100 dark:bg-emerald-900/50 rounded-lg flex items-center justify-center">
                        <FileSpreadsheet className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white text-sm">{uploadedFile.name}</p>
                        <p className="text-xs text-gray-500">
                          {(uploadedFile.size / 1024).toFixed(1)} KB
                          {datasetPreview && ` • ${datasetPreview.totalRows} rows`}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={clearUploadedFile}
                      className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                    >
                      <X className="w-4 h-4 text-gray-500" />
                    </button>
                  </div>

                  {/* Data Preview */}
                  {datasetPreview && datasetPreview.headers.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                      <p className="text-xs font-medium text-gray-500 mb-2">Preview</p>
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="bg-gray-50 dark:bg-gray-800">
                              {datasetPreview.headers.slice(0, 5).map((header, i) => (
                                <th key={i} className="px-2 py-1 text-left font-medium text-gray-600 dark:text-gray-400 truncate max-w-[100px]">
                                  {header}
                                </th>
                              ))}
                              {datasetPreview.headers.length > 5 && (
                                <th className="px-2 py-1 text-gray-400">+{datasetPreview.headers.length - 5} more</th>
                              )}
                            </tr>
                          </thead>
                          <tbody>
                            {datasetPreview.rows.slice(0, 3).map((row, i) => (
                              <tr key={i} className="border-t border-gray-100 dark:border-gray-700">
                                {row.slice(0, 5).map((cell, j) => (
                                  <td key={j} className="px-2 py-1 text-gray-700 dark:text-gray-300 truncate max-w-[100px]">
                                    {cell}
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center gap-2 mt-3 text-emerald-600 dark:text-emerald-400">
                    <CheckCircle2 className="w-4 h-4" />
                    <span className="text-sm">File ready for upload</span>
                  </div>
                </div>
              )}
            </div>
          )}

          <div>
            <label htmlFor="device_group_id" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Device Group
            </label>
            <select
              id="device_group_id"
              value={newDevice.device_group_id}
              onChange={(e) => setNewDevice({ ...newDevice, device_group_id: e.target.value })}
              className="input"
            >
              <option value="">-- Select Group --</option>
              {deviceGroups.map((group) => (
                <option key={group.id} value={group.id}>
                  {group.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="ip_address" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              IP Address
            </label>
            <input
              id="ip_address"
              type="text"
              value={newDevice.ip_address}
              onChange={(e) => setNewDevice({ ...newDevice, ip_address: e.target.value })}
              className="input font-mono"
              placeholder="e.g., 192.168.1.100"
            />
          </div>

          <div>
            <label htmlFor="firmware_version" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Firmware Version
            </label>
            <input
              id="firmware_version"
              type="text"
              value={newDevice.firmware_version}
              onChange={(e) => setNewDevice({ ...newDevice, firmware_version: e.target.value })}
              className="input font-mono"
              placeholder="e.g., 1.0.0"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={() => setShowAddModal(false)}
              className="btn-secondary"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="btn-primary"
            >
              {submitting ? 'Creating...' : 'Create Device'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
