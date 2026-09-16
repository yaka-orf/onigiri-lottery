import { describe, it, expect } from 'vitest'
import {
  normalizeState,
  defaultFillings,
  defaultSeasonings,
  defaultFillingCategories,
  MAX_HISTORY,
} from './model'

describe('normalizeState', () => {
  it('正常データはそのまま通す(id/favは補完)', () => {
    const s = {
      fillings: ['鮭'],
      seasonings: ['塩'],
      history: [{ results: [{ filling: '鮭', seasoning: '塩' }], at: 1 }],
    }
    const r = normalizeState(s)
    expect(r.fillings).toEqual(['鮭'])
    expect(r.seasonings).toEqual(['塩'])
    expect(r.history).toHaveLength(1)
    expect(r.history[0].results).toEqual([{ filling: '鮭', seasoning: '塩' }])
    expect(r.history[0].at).toBe(1)
    expect(r.history[0].fav).toBe(false)
  })
  it('null は初期値にフォールバック', () => {
    expect(normalizeState(null)).toEqual({
      fillings: [...defaultFillings],
      seasonings: [...defaultSeasonings],
      excludedFillings: [],
      excludedSeasonings: [],
      settings: { mode: 'one', count: 5, uniqueTags: false, tagFilterEnabled: false, tagFilterMigrated: true },
      soundEnabled: true,
      fillingCategories: { ...defaultFillingCategories },
      tags: [
        { id: 'meat', label: '肉' },
        { id: 'fish', label: '魚介' },
        { id: 'classic', label: '定番' },
        { id: 'other', label: 'その他' },
      ],
      history: [],
    })
  })
  it('不正形状(配列等)も初期値にフォールバック', () => {
    expect(normalizeState(null)).toEqual({
      fillings: [...defaultFillings],
      seasonings: [...defaultSeasonings],
      excludedFillings: [],
      excludedSeasonings: [],
      settings: { mode: 'one', count: 5, uniqueTags: false, tagFilterEnabled: false, tagFilterMigrated: true },
      soundEnabled: true,
      fillingCategories: { ...defaultFillingCategories },
      tags: [
        { id: 'meat', label: '肉' },
        { id: 'fish', label: '魚介' },
        { id: 'classic', label: '定番' },
        { id: 'other', label: 'その他' },
      ],
      history: [],
    })
  })
  it('部分欠損は初期値とマージ', () => {
    const r = normalizeState({ fillings: ['鮭'] })
    expect(r.fillings).toEqual(['鮭'])
    expect(r.seasonings).toEqual([...defaultSeasonings])
    expect(r.history).toEqual([])
  })
  it('history 内の不正セットは除外される', () => {
    const s = {
      fillings: ['鮭'],
      seasonings: ['塩'],
      history: [
        { results: [{ filling: '鮭', seasoning: '塩' }], at: 1 },
        { results: '不正', at: 2 },
        { results: [{ filling: 123, seasoning: '塩' }], at: 3 },
        '不正',
      ],
    }
    const r = normalizeState(s)
    expect(r.history).toHaveLength(1)
    expect(r.history[0].at).toBe(1)
  })
  it('history が上限を超えたら古い順に削除され5セット維持', () => {
    const mk = (at: number) => ({
      results: [{ filling: '鮭', seasoning: '塩' }],
      at,
    })
    const s = {
      fillings: ['鮭'],
      seasonings: ['塩'],
      history: [mk(1), mk(2), mk(3), mk(4), mk(5), mk(6), mk(7)],
    }
    const r = normalizeState(s)
    expect(r.history).toHaveLength(MAX_HISTORY)
    expect(r.history.map((h) => h.at)).toEqual([3, 4, 5, 6, 7])
  })
  it('fillings 空配列は初期値へフォールバック(具リスト最低1件必須)', () => {
    const r = normalizeState({ fillings: [], seasonings: ['塩'], history: [] })
    expect(r.fillings).toEqual([...defaultFillings])
  })
  it('seasonings 空配列は初期値へフォールバック', () => {
    const r = normalizeState({ fillings: ['鮭'], seasonings: [], history: [] })
    expect(r.seasonings).toEqual([...defaultSeasonings])
  })
  it('fillings 内の空文字・非文字列を除外', () => {
    const r = normalizeState({
      fillings: ['鮭', '', 42, '梅'],
      seasonings: ['塩'],
      history: [],
    })
    expect(r.fillings).toEqual(['鮭', '梅'])
  })
})
