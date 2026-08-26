import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useAppState } from './useAppState'
import { STORAGE_KEY } from '../storage/appStorage'
import type { LotteryResult } from '../domain/lottery'

const pair = (f: string, s: string): LotteryResult => ({ filling: f, seasoning: s })

describe('useAppState(拡張: 除外・fav)', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.restoreAllMocks()
  })

  it('toggleExcludeFilling: 除外→解除', () => {
    const { result } = renderHook(() => useAppState())
    expect(result.current.state.excludedFillings).toEqual([])
    act(() => {
      expect(result.current.toggleExcludeFilling('鮭')).toBe(true)
    })
    expect(result.current.state.excludedFillings).toEqual(['鮭'])
    act(() => {
      result.current.toggleExcludeFilling('鮭')
    })
    expect(result.current.state.excludedFillings).toEqual([])
  })

  it('toggleExcludeSeasoning: 除外', () => {
    const { result } = renderHook(() => useAppState())
    act(() => {
      result.current.toggleExcludeSeasoning('塩')
    })
    expect(result.current.state.excludedSeasonings).toEqual(['塩'])
  })

  it('除外は全件除外できない(具全件除外で最後の1件は除外不可)', () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        fillings: ['鮭', '梅'],
        seasonings: ['塩'],
        history: [],
      }),
    )
    const { result } = renderHook(() => useAppState())
    act(() => {
      result.current.toggleExcludeFilling('鮭')
    })
    expect(result.current.state.excludedFillings).toEqual(['鮭'])
    act(() => {
      expect(result.current.toggleExcludeFilling('梅')).toBe(false)
    })
    expect(result.current.state.excludedFillings).toEqual(['鮭'])
  })

  it('削除時に除外リストも整合(削除した具が除外済みなら除去)', () => {
    const { result } = renderHook(() => useAppState())
    act(() => {
      result.current.toggleExcludeFilling('鮭')
    })
    act(() => {
      result.current.removeFilling('鮭')
    })
    expect(result.current.state.fillings).not.toContain('鮭')
    expect(result.current.state.excludedFillings).toEqual([])
  })

  it('toggleFavorite: fav更新', () => {
    const { result } = renderHook(() => useAppState())
    act(() => {
      result.current.recordDraw([pair('鮭', '塩')])
    })
    const id = result.current.state.history[0].id
    act(() => {
      result.current.toggleFavorite(id)
    })
    expect(result.current.state.history[0].fav).toBe(true)
  })

  it('fav付きセットは6回抽選しても消えない', () => {
    const { result } = renderHook(() => useAppState())
    act(() => {
      result.current.recordDraw([pair('鮭', '塩')])
    })
    const firstId = result.current.state.history[0].id
    act(() => {
      result.current.toggleFavorite(firstId)
    })
    for (let i = 0; i < 6; i++) {
      act(() => {
        result.current.recordDraw([pair(`具${i}`, '塩')])
      })
    }
    const ids = result.current.state.history.map((h) => h.id)
    expect(ids).toContain(firstId)
    // 非favは直近5 + fav1 = 6件
    expect(result.current.state.history).toHaveLength(6)
  })

  it('clearHistory は fav を残して削除', () => {
    const { result } = renderHook(() => useAppState())
    act(() => {
      result.current.recordDraw([pair('鮭', '塩')])
    })
    act(() => {
      result.current.recordDraw([pair('梅', '醤油')])
    })
    // 1件目を fav にする
    act(() => {
      result.current.toggleFavorite(result.current.state.history[0].id)
    })
    act(() => {
      result.current.clearHistory()
    })
    // fav のみ残る
    expect(result.current.state.history).toHaveLength(1)
    expect(result.current.state.history[0].fav).toBe(true)
  })
})
