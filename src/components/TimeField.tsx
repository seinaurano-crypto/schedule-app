interface Props {
  value: number // minutes
  onChange: (min: number) => void
  allow24?: boolean // allow 24:00 as a value (for end time)
}

const MINUTES = Array.from({ length: 12 }, (_, i) => i * 5) // 0,5,...,55

export default function TimeField({ value, onChange, allow24 }: Props) {
  const is24 = value >= 1440
  const hour = is24 ? 24 : Math.floor(value / 60)
  const minute = is24 ? 0 : value % 60
  const hours = Array.from({ length: allow24 ? 25 : 24 }, (_, i) => i)

  const selectCls =
    'bg-white border-2 border-black/10 rounded-xl px-2 py-2 font-bold text-base focus:border-shock outline-none appearance-none text-center'

  return (
    <div className="flex items-center gap-1">
      <select
        className={selectCls}
        value={hour}
        onChange={(e) => {
          const h = Number(e.target.value)
          if (h === 24) onChange(1440)
          else onChange(h * 60 + (is24 ? 0 : minute))
        }}
      >
        {hours.map((h) => (
          <option key={h} value={h}>
            {String(h).padStart(2, '0')}
          </option>
        ))}
      </select>
      <span className="font-extrabold text-ink/50">:</span>
      <select
        className={selectCls}
        value={minute}
        disabled={hour === 24}
        onChange={(e) => onChange(hour * 60 + Number(e.target.value))}
      >
        {(hour === 24 ? [0] : MINUTES).map((m) => (
          <option key={m} value={m}>
            {String(m).padStart(2, '0')}
          </option>
        ))}
      </select>
    </div>
  )
}
