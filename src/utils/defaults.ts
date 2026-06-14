import type { Category } from '../types'

// Vivid pop palette (matches tailwind config)
export const POP_PALETTE = [
  '#FF6B6B', // coral
  '#FF9F45', // tangerine
  '#FFD23F', // sunny
  '#3DD9A0', // mint
  '#36C5D9', // turquoise
  '#FF5C9E', // pink
  '#9B6BFF', // purple
  '#5B8DEF', // blue
  '#FF8FA3', // light pink
  '#7BE0C0', // light mint
  '#FFC15E', // amber
  '#A0E548', // lime
]

export const DEFAULT_CATEGORIES: Category[] = [
  { id: 'work', name: '仕事', color: '#5B8DEF', order: 0 },
  { id: 'meeting', name: '会議', color: '#9B6BFF', order: 1 },
  { id: 'commute', name: '移動', color: '#FF9F45', order: 2 },
  { id: 'meal', name: '食事', color: '#FFD23F', order: 3 },
  { id: 'exercise', name: '運動', color: '#3DD9A0', order: 4 },
  { id: 'sleep', name: '睡眠', color: '#36C5D9', order: 5 },
  { id: 'free', name: '自由時間', color: '#FF5C9E', order: 6 },
  { id: 'study', name: '勉強', color: '#FF6B6B', order: 7 },
]
