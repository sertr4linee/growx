// Shared API utilities
export const API_BASE = '/api'

export async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options?.headers },
    ...options,
  })
  if (!res.ok) throw new Error(`API error ${res.status}`)
  return res.json()
}

export interface Config {
  [key: string]: string
}

export interface StatusData {
  running: boolean
  last_poll: string | null
  today_replies: number
  today_dms: number
}

export interface LogEntry {
  id: number
  action: string
  target_user: string | null
  tweet_id: string | null
  message: string | null
  status: string
  created_at: string
}
