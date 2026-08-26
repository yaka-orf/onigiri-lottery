import { describe, it, expect } from 'vitest'
import {
  normalizeState,
  MAX_HISTORY,
  pruneHistory,
} from './model'

describe('normalizeState(拡張仕様)', () => {
  it('旧データ(excluded/fav なし)は後方互換で読み込める', () => {
    const s = {
      fillings: ['鮭'],
      seasonings: ['塩'],
      history: [{ results: [{ filling: '鮭', seasoning: '塩' }], at: 1 }],
    }
    const r = normalizeState(s)
    expect(r.fillings).toEqual(['鮭'])
    expect(r.excludedFillings).toEqual([])
    expect(r.excludedSeasonings).toEqual([])
    expect(r.history[0].fav).toBe(false)
    expect(r.history[0].id).toBeTruthy()
  })

  it('excluded に存在しない項目は除去される', () => {
    const r = normalizeState({
      fillings: ['鮭', '梅'],
      seasonings: ['塩'],
      excludedFillings: ['鮭', '存在しない'],
      excludedSeasonings: ['塩', '無効'],
      history: [],
    })
    expect(r.excludedFillings).toEqual(['鮭'])
    expect(r.excludedSeasonings).toEqual(['塩'])
  })

  it('fav付きセットは5セット上限を超えて保持される', () => {
    const mk = (at: number, fav: boolean) => ({
      id: `id-${at}`,
      results: [{ filling: '鮭', seasoning: '塩' }],
      at,
      fav,
    })
    const r = normalizeState({
      fillings: ['鮭'],
      seasonings: ['塩'],
      history: [mk(1, true), mk(2, false), mk(3, false), mk(4, false), mk(5, false), mk(6, false), mk(7, false)],
    })
    // 非favは直近5(3〜7)、fav(1)は保持 → 計6
    expect(r.history).toHaveLength(6)
    expect(r.history.map((h) => h.at)).toEqual([1, 3, 4, 5, 6, 7])
  })
})

describe('pruneHistory', () => {
  const mk = (at: number, fav: boolean) => ({
    id: `id-${at}`,
    results: [{ filling: '鮭', seasoning: '塩' }],
    at,
    fav,
  })
  it('非favのみ直近MAX_HISTORY、favは全保持・時系列順', () => {
    const h = [mk(1, true), mk(2, false), mk(3, true), mk(4, false), mk(5, false), mk(6, false), mk(7, false), mk(8, false)]
    const r = pruneHistory(h, MAX_HISTORY)
    expect(r.map((x) => x.at)).toEqual([1, 3, 4, 5, 6, 7, 8])
  })
  it('favだけで多数あっても全保持', () => {
    const h = Array.from({ length: 8 }, (_, i) => mk(i + 1, true))
    expect(pruneHistory(h, MAX_HISTORY)).toHaveLength(8)
  })
})
