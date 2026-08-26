import { describe, it, expect } from 'vitest'
import { drawOne, drawSet } from './lottery'

describe('drawOne', () => {
  it('リスト内のいずれかを返す', () => {
    const items = ['鮭', '梅', 'おかか']
    for (let i = 0; i < 100; i++) expect(items).toContain(drawOne(items))
  })
  it('空リストは null', () => {
    expect(drawOne([])).toBeNull()
  })
  it('単一要素は常にそれを返す', () => {
    expect(drawOne(['明太子'])).toBe('明太子')
  })
  it('均等性: 10000試行で各要素が1000回超出現', () => {
    const items = ['a', 'b', 'c', 'd']
    const counts = new Map(items.map((s) => [s, 0]))
    for (let i = 0; i < 10000; i++) {
      const r = drawOne(items)!
      counts.set(r, counts.get(r)! + 1)
    }
    for (const c of counts.values()) expect(c).toBeGreaterThan(1000)
  })
})

describe('drawSet', () => {
  const F = ['鮭', '梅', 'おかか', '昆布', 'ツナマヨ', '明太子', '焼きたらこ', 'たまご']
  const S = ['塩', '醤油', 'ごま油', 'なし']

  it('デフォルトで5組を返す', () => {
    const r = drawSet(F, S)
    expect(r).not.toBeNull()
    expect(r!).toHaveLength(5)
  })
  it('各組は有効な 具×味付け ペア', () => {
    const r = drawSet(F, S)!
    for (const p of r) {
      expect(F).toContain(p.filling)
      expect(S).toContain(p.seasoning)
    }
  })
  it('fillings が空なら null', () => {
    expect(drawSet([], S)).toBeNull()
  })
  it('seasonings が空なら空文字の味付けで生成', () => {
    const r = drawSet(F, [], 3)!
    expect(r).toHaveLength(3)
    for (const p of r) expect(p.seasoning).toBe('')
  })
  it('独立性: 大量試行で同じ具の重複が生じる', () => {
    let sawDup = false
    for (let i = 0; i < 300 && !sawDup; i++) {
      const r = drawSet(F, S)!
      sawDup = new Set(r.map((p) => p.filling)).size < 5
    }
    expect(sawDup).toBe(true)
  })
})
