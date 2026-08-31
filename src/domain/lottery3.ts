import type { Category } from './model'

export interface UniqueOptions {
  /** セット内で同じ組(具のペア)を出さない。1具モードは具単体の重複禁止 */
  uniquePairs: boolean
  /** 2具モード */
  twoFillings?: boolean
}

interface BaseResult {
  filling: string
  filling2?: string
  seasoning: string
}

const pick = <T>(items: T[]): T => items[Math.floor(Math.random() * items.length)]

const pairKey = (a: string, b: string): string =>
  a < b ? `${a}\u0000${b}` : `${b}\u0000${a}`

/**
 * 制約付き抽選: セット内で同じ組(ペア)を出さない。
 * - 1具モード: 同じ具がセット内で重複しない
 * - 2具モード: 同じペア(A×B と B×A を同一視)がセット内で重複しない
 *   (A×B と A×C、C×B と D×B などは許可)
 */
export function drawSetUnique(
  fillings: string[],
  seasonings: string[],
  count: number,
  options: UniqueOptions,
  _categories?: Record<string, Category>,
): BaseResult[] | null {
  const { uniquePairs, twoFillings = false } = options

  if (fillings.length === 0) return null

  // 事前チェック: 1具モードで重複禁止なら具数 >= count が必要
  if (!twoFillings && uniquePairs && fillings.length < count) return null

  const out: BaseResult[] = []
  // セット全体で使用済みのキー(具 or ペア)
  const usedKeys = new Set<string>()

  for (let i = 0; i < count; i++) {
    const row: BaseResult = { filling: '', seasoning: '' }

    if (!twoFillings) {
      // 1具モード: 使用済み具を除外
      const candidates = fillings.filter((f) => !uniquePairs || !usedKeys.has(f))
      if (candidates.length === 0) return null
      const chosen = pick(candidates)
      if (uniquePairs) usedKeys.add(chosen)
      row.filling = chosen
    } else {
      // 2具モード: 組内で異なる2具 & 使用済みペアを除外
      if (fillings.length < 2) return null
      const candidates: Array<[string, string]> = []
      for (let a = 0; a < fillings.length; a++) {
        for (let b = a + 1; b < fillings.length; b++) {
          const fa = fillings[a]
          const fb = fillings[b]
          if (uniquePairs && usedKeys.has(pairKey(fa, fb))) continue
          candidates.push([fa, fb])
        }
      }
      if (candidates.length === 0) return null
      const [fa, fb] = pick(candidates)
      if (uniquePairs) usedKeys.add(pairKey(fa, fb))
      row.filling = fa
      row.filling2 = fb
    }

    row.seasoning = seasonings.length > 0 ? pick(seasonings) : ''
    out.push(row)
  }

  return out
}
