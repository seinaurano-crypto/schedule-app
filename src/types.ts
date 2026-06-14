export const SLOTS_PER_DAY = 288 // 24h * 12 (5-min slots)
export const SLOT_MINUTES = 5

export interface Category {
  id: string
  name: string
  color: string
  order: number
}

export interface DayData {
  date: string // "YYYY-MM-DD"
  slots: (string | null)[] // length 288, category id or null
  notes: Record<number, string> // slot index -> note text
}

export interface LabelHistoryItem {
  id: string // `${categoryId}:${text}`
  text: string
  categoryId: string | null
  count: number
  lastUsed: number // timestamp
}
