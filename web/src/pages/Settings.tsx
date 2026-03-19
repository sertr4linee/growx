import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Save, Loader2 } from 'lucide-react'
import { apiFetch, Config } from '../api'

const POLL_OPTIONS = [
  { value: '30', label: '30 seconds' },
  { value: '60', label: '1 minute' },
  { value: '120', label: '2 minutes' },
  { value: '300', label: '5 minutes' },
]

export default function SettingsPage() {
  const qc = useQueryClient()
  const { data } = useQuery<{ config: Config }>({ queryKey: ['config'], queryFn: () => apiFetch('/config') })
  const cfg = data?.config ?? {}

  const [pollInterval, setPollInterval] = useState('60')
  const [clixPath, setClixPath] = useState('clix')
  const [aiProvider, setAiProvider] = useState<'openai' | 'ollama'>('ollama')
  const [aiModel, setAiModel] = useState('llama3')
  const [apiKey, setApiKey] = useState('')
  const [ollamaUrl, setOllamaUrl] = useState('http://localhost:11434')

  useEffect(() => {
    if (!data) return
    setPollInterval(cfg['bot.poll_interval_secs'] ?? '60')
    setClixPath(cfg['bot.clix_path'] ?? 'clix')
    setAiProvider((cfg['ai.provider'] as 'openai' | 'ollama') ?? 'ollama')
    setAiModel(cfg['ai.model'] ?? 'llama3')
    setApiKey(cfg['ai.api_key'] ?? '')
    setOllamaUrl(cfg['ai.ollama_url'] ?? 'http://localhost:11434')
  }, [data])

  const save = useMutation({
    mutationFn: () =>
      apiFetch('/config', {
        method: 'PUT',
        body: JSON.stringify({
          updates: {
            'bot.poll_interval_secs': pollInterval,
            'bot.clix_path': clixPath,
            'ai.provider': aiProvider,
            'ai.model': aiModel,
            'ai.api_key': apiKey,
            'ai.ollama_url': ollamaUrl,
          },
        }),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['config'] }),
  })

  return (
    <div className="max-w-2xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white">Settings</h1>
        <p className="text-gray-400 text-sm mt-1">Bot behaviour and AI configuration</p>
      </div>

      <Section title="Bot" description="Core polling settings">
        <Field label="Poll Interval">
          <select
            className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-sky-500"
            value={pollInterval}
            onChange={(e) => setPollInterval(e.target.value)}
          >
            {POLL_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </Field>
        <Field label="clix Path" description="Path to the clix binary (e.g. /usr/local/bin/clix)">
          <input
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-sky-500"
            value={clixPath}
            onChange={(e) => setClixPath(e.target.value)}
          />
        </Field>
      </Section>

      <Section title="AI" description="Used for template variation (optional)">
        <Field label="Provider">
          <select
            className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-sky-500"
            value={aiProvider}
            onChange={(e) => setAiProvider(e.target.value as 'openai' | 'ollama')}
          >
            <option value="ollama">Ollama (local)</option>
            <option value="openai">OpenAI</option>
          </select>
        </Field>
        <Field label="Model">
          <input
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-sky-500"
            placeholder={aiProvider === 'ollama' ? 'llama3' : 'gpt-4o-mini'}
            value={aiModel}
            onChange={(e) => setAiModel(e.target.value)}
          />
        </Field>
        {aiProvider === 'openai' && (
          <Field label="OpenAI API Key">
            <input
              type="password"
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-sky-500"
              placeholder="sk-..."
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
            />
          </Field>
        )}
        {aiProvider === 'ollama' && (
          <Field label="Ollama URL">
            <input
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-sky-500"
              value={ollamaUrl}
              onChange={(e) => setOllamaUrl(e.target.value)}
            />
          </Field>
        )}
      </Section>

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

function Section({ title, description, children }: {
  title: string; description?: string; children: React.ReactNode
}) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-5">
      <div>
        <h2 className="font-semibold text-white text-sm">{title}</h2>
        {description && <p className="text-gray-500 text-xs mt-0.5">{description}</p>}
      </div>
      {children}
    </div>
  )
}

function Field({ label, description, children }: {
  label: string; description?: string; children: React.ReactNode
}) {
  return (
    <div className="space-y-1.5">
      <label className="block text-sm text-gray-300 font-medium">{label}</label>
      {description && <p className="text-xs text-gray-500">{description}</p>}
      {children}
    </div>
  )
}
