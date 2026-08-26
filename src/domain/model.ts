import type { LotteryResult } from './lottery'

export interface HistorySet {
  id: string
  results: LotteryResult[] // 5組(将来の可変個数対応: results.length は可変)
  at: number // タイムスタンプ(末尾が最新)
  fav: boolean
}
export interface AppState {
  fillings: string[]
  seasonings: string[]
  excludedFillings: string[]
  excludedSeasonings: string[]
  history: HistorySet[]
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

let idCounter = 0
export function newHistoryId(): string {
  idCounter += 1
  return `${Date.now()}-${idCounter}-${Math.random().toString(36).slice(2, 8)}`
}

/** ★付きは全保持、★なしは直近 max 件(時系列順で返す) */
export function pruneHistory(history: HistorySet[], max: number): HistorySet[] {
  const kept = history.filter((h) => h.fav)
  const nonFav = history.filter((h) => !h.fav)
  const nonFavKept = nonFav.slice(-max)
  // 時系列(元の配列順)にマージして返す
  const keptSet = new Set(kept.map((h) => h.id))
  const nonFavKeptSet = new Set(nonFavKept.map((h) => h.id))
  return history.filter((h) => keptSet.has(h.id) || nonFavKeptSet.has(h.id))
}

export function normalizeState(raw: unknown): AppState {
  const fallback = (): AppState => ({
    fillings: [...defaultFillings],
    seasonings: [...defaultSeasonings],
    excludedFillings: [],
    excludedSeasonings: [],
    history: [],
  })
  if (typeof raw !== 'object' || raw === null) return fallback()

  const isStr = (x: unknown): x is string =>
    typeof x === 'string' && x.length > 0
  const isPair = (x: unknown): x is LotteryResult =>
    typeof x === 'object' &&
    x !== null &&
    isStr((x as Record<string, unknown>).filling) &&
    typeof (x as Record<string, unknown>).seasoning === 'string' &&
    // 2具モードのfilling2(任意)
    ((x as Record<string, unknown>).filling2 === undefined ||
      isStr((x as Record<string, unknown>).filling2))
  const isSet = (x: unknown): x is HistorySet => {
    if (typeof x !== 'object' || x === null) return false
    const o = x as Record<string, unknown>
    return (
      Array.isArray(o.results) &&
      o.results.every(isPair) &&
      typeof o.at === 'number' &&
      (o.fav === undefined || typeof o.fav === 'boolean') &&
      (o.id === undefined || typeof o.id === 'string')
    )
  }

  const r = raw as Record<string, unknown>
  const fillings = Array.isArray(r.fillings) ? r.fillings.filter(isStr) : []
  const seasonings = Array.isArray(r.seasonings)
    ? r.seasonings.filter(isStr)
    : []
  const filterIn = (list: unknown, valid: string[]): string[] => {
    if (!Array.isArray(list)) return []
    const validSet = new Set(valid)
    const out: string[] = []
    for (const x of list) {
      if (typeof x === 'string' && validSet.has(x) && !out.includes(x)) {
        out.push(x)
      }
    }
    return out
  }
  const excludedFillings = filterIn(r.excludedFillings, fillings)
  const excludedSeasonings = filterIn(r.excludedSeasonings, seasonings)

  const history = (Array.isArray(r.history) ? r.history.filter(isSet) : []).map(
    (h) => ({
      id: h.id ?? newHistoryId(),
      results: h.results,
      at: h.at,
      fav: h.fav === true,
    }),
  )

  return {
    fillings: fillings.length > 0 ? fillings : [...defaultFillings],
    seasonings:
      seasonings.length > 0 ? seasonings : [...defaultSeasonings],
    excludedFillings,
    excludedSeasonings,
    history: pruneHistory(history, MAX_HISTORY),
  }
}
