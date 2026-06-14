export function toDateKey(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function parseDateKey(key: string): Date {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function todayKey(): string {
  return toDateKey(new Date())
}

export function addDays(key: string, delta: number): string {
  const d = parseDateKey(key)
  d.setDate(d.getDate() + delta)
  return toDateKey(d)
}

const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土']

export function formatDisplay(key: string): string {
  const d = parseDateKey(key)
  return `${d.getMonth() + 1}月${d.getDate()}日(${WEEKDAYS[d.getDay()]})`
}

export function formatFull(key: string): string {
  const d = parseDateKey(key)
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日(${WEEKDAYS[d.getDay()]})`
}

export function isWeekend(key: string): boolean {
  const day = parseDateKey(key).getDay()
  return day === 0 || day === 6
}

/** slot index (0..287) -> "HH:MM" */
export function slotToTime(slot: number): string {
  const total = slot * 5
  const h = Math.floor(total / 60)
  const m = total % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

/** minutes -> "Xh Ym" friendly Japanese */
export function formatDuration(minutes: number): string {
  if (minutes <= 0) return '0分'
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (h === 0) return `${m}分`
  if (m === 0) return `${h}時間`
  return `${h}時間${m}分`
}

export function formatHours(minutes: number): string {
  return (minutes / 60).toFixed(1)
}

/** list of date keys between start and end inclusive */
export function rangeKeys(start: string, end: string): string[] {
  const keys: string[] = []
  let cur = start
  let guard = 0
  while (cur <= end && guard < 1000) {
    keys.push(cur)
    cur = addDays(cur, 1)
    guard++
  }
  return keys
}

/** Monday-based start of week for given key */
export function startOfWeek(key: string): string {
  const d = parseDateKey(key)
  const day = d.getDay() // 0 sun .. 6 sat
  const diff = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + diff)
  return toDateKey(d)
}

export function startOfMonth(key: string): string {
  const d = parseDateKey(key)
  return toDateKey(new Date(d.getFullYear(), d.getMonth(), 1))
}

export function endOfMonth(key: string): string {
  const d = parseDateKey(key)
  return toDateKey(new Date(d.getFullYear(), d.getMonth() + 1, 0))
}
