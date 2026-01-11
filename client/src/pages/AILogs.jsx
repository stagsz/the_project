import { useState, useEffect } from 'react'
import { ChevronDown, ChevronUp, Search, Filter, Clock, Zap } from 'lucide-react'

const QUERY_TYPES = [
  { value: 'query', label: 'General Query' },
  { value: 'insights', label: 'System Insights' },
  { value: 'explain_anomaly', label: 'Anomaly Explanation' },
  { value: 'recommendations', label: 'Recommendations' },
  { value: 'analyze_training', label: 'Training Analysis' }
]

export default function AILogs() {
  const [logs, setLogs] = useState([])
  const [filteredLogs, setFilteredLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [expandedId, setExpandedId] = useState(null)
  const [filters, setFilters] = useState({
    queryType: '',
    deviceId: '',
    searchText: ''
  })
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0
  })

  useEffect(() => {
    fetchLogs()
  }, [pagination.page, pagination.limit])

  async function fetchLogs() {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        limit: pagination.limit,
        offset: (pagination.page - 1) * pagination.limit
      })

      if (filters.queryType) params.append('query_type', filters.queryType)
      if (filters.deviceId) params.append('device_id', filters.deviceId)

      const response = await fetch(`/api/ai/logs?${params}`)
      const data = await response.json()

      setLogs(data.logs || [])
      setPagination(prev => ({
        ...prev,
        total: data.total || 0
      }))
    } catch (error) {
      console.error('Failed to fetch logs:', error)
    } finally {
      setLoading(false)
    }
  }

  function handleFilterChange(field, value) {
    setFilters(prev => ({
      ...prev,
      [field]: value
    }))
    setPagination(prev => ({ ...prev, page: 1 }))
  }

  function applyFilters() {
    fetchLogs()
  }

  function formatDate(dateString) {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })
  }

  function truncateText(text, length = 100) {
    if (!text) return ''
    return text.length > length ? text.substring(0, length) + '...' : text
  }

  function getQueryTypeLabel(type) {
    return QUERY_TYPES.find(t => t.value === type)?.label || type
  }

  function getQueryTypeColor(type) {
    const colors = {
      query: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
      insights: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300',
      explain_anomaly: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300',
      recommendations: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
      analyze_training: 'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-300'
    }
    return colors[type] || 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
  }

  const totalPages = Math.ceil(pagination.total / pagination.limit)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">AI Response Logs</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          View all AI interactions with timestamps and device information
        </p>
      </div>

      {/* Filters */}
      <div className="card p-6">
        <div className="space-y-4">
          <h2 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <Filter className="w-5 h-5" />
            Filters
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Query Type Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Query Type
              </label>
              <select
                value={filters.queryType}
                onChange={(e) => handleFilterChange('queryType', e.target.value)}
                className="input"
              >
                <option value="">All Types</option>
                {QUERY_TYPES.map(type => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Device ID Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Device ID
              </label>
              <input
                type="text"
                placeholder="Filter by device ID..."
                value={filters.deviceId}
                onChange={(e) => handleFilterChange('deviceId', e.target.value)}
                className="input"
              />
            </div>

            {/* Search Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Search Query/Response
              </label>
              <input
                type="text"
                placeholder="Search logs..."
                value={filters.searchText}
                onChange={(e) => handleFilterChange('searchText', e.target.value)}
                className="input"
              />
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={applyFilters}
              className="btn-primary"
            >
              <Search className="w-4 h-4" />
              Apply Filters
            </button>
            <button
              onClick={() => {
                setFilters({ queryType: '', deviceId: '', searchText: '' })
                setPagination(prev => ({ ...prev, page: 1 }))
              }}
              className="btn-secondary"
            >
              Reset
            </button>
          </div>
        </div>
      </div>

      {/* Logs List */}
      <div className="card overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center p-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : logs.length === 0 ? (
          <div className="text-center p-12">
            <Zap className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 dark:text-gray-400">No AI logs found</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {logs.map((log) => (
              <div key={log.id} className="p-6">
                {/* Log Header */}
                <div
                  className="flex items-start justify-between cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50 -m-6 p-6 rounded-lg transition-colors"
                  onClick={() => setExpandedId(expandedId === log.id ? null : log.id)}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-3 flex-wrap">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${getQueryTypeColor(log.query_type)}`}>
                        {getQueryTypeLabel(log.query_type)}
                      </span>
                      {log.device_name && (
                        <span className="text-xs bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 px-3 py-1 rounded-full">
                          {log.device_name}
                        </span>
                      )}
                      <span className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatDate(log.created_at)}
                      </span>
                    </div>

                    <div className="space-y-2">
                      <div>
                        <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">Query:</p>
                        <p className="text-sm text-gray-900 dark:text-gray-100 line-clamp-2">
                          {truncateText(log.query_text, 150)}
                        </p>
                      </div>

                      {log.response_text && (
                        <div>
                          <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">Response:</p>
                          <p className="text-sm text-gray-900 dark:text-gray-100 line-clamp-2">
                            {truncateText(log.response_text, 150)}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  <button className="ml-4 p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
                    {expandedId === log.id ? (
                      <ChevronUp className="w-5 h-5 text-gray-500" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-gray-500" />
                    )}
                  </button>
                </div>

                {/* Expanded Details */}
                {expandedId === log.id && (
                  <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 space-y-4">
                    <div>
                      <h4 className="font-semibold text-sm text-gray-900 dark:text-white mb-2">Full Query:</h4>
                      <div className="bg-gray-50 dark:bg-gray-900 p-3 rounded-lg text-sm text-gray-700 dark:text-gray-300 break-words whitespace-pre-wrap">
                        {log.query_text}
                      </div>
                    </div>

                    <div>
                      <h4 className="font-semibold text-sm text-gray-900 dark:text-white mb-2">Full Response:</h4>
                      <div className="bg-gray-50 dark:bg-gray-900 p-3 rounded-lg text-sm text-gray-700 dark:text-gray-300 break-words whitespace-pre-wrap">
                        {log.response_text}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {log.device_id && (
                        <div>
                          <p className="text-xs font-semibold text-gray-600 dark:text-gray-400">Device ID</p>
                          <p className="text-sm text-gray-900 dark:text-gray-100 font-mono">{log.device_id}</p>
                        </div>
                      )}
                      {log.device_type && (
                        <div>
                          <p className="text-xs font-semibold text-gray-600 dark:text-gray-400">Device Type</p>
                          <p className="text-sm text-gray-900 dark:text-gray-100">{log.device_type}</p>
                        </div>
                      )}
                      {log.anomaly_id && (
                        <div>
                          <p className="text-xs font-semibold text-gray-600 dark:text-gray-400">Anomaly ID</p>
                          <p className="text-sm text-gray-900 dark:text-gray-100 font-mono">{log.anomaly_id}</p>
                        </div>
                      )}
                      {log.training_round_id && (
                        <div>
                          <p className="text-xs font-semibold text-gray-600 dark:text-gray-400">Training Round</p>
                          <p className="text-sm text-gray-900 dark:text-gray-100 font-mono">{log.training_round_id}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between card p-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Showing {Math.min((pagination.page - 1) * pagination.limit + 1, pagination.total)} to{' '}
            {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} logs
          </p>

          <div className="flex gap-2">
            <button
              onClick={() => setPagination(prev => ({ ...prev, page: Math.max(1, prev.page - 1) }))}
              disabled={pagination.page === 1}
              className="btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>

            <div className="flex items-center gap-2">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                <button
                  key={page}
                  onClick={() => setPagination(prev => ({ ...prev, page }))}
                  className={`w-10 h-10 rounded-lg font-medium transition-colors ${
                    page === pagination.page
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                  }`}
                >
                  {page}
                </button>
              ))}
            </div>

            <button
              onClick={() => setPagination(prev => ({ ...prev, page: Math.min(totalPages, prev.page + 1) }))}
              disabled={pagination.page === totalPages}
              className="btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
