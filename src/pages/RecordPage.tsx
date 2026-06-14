import { useState } from 'react'
import DateNav from '../components/DateNav'
import CategoryBar from '../components/CategoryBar'
import Timeline from '../components/Timeline'
import ClockView from '../components/ClockView'
import NoteEditor from '../components/NoteEditor'

type View = 'timeline' | 'clock'

export default function RecordPage() {
  const [view, setView] = useState<View>('timeline')
  const [editSlot, setEditSlot] = useState<number | null>(null)

  return (
    <div className="flex flex-col gap-3">
      <DateNav />

      <CategoryBar />

      {/* view toggle */}
      <div className="flex justify-center">
        <div className="inline-flex bg-black/5 rounded-pill p-1">
          {(['timeline', 'clock'] as View[]).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className="pill-btn py-1.5 px-5 text-sm"
              style={{
                backgroundColor: view === v ? '#fff' : 'transparent',
                color: view === v ? '#1A1A1A' : '#1A1A1A88',
                boxShadow: view === v ? '0 2px 8px rgba(0,0,0,0.08)' : 'none',
              }}
            >
              {v === 'timeline' ? '📋 タイムライン' : '🕐 時計'}
            </button>
          ))}
        </div>
      </div>

      <div className="text-center text-xs text-ink/40 -mt-1">
        カテゴリを選んで、なぞって塗りましょう。塗った所をタップでメモ。
      </div>

      {view === 'timeline' ? (
        <div className="pb-2">
          <Timeline onSlotTap={setEditSlot} />
        </div>
      ) : (
        <ClockView onSlotTap={setEditSlot} />
      )}

      {editSlot !== null && <NoteEditor slot={editSlot} onClose={() => setEditSlot(null)} />}
    </div>
  )
}
