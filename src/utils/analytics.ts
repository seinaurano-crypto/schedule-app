import type { Category, DayData } from '../types'
import { SLOT_MINUTES } from '../types'
import { isWeekend } from './date'

export interface CatTotal {
  id: string
  name: string
  color: string
  minutes: number
}

const UNKNOWN = { id: '__other', name: 'その他', color: '#C9C9C9' }

function catLookup(categories: Category[]) {
  const map = new Map(categories.map((c) => [c.id, c]))
  return (id: string) => map.get(id) ?? UNKNOWN
}

/** total minutes per category across the given days, sorted desc */
export function totalsByCategory(days: DayData[], categories: Category[]): CatTotal[] {
  const lookup = catLookup(categories)
  const acc = new Map<string, number>()
  for (const day of days) {
    for (const id of day.slots) {
      if (!id) continue
      acc.set(id, (acc.get(id) ?? 0) + SLOT_MINUTES)
    }
  }
  // merge unknown ids into "その他"
  const merged = new Map<string, CatTotal>()
  for (const [id, minutes] of acc) {
    const cat = lookup(id)
    const existing = merged.get(cat.id)
    if (existing) existing.minutes += minutes
    else merged.set(cat.id, { id: cat.id, name: cat.name, color: cat.color, minutes })
  }
  return [...merged.values()].sort((a, b) => b.minutes - a.minutes)
}

export function totalMinutes(totals: CatTotal[]): number {
  return totals.reduce((s, t) => s + t.minutes, 0)
}

/** number of days that have at least one recorded slot */
export function recordedDayCount(days: DayData[]): number {
  return days.filter((d) => d.slots.some(Boolean)).length
}

/** per-day stacked data for trend chart: { date, [catName]: hours } */
export interface TrendRow {
  date: string
  label: string
  [key: string]: number | string
}

export function dailyTrend(
  days: DayData[],
  rangeKeys: string[],
  categories: Category[],
): { rows: TrendRow[]; series: CatTotal[] } {
  const lookup = catLookup(categories)
  const byDate = new Map(days.map((d) => [d.date, d]))
  const seriesTotals = totalsByCategory(days, categories) // determines which categories appear
  const rows: TrendRow[] = rangeKeys.map((key) => {
    const day = byDate.get(key)
    const row: TrendRow = { date: key, label: key.slice(5).replace('-', '/') }
    for (const s of seriesTotals) row[s.id] = 0
    if (day) {
      for (const id of day.slots) {
        if (!id) continue
        const cat = lookup(id)
        row[cat.id] = ((row[cat.id] as number) ?? 0) + SLOT_MINUTES / 60
      }
    }
    return row
  })
  return { rows, series: seriesTotals }
}

/** average minutes per (recorded) day, per category */
export function averagePerDay(days: DayData[], categories: Category[]): CatTotal[] {
  const n = recordedDayCount(days) || 1
  return totalsByCategory(days, categories).map((t) => ({ ...t, minutes: t.minutes / n }))
}

export interface WeekdayWeekend {
  weekday: CatTotal[]
  weekend: CatTotal[]
  weekdayCount: number
  weekendCount: number
}

export function weekdayWeekendSplit(days: DayData[], categories: Category[]): WeekdayWeekend {
  const recorded = days.filter((d) => d.slots.some(Boolean))
  const wd = recorded.filter((d) => !isWeekend(d.date))
  const we = recorded.filter((d) => isWeekend(d.date))
  const avg = (group: DayData[]) => {
    const n = group.length || 1
    return totalsByCategory(group, categories).map((t) => ({ ...t, minutes: t.minutes / n }))
  }
  return {
    weekday: avg(wd),
    weekend: avg(we),
    weekdayCount: wd.length,
    weekendCount: we.length,
  }
}

/** category diffs vs previous period (minutes), keyed by display name */
export interface CategoryDiff {
  name: string
  color: string
  current: number
  previous: number
  diff: number
}

export function compareCategories(
  current: CatTotal[],
  previous: CatTotal[],
): CategoryDiff[] {
  const prevMap = new Map(previous.map((t) => [t.id, t]))
  const seen = new Set<string>()
  const out: CategoryDiff[] = []
  for (const c of current) {
    const p = prevMap.get(c.id)
    seen.add(c.id)
    out.push({
      name: c.name,
      color: c.color,
      current: c.minutes,
      previous: p?.minutes ?? 0,
      diff: c.minutes - (p?.minutes ?? 0),
    })
  }
  for (const p of previous) {
    if (seen.has(p.id)) continue
    out.push({ name: p.name, color: p.color, current: 0, previous: p.minutes, diff: -p.minutes })
  }
  return out.sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff))
}

/** rule-based insights */
export function buildTips(
  totals: CatTotal[],
  avgPerDay: CatTotal[],
  total: number,
): string[] {
  const tips: string[] = []
  if (total === 0) return ['この期間にはまだ記録がありません。記録タブから入力してみましょう。']

  const find = (kw: string) => avgPerDay.find((t) => t.name.includes(kw))

  // sleep
  const sleep = find('睡眠')
  if (sleep) {
    const h = sleep.minutes / 60
    if (h < 6) tips.push(`💤 睡眠が1日平均 ${h.toFixed(1)} 時間で、推奨の7時間より少なめです。`)
    else if (h > 9) tips.push(`💤 睡眠が1日平均 ${h.toFixed(1)} 時間と多めです。生活リズムを見直すと良いかも。`)
    else tips.push(`💤 睡眠は1日平均 ${h.toFixed(1)} 時間。良いペースです。`)
  }

  // meetings share
  const meeting = totals.find((t) => t.name.includes('会議'))
  if (meeting && total > 0) {
    const pct = (meeting.minutes / total) * 100
    if (pct >= 25) tips.push(`📅 会議が全体の ${pct.toFixed(0)}% を占めています。まとまった作業時間を確保しづらいかも。`)
  }

  // top category
  const top = totals[0]
  if (top) {
    const pct = (top.minutes / total) * 100
    tips.push(`🏆 最も多いのは「${top.name}」で全体の ${pct.toFixed(0)}%（合計 ${(top.minutes / 60).toFixed(1)} 時間）です。`)
  }

  // exercise
  const exercise = find('運動')
  if (!exercise || exercise.minutes < 15) {
    tips.push('🏃 運動の記録が少なめです。軽い運動を取り入れてみては？')
  }

  return tips
}
