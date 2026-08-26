import type { LotteryResult } from './lottery'

export interface HistorySet {
  id: string
  results: LotteryResult[] // 5組(将来の可変個数対応: results.length は可変)
  at: number // タイムスタンプ(末尾が最新)
  fav: boolean
}
export type LotteryMode = 'one' | 'two'
export interface LotterySettings {
  mode: LotteryMode
  count: number
}

// --- 具カテゴリ ---
export type Category = 'meat' | 'fish' | 'classic' | 'other'
export const CATEGORIES: readonly Category[] = ['meat', 'fish', 'classic', 'other'] as const
export const CATEGORY_LABELS: Record<Category, string> = {
  meat: '肉',
  fish: '魚介',
  classic: '定番',
  other: 'その他',
}
export const DEFAULT_CATEGORY: Category = 'other'

/** デフォルト8具のカテゴリ初期割当 */
export const defaultFillingCategories: Record<string, Category> = {
  鮭: 'fish',
  梅: 'classic',
  おかか: 'classic',
  昆布: 'classic',
  ツナマヨ: 'fish',
  明太子: 'fish',
  焼きたらこ: 'fish',
  たまご: 'other',
}

export interface AppState {
  fillings: string[]
  seasonings: string[]
  excludedFillings: string[]
  excludedSeasonings: string[]
  settings: LotterySettings
  soundEnabled: boolean
  fillingCategories: Record<string, Category>
  history: HistorySet[]
}

export const defaultSettings: LotterySettings = { mode: 'one', count: 5 }

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
    settings: { ...defaultSettings },
    soundEnabled: true,
    fillingCategories: { ...defaultFillingCategories },
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

  const normalizeSettings = (raw: unknown): LotterySettings => {
    const mode: LotteryMode =
      typeof raw === 'object' &&
      raw !== null &&
      (raw as Record<string, unknown>).mode === 'two'
        ? 'two'
        : 'one'
    const rawCount =
      typeof raw === 'object' && raw !== null
        ? (raw as Record<string, unknown>).count
        : undefined
    const count =
      typeof rawCount === 'number' && Number.isFinite(rawCount)
        ? Math.min(10, Math.max(1, Math.round(rawCount)))
        : defaultSettings.count
    return { mode, count }
  }

  // カテゴリ正規化: 未知の具名は除去、欠損は other 補完、不正値は other 置換
  const validFinalFillings =
    fillings.length > 0 ? fillings : [...defaultFillings]
  const normalizeCategories = (
    raw: unknown,
    names: string[],
  ): Record<string, Category> => {
    const source =
      typeof raw === 'object' && raw !== null
        ? (raw as Record<string, unknown>)
        : {}
    const isCategory = (x: unknown): x is Category =>
      typeof x === 'string' && (CATEGORIES as readonly string[]).includes(x)
    const out: Record<string, Category> = {}
    for (const name of names) {
      const v = source[name]
      out[name] = isCategory(v) ? v : DEFAULT_CATEGORY
    }
    return out
  }
  const baseCategories = normalizeCategories(
    r.fillingCategories,
    validFinalFillings,
  )
  // 既存値がない具はデフォルト割当から補完(新規追加以外の旧データ移行)
  const mergedCategories: Record<string, Category> = { ...baseCategories }
  for (const [name, cat] of Object.entries(defaultFillingCategories)) {
    if (mergedCategories[name] === DEFAULT_CATEGORY && cat !== DEFAULT_CATEGORY) {
      // 保存データに明示的に other が設定されていた可能性は残すが、
      // デフォルト割当が other 以外で保存値が欠損していたケースのみ補完
      const hadExplicit =
        typeof r.fillingCategories === 'object' &&
        r.fillingCategories !== null &&
        (r.fillingCategories as Record<string, unknown>)[name] !== undefined
      if (!hadExplicit) mergedCategories[name] = cat
    }
  }

  return {
    fillings: validFinalFillings,
    seasonings:
      seasonings.length > 0 ? seasonings : [...defaultSeasonings],
    excludedFillings,
    excludedSeasonings,
    settings: normalizeSettings(r.settings),
    soundEnabled: r.soundEnabled !== false,
    fillingCategories: mergedCategories,
    history: pruneHistory(history, MAX_HISTORY),
  }
}
