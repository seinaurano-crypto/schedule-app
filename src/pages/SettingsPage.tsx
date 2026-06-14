import { useRef, useState } from 'react'
import { useStore } from '../store/useStore'
import { POP_PALETTE } from '../utils/defaults'
import { exportAll, importAll, type ExportBundle } from '../db/db'
import type { Category } from '../types'

function ColorPicker({ value, onChange }: { value: string; onChange: (c: string) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {POP_PALETTE.map((c) => (
        <button
          key={c}
          onClick={() => onChange(c)}
          className="w-7 h-7 rounded-full transition-transform active:scale-90"
          style={{
            backgroundColor: c,
            outline: value === c ? '3px solid #1A1A1A' : 'none',
            outlineOffset: 2,
          }}
          aria-label={c}
        />
      ))}
    </div>
  )
}

export default function SettingsPage() {
  const categories = useStore((s) => s.categories)
  const addCategory = useStore((s) => s.addCategory)
  const updateCategory = useStore((s) => s.updateCategory)
  const removeCategory = useStore((s) => s.removeCategory)
  const reloadDay = useStore((s) => s.reloadDay)
  const reloadLabels = useStore((s) => s.reloadLabels)

  const [editing, setEditing] = useState<Category | null>(null)
  const [newName, setNewName] = useState('')
  const [newColor, setNewColor] = useState(POP_PALETTE[3])
  const fileRef = useRef<HTMLInputElement>(null)
  const [msg, setMsg] = useState<string | null>(null)

  const flash = (m: string) => {
    setMsg(m)
    setTimeout(() => setMsg(null), 2500)
  }

  const handleExport = async () => {
    const bundle = await exportAll()
    const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `timelog-backup-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
    flash('エクスポートしました')
  }

  const handleImport = async (file: File) => {
    try {
      const text = await file.text()
      const bundle = JSON.parse(text) as ExportBundle
      if (!bundle || !Array.isArray(bundle.categories)) throw new Error('不正なファイル')
      await importAll(bundle)
      await reloadDay()
      await reloadLabels()
      flash('インポートしました')
    } catch (e) {
      flash('インポートに失敗しました: ' + (e as Error).message)
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-2xl font-extrabold">設定</h1>

      {/* Categories */}
      <section className="card">
        <h2 className="font-extrabold text-lg mb-3">カテゴリ</h2>
        <div className="flex flex-col gap-2">
          {categories.map((cat) => (
            <div key={cat.id}>
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full shrink-0" style={{ backgroundColor: cat.color }} />
                <span className="font-bold flex-1 truncate">{cat.name}</span>
                <button
                  onClick={() => setEditing(editing?.id === cat.id ? null : { ...cat })}
                  className="text-sm font-bold text-pop-blue px-2"
                >
                  編集
                </button>
                <button
                  onClick={() => {
                    if (confirm(`「${cat.name}」を削除しますか？\n（記録済みの色は残りますが名前は表示されません）`))
                      removeCategory(cat.id)
                  }}
                  className="text-sm font-bold text-pop-coral px-2"
                >
                  削除
                </button>
              </div>
              {editing?.id === cat.id && (
                <div className="mt-2 p-3 rounded-2xl bg-black/[0.03] flex flex-col gap-3 animate-pop">
                  <input
                    value={editing.name}
                    onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                    className="rounded-pill border-2 border-black/10 px-4 py-2 font-bold outline-none focus:border-pop-turquoise"
                  />
                  <ColorPicker value={editing.color} onChange={(c) => setEditing({ ...editing, color: c })} />
                  <div className="flex gap-2">
                    <button
                      onClick={async () => {
                        if (!editing.name.trim()) return
                        await updateCategory(editing)
                        setEditing(null)
                      }}
                      className="pill-btn bg-pop-mint text-white px-5"
                    >
                      保存
                    </button>
                    <button onClick={() => setEditing(null)} className="pill-btn bg-black/5 px-5">
                      閉じる
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* add new */}
        <div className="mt-4 p-3 rounded-2xl border-2 border-dashed border-black/10 flex flex-col gap-3">
          <div className="text-sm font-bold text-ink/50">新しいカテゴリを追加</div>
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="カテゴリ名"
            className="rounded-pill border-2 border-black/10 px-4 py-2 font-bold outline-none focus:border-pop-turquoise"
          />
          <ColorPicker value={newColor} onChange={setNewColor} />
          <button
            onClick={async () => {
              if (!newName.trim()) return
              await addCategory(newName.trim(), newColor)
              setNewName('')
            }}
            className="pill-btn bg-pop-coral text-white self-start px-6 shadow-md"
          >
            ＋ 追加
          </button>
        </div>
      </section>

      {/* Backup */}
      <section className="card">
        <h2 className="font-extrabold text-lg mb-1">データのバックアップ</h2>
        <p className="text-sm text-ink/50 mb-3">
          すべてのデータは端末内に保存されます。端末変更やバックアップにはエクスポートをご利用ください。
        </p>
        <div className="flex flex-wrap gap-2">
          <button onClick={handleExport} className="pill-btn bg-pop-turquoise text-white px-5 shadow-md">
            ⬇️ エクスポート (JSON)
          </button>
          <button
            onClick={() => fileRef.current?.click()}
            className="pill-btn bg-pop-purple text-white px-5 shadow-md"
          >
            ⬆️ インポート (JSON)
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) handleImport(f)
              e.target.value = ''
            }}
          />
        </div>
        <p className="text-xs text-ink/40 mt-2">
          ※ インポートは現在のデータを上書きします。
        </p>
      </section>

      {msg && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 bg-ink text-white px-5 py-2.5 rounded-pill font-bold shadow-lg animate-pop z-50">
          {msg}
        </div>
      )}
    </div>
  )
}
