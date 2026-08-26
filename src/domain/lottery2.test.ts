import { describe, it, expect } from 'vitest'
import { drawSetTwoFillings } from './lottery2'

describe('drawSetTwoFillings', () => {
  const F = ['鮭', '梅', 'おかか', '昆布', 'ツナマヨ', '明太子', '焼きたらこ', 'たまご']
  const S = ['塩', '醤油', 'ごま油', 'なし']

  it('各組に2つの異なる具と味付けを返す', () => {
    const r = drawSetTwoFillings(F, S)!
    expect(r).toHaveLength(5)
    for (const p of r) {
      expect(p.filling2).toBeDefined()
      expect(p.filling).not.toBe(p.filling2)
      expect(F).toContain(p.filling)
      expect(F).toContain(p.filling2)
      expect(S).toContain(p.seasoning)
    }
  })
  it('fillings が2件未満なら null', () => {
    expect(drawSetTwoFillings(['鮭'], S)).toBeNull()
    expect(drawSetTwoFillings([], S)).toBeNull()
  })
  it('2件でも有効(鮭×梅のみ)', () => {
    const r = drawSetTwoFillings(['鮭', '梅'], ['塩'])!
    expect(r).toHaveLength(5)
    for (const p of r) {
      expect([p.filling, p.filling2].sort()).toEqual(['梅', '鮭'])
    }
  })
  it('seasonings 空なら空文字', () => {
    const r = drawSetTwoFillings(F, [], 3)!
    expect(r).toHaveLength(3)
    for (const p of r) expect(p.seasoning).toBe('')
  })
})
