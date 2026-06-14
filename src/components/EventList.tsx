import { useStore } from '../store/useStore'
import type { TimeEvent } from '../types'
import { minutesToHM, formatDuration } from '../utils/date'

interface Props {
  onEdit: (e: TimeEvent) => void
}

export default function EventList({ onEdit }: Props) {
  const day = useStore((s) => s.day)
  const categories = useStore((s) => s.categories)
  const catOf = (id: string | null) => categories.find((c) => c.id === id)

  if (day.events.length === 0) {
    return (
      <div className="card text-center text-ink/40 py-10">
        まだ予定がありません。<br />
        下の「＋ 予定を追加」か、AI入力で登録しましょう。
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2">
      {day.events.map((e) => {
        const cat = catOf(e.categoryId)
        const color = cat?.color ?? '#C9C9C9'
        return (
          <button
            key={e.id}
            onClick={() => onEdit(e)}
            className="flex items-stretch gap-3 bg-white rounded-2xl border border-black/5 p-3 text-left active:scale-[0.99] transition-transform"
          >
            <div className="w-1.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-extrabold tabular-nums">
                  {minutesToHM(e.start)}–{minutesToHM(e.end)}
                </span>
                <span className="text-xs text-ink/40 font-bold">{formatDuration(e.end - e.start)}</span>
              </div>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
                <span className="font-bold text-sm">{cat?.name ?? '未分類'}</span>
                {e.memo && <span className="text-sm text-ink/60 truncate">— {e.memo}</span>}
              </div>
            </div>
            <span className="self-center text-ink/30 text-lg">✏️</span>
          </button>
        )
      })}
    </div>
  )
}
