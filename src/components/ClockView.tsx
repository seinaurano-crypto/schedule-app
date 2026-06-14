import { useRef } from 'react'
import { useStore } from '../store/useStore'
import type { TimeEvent } from '../types'
import { formatDuration } from '../utils/date'

interface Props {
  onEventTap: (e: TimeEvent) => void
}

const SIZE = 320
const CX = SIZE / 2
const CY = SIZE / 2
const RO = 150
const RI = 92
const SLOTS = 288 // 5-min granularity for arc math

function polar(r: number, slot: number): [number, number] {
  const deg = (slot / SLOTS) * 360 - 90
  const rad = (deg * Math.PI) / 180
  return [CX + r * Math.cos(rad), CY + r * Math.sin(rad)]
}

function ringPath(fromSlot: number, toSlot: number): string {
  const [x0o, y0o] = polar(RO, fromSlot)
  const [x1o, y1o] = polar(RO, toSlot)
  const [x1i, y1i] = polar(RI, toSlot)
  const [x0i, y0i] = polar(RI, fromSlot)
  const large = toSlot - fromSlot > SLOTS / 2 ? 1 : 0
  return [
    `M ${x0o} ${y0o}`,
    `A ${RO} ${RO} 0 ${large} 1 ${x1o} ${y1o}`,
    `L ${x1i} ${y1i}`,
    `A ${RI} ${RI} 0 ${large} 0 ${x0i} ${y0i}`,
    'Z',
  ].join(' ')
}

export default function ClockView({ onEventTap }: Props) {
  const day = useStore((s) => s.day)
  const categories = useStore((s) => s.categories)
  const svgRef = useRef<SVGSVGElement>(null)
  const colorOf = (id: string | null) => categories.find((c) => c.id === id)?.color ?? '#C9C9C9'

  const trackedMin = day.events.reduce((s, e) => s + (e.end - e.start), 0)

  const handleTap = (e: React.PointerEvent) => {
    const rect = svgRef.current!.getBoundingClientRect()
    const scale = SIZE / rect.width
    const x = (e.clientX - rect.left) * scale
    const y = (e.clientY - rect.top) * scale
    const dx = x - CX
    const dy = y - CY
    const r = Math.sqrt(dx * dx + dy * dy)
    if (r < RI - 8 || r > RO + 8) return
    const deg = (Math.atan2(dy, dx) * 180) / Math.PI
    const minute = (((deg + 90 + 360) % 360) / 360) * 1440
    // pick the last (top-most) event covering this minute
    const hit = [...day.events].reverse().find((ev) => minute >= ev.start && minute < ev.end)
    if (hit) onEventTap(hit)
  }

  return (
    <div className="flex justify-center py-2">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        className="w-full max-w-[340px] touch-none"
        onPointerUp={handleTap}
      >
        <circle cx={CX} cy={CY} r={(RO + RI) / 2} fill="none" stroke="#F3ECC0" strokeWidth={RO - RI} />

        {day.events.map((ev) => (
          <path key={ev.id} d={ringPath(ev.start / 5, ev.end / 5)} fill={colorOf(ev.categoryId)} />
        ))}

        {Array.from({ length: 24 }, (_, h) => {
          const slot = h * 12
          const [xo, yo] = polar(RO + 2, slot)
          const [xi, yi] = polar(RI - 2, slot)
          const [lx, ly] = polar(RO + 16, slot)
          const major = h % 6 === 0
          return (
            <g key={h}>
              <line x1={xi} y1={yi} x2={xo} y2={yo} stroke="#fff" strokeWidth={major ? 1.5 : 0.8} />
              {h % 3 === 0 && (
                <text x={lx} y={ly} textAnchor="middle" dominantBaseline="central" fontSize={major ? 13 : 11} fontWeight={major ? 800 : 600} fill="#1A1A1A99">
                  {h}
                </text>
              )}
            </g>
          )
        })}

        {/* memo dots */}
        {day.events.filter((e) => e.memo).map((e) => {
          const mid = (e.start + e.end) / 2 / 5
          const [x, y] = polar((RO + RI) / 2, mid)
          return <circle key={`d-${e.id}`} cx={x} cy={y} r={3} fill="#fff" stroke="#1A1A1A" strokeWidth={1} />
        })}

        <text x={CX} y={CY - 8} textAnchor="middle" fontSize={13} fontWeight={700} fill="#1A1A1A66">
          記録時間
        </text>
        <text x={CX} y={CY + 16} textAnchor="middle" fontSize={20} fontWeight={800} fill="#1A1A1A">
          {formatDuration(trackedMin)}
        </text>
      </svg>
    </div>
  )
}
