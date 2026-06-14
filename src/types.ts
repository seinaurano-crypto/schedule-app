export const MINUTES_PER_DAY = 1440
export const STEP_MINUTES = 5

export interface Category {
  id: string
  name: string
  color: string
  order: number
}

export interface TimeEvent {
  id: string
  start: number // minutes from 00:00, multiple of 5 (0..1440)
  end: number // minutes from 00:00, exclusive, start < end <= 1440
  categoryId: string | null
  memo: string
}

export interface DayData {
  date: string // "YYYY-MM-DD"
  events: TimeEvent[]
}

export interface LabelHistoryItem {
  id: string // `${categoryId}:${text}`
  text: string
  categoryId: string | null
  count: number
  lastUsed: number
}
