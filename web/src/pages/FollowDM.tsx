import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Save, Loader2 } from 'lucide-react'
import { apiFetch, Config } from '../api'
import { Toggle } from '../components/Toggle'

export default function FollowDM() {
  const qc = useQueryClient()
  const { data } = useQuery<{ config: Config }>({ queryKey: ['config'], queryFn: () => apiFetch('/config') })
  const cfg = data?.config ?? {}

  const [enabled, setEnabled] = useState(false)
  const [template, setTemplate] = useState('')
  const [maxPerDay, setMaxPerDay] = useState(30)
  const [aiVariation, setAiVariation] = useState(false)

  useEffect(() => {
    if (!data) return
    setEnabled(cfg['follow_dm.enabled'] === 'true')
    setTemplate(cfg['follow_dm.template'] ?? '')
    setMaxPerDay(Number(cfg['follow_dm.max_per_day'] ?? 30))
    setAiVariation(cfg['follow_dm.ai_variation'] === 'true')
  }, [data])

  const save = useMutation({
    mutationFn: () =>
      apiFetch('/config', {
        method: 'PUT',
        body: JSON.stringify({
          updates: {
            'follow_dm.enabled': String(enabled),
            'follow_dm.template': template,
            'follow_dm.max_per_day': String(maxPerDay),
            'follow_dm.ai_variation': String(aiVariation),
          },
        }),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['config'] }),
  })

  return (
    <div className="max-w-2xl space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Follow DM</h1>
          <p className="text-gray-400 text-sm mt-1">Auto-DM new followers</p>
        </div>
        <Toggle checked={enabled} onChange={setEnabled} />
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-4">
        <div>
          <h2 className="font-semibold text-white text-sm">Welcome Message</h2>
          <p className="text-gray-500 text-xs mt-0.5">Sent to every new follower once.</p>
        </div>
        <textarea
          className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-sky-500 resize-none"
          rows={4}
          placeholder="Hey! Thanks for following — welcome to the crew 🙌"
          value={template}
          onChange={(e) => setTemplate(e.target.value)}
        />
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-4">
        <h2 className="font-semibold text-white text-sm">Limits</h2>
        <div>
          <label className="block text-sm text-gray-400 mb-1">Max DMs per day</label>
          <input
            type="number"
            min={1} max={200}
            className="w-32 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-sky-500"
            value={maxPerDay}
            onChange={(e) => setMaxPerDay(Number(e.target.value))}
          />
        </div>
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-4">
        <h2 className="font-semibold text-white text-sm">AI Variation</h2>
        <Toggle checked={aiVariation} onChange={setAiVariation} label="Slightly vary each DM with AI" />
      </div>

      <button
        onClick={() => save.mutate()}
        disabled={save.isPending}
        className="flex items-center gap-2 bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white px-5 py-2.5 rounded-lg text-sm font-medium transition-colors"
      >
        {save.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
        Save Changes
      </button>
    </div>
  )
}
