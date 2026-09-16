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
  /** セット内で同じタグの具を許可しない */
  uniqueTags: boolean
  /** 作成画面にタグ指定を表示する */
  tagFilterEnabled: boolean
  /** タグ指定表示の初回移行済みフラグ(更新後の初回アクセスでOFF化) */
  tagFilterMigrated?: boolean
  /** 2具モードで片方に固定する具 */
  fixedFilling?: string
}

// --- 具カテゴリ(カスタムタグ対応) ---
export type CategoryId = string
export interface Tag {
  id: CategoryId
  label: string
}
/** 固定ID(デフォルトタグ・フォールバック先) */
export const CATEGORY_MEAT = 'meat'
export const CATEGORY_FISH = 'fish'
export const CATEGORY_CLASSIC = 'classic'
export const CATEGORY_OTHER = 'other'
export type Category = CategoryId
export const CATEGORIES: readonly Category[] = ['meat', 'fish', 'classic', 'other'] as const
export const DEFAULT_CATEGORY: Category = CATEGORY_OTHER

export const defaultTags: Tag[] = [
  { id: CATEGORY_MEAT, label: '肉' },
  { id: CATEGORY_FISH, label: '魚介' },
  { id: CATEGORY_CLASSIC, label: '定番' },
  { id: CATEGORY_OTHER, label: 'その他' },
]

/** ラベル解説用レガシー(固定4タグのラベル) */
export const CATEGORY_LABELS: Record<string, string> = {
  meat: '肉',
  fish: '魚介',
  classic: '定番',
  other: 'その他',
}

export const tagLabel = (tags: Tag[], id: CategoryId): string =>
  tags.find((t) => t.id === id)?.label ?? CATEGORY_LABELS[CATEGORY_OTHER] ?? 'その他'

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
  tags: Tag[]
  fillingCategories: Record<string, Category>
  history: HistorySet[]
}

export const defaultSettings: LotterySettings = { mode: 'one', count: 5, uniqueTags: false, tagFilterEnabled: false, tagFilterMigrated: true }

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
    tags: defaultTags.map((t) => ({ ...t })),
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
    const rawUniqueTags =
      typeof raw === 'object' && raw !== null
        ? (raw as Record<string, unknown>).uniqueTags
        : undefined
    const uniqueTags = rawUniqueTags === true
    const rawTagFilter =
      typeof raw === 'object' && raw !== null
        ? (raw as Record<string, unknown>).tagFilterEnabled
        : undefined
    const rawMigrated =
      typeof raw === 'object' && raw !== null
        ? (raw as Record<string, unknown>).tagFilterMigrated
        : undefined
    const wasTagFilterMigrated = rawMigrated === true
    const tagFilterEnabled = wasTagFilterMigrated && rawTagFilter === true
    const tagFilterMigrated = true
    const rawFixed =
      typeof raw === 'object' && raw !== null
        ? (raw as Record<string, unknown>).fixedFilling
        : undefined
    const fixedFilling =
      typeof rawFixed === 'string' && rawFixed.length > 0 ? rawFixed : undefined
    return { mode, count, uniqueTags, tagFilterEnabled, tagFilterMigrated, fixedFilling }
  }

  // タグ正規化: id/label とも文字列のもののみ。最低1つ必要(空ならデフォルト)
  const normalizeTags = (raw: unknown): Tag[] => {
    if (!Array.isArray(raw)) return defaultTags.map((t) => ({ ...t }))
    const out: Tag[] = []
    const seen = new Set<string>()
    for (const x of raw) {
      if (typeof x !== 'object' || x === null) continue
      const o = x as Record<string, unknown>
      if (typeof o.id !== 'string' || o.id.length === 0) continue
      if (typeof o.label !== 'string' || o.label.length === 0) continue
      if (seen.has(o.id)) continue
      seen.add(o.id)
      out.push({ id: o.id, label: o.label })
    }
    return out.length > 0 ? out : defaultTags.map((t) => ({ ...t }))
  }
  const tags = normalizeTags(r.tags)
  const tagIds = new Set(tags.map((t) => t.id))

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
    const out: Record<string, Category> = {}
    for (const name of names) {
      const v = source[name]
      out[name] =
        typeof v === 'string' && tagIds.has(v) ? v : DEFAULT_CATEGORY
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
    settings: (() => {
      const s = normalizeSettings(r.settings)
      if (s.fixedFilling !== undefined && !validFinalFillings.includes(s.fixedFilling)) {
        return { ...s, fixedFilling: undefined }
      }
      return s
    })(),
    soundEnabled: r.soundEnabled !== false,
    tags,
    fillingCategories: mergedCategories,
    history: pruneHistory(history, MAX_HISTORY),
  }
}
