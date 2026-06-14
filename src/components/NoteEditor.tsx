import { useEffect, useMemo, useState } from 'react'
import { useStore } from '../store/useStore'
import { slotToTime } from '../utils/date'

interface Props {
  slot: number
  onClose: () => void
}

export default function NoteEditor({ slot, onClose }: Props) {
  const day = useStore((s) => s.day)
  const categories = useStore((s) => s.categories)
  const labels = useStore((s) => s.labels)
  const setNote = useStore((s) => s.setNote)

  const catId = day.slots[slot]
  const category = categories.find((c) => c.id === catId)
  const [text, setText] = useState(day.notes[slot] ?? '')

  useEffect(() => {
    setText(day.notes[slot] ?? '')
  }, [slot, day.notes])

  // suggestions: prioritise same-category labels, then by frequency / recency
  const suggestions = useMemo(() => {
    const sorted = [...labels].sort((a, b) => {
      const aSame = a.categoryId === catId ? 1 : 0
      const bSame = b.categoryId === catId ? 1 : 0
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
      if (out.length >= 12) break
    }
    return out
  }, [labels, catId])

  const save = async () => {
    await setNote(slot, text)
    onClose()
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center"
      onClick={onClose}
    >
      <div
        className="w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-3xl p-5 animate-pop"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 mb-3">
          {category && (
            <span
              className="px-3 py-1 rounded-pill text-white text-sm font-bold"
              style={{ backgroundColor: category.color }}
            >
              {category.name}
            </span>
          )}
          <span className="text-ink/60 font-bold text-sm">{slotToTime(slot)} 〜</span>
        </div>

        <input
          autoFocus
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && save()}
          placeholder="メモを入力（例: A社打合せ）"
          className="w-full rounded-2xl border-2 border-black/10 px-4 py-3 text-base focus:border-pop-turquoise outline-none"
        />

        {suggestions.length > 0 && (
          <div className="mt-3">
            <div className="text-xs font-bold text-ink/40 mb-1.5">よく使う項目</div>
            <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
              {suggestions.map((l) => (
                <button
                  key={l.id}
                  onClick={() => setText(l.text)}
                  className="pill-btn text-sm bg-pop-mint/15 text-ink border border-pop-mint/40 py-1.5"
                >
                  {l.text}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="flex gap-2 mt-5">
          <button
            onClick={onClose}
            className="pill-btn flex-1 bg-black/5 text-ink py-3"
          >
            キャンセル
          </button>
          <button
            onClick={save}
            className="pill-btn flex-1 bg-pop-coral text-white py-3 shadow-md"
          >
            保存
          </button>
        </div>
      </div>
    </div>
  )
}
