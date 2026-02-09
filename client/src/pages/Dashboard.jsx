import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  Server,
  Brain,
  Activity,
  AlertTriangle,
  Cpu,
  Database,
  Wifi,
  Zap,
  TrendingUp,
  TrendingDown,
  Radio
} from 'lucide-react'

export default function Dashboard() {
  const [stats, setStats] = useState({
    devices: { total: 0, online: 0, offline: 0, warning: 0, error: 0 },
    models: { total: 0, active: 0 },
    training: { active: 0, completed: 0 },
    anomalies: { new: 0, critical: 0 }
  })
  const [loading, setLoading] = useState(true)
  const [currentTime, setCurrentTime] = useState(new Date())

  useEffect(() => {
    fetchDashboardData()
    const timer = setInterval(() => setCurrentTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  async function fetchDashboardData() {
    try {
      const [devicesRes, modelsRes, trainingRes, anomaliesRes] = await Promise.all([
        fetch('/api/devices'),
        fetch('/api/models'),
        fetch('/api/training/rounds?limit=100'),
        fetch('/api/anomalies?status=new&limit=100')
      ])

      // Check responses before parsing
      const devicesData = devicesRes.ok ? await devicesRes.json() : { devices: [] }
      const modelsData = modelsRes.ok ? await modelsRes.json() : { models: [] }
      const trainingData = trainingRes.ok ? await trainingRes.json() : { rounds: [] }
      const anomaliesData = anomaliesRes.ok ? await anomaliesRes.json() : { anomalies: [] }

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

  const uptime = 99.97
  const networkLatency = 12
  const cpuLoad = 34

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-950">
        <div className="text-center">
          <div className="inline-block w-16 h-16 border-4 border-amber-500/30 border-t-amber-500 rounded-full animate-spin mb-4"></div>
          <div className="font-mono text-amber-500 text-sm tracking-wider">INITIALIZING CONTROL SYSTEMS</div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-mono p-4 md:p-6 lg:p-8">
      {/* Header Bar */}
      <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-4 border-b-2 border-amber-500/30">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse"></div>
            <h1 className="font-display text-3xl md:text-4xl font-bold tracking-tight text-amber-500 uppercase">
              COMMAND CENTER
            </h1>
          </div>
          <p className="text-slate-400 text-xs md:text-sm tracking-wide ml-5">
            FEDERATED LEARNING OPERATIONS DASHBOARD // REAL-TIME MONITORING
          </p>
        </div>
        <div className="flex items-center gap-6 text-sm">
          <div className="flex items-center gap-2">
            <Radio className="w-4 h-4 text-emerald-400" />
            <span className="text-slate-300">UPTIME</span>
            <span className="text-emerald-400 font-semibold">{uptime}%</span>
          </div>
          <div className="text-amber-400 font-semibold tabular-nums">
            {currentTime.toLocaleTimeString('en-US', { hour12: false })}
          </div>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 md:gap-6">

        {/* Left Column - System Overview */}
        <div className="lg:col-span-8 space-y-4 md:space-y-6">

          {/* Primary Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
            {/* Devices Metric */}
            <Link to="/devices" className="group relative">
              <div className="absolute inset-0 bg-gradient-to-br from-amber-500/10 to-transparent rounded-lg transform transition-transform group-hover:scale-105"></div>
              <div className="relative bg-slate-900/80 border-2 border-slate-800 rounded-lg p-4 backdrop-blur-sm clip-corner group-hover:border-amber-500/50 transition-all">
                <div className="flex items-start justify-between mb-3">
                  <Server className="w-6 h-6 text-amber-500" />
                  <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></div>
                </div>
                <div className="text-3xl font-bold text-white mb-1 tabular-nums">{stats.devices.total}</div>
                <div className="text-[10px] uppercase tracking-widest text-slate-400">DEVICES</div>
                <div className="mt-3 flex items-center gap-2 text-xs">
                  <span className="text-emerald-400">{stats.devices.online} ONLINE</span>
                  <span className="text-slate-600">|</span>
                  <span className="text-rose-400">{stats.devices.offline} OFF</span>
                </div>
              </div>
            </Link>

            {/* Models Metric */}
            <Link to="/models" className="group relative">
              <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 to-transparent rounded-lg transform transition-transform group-hover:scale-105"></div>
              <div className="relative bg-slate-900/80 border-2 border-slate-800 rounded-lg p-4 backdrop-blur-sm clip-corner group-hover:border-cyan-500/50 transition-all">
                <div className="flex items-start justify-between mb-3">
                  <Brain className="w-6 h-6 text-cyan-400" />
                  <div className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse"></div>
                </div>
                <div className="text-3xl font-bold text-white mb-1 tabular-nums">{stats.models.total}</div>
                <div className="text-[10px] uppercase tracking-widest text-slate-400">ML MODELS</div>
                <div className="mt-3 flex items-center gap-2 text-xs">
                  <Zap className="w-3 h-3 text-cyan-400" />
                  <span className="text-cyan-400">{stats.models.active} ACTIVE</span>
                </div>
              </div>
            </Link>

            {/* Training Metric */}
            <Link to="/training" className="group relative">
              <div className="absolute inset-0 bg-gradient-to-br from-violet-500/10 to-transparent rounded-lg transform transition-transform group-hover:scale-105"></div>
              <div className="relative bg-slate-900/80 border-2 border-slate-800 rounded-lg p-4 backdrop-blur-sm clip-corner group-hover:border-violet-500/50 transition-all">
                <div className="flex items-start justify-between mb-3">
                  <Activity className="w-6 h-6 text-violet-400" />
                  <div className="w-2 h-2 bg-violet-400 rounded-full animate-pulse"></div>
                </div>
                <div className="text-3xl font-bold text-white mb-1 tabular-nums">{stats.training.active}</div>
                <div className="text-[10px] uppercase tracking-widest text-slate-400">TRAINING</div>
                <div className="mt-3 flex items-center gap-2 text-xs">
                  <TrendingUp className="w-3 h-3 text-violet-400" />
                  <span className="text-violet-400">{stats.training.completed} DONE</span>
                </div>
              </div>
            </Link>

            {/* Anomalies Metric */}
            <Link to="/anomalies" className="group relative">
              <div className="absolute inset-0 bg-gradient-to-br from-rose-500/10 to-transparent rounded-lg transform transition-transform group-hover:scale-105"></div>
              <div className="relative bg-slate-900/80 border-2 border-slate-800 rounded-lg p-4 backdrop-blur-sm clip-corner group-hover:border-rose-500/50 transition-all">
                <div className="flex items-start justify-between mb-3">
                  <AlertTriangle className="w-6 h-6 text-rose-400" />
                  <div className={`w-2 h-2 rounded-full ${stats.anomalies.critical > 0 ? 'bg-rose-500 animate-pulse' : 'bg-slate-600'}`}></div>
                </div>
                <div className="text-3xl font-bold text-white mb-1 tabular-nums">{stats.anomalies.new}</div>
                <div className="text-[10px] uppercase tracking-widest text-slate-400">ANOMALIES</div>
                <div className="mt-3 flex items-center gap-2 text-xs">
                  {stats.anomalies.critical > 0 ? (
                    <span className="text-rose-400 font-semibold">{stats.anomalies.critical} CRITICAL</span>
                  ) : (
                    <span className="text-slate-500">NO ALERTS</span>
                  )}
                </div>
              </div>
            </Link>
          </div>

          {/* System Performance Panel */}
          <div className="relative bg-slate-900/80 border-2 border-slate-800 rounded-lg p-6 backdrop-blur-sm">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-amber-500 to-transparent opacity-50 scanning-line"></div>

            <div className="flex items-center justify-between mb-6">
              <h2 className="font-display text-xl font-semibold text-amber-500 uppercase tracking-wide">
                SYSTEM PERFORMANCE
              </h2>
              <div className="flex items-center gap-2 text-xs text-emerald-400">
                <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></div>
                ALL SYSTEMS OPERATIONAL
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Network Status */}
              <div className="bg-slate-950/50 border border-slate-700 rounded p-4">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-emerald-500/10 rounded flex items-center justify-center">
                    <Wifi className="w-5 h-5 text-emerald-400" />
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-500 uppercase tracking-wide">Network</div>
                    <div className="text-sm font-semibold text-emerald-400">CONNECTED</div>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-400">Latency</span>
                    <span className="text-white font-semibold tabular-nums">{networkLatency}ms</span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400" style={{ width: '95%' }}></div>
                  </div>
                </div>
              </div>

              {/* CPU Load */}
              <div className="bg-slate-950/50 border border-slate-700 rounded p-4">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-cyan-500/10 rounded flex items-center justify-center">
                    <Cpu className="w-5 h-5 text-cyan-400" />
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-500 uppercase tracking-wide">CPU Load</div>
                    <div className="text-sm font-semibold text-cyan-400">{cpuLoad}%</div>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-400">Utilization</span>
                    <span className="text-white font-semibold">OPTIMAL</span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-cyan-500 to-cyan-400" style={{ width: `${cpuLoad}%` }}></div>
                  </div>
                </div>
              </div>

              {/* Database */}
              <div className="bg-slate-950/50 border border-slate-700 rounded p-4">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-violet-500/10 rounded flex items-center justify-center">
                    <Database className="w-5 h-5 text-violet-400" />
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-500 uppercase tracking-wide">Database</div>
                    <div className="text-sm font-semibold text-violet-400">HEALTHY</div>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-400">Response Time</span>
                    <span className="text-white font-semibold tabular-nums">4ms</span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-violet-500 to-violet-400" style={{ width: '98%' }}></div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="relative bg-slate-900/80 border-2 border-slate-800 rounded-lg p-6 backdrop-blur-sm">
            <h2 className="font-display text-xl font-semibold text-amber-500 uppercase tracking-wide mb-4">
              QUICK ACCESS
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <Link
                to="/training"
                className="group bg-slate-950/50 border-2 border-amber-500/30 rounded p-4 hover:border-amber-500 hover:bg-amber-500/5 transition-all"
              >
                <div className="flex items-center gap-3">
                  <Activity className="w-5 h-5 text-amber-500" />
                  <div className="text-xs uppercase tracking-wider text-amber-400 group-hover:text-amber-300">
                    INIT TRAINING
                  </div>
                </div>
              </Link>
              <Link
                to="/devices"
                className="group bg-slate-950/50 border-2 border-cyan-500/30 rounded p-4 hover:border-cyan-500 hover:bg-cyan-500/5 transition-all"
              >
                <div className="flex items-center gap-3">
                  <Server className="w-5 h-5 text-cyan-500" />
                  <div className="text-xs uppercase tracking-wider text-cyan-400 group-hover:text-cyan-300">
                    ADD DEVICE
                  </div>
                </div>
              </Link>
              <Link
                to="/anomalies"
                className="group bg-slate-950/50 border-2 border-rose-500/30 rounded p-4 hover:border-rose-500 hover:bg-rose-500/5 transition-all"
              >
                <div className="flex items-center gap-3">
                  <AlertTriangle className="w-5 h-5 text-rose-500" />
                  <div className="text-xs uppercase tracking-wider text-rose-400 group-hover:text-rose-300">
                    VIEW ALERTS
                  </div>
                </div>
              </Link>
            </div>
          </div>
        </div>

        {/* Right Column - Status Feed */}
        <div className="lg:col-span-4 space-y-4">

          {/* System Status */}
          <div className="relative bg-slate-900/80 border-2 border-slate-800 rounded-lg p-5 backdrop-blur-sm">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-1 h-6 bg-amber-500"></div>
              <h3 className="font-display text-lg font-semibold text-slate-200 uppercase tracking-wide">
                SYSTEM STATUS
              </h3>
            </div>

            <div className="space-y-3">
              {/* API Server */}
              <div className="flex items-center justify-between p-3 bg-slate-950/70 border border-slate-700 rounded">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full"></div>
                    <div className="absolute inset-0 w-2.5 h-2.5 bg-emerald-500 rounded-full animate-ping"></div>
                  </div>
                  <span className="text-xs text-slate-300 uppercase tracking-wide">API Server</span>
                </div>
                <span className="text-xs font-semibold text-emerald-400">ONLINE</span>
              </div>

              {/* WebSocket */}
              <div className="flex items-center justify-between p-3 bg-slate-950/70 border border-slate-700 rounded">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full"></div>
                    <div className="absolute inset-0 w-2.5 h-2.5 bg-emerald-500 rounded-full animate-ping"></div>
                  </div>
                  <span className="text-xs text-slate-300 uppercase tracking-wide">WebSocket</span>
                </div>
                <span className="text-xs font-semibold text-emerald-400">CONNECTED</span>
              </div>

              {/* Database */}
              <div className="flex items-center justify-between p-3 bg-slate-950/70 border border-slate-700 rounded">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full"></div>
                    <div className="absolute inset-0 w-2.5 h-2.5 bg-emerald-500 rounded-full animate-ping"></div>
                  </div>
                  <span className="text-xs text-slate-300 uppercase tracking-wide">Database</span>
                </div>
                <span className="text-xs font-semibold text-emerald-400">HEALTHY</span>
              </div>

              {/* AI Service */}
              <div className="flex items-center justify-between p-3 bg-slate-950/70 border border-amber-700/50 rounded">
                <div className="flex items-center gap-3">
                  <div className="w-2.5 h-2.5 bg-amber-500 rounded-full"></div>
                  <span className="text-xs text-slate-300 uppercase tracking-wide">AI Service</span>
                </div>
                <span className="text-xs font-semibold text-amber-400">STANDBY</span>
              </div>
            </div>
          </div>

          {/* Device Status Breakdown */}
          <div className="relative bg-slate-900/80 border-2 border-slate-800 rounded-lg p-5 backdrop-blur-sm">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-1 h-6 bg-cyan-500"></div>
              <h3 className="font-display text-lg font-semibold text-slate-200 uppercase tracking-wide">
                FLEET STATUS
              </h3>
            </div>

            <div className="space-y-3">
              {/* Online */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-slate-400">
                  <div className="w-3 h-3 bg-emerald-500 rounded-sm"></div>
                  ONLINE
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-24 h-2 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400"
                      style={{ width: `${(stats.devices.online / stats.devices.total) * 100}%` }}
                    ></div>
                  </div>
                  <span className="text-sm font-bold text-white tabular-nums w-8 text-right">{stats.devices.online}</span>
                </div>
              </div>

              {/* Offline */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-slate-400">
                  <div className="w-3 h-3 bg-rose-500 rounded-sm"></div>
                  OFFLINE
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-24 h-2 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-rose-500 to-rose-400"
                      style={{ width: `${(stats.devices.offline / stats.devices.total) * 100}%` }}
                    ></div>
                  </div>
                  <span className="text-sm font-bold text-white tabular-nums w-8 text-right">{stats.devices.offline}</span>
                </div>
              </div>

              {/* Warning */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-slate-400">
                  <div className="w-3 h-3 bg-amber-500 rounded-sm"></div>
                  WARNING
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-24 h-2 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-amber-500 to-amber-400"
                      style={{ width: `${(stats.devices.warning / stats.devices.total) * 100}%` }}
                    ></div>
                  </div>
                  <span className="text-sm font-bold text-white tabular-nums w-8 text-right">{stats.devices.warning}</span>
                </div>
              </div>

              {/* Error */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-slate-400">
                  <div className="w-3 h-3 bg-red-500 rounded-sm"></div>
                  ERROR
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-24 h-2 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-red-500 to-red-400"
                      style={{ width: `${(stats.devices.error / stats.devices.total) * 100}%` }}
                    ></div>
                  </div>
                  <span className="text-sm font-bold text-white tabular-nums w-8 text-right">{stats.devices.error}</span>
                </div>
              </div>
            </div>
          </div>

          {/* System Diagnostics */}
          <div className="relative bg-gradient-to-br from-slate-900/80 to-slate-950/80 border-2 border-slate-800 rounded-lg p-5 backdrop-blur-sm">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-1 h-6 bg-violet-500"></div>
              <h3 className="font-display text-lg font-semibold text-slate-200 uppercase tracking-wide">
                DIAGNOSTICS
              </h3>
            </div>

            <div className="space-y-4 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-slate-400 uppercase tracking-wide">Avg Response Time</span>
                <span className="text-white font-semibold tabular-nums">8.2ms</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400 uppercase tracking-wide">Active Connections</span>
                <span className="text-white font-semibold tabular-nums">{stats.devices.online}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400 uppercase tracking-wide">Data Throughput</span>
                <span className="text-white font-semibold tabular-nums">2.4 GB/h</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400 uppercase tracking-wide">Error Rate</span>
                <span className="text-emerald-400 font-semibold">0.03%</span>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-slate-700">
              <div className="text-[10px] text-slate-500 uppercase tracking-widest mb-1">System Load</div>
              <div className="grid grid-cols-12 gap-1 h-12">
                {[...Array(12)].map((_, i) => (
                  <div key={i} className="bg-slate-800 rounded-sm overflow-hidden flex flex-col justify-end">
                    <div
                      className="bg-gradient-to-t from-cyan-500 to-cyan-400 rounded-sm"
                      style={{ height: `${Math.random() * 60 + 40}%` }}
                    ></div>
                  </div>
                ))}
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* Scanline Effect */}
      <style>{`
        @keyframes scan {
          0% { transform: translateY(-100%); }
          100% { transform: translateY(100vh); }
        }

        .scanning-line {
          animation: scan 8s linear infinite;
        }

        .clip-corner {
          position: relative;
        }

        .clip-corner::before {
          content: '';
          position: absolute;
          top: -2px;
          right: -2px;
          width: 12px;
          height: 12px;
          background: linear-gradient(135deg, transparent 50%, currentColor 50%);
          color: inherit;
        }

        @keyframes pulse-glow {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  )
}
