import { useState, useEffect } from 'react'
import { Sparkles, Send, Lightbulb, AlertTriangle, TrendingUp } from 'lucide-react'

export default function AIInsights() {
  const [query, setQuery] = useState('')
  const [response, setResponse] = useState('')
  const [insights, setInsights] = useState([])
  const [recommendations, setRecommendations] = useState([])
  const [loading, setLoading] = useState(false)
  const [insightsLoading, setInsightsLoading] = useState(true)

  useEffect(() => {
    fetchInsights()
    fetchRecommendations()
  }, [])

  async function fetchInsights() {
    try {
      const res = await fetch('/api/ai/insights')
      const data = await res.json()
      setInsights(data.insights || [])
    } catch (error) {
      console.error('Failed to fetch insights:', error)
    } finally {
      setInsightsLoading(false)
    }
  }

  async function fetchRecommendations() {
    try {
      const res = await fetch('/api/ai/recommendations')
      const data = await res.json()
      setRecommendations(data.recommendations || [])
    } catch (error) {
      console.error('Failed to fetch recommendations:', error)
    }
  }

  async function handleQuery(e) {
    e.preventDefault()
    if (!query.trim()) return

    setLoading(true)
    try {
      const res = await fetch('/api/ai/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query })
      })
      const data = await res.json()
      setResponse(data.response)
    } catch (error) {
      console.error('Failed to query AI:', error)
      setResponse('Failed to get AI response. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const priorityColors = {
    high: 'text-rose-600',
    medium: 'text-amber-600',
    low: 'text-blue-600'
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">AI Insights</h1>
        <p className="text-gray-500 dark:text-gray-400">AI-powered system analysis and recommendations</p>
      </div>

      {/* Query Interface */}
      <div className="card p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-violet-500" />
          Ask AI
        </h2>
        <form onSubmit={handleQuery} className="space-y-4">
          <div className="flex gap-2">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Ask about system status, performance, or recommendations..."
              className="input flex-1"
            />
            <button type="submit" disabled={loading} className="btn-primary">
              {loading ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              ) : (
                <Send className="w-4 h-4" />
              )}
            </button>
          </div>
          {response && (
            <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{response}</p>
            </div>
          )}
        </form>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Insights */}
        <div className="card p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Lightbulb className="w-5 h-5 text-amber-500" />
            System Insights
          </h2>
          {insightsLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : insights.length > 0 ? (
            <div className="space-y-3">
              {insights.map((insight, i) => (
                <div key={i} className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className={`w-4 h-4 mt-0.5 ${priorityColors[insight.priority] || 'text-gray-500'}`} />
                    <div>
                      <h3 className="font-medium text-gray-900 dark:text-white">{insight.title}</h3>
                      <p className="text-sm text-gray-500">{insight.description}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-4">No insights available</p>
          )}
        </div>

        {/* Recommendations */}
        <div className="card p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-emerald-500" />
            Recommendations
          </h2>
          {recommendations.length > 0 ? (
            <div className="space-y-3">
              {recommendations.map((rec, i) => (
                <div key={i} className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-xs text-gray-500 uppercase">{rec.category}</span>
                      <p className="text-gray-900 dark:text-white">{rec.recommendation}</p>
                    </div>
                  </div>
                  <p className="text-sm text-emerald-600 mt-1">{rec.expected_impact}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-4">No recommendations available</p>
          )}
        </div>
      </div>
    </div>
  )
}
