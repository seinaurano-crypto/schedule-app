import { create } from 'zustand'
import type { Category, DayData, LabelHistoryItem, TimeEvent } from '../types'
import * as db from '../db/db'
import { todayKey } from '../utils/date'

const LS_API_KEY = 'timelog-api-key'
const LS_MODEL = 'timelog-model'
export const DEFAULT_MODEL = 'claude-sonnet-4-6'

function uid(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
}

function sortEvents(events: TimeEvent[]) {
  return [...events].sort((a, b) => a.start - b.start)
}

interface StoreState {
  ready: boolean
  categories: Category[]
  currentDate: string
  day: DayData
  labels: LabelHistoryItem[]
  apiKey: string
  model: string

  init: () => Promise<void>
  setDate: (date: string) => Promise<void>

  addEvent: (e: Omit<TimeEvent, 'id'>) => Promise<void>
  addEvents: (events: Omit<TimeEvent, 'id'>[]) => Promise<void>
  updateEvent: (e: TimeEvent) => Promise<void>
  deleteEvent: (id: string) => Promise<void>

  addCategory: (name: string, color: string) => Promise<Category>
  updateCategory: (cat: Category) => Promise<void>
  removeCategory: (id: string) => Promise<void>
  reorderCategory: (id: string, dir: -1 | 1) => Promise<void>

  setApiKey: (key: string) => void
  setModel: (model: string) => void
  reloadLabels: () => Promise<void>
  reloadDay: () => Promise<void>
}

export const useStore = create<StoreState>((set, get) => ({
  ready: false,
  categories: [],
  currentDate: todayKey(),
  day: { date: todayKey(), events: [] },
  labels: [],
  apiKey: localStorage.getItem(LS_API_KEY) ?? '',
  model: localStorage.getItem(LS_MODEL) ?? DEFAULT_MODEL,

  init: async () => {
    const date = todayKey()
    const [categories, day, labels] = await Promise.all([
      db.getAllCategories(),
      db.getDay(date),
      db.getAllLabels(),
    ])
    set({ ready: true, categories, currentDate: date, day, labels })
  },

  setDate: async (date) => {
    const day = await db.getDay(date)
    set({ currentDate: date, day })
  },

  addEvent: async (e) => {
    const { day } = get()
    const newDay = { ...day, events: sortEvents([...day.events, { ...e, id: uid('ev') }]) }
    set({ day: newDay })
    await db.putDay(newDay)
    if (e.memo.trim()) {
      await db.recordLabel(e.memo, e.categoryId)
      await get().reloadLabels()
    }
  },

  addEvents: async (events) => {
    if (events.length === 0) return
    const { day } = get()
    const withIds = events.map((e) => ({ ...e, id: uid('ev') }))
    const newDay = { ...day, events: sortEvents([...day.events, ...withIds]) }
    set({ day: newDay })
    await db.putDay(newDay)
    for (const e of events) if (e.memo.trim()) await db.recordLabel(e.memo, e.categoryId)
    await get().reloadLabels()
  },

  updateEvent: async (e) => {
    const { day } = get()
    const newDay = {
      ...day,
      events: sortEvents(day.events.map((ev) => (ev.id === e.id ? e : ev))),
    }
    set({ day: newDay })
    await db.putDay(newDay)
    if (e.memo.trim()) {
      await db.recordLabel(e.memo, e.categoryId)
      await get().reloadLabels()
    }
  },

  deleteEvent: async (id) => {
    const { day } = get()
    const newDay = { ...day, events: day.events.filter((ev) => ev.id !== id) }
    set({ day: newDay })
    await db.putDay(newDay)
  },

  addCategory: async (name, color) => {
    const { categories } = get()
    const cat: Category = { id: uid('cat'), name, color, order: categories.length }
    await db.putCategory(cat)
    set({ categories: [...categories, cat] })
    return cat
  },

  updateCategory: async (cat) => {
    await db.putCategory(cat)
    set({ categories: get().categories.map((c) => (c.id === cat.id ? cat : c)) })
  },

  removeCategory: async (id) => {
    await db.deleteCategory(id)
    set({ categories: get().categories.filter((c) => c.id !== id) })
  },

  reorderCategory: async (id, dir) => {
    const cats = [...get().categories]
    const i = cats.findIndex((c) => c.id === id)
    const j = i + dir
    if (i < 0 || j < 0 || j >= cats.length) return
    ;[cats[i], cats[j]] = [cats[j], cats[i]]
    const reordered = cats.map((c, idx) => ({ ...c, order: idx }))
    set({ categories: reordered })
    await db.bulkPutCategories(reordered)
  },

  setApiKey: (key) => {
    localStorage.setItem(LS_API_KEY, key)
    set({ apiKey: key })
  },

  setModel: (model) => {
    localStorage.setItem(LS_MODEL, model)
    set({ model })
  },

  reloadLabels: async () => set({ labels: await db.getAllLabels() }),

  reloadDay: async () => {
    const day = await db.getDay(get().currentDate)
    const categories = await db.getAllCategories()
    set({ day, categories })
  },
}))
