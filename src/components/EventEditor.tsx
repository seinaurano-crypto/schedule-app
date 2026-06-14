import { useMemo, useState } from 'react'
import { useStore } from '../store/useStore'
import type { TimeEvent } from '../types'
import TimeField from './TimeField'

interface Props {
  event: TimeEvent | null // null = new
  initialStart?: number
  onClose: () => void
  onGoToSettings?: () => void
}

export default function EventEditor({ event, initialStart, onClose, onGoToSettings }: Props) {
  const categories = useStore((s) => s.categories)
  const labels = useStore((s) => s.labels)
  const addEvent = useStore((s) => s.addEvent)
  const updateEvent = useStore((s) => s.updateEvent)
  const deleteEvent = useStore((s) => s.deleteEvent)

  const [start, setStart] = useState(event?.start ?? initialStart ?? 9 * 60)
  const [end, setEnd] = useState(event?.end ?? (initialStart ?? 9 * 60) + 60)
  const [categoryId, setCategoryId] = useState<string | null>(
    event?.categoryId ?? categories[0]?.id ?? null,
  )
  const [memo, setMemo] = useState(event?.memo ?? '')
  const [error, setError] = useState('')

  const suggestions = useMemo(() => {
    const sorted = [...labels].sort((a, b) => {
      const aSame = a.categoryId === categoryId ? 1 : 0
      const bSame = b.categoryId === categoryId ? 1 : 0
      if (aSame !== bSame) return bSame - aSame
      if (b.count !== a.count) return b.count - a.count
      return b.lastUsed - a.lastUsed
    })
    const seen = new Set<string>()
    const out: typeof labels = []
    for (const l of sorted) {
      if (seen.has(l.text)) continue
      seen.add(l.text)
      out.push(l)
      if (out.length >= 10) break
    }
    return out
  }, [labels, categoryId])

  const save = async () => {
    if (end <= start) {
      setError('終了時刻は開始時刻より後にしてください')
      return
    }
    const payload = { start, end, categoryId, memo: memo.trim() }
    if (event) await updateEvent({ ...event, ...payload })
    else await addEvent(payload)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center" onClick={onClose}>
      <div
        className="w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-3xl p-5 animate-pop"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="font-extrabold text-lg mb-4">{event ? '予定を編集' : '予定を追加'}</h2>

        {/* time range */}
        <div className="flex items-center justify-center gap-3 mb-4">
          <TimeField value={start} onChange={setStart} />
          <span className="font-extrabold text-ink/50">〜</span>
          <TimeField value={end} onChange={setEnd} allow24 />
        </div>

        {/* category */}
        {categories.length === 0 ? (
          <div className="rounded-2xl bg-shock/10 text-ink p-3 text-sm font-bold text-center mb-4">
            カテゴリがありません。
            <button onClick={onGoToSettings} className="underline text-shock ml-1">
              設定で作成
            </button>
            してください。
          </div>
        ) : (
          <div className="flex flex-wrap gap-2 mb-4">
            {categories.map((c) => {
              const active = categoryId === c.id
              return (
                <button
                  key={c.id}
                  onClick={() => setCategoryId(c.id)}
                  className="pill-btn flex items-center gap-1.5 py-1.5 text-sm"
                  style={{
                    backgroundColor: active ? c.color : 'white',
                    color: active ? '#fff' : '#1A1A1A',
                    border: active ? `2px solid ${c.color}` : '2px solid rgba(0,0,0,0.08)',
                  }}
                >
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: active ? '#fff' : c.color }} />
                  {c.name}
                </button>
              )
            })}
          </div>
        )}

        {/* memo */}
        <input
          value={memo}
          onChange={(e) => setMemo(e.target.value)}
          placeholder="メモ（任意・例: A社打合せ）"
          className="w-full rounded-2xl border-2 border-black/10 px-4 py-3 text-base focus:border-shock outline-none"
        />
        {suggestions.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-2 max-h-24 overflow-y-auto">
            {suggestions.map((l) => (
              <button
                key={l.id}
                onClick={() => setMemo(l.text)}
                className="pill-btn text-sm bg-pop-mint/15 text-ink border border-pop-mint/40 py-1"
              >
                {l.text}
              </button>
            ))}
          </div>
        )}

        {error && <div className="text-pop-coral text-sm font-bold mt-2">{error}</div>}

        <div className="flex gap-2 mt-5">
          {event && (
            <button
              onClick={async () => {
                await deleteEvent(event.id)
                onClose()
              }}
              className="pill-btn bg-pop-coral/10 text-pop-coral px-4 py-3"
            >
              削除
            </button>
          )}
          <button onClick={onClose} className="pill-btn flex-1 bg-black/5 text-ink py-3">
            キャンセル
          </button>
          <button onClick={save} className="pill-btn flex-1 bg-shock text-white py-3 shadow-md">
            保存
          </button>
        </div>
      </div>
    </div>
  )
}
