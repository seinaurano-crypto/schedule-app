import { create } from 'zustand'
import type { Category, DayData, LabelHistoryItem } from '../types'
import { SLOTS_PER_DAY } from '../types'
import * as db from '../db/db'
import { DEFAULT_CATEGORIES } from '../utils/defaults'
import { todayKey } from '../utils/date'

export type Tool = 'paint' | 'erase'

interface StoreState {
  ready: boolean
  categories: Category[]
  selectedCategoryId: string | null
  tool: Tool
  currentDate: string
  day: DayData
  labels: LabelHistoryItem[]

  init: () => Promise<void>
  selectCategory: (id: string) => void
  setTool: (tool: Tool) => void
  setDate: (date: string) => Promise<void>

  paintRange: (start: number, end: number) => Promise<void>
  setNote: (slot: number, text: string) => Promise<void>

  addCategory: (name: string, color: string) => Promise<void>
  updateCategory: (cat: Category) => Promise<void>
  removeCategory: (id: string) => Promise<void>
  reloadLabels: () => Promise<void>
  reloadDay: () => Promise<void>
}

export const useStore = create<StoreState>((set, get) => ({
  ready: false,
  categories: [],
  selectedCategoryId: null,
  tool: 'paint',
  currentDate: todayKey(),
  day: { date: todayKey(), slots: new Array(SLOTS_PER_DAY).fill(null), notes: {} },
  labels: [],

  init: async () => {
    let categories = await db.getAllCategories()
    if (categories.length === 0) {
      await db.bulkPutCategories(DEFAULT_CATEGORIES)
      categories = DEFAULT_CATEGORIES
    }
    const date = todayKey()
    const day = await db.getDay(date)
    const labels = await db.getAllLabels()
    set({
      ready: true,
      categories,
      selectedCategoryId: categories[0]?.id ?? null,
      currentDate: date,
      day,
      labels,
    })
  },

  selectCategory: (id) => set({ selectedCategoryId: id, tool: 'paint' }),
  setTool: (tool) => set({ tool }),

  setDate: async (date) => {
    const day = await db.getDay(date)
    set({ currentDate: date, day })
  },

  paintRange: async (start, end) => {
    const { tool, selectedCategoryId, day } = get()
    const lo = Math.max(0, Math.min(start, end))
    const hi = Math.min(SLOTS_PER_DAY - 1, Math.max(start, end))
    const slots = day.slots.slice()
    const notes = { ...day.notes }
    const value = tool === 'erase' ? null : selectedCategoryId
    if (tool === 'paint' && !value) return
    for (let i = lo; i <= hi; i++) {
      slots[i] = value
      if (tool === 'erase') delete notes[i]
    }
    const newDay = { ...day, slots, notes }
    set({ day: newDay })
    await db.putDay(newDay)
  },

  setNote: async (slot, text) => {
    const { day, slots } = { day: get().day, slots: get().day.slots }
    const notes = { ...day.notes }
    const trimmed = text.trim()
    if (trimmed) notes[slot] = trimmed
    else delete notes[slot]
    const newDay = { ...day, notes }
    set({ day: newDay })
    await db.putDay(newDay)
    const catId = slots[slot] ?? null
    if (trimmed) {
      await db.recordLabel(trimmed, catId)
      await get().reloadLabels()
    }
  },

  addCategory: async (name, color) => {
    const { categories } = get()
    const cat: Category = {
      id: `cat_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      name,
      color,
      order: categories.length,
    }
    await db.putCategory(cat)
    set({ categories: [...categories, cat] })
  },

  updateCategory: async (cat) => {
    await db.putCategory(cat)
    set({ categories: get().categories.map((c) => (c.id === cat.id ? cat : c)) })
  },

  removeCategory: async (id) => {
    await db.deleteCategory(id)
    const categories = get().categories.filter((c) => c.id !== id)
    const selectedCategoryId =
      get().selectedCategoryId === id ? (categories[0]?.id ?? null) : get().selectedCategoryId
    set({ categories, selectedCategoryId })
  },

  reloadLabels: async () => {
    const labels = await db.getAllLabels()
    set({ labels })
  },

  reloadDay: async () => {
    const day = await db.getDay(get().currentDate)
    const categories = await db.getAllCategories()
    set({ day, categories })
  },
}))
