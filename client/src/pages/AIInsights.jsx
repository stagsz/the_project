import { useState, useEffect } from 'react'
import { Sparkles, Send, Lightbulb, AlertTriangle, TrendingUp, Zap, Clock, Target, ChevronRight } from 'lucide-react'
import Modal from '../components/Modal'

export default function AIInsights() {
  const [query, setQuery] = useState('')
  const [response, setResponse] = useState('')
  const [insights, setInsights] = useState([])
  const [recommendations, setRecommendations] = useState([])
  const [loading, setLoading] = useState(false)
  const [insightsLoading, setInsightsLoading] = useState(true)
  const [selectedInsight, setSelectedInsight] = useState(null)
  const [selectedRecommendation, setSelectedRecommendation] = useState(null)
  const [showAskAIModal, setShowAskAIModal] = useState(false)

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

  const priorityBadgeColors = {
    high: 'bg-rose-100 text-rose-700 dark:bg-rose-900/50 dark:text-rose-400',
    medium: 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-400',
    low: 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-400'
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">AI Insights</h1>
          <p className="text-gray-500 dark:text-gray-400">AI-powered system analysis and recommendations</p>
        </div>
        <button onClick={() => setShowAskAIModal(true)} className="btn-primary">
          <Sparkles className="w-4 h-4 mr-2" />
          Ask AI
        </button>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-100 dark:bg-amber-900/50 rounded-lg flex items-center justify-center">
              <Lightbulb className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{insights.length}</p>
              <p className="text-sm text-gray-500">Active Insights</p>
            </div>
          </div>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-100 dark:bg-emerald-900/50 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{recommendations.length}</p>
              <p className="text-sm text-gray-500">Recommendations</p>
            </div>
          </div>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-rose-100 dark:bg-rose-900/50 rounded-lg flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-rose-600 dark:text-rose-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {insights.filter(i => i.priority === 'high').length}
              </p>
              <p className="text-sm text-gray-500">High Priority</p>
            </div>
          </div>
        </div>
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
                <button
                  key={i}
                  onClick={() => setSelectedInsight(insight)}
                  className="w-full p-4 bg-gray-50 dark:bg-gray-800 rounded-lg text-left hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors border border-transparent hover:border-gray-200 dark:hover:border-gray-600"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 flex-1">
                      <AlertTriangle className={`w-5 h-5 mt-0.5 flex-shrink-0 ${priorityColors[insight.priority] || 'text-gray-500'}`} />
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-gray-900 dark:text-white">{insight.title}</h3>
                        <p className="text-sm text-gray-500 mt-1 line-clamp-2">{insight.description}</p>
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-gray-400 flex-shrink-0" />
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Lightbulb className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600 mb-3" />
              <p className="text-gray-500">No insights available</p>
              <p className="text-sm text-gray-400 mt-1">Insights will appear as your system generates data</p>
            </div>
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
                <button
                  key={i}
                  onClick={() => setSelectedRecommendation(rec)}
                  className="w-full p-4 bg-gray-50 dark:bg-gray-800 rounded-lg text-left hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors border border-transparent hover:border-gray-200 dark:hover:border-gray-600"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <span className="inline-block px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-400 rounded mb-2">
                        {rec.category}
                      </span>
                      <p className="text-gray-900 dark:text-white font-medium">{rec.recommendation}</p>
                      <p className="text-sm text-emerald-600 dark:text-emerald-400 mt-2 flex items-center gap-1">
                        <Zap className="w-4 h-4" />
                        {rec.expected_impact}
                      </p>
                    </div>
                    <ChevronRight className="w-5 h-5 text-gray-400 flex-shrink-0 mt-1" />
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <TrendingUp className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600 mb-3" />
              <p className="text-gray-500">No recommendations available</p>
              <p className="text-sm text-gray-400 mt-1">AI will generate recommendations based on system analysis</p>
            </div>
          )}
        </div>
      </div>

      {/* Ask AI Modal */}
      <Modal
        isOpen={showAskAIModal}
        onClose={() => {
          setShowAskAIModal(false)
          setResponse('')
          setQuery('')
        }}
        title="Ask AI"
        size="lg"
      >
        <div className="space-y-4">
          <div className="flex items-center gap-3 p-4 bg-violet-50 dark:bg-violet-900/30 rounded-lg">
            <Sparkles className="w-6 h-6 text-violet-600 dark:text-violet-400" />
            <div>
              <p className="font-medium text-violet-900 dark:text-violet-300">AI Assistant</p>
              <p className="text-sm text-violet-700 dark:text-violet-400">Ask questions about your system, performance metrics, or get recommendations</p>
            </div>
          </div>

          <form onSubmit={handleQuery} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Your Question
              </label>
              <textarea
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="E.g., What devices have the highest error rates? How can I improve training performance?"
                rows={3}
                className="w-full px-4 py-3 border-2 border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-violet-500 focus:border-transparent resize-none"
              />
            </div>

            <div className="flex flex-wrap gap-2">
              <span className="text-xs text-gray-500">Suggestions:</span>
              {['System health overview', 'Device performance issues', 'Training optimization tips'].map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  onClick={() => setQuery(suggestion)}
                  className="px-3 py-1 text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                >
                  {suggestion}
                </button>
              ))}
            </div>

            {response && (
              <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="w-4 h-4 text-violet-500" />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">AI Response</span>
                </div>
                <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{response}</p>
              </div>
            )}

            <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
              <button
                type="button"
                onClick={() => {
                  setShowAskAIModal(false)
                  setResponse('')
                  setQuery('')
                }}
                className="btn-secondary"
              >
                Close
              </button>
              <button type="submit" disabled={loading || !query.trim()} className="btn-primary">
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Thinking...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    Ask AI
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </Modal>

      {/* Insight Detail Modal */}
      <Modal
        isOpen={!!selectedInsight}
        onClose={() => setSelectedInsight(null)}
        title="Insight Details"
        size="md"
      >
        {selectedInsight && (
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                selectedInsight.priority === 'high' ? 'bg-rose-100 dark:bg-rose-900/50' :
                selectedInsight.priority === 'medium' ? 'bg-amber-100 dark:bg-amber-900/50' :
                'bg-blue-100 dark:bg-blue-900/50'
              }`}>
                <AlertTriangle className={`w-5 h-5 ${priorityColors[selectedInsight.priority]}`} />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{selectedInsight.title}</h3>
                <span className={`inline-block px-2 py-0.5 text-xs font-medium rounded mt-1 ${priorityBadgeColors[selectedInsight.priority]}`}>
                  {selectedInsight.priority?.toUpperCase()} PRIORITY
                </span>
              </div>
            </div>

            <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Description</h4>
              <p className="text-gray-600 dark:text-gray-400">{selectedInsight.description}</p>
            </div>

            {selectedInsight.affected_devices && (
              <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                  <Target className="w-4 h-4" />
                  Affected Devices
                </h4>
                <p className="text-gray-600 dark:text-gray-400">{selectedInsight.affected_devices}</p>
              </div>
            )}

            {selectedInsight.created_at && (
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <Clock className="w-4 h-4" />
                Generated: {new Date(selectedInsight.created_at).toLocaleString()}
              </div>
            )}

            <div className="flex justify-end pt-4 border-t border-gray-200 dark:border-gray-700">
              <button onClick={() => setSelectedInsight(null)} className="btn-secondary">
                Close
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Recommendation Detail Modal */}
      <Modal
        isOpen={!!selectedRecommendation}
        onClose={() => setSelectedRecommendation(null)}
        title="Recommendation Details"
        size="md"
      >
        {selectedRecommendation && (
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-emerald-100 dark:bg-emerald-900/50 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div className="flex-1">
                <span className="inline-block px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-400 rounded mb-2">
                  {selectedRecommendation.category}
                </span>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{selectedRecommendation.recommendation}</h3>
              </div>
            </div>

            <div className="p-4 bg-emerald-50 dark:bg-emerald-900/30 rounded-lg border border-emerald-200 dark:border-emerald-800">
              <h4 className="text-sm font-medium text-emerald-800 dark:text-emerald-300 mb-2 flex items-center gap-2">
                <Zap className="w-4 h-4" />
                Expected Impact
              </h4>
              <p className="text-emerald-700 dark:text-emerald-400">{selectedRecommendation.expected_impact}</p>
            </div>

            {selectedRecommendation.implementation_steps && (
              <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Implementation Steps</h4>
                <p className="text-gray-600 dark:text-gray-400">{selectedRecommendation.implementation_steps}</p>
              </div>
            )}

            {selectedRecommendation.created_at && (
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <Clock className="w-4 h-4" />
                Generated: {new Date(selectedRecommendation.created_at).toLocaleString()}
              </div>
            )}

            <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
              <button onClick={() => setSelectedRecommendation(null)} className="btn-secondary">
                Close
              </button>
              <button className="btn-primary">
                <Zap className="w-4 h-4 mr-2" />
                Apply Recommendation
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
