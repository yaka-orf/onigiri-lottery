import type { LotteryResult } from './lottery'

export interface HistorySet {
  results: LotteryResult[] // 5組
  at: number // タイムスタンプ(末尾が最新)
}
export interface AppState {
  fillings: string[]
  seasonings: string[]
  history: HistorySet[] // 最大5セット
}

export const defaultFillings = [
  '鮭',
  '梅',
  'おかか',
  '昆布',
  'ツナマヨ',
  '明太子',
  '焼きたらこ',
  'たまご',
] as const

export const defaultSeasonings = ['塩', '醤油', 'ごま油', 'なし'] as const

export const MAX_HISTORY = 5
export const MAX_LIST_LEN = 20 // 具・味付けの最大文字数

export function normalizeState(raw: unknown): AppState {
  const fallback = (): AppState => ({
    fillings: [...defaultFillings],
    seasonings: [...defaultSeasonings],
    history: [],
  })
  if (typeof raw !== 'object' || raw === null) return fallback()

  const isStr = (x: unknown): x is string =>
    typeof x === 'string' && x.length > 0
  const isPair = (x: unknown): x is LotteryResult =>
    typeof x === 'object' &&
    x !== null &&
    isStr((x as Record<string, unknown>).filling) &&
    typeof (x as Record<string, unknown>).seasoning === 'string'
  const isSet = (x: unknown): x is HistorySet => {
    if (typeof x !== 'object' || x === null) return false
    const o = x as Record<string, unknown>
    return (
      Array.isArray(o.results) &&
      o.results.every(isPair) &&
      typeof o.at === 'number'
    )
  }

  const r = raw as Record<string, unknown>
  const fillings = Array.isArray(r.fillings) ? r.fillings.filter(isStr) : []
  const seasonings = Array.isArray(r.seasonings)
    ? r.seasonings.filter(isStr)
    : []
  const history = Array.isArray(r.history) ? r.history.filter(isSet) : []

  return {
    fillings: fillings.length > 0 ? fillings : [...defaultFillings],
    seasonings:
      seasonings.length > 0 ? seasonings : [...defaultSeasonings],
    history: history.slice(-MAX_HISTORY),
  }
}
