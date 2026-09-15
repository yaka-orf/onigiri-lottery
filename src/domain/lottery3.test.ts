import { describe, it, expect } from 'vitest'
import { drawSetUnique } from './lottery3'
import type { Category } from './model'

const cats: Record<string, Category> = {
  鮭: 'fish',
  梅: 'classic',
  おかか: 'classic',
  昆布: 'classic',
  ツナマヨ: 'fish',
  唐揚げ: 'meat',
}

describe('drawSetUnique', () => {
  it('1具モード: セット内で具が重複しない(固定)', () => {
    const r = drawSetUnique(['鮭', '梅', 'おかか', '昆布', 'ツナマヨ'], ['塩'], 5, {
      uniqueTags: false,
    })
    expect(r).not.toBeNull()
    const fillings = r!.map((x) => x.filling)
    expect(new Set(fillings).size).toBe(5)
  })

  it('1具モード: count > 具数なら null(固定制約)', () => {
    const r = drawSetUnique(['鮭', '梅'], ['塩'], 5, { uniqueTags: false })
    expect(r).toBeNull()
  })

  it('2具モード: 各組内で2具が異なる(固定)', () => {
    const r = drawSetUnique(['鮭', '梅', 'おかか'], ['塩'], 3, {
      uniqueTags: false,
      twoFillings: true,
    })
    expect(r).not.toBeNull()
    for (const x of r as Array<{ filling: string; filling2: string }>) {
      expect(x.filling).not.toBe(x.filling2)
    }
  })

  it('2具モード: 同じペア(A×B)が2回出ない(固定)', () => {
    // 具3件 → ペア3通り。count=3 ですべて異なるペア
    for (let trial = 0; trial < 20; trial++) {
      const r = drawSetUnique(['鮭', '梅', 'おかか'], ['塩'], 3, {
        uniqueTags: false,
        twoFillings: true,
      })
      expect(r).not.toBeNull()
      const pairs = (r as Array<{ filling: string; filling2: string }>).map(
        (x) => [x.filling, x.filling2].sort().join('|'),
      )
      expect(new Set(pairs).size).toBe(3)
    }
  })

  it('2具モード: ペア重複禁止でも A×B と A×C は許可(具共有OK)', () => {
    let sharedFound = false
    for (let trial = 0; trial < 30; trial++) {
      const r = drawSetUnique(['鮭', '梅', 'おかか'], ['塩'], 2, {
        uniqueTags: false,
        twoFillings: true,
      })
      expect(r).not.toBeNull()
      const pairs = (r as Array<{ filling: string; filling2: string }>).map(
        (x) => [x.filling, x.filling2].sort().join('|'),
      )
      expect(new Set(pairs).size).toBe(2)
      const [p1, p2] = pairs.map((p) => p.split('|'))
      if (p1.some((f) => p2.includes(f))) sharedFound = true
    }
    expect(sharedFound).toBe(true)
  })

  it('2具モード: 可能ペア数 < count なら null', () => {
    // 具2件 → ペア1通り。count=2 は不可
    const r = drawSetUnique(['鮭', '梅'], ['塩'], 2, {
      uniqueTags: false,
      twoFillings: true,
    })
    expect(r).toBeNull()
  })

  it('uniqueTags ON: 組内の2具が同タグにならない', () => {
    for (let trial = 0; trial < 20; trial++) {
      const r = drawSetUnique(
        ['鮭', '梅', 'おかか', '昆布', 'ツナマヨ', '唐揚げ'],
        ['塩'],
        2,
        { uniqueTags: true, twoFillings: true },
        cats,
      )
      expect(r).not.toBeNull()
      for (const x of r as Array<{ filling: string; filling2: string }>) {
        expect(cats[x.filling]).not.toBe(cats[x.filling2])
      }
    }
  })

  it('uniqueTags ON: 同タグペアしか作れない具構成なら null', () => {
    // fish: 鮭・ツナマヨ のみ → 同タグペアしか存在しない
    const r = drawSetUnique(['鮭', 'ツナマヨ'], ['塩'], 1, {
      uniqueTags: true,
      twoFillings: true,
    }, cats)
    expect(r).toBeNull()
  })

  it('抽選結果は具プールから選ばれる', () => {
    const r = drawSetUnique(['鮭', '梅'], ['塩'], 2, { uniqueTags: false })
    expect(r).not.toBeNull()
    for (const x of r!) {
      expect(['鮭', '梅']).toContain(x.filling)
    }
  })

  it('2具モード固定: 全結果に固定具が含まれる', () => {
    for (let trial = 0; trial < 20; trial++) {
      const r = drawSetUnique(['鮭', '梅', 'おかか', '昆布'], ['塩'], 3, {
        uniqueTags: false,
        twoFillings: true,
        fixedFilling: '鮭',
      })
      expect(r).not.toBeNull()
      for (const x of r as Array<{ filling: string; filling2: string }>) {
        expect([x.filling, x.filling2]).toContain('鮭')
      }
    }
  })

  it('2具モード固定: 2つ目の具が重複しない(ペア重複なしと等価)', () => {
    const r = drawSetUnique(['鮭', '梅', 'おかか', '昆布'], ['塩'], 3, {
      uniqueTags: false,
      twoFillings: true,
      fixedFilling: '鮭',
    })
    expect(r).not.toBeNull()
    const partners = (r as Array<{ filling: string; filling2: string }>).map((x) =>
      x.filling === '鮭' ? x.filling2 : x.filling,
    )
    expect(new Set(partners).size).toBe(3)
  })

  it('2具モード固定: 候補不足なら null(具4件・固定1件でcount=4)', () => {
    // 固定以外の具は3件しかないため count=4 は不可
    const r = drawSetUnique(['鮭', '梅', 'おかか', '昆布'], ['塩'], 4, {
      uniqueTags: false,
      twoFillings: true,
      fixedFilling: '鮭',
    })
    expect(r).toBeNull()
  })

  it('2具モード固定+uniqueTags: 固定具と同タグのみでは null', () => {
    // 鮭(fish)固定、相手候補はツナマヨ(fish)のみ → 異タグ条件で候補ゼロ
    const r = drawSetUnique(['鮭', 'ツナマヨ'], ['塩'], 1, {
      uniqueTags: true,
      twoFillings: true,
      fixedFilling: '鮭',
    }, cats)
    expect(r).toBeNull()
  })

  it('2具モード固定+uniqueTags: 相手は固定具と異タグのみ', () => {
    for (let trial = 0; trial < 20; trial++) {
      const r = drawSetUnique(
        ['鮭', '梅', 'おかか', '昆布', 'ツナマヨ', '唐揚げ'],
        ['塩'],
        2,
        { uniqueTags: true, twoFillings: true, fixedFilling: '鮭' },
        cats,
      )
      expect(r).not.toBeNull()
      for (const x of r as Array<{ filling: string; filling2: string }>) {
        expect([x.filling, x.filling2]).toContain('鮭')
        expect(cats[x.filling]).not.toBe(cats[x.filling2])
      }
    }
  })

  it('2具モード固定: 固定具がプール外なら null', () => {
    const r = drawSetUnique(['梅', 'おかか'], ['塩'], 1, {
      uniqueTags: false,
      twoFillings: true,
      fixedFilling: '鮭',
    })
    expect(r).toBeNull()
  })
})
