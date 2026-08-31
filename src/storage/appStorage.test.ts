import { describe, it, expect, beforeEach, vi } from 'vitest'
import { loadState, saveState, STORAGE_KEY } from './appStorage'
import { defaultFillings, defaultSeasonings, type AppState } from '../domain/model'

describe('appStorage', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.restoreAllMocks()
  })

  it('空localStorageから読み込むと初期値を返す', () => {
    const s = loadState()
    expect(s.fillings).toEqual([...defaultFillings])
    expect(s.seasonings).toEqual([...defaultSeasonings])
    expect(s.history).toEqual([])
  })
  it('保存→読込のラウンドトリップ', () => {
    const state: AppState = {
      fillings: ['鮭', '梅'],
      seasonings: ['塩'],
      excludedFillings: [],
      excludedSeasonings: [],
      settings: { mode: 'one', count: 5, uniqueTags: false },
      soundEnabled: true,
      fillingCategories: { 鮭: 'fish', 梅: 'classic' },
      tags: [],
      history: [
        {
          id: 'test-id-1',
          results: [
            { filling: '鮭', seasoning: '塩' },
            { filling: '梅', seasoning: '塩' },
          ],
          at: 1756200000000,
          fav: false,
        },
      ],
    }
    expect(saveState(state)).toBe(true)
    const loaded = loadState()
    expect(loaded.fillings).toEqual(state.fillings)
    expect(loaded.seasonings).toEqual(state.seasonings)
    expect(loaded.excludedFillings).toEqual([])
    expect(loaded.excludedSeasonings).toEqual([])
    expect(loaded.history[0].results).toEqual(state.history[0].results)
    expect(loaded.history[0].at).toBe(state.history[0].at)
    expect(loaded.history[0].fav).toBe(false)
  })
  it('不正JSONが保存されている場合は初期値にフォールバック', () => {
    localStorage.setItem(STORAGE_KEY, '{{{broken json')
    const s = loadState()
    expect(s.fillings).toEqual([...defaultFillings])
    expect(s.history).toEqual([])
  })
  it('saveState は localStorage に書き込む', () => {
    const spy = vi.spyOn(Storage.prototype, 'setItem')
    const state: AppState = {
      fillings: ['鮭'],
      seasonings: ['塩'],
      excludedFillings: [],
      excludedSeasonings: [],
      settings: { mode: 'one', count: 5, uniqueTags: false },
      soundEnabled: true,
      fillingCategories: { 鮭: 'fish', 梅: 'classic' },
      tags: [],
      history: [],
    }
    expect(saveState(state)).toBe(true)
    expect(spy).toHaveBeenCalledWith(STORAGE_KEY, JSON.stringify(state))
    expect(localStorage.getItem(STORAGE_KEY)).toBe(JSON.stringify(state))
  })
  it('書き込み失敗時は false を返す', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota exceeded')
    })
    expect(
      saveState({
        fillings: ['鮭'],
        seasonings: ['塩'],
        excludedFillings: [],
        excludedSeasonings: [],
        settings: { mode: 'one', count: 5, uniqueTags: false },
        soundEnabled: true,
        fillingCategories: { 鮭: 'fish' },
        tags: [],
        history: [],
      } satisfies AppState),
    ).toBe(false)
  })
})
