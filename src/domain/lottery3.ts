import type { Category } from './model'

export interface UniqueOptions {
  /** 2具モードで組内の2具が同タグになるのを避ける */
  uniqueTags: boolean
  /** 2具モード */
  twoFillings?: boolean
  /** 2具モードで片方に固定する具(プール外なら null を返す) */
  fixedFilling?: string
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
 * 制約付き抽選。
 * - 1具モード: 同じ具がセット内で重複しない(固定)
 * - 2具モード: 同じペア(A×B と B×A を同一視)がセット内で重複しない(固定)
 *   (A×B と A×C、C×B と D×B など一部共通は許可)
 * - uniqueTags ON: 2具モードで組内の2具が同じタグにならない(categories が必要)
 * - fixedFilling 指定時(2具モードのみ): 片方を固定具にし、もう片方を重複なしで抽選
 */
export function drawSetUnique(
  fillings: string[],
  seasonings: string[],
  count: number,
  options: UniqueOptions,
  categories?: Record<string, Category>,
): BaseResult[] | null {
  const { uniqueTags, twoFillings = false, fixedFilling } = options

  if (fillings.length === 0) return null

  // 固定モード: 2具モードで fixedFilling 指定時。プール外なら null
  const fixed = twoFillings && fixedFilling ? fixedFilling : undefined
  if (fixed !== undefined && !fillings.includes(fixed)) return null

  // 事前チェック: 1具モードは具数 >= count が必要(重複禁止は固定)
  if (!twoFillings && fillings.length < count) return null

  const categoryOf = (f: string): Category | undefined => categories?.[f]

  const out: BaseResult[] = []
  // セット全体で使用済みのキー(具 or ペア)
  const usedKeys = new Set<string>()

  for (let i = 0; i < count; i++) {
    const row: BaseResult = { filling: '', seasoning: '' }

    if (!twoFillings) {
      // 1具モード: 使用済み具を除外(固定)
      const candidates = fillings.filter((f) => !usedKeys.has(f))
      if (candidates.length === 0) return null
      const chosen = pick(candidates)
      usedKeys.add(chosen)
      row.filling = chosen
    } else if (fixed !== undefined) {
      // 2具モード固定: 片方を固定具にし、もう片方を重複なしで抽選
      const partners = fillings.filter((f) => {
        if (f === fixed) return false
        if (usedKeys.has(pairKey(fixed, f))) return false
        if (uniqueTags) {
          const cf = categoryOf(fixed)
          const cp = categoryOf(f)
          if (cf !== undefined && cf === cp) return false
        }
        return true
      })
      if (partners.length === 0) return null
      const partner = pick(partners)
      usedKeys.add(pairKey(fixed, partner))
      row.filling = fixed
      row.filling2 = partner
    } else {
      // 2具モード: 組内で異なる2具 & 使用済みペアを除外(固定)
      // uniqueTags ON の場合、組内2具のタグも異なる
      if (fillings.length < 2) return null
      const candidates: Array<[string, string]> = []
      for (let a = 0; a < fillings.length; a++) {
        for (let b = a + 1; b < fillings.length; b++) {
          const fa = fillings[a]
          const fb = fillings[b]
          if (usedKeys.has(pairKey(fa, fb))) continue
          if (uniqueTags) {
            const ca = categoryOf(fa)
            const cb = categoryOf(fb)
            if (ca !== undefined && ca === cb) continue
          }
          candidates.push([fa, fb])
        }
      }
      if (candidates.length === 0) return null
      const [fa, fb] = pick(candidates)
      usedKeys.add(pairKey(fa, fb))
      row.filling = fa
      row.filling2 = fb
    }

    row.seasoning = seasonings.length > 0 ? pick(seasonings) : ''
    out.push(row)
  }

  return out
}
