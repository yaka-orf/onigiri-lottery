import { describe, it, expect } from 'vitest'
import { drawSetUnique } from './lottery3'

describe('drawSetUnique', () => {
  it('1具モード: セット内で具が重複しない', () => {
    const r = drawSetUnique(
      ['鮭', '梅', 'おかか', '昆布', 'ツナマヨ'],
      ['塩'],
      5,
      { uniquePairs: true },
    )
    expect(r).not.toBeNull()
    const fillings = r!.map((x) => x.filling)
    expect(new Set(fillings).size).toBe(5)
  })

  it('1具モード: count > 具数なら null', () => {
    const r = drawSetUnique(['鮭', '梅'], ['塩'], 5, { uniquePairs: true })
    expect(r).toBeNull()
  })

  it('1具モード: uniquePairs false なら重複あり', () => {
    const r = drawSetUnique(['鮭', '梅'], ['塩'], 10, { uniquePairs: false })
    expect(r).not.toBeNull()
    expect(r).toHaveLength(10)
  })

  it('2具モード: 各組内で2具が異なる', () => {
    const r = drawSetUnique(
      ['鮭', '梅', 'おかか'],
      ['塩'],
      3,
      { uniquePairs: false, twoFillings: true },
    )
    expect(r).not.toBeNull()
    for (const x of r as Array<{ filling: string; filling2: string }>) {
      expect(x.filling).not.toBe(x.filling2)
    }
  })

  it('2具モード+ペア重複禁止: 同じペア(A×B)が2回出ない', () => {
    // 具3件 → ペア3通り(鮭梅・鮭おかか・梅おかか)。count=3でちょうど全部異なる
    for (let trial = 0; trial < 20; trial++) {
      const r = drawSetUnique(
        ['鮭', '梅', 'おかか'],
        ['塩'],
        3,
        { uniquePairs: true, twoFillings: true },
      )
      expect(r).not.toBeNull()
      const pairs = (r as Array<{ filling: string; filling2: string }>).map(
        (x) => [x.filling, x.filling2].sort().join('|'),
      )
      expect(new Set(pairs).size).toBe(3)
    }
  })

  it('2具モード+ペア重複禁止: A×B と A×C は許可される', () => {
    // 具3件・count=2 → 2ペア選択。全20試行で「共有する具を含む異なるペア」が多数出るはず
    let sharedFound = false
    for (let trial = 0; trial < 30; trial++) {
      const r = drawSetUnique(
        ['鮭', '梅', 'おかか'],
        ['塩'],
        2,
        { uniquePairs: true, twoFillings: true },
      )
      expect(r).not.toBeNull()
      const pairs = (r as Array<{ filling: string; filling2: string }>).map(
        (x) => [x.filling, x.filling2].sort().join('|'),
      )
      expect(new Set(pairs).size).toBe(2)
      // 2ペアが1つの具を共有するか
      const [p1, p2] = pairs.map((p) => p.split('|'))
      if (p1.some((f) => p2.includes(f))) sharedFound = true
    }
    expect(sharedFound).toBe(true)
  })

  it('2具モード+ペア重複禁止: 可能ペア数 < count なら null', () => {
    // 具2件 → ペア1通りしかない。count=2は不可
    const r = drawSetUnique(
      ['鮭', '梅'],
      ['塩'],
      2,
      { uniquePairs: true, twoFillings: true },
    )
    expect(r).toBeNull()
  })

  it('2具モード: uniquePairs false なら同じペアも許可', () => {
    const r = drawSetUnique(
      ['鮭', '梅'],
      ['塩'],
      5,
      { uniquePairs: false, twoFillings: true },
    )
    expect(r).not.toBeNull()
    expect(r).toHaveLength(5)
  })

  it('抽選結果は具プールから選ばれる', () => {
    const r = drawSetUnique(['鮭', '梅'], ['塩'], 2, { uniquePairs: true })
    expect(r).not.toBeNull()
    for (const x of r!) {
      expect(['鮭', '梅']).toContain(x.filling)
    }
  })
})
