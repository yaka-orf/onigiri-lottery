import { describe, it, expect } from 'vitest'
import {
  normalizeState,
  defaultFillingCategories,
  type AppState,
} from './model'

describe('fillingCategories 正規化', () => {
  it('未指定(旧スキーマ)はデフォルトカテゴリにフォールバック', () => {
    const state = normalizeState({
      fillings: ['鮭', '梅'],
      seasonings: ['塩'],
    })
    // fillingsに存在する具のみカテゴリを持つ
    expect(state.fillingCategories).toEqual({ 鮭: 'fish', 梅: 'classic' })
  })

  it('デフォルト8具のカテゴリ割当が正しい', () => {
    expect(defaultFillingCategories['鮭']).toBe('fish')
    expect(defaultFillingCategories['焼きたらこ']).toBe('fish')
    expect(defaultFillingCategories['明太子']).toBe('fish')
    expect(defaultFillingCategories['ツナマヨ']).toBe('fish')
    expect(defaultFillingCategories['たまご']).toBe('other')
    expect(defaultFillingCategories['梅']).toBe('classic')
    expect(defaultFillingCategories['おかか']).toBe('classic')
    expect(defaultFillingCategories['昆布']).toBe('classic')
  })

  it('未知の具名のカテゴリは削除される', () => {
    const state = normalizeState({
      fillings: ['鮭'],
      seasonings: ['塩'],
      fillingCategories: { 鮭: 'fish', 存在しない具: 'meat' },
    })
    expect(state.fillingCategories).toEqual({ 鮭: 'fish' })
  })

  it('カテゴリ欠損の具は other 補完される', () => {
    const state = normalizeState({
      fillings: ['鮭', '手作り新作具'],
      seasonings: ['塩'],
      fillingCategories: { 鮭: 'fish' },
    })
    expect(state.fillingCategories['手作り新作具']).toBe('other')
  })

  it('不正なカテゴリ値は other に置換される', () => {
    const state = normalizeState({
      fillings: ['鮭'],
      seasonings: ['塩'],
      fillingCategories: { 鮭: 'seafood' },
    })
    expect(state.fillingCategories['鮭']).toBe('other')
  })

  it('full AppState roundtrip: カスタムカテゴリが保持される', () => {
    const base: AppState = {
      fillings: ['鮭', '唐揚げ'],
      seasonings: ['塩'],
      excludedFillings: [],
      excludedSeasonings: [],
      settings: { mode: 'one', count: 5, uniqueTags: false, tagFilterEnabled: true },
      soundEnabled: true,
      fillingCategories: { 鮭: 'fish', 唐揚げ: 'meat' },
      tags: [],
      history: [],
    }
    const state = normalizeState(base)
    expect(state.fillingCategories).toEqual({ 鮭: 'fish', 唐揚げ: 'meat' })
  })
})
