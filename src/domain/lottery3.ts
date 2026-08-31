import type { Category } from './model'

export interface UniqueOptions {
  /** セット内で同じ具を出さない */
  uniqueInSet: boolean
  /** セット内で同じタグ(カテゴリ)の具を出さない(categories が必要) */
  uniqueTags?: boolean
  /** 2具モード */
  twoFillings?: boolean
}

interface BaseResult {
  filling: string
  filling2?: string
  seasoning: string
}

const pick = <T>(items: T[]): T => items[Math.floor(Math.random() * items.length)]

/**
 * 制約付き抽選: セット内の具重複を排除(固定)、同タグ重複を排除(オプション)。
 * 制約を満たせない場合は null。
 */
export function drawSetUnique(
  fillings: string[],
  seasonings: string[],
  count: number,
  options: UniqueOptions,
  categories?: Record<string, Category>,
): BaseResult[] | null {
  const { uniqueInSet, uniqueTags = false, twoFillings = false } = options

  // 必要具数: 1組あたり1〜2個
  const perRow = twoFillings ? 2 : 1
  const needed = count * perRow
  if (fillings.length === 0) return null
  if (uniqueInSet && fillings.length < needed) return null

  const categoryOf = (f: string): Category | undefined => categories?.[f]

  // 利用可能プール(タグ除外時にタグごとの残数も管理)
  const remaining = [...fillings]

  // 事前チェック: 同タグ排除+セット内ユニーク時、タグ種類数が足りるか
  if (uniqueTags && categories && uniqueInSet) {
    const tagCount = new Set(remaining.map(categoryOf)).size
    // セット内全具(needed 個)がすべて異なるタグである必要がある
    if (tagCount < needed) return null
  }

  const out: BaseResult[] = []
  // セット全体で使用済みのタグ(uniqueTags時はセット内で同タグ禁止)
  const usedTags = new Set<Category>()

  for (let i = 0; i < count; i++) {
    const row: BaseResult = { filling: '', seasoning: '' }

    for (let j = 0; j < perRow; j++) {
      const candidates = remaining.filter((f) => {
        const c = categoryOf(f)
        if (uniqueTags && categories && c !== undefined && usedTags.has(c)) return false
        return true
      })
      if (candidates.length === 0) return null // 制約破綻

      const chosen = pick(candidates)
      if (uniqueInSet) {
        remaining.splice(remaining.indexOf(chosen), 1)
      }
      const c = categoryOf(chosen)
      if (c !== undefined) usedTags.add(c)

      if (j === 0) row.filling = chosen
      else row.filling2 = chosen
    }

    row.seasoning = seasonings.length > 0 ? pick(seasonings) : ''
    out.push(row)
  }

  return out
}
