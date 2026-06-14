import { openDB, type DBSchema, type IDBPDatabase } from 'idb'
import type { Category, DayData, LabelHistoryItem, TimeEvent } from '../types'

interface TimeLogDB extends DBSchema {
  categories: { key: string; value: Category }
  days: { key: string; value: DayData }
  labelHistory: { key: string; value: LabelHistoryItem }
}

const DB_NAME = 'timelog-db'
const DB_VERSION = 1

let dbPromise: Promise<IDBPDatabase<TimeLogDB>> | null = null

function getDB() {
  if (!dbPromise) {
    dbPromise = openDB<TimeLogDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('categories')) {
          db.createObjectStore('categories', { keyPath: 'id' })
        }
        if (!db.objectStoreNames.contains('days')) {
          db.createObjectStore('days', { keyPath: 'date' })
        }
        if (!db.objectStoreNames.contains('labelHistory')) {
          db.createObjectStore('labelHistory', { keyPath: 'id' })
        }
      },
    })
  }
  return dbPromise
}

// Old data used { slots:(id|null)[288], notes:{idx:string} }. Convert to events.
function normalizeDay(raw: any, date: string): DayData {
  if (raw && Array.isArray(raw.events)) return { date, events: raw.events }
  if (raw && Array.isArray(raw.slots)) {
    const events: TimeEvent[] = []
    const slots: (string | null)[] = raw.slots
    const notes: Record<number, string> = raw.notes ?? {}
    let i = 0
    while (i < slots.length) {
      const id = slots[i]
      if (!id) {
        i++
        continue
      }
      let j = i
      while (j < slots.length && slots[j] === id) j++
      let memo = ''
      for (let k = i; k < j; k++) if (notes[k]) memo = notes[k]
      events.push({
        id: `ev_${date}_${i}`,
        start: i * 5,
        end: j * 5,
        categoryId: id,
        memo,
      })
      i = j
    }
    return { date, events }
  }
  return { date, events: [] }
}

// ---- Categories ----
export async function getAllCategories(): Promise<Category[]> {
  const db = await getDB()
  const all = await db.getAll('categories')
  return all.sort((a, b) => a.order - b.order)
}

export async function putCategory(cat: Category): Promise<void> {
  const db = await getDB()
  await db.put('categories', cat)
}

export async function deleteCategory(id: string): Promise<void> {
  const db = await getDB()
  await db.delete('categories', id)
}

export async function bulkPutCategories(cats: Category[]): Promise<void> {
  const db = await getDB()
  const tx = db.transaction('categories', 'readwrite')
  await Promise.all(cats.map((c) => tx.store.put(c)))
  await tx.done
}

// ---- Days ----
export function emptyDay(date: string): DayData {
  return { date, events: [] }
}

export async function getDay(date: string): Promise<DayData> {
  const db = await getDB()
  const d = await db.get('days', date)
  if (!d) return emptyDay(date)
  return normalizeDay(d, date)
}

export async function putDay(day: DayData): Promise<void> {
  const db = await getDB()
  await db.put('days', day)
}

export async function getDaysInRange(start: string, end: string): Promise<DayData[]> {
  const db = await getDB()
  const range = IDBKeyRange.bound(start, end)
  const all = await db.getAll('days', range)
  return all.map((d) => normalizeDay(d, d.date))
}

// ---- Label history ----
export async function getAllLabels(): Promise<LabelHistoryItem[]> {
  const db = await getDB()
  return db.getAll('labelHistory')
}

export async function recordLabel(text: string, categoryId: string | null): Promise<void> {
  const trimmed = text.trim()
  if (!trimmed) return
  const db = await getDB()
  const id = `${categoryId ?? 'none'}:${trimmed}`
  const existing = await db.get('labelHistory', id)
  const item: LabelHistoryItem = existing
    ? { ...existing, count: existing.count + 1, lastUsed: Date.now() }
    : { id, text: trimmed, categoryId, count: 1, lastUsed: Date.now() }
  await db.put('labelHistory', item)
}

// ---- Export / Import ----
export interface ExportBundle {
  version: number
  exportedAt: string
  categories: Category[]
  days: DayData[]
  labelHistory: LabelHistoryItem[]
}

export async function exportAll(): Promise<ExportBundle> {
  const db = await getDB()
  const [categories, days, labelHistory] = await Promise.all([
    db.getAll('categories'),
    db.getAll('days'),
    db.getAll('labelHistory'),
  ])
  return {
    version: 2,
    exportedAt: new Date().toISOString(),
    categories,
    days: days.map((d) => normalizeDay(d, d.date)),
    labelHistory,
  }
}

export async function importAll(bundle: ExportBundle): Promise<void> {
  const db = await getDB()
  const tx = db.transaction(['categories', 'days', 'labelHistory'], 'readwrite')
  await tx.objectStore('categories').clear()
  await tx.objectStore('days').clear()
  await tx.objectStore('labelHistory').clear()
  for (const c of bundle.categories ?? []) await tx.objectStore('categories').put(c)
  for (const d of bundle.days ?? []) await tx.objectStore('days').put(normalizeDay(d, d.date))
  for (const l of bundle.labelHistory ?? []) await tx.objectStore('labelHistory').put(l)
  await tx.done
}
