import { describe, it, expect } from 'vitest'
import { drawSetUnique } from './lottery3'
import type { Category } from './model'

describe('drawSetUnique', () => {
  const cats: Record<string, Category> = {
    鮭: 'fish',
    梅: 'classic',
    おかか: 'classic',
    昆布: 'classic',
    ツナマヨ: 'fish',
    唐揚げ: 'meat',
  }

  it('1具モード: セット内で具が重複しない', () => {
    const r = drawSetUnique(
      ['鮭', '梅', 'おかか', '昆布', 'ツナマヨ'],
      ['塩', '醤油'],
      5,
      { uniqueInSet: true },
    )
    expect(r).not.toBeNull()
    const fillings = r!.map((x) => x.filling)
    expect(new Set(fillings).size).toBe(5)
  })

  it('1具モード: count > 具数なら null', () => {
    const r = drawSetUnique(['鮭', '梅'], ['塩'], 5, { uniqueInSet: true })
    expect(r).toBeNull()
  })

  it('1具モード: uniqueInSet false なら従来通り重複あり', () => {
    // 10個引けばほぼ確実に重複する(確率的だが十分)
    const r = drawSetUnique(['鮭', '梅'], ['塩'], 10, { uniqueInSet: false })
    expect(r).not.toBeNull()
    expect(r).toHaveLength(10)
  })

  it('同タグ排除: 同じタグの具がセット内で重複しない', () => {
    // fish: 鮭・ツナマヨ, classic: 梅・おかか・昆布, meat: 唐揚げ
    // uniqueTags ON → fish は最大1、classic は最大1 → 最大3個まで
    const r = drawSetUnique(
      ['鮭', '梅', 'おかか', '昆布', 'ツナマヨ', '唐揚げ'],
      ['塩'],
      3,
      { uniqueInSet: true, uniqueTags: true },
      cats,
    )
    expect(r).not.toBeNull()
    const usedCats = r!.map((x) => cats[x.filling])
    expect(new Set(usedCats).size).toBe(3)
  })

  it('同タグ排除: タグ種類数 < count なら null', () => {
    const r = drawSetUnique(
      ['鮭', '梅', 'おかか', '昆布', 'ツナマヨ', '唐揚げ'],
      ['塩'],
      4, // タグは3種類しか使えない
      { uniqueInSet: true, uniqueTags: true },
      cats,
    )
    expect(r).toBeNull()
  })

  it('同タグ排除: categories 未指定なら uniqueTags は無視される', () => {
    const r = drawSetUnique(
      ['鮭', '梅', 'おかか', '昆布', 'ツナマヨ'],
      ['塩'],
      5,
      { uniqueInSet: true, uniqueTags: true },
    )
    expect(r).not.toBeNull()
    expect(r).toHaveLength(5)
  })

  it('2具モード: 各組内の重複なし+セット内重複なし', () => {
    const r = drawSetUnique(
      ['鮭', '梅', 'おかか', '昆布', 'ツナマヨ'],
      ['塩'],
      2,
      { uniqueInSet: true, twoFillings: true },
    )
    expect(r).not.toBeNull()
    const r2 = r as Array<{ filling: string; filling2: string; seasoning: string }>
    // 組内で2具が異なる
    for (const x of r2) expect(x.filling).not.toBe(x.filling2)
    // セット全体で具が重複しない(2具×2組=4種類使用)
    const all = r2.flatMap((x) => [x.filling, x.filling2])
    expect(new Set(all).size).toBe(4)
  })

  it('2具モード: count*2 > 具数なら null', () => {
    const r = drawSetUnique(
      ['鮭', '梅', 'おかか'],
      ['塩'],
      2, // 4具必要だが3しかない
      { uniqueInSet: true, twoFillings: true },
    )
    expect(r).toBeNull()
  })

  it('2具モード+同タグ排除: 組内2具もタグが異なる', () => {
    const r = drawSetUnique(
      ['鮭', '梅', 'おかか', '昆布', 'ツナマヨ', '唐揚げ', 'たまご'],
      ['塩'],
      2,
      { uniqueInSet: true, uniqueTags: true, twoFillings: true },
      { ...cats, たまご: 'other' },
    )
    expect(r).not.toBeNull()
    const r2 = r as Array<{ filling: string; filling2: string; seasoning: string }>
    for (const x of r2) {
      expect(cats[x.filling]).not.toBe(cats[x.filling2])
    }
  })

  it('抽選結果は具プールから選ばれる(空になることはない)', () => {
    const r = drawSetUnique(['鮭', '梅'], ['塩'], 2, { uniqueInSet: true })
    expect(r).not.toBeNull()
    for (const x of r!) {
      expect(['鮭', '梅']).toContain(x.filling)
    }
  })
})
