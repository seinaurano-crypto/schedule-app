import { useRef, useState } from 'react'
import { useStore } from '../store/useStore'
import { SLOTS_PER_DAY } from '../types'
import { slotToTime } from '../utils/date'

const SLOT_H = 7 // px per 5-min slot -> hour = 84px, day = 2016px

interface Props {
  onSlotTap: (slot: number) => void
}

export default function Timeline({ onSlotTap }: Props) {
  const day = useStore((s) => s.day)
  const categories = useStore((s) => s.categories)
  const tool = useStore((s) => s.tool)
  const selectedCategoryId = useStore((s) => s.selectedCategoryId)
  const paintRange = useStore((s) => s.paintRange)

  const areaRef = useRef<HTMLDivElement>(null)
  const [drag, setDrag] = useState<{ start: number; end: number } | null>(null)
  const movedRef = useRef(false)

  const colorOf = (id: string | null) =>
    id ? (categories.find((c) => c.id === id)?.color ?? '#ddd') : 'transparent'

  const previewColor =
    tool === 'erase' ? '#1A1A1A' : colorOf(selectedCategoryId)

  const slotFromEvent = (clientY: number) => {
    const rect = areaRef.current!.getBoundingClientRect()
    const y = clientY - rect.top
    return Math.max(0, Math.min(SLOTS_PER_DAY - 1, Math.floor(y / SLOT_H)))
  }

  const onPointerDown = (e: React.PointerEvent) => {
    const slot = slotFromEvent(e.clientY)
    areaRef.current?.setPointerCapture(e.pointerId)
    movedRef.current = false
    setDrag({ start: slot, end: slot })
  }

  const onPointerMove = (e: React.PointerEvent) => {
    if (!drag) return
    const slot = slotFromEvent(e.clientY)
    if (slot !== drag.start) movedRef.current = true
    if (slot !== drag.end) setDrag({ ...drag, end: slot })
  }

  const onPointerUp = async () => {
    if (!drag) return
    const { start, end } = drag
    setDrag(null)
    if (movedRef.current && start !== end) {
      await paintRange(start, end)
      return
    }
    // tap (no movement)
    if (tool === 'erase') {
      await paintRange(start, start)
      return
    }
    if (day.slots[start]) {
      onSlotTap(start)
    } else {
      await paintRange(start, start)
    }
  }

  const totalH = SLOTS_PER_DAY * SLOT_H

  // Build contiguous colored runs for fewer DOM nodes
  const runs: { from: number; to: number; id: string }[] = []
  for (let i = 0; i < SLOTS_PER_DAY; i++) {
    const id = day.slots[i]
    if (!id) continue
    const last = runs[runs.length - 1]
    if (last && last.id === id && last.to === i - 1) last.to = i
    else runs.push({ from: i, to: i, id })
  }

  const previewLo = drag ? Math.min(drag.start, drag.end) : -1
  const previewHi = drag ? Math.max(drag.start, drag.end) : -1

  return (
    <div className="flex select-none" style={{ touchAction: 'none' }}>
      {/* hour labels */}
      <div className="w-11 relative shrink-0" style={{ height: totalH }}>
        {Array.from({ length: 25 }, (_, h) => (
          <div
            key={h}
            className="absolute right-1.5 text-[11px] font-bold text-ink/40 -translate-y-1/2"
            style={{ top: h * 12 * SLOT_H }}
          >
            {String(h).padStart(2, '0')}:00
          </div>
        ))}
      </div>

      {/* paint area */}
      <div
        ref={areaRef}
        className="flex-1 relative rounded-2xl bg-white border border-black/5 overflow-hidden"
        style={{ height: totalH }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={() => setDrag(null)}
      >
        {/* hour gridlines */}
        {Array.from({ length: 24 }, (_, h) => (
          <div
            key={h}
            className="absolute left-0 right-0 border-t border-black/5"
            style={{ top: h * 12 * SLOT_H }}
          />
        ))}
        {/* 30-min lighter lines */}
        {Array.from({ length: 24 }, (_, h) => (
          <div
            key={`half-${h}`}
            className="absolute left-0 right-0 border-t border-dashed border-black/[0.03]"
            style={{ top: (h * 12 + 6) * SLOT_H }}
          />
        ))}

        {/* painted runs */}
        {runs.map((r) => {
          const cat = categories.find((c) => c.id === r.id)
          return (
            <div
              key={`${r.from}-${r.id}`}
              className="absolute left-0.5 right-0.5 rounded-md"
              style={{
                top: r.from * SLOT_H,
                height: (r.to - r.from + 1) * SLOT_H,
                backgroundColor: cat?.color ?? '#ddd',
              }}
            />
          )
        })}

        {/* note labels */}
        {Object.entries(day.notes).map(([k, txt]) => {
          const i = Number(k)
          if (!day.slots[i]) return null
          return (
            <div
              key={`note-${k}`}
              className="absolute left-1 right-1 flex items-center pointer-events-none"
              style={{ top: i * SLOT_H }}
            >
              <span className="text-[10px] leading-none font-bold text-ink bg-white/85 rounded-full px-1.5 py-0.5 truncate max-w-full">
                📝 {txt}
              </span>
            </div>
          )
        })}

        {/* drag preview */}
        {drag && (
          <div
            className="absolute left-0.5 right-0.5 rounded-md ring-2 ring-white/80"
            style={{
              top: previewLo * SLOT_H,
              height: (previewHi - previewLo + 1) * SLOT_H,
              backgroundColor: previewColor,
              opacity: tool === 'erase' ? 0.3 : 0.75,
            }}
          >
            <span className="absolute -top-0.5 left-1 text-[10px] font-bold text-white drop-shadow">
              {slotToTime(previewLo)}–{slotToTime(previewHi + 1 === SLOTS_PER_DAY ? 0 : previewHi + 1)}
            </span>
          </div>
        )}
      </div>
    </div>
  )
}
