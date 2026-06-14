import { useStore } from '../store/useStore'
import { addDays, formatFull, todayKey } from '../utils/date'

export default function DateNav() {
  const currentDate = useStore((s) => s.currentDate)
  const setDate = useStore((s) => s.setDate)
  const isToday = currentDate === todayKey()

  return (
    <div className="flex items-center justify-between gap-2">
      <button
        className="pill-btn bg-white border border-black/10 text-ink w-11 h-11 flex items-center justify-center text-xl"
        onClick={() => setDate(addDays(currentDate, -1))}
        aria-label="前日"
      >
        ‹
      </button>

      <div className="flex flex-col items-center">
        <div className="text-lg font-extrabold leading-tight">{formatFull(currentDate)}</div>
        <div className="flex items-center gap-2 mt-1">
          <input
            type="date"
            value={currentDate}
            onChange={(e) => e.target.value && setDate(e.target.value)}
            className="text-xs bg-white border border-black/10 rounded-pill px-3 py-1 text-ink/70"
          />
          {!isToday && (
            <button
              className="text-xs font-bold text-pop-coral bg-pop-coral/10 rounded-pill px-3 py-1 active:scale-95"
              onClick={() => setDate(todayKey())}
            >
              今日に戻る
            </button>
          )}
        </div>
      </div>

      <button
        className="pill-btn bg-white border border-black/10 text-ink w-11 h-11 flex items-center justify-center text-xl"
        onClick={() => setDate(addDays(currentDate, 1))}
        aria-label="翌日"
      >
        ›
      </button>
    </div>
  )
}
