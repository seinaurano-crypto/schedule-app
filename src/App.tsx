import { Suspense, lazy, useEffect, useState } from 'react'
import { useStore } from './store/useStore'
import RecordPage from './pages/RecordPage'
import Logo from './components/Logo'

const AnalyzePage = lazy(() => import('./pages/AnalyzePage'))
const SettingsPage = lazy(() => import('./pages/SettingsPage'))

type Tab = 'record' | 'analyze' | 'settings'

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'record', label: '記録', icon: '📝' },
  { id: 'analyze', label: '分析', icon: '📊' },
  { id: 'settings', label: '設定', icon: '⚙️' },
]

export default function App() {
  const ready = useStore((s) => s.ready)
  const init = useStore((s) => s.init)
  const [tab, setTab] = useState<Tab>('record')

  useEffect(() => {
    init()
  }, [init])

  if (!ready) {
    return <div className="h-full flex items-center justify-center text-ink/40 font-bold">読み込み中…</div>
  }

  return (
    <div className="min-h-full flex flex-col">
      <header
        className="sticky top-0 z-30 bg-[#FFF3B0]/90 backdrop-blur border-b border-black/5 px-4 py-3"
        style={{ paddingTop: 'max(0.75rem, env(safe-area-inset-top))' }}
      >
        <h1 className="text-xl font-extrabold flex items-center gap-2">
          <Logo size={30} />
          Time log
        </h1>
      </header>

      <main className="flex-1 w-full max-w-2xl mx-auto px-4 py-4 pb-28">
        <Suspense fallback={<div className="text-center text-ink/40 font-bold py-20">読み込み中…</div>}>
          {tab === 'record' && <RecordPage goToSettings={() => setTab('settings')} />}
          {tab === 'analyze' && <AnalyzePage />}
          {tab === 'settings' && <SettingsPage />}
        </Suspense>
      </main>

      <nav
        className="fixed bottom-0 left-0 right-0 z-30 bg-white/95 backdrop-blur border-t border-black/5"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <div className="max-w-2xl mx-auto flex">
          {TABS.map((t) => {
            const active = tab === t.id
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className="flex-1 flex flex-col items-center gap-0.5 py-2.5 transition-transform active:scale-95"
              >
                <span className="text-2xl" style={{ filter: active ? 'none' : 'grayscale(0.6) opacity(0.55)' }}>
                  {t.icon}
                </span>
                <span className="text-[11px] font-bold" style={{ color: active ? '#FF2D95' : '#1A1A1A66' }}>
                  {t.label}
                </span>
              </button>
            )
          })}
        </div>
      </nav>
    </div>
  )
}
