import { useQuery } from '@tanstack/react-query'
import { Activity, MessageCircle, UserPlus, Clock, Wifi, WifiOff } from 'lucide-react'
import { apiFetch, StatusData, LogEntry } from '../api'
import { clsx } from 'clsx'

function StatCard({ icon: Icon, label, value, color }: {
  icon: React.ElementType; label: string; value: string | number; color: string
}) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 flex items-center gap-4">
      <div className={clsx('p-3 rounded-lg', color)}>
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <p className="text-sm text-gray-400">{label}</p>
        <p className="text-2xl font-semibold text-white">{value}</p>
      </div>
    </div>
  )
}

const STATUS_COLORS: Record<string, string> = {
  success: 'text-green-400',
  skipped: 'text-yellow-400',
  error: 'text-red-400',
}

export default function Dashboard() {
  const { data: status } = useQuery<{ running: boolean; last_poll: string | null; today_replies: number; today_dms: number }>({
    queryKey: ['status'],
    queryFn: () => apiFetch('/status'),
    refetchInterval: 10_000,
  })

  const { data: logsData } = useQuery<{ logs: LogEntry[] }>({
    queryKey: ['logs'],
    queryFn: () => apiFetch('/logs?limit=20'),
    refetchInterval: 15_000,
  })

  const running = status?.running ?? false
  const lastPoll = status?.last_poll
    ? new Date(status.last_poll).toLocaleTimeString()
    : '—'

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white">Dashboard</h1>
        <p className="text-gray-400 text-sm mt-1">Real-time bot status</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          icon={running ? Wifi : WifiOff}
          label="Bot Status"
          value={running ? 'Running' : 'Stopped'}
          color={running ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}
        />
        <StatCard
          icon={Clock}
          label="Last Poll"
          value={lastPoll}
          color="bg-gray-700 text-gray-300"
        />
        <StatCard
          icon={MessageCircle}
          label="Replies Today"
          value={status?.today_replies ?? 0}
          color="bg-sky-500/20 text-sky-400"
        />
        <StatCard
          icon={UserPlus}
          label="DMs Today"
          value={status?.today_dms ?? 0}
          color="bg-purple-500/20 text-purple-400"
        />
      </div>

      {/* Activity Log */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl">
        <div className="px-5 py-4 border-b border-gray-800 flex items-center gap-2">
          <Activity className="w-4 h-4 text-gray-400" />
          <h2 className="font-semibold text-white text-sm">Recent Activity</h2>
        </div>
        <div className="divide-y divide-gray-800">
          {!logsData?.logs.length && (
            <p className="text-center text-gray-500 py-10 text-sm">No activity yet.</p>
          )}
          {logsData?.logs.map((log) => (
            <div key={log.id} className="px-5 py-3 flex items-start justify-between gap-4 text-sm">
              <div className="flex items-center gap-3 min-w-0">
                <span className={clsx('shrink-0 font-medium capitalize', STATUS_COLORS[log.status] ?? 'text-gray-300')}>
                  {log.status}
                </span>
                <span className="text-gray-400 truncate">
                  <span className="text-white font-medium">
                    {log.action === 'auto_reply' ? '↩ Reply' : '✉ DM'}
                  </span>
                  {log.target_user && <> → @{log.target_user}</>}
                  {log.message && (
                    <span className="ml-2 text-gray-500 truncate">&ldquo;{log.message}&rdquo;</span>
                  )}
                </span>
              </div>
              <span className="text-gray-600 shrink-0 text-xs">{log.created_at}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
