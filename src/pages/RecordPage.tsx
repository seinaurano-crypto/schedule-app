import { useState } from 'react'
import DateNav from '../components/DateNav'
import AiInput from '../components/AiInput'
import EventList from '../components/EventList'
import ClockView from '../components/ClockView'
import EventEditor from '../components/EventEditor'
import type { TimeEvent } from '../types'

type View = 'list' | 'clock'

interface Props {
  goToSettings: () => void
}

export default function RecordPage({ goToSettings }: Props) {
  const [view, setView] = useState<View>('list')
  const [editor, setEditor] = useState<{ event: TimeEvent | null } | null>(null)

  return (
    <div className="flex flex-col gap-3">
      <DateNav />

      <AiInput onGoToSettings={goToSettings} />

      {/* view toggle */}
      <div className="flex justify-center">
        <div className="inline-flex bg-black/5 rounded-pill p-1">
          {(['list', 'clock'] as View[]).map((v) => (
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
              {v === 'list' ? '📋 リスト' : '🕐 時計'}
            </button>
          ))}
        </div>
      </div>

      {view === 'list' ? (
        <EventList onEdit={(e) => setEditor({ event: e })} />
      ) : (
        <ClockView onEventTap={(e) => setEditor({ event: e })} />
      )}

      {/* add button */}
      <button
        onClick={() => setEditor({ event: null })}
        className="pill-btn bg-shock text-white py-3.5 text-base shadow-md sticky bottom-24 self-center px-8"
      >
        ＋ 予定を追加
      </button>

      {editor && (
        <EventEditor
          event={editor.event}
          onClose={() => setEditor(null)}
          onGoToSettings={() => {
            setEditor(null)
            goToSettings()
          }}
        />
      )}
    </div>
  )
}
