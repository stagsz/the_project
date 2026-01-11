import { Routes, Route, Navigate } from 'react-router-dom'
import { ThemeProvider } from './context/ThemeContext'
import { AuthProvider, useAuth } from './context/AuthContext'
import Layout from './components/Layout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Devices from './pages/Devices'
import DeviceDetail from './pages/DeviceDetail'
import Models from './pages/Models'
import ModelDetail from './pages/ModelDetail'
import Training from './pages/Training'
import TrainingDetail from './pages/TrainingDetail'
import Anomalies from './pages/Anomalies'
import Maintenance from './pages/Maintenance'
import Quality from './pages/Quality'
import Reports from './pages/Reports'
import AIInsights from './pages/AIInsights'
import AILogs from './pages/AILogs'
import Settings from './pages/Settings'
import Help from './pages/Help'
import ProcessOptimization from './pages/ProcessOptimization'

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  return children
}

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Dashboard />} />
            <Route path="devices" element={<Devices />} />
            <Route path="devices/:id" element={<DeviceDetail />} />
            <Route path="models" element={<Models />} />
            <Route path="models/:id" element={<ModelDetail />} />
            <Route path="training" element={<Training />} />
            <Route path="training/:id" element={<TrainingDetail />} />
            <Route path="anomalies" element={<Anomalies />} />
            <Route path="maintenance" element={<Maintenance />} />
            <Route path="quality" element={<Quality />} />
            <Route path="process-optimization" element={<ProcessOptimization />} />
            <Route path="reports" element={<Reports />} />
            <Route path="ai-insights" element={<AIInsights />} />
            <Route path="ai-logs" element={<AILogs />} />
            <Route path="settings" element={<Settings />} />
            <Route path="help" element={<Help />} />
          </Route>
        </Routes>
      </AuthProvider>
    </ThemeProvider>
  )
}

export default App
