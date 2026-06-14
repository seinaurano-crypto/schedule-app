import { useRef } from 'react'
import { useStore } from '../store/useStore'
import { SLOTS_PER_DAY } from '../types'
import { formatDuration } from '../utils/date'

interface Props {
  onSlotTap: (slot: number) => void
}

const SIZE = 320
const CX = SIZE / 2
const CY = SIZE / 2
const RO = 150 // outer radius
const RI = 92 // inner radius

function polar(r: number, slot: number): [number, number] {
  // 0:00 at top, clockwise
  const deg = (slot / SLOTS_PER_DAY) * 360 - 90
  const rad = (deg * Math.PI) / 180
  return [CX + r * Math.cos(rad), CY + r * Math.sin(rad)]
}

function ringPath(from: number, toExclusive: number): string {
  const [x0o, y0o] = polar(RO, from)
  const [x1o, y1o] = polar(RO, toExclusive)
  const [x1i, y1i] = polar(RI, toExclusive)
  const [x0i, y0i] = polar(RI, from)
  const large = toExclusive - from > SLOTS_PER_DAY / 2 ? 1 : 0
  return [
    `M ${x0o} ${y0o}`,
    `A ${RO} ${RO} 0 ${large} 1 ${x1o} ${y1o}`,
    `L ${x1i} ${y1i}`,
    `A ${RI} ${RI} 0 ${large} 0 ${x0i} ${y0i}`,
    'Z',
  ].join(' ')
}

export default function ClockView({ onSlotTap }: Props) {
  const day = useStore((s) => s.day)
  const categories = useStore((s) => s.categories)
  const svgRef = useRef<SVGSVGElement>(null)

  // contiguous runs
  const runs: { from: number; to: number; id: string }[] = []
  for (let i = 0; i < SLOTS_PER_DAY; i++) {
    const id = day.slots[i]
    if (!id) continue
    const last = runs[runs.length - 1]
    if (last && last.id === id && last.to === i - 1) last.to = i
    else runs.push({ from: i, to: i, id })
  }

  const trackedMin = day.slots.filter(Boolean).length * 5

  const handleTap = (e: React.PointerEvent) => {
    const rect = svgRef.current!.getBoundingClientRect()
    const scale = SIZE / rect.width
    const x = (e.clientX - rect.left) * scale
    const y = (e.clientY - rect.top) * scale
    const dx = x - CX
    const dy = y - CY
    const r = Math.sqrt(dx * dx + dy * dy)
    if (r < RI - 6 || r > RO + 6) return
    const deg = (Math.atan2(dy, dx) * 180) / Math.PI
    const slotDeg = (deg + 90 + 360) % 360
    const slot = Math.floor((slotDeg / 360) * SLOTS_PER_DAY)
    if (day.slots[slot]) onSlotTap(slot)
  }

  const noteSlots = Object.keys(day.notes)
    .map(Number)
    .filter((i) => day.slots[i])

  return (
    <div className="flex justify-center py-2">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        className="w-full max-w-[340px] touch-none"
        onPointerUp={handleTap}
      >
        {/* background ring */}
        <circle cx={CX} cy={CY} r={(RO + RI) / 2} fill="none" stroke="#F0EFEA" strokeWidth={RO - RI} />

        {/* painted segments */}
        {runs.map((r) => {
          const cat = categories.find((c) => c.id === r.id)
          return (
            <path key={`${r.from}-${r.id}`} d={ringPath(r.from, r.to + 1)} fill={cat?.color ?? '#ddd'} />
          )
        })}

        {/* hour ticks + labels */}
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
                <text
                  x={lx}
                  y={ly}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fontSize={major ? 13 : 11}
                  fontWeight={major ? 800 : 600}
                  fill="#1A1A1A99"
                >
                  {h}
                </text>
              )}
            </g>
          )
        })}

        {/* note dots */}
        {noteSlots.map((i) => {
          const [x, y] = polar((RO + RI) / 2, i + 0.5)
          return <circle key={`nd-${i}`} cx={x} cy={y} r={3} fill="#fff" stroke="#1A1A1A" strokeWidth={1} />
        })}

        {/* center summary */}
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
