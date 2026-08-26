import { describe, it, expect } from 'vitest'
import {
  normalizeState,
  type AppState,
} from './model'

describe('カスタムタグ正規化', () => {
  it('未指定(旧スキーマ)はデフォルト4タグにフォールバック', () => {
    const state = normalizeState({
      fillings: ['鮭'],
      seasonings: ['塩'],
    })
    expect(state.tags).toHaveLength(4)
    expect(state.tags.map((t) => t.label)).toEqual(['肉', '魚介', '定番', 'その他'])
    // デフォルトIDは固定(meat/fish/classic/other)
    expect(state.tags.map((t) => t.id)).toEqual(['meat', 'fish', 'classic', 'other'])
  })

  it('カスタムタグ配列がそのまま通る', () => {
    const state = normalizeState({
      fillings: ['鮭'],
      seasonings: ['塩'],
      tags: [
        { id: 'meat', label: 'お肉' },
        { id: 'fish', label: 'お魚' },
        { id: 'classic', label: '定番' },
        { id: 'other', label: 'その他' },
        { id: 'custom1', label: '自家製' },
      ],
    })
    expect(state.tags).toHaveLength(5)
    expect(state.tags[0].label).toBe('お肉')
    expect(state.tags[4]).toEqual({ id: 'custom1', label: '自家製' })
  })

  it('不正なタグ形状は除外される', () => {
    const state = normalizeState({
      fillings: ['鮭'],
      seasonings: ['塩'],
      tags: [
        { id: 'meat', label: '肉' },
        '不正',
        { id: '', label: 'IDなし' },
        { id: 'nolabel' },
        null,
      ],
    })
    expect(state.tags).toHaveLength(1)
    expect(state.tags[0]).toEqual({ id: 'meat', label: '肉' })
  })

  it('fillingCategories が存在しないタグIDを参照した場合 other へフォールバック', () => {
    const state = normalizeState({
      fillings: ['鮭'],
      seasonings: ['塩'],
      tags: [
        { id: 'meat', label: '肉' },
        { id: 'fish', label: '魚介' },
        { id: 'classic', label: '定番' },
        { id: 'other', label: 'その他' },
      ],
      fillingCategories: { 鮭: 'deleted-tag' },
    })
    expect(state.fillingCategories['鮭']).toBe('other')
  })

  it('full AppState roundtrip: カスタムタグが保持される', () => {
    const base: AppState = {
      fillings: ['鮭'],
      seasonings: ['塩'],
      excludedFillings: [],
      excludedSeasonings: [],
      settings: { mode: 'one', count: 5 },
      soundEnabled: true,
      tags: [
        { id: 'meat', label: '肉' },
        { id: 'fish', label: '魚介' },
        { id: 'classic', label: '定番' },
        { id: 'other', label: 'その他' },
        { id: 'c1', label: 'コンビニ限定' },
      ],
      fillingCategories: { 鮭: 'c1' },
      history: [],
    }
    const state = normalizeState(base)
    expect(state.tags[4]).toEqual({ id: 'c1', label: 'コンビニ限定' })
    expect(state.fillingCategories['鮭']).toBe('c1')
  })
})
