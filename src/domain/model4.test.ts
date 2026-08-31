import { describe, it, expect } from 'vitest'
import { normalizeState, defaultFillings, defaultSeasonings, defaultFillingCategories } from './model'
import type { AppState } from './model'

describe('soundEnabled 正規化', () => {
  it('未指定(旧スキーマ)は true にフォールバック', () => {
    const state = normalizeState({
      fillings: ['鮭'],
      seasonings: ['塩'],
    })
    expect(state.soundEnabled).toBe(true)
  })

  it('false は false を保持', () => {
    const state = normalizeState({
      fillings: ['鮭'],
      seasonings: ['塩'],
      soundEnabled: false,
    })
    expect(state.soundEnabled).toBe(false)
  })

  it('不正値(文字列等)は true にフォールバック', () => {
    const state = normalizeState({
      fillings: ['鮭'],
      seasonings: ['塩'],
      soundEnabled: 'off',
    })
    expect(state.soundEnabled).toBe(true)
  })

  it('デフォルト状態は soundEnabled: true', () => {
    const state = normalizeState(null)
    expect(state.soundEnabled).toBe(true)
  })

  it('full state roundtrip: soundEnabled false が保存・復元される', () => {
    const base: AppState = {
      fillings: [...defaultFillings],
      seasonings: [...defaultSeasonings],
      excludedFillings: [],
      excludedSeasonings: [],
      settings: { mode: 'one', count: 5, uniqueTags: false },
      soundEnabled: false,
      fillingCategories: { ...defaultFillingCategories },
      tags: [],
      history: [],
    }
    // AppState をそのまま正規化に通しても soundEnabled が保たれる
    const state = normalizeState(base)
    expect(state.soundEnabled).toBe(false)
  })
})
