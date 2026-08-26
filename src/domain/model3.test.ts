import { describe, it, expect } from 'vitest'
import { normalizeState, defaultSettings } from './model'

describe('settings(抽選設定の永続化)', () => {
  it('デフォルトは one/5', () => {
    expect(defaultSettings).toEqual({ mode: 'one', count: 5 })
  })
  it('旧データ(settings なし)はデフォルト設定で補完', () => {
    const r = normalizeState({ fillings: ['鮭'], seasonings: ['塩'], history: [] })
    expect(r.settings).toEqual({ mode: 'one', count: 5 })
  })
  it('有効な settings はそのまま通す', () => {
    const r = normalizeState({
      fillings: ['鮭'],
      seasonings: ['塩'],
      settings: { mode: 'two', count: 7 },
      history: [],
    })
    expect(r.settings).toEqual({ mode: 'two', count: 7 })
  })
  it('不正な settings は正規化: mode は one へ、count は 1-10 にクランプ', () => {
    const r1 = normalizeState({
      fillings: ['鮭'], seasonings: ['塩'],
      settings: { mode: 'three', count: 5 }, history: [],
    })
    expect(r1.settings.mode).toBe('one')
    const r2 = normalizeState({
      fillings: ['鮭'], seasonings: ['塩'],
      settings: { mode: 'two', count: 99 }, history: [],
    })
    expect(r2.settings.count).toBe(10)
    const r3 = normalizeState({
      fillings: ['鮭'], seasonings: ['塩'],
      settings: { mode: 'two', count: 0 }, history: [],
    })
    expect(r3.settings.count).toBe(1)
    const r4 = normalizeState({
      fillings: ['鮭'], seasonings: ['塩'],
      settings: 'broken', history: [],
    })
    expect(r4.settings).toEqual({ mode: 'one', count: 5 })
  })
})
