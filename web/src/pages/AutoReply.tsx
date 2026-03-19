import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, X, Save, Loader2 } from 'lucide-react'
import { apiFetch, Config } from '../api'
import { Toggle } from '../components/Toggle'

function TagInput({ values, onChange }: { values: string[]; onChange: (v: string[]) => void }) {
  const [input, setInput] = useState('')

  const add = () => {
    const v = input.trim()
    if (v && !values.includes(v)) onChange([...values, v])
    setInput('')
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {values.map((v) => (
          <span key={v} className="flex items-center gap-1 bg-sky-500/20 text-sky-300 text-xs px-2 py-1 rounded-full">
            {v}
            <button onClick={() => onChange(values.filter((x) => x !== v))}>
              <X className="w-3 h-3" />
            </button>
          </span>
        ))}
      </div>
      <div className="flex gap-2">
        <input
          className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-sky-500"
          placeholder="Add keyword…"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && add()}
        />
        <button onClick={add} className="bg-sky-600 hover:bg-sky-500 text-white px-3 py-2 rounded-lg text-sm transition-colors">
          <Plus className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}

function TemplateList({ values, onChange }: { values: string[]; onChange: (v: string[]) => void }) {
  const add = () => onChange([...values, ''])
  const update = (i: number, v: string) => {
    const next = [...values]
    next[i] = v
    onChange(next)
  }
  const remove = (i: number) => onChange(values.filter((_, idx) => idx !== i))

  return (
    <div className="space-y-2">
      {values.map((t, i) => (
        <div key={i} className="flex gap-2">
          <textarea
            className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-sky-500 resize-none"
            rows={2}
            placeholder="Reply template…"
            value={t}
            onChange={(e) => update(i, e.target.value)}
          />
          <button onClick={() => remove(i)} className="text-gray-500 hover:text-red-400 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}
      <button onClick={add} className="flex items-center gap-2 text-sm text-sky-400 hover:text-sky-300 transition-colors">
        <Plus className="w-4 h-4" /> Add template
      </button>
    </div>
  )
}

export default function AutoReply() {
  const qc = useQueryClient()
  const { data } = useQuery<{ config: Config }>({ queryKey: ['config'], queryFn: () => apiFetch('/config') })
  const cfg = data?.config ?? {}

  const [enabled, setEnabled] = useState(false)
  const [keywords, setKeywords] = useState<string[]>([])
  const [templates, setTemplates] = useState<string[]>([])
  const [maxPerDay, setMaxPerDay] = useState(50)
  const [aiVariation, setAiVariation] = useState(false)

  useEffect(() => {
    if (!data) return
    setEnabled(cfg['auto_reply.enabled'] === 'true')
    setKeywords(JSON.parse(cfg['auto_reply.keywords'] ?? '[]'))
    setTemplates(JSON.parse(cfg['auto_reply.templates'] ?? '[]'))
    setMaxPerDay(Number(cfg['auto_reply.max_per_day'] ?? 50))
    setAiVariation(cfg['auto_reply.ai_variation'] === 'true')
  }, [data])

  const save = useMutation({
    mutationFn: () =>
      apiFetch('/config', {
        method: 'PUT',
        body: JSON.stringify({
          updates: {
            'auto_reply.enabled': String(enabled),
            'auto_reply.keywords': JSON.stringify(keywords),
            'auto_reply.templates': JSON.stringify(templates),
            'auto_reply.max_per_day': String(maxPerDay),
            'auto_reply.ai_variation': String(aiVariation),
          },
        }),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['config'] }),
  })

  return (
    <div className="max-w-2xl space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Auto Reply</h1>
          <p className="text-gray-400 text-sm mt-1">Reply to mentions matching keywords</p>
        </div>
        <Toggle checked={enabled} onChange={setEnabled} />
      </div>

      <Section title="Keywords" description="Leave empty to reply to all mentions.">
        <TagInput values={keywords} onChange={setKeywords} />
      </Section>

      <Section title="Reply Templates" description="One will be picked at random per reply.">
        <TemplateList values={templates} onChange={setTemplates} />
      </Section>

      <Section title="Limits">
        <label className="block text-sm text-gray-400 mb-1">Max replies per day</label>
        <input
          type="number"
          min={1} max={500}
          className="w-32 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-sky-500"
          value={maxPerDay}
          onChange={(e) => setMaxPerDay(Number(e.target.value))}
        />
      </Section>

      <Section title="AI Variation" description="Use AI to slightly vary each reply to avoid detection.">
        <Toggle checked={aiVariation} onChange={setAiVariation} label="Enable AI variation" />
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
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-4">
      <div>
        <h2 className="font-semibold text-white text-sm">{title}</h2>
        {description && <p className="text-gray-500 text-xs mt-0.5">{description}</p>}
      </div>
      {children}
    </div>
  )
}
