import { useState } from 'react'
import { useStore } from '../store/useStore'
import { parseSchedule } from '../utils/ai'

interface Props {
  onGoToSettings: () => void
}

export default function AiInput({ onGoToSettings }: Props) {
  const categories = useStore((s) => s.categories)
  const apiKey = useStore((s) => s.apiKey)
  const model = useStore((s) => s.model)
  const addEvents = useStore((s) => s.addEvents)

  const [open, setOpen] = useState(false)
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState<{ count: number } | null>(null)

  const run = async () => {
    setError('')
    setResult(null)
    if (!apiKey) {
      setError('APIキーが未設定です。設定画面で登録してください。')
      return
    }
    if (!text.trim()) return
    setLoading(true)
    try {
      const events = await parseSchedule(text.trim(), categories, apiKey, model)
      if (events.length === 0) {
        setError('予定を読み取れませんでした。表現を変えてお試しください。')
      } else {
        await addEvents(events)
        setResult({ count: events.length })
        setText('')
      }
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="rounded-2xl border-2 border-shock/30 bg-shock/5 p-3">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center justify-between w-full font-extrabold text-shock"
      >
        <span>✨ AIで入力（自然な言葉でOK）</span>
        <span className="text-sm">{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div className="mt-3 animate-pop">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={3}
            placeholder="例: 9時から会議、10時半に移動して12時までランチ、午後は14時から17時まで仕事"
            className="w-full rounded-2xl border-2 border-black/10 px-4 py-3 text-base focus:border-shock outline-none resize-none"
          />
          <div className="flex items-center gap-2 mt-2">
            <button
              onClick={run}
              disabled={loading}
              className="pill-btn bg-shock text-white px-6 py-2.5 shadow-md disabled:opacity-60"
            >
              {loading ? '解析中…' : '登録する'}
            </button>
            {!apiKey && (
              <button onClick={onGoToSettings} className="text-sm font-bold text-shock underline">
                APIキーを設定
              </button>
            )}
          </div>
          {result && (
            <div className="text-sm font-bold text-pop-mint mt-2">
              ✓ {result.count}件を登録しました。下のリストから修正できます。
            </div>
          )}
          {error && <div className="text-sm font-bold text-pop-coral mt-2 break-words">{error}</div>}
        </div>
      )}
    </div>
  )
}
