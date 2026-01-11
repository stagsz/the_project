import { useState, useEffect } from 'react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer,
  Area,
  AreaChart
} from 'recharts'
import { Activity, TrendingDown, TrendingUp, Zap } from 'lucide-react'

export default function TrainingProgressChart({
  roundId,
  status,
  contributions = [],
  resultMetrics = null,
  hyperparameters = {}
}) {
  const [progressData, setProgressData] = useState([])
  const [isLive, setIsLive] = useState(false)

  useEffect(() => {
    // Generate simulated progress data based on contributions and status
    generateProgressData()

    // Set up polling for live updates when training is in progress
    if (status === 'in_progress') {
      setIsLive(true)
      const interval = setInterval(() => {
        generateProgressData()
      }, 2000) // Update every 2 seconds

      return () => clearInterval(interval)
    } else {
      setIsLive(false)
    }
  }, [roundId, status, contributions])

  function generateProgressData() {
    const epochs = hyperparameters?.local_epochs || 5
    const completedDevices = contributions.filter(c => c.status === 'completed').length
    const totalDevices = contributions.length || 1
    const progressPercent = totalDevices > 0 ? (completedDevices / totalDevices) : 0

    // Generate training curve data
    const data = []
    const totalSteps = epochs * 10 // 10 steps per epoch
    const currentStep = status === 'completed'
      ? totalSteps
      : Math.floor(totalSteps * progressPercent)

    for (let i = 0; i <= currentStep; i++) {
      const epoch = Math.floor(i / 10) + 1
      const step = i % 10

      // Simulate decreasing loss curve with some noise
      const baseLoss = 2.5 * Math.exp(-0.3 * (i / totalSteps) * epochs)
      const noise = (Math.random() - 0.5) * 0.1
      const loss = Math.max(0.1, baseLoss + noise)

      // Simulate increasing accuracy curve
      const baseAccuracy = 1 - Math.exp(-0.5 * (i / totalSteps) * epochs)
      const accNoise = (Math.random() - 0.5) * 0.05
      const accuracy = Math.min(0.98, Math.max(0, baseAccuracy * 0.95 + accNoise))

      // Calculate gradient norm (decreases as training stabilizes)
      const gradientNorm = 1.5 * Math.exp(-0.2 * (i / totalSteps) * epochs) + Math.random() * 0.2

      data.push({
        step: i,
        epoch,
        loss: parseFloat(loss.toFixed(4)),
        accuracy: parseFloat((accuracy * 100).toFixed(2)),
        gradientNorm: parseFloat(gradientNorm.toFixed(4)),
        label: `E${epoch}.${step}`
      })
    }

    // If we have actual result metrics, use those for the final point
    if (resultMetrics && status === 'completed') {
      const lastPoint = data[data.length - 1]
      if (lastPoint) {
        lastPoint.loss = resultMetrics.loss || lastPoint.loss
        lastPoint.accuracy = (resultMetrics.accuracy || lastPoint.accuracy / 100) * 100
      }
    }

    setProgressData(data)
  }

  // Calculate current metrics
  const currentMetrics = progressData.length > 0
    ? progressData[progressData.length - 1]
    : { loss: 0, accuracy: 0, gradientNorm: 0 }

  const initialMetrics = progressData.length > 0
    ? progressData[0]
    : { loss: 0, accuracy: 0 }

  const lossImprovement = initialMetrics.loss > 0
    ? ((initialMetrics.loss - currentMetrics.loss) / initialMetrics.loss * 100).toFixed(1)
    : 0

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-gray-900 text-white p-3 rounded-lg shadow-lg border border-gray-700 text-sm">
          <p className="font-medium mb-2">{label}</p>
          {payload.map((entry, index) => (
            <p key={index} style={{ color: entry.color }}>
              {entry.name}: {entry.value.toFixed(4)}
            </p>
          ))}
        </div>
      )
    }
    return null
  }

  return (
    <div className="space-y-6">
      {/* Live indicator */}
      {isLive && (
        <div className="flex items-center gap-2 text-sm">
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
          </span>
          <span className="text-emerald-600 dark:text-emerald-400 font-medium">Live Training</span>
        </div>
      )}

      {/* Metrics Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
          <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
            <TrendingDown className="w-4 h-4" />
            Current Loss
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            {currentMetrics.loss.toFixed(4)}
          </p>
          <p className="text-xs text-emerald-600 dark:text-emerald-400">
            -{lossImprovement}% from start
          </p>
        </div>

        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
          <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
            <TrendingUp className="w-4 h-4" />
            Accuracy
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            {currentMetrics.accuracy.toFixed(1)}%
          </p>
          <p className="text-xs text-blue-600 dark:text-blue-400">
            Target: 95%
          </p>
        </div>

        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
          <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
            <Activity className="w-4 h-4" />
            Progress
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            {progressData.length > 0 ? Math.round((progressData.length / ((hyperparameters?.local_epochs || 5) * 10)) * 100) : 0}%
          </p>
          <p className="text-xs text-gray-500">
            Step {progressData.length} / {(hyperparameters?.local_epochs || 5) * 10}
          </p>
        </div>

        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
          <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
            <Zap className="w-4 h-4" />
            Gradient Norm
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            {currentMetrics.gradientNorm.toFixed(3)}
          </p>
          <p className="text-xs text-gray-500">
            Convergence indicator
          </p>
        </div>
      </div>

      {/* Loss & Accuracy Chart */}
      <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">
          Loss & Accuracy Over Time
        </h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={progressData} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
              <XAxis
                dataKey="label"
                stroke="#9CA3AF"
                fontSize={12}
                interval={9}
              />
              <YAxis
                yAxisId="loss"
                stroke="#EF4444"
                fontSize={12}
                domain={[0, 'auto']}
                tickFormatter={(v) => v.toFixed(1)}
              />
              <YAxis
                yAxisId="accuracy"
                orientation="right"
                stroke="#10B981"
                fontSize={12}
                domain={[0, 100]}
                tickFormatter={(v) => `${v}%`}
              />
              <RechartsTooltip content={<CustomTooltip />} />
              <Legend />
              <Line
                yAxisId="loss"
                type="monotone"
                dataKey="loss"
                stroke="#EF4444"
                strokeWidth={2}
                dot={false}
                name="Loss"
                isAnimationActive={!isLive}
              />
              <Line
                yAxisId="accuracy"
                type="monotone"
                dataKey="accuracy"
                stroke="#10B981"
                strokeWidth={2}
                dot={false}
                name="Accuracy %"
                isAnimationActive={!isLive}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Gradient Norm Chart */}
      <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">
          Gradient Norm (Convergence Indicator)
        </h3>
        <div className="h-40">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={progressData} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
              <XAxis
                dataKey="label"
                stroke="#9CA3AF"
                fontSize={12}
                interval={9}
              />
              <YAxis
                stroke="#8B5CF6"
                fontSize={12}
                domain={[0, 'auto']}
              />
              <RechartsTooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey="gradientNorm"
                stroke="#8B5CF6"
                fill="#8B5CF6"
                fillOpacity={0.2}
                strokeWidth={2}
                name="Gradient Norm"
                isAnimationActive={!isLive}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <p className="text-xs text-gray-500 mt-2">
          Lower gradient norm indicates the model is converging to a stable solution
        </p>
      </div>

      {/* Device Progress */}
      {contributions.length > 0 && (
        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">
            Device Training Progress
          </h3>
          <div className="space-y-3">
            {contributions.map((contrib, index) => {
              const progress = contrib.status === 'completed' ? 100
                : contrib.status === 'failed' ? 0
                : Math.random() * 80 + 10 // Simulated progress for in-progress

              return (
                <div key={contrib.id || index} className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-700 dark:text-gray-300">{contrib.device_name}</span>
                    <span className="text-gray-500">
                      {contrib.status === 'completed' ? 'Complete'
                        : contrib.status === 'failed' ? 'Failed'
                        : `${progress.toFixed(0)}%`}
                    </span>
                  </div>
                  <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        contrib.status === 'completed' ? 'bg-emerald-500'
                        : contrib.status === 'failed' ? 'bg-rose-500'
                        : 'bg-blue-500'
                      }`}
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
