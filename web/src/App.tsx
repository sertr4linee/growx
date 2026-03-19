import { Routes, Route, NavLink } from 'react-router-dom'
import { LayoutDashboard, MessageCircleReply, UserPlus, Settings } from 'lucide-react'
import { clsx } from 'clsx'
import Dashboard from './pages/Dashboard'
import AutoReply from './pages/AutoReply'
import FollowDM from './pages/FollowDM'
import SettingsPage from './pages/Settings'

const nav = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/auto-reply', label: 'Auto Reply', icon: MessageCircleReply },
  { to: '/follow-dm', label: 'Follow DM', icon: UserPlus },
  { to: '/settings', label: 'Settings', icon: Settings },
]

export default function App() {
  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside className="w-56 bg-gray-900 border-r border-gray-800 flex flex-col p-4 gap-1 shrink-0">
        <div className="mb-6 px-2">
          <span className="text-xl font-bold text-white">growx</span>
          <span className="ml-1 text-xs text-gray-500">bot</span>
        </div>
        {nav.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              clsx(
                'flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors',
                isActive
                  ? 'bg-sky-500/20 text-sky-400 font-medium'
                  : 'text-gray-400 hover:text-white hover:bg-gray-800',
              )
            }
          >
            <Icon className="w-4 h-4" />
            {label}
          </NavLink>
        ))}
      </aside>

      {/* Main content */}
      <main className="flex-1 p-8 overflow-auto">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/auto-reply" element={<AutoReply />} />
          <Route path="/follow-dm" element={<FollowDM />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Routes>
      </main>
    </div>
  )
}
