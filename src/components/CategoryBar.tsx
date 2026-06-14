import { useStore } from '../store/useStore'

export default function CategoryBar() {
  const categories = useStore((s) => s.categories)
  const selectedCategoryId = useStore((s) => s.selectedCategoryId)
  const tool = useStore((s) => s.tool)
  const selectCategory = useStore((s) => s.selectCategory)
  const setTool = useStore((s) => s.setTool)

  return (
    <div className="flex gap-2 overflow-x-auto no-scrollbar py-1 -mx-4 px-4">
      {categories.map((cat) => {
        const active = tool === 'paint' && selectedCategoryId === cat.id
        return (
          <button
            key={cat.id}
            onClick={() => selectCategory(cat.id)}
            className="pill-btn flex items-center gap-1.5 shrink-0 animate-bounceIn"
            style={{
              backgroundColor: active ? cat.color : 'white',
              color: active ? '#fff' : '#1A1A1A',
              border: active ? `2px solid ${cat.color}` : '2px solid rgba(0,0,0,0.08)',
              boxShadow: active ? `0 4px 14px ${cat.color}66` : 'none',
            }}
          >
            <span
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: active ? '#fff' : cat.color }}
            />
            {cat.name}
          </button>
        )
      })}

      <button
        onClick={() => setTool('erase')}
        className="pill-btn flex items-center gap-1.5 shrink-0"
        style={{
          backgroundColor: tool === 'erase' ? '#1A1A1A' : 'white',
          color: tool === 'erase' ? '#fff' : '#1A1A1A',
          border: '2px solid rgba(0,0,0,0.08)',
        }}
      >
        🧽 消しゴム
      </button>
    </div>
  )
}
