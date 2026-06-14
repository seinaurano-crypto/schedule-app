import { useEffect, useMemo, useState } from 'react'
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts'
import { useStore } from '../store/useStore'
import { getDaysInRange } from '../db/db'
import type { DayData } from '../types'
import {
  addDays,
  endOfMonth,
  formatDuration,
  formatDisplay,
  rangeKeys,
  startOfMonth,
  startOfWeek,
  todayKey,
} from '../utils/date'
import {
  averagePerDay,
  buildTips,
  compareCategories,
  dailyTrend,
  recordedDayCount,
  totalMinutes,
  totalsByCategory,
  weekdayWeekendSplit,
  type CatTotal,
} from '../utils/analytics'

type PeriodType = 'today' | 'week' | 'month' | 'custom'

function useRange(period: PeriodType, customStart: string, customEnd: string) {
  return useMemo(() => {
    const today = todayKey()
    let start = today
    let end = today
    if (period === 'week') {
      start = startOfWeek(today)
      end = addDays(start, 6)
    } else if (period === 'month') {
      start = startOfMonth(today)
      end = endOfMonth(today)
    } else if (period === 'custom') {
      start = customStart <= customEnd ? customStart : customEnd
      end = customStart <= customEnd ? customEnd : customStart
    }
    const keys = rangeKeys(start, end)
    const len = keys.length
    const prevEnd = addDays(start, -1)
    const prevStart = addDays(prevEnd, -(len - 1))
    return { start, end, keys, prevStart, prevEnd }
  }, [period, customStart, customEnd])
}

const PERIOD_LABELS: Record<PeriodType, string> = {
  today: '今日',
  week: '今週',
  month: '今月',
  custom: '範囲指定',
}

function SummaryCard({ label, value, sub, color }: { label: string; value: string; sub?: string; color: string }) {
  return (
    <div className="rounded-2xl p-4 text-white shadow-sm" style={{ backgroundColor: color }}>
      <div className="text-xs font-bold opacity-90">{label}</div>
      <div className="text-2xl font-extrabold leading-tight mt-1">{value}</div>
      {sub && <div className="text-xs font-bold opacity-90 mt-0.5">{sub}</div>}
    </div>
  )
}

export default function AnalyzePage() {
  const categories = useStore((s) => s.categories)
  const day = useStore((s) => s.day) // re-render trigger when current day edited
  const [period, setPeriod] = useState<PeriodType>('week')
  const [customStart, setCustomStart] = useState(addDays(todayKey(), -6))
  const [customEnd, setCustomEnd] = useState(todayKey())

  const { start, end, keys, prevStart, prevEnd } = useRange(period, customStart, customEnd)

  const [days, setDays] = useState<DayData[]>([])
  const [prevDays, setPrevDays] = useState<DayData[]>([])

  useEffect(() => {
    let active = true
    Promise.all([getDaysInRange(start, end), getDaysInRange(prevStart, prevEnd)]).then(
      ([cur, prev]) => {
        if (!active) return
        setDays(cur)
        setPrevDays(prev)
      },
    )
    return () => {
      active = false
    }
    // re-run when the edited day changes too (day dependency)
  }, [start, end, prevStart, prevEnd, day, categories])

  const totals = useMemo(() => totalsByCategory(days, categories), [days, categories])
  const total = totalMinutes(totals)
  const recDays = recordedDayCount(days)
  const avg = useMemo(() => averagePerDay(days, categories), [days, categories])
  const trend = useMemo(() => dailyTrend(days, keys, categories), [days, keys, categories])
  const ww = useMemo(() => weekdayWeekendSplit(days, categories), [days, categories])
  const diffs = useMemo(
    () => compareCategories(totals, totalsByCategory(prevDays, categories)),
    [totals, prevDays, categories],
  )
  const tips = useMemo(() => buildTips(totals, avg, total), [totals, avg, total])

  const isMulti = period !== 'today'
  const topCat = totals[0]
  const avgDayMin = recDays > 0 ? total / recDays : 0

  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-2xl font-extrabold">分析</h1>

      {/* period selector */}
      <div className="flex flex-col gap-2">
        <div className="inline-flex bg-black/5 rounded-pill p-1 self-start">
          {(['today', 'week', 'month', 'custom'] as PeriodType[]).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className="pill-btn py-1.5 px-4 text-sm"
              style={{
                backgroundColor: period === p ? '#fff' : 'transparent',
                color: period === p ? '#1A1A1A' : '#1A1A1A88',
                boxShadow: period === p ? '0 2px 8px rgba(0,0,0,0.08)' : 'none',
              }}
            >
              {PERIOD_LABELS[p]}
            </button>
          ))}
        </div>
        {period === 'custom' && (
          <div className="flex items-center gap-2 text-sm">
            <input
              type="date"
              value={customStart}
              onChange={(e) => e.target.value && setCustomStart(e.target.value)}
              className="bg-white border border-black/10 rounded-pill px-3 py-1.5"
            />
            <span className="font-bold text-ink/40">〜</span>
            <input
              type="date"
              value={customEnd}
              onChange={(e) => e.target.value && setCustomEnd(e.target.value)}
              className="bg-white border border-black/10 rounded-pill px-3 py-1.5"
            />
          </div>
        )}
        <div className="text-xs text-ink/40 font-bold">
          {formatDisplay(start)}
          {start !== end && ` 〜 ${formatDisplay(end)}`}
          {`（記録日 ${recDays}日）`}
        </div>
      </div>

      {total === 0 ? (
        <div className="card text-center text-ink/50 py-12">
          この期間にはまだ記録がありません。<br />記録タブから入力してみましょう。
        </div>
      ) : (
        <>
          {/* summary cards */}
          <div className="grid grid-cols-2 gap-3">
            <SummaryCard label="合計記録時間" value={formatDuration(total)} color="#FF6B6B" />
            <SummaryCard label="1日平均" value={formatDuration(Math.round(avgDayMin))} sub={`${recDays}日で割った平均`} color="#36C5D9" />
            <SummaryCard
              label="最も多いカテゴリ"
              value={topCat?.name ?? '-'}
              sub={topCat ? `${(topCat.minutes / 60).toFixed(1)}時間 / ${((topCat.minutes / total) * 100).toFixed(0)}%` : ''}
              color="#9B6BFF"
            />
            <SummaryCard label="カテゴリ数" value={`${totals.length}`} sub="記録された種類" color="#3DD9A0" />
          </div>

          {/* composition pie */}
          <section className="card">
            <h2 className="font-extrabold text-lg mb-2">構成比</h2>
            <div style={{ height: 260 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={totals}
                    dataKey="minutes"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={95}
                    paddingAngle={2}
                  >
                    {totals.map((t) => (
                      <Cell key={t.id} fill={t.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(v: number, n) => [formatDuration(Math.round(v)), n as string]}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </section>

          {/* category bars */}
          <section className="card">
            <h2 className="font-extrabold text-lg mb-2">カテゴリ別の時間</h2>
            <div style={{ height: Math.max(180, totals.length * 42) }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={totals} layout="vertical" margin={{ left: 8, right: 16 }}>
                  <CartesianGrid horizontal={false} stroke="#0000000d" />
                  <XAxis type="number" tickFormatter={(v) => `${(v / 60).toFixed(0)}h`} fontSize={11} />
                  <YAxis type="category" dataKey="name" width={64} fontSize={12} />
                  <Tooltip formatter={(v: number) => [formatDuration(Math.round(v)), '時間']} />
                  <Bar dataKey="minutes" radius={[0, 8, 8, 0]}>
                    {totals.map((t) => (
                      <Cell key={t.id} fill={t.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>

          {/* auto review: comparison vs previous period (week/month/custom multi-day) */}
          {isMulti && (
            <section className="card">
              <h2 className="font-extrabold text-lg mb-1">前の同期間との比較</h2>
              <p className="text-xs text-ink/40 mb-3">
                {formatDisplay(prevStart)} 〜 {formatDisplay(prevEnd)} と比較
              </p>
              <div className="flex flex-col gap-2">
                {diffs.slice(0, 8).map((d) => {
                  const up = d.diff > 0
                  const flat = Math.abs(d.diff) < 5
                  return (
                    <div key={d.name} className="flex items-center gap-2 text-sm">
                      <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: d.color }} />
                      <span className="font-bold flex-1 truncate">{d.name}</span>
                      <span className="text-ink/50">{(d.current / 60).toFixed(1)}h</span>
                      <span
                        className="font-extrabold w-20 text-right"
                        style={{ color: flat ? '#1A1A1A66' : up ? '#FF6B6B' : '#36C5D9' }}
                      >
                        {flat ? '±0' : `${up ? '+' : '−'}${Math.abs(d.diff / 60).toFixed(1)}時間`}
                      </span>
                    </div>
                  )
                })}
              </div>
            </section>
          )}

          {/* weekday vs weekend */}
          {isMulti && (ww.weekdayCount > 0 || ww.weekendCount > 0) && (
            <section className="card">
              <h2 className="font-extrabold text-lg mb-1">平日 vs 休日（1日平均）</h2>
              <p className="text-xs text-ink/40 mb-3">
                平日 {ww.weekdayCount}日 / 休日 {ww.weekendCount}日
              </p>
              <WeekdayWeekendChart weekday={ww.weekday} weekend={ww.weekend} categories={totals} />
            </section>
          )}

          {/* daily trend */}
          {isMulti && (
            <section className="card">
              <h2 className="font-extrabold text-lg mb-2">日別の推移</h2>
              <div style={{ height: 280 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={trend.rows} margin={{ left: -10, right: 8 }}>
                    <CartesianGrid vertical={false} stroke="#0000000d" />
                    <XAxis dataKey="label" fontSize={10} interval="preserveStartEnd" />
                    <YAxis fontSize={11} tickFormatter={(v) => `${v}h`} />
                    <Tooltip formatter={(v: number, n) => [`${v.toFixed(1)}h`, n as string]} />
                    {trend.series.map((s) => (
                      <Bar key={s.id} dataKey={s.id} name={s.name} stackId="a" fill={s.color} />
                    ))}
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </section>
          )}

          {/* tips */}
          <section className="card bg-gradient-to-br from-pop-sunny/15 to-pop-mint/15 border-pop-sunny/30">
            <h2 className="font-extrabold text-lg mb-2">💡 改善のヒント</h2>
            <ul className="flex flex-col gap-2">
              {tips.map((t, i) => (
                <li key={i} className="text-sm bg-white/70 rounded-2xl px-3 py-2 font-medium">
                  {t}
                </li>
              ))}
            </ul>
          </section>
        </>
      )}
    </div>
  )
}

function WeekdayWeekendChart({
  weekday,
  weekend,
  categories,
}: {
  weekday: CatTotal[]
  weekend: CatTotal[]
  categories: CatTotal[]
}) {
  // build grouped rows by category name
  const wdMap = new Map(weekday.map((t) => [t.id, t.minutes]))
  const weMap = new Map(weekend.map((t) => [t.id, t.minutes]))
  const data = categories.map((c) => ({
    name: c.name,
    color: c.color,
    平日: +(((wdMap.get(c.id) ?? 0) / 60).toFixed(2)),
    休日: +(((weMap.get(c.id) ?? 0) / 60).toFixed(2)),
  }))
  return (
    <div style={{ height: Math.max(180, data.length * 50) }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ left: 8, right: 16 }}>
          <CartesianGrid horizontal={false} stroke="#0000000d" />
          <XAxis type="number" tickFormatter={(v) => `${v}h`} fontSize={11} />
          <YAxis type="category" dataKey="name" width={64} fontSize={12} />
          <Tooltip formatter={(v: number) => `${v.toFixed(1)}h`} />
          <Legend />
          <Bar dataKey="平日" fill="#5B8DEF" radius={[0, 6, 6, 0]} />
          <Bar dataKey="休日" fill="#FF9F45" radius={[0, 6, 6, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
