import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import { Settings as SettingsIcon, User, Bell, Palette, Save } from 'lucide-react'

export default function Settings() {
  const { user, updateProfile } = useAuth()
  const { theme, setTheme } = useTheme()
  const [saving, setSaving] = useState(false)
  const [preferences, setPreferences] = useState(user?.preferences || {
    units: 'SI',
    timezone: 'UTC',
    dateFormat: 'YYYY-MM-DD',
    timeFormat: '24h'
  })

  async function handleSave() {
    setSaving(true)
    try {
      await updateProfile({ preferences })
    } catch (error) {
      console.error('Failed to save settings:', error)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Settings</h1>
        <p className="text-gray-500 dark:text-gray-400">Manage your preferences</p>
      </div>

      {/* Profile */}
      <div className="card p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/50 rounded-lg flex items-center justify-center">
            <User className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          </div>
          Profile
        </h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Name</label>
            <input type="text" defaultValue={user?.name} className="input" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email</label>
            <input type="email" defaultValue={user?.email} className="input" disabled />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Role</label>
            <input type="text" defaultValue={user?.role} className="input capitalize" disabled />
          </div>
        </div>
      </div>

      {/* Appearance */}
      <div className="card p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-3">
          <div className="w-10 h-10 bg-violet-100 dark:bg-violet-900/50 rounded-lg flex items-center justify-center">
            <Palette className="w-5 h-5 text-violet-600 dark:text-violet-400" />
          </div>
          Appearance
        </h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Theme</label>
            <select
              value={theme}
              onChange={(e) => setTheme(e.target.value)}
              className="input"
            >
              <option value="light">Light</option>
              <option value="dark">Dark</option>
            </select>
          </div>
        </div>
      </div>

      {/* Industrial Preferences */}
      <div className="card p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-3">
          <div className="w-10 h-10 bg-emerald-100 dark:bg-emerald-900/50 rounded-lg flex items-center justify-center">
            <SettingsIcon className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
          </div>
          Industrial Preferences
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Units</label>
            <select
              value={preferences.units}
              onChange={(e) => setPreferences({ ...preferences, units: e.target.value })}
              className="input"
            >
              <option value="SI">SI (Metric)</option>
              <option value="Imperial">Imperial</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Timezone</label>
            <select
              value={preferences.timezone}
              onChange={(e) => setPreferences({ ...preferences, timezone: e.target.value })}
              className="input"
            >
              <option value="UTC">UTC</option>
              <option value="America/New_York">Eastern Time</option>
              <option value="America/Chicago">Central Time</option>
              <option value="America/Denver">Mountain Time</option>
              <option value="America/Los_Angeles">Pacific Time</option>
              <option value="Europe/London">London</option>
              <option value="Europe/Berlin">Berlin</option>
              <option value="Asia/Tokyo">Tokyo</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Date Format</label>
            <select
              value={preferences.dateFormat}
              onChange={(e) => setPreferences({ ...preferences, dateFormat: e.target.value })}
              className="input"
            >
              <option value="YYYY-MM-DD">YYYY-MM-DD (ISO 8601)</option>
              <option value="MM/DD/YYYY">MM/DD/YYYY</option>
              <option value="DD/MM/YYYY">DD/MM/YYYY</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Time Format</label>
            <select
              value={preferences.timeFormat}
              onChange={(e) => setPreferences({ ...preferences, timeFormat: e.target.value })}
              className="input"
            >
              <option value="24h">24-hour</option>
              <option value="12h">12-hour</option>
            </select>
          </div>
        </div>
      </div>

      {/* Notifications */}
      <div className="card p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-3">
          <div className="w-10 h-10 bg-amber-100 dark:bg-amber-900/50 rounded-lg flex items-center justify-center">
            <Bell className="w-5 h-5 text-amber-600 dark:text-amber-400" />
          </div>
          Notifications
        </h2>
        <div className="space-y-3">
          {['Training Complete', 'Device Offline', 'Anomaly Detected', 'Maintenance Alert'].map((item) => (
            <label key={item} className="flex items-center justify-between">
              <span className="text-gray-700 dark:text-gray-300">{item}</span>
              <input type="checkbox" defaultChecked className="rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
            </label>
          ))}
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <button onClick={handleSave} disabled={saving} className="btn-primary">
          <Save className="w-4 h-4 mr-2" />
          {saving ? 'Saving...' : 'Save Settings'}
        </button>
      </div>
    </div>
  )
}
